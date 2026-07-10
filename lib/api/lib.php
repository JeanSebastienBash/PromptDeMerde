<?php
/**
 * PromptDeMerde.com — lib.php
 *
 * Synopsis : Bibliothèque PHP d'assembly profils Markdown → pdm-config.
 * Objectif : Parser frontmatter, valider tags et produire un export JSON complet par profil.
 */
declare(strict_types=1);

const PDM_PROFILES_VERSION = '1.11.0';
const PDM_PROFILES_ROOT = __DIR__ . '/../../assets/profiles';

function pdm_profiles_root(): string
{
    return PDM_PROFILES_ROOT;
}

function pdm_profiles_available(): bool
{
    return is_readable(pdm_profiles_root() . '/manifest.json');
}

function pdm_json_response(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function pdm_parse_bool($value): bool
{
    if (is_bool($value)) {
        return $value;
    }
    $s = strtolower(trim((string) $value));
    return in_array($s, ['1', 'true', 'yes', 'on'], true);
}

function pdm_parse_frontmatter(string $content): array
{
    $content = ltrim($content, "\xEF\xBB\xBF");
    if (strpos($content, '---') !== 0) {
        return ['meta' => [], 'body' => trim($content)];
    }

    $end = strpos($content, "\n---", 3);
    if ($end === false) {
        return ['meta' => [], 'body' => trim($content)];
    }

    $yamlBlock = substr($content, 3, $end - 3);
    $body = trim(substr($content, $end + 4));
    $meta = [];

    foreach (preg_split('/\r\n|\r|\n/', $yamlBlock) as $line) {
        $line = trim($line);
        if ($line === '' || strpos($line, '#') === 0) {
            continue;
        }
        if (!preg_match('/^([A-Za-z0-9_]+)\s*:\s*(.*)$/', $line, $m)) {
            continue;
        }
        $key = $m[1];
        $val = trim($m[2]);
        if ($val === 'true' || $val === 'false') {
            $meta[$key] = pdm_parse_bool($val);
        } elseif (preg_match('/^-?\d+$/', $val)) {
            $meta[$key] = (int) $val;
        } else {
            $meta[$key] = trim($val, " \t\"'");
        }
    }

    return ['meta' => $meta, 'body' => $body];
}

function pdm_load_manifest(): array
{
    $path = pdm_profiles_root() . '/manifest.json';
    if (!is_readable($path)) {
        return ['profiles' => []];
    }
    $raw = file_get_contents($path);
    $data = json_decode($raw ?: '', true);
    if (!is_array($data) || !isset($data['profiles']) || !is_array($data['profiles'])) {
        return ['profiles' => []];
    }
    return $data;
}

function pdm_profile_ids(): array
{
    $manifest = pdm_load_manifest();
    $ids = [];
    foreach ($manifest['profiles'] as $entry) {
        if (!is_array($entry) || empty($entry['id'])) {
            continue;
        }
        $ids[] = (string) $entry['id'];
    }
    return $ids;
}

function pdm_validate_profile_id(string $id): bool
{
    return $id !== '' && in_array($id, pdm_profile_ids(), true);
}

function pdm_read_markdown_file(string $path): array
{
    if (!is_readable($path)) {
        throw new RuntimeException('Fichier introuvable : ' . basename($path));
    }
    return pdm_parse_frontmatter((string) file_get_contents($path));
}

function pdm_load_context_profiles(string $contextsDir): array
{
    if (!is_dir($contextsDir)) {
        return [];
    }

    $files = glob($contextsDir . '/*.md');
    if ($files === false) {
        return [];
    }
    sort($files, SORT_STRING);

    $profiles = [];
    foreach ($files as $file) {
        $parsed = pdm_read_markdown_file($file);
        $meta = $parsed['meta'];
        $tag = isset($meta['tag']) ? (string) $meta['tag'] : '';
        $profileId = isset($meta['id']) ? (string) $meta['id'] : '';
        $prompt = trim($parsed['body']);

        if ($tag === '' || $prompt === '') {
            continue;
        }
        if (!preg_match('/^[A-Z][a-zA-Z0-9]*$/', $tag)) {
            throw new RuntimeException('Tag invalide dans ' . basename($file) . ' : ' . $tag);
        }
        if ($profileId === '') {
            $profileId = 'ctx_' . strtolower($tag);
        }

        $profiles[] = [
            'id' => $profileId,
            'tag' => $tag,
            'prompt' => $prompt,
            'active' => isset($meta['active']) ? pdm_parse_bool($meta['active']) : true,
            'origin' => [
                'method' => 'profile_bundle',
                'sourceFile' => basename($file),
            ],
        ];
    }

    return $profiles;
}

function pdm_default_prompt_templates(): array
{
    return [
        'pdm_context_gen_system' => 'Tu es un générateur JSON pour PromptDeMerde (reformulation de prompts).' . "\n"
            . 'Tu ne converses pas : aucune phrase introductive, aucune question, aucun markdown, aucune explication.' . "\n"
            . 'Sortie OBLIGATOIRE : un seul objet JSON avec exactement les clés "tag" et "prompt".' . "\n"
            . 'Exemple (invente ton propre tag, ne recopie pas) : {"tag":"UpperCase","prompt":"Reformule toujours le texte en majuscules."}' . "\n"
            . 'Règles tag : un mot PascalCase (ex. TonFormel), lettres/chiffres uniquement, sans dièse.',
        'pdm_context_gen_user_intent' => "Génère le meilleur prompt de contexte pour ce besoin :\n",
        'pdm_context_gen_user_title' => 'Génère le meilleur prompt de contexte pour un profil nommé #{{title}}.' . "\n"
            . 'Le tag doit être exactement "{{title}}" (majuscule au début, sans espace).' . "\n"
            . 'Les instructions doivent décrire précisément le comportement attendu lors de la reformulation de prompts utilisateur, en cohérence avec ce titre.',
        'pdm_context_inject_header' => "INSTRUCTIONS SUPPLÉMENTAIRES (profils actifs) :\n",
        'pdm_context_gen_tag_intent_suffix' => "\n\nLe tag DOIT être exactement \"{{tag}}\" (majuscule au début, sans dièse).",
        'pdm_context_gen_forced_tag_system_suffix' => "\nLe champ \"tag\" DOIT être exactement \"{{tag}}\".",
        'pdm_context_gen_retry_system_suffix' => "\nTa réponse précédente était invalide (prose ou JSON absent). JSON uniquement, rien d'autre.",
        'pdm_context_gen_retry_user_suffix' => "\n\nRAPPEL STRICT : réponds UNIQUEMENT par {\"tag\":\"...\",\"prompt\":\"...\"} — pas de texte avant ni après.",
        'pdm_context_profile_line_template' => "- #{{tag}} : {{prompt}}\n",
        'pdm_context_gen_max_tokens' => 512,
        'pdm_context_gen_temperature' => 0.2,
        'pdm_context_gen_retry_temperature' => 0.1,
        'pdm_context_gen_max_retries' => 2,
        'pdm_context_gen_json_schema' => [
            'type' => 'object',
            'properties' => [
                'tag' => ['type' => 'string'],
                'prompt' => ['type' => 'string'],
            ],
            'required' => ['tag', 'prompt'],
            'additionalProperties' => false,
        ],
    ];
}

function pdm_default_platform_url(): string
{
    return 'https://promptdemerde.com';
}

function pdm_normalize_project_meta(array $meta, string $id, string $label): array
{
    $project = $meta['project'] ?? [];
    if (!is_array($project)) {
        $project = [];
    }

    $platformUrl = trim((string) ($project['platform_url'] ?? $meta['platform_url'] ?? pdm_default_platform_url()));
    $name = trim((string) ($project['name'] ?? $meta['project_name'] ?? $label));
    $url = trim((string) ($project['url'] ?? $meta['project_url'] ?? pdm_default_platform_url()));
    $vitrineUrl = trim((string) ($project['vitrine_url'] ?? $meta['vitrine_url'] ?? 'https://dreamproject.online'));

    return [
        'platform_url' => $platformUrl !== '' ? $platformUrl : pdm_default_platform_url(),
        'name' => $name !== '' ? $name : $label,
        'url' => $url !== '' ? $url : pdm_default_platform_url(),
        'vitrine_url' => $vitrineUrl !== '' ? $vitrineUrl : 'https://dreamproject.online',
    ];
}

function pdm_default_workspace_ui(): array
{
    return [
        'identity' => [
            'username' => 'chnek',
            'hostname' => 'promptdemerde',
            'usernameAlt' => 'sniper',
        ],
        'brand' => [
            'firstWord' => 'Prompt',
            'secondWord' => 'DeMerde',
            'extension' => '.com',
            'showExtension' => true,
            'firstWordClass' => '',
            'secondWordClass' => 'red',
            'extensionClass' => 'logo-dotcom',
        ],
        'texts' => [],
    ];
}

function pdm_normalize_workspace_ui($raw): array
{
    $out = pdm_default_workspace_ui();
    if (!is_array($raw)) {
        return $out;
    }

    if (isset($raw['identity']) && is_array($raw['identity'])) {
        foreach (['username', 'hostname', 'usernameAlt'] as $key) {
            if (isset($raw['identity'][$key]) && $raw['identity'][$key] !== '') {
                $out['identity'][$key] = (string) $raw['identity'][$key];
            }
        }
    }

    /* brand : logo nav fixe PromptDeMerde.com — valeurs profil/session ignorées */

    if (isset($raw['texts']) && is_array($raw['texts'])) {
        $out['texts'] = [];
        foreach ($raw['texts'] as $key => $value) {
            if (!is_string($key) || $key === '') {
                continue;
            }
            if ($value === null) {
                continue;
            }
            $out['texts'][$key] = (string) $value;
        }
    }

    return $out;
}

function pdm_assemble_profile(string $id): array
{
    if (!pdm_validate_profile_id($id)) {
        throw new InvalidArgumentException('Profil inconnu : ' . $id);
    }

    $base = pdm_profiles_root() . '/' . $id;
    $metaPath = $base . '/meta.json';
    if (!is_readable($metaPath)) {
        throw new RuntimeException('meta.json manquant pour le profil ' . $id);
    }

    $meta = json_decode((string) file_get_contents($metaPath), true);
    if (!is_array($meta)) {
        throw new RuntimeException('meta.json invalide pour le profil ' . $id);
    }

    $systemPath = $base . '/system.md';
    $systemParsed = pdm_read_markdown_file($systemPath);
    $systemBody = trim($systemParsed['body']);
    if ($systemBody === '') {
        throw new RuntimeException('system.md vide pour le profil ' . $id);
    }

    $systemEnabled = true;
    if (isset($systemParsed['meta']['enabled'])) {
        $systemEnabled = pdm_parse_bool($systemParsed['meta']['enabled']);
    }

    $contextProfiles = pdm_load_context_profiles($base . '/contexts');
    $contextGen = pdm_default_prompt_templates();

    $sttEngine = isset($meta['stt_engine']) ? (string) $meta['stt_engine'] : 'vosk-maxi';
    $allowedStt = ['vosk-mini', 'vosk-maxi', 'whisper-mini', 'whisper-maxi', 'parakeet'];
    if (!in_array($sttEngine, $allowedStt, true)) {
        $sttEngine = 'vosk-maxi';
    }

    $theme = isset($meta['theme']) ? (string) $meta['theme'] : 'dark';
    $allowedThemes = [
        'light', 'day', 'orange-day', 'red-day', 'gray-day', 'yellow-day', 'fuchsia-day',
        'ocean-day', 'forest-day', 'cyber-day', 'rose-day', 'terminal-day',
        'dark', 'orange', 'red', 'gray', 'yellow', 'fuchsia',
        'ocean', 'forest', 'cyber', 'rose', 'terminal',
    ];
    if (!in_array($theme, $allowedThemes, true)) {
        $theme = 'dark';
    }

    $contextPosition = isset($meta['context_position']) ? (string) $meta['context_position'] : 'after_system';
    if (!in_array($contextPosition, ['after_system', 'before_system'], true)) {
        $contextPosition = 'after_system';
    }

    $workspaceInput = isset($meta['workspace_input']) ? (string) $meta['workspace_input'] : '';

    $sttCompute = isset($meta['stt_compute']) ? (string) $meta['stt_compute'] : 'cpu';
    if (!in_array($sttCompute, ['cpu', 'gpu'], true)) {
        $sttCompute = 'cpu';
    }

    $workspaceUi = pdm_normalize_workspace_ui($meta['workspace_ui'] ?? null);
    $profileLabel = isset($meta['label']) ? (string) $meta['label'] : $id;
    $projectMeta = pdm_normalize_project_meta($meta, $id, $profileLabel);

  // workspace_input = exemple affiché en placeholder, jamais prérempli dans le textarea
    if ($workspaceInput !== '') {
        $placeholder = $workspaceUi['texts']['inputPlaceholder'] ?? '';
        if ($placeholder === '') {
            $workspaceUi['texts']['inputPlaceholder'] = $workspaceInput;
        }
    }

    return [
        'version' => PDM_PROFILES_VERSION,
        'type' => 'pdm-config',
        'exportedAt' => gmdate('Y-m-d\TH:i:s\Z'),
        'pdm_provider' => 'ollama',
        'pdm_model' => '',
        'pdm_system_prompt' => $systemBody,
        'pdm_system_prompt_enabled' => $systemEnabled,
        'pdm_profiles' => $contextProfiles,
        'pdm_language' => 'fr',
        'pdm_theme' => $theme,
        'pdm_history_count' => 0,
        'pdm_clean_history' => [],
        'pdm_workspace' => [
            'input' => '',
            'output' => '',
            'thinking' => '',
            'savedAt' => null,
            'contextPanelOpen' => true,
            'inputSource' => 'manual',
            'audioFileName' => null,
            'audioFileSize' => null,
            'audioMimeType' => null,
            'audioLastModified' => null,
            'audioRef' => null,
        ],
        'pdm_stt_device_id' => '',
        'pdm_stt_engine' => $sttEngine,
        'pdm_stt_compute' => $sttCompute,
        'pdm_context_position' => $contextPosition,
        'pdm_ollama_url' => 'http://localhost:11434',
        'pdm_llm_thinking_enabled' => false,
        'pdm_llm_thinking_max_chars' => 5000,
        'pdm_token_ollama' => '',
        'pdm_context_gen_system' => $contextGen['pdm_context_gen_system'],
        'pdm_context_gen_user_intent' => $contextGen['pdm_context_gen_user_intent'],
        'pdm_context_gen_user_title' => $contextGen['pdm_context_gen_user_title'],
        'pdm_context_inject_header' => $contextGen['pdm_context_inject_header'],
        'pdm_context_gen_tag_intent_suffix' => $contextGen['pdm_context_gen_tag_intent_suffix'],
        'pdm_context_gen_forced_tag_system_suffix' => $contextGen['pdm_context_gen_forced_tag_system_suffix'],
        'pdm_context_gen_retry_system_suffix' => $contextGen['pdm_context_gen_retry_system_suffix'],
        'pdm_context_gen_retry_user_suffix' => $contextGen['pdm_context_gen_retry_user_suffix'],
        'pdm_active_profile' => $id,
        'pdm_project' => $projectMeta,
        'pdm_context_profile_line_template' => $contextGen['pdm_context_profile_line_template'],
        'pdm_context_gen_max_tokens' => $contextGen['pdm_context_gen_max_tokens'],
        'pdm_context_gen_temperature' => $contextGen['pdm_context_gen_temperature'],
        'pdm_context_gen_retry_temperature' => $contextGen['pdm_context_gen_retry_temperature'],
        'pdm_context_gen_max_retries' => $contextGen['pdm_context_gen_max_retries'],
        'pdm_context_gen_json_schema' => $contextGen['pdm_context_gen_json_schema'],
        'pdm_audio_blobs' => (object) [],
        'pdm_workspace_ui' => $workspaceUi,
    ];
}
