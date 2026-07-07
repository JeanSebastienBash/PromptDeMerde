<?php
/**
 * Proxy Ollama pour PromptDeMerde.
 * Contourne CORS en appelant Ollama depuis le serveur.
 *
 * Usage:
 *   GET  olama.php?path=api/tags
 *   POST olama.php?path=api/chat   (body = JSON Ollama)
 *
 * Supporte le mode streaming (stream:true) → NDJSON chunk par chunk.
 * Supporte le mode non-streaming (stream:false) → JSON complet.
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
header('Access-Control-Allow-Headers: Content-Type, X-Ollama-Url');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
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
    $body = file_get_contents('php://input');
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
        echo json_encode(['error' => 'Impossible de joindre Ollama: ' . $errstr]) . "\n";
        exit;
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
        echo json_encode([
            'error' => 'Ollama a retourné HTTP ' . $statusCode,
            'details' => $errBody
        ]) . "\n";
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
        'follow_location' => true,
    ]
];

$agent = $_SERVER['HTTP_USER_AGENT'] ?? 'PDM-Proxy';
$accept = $_SERVER['HTTP_ACCEPT'] ?? 'application/json';
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
    http_response_code(502);
    echo json_encode([
        'error' => 'Impossible de joindre Ollama',
        'target' => $target
    ]);
    exit;
}

$data = json_decode($response, true);
if (json_last_error() === JSON_ERROR_NONE && is_array($data)) {
    if (!isset($data['result']) && isset($data['message']['content'])) {
        $data['result'] = $data['message']['content'];
    }
    if (!isset($data['result']) && isset($data['response'])) {
        $data['result'] = $data['response'];
    }
}

http_response_code($httpCode);
echo json_encode($data);
