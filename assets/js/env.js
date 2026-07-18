/**
 * PromptDeMerde.com — env.js
 *
 * Synopsis : Client de configuration serveur (GET lib/env/env.php).
 * Objectif : Exposer PDM.Env avec environnement, capacités LLM, homepage, sélecteur profils, market et extension .com nav.
 */
(function() {

var E = {};
var _data = null;
var _promise = null;

var FALLBACK = {
    environment: 'selfhosted',
    label: 'AUTO-HÉBERGÉ',
    isProd: false,
    isPreprod: false,
    isSelfHosted: true,
    features: {
        homepage: false,
        profileSelector: false,
        profilesRuntimeOk: false,
        brandNavExtension: false,
        marketplace: false,
        marketVignettesMaintenance: false
    },
    llm: {
        enabled: ['ollama'],
        default: 'ollama',
        upcoming: [{ id: 'freellm', label: 'API cloud (bientôt disponible)' }]
    },
    assets: {
        scripts: [
            'assets/js/providers.js',
            'assets/js/ollama.js',
            'assets/js/llm.js',
            'assets/js/context-generation.js',
            'assets/js/homepage.js',
            'assets/js/workspace-dictation-audio-export.js',
            'assets/js/profile-bundle-integrity.js',
            'assets/js/profile-bundle-export-keys.js',
            'assets/js/profile-bundle-export-parts.js',
            'assets/js/profile-bundle-export-build.js',
            'assets/js/profile-bundle-export.js',
            'assets/js/profile-selector.js',
            'assets/js/profile-selector-labels.js',
            'assets/js/profile-selector-export-modal-flags.js',
            'assets/js/profile-selector-export-modal-state.js',
            'assets/js/profile-selector-export-modal.js',
            'assets/js/profile-selector-export.js',
            'assets/js/profile-selector-actions.js',
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
            'assets/js/polish-textarea-resize.js',
            'assets/js/polish.js'
        ]
    },
    server: {
        ollamaProxy: 'lib/proxy/ollama/olama.php',
        profileManifest: 'lib/api/manifest.php',
    },
    security: {
        proxyAuthRequired: false
    }
};

function normalizePayload(json) {
    if (!json || (json.environment !== 'prod' && json.environment !== 'preprod' && json.environment !== 'selfhosted')) {
        throw new Error('env.php payload invalide');
    }
    if (typeof json.isSelfHosted !== 'boolean') {
        json.isSelfHosted = json.environment === 'selfhosted';
    }
    if (typeof json.isPreprod !== 'boolean') {
        json.isPreprod = json.environment === 'preprod';
    }
    if (typeof json.isProd !== 'boolean') {
        json.isProd = json.environment === 'prod';
    }
    if (!json.llm || !Array.isArray(json.llm.enabled)) {
        json.llm = FALLBACK.llm;
    }
    if (!json.assets || !Array.isArray(json.assets.scripts)) {
        json.assets = FALLBACK.assets;
    }
    if (!json.server) {
        json.server = FALLBACK.server;
    }
    if (!json.security || typeof json.security.proxyAuthRequired !== 'boolean') {
        json.security = { proxyAuthRequired: false };
    }
    if (!json.features || typeof json.features.homepage !== 'boolean') {
        json.features = {
            homepage: false,
            profileSelector: false,
            brandNavExtension: false,
            marketplace: false,
            marketVignettesMaintenance: false
        };
    } else {
        if (typeof json.features.profileSelector !== 'boolean') {
            json.features.profileSelector = false;
        }
        if (typeof json.features.profilesRuntimeOk !== 'boolean') {
            json.features.profilesRuntimeOk = json.features.profileSelector === true;
        }
        if (typeof json.features.brandNavExtension !== 'boolean') {
            json.features.brandNavExtension = false;
        }
        if (typeof json.features.marketplace !== 'boolean') {
            json.features.marketplace = false;
        }
        if (typeof json.features.marketVignettesMaintenance !== 'boolean') {
            json.features.marketVignettesMaintenance = false;
        }
    }
    return json;
}

E.load = function() {
    if (_data) return Promise.resolve(_data);
    if (_promise) return _promise;

    _promise = fetch('lib/env/env.php', { cache: 'no-store' })
        .then(function(res) {
            if (!res.ok) throw new Error('env.php HTTP ' + res.status);
            return res.json();
        })
        .then(function(json) {
            _data = normalizePayload(json);
            E.applyBrandNavExtensionFlag();
            E.applyMarketplaceNavLinks();
            E.injectExtraStylesheets();
            return _data;
        })
        .catch(function(err) {
            console.warn('[PDM.Env] Fallback selfhosted:', err && err.message ? err.message : err);
            _data = FALLBACK;
            E.applyBrandNavExtensionFlag();
            E.applyMarketplaceNavLinks();
            return _data;
        });

    return _promise;
};

E.ready = function() { return E.load(); };
E.get = function() { return _data || FALLBACK; };
E.isProd = function() { return E.get().isProd === true; };
E.isPreprod = function() { return E.get().isPreprod === true; };
E.isSelfHosted = function() { return E.get().isSelfHosted === true; };
E.getEnvironment = function() { return E.get().environment || FALLBACK.environment; };
E.hasHomepage = function() {
    var features = E.get().features;
    return !!(features && features.homepage === true);
};

E.hasProfileSelector = function() {
    var features = E.get().features;
    return !!(features && features.profileSelector === true);
};
E.showBrandNavExtension = function() {
    var features = E.get().features;
    return !!(features && features.brandNavExtension === true);
};
E.hasMarketplace = function() {
    var features = E.get().features;
    return !!(features && features.marketplace === true);
};
E.hasMarketVignettesMaintenance = function() {
    var features = E.get().features;
    return !!(features && features.marketVignettesMaintenance === true);
};
E.injectExtraStylesheets = function() {
    var assets = E.get().assets;
    var list = assets && assets.stylesheets;
    var i;
    var href;
    var link;
    if (!list || !list.length) return;
    for (i = 0; i < list.length; i++) {
        href = list[i];
        if (!href || document.querySelector('link[data-pdm-env-css="' + href + '"]')) continue;
        link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.setAttribute('data-pdm-env-css', href);
        document.head.appendChild(link);
    }
};
E.officialMarketplaceUrl = function() {
    var base = (window.PDM.ConfigSchema && window.PDM.ConfigSchema.DEFAULT_PLATFORM_URL)
        || 'https://promptdemerde.com';
    return String(base).replace(/\/$/, '') + '/#market';
};
E.applyMarketplaceNavLinks = function() {
    var local = E.hasMarketplace();
    var official = E.officialMarketplaceUrl();
    var nodes = [
        document.getElementById('nav-link-market'),
        document.getElementById('footer-link-market')
    ];
    var extTitle = '';
    if (!local && window.PDM && window.PDM.I18n && typeof window.PDM.I18n.t === 'function') {
        extTitle = window.PDM.I18n.t('nav.marketExternalTitle') || '';
    }
    for (var i = 0; i < nodes.length; i++) {
        var el = nodes[i];
        if (!el) continue;
        el.hidden = false;
        if (local) {
            el.setAttribute('href', '#market');
            el.setAttribute('data-nav', 'market');
            el.removeAttribute('target');
            el.removeAttribute('rel');
            el.removeAttribute('data-pdm-market-external');
            el.removeAttribute('title');
        } else {
            el.setAttribute('href', official);
            el.removeAttribute('data-nav');
            el.removeAttribute('target');
            el.removeAttribute('rel');
            el.setAttribute('data-pdm-market-external', '1');
            if (extTitle) el.setAttribute('title', extTitle);
            else el.removeAttribute('title');
        }
    }
    return local;
};
E.applyBrandNavExtensionFlag = function() {
    var on = E.showBrandNavExtension();
    document.documentElement.setAttribute('data-pdm-brand-nav-ext', on ? '1' : '0');
    return on;
};
E.getLabel = function() { return E.get().label || FALLBACK.label; };

E.getEnabledProviders = function() {
    var llm = E.get().llm || FALLBACK.llm;
    return Array.isArray(llm.enabled) ? llm.enabled.slice() : ['ollama'];
};

E.getDefaultProvider = function() {
    var llm = E.get().llm || FALLBACK.llm;
    var def = llm.default;
    var enabled = E.getEnabledProviders();
    if (def && enabled.indexOf(def) !== -1) return def;
    return enabled.length ? enabled[0] : 'ollama';
};

E.hasProvider = function(id) {
    return E.getEnabledProviders().indexOf(id) !== -1;
};

E.getUpcomingProviders = function() {
    var llm = E.get().llm || FALLBACK.llm;
    return Array.isArray(llm.upcoming) ? llm.upcoming.slice() : [];
};

E.getScripts = function() {
    var assets = E.get().assets || FALLBACK.assets;
    return Array.isArray(assets.scripts) ? assets.scripts.slice() : FALLBACK.assets.scripts.slice();
};

E.getServerPath = function(key) {
    var server = E.get().server || FALLBACK.server;
    return server && server[key] ? String(server[key]) : '';
};

E.isProxyAuthRequired = function() {
    var sec = E.get().security;
    return !!(sec && sec.proxyAuthRequired === true);
};

window.PDM = window.PDM || {};
window.PDM.Env = E;

})();
