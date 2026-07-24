<?php
/**
 * PromptDeMerde.com — lib.php
 *
 * Synopsis : Bibliothèque PHP profils JSON (parts/config.json) + UI projet (assets/i18n/ui/).
 */
declare(strict_types=1);

if (!function_exists('mb_strlen')) {

    function mb_strlen(string $string, ?string $encoding = null): int
    {
        return strlen($string);
    }
}

const PDM_PROFILES_VERSION = '1.24.2';
const PDM_PROFILES_ROOT = __DIR__ . '/../../assets/profiles';
const PDM_I18N_ROOT = __DIR__ . '/../../assets/i18n';

function pdm_i18n_root(): string
{
    return PDM_I18N_ROOT;
}

function pdm_project_i18n_ui_path(string $lang): string
{
    return pdm_i18n_root() . '/ui/' . $lang . '.json';
}

function pdm_is_project_i18n_available(): bool
{
    $uiFr = pdm_project_i18n_ui_path('fr');
    if (!is_readable($uiFr)) {
        return false;
    }
    $dict = json_decode((string) file_get_contents($uiFr), true);
    return is_array($dict) && count($dict) > 0;
}
function pdm_profiles_root(): string
{
    return PDM_PROFILES_ROOT;
}

function pdm_profiles_available(): bool
{
    return is_readable(pdm_profiles_root() . '/index.json');
}

function pdm_profile_json_path(string $id): string
{
    return pdm_profiles_root() . '/' . $id . '/parts/config.json';
}

function pdm_profile_parts_dir(string $id): string
{
    return pdm_profiles_root() . '/' . $id . '/parts';
}

function pdm_profile_parts_ui_override_path(string $id, string $lang): string
{
    return pdm_profile_parts_dir($id) . '/ui-overrides/' . $lang . '.json';
}

function pdm_is_valid_profile_parts(string $id): bool
{
    if (!pdm_is_project_i18n_available()) {
        return false;
    }
    $configPath = pdm_profile_json_path($id);
    return pdm_is_valid_profile_bundle($id);
}

function pdm_profile_prompts_path(string $id): string
{
    return pdm_profile_parts_dir($id) . '/prompts.json';
}

function pdm_profile_locales_path(string $id): string
{
    return pdm_profile_parts_dir($id) . '/locales.json';
}

function pdm_profile_gen_prompts_path(string $id): string
{
    return pdm_profile_parts_dir($id) . '/gen-prompts.json';
}

function pdm_profile_manifest_path(string $id): string
{
    return pdm_profiles_root() . '/' . $id . '/manifest.json';
}

function pdm_forbidden_keys_present(?array $data, array $forbidden): bool
{
    if (!is_array($data)) {
        return false;
    }
    foreach ($forbidden as $key) {
        if (array_key_exists($key, $data)) {
            return true;
        }
    }
    return false;
}

function pdm_is_valid_locales_index(?array $data): bool
{
    if (!is_array($data) || ($data['type'] ?? '') !== 'pdm-profile-locales') {
        return false;
    }
    if (!isset($data['defaultLocale']) || !is_string($data['defaultLocale']) || !preg_match('/^[a-z]{2}$/', $data['defaultLocale'])) {
        return false;
    }
    if (!isset($data['locales']) || !is_array($data['locales']) || count($data['locales']) === 0) {
        return false;
    }
    foreach ($data['locales'] as $loc) {
        if (!is_string($loc) || !preg_match('/^[a-z]{2}$/', $loc)) {
            return false;
        }
    }
    if (!in_array($data['defaultLocale'], $data['locales'], true)) {
        return false;
    }
    return true;
}

function pdm_is_valid_prompts_index(?array $data): bool
{
    if (!is_array($data) || ($data['type'] ?? '') !== 'pdm-profile-prompts') {
        return false;
    }
    if (pdm_forbidden_keys_present($data, ['availableLocales', 'defaultLocale'])) {
        return false;
    }
    if (!isset($data['system']) || !is_array($data['system'])) {
        return false;
    }
    if (!isset($data['system']['pathTemplate']) || !is_string($data['system']['pathTemplate'])) {
        return false;
    }
    if (!isset($data['contexts']) || !is_array($data['contexts'])) {
        return false;
    }
    return true;
}

function pdm_is_valid_gen_prompts_index(?array $data): bool
{
    if (!is_array($data) || ($data['type'] ?? '') !== 'pdm-profile-gen-prompts') {
        return false;
    }
    if (pdm_forbidden_keys_present($data, ['availableLocales', 'defaultLocale'])) {
        return false;
    }
    if (!isset($data['templates']) || !is_array($data['templates'])) {
        return false;
    }
    foreach ($data['templates'] as $tpl) {
        if (!is_array($tpl) || empty($tpl['pathTemplate']) || !is_string($tpl['pathTemplate'])) {
            return false;
        }
    }
    return true;
}

function pdm_profile_prompt_md_exists(string $profileId, string $relativePath): bool
{
    if ($relativePath === '' || strpos($relativePath, '..') !== false) {
        return false;
    }
    $full = pdm_profiles_root() . '/' . $profileId . '/' . ltrim($relativePath, '/');
    return is_readable($full) && is_file($full);
}

function pdm_resolve_prompt_path(string $template, string $locale, string $tag = ''): string
{
    return str_replace(['{locale}', '{tag}'], [$locale, $tag], $template);
}

function pdm_read_json_file(string $path): ?array
{
    if (!is_readable($path)) {
        return null;
    }
    $data = json_decode((string) file_get_contents($path), true);
    return is_array($data) ? $data : null;
}

function pdm_is_valid_profile_prompts_bundle(string $id): bool
{
    return count(pdm_validate_profile_prompts_bundle($id)) === 0;
}

function pdm_validate_profile_prompts_bundle(string $id): array
{
    $errors = [];
    $profileDir = pdm_profiles_root() . '/' . $id;

    $manifestPath = pdm_profile_manifest_path($id);
    if (!is_readable($manifestPath)) {
        $errors[] = 'manifest.json manquant ou illisible.';
        return $errors;
    }
    $manifest = pdm_read_json_file($manifestPath);
    if (pdm_forbidden_keys_present($manifest, ['promptLocales'])) {
        $errors[] = 'manifest.json : clé interdite promptLocales (utiliser parts/locales.json).';
    }

    $localesPath = pdm_profile_locales_path($id);
    if (!is_readable($localesPath)) {
        $errors[] = 'parts/locales.json manquant ou illisible.';
        return $errors;
    }
    $localesIndex = pdm_read_json_file($localesPath);
    if (!pdm_is_valid_locales_index($localesIndex)) {
        $errors[] = 'parts/locales.json invalide.';
        return $errors;
    }

    $promptsPath = pdm_profile_prompts_path($id);
    if (!is_readable($promptsPath)) {
        $errors[] = 'parts/prompts.json manquant ou illisible.';
        return $errors;
    }
    $prompts = pdm_read_json_file($promptsPath);
    if (!pdm_is_valid_prompts_index($prompts)) {
        $errors[] = 'parts/prompts.json invalide ou clés interdites (availableLocales, defaultLocale).';
        return $errors;
    }

    $localesToCheck = $localesIndex['locales'];
    foreach ($localesToCheck as $locale) {
        $systemRel = pdm_resolve_prompt_path((string) $prompts['system']['pathTemplate'], (string) $locale);
        if (!pdm_profile_prompt_md_exists($id, $systemRel)) {
            $errors[] = 'MD système manquant : ' . $systemRel;
        }
        foreach ($prompts['contexts'] as $ctx) {
            if (!is_array($ctx) || empty($ctx['tag']) || empty($ctx['pathTemplate'])) {
                $errors[] = 'Entrée contexte invalide dans prompts.json.';
                continue;
            }
            $ctxRel = pdm_resolve_prompt_path((string) $ctx['pathTemplate'], (string) $locale, (string) $ctx['tag']);
            if (!pdm_profile_prompt_md_exists($id, $ctxRel)) {
                $errors[] = 'MD contexte manquant : ' . $ctxRel;
            }
        }
    }

    $genPath = pdm_profile_gen_prompts_path($id);
    if (!is_readable($genPath)) {
        $errors[] = 'parts/gen-prompts.json manquant ou illisible.';
        return $errors;
    }
    $gen = pdm_read_json_file($genPath);
    if (!pdm_is_valid_gen_prompts_index($gen)) {
        $errors[] = 'parts/gen-prompts.json invalide ou clés interdites (availableLocales, defaultLocale).';
        return $errors;
    }
    foreach ($localesToCheck as $locale) {
        foreach ($gen['templates'] as $tpl) {
            if (!is_array($tpl) || empty($tpl['pathTemplate'])) {
                continue;
            }
            $genRel = pdm_resolve_prompt_path((string) $tpl['pathTemplate'], (string) $locale);
            if (!pdm_profile_prompt_md_exists($id, $genRel)) {
                $errors[] = 'MD gen-prompt manquant : ' . $genRel;
            }
        }
    }

    return $errors;
}

function pdm_is_valid_profile_json(string $path): bool
{
    if (!is_readable($path)) {
        return false;
    }
    $data = json_decode((string) file_get_contents($path), true);
    if (!is_array($data)) {
        return false;
    }
    if (($data['type'] ?? '') !== 'pdm-config') {
        return false;
    }
    if (!isset($data['pdm_provider']) || !is_string($data['pdm_provider'])) {
        return false;
    }
    return true;
}

function pdm_is_valid_profile_bundle(string $id): bool
{
    if (!pdm_is_valid_profile_json(pdm_profile_json_path($id))) {
        return false;
    }
    return pdm_is_valid_profile_prompts_bundle($id);
}

function pdm_validate_profile_bundle(string $id): array
{
    $errors = [];
    if (!pdm_is_valid_profile_json(pdm_profile_json_path($id))) {
        $errors[] = 'parts/config.json invalide ou illisible.';
    }
    $config = pdm_read_json_file(pdm_profile_json_path($id));
    if (is_array($config)) {
        if (array_key_exists('pdm_system_prompt', $config)) {
            $errors[] = 'parts/config.json : pdm_system_prompt doit être absent (fichiers MD).';
        }
        if (array_key_exists('pdm_profiles', $config)) {
            $errors[] = 'parts/config.json : pdm_profiles doit être absent (parts/prompts.json).';
        }
    }
    $errors = array_merge($errors, pdm_validate_profile_prompts_bundle($id));
    return ['ok' => count($errors) === 0, 'errors' => $errors];
}

function pdm_profiles_runtime_available(): bool
{
    if (!pdm_is_project_i18n_available()) {
        return false;
    }
    foreach (pdm_profile_ids() as $id) {
        if (pdm_is_valid_profile_parts($id)) {
            return true;
        }
    }
    return false;
}

function pdm_default_profile_id(): ?string
{
    $manifest = pdm_load_manifest();
    if (isset($manifest['profiles']) && is_array($manifest['profiles'])) {
        foreach ($manifest['profiles'] as $entry) {
            if (!is_array($entry) || empty($entry['id'])) {
                continue;
            }
            $id = (string) $entry['id'];
            if (!empty($entry['default']) && pdm_is_valid_profile_parts($id)) {
                return $id;
            }
        }
    }
    foreach (pdm_profile_ids() as $id) {
        if (pdm_is_valid_profile_parts($id)) {
            return $id;
        }
    }
    return null;
}

function pdm_json_response(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Carte /etc/environment (cache requête). Utile sous PHP-FPM : les clés
 * ajoutées après le dernier restart FPM ne sont pas dans getenv().
 */
function pdm_etc_environment_map(): array
{
    static $map = null;
    if ($map !== null) {
        return $map;
    }
    $map = [];
    $path = '/etc/environment';
    if (!is_readable($path)) {
        return $map;
    }
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (!is_array($lines)) {
        return $map;
    }
    $n = count($lines);
    for ($i = 0; $i < $n; $i++) {
        $line = trim((string) $lines[$i]);
        if ($line === '' || $line[0] === '#') {
            continue;
        }
        $eq = strpos($line, '=');
        if ($eq === false) {
            continue;
        }
        $key = trim(substr($line, 0, $eq));
        $val = trim(substr($line, $eq + 1), " \t\"'");
        if ($key !== '') {
            $map[$key] = $val;
        }
    }
    return $map;
}

/**
 * Lit une variable d'environnement booléenne.
 * Ordre : getenv → $_SERVER → REDIRECT_* → /etc/environment → flags.local.php.
 * Vrai si 1 / true / yes / on (insensible à la casse). Défaut : faux.
 */
function pdm_env_flag_truthy(string $name): bool
{
    $raw = getenv($name);
    if ($raw === false || $raw === '') {
        $raw = $_SERVER[$name] ?? $_SERVER['REDIRECT_' . $name] ?? '';
    }
    if ($raw === false || $raw === '') {
        $map = pdm_etc_environment_map();
        $raw = $map[$name] ?? '';
    }
    if ($raw === false || $raw === '') {
        $local = pdm_local_flags_map();
        $raw = $local[$name] ?? '';
    }
    $v = strtolower(trim((string) $raw));
    return $v === '1' || $v === 'true' || $v === 'yes' || $v === 'on';
}

/**
 * Overrides serveur locaux (lib/env/flags.local.php) — hors git, non UI.
 * Ex. return ['PDM_MARKET_VIGNETTES_MAINTENANCE' => '1'];
 */
function pdm_local_flags_map(): array
{
    static $map = null;
    if ($map !== null) {
        return $map;
    }
    $map = [];
    $path = dirname(__DIR__) . '/env/flags.local.php';
    if (!is_readable($path)) {
        return $map;
    }
    $data = include $path;
    if (!is_array($data)) {
        return $map;
    }
    foreach ($data as $k => $v) {
        if (is_string($k) && $k !== '') {
            $map[$k] = is_bool($v) ? ($v ? '1' : '0') : (string) $v;
        }
    }
    return $map;
}

function pdm_resolve_deployment(): array
{
    $raw = getenv('PDM_ENV');
    if ($raw === false || $raw === '') {
        $raw = $_SERVER['PDM_ENV'] ?? $_SERVER['REDIRECT_PDM_ENV'] ?? '';
    }
    $env = strtolower(trim((string) $raw));
    if ($env === 'prod') {
        return [
            'environment' => 'prod',
            'label' => 'PROD',
            'isProd' => true,
            'isPreprod' => false,
            'isSelfHosted' => false,
        ];
    }
    if ($env === 'preprod' || $env === 'pre-prod') {
        return [
            'environment' => 'preprod',
            'label' => 'PRÉ-PROD',
            'isProd' => false,
            'isPreprod' => true,
            'isSelfHosted' => false,
        ];
    }
    return [
        'environment' => 'selfhosted',
        'label' => 'AUTO-HÉBERGÉ',
        'isProd' => false,
        'isPreprod' => false,
        'isSelfHosted' => true,
    ];
}

function pdm_load_index(): array
{
    $path = pdm_profiles_root() . '/index.json';
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

function pdm_load_profile_manifest_entry(string $id): ?array
{
    if ($id === '' || !preg_match('/^[a-z0-9-]+$/', $id)) {
        return null;
    }
    $path = pdm_profiles_root() . '/' . $id . '/manifest.json';
    if (!is_readable($path)) {
        return null;
    }
    $raw = file_get_contents($path);
    $entry = json_decode($raw ?: '', true);
    if (!is_array($entry) || empty($entry['id'])) {
        return null;
    }
    $configPath = pdm_profile_json_path($id);
    if (is_readable($configPath)) {
        $cfgRaw = file_get_contents($configPath);
        $cfg = json_decode($cfgRaw ?: '', true);
        if (is_array($cfg) && isset($cfg['version']) && is_string($cfg['version'])) {
            $ver = trim($cfg['version']);
            if ($ver !== '' && preg_match('/^\d+(?:\.\d+)*$/', $ver)) {
                $entry['version'] = $ver;
            }
        }
    }
    return $entry;
}

function pdm_load_manifest(): array
{
    $index = pdm_load_index();
    $manifest = ['profiles' => []];
    if (!empty($index['platform_url'])) {
        $manifest['platform_url'] = (string) $index['platform_url'];
    }
    foreach ($index['profiles'] as $id) {
        if (!is_string($id) || $id === '') {
            continue;
        }
        $entry = pdm_load_profile_manifest_entry($id);
        if ($entry !== null) {
            $manifest['profiles'][] = $entry;
        }
    }
    return $manifest;
}

function pdm_normalize_ui_lang(?string $lang): string
{
    $lang = strtolower(trim((string) ($lang ?? 'fr')));
    if (!preg_match('/^[a-z]{2}$/', $lang)) {
        return 'fr';
    }
    return $lang;
}

function pdm_profile_synopsis_max_len(): int
{
    return 100;
}

function pdm_normalize_synopsis(?string $text): string
{
    $s = trim((string) ($text ?? ''));
    if ($s === '') {
        return '';
    }
    if (function_exists('mb_substr')) {
        return mb_substr($s, 0, pdm_profile_synopsis_max_len());
    }
    return substr($s, 0, pdm_profile_synopsis_max_len());
}

function pdm_nested_i18n_value(?array $dict, string $key): ?string
{
    if (!is_array($dict) || $key === '') {
        return null;
    }
    $parts = explode('.', $key);
    $cur = $dict;
    foreach ($parts as $part) {
        if (!is_array($cur) || !array_key_exists($part, $cur)) {
            return null;
        }
        $cur = $cur[$part];
    }
    if (!is_string($cur) || trim($cur) === '') {
        return null;
    }
    return trim($cur);
}

function pdm_profile_synopsis_from_i18n(string $profileId, string $lang): ?string
{
    if ($profileId === '' || !preg_match('/^[a-z0-9-]+$/', $profileId)) {
        return null;
    }
    $lang = pdm_normalize_ui_lang($lang);
    $path = pdm_project_i18n_ui_path($lang);
    if (!is_readable($path)) {
        return null;
    }
    $dict = pdm_read_json_file($path);
    if (!is_array($dict)) {
        return null;
    }
    $val = pdm_nested_i18n_value($dict, 'profiles.' . $profileId . '.synopsis');
    return $val !== null ? pdm_normalize_synopsis($val) : null;
}

function pdm_localize_manifest(array $manifest, ?string $lang = null): array
{
    if (!isset($manifest['profiles']) || !is_array($manifest['profiles'])) {
        return $manifest;
    }

    $lang = pdm_normalize_ui_lang($lang);
    $fallbackLang = 'en';
    if ($lang === 'en') {
        $fallbackLang = 'fr';
    }

    foreach ($manifest['profiles'] as $idx => $entry) {
        if (!is_array($entry) || empty($entry['id'])) {
            continue;
        }
        $profileId = (string) $entry['id'];
        $manifestSynopsis = isset($entry['synopsis']) ? (string) $entry['synopsis'] : '';
        $localized = pdm_profile_synopsis_from_i18n($profileId, $lang);
        if ($localized === null && $fallbackLang !== $lang) {
            $localized = pdm_profile_synopsis_from_i18n($profileId, $fallbackLang);
        }
        if ($localized !== null) {
            $manifest['profiles'][$idx]['synopsis'] = $localized;
        } elseif ($manifestSynopsis !== '') {
            $manifest['profiles'][$idx]['synopsis'] = pdm_normalize_synopsis($manifestSynopsis);
        }
    }

    return $manifest;
}

function pdm_profile_ids(): array
{
    $index = pdm_load_index();
    $ids = [];
    foreach ($index['profiles'] as $id) {
        if (!is_string($id) || $id === '' || !preg_match('/^[a-z0-9-]+$/', $id)) {
            continue;
        }
        $ids[] = $id;
    }
    return $ids;
}

function pdm_validate_profile_id(string $id): bool
{
    return $id !== '' && in_array($id, pdm_profile_ids(), true);
}

const PDM_ZIP_FREE_ROOT = __DIR__ . '/../../zip/free-profile';
const PDM_ZIP_FREE_MAX_FILES = 64;
const PDM_ZIP_FREE_MAX_BYTES = 20971520;

function pdm_zip_free_root(): string
{
    return PDM_ZIP_FREE_ROOT;
}

function pdm_to_pascal_profile_name(string $raw): string
{
    $s = trim($raw);
    if ($s === '') {
        return '';
    }
    if (class_exists('Normalizer')) {
        $n = \Normalizer::normalize($s, \Normalizer::FORM_D);
        if (is_string($n)) {
            $s = preg_replace('/\p{Mn}/u', '', $n) ?? $s;
        }
    }
    $s = preg_replace('/([a-z0-9])([A-Z])/u', '$1 $2', $s) ?? $s;
    $s = preg_replace('/([A-Z]+)([A-Z][a-z])/u', '$1 $2', $s) ?? $s;
    $s = preg_replace('/([A-Za-z])([0-9])/u', '$1 $2', $s) ?? $s;
    $s = preg_replace('/([0-9])([A-Za-z])/u', '$1 $2', $s) ?? $s;
    if (!preg_match_all('/[0-9]+|[A-Za-z]+/u', $s, $m) || empty($m[0])) {
        return '';
    }
    $out = '';
    foreach ($m[0] as $chunk) {
        if (preg_match('/^[0-9]+$/', $chunk)) {
            $out .= $chunk;
            continue;
        }
        $first = substr($chunk, 0, 1);
        $rest = substr($chunk, 1);
        $out .= strtoupper($first) . strtolower($rest);
    }
    if (strlen($out) > 64) {
        $out = substr($out, 0, 64);
    }
    return $out;
}

function pdm_zip_free_safe_filename(string $name): bool
{
    if ($name === '' || $name === '.' || $name === '..') {
        return false;
    }
    if (strpos($name, '/') !== false || strpos($name, '\\') !== false) {
        return false;
    }
    // Opérateur / utilisateur libre de renommer : seul le contenu ZIP tranche ensuite.
    return (bool) preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]{0,180}\.zip$/i', $name);
}

function pdm_zip_free_entry_id(string $filename): string
{
    return 'zipfree-' . substr(hash('sha256', $filename), 0, 16);
}

function pdm_zip_free_label(string $filename): string
{
    $base = preg_replace('/\.zip$/i', '', $filename);
    $base = preg_replace(
        '/-(?:JsonProfile|promptdemerde-profile)-v[\d.]+$/i',
        '',
        (string) $base
    );
    $pascal = pdm_to_pascal_profile_name((string) $base);
    if ($pascal !== '' && preg_match('/^[A-Z][A-Za-z0-9]*$/', $pascal)) {
        return $pascal;
    }
    return $pascal !== '' ? $pascal : (string) $base;
}

function pdm_zip_free_version(string $filename): string
{
    if (preg_match(
        '/-(?:JsonProfile|promptdemerde-profile)-v([\d.]+)\.zip$/i',
        $filename,
        $m
    )) {
        return rtrim((string) $m[1], '.');
    }
    return '';
}

/**
 * @return array{profiles: list<array<string,mixed>>, rejected: list<array<string,mixed>>, etag: string, available: bool}
 */
function pdm_list_free_zip_profiles(): array
{
    $dir = pdm_zip_free_root();
    $profiles = [];
    $rejected = [];
    $stampParts = [];
    if (!is_dir($dir) || !is_readable($dir)) {
        $etag = hash('sha256', 'empty');
        return ['profiles' => [], 'rejected' => [], 'etag' => $etag, 'available' => false];
    }
    $names = scandir($dir);
    if (!is_array($names)) {
        $etag = hash('sha256', 'empty');
        return ['profiles' => [], 'rejected' => [], 'etag' => $etag, 'available' => false];
    }
    sort($names, SORT_STRING);
    foreach ($names as $name) {
        if ($name === '.' || $name === '..' || $name === '.gitkeep') {
            continue;
        }
        $full = $dir . '/' . $name;
        if (!is_file($full)) {
            continue;
        }
        if (!preg_match('/\.zip$/i', $name)) {
            continue;
        }
        if (count($profiles) >= PDM_ZIP_FREE_MAX_FILES) {
            $rejected[] = [
                'filename' => $name,
                'reason' => 'max_files',
            ];
            $stampParts[] = 'rej:' . $name . ':max_files';
            continue;
        }
        if (!pdm_zip_free_safe_filename($name)) {
            $rejected[] = [
                'filename' => $name,
                'reason' => 'filename',
            ];
            $stampParts[] = 'rej:' . $name . ':filename';
            continue;
        }
        if (!is_readable($full)) {
            $rejected[] = [
                'filename' => $name,
                'reason' => 'unreadable',
            ];
            $stampParts[] = 'rej:' . $name . ':unreadable';
            continue;
        }
        $size = filesize($full);
        if ($size === false || $size < 1 || $size > PDM_ZIP_FREE_MAX_BYTES) {
            $rejected[] = [
                'filename' => $name,
                'reason' => 'size',
            ];
            $stampParts[] = 'rej:' . $name . ':size';
            continue;
        }
        $mtime = filemtime($full);
        if ($mtime === false) {
            $mtime = 0;
        }
        $id = pdm_zip_free_entry_id($name);
        $ver = pdm_zip_free_version($name);
        $profiles[] = [
            'id' => $id,
            'label' => pdm_zip_free_label($name),
            'tier' => 'free',
            'filename' => $name,
            'version' => $ver,
            'size' => $size,
            'mtime' => $mtime,
            'url' => 'zip/free-profile/' . rawurlencode($name),
        ];
        $stampParts[] = $name . ':' . $size . ':' . $mtime;
    }
    $etag = hash('sha256', implode('|', $stampParts));
    return [
        'profiles' => $profiles,
        'rejected' => $rejected,
        'etag' => $etag,
        'available' => count($profiles) > 0,
    ];
}

const PDM_ZIP_PREMIUM_ROOT = __DIR__ . '/../../zip/premium-profile';

function pdm_zip_premium_root(): string
{
    return PDM_ZIP_PREMIUM_ROOT;
}

/**
 * @return list<array{tier:string,dir:string,urlPrefix:string}>
 */
function pdm_market_zip_drop_roots(): array
{
    return [
        ['tier' => 'free', 'dir' => pdm_zip_free_root(), 'urlPrefix' => 'zip/free-profile/'],
        ['tier' => 'premium', 'dir' => pdm_zip_premium_root(), 'urlPrefix' => 'zip/premium-profile/'],
    ];
}

/**
 * @return list<string>
 */
function pdm_market_zip_required_assets(): array
{
    return [
        'market/listing.json',
        'market/preview.png',
        'market/screenshots/input.png',
        'market/screenshots/output.png',
    ];
}

function pdm_market_zip_safe_inner_path(string $path): bool
{
    if ($path === '' || strpos($path, '..') !== false) {
        return false;
    }
    if (strpos($path, '\\') !== false) {
        return false;
    }
    if (strncmp($path, 'market/', 7) !== 0) {
        return false;
    }
    return (bool) preg_match('#^market/[A-Za-z0-9._/-]+$#', $path);
}

/**
 * @return list<string>|null
 */
function pdm_unzip_list_names(string $zipPath): ?array
{
    $cmd = 'unzip -Z1 ' . escapeshellarg($zipPath) . ' 2>/dev/null';
    $out = shell_exec($cmd);
    if (!is_string($out) || $out === '') {
        return null;
    }
    $names = preg_split("/\r\n|\n|\r/", trim($out));
    if (!is_array($names)) {
        return null;
    }
    return array_values(array_filter($names, static function ($n) {
        return is_string($n) && $n !== '';
    }));
}

function pdm_unzip_read_entry(string $zipPath, string $inner): ?string
{
    $cmd = 'unzip -p ' . escapeshellarg($zipPath) . ' ' . escapeshellarg($inner) . ' 2>/dev/null';
    $out = shell_exec($cmd);
    if (!is_string($out) || $out === '') {
        return null;
    }
    return $out;
}

/**
 * @return array<string,mixed>|null
 */
function pdm_market_zip_read_listing(string $zipPath): ?array
{
    $names = null;
    if (class_exists('ZipArchive')) {
        $za = new ZipArchive();
        if ($za->open($zipPath) === true) {
            $names = [];
            for ($i = 0; $i < $za->numFiles; $i++) {
                $n = $za->getNameIndex($i);
                if (is_string($n)) {
                    $names[] = $n;
                }
            }
            $za->close();
        }
    }
    if ($names === null) {
        $names = pdm_unzip_list_names($zipPath);
    }
    if ($names === null) {
        return null;
    }
    $set = array_fill_keys($names, true);
    foreach (pdm_market_zip_required_assets() as $need) {
        if (!isset($set[$need])) {
            return null;
        }
    }
    $raw = null;
    if (class_exists('ZipArchive')) {
        $za = new ZipArchive();
        if ($za->open($zipPath) === true) {
            $got = $za->getFromName('market/listing.json');
            $za->close();
            if (is_string($got) && $got !== '') {
                $raw = $got;
            }
        }
    }
    if ($raw === null) {
        $raw = pdm_unzip_read_entry($zipPath, 'market/listing.json');
    }
    if (!is_string($raw) || $raw === '') {
        return null;
    }
    $listing = json_decode($raw, true);
    if (!is_array($listing) || ($listing['type'] ?? '') !== 'pdm-marketplace-listing') {
        return null;
    }
    if (!isset($listing['id'], $listing['label'], $listing['synopsis_short'])) {
        return null;
    }
    return $listing;
}

/**
 * @return string|null binary
 */
function pdm_market_zip_read_asset(string $tier, string $filename, string $relPath): ?string
{
    if (!pdm_zip_free_safe_filename($filename)) {
        return null;
    }
    $inner = 'market/' . ltrim(str_replace('\\', '/', $relPath), '/');
    if (strncmp($relPath, 'market/', 7) === 0) {
        $inner = $relPath;
    }
    if (!pdm_market_zip_safe_inner_path($inner)) {
        return null;
    }
    $root = $tier === 'premium' ? pdm_zip_premium_root() : pdm_zip_free_root();
    $full = $root . '/' . $filename;
    if (!is_file($full) || !is_readable($full)) {
        return null;
    }
    if (class_exists('ZipArchive')) {
        $za = new ZipArchive();
        if ($za->open($full) === true) {
            $bin = $za->getFromName($inner);
            $za->close();
            if (is_string($bin) && $bin !== '') {
                return $bin;
            }
        }
    }
    return pdm_unzip_read_entry($full, $inner);
}

/**
 * @return array{entries:list<array<string,mixed>>,publishers:list<array<string,mixed>>,etag:string,available:bool}
 */
function pdm_market_zip_catalog(): array
{
    $entries = [];
    $stamp = [];
    foreach (pdm_market_zip_drop_roots() as $drop) {
        $dir = $drop['dir'];
        if (!is_dir($dir) || !is_readable($dir)) {
            continue;
        }
        $names = scandir($dir);
        if (!is_array($names)) {
            continue;
        }
        sort($names, SORT_STRING);
        foreach ($names as $name) {
            if ($name === '.' || $name === '..' || $name === '.gitkeep') {
                continue;
            }
            if (!preg_match('/\.zip$/i', $name) || !pdm_zip_free_safe_filename($name)) {
                continue;
            }
            $full = $dir . '/' . $name;
            if (!is_file($full) || !is_readable($full)) {
                continue;
            }
            $size = filesize($full);
            if ($size === false || $size < 1) {
                continue;
            }
            $listing = pdm_market_zip_read_listing($full);
            if ($listing === null) {
                continue;
            }
            $mtime = filemtime($full) ?: 0;
            $listing['_drop'] = [
                'tier' => $drop['tier'],
                'filename' => $name,
                'url' => $drop['urlPrefix'] . rawurlencode($name),
                'size' => $size,
                'mtime' => $mtime,
            ];
            if (!isset($listing['archive']) || !is_array($listing['archive'])) {
                $listing['archive'] = [];
            }
            if (empty($listing['archive']['size_bytes'])) {
                $listing['archive']['size_bytes'] = $size;
            }
            if (empty($listing['archive']['filename'])) {
                $listing['archive']['filename'] = $name;
            }
            $entries[] = $listing;
            $stamp[] = $drop['tier'] . ':' . $name . ':' . $size . ':' . $mtime;
        }
    }
    usort($entries, static function ($a, $b) {
        $sa = (int) ($a['sort_order'] ?? 9999);
        $sb = (int) ($b['sort_order'] ?? 9999);
        if ($sa !== $sb) {
            return $sa <=> $sb;
        }
        return strcmp((string) ($a['id'] ?? ''), (string) ($b['id'] ?? ''));
    });
    return [
        'entries' => $entries,
        'publishers' => [
            [
                'id' => 'dreamproject',
                'name' => 'DreamprojectAI',
                'official' => true,
                'url' => 'https://www.dreamproject.online',
                'avatar' => 'dreamproject.svg',
                'tagline' => 'Éditeur officiel PromptDeMerde — archives signées',
                'bio' => 'Archives signées DreamprojectAI — protocole JSON v2.',
            ],
        ],
        'etag' => hash('sha256', implode('|', $stamp) ?: 'empty'),
        'available' => count($entries) > 0,
    ];
}


