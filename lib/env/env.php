<?php
/**
 * PromptDeMerde.com — env.php
 *
 * Synopsis : Endpoint JSON de configuration déploiement (prod/preprod/selfhosted).
 * Objectif : Lire PDM_ENV, lister scripts autorisés, providers LLM, features homepage/profils/market/site-pages et marque nav.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

require_once dirname(__DIR__) . '/api/lib.php';

$deployment = pdm_resolve_deployment();
$environment = $deployment['environment'];
$isProd = $deployment['isProd'];
$isPreprod = $deployment['isPreprod'];
$isSelfHosted = $deployment['isSelfHosted'];

$root = dirname(__DIR__, 2);
$homepageFragment = $root . '/assets/homepage/section-landing.html';
$hasHomepage = is_readable($homepageFragment);

$marketIndex = $root . '/assets/market/index.json';
$hasMarket = is_readable($marketIndex);
$marketVignettesMaintenance = pdm_env_flag_truthy('PDM_MARKET_VIGNETTES_MAINTENANCE');

$sitePagesFr = $root . '/assets/i18n/site-pages/fr.json';
$hasSitePages = is_readable($sitePagesFr);

$hasProfiles = pdm_profiles_runtime_available();

$coreScripts = [
    'assets/js/homepage.js',
    'assets/js/profile-bundle-integrity.js',
    'assets/js/profile-bundle-export-keys.js',
    'assets/js/profile-bundle-export-identity.js',
    'assets/js/profile-bundle-export-parts.js',
    'assets/js/profile-bundle-export-build.js',
    'assets/js/profile-bundle-export-map.js',
    'assets/js/profile-bundle-export.js',
    'assets/js/profile-selector.js',
    'assets/js/profile-selector-labels.js',
    'assets/js/profile-selector-export-modal-flags.js',
    'assets/js/profile-selector-export-modal-state.js',
    'assets/js/profile-selector-export-modal.js',
    'assets/js/profile-selector-export.js',
    'assets/js/profile-selector-actions.js',
    'assets/js/profile-configure-help.js',
    'assets/js/profile-configure-texts.js',
    'assets/js/profile-configure-form.js',
    'assets/js/profile-configure-modal.js',
    'assets/js/profiles.js',
    'assets/js/themes.js',
    'assets/js/ui.js',
    'assets/js/footer-projects.js',
    'assets/js/footer-radar-portrait.js',
    'assets/js/stt-shared-core.js',
    'assets/js/stt-shared-support.js',
    'assets/js/stt-shared-text.js',
    'assets/js/stt-shared-progress.js',
    'assets/js/stt-shared-permissions.js',
    'assets/js/stt-shared-audio.js',
    'assets/js/stt-shared-gpu.js',
    'assets/js/stt-shared-beep.js',
    'assets/js/stt-vosk-catalog.js',
    'assets/js/stt-vosk-model.js',
    'assets/js/stt-vosk-engine.js',
    'assets/js/stt-parakeet.js',
    'assets/js/stt-whisper.js',
    'assets/js/stt-core.js',
    'assets/js/stt-permissions.js',
    'assets/js/stt-ui.js',
    'assets/js/stt-preload.js',
    'assets/js/stt-init.js',
    'assets/js/stt-disruptive.js',
    'assets/js/stt-options-panel.js',
    'assets/js/stt-dictation-recorder.js',
    'assets/js/workspace-ui-profile.js',
    'assets/js/workspace-ui-profile-sync.js',
    'assets/js/workspace-ui-profile-boot.js',
    'assets/js/workspace-input-tools.js',
    'assets/js/workspace-dictation-audio.js',
    'assets/js/workspace-dictation-audio-export.js',
    'assets/js/workspace-tts-download.js',
    'assets/js/docs-links.js',
    'assets/js/app.js',
    'assets/js/workspace-persistence.js',
    'assets/js/workspace-bind.js',
    'assets/js/workspace-stream.js',
    'assets/js/workspace-refresh.js',
    'assets/js/profile-output-json.js',
    'assets/js/workspace-output-format.js',
    'assets/js/prompt-compress.js',
    'assets/js/workspace-input-chunk.js',
    'assets/js/workspace-inference.js',
    'assets/js/workspace-thinking.js',
    'assets/js/workspace-llm-options.js',
    'assets/js/workspace-llm-config.js',
    'assets/js/workspace-audio-mode.js',
    'assets/js/workspace-audio-bind.js',
    'assets/js/workspace-image-encode.js',
    'assets/js/workspace-image-bind.js',
    'assets/js/prompts-ui.js',
    'assets/js/prompts-ui-generate.js',
    'assets/js/prompts-ui-list.js',
    'assets/js/history-ui.js',
    'assets/js/history-trace.js',
    'assets/js/history-ui-modal.js',
    'assets/js/history-ui-list.js',
    'assets/js/proxy-token-session.js',
    'assets/js/settings-ui.js',
    'assets/js/ollama-missing-nudge.js',
    'assets/js/polish-textarea-resize.js',
    'assets/js/polish.js',
];

/* Marketplace JS : hors miroir public — chargés seulement si catalogue local présent. */
$marketScripts = [];
if ($hasMarket) {
    $marketFiles = glob($root . '/assets/js/market-*.js');
    if (is_array($marketFiles)) {
        $marketEarly = [];
        $marketUiBits = [];
        $marketUiMain = [];
        foreach ($marketFiles as $abs) {
            if (!is_readable($abs)) {
                continue;
            }
            $base = basename($abs);
            $rel = 'assets/js/' . $base;
            if ($base === 'market-ui.js') {
                $marketUiMain[] = $rel;
            } elseif (strncmp($base, 'market-ui-', 10) === 0) {
                $marketUiBits[] = $rel;
            } else {
                $marketEarly[] = $rel;
            }
        }
        sort($marketEarly, SORT_STRING);
        sort($marketUiBits, SORT_STRING);
        /* cards en dernier parmi market-ui-* : unique propriétaire de _renderResults. */
        $cardsRel = 'assets/js/market-ui-cards.js';
        $withoutCards = [];
        $cardsOnly = [];
        foreach ($marketUiBits as $rel) {
            if ($rel === $cardsRel) {
                $cardsOnly[] = $rel;
            } else {
                $withoutCards[] = $rel;
            }
        }
        $marketUiBits = array_merge($withoutCards, $cardsOnly);
        $marketScripts = array_merge($marketEarly, $marketUiBits, $marketUiMain);
    }
}

$homepageScripts = $hasHomepage ? [
    'assets/homepage/landing-demo.js',
    'assets/homepage/video.js',
] : [];

if ($isProd) {
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
    ];
}

$proxyTokenRaw = getenv('PDM_PROXY_TOKEN');
if ($proxyTokenRaw === false || $proxyTokenRaw === '') {
    $proxyTokenRaw = $_SERVER['PDM_PROXY_TOKEN'] ?? $_SERVER['REDIRECT_PDM_PROXY_TOKEN'] ?? '';
}

// Bust cache navigateur (ETag seul ne force pas le rechargement après edit JS)
$scriptList = array_merge($providerScripts, $coreScripts, $marketScripts, $homepageScripts);
$scriptsWithBust = [];
foreach ($scriptList as $rel) {
    $abs = $root . '/' . $rel;
    $ver = is_readable($abs) ? (string) filemtime($abs) : (string) time();
    $scriptsWithBust[] = $rel . '?v=' . $ver;
}

$stylesheets = [];
if ($hasMarket) {
    $marketCssFiles = glob($root . '/assets/css/*market*.css');
    if (is_array($marketCssFiles)) {
        sort($marketCssFiles, SORT_STRING);
        foreach ($marketCssFiles as $abs) {
            if (!is_readable($abs)) {
                continue;
            }
            $stylesheets[] = 'assets/css/' . basename($abs) . '?v=' . (string) filemtime($abs);
        }
    }
}

echo json_encode([
    'environment' => $environment,
    'label' => $deployment['label'],
    'isProd' => $isProd,
    'isPreprod' => $isPreprod,
    'isSelfHosted' => $isSelfHosted,
    'features' => [
        'homepage' => $hasHomepage,
        'profileSelector' => $hasProfiles,
        'profilesRuntimeOk' => $hasProfiles,
        'brandNavExtension' => $isProd || $isPreprod,
        'marketplace' => $hasMarket,
        'marketVignettesMaintenance' => $marketVignettesMaintenance,
        'sitePages' => $hasSitePages,
    ],
    'llm' => [
        'enabled' => $llmEnabled,
        'default' => $llmDefault,
        'upcoming' => [
            ['id' => 'freellm', 'label' => 'API cloud (bientôt disponible)'],
        ],
    ],
    'assets' => [
        'scripts' => $scriptsWithBust,
        'stylesheets' => $stylesheets,
    ],
    'server' => $server,
    'security' => [
        'proxyAuthRequired' => (trim((string) $proxyTokenRaw) !== ''),
    ],
], JSON_UNESCAPED_UNICODE);
