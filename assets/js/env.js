/**
 * PromptDeMerde.com — env.js
 *
 * Synopsis : Client de configuration serveur (GET lib/env/env.php).
 * Objectif : Exposer PDM.Env avec environnement, capacités LLM, homepage, sélecteur profils et extension .com nav.
 */
(function() {

var E = {};
var _data = null;
var _promise = null;

var FALLBACK = {
    environment: 'preprod',
    label: 'Pré-prod',
    isProd: false,
    isPreprod: true,
    features: {
        homepage: false,
        profileSelector: false,
        brandNavExtension: false
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
            'assets/js/polish.js'
        ]
    },
    server: {
        ollamaProxy: 'lib/proxy/ollama/olama.php',
        profileManifest: 'lib/api/manifest.php',
        profileAssemble: 'lib/api/assemble.php'
    }
};

function normalizePayload(json) {
    if (!json || (json.environment !== 'prod' && json.environment !== 'preprod')) {
        throw new Error('env.php payload invalide');
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
    if (!json.features || typeof json.features.homepage !== 'boolean') {
        json.features = { homepage: false, profileSelector: false, brandNavExtension: false };
    } else {
        if (typeof json.features.profileSelector !== 'boolean') {
            json.features.profileSelector = false;
        }
        if (typeof json.features.brandNavExtension !== 'boolean') {
            json.features.brandNavExtension = false;
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
            return _data;
        })
        .catch(function(err) {
            console.warn('[PDM.Env] Fallback preprod:', err && err.message ? err.message : err);
            _data = FALLBACK;
            E.applyBrandNavExtensionFlag();
            return _data;
        });

    return _promise;
};

E.ready = function() { return E.load(); };
E.get = function() { return _data || FALLBACK; };
E.isProd = function() { return E.get().isProd === true; };
E.isPreprod = function() { return E.get().isPreprod === true; };
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

window.PDM = window.PDM || {};
window.PDM.Env = E;

})();
