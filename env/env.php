<?php
/**
 * Environnement de déploiement PromptDeMerde (preprod / prod) + capacités LLM.
 * Source de vérité : variable Apache PDM_ENV (prod uniquement sur le serveur prod).
 *
 * GET env/env.php → JSON (environment, llm, assets, server, features)
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

$raw = getenv('PDM_ENV');
if ($raw === false || $raw === '') {
    $raw = $_SERVER['PDM_ENV'] ?? $_SERVER['REDIRECT_PDM_ENV'] ?? '';
}

$isProd = (strtolower(trim((string) $raw)) === 'prod');
$environment = $isProd ? 'prod' : 'preprod';

$homepageFragment = dirname(__DIR__) . '/assets/homepage/section-landing.html';
// Présence fichier sur disque — indépendant de prod/pré-prod (local, pré-prod, prod si bundle déployé).
$hasHomepage = is_readable($homepageFragment);

$coreScripts = [
    'assets/js/homepage.js',
    'assets/js/profiles.js',
    'assets/js/themes.js',
    'assets/js/ui.js',
    'assets/js/stt-shared.js',
    'assets/js/stt-vosk.js',
    'assets/js/stt-parakeet.js',
    'assets/js/stt-whisper.js',
    'assets/js/stt.js',
    'assets/js/app.js',
    'assets/js/workspace.js',
    'assets/js/prompts-ui.js',
    'assets/js/history-ui.js',
    'assets/js/settings-ui.js',
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
    ];
    $server = ['ollamaProxy' => 'proxy/ollama/olama.php'];
} else {
    $llmEnabled = ['ollama'];
    $llmDefault = 'ollama';
    $providerScripts = [
        'assets/js/providers.js',
        'assets/js/ollama.js',
        'assets/js/llm.js',
    ];
    $server = ['ollamaProxy' => 'proxy/ollama/olama.php'];
}

echo json_encode([
    'environment' => $environment,
    'label' => $isProd ? 'Prod' : 'Pré-prod',
    'isProd' => $isProd,
    'isPreprod' => !$isProd,
    'features' => [
        'homepage' => $hasHomepage,
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
], JSON_UNESCAPED_UNICODE);
