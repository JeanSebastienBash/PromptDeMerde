<?php
/**
 * PromptDeMerde.com — env.php
 *
 * Synopsis : Endpoint JSON de configuration déploiement (preprod/prod).
 * Objectif : Lire PDM_ENV, lister scripts autorisés, providers LLM, features homepage/profils et marque nav.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

$raw = getenv('PDM_ENV');
if ($raw === false || $raw === '') {
    $raw = $_SERVER['PDM_ENV'] ?? $_SERVER['REDIRECT_PDM_ENV'] ?? '';
}

$isProd = (strtolower(trim((string) $raw)) === 'prod');
$environment = $isProd ? 'prod' : 'preprod';

$root = dirname(__DIR__, 2);
$homepageFragment = $root . '/assets/homepage/section-landing.html';
// Présence fichier sur disque — indépendant de prod/pré-prod (local, pré-prod, prod si bundle déployé).
$hasHomepage = is_readable($homepageFragment);

require_once dirname(__DIR__) . '/api/lib.php';
$hasProfiles = pdm_profiles_available();

$coreScripts = [
    'assets/js/homepage.js',
    'assets/js/profile-selector.js',
    'assets/js/profile-selector-export.js',
    'assets/js/profile-selector-actions.js',
    'assets/js/profiles.js',
    'assets/js/themes.js',
    'assets/js/ui.js',
    'assets/js/footer-projects.js',
    'assets/js/stt-shared-core.js',
    'assets/js/stt-shared-support.js',
    'assets/js/stt-shared-text.js',
    'assets/js/stt-shared-progress.js',
    'assets/js/stt-shared-permissions.js',
    'assets/js/stt-shared-audio.js',
    'assets/js/stt-shared-gpu.js',
    'assets/js/stt-shared-beep.js',
    'assets/js/stt-vosk-model.js',
    'assets/js/stt-vosk-engine.js',
    'assets/js/stt-parakeet.js',
    'assets/js/stt-whisper.js',
    'assets/js/stt-core.js',
    'assets/js/stt-permissions.js',
    'assets/js/stt-ui.js',
    'assets/js/stt-preload.js',
    'assets/js/stt-init.js',
    'assets/js/stt-dictation-recorder.js',
    'assets/js/workspace-ui-profile.js',
    'assets/js/workspace-dictation-audio.js',
    'assets/js/workspace-dictation-audio-export.js',
    'assets/js/app.js',
    'assets/js/workspace-persistence.js',
    'assets/js/workspace-bind.js',
    'assets/js/workspace-stream.js',
    'assets/js/workspace-refresh.js',
    'assets/js/workspace-inference.js',
    'assets/js/workspace-thinking.js',
    'assets/js/workspace-llm-config.js',
    'assets/js/workspace-audio-mode.js',
    'assets/js/workspace-audio-bind.js',
    'assets/js/prompts-ui.js',
    'assets/js/prompts-ui-generate.js',
    'assets/js/prompts-ui-list.js',
    'assets/js/history-ui.js',
    'assets/js/history-ui-modal.js',
    'assets/js/history-ui-list.js',
    'assets/js/settings-ui.js',
    'assets/js/polish-textarea-resize.js',
    'assets/js/polish.js',
];

$homepageScripts = $hasHomepage ? [
    'assets/homepage/landing-demo.js',
    'assets/homepage/video.js',
    'assets/homepage/demo-tabs.js',
] : [];

if ($isProd) {
    // Prod future : remplacer par freellm uniquement (hors scope implémentation actuelle).
    $llmEnabled = ['ollama'];
    $llmDefault = 'ollama';
    $providerScripts = [
        'assets/js/providers.js',
        'assets/js/ollama.js',
        'assets/js/llm.js',
        'assets/js/context-generation.js',
    ];
    $server = [
        'ollamaProxy' => 'lib/proxy/ollama/olama.php',
        'profileManifest' => 'lib/api/manifest.php',
        'profileAssemble' => 'lib/api/assemble.php',
    ];
} else {
    $llmEnabled = ['ollama'];
    $llmDefault = 'ollama';
    $providerScripts = [
        'assets/js/providers.js',
        'assets/js/ollama.js',
        'assets/js/llm.js',
        'assets/js/context-generation.js',
    ];
    $server = [
        'ollamaProxy' => 'lib/proxy/ollama/olama.php',
        'profileManifest' => 'lib/api/manifest.php',
        'profileAssemble' => 'lib/api/assemble.php',
    ];
}

$proxyTokenRaw = getenv('PDM_PROXY_TOKEN');
if ($proxyTokenRaw === false || $proxyTokenRaw === '') {
    $proxyTokenRaw = $_SERVER['PDM_PROXY_TOKEN'] ?? $_SERVER['REDIRECT_PDM_PROXY_TOKEN'] ?? '';
}

echo json_encode([
    'environment' => $environment,
    'label' => $isProd ? 'Prod' : 'Pré-prod',
    'isProd' => $isProd,
    'isPreprod' => !$isProd,
    'features' => [
        'homepage' => $hasHomepage,
        'profileSelector' => $hasProfiles,
        'brandNavExtension' => true,
    ],
    'llm' => [
        'enabled' => $llmEnabled,
        'default' => $llmDefault,
        'upcoming' => [
            ['id' => 'freellm', 'label' => 'API cloud (bientôt disponible)'],
        ],
    ],
    'assets' => [
        'scripts' => array_merge($providerScripts, $coreScripts, $homepageScripts),
    ],
    'server' => $server,
    'security' => [
        'proxyAuthRequired' => (trim((string) $proxyTokenRaw) !== ''),
    ],
], JSON_UNESCAPED_UNICODE);
