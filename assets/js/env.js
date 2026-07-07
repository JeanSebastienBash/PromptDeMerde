/**
 * PromptDeMerde.com — Détection d'environnement et capacités LLM via env/env.php.
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
        homepage: false
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
            'assets/js/polish.js'
        ]
    },
    server: { ollamaProxy: 'proxy/ollama/olama.php' }
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
        json.features = { homepage: false };
    }
    return json;
}

E.load = function() {
    if (_data) return Promise.resolve(_data);
    if (_promise) return _promise;

    _promise = fetch('env/env.php', { cache: 'no-store' })
        .then(function(res) {
            if (!res.ok) throw new Error('env.php HTTP ' + res.status);
            return res.json();
        })
        .then(function(json) {
            _data = normalizePayload(json);
            return _data;
        })
        .catch(function(err) {
            console.warn('[PDM.Env] Fallback preprod:', err && err.message ? err.message : err);
            _data = FALLBACK;
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
