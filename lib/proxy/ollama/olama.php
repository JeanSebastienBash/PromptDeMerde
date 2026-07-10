<?php
/**
 * PromptDeMerde.com — olama.php
 *
 * Synopsis : Proxy PHP relais CORS vers Ollama local ou distant.
 * Objectif : Streamer NDJSON ou JSON vers Ollama sans persistance ni journalisation des corps.
 */
@ini_set('zlib.output_compression', 'Off');
@ini_set('implicit_flush', 'On');
while (ob_get_level() > 0) ob_end_flush();
ob_implicit_flush(true);

/**
 * Autorise uniquement Ollama sur localhost ou réseau privé (RFC 1918).
 */
function pdm_is_allowed_ollama_host($host) {
    $host = strtolower(trim((string) $host));
    if ($host === 'localhost' || $host === '127.0.0.1' || $host === '::1') {
        return true;
    }
    if (filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
        if (preg_match('/^10\./', $host)) return true;
        if (preg_match('/^192\.168\./', $host)) return true;
        if (preg_match('/^172\.(1[6-9]|2[0-9]|3[0-1])\./', $host)) return true;
        return false;
    }
    if (preg_match('/\.local$/', $host)) {
        return true;
    }
    return false;
}

function pdm_proxy_env_flag($name) {
    $raw = getenv($name);
    if ($raw === false || $raw === '') {
        $raw = $_SERVER[$name] ?? $_SERVER['REDIRECT_' . $name] ?? '';
    }
    return trim((string) $raw);
}

function pdm_proxy_token() {
    return pdm_proxy_env_flag('PDM_PROXY_TOKEN');
}

function pdm_sanitize_header_value($value) {
    $value = str_replace(["\r", "\n", "\0"], '', (string) $value);
    return trim($value);
}

function pdm_check_proxy_auth($isProdEnv) {
    $token = pdm_proxy_token();
    if ($token === '') {
        return true;
    }
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if ($auth !== '' && preg_match('/^Bearer\s+(\S+)/i', $auth, $m)) {
        return hash_equals($token, $m[1]);
    }
    $headerToken = $_SERVER['HTTP_X_PDM_PROXY_TOKEN'] ?? '';
    if ($headerToken !== '' && hash_equals($token, $headerToken)) {
        return true;
    }
    return false;
}

function pdm_rate_limit_check($isProdEnv) {
    $maxPerMinute = $isProdEnv ? 120 : 300;
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $bucket = (int) floor(time() / 60);
    $file = sys_get_temp_dir() . '/pdm_proxy_rl_' . md5($ip . '|' . $bucket);
    $count = 0;
    if (is_file($file)) {
        $count = (int) @file_get_contents($file);
    }
    $count++;
    @file_put_contents($file, (string) $count, LOCK_EX);
    return $count <= $maxPerMinute;
}

function pdm_read_request_body($maxBytes) {
    $maxBytes = max(1, (int) $maxBytes);
    $raw = file_get_contents('php://input', false, null, 0, $maxBytes + 1);
    if ($raw === false) {
        return '';
    }
    if (strlen($raw) > $maxBytes) {
        return null;
    }
    return $raw;
}

function pdm_proxy_error($message, $httpCode, $isProdEnv, $debugDetails) {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code($httpCode);
    $payload = ['error' => $message];
    if (!$isProdEnv && $debugDetails !== null && $debugDetails !== '') {
        $payload['details'] = $debugDetails;
    }
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

$rawEnv = getenv('PDM_ENV');
if ($rawEnv === false || $rawEnv === '') {
    $rawEnv = $_SERVER['PDM_ENV'] ?? $_SERVER['REDIRECT_PDM_ENV'] ?? '';
}
$isProdEnv = (strtolower(trim((string) $rawEnv)) === 'prod');

if ($isProdEnv) {
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? trim($_SERVER['HTTP_ORIGIN']) : '';
    $allowedOrigins = [
        'https://promptdemerde.com',
        'https://www.promptdemerde.com',
    ];
    if ($origin !== '' && in_array($origin, $allowedOrigins, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
    }
} else {
    header('Access-Control-Allow-Origin: *');
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Ollama-Url, Authorization, X-PDM-Proxy-Token');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if (!pdm_check_proxy_auth($isProdEnv)) {
    pdm_proxy_error('Accès proxy refusé.', 401, $isProdEnv, null);
}

if (!pdm_rate_limit_check($isProdEnv)) {
    pdm_proxy_error('Limite de requêtes atteinte. Réessayez dans une minute.', 429, $isProdEnv, null);
}

$maxBodyBytes = (int) pdm_proxy_env_flag('PDM_PROXY_MAX_BODY');
if ($maxBodyBytes <= 0) {
    $maxBodyBytes = 10485760;
}

$ollamaHost = 'http://127.0.0.1:11434';

if (isset($_SERVER['HTTP_X_OLLAMA_URL']) && !empty($_SERVER['HTTP_X_OLLAMA_URL'])) {
    $customUrl = trim($_SERVER['HTTP_X_OLLAMA_URL']);
    if (preg_match('#^https?://([^\s/:]+)(?::[0-9]+)?$#', $customUrl, $m)) {
        if (pdm_is_allowed_ollama_host($m[1])) {
            $ollamaHost = rtrim($customUrl, '/');
        } else {
            header('Content-Type: application/json; charset=utf-8');
            http_response_code(403);
            echo json_encode(['error' => 'Hôte Ollama non autorisé. Utilisez localhost ou une adresse LAN privée.']);
            exit;
        }
    }
}

$path = isset($_GET['path']) ? trim($_GET['path'], '/') : '';
if (!preg_match('/^api\/[a-z0-9_\-]+$/i', $path)) {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(400);
    echo json_encode(['error' => 'Paramètre path invalide. Ex: api/tags, api/chat']);
    exit;
}

$target = $ollamaHost . '/' . $path;
$method = $_SERVER['REQUEST_METHOD'];

$body = '';
$isStream = false;
if ($method === 'POST') {
    $body = pdm_read_request_body($maxBodyBytes);
    if ($body === null) {
        pdm_proxy_error('Corps de requête trop volumineux.', 413, $isProdEnv, null);
    }
    if ($body) {
        $tmp = json_decode($body, true);
        if (isset($tmp['stream']) && $tmp['stream'] === true) {
            $isStream = true;
        }
    }
}

if ($isStream && $method === 'POST') {
    header('Content-Type: application/x-ndjson; charset=utf-8');
    header('X-Accel-Buffering: no');

    $urlParts = parse_url($target);
    $host = $urlParts['host'] ?? '127.0.0.1';
    $port = $urlParts['port'] ?? 11434;
    $pathInfo = $urlParts['path'] ?? '/api/chat';

    $fp = @fsockopen($host, $port, $errno, $errstr, 5);
    if (!$fp) {
        $detail = $isProdEnv ? null : $errstr;
        pdm_proxy_error('Impossible de joindre Ollama.', 502, $isProdEnv, $detail);
    }

    $reqHeaders  = "POST $pathInfo HTTP/1.1\r\n";
    $reqHeaders .= "Host: $host:$port\r\n";
    $reqHeaders .= "Content-Type: application/json\r\n";
    $reqHeaders .= "Content-Length: " . strlen($body) . "\r\n";
    $reqHeaders .= "Connection: close\r\n";
    $reqHeaders .= "\r\n";
    $reqHeaders .= $body;

    fwrite($fp, $reqHeaders);

    $inHeaders = true;
    $statusCode = 0;
    $isChunked = false;
    while ($inHeaders && !feof($fp)) {
        $line = fgets($fp, 4096);
        if ($line === false) break;
        if (preg_match('/^HTTP\/[\d.]+\s+(\d+)/', $line, $m)) {
            $statusCode = (int)$m[1];
        }
        if (stripos($line, 'Transfer-Encoding: chunked') !== false) {
            $isChunked = true;
        }
        if (trim($line) === '') {
            $inHeaders = false;
        }
    }

    if ($statusCode !== 200) {
        $errBody = '';
        while (!feof($fp)) {
            $errBody .= fread($fp, 8192);
        }
        fclose($fp);
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        $payload = ['error' => 'Ollama a retourné une erreur HTTP.'];
        if (!$isProdEnv) {
            $payload['status'] = $statusCode;
            $payload['details'] = $errBody;
        }
        echo json_encode($payload, JSON_UNESCAPED_UNICODE) . "\n";
        exit;
    }

    $emitNdjsonLine = function ($line) {
        $line = trim($line);
        if ($line === '') {
            return;
        }
        $obj = json_decode($line, true);
        if ($obj === null || json_last_error() !== JSON_ERROR_NONE) {
            return;
        }
        if (!isset($obj['result']) && isset($obj['message']['content'])) {
            $obj['result'] = $obj['message']['content'];
        }
        if (!isset($obj['result']) && isset($obj['response'])) {
            $obj['result'] = $obj['response'];
        }
        echo json_encode($obj) . "\n";
        if (function_exists('ob_flush')) {
            @ob_flush();
        }
        @flush();
    };

    $buffer = '';
    $appendAndEmitLines = function ($chunk) use (&$buffer, $emitNdjsonLine) {
        if ($chunk === false || $chunk === '') {
            return;
        }
        $buffer .= $chunk;
        while (($pos = strpos($buffer, "\n")) !== false) {
            $line = substr($buffer, 0, $pos);
            $buffer = substr($buffer, $pos + 1);
            $emitNdjsonLine($line);
        }
    };

    if ($isChunked) {
        while (!feof($fp)) {
            $sizeLine = '';
            while (!feof($fp)) {
                $c = fread($fp, 1);
                if ($c === false || $c === '') {
                    break 2;
                }
                $sizeLine .= $c;
                if (substr($sizeLine, -2) === "\r\n") {
                    break;
                }
            }
            $size = hexdec(trim($sizeLine));
            if ($size <= 0) {
                fread($fp, 2);
                break;
            }
            $read = 0;
            while ($read < $size && !feof($fp)) {
                $toRead = min(8192, $size - $read);
                $buf = fread($fp, $toRead);
                if ($buf === false || $buf === '') {
                    break;
                }
                $read += strlen($buf);
                $appendAndEmitLines($buf);
            }
            fread($fp, 2);
        }
    } else {
        while (!feof($fp)) {
            $buf = fread($fp, 4096);
            if ($buf === false || $buf === '') {
                break;
            }
            $appendAndEmitLines($buf);
        }
    }

    if ($buffer !== '') {
        $emitNdjsonLine($buffer);
    }

    fclose($fp);
    exit;
}

header('Content-Type: application/json; charset=utf-8');

$streamOpts = [
    'http' => [
        'method'          => $method,
        'timeout'         => 120,
        'ignore_errors'   => true,
        'follow_location' => false,
    ]
];

$agent = pdm_sanitize_header_value($_SERVER['HTTP_USER_AGENT'] ?? 'PDM-Proxy');
$accept = pdm_sanitize_header_value($_SERVER['HTTP_ACCEPT'] ?? 'application/json');
$streamOpts['http']['header'] = "User-Agent: $agent\r\nAccept: $accept\r\n";

if ($method === 'POST' && $body) {
    $streamOpts['http']['header'] .= "Content-Type: application/json\r\nContent-Length: " . strlen($body) . "\r\n";
    $streamOpts['http']['content'] = $body;
}

$ctx = stream_context_create($streamOpts);
$response = @file_get_contents($target, false, $ctx);

$httpCode = 500;
if (isset($http_response_header) && is_array($http_response_header) && !empty($http_response_header)) {
    if (preg_match('/\s(\d{3})\s/', $http_response_header[0], $m)) {
        $httpCode = (int) $m[1];
    }
}

if ($response === false) {
    pdm_proxy_error('Impossible de joindre Ollama.', 502, $isProdEnv, $isProdEnv ? null : $target);
}

$data = json_decode($response, true);
if (json_last_error() === JSON_ERROR_NONE && is_array($data)) {
    if (!isset($data['result']) && isset($data['message']['content'])) {
        $data['result'] = $data['message']['content'];
    }
    if (!isset($data['result']) && isset($data['response'])) {
        $data['result'] = $data['response'];
    }
    http_response_code($httpCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code($httpCode);
header('Content-Type: application/json; charset=utf-8');
if ($isProdEnv) {
    echo json_encode(['error' => 'Réponse Ollama invalide.'], JSON_UNESCAPED_UNICODE);
} else {
    echo $response;
}
