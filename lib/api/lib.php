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

const PDM_PROFILES_VERSION = '1.23.0';
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

