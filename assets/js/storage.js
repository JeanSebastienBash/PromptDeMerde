/**
 * PromptDeMerde.com — Persistance locale (localStorage), export/import JSON, historique des nettoyages.
 */
(function(){

var S = {};

S.KEYS = {
    PROVIDER: 'pdm_provider',
    MODEL: 'pdm_model',
    SYSTEM_PROMPT: 'pdm_system_prompt',
    SYSTEM_PROMPT_ENABLED: 'pdm_system_prompt_enabled',
    PROFILES: 'pdm_profiles',
    LANGUAGE: 'pdm_language',
    HISTORY: 'pdm_history_count',
    CLEAN_HISTORY: 'pdm_clean_history',
    WORKSPACE: 'pdm_workspace',
    STT_DEVICE_ID: 'pdm_stt_device_id',
    STT_ENGINE: 'pdm_stt_engine',
    STT_COMPUTE: 'pdm_stt_compute',
    THEME: 'pdm_theme',
    OLLAMA_URL: 'pdm_ollama_url',
    CONTEXT_POSITION: 'pdm_context_position',
    LLM_THINKING_ENABLED: 'pdm_llm_thinking_enabled',
    TOKEN_OLLAMA: 'pdm_token_ollama'
};

S.LEGACY_KEYS = ['pdm_badge', 'pdm_tier', 'pdm_badge_expires'];
S.EXTRA_KEYS = ['_pending'];
S.VERSION = '1.4.0';
S.MAX_CLEAN_HISTORY = 100;
S._LEGACY_IMAGE_KEYS = ['pdm_image_history', 'pdm_image_options', 'pdm_image_ollama_config', 'pdm_workspace_mode'];
S._LEGACY_CONFIG_KEYS = ['pdm_endpoint', 'pdm_stt_model', 'pdm_version'];
S.MAX_PROFILES = 999;
S._CONFIG_PROVIDERS = ['ollama'];
S._PDM_PREFIX = 'pdm_';
S._DEV_PREFIX = 'pdm_dev_snap_';

S._CONFIG_KEYS = [
    S.KEYS.PROVIDER, S.KEYS.MODEL, S.KEYS.SYSTEM_PROMPT, S.KEYS.SYSTEM_PROMPT_ENABLED,
    S.KEYS.PROFILES, S.KEYS.LANGUAGE, S.KEYS.THEME,
    S.KEYS.HISTORY, S.KEYS.CLEAN_HISTORY, S.KEYS.WORKSPACE,
    S.KEYS.STT_DEVICE_ID, S.KEYS.STT_ENGINE, S.KEYS.STT_COMPUTE,
    S.KEYS.CONTEXT_POSITION, S.KEYS.OLLAMA_URL, S.KEYS.LLM_THINKING_ENABLED,
    S.KEYS.TOKEN_OLLAMA
];

function read(k) {
    try {
        var v = localStorage.getItem(k);
        if (v === null || v === 'undefined') return null;
        try { return JSON.parse(v); } catch(e) { return v; }
    } catch(e) { return null; }
}

function write(k, v) {
    try {
        var val = (typeof v === 'string') ? v : JSON.stringify(v);
        localStorage.setItem(k, val);
        return { ok: true };
    } catch(e) {
        var msg = (e && e.name === 'QuotaExceededError')
            ? 'Espace localStorage insuffisant.'
            : ((e && e.message) ? e.message : 'Erreur de stockage');
        return { ok: false, error: msg };
    }
}

function del(k) {
    try { localStorage.removeItem(k); } catch(e) {}
}

function delFromStore(store, k) {
    try { store.removeItem(k); } catch(e) {}
}

S.get = read;
S.set = function(k, v) {
    var r = write(k, v);
    if (!r.ok && S.onStorageError) S.onStorageError(r.error, k);
    return r.ok;
};
S.remove = del;

S.onStorageError = null;

S.tokenKey = function(p) { return 'pdm_token_' + p; };

S.userDataKeys = function() {
    var keys = Object.keys(S.KEYS).map(function(k) { return S.KEYS[k]; });
    for (var j = 0; j < S._CONFIG_PROVIDERS.length; j++) {
        var tk = S.tokenKey(S._CONFIG_PROVIDERS[j]);
        if (keys.indexOf(tk) === -1) keys.push(tk);
    }
    for (var e = 0; e < S.EXTRA_KEYS.length; e++) keys.push(S.EXTRA_KEYS[e]);
    for (var l = 0; l < S._LEGACY_CONFIG_KEYS.length; l++) keys.push(S._LEGACY_CONFIG_KEYS[l]);
    return keys;
};

S._scanPdmKeys = function(store) {
    var found = [];
    if (!store) return found;
    try {
        for (var i = store.length - 1; i >= 0; i--) {
            var k = store.key(i);
            if (!k) continue;
            if (k.indexOf(S._PDM_PREFIX) === 0 || k.indexOf(S._DEV_PREFIX) === 0) {
                found.push(k);
            }
        }
    } catch (e) {}
    return found;
};

S._removeKeysFromStores = function(keys) {
    for (var i = 0; i < keys.length; i++) {
        del(keys[i]);
        delFromStore(sessionStorage, keys[i]);
    }
};

S.wipeAllUserData = function() {
    var keys = {};
    var known = S.userDataKeys();
    for (var i = 0; i < known.length; i++) keys[known[i]] = true;
    var scanned = S._scanPdmKeys(localStorage).concat(S._scanPdmKeys(sessionStorage));
    for (var j = 0; j < scanned.length; j++) keys[scanned[j]] = true;
    for (var b = 0; b < S.LEGACY_KEYS.length; b++) keys[S.LEGACY_KEYS[b]] = true;
    S._removeKeysFromStores(Object.keys(keys));
};

S.getToken = function(p) {
    var v = read(S.tokenKey(p));
    return v != null ? String(v) : '';
};
S.setToken = function(p, t) {
    return S.set(S.tokenKey(p), t != null ? String(t) : '');
};

S.getProvider = function() {
    var v = read(S.KEYS.PROVIDER);
    if (v) return String(v);
    if (window.PDM && window.PDM.Env && typeof window.PDM.Env.getDefaultProvider === 'function') {
        return window.PDM.Env.getDefaultProvider();
    }
    return S._CONFIG_PROVIDERS[0] || 'ollama';
};

S.getModel = function() {
    var v = read(S.KEYS.MODEL);
    return v != null ? String(v) : '';
};

S.getSystemPrompt = function() {
    var v = read(S.KEYS.SYSTEM_PROMPT);
    return v != null ? String(v) : '';
};

S.getLanguage = function() {
    var v = read(S.KEYS.LANGUAGE);
    return v === 'en' ? 'en' : 'fr';
};

S.getTheme = function() {
    var saved = read(S.KEYS.THEME);
    if (saved) return String(saved);
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
    }
    return 'dark';
};

S.getOllamaUrl = function() { return read(S.KEYS.OLLAMA_URL) || 'http://localhost:11434'; };
S.setOllamaUrl = function(u) { return S.set(S.KEYS.OLLAMA_URL, u); };

S.getContextPosition = function() {
    var v = read(S.KEYS.CONTEXT_POSITION);
    return (v === 'before_system') ? 'before_system' : 'after_system';
};
S.setContextPosition = function(pos) {
    return S.set(S.KEYS.CONTEXT_POSITION, pos === 'before_system' ? 'before_system' : 'after_system');
};

S.isSystemPromptEnabled = function() {
    var v = read(S.KEYS.SYSTEM_PROMPT_ENABLED);
    if (v === null || v === undefined) return true;
    return v === true || v === 'true' || v === 1 || v === '1';
};
S.setSystemPromptEnabled = function(enabled) {
    return S.set(S.KEYS.SYSTEM_PROMPT_ENABLED, !!enabled);
};

S.isLlmThinkingEnabled = function() {
    var v = read(S.KEYS.LLM_THINKING_ENABLED);
    return v === true;
};

S.setLlmThinkingEnabled = function(enabled) {
    return S.set(S.KEYS.LLM_THINKING_ENABLED, !!enabled);
};

S.hasActiveContextProfiles = function() {
    var list = S.getProfiles();
    for (var i = 0; i < list.length; i++) {
        if (list[i].active) return true;
    }
    return false;
};

S.canSendToLlm = function() {
    return S.isSystemPromptEnabled() || S.hasActiveContextProfiles();
};

S.getMaxProfiles = function() { return S.MAX_PROFILES; };
S.canUseLocal = function() { return true; };
S.canUseProvider = function() { return true; };
S.canUseSTT = function() { return true; };
S.canUseAPI = function() { return true; };
S.canExport = function() { return true; };
S.canCustomizeProvider = function() { return true; };
S.getSTTMaxMs = function() { return 0; };

S.getProfiles = function() {
    var p = read(S.KEYS.PROFILES);
    return Array.isArray(p) ? p : [];
};
S.setProfiles = function(p) { return S.set(S.KEYS.PROFILES, p); };

S.getWorkspace = function() {
    var w = read(S.KEYS.WORKSPACE);
    if (!w || typeof w !== 'object') {
        return { input: '', output: '', thinking: '', savedAt: null };
    }
    return {
        input: w.input != null ? String(w.input) : '',
        output: w.output != null ? String(w.output) : '',
        thinking: w.thinking != null ? String(w.thinking) : '',
        savedAt: w.savedAt || null
    };
};

S.setWorkspace = function(data) {
    if (!data || typeof data !== 'object') data = {};
    var ws = {
        input: data.input != null ? String(data.input) : '',
        output: data.output != null ? String(data.output) : '',
        thinking: data.thinking != null ? String(data.thinking) : '',
        savedAt: data.savedAt || new Date().toISOString()
    };
    return S.set(S.KEYS.WORKSPACE, ws);
};

S.purgeLegacyImageStorage = function() {
    for (var i = 0; i < S._LEGACY_IMAGE_KEYS.length; i++) {
        del(S._LEGACY_IMAGE_KEYS[i]);
        delFromStore(sessionStorage, S._LEGACY_IMAGE_KEYS[i]);
    }
    var w = read(S.KEYS.WORKSPACE);
    if (w && typeof w === 'object' && (
        w.imageInput != null || w.imageModelInput != null ||
        w.imageImg2imgInput != null || w.imageReferenceInput != null
    )) {
        S.setWorkspace({
            input: w.input,
            output: w.output,
            thinking: w.thinking,
            savedAt: w.savedAt
        });
    }
};

S.getSttDeviceId = function() {
    var v = read(S.KEYS.STT_DEVICE_ID);
    return v != null ? String(v) : '';
};
S.setSttDeviceId = function(id) {
    return S.set(S.KEYS.STT_DEVICE_ID, id != null ? String(id) : '');
};

S.STT_ENGINES = ['vosk-mini', 'vosk-maxi', 'whisper-mini', 'whisper-maxi', 'parakeet'];
S._normSttEngine = function(v) {
    if (v === 'whisper') v = 'whisper-mini';
    if (v === 'whisper-q4') v = 'whisper-mini';
    if (v === 'whisper-q8') v = 'whisper-maxi';
    if (v === 'vosk') v = 'vosk-maxi';
    if (v === 'vosk-big') v = 'vosk-maxi';
    return S.STT_ENGINES.indexOf(v) !== -1 ? v : 'vosk-maxi';
};
S.getSttEngine = function() {
    return S._normSttEngine(read(S.KEYS.STT_ENGINE));
};
S.setSttEngine = function(engine) {
    return S.set(S.KEYS.STT_ENGINE, S._normSttEngine(engine));
};

S._normSttCompute = function(v) {
    return (v === 'gpu' || v === 'cpu') ? v : 'cpu';
};
S.getSttCompute = function() {
    var v = S._normSttCompute(read(S.KEYS.STT_COMPUTE));
    var caps = window.PDM && window.PDM.STT && typeof window.PDM.STT.getGpuCaps === 'function'
        ? window.PDM.STT.getGpuCaps() : null;
    if (!caps || !caps.canUserChooseGpu) return 'cpu';
    return v;
};
S.setSttCompute = function(mode) {
    return S.set(S.KEYS.STT_COMPUTE, S._normSttCompute(mode));
};

S.toggleProfile = function(id) {
    var list = S.getProfiles();
    var idx = -1;
    for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) { idx = i; break; }
    }
    if (idx === -1) return;
    list[idx].active = !list[idx].active;
    S.setProfiles(list);
};

S.clearAll = function() {
    S.wipeAllUserData();
};

S._dataKeys = S.userDataKeys;

S.migrateSessionToLocal = function() {
    var keys = S.userDataKeys();
    for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        try {
            if (localStorage.getItem(k) !== null) continue;
            var sv = sessionStorage.getItem(k);
            if (sv !== null) localStorage.setItem(k, sv);
        } catch (e) {}
    }
    for (var b = 0; b < S.LEGACY_KEYS.length; b++) {
        try {
            localStorage.removeItem(S.LEGACY_KEYS[b]);
            sessionStorage.removeItem(S.LEGACY_KEYS[b]);
        } catch (e2) {}
    }
    var devPrefix = S._DEV_PREFIX;
    try {
        for (var d = localStorage.length - 1; d >= 0; d--) {
            var dk = localStorage.key(d);
            if (dk && dk.indexOf(devPrefix) === 0) localStorage.removeItem(dk);
        }
    } catch (e3) {}
    S.purgeLegacyImageStorage();
};

S.incHistory = function() {
    var c = parseInt(read(S.KEYS.HISTORY) || '0', 10);
    S.set(S.KEYS.HISTORY, c + 1);
};

S.getCleanHistory = function() {
    var h = read(S.KEYS.CLEAN_HISTORY);
    return Array.isArray(h) ? h : [];
};

S.setCleanHistory = function(list) {
    if (!Array.isArray(list)) return false;
    if (list.length > S.MAX_CLEAN_HISTORY) {
        list = list.slice(list.length - S.MAX_CLEAN_HISTORY);
    }
    var ok = S.set(S.KEYS.CLEAN_HISTORY, list);
    if (ok) S.set(S.KEYS.HISTORY, list.length);
    return ok;
};

S.addCleanEntry = function(entry) {
    if (!entry || typeof entry !== 'object') return null;
    var input = entry.input != null ? String(entry.input).trim() : '';
    if (!input) return null;

    var list = S.getCleanHistory();
    var item = {
        id: entry.id || ('h' + Date.now() + '-' + list.length),
        type: 'text',
        at: entry.at || new Date().toISOString(),
        provider: entry.provider || '',
        model: entry.model || '',
        input: input,
        output: entry.output != null ? String(entry.output) : '',
        thinking: entry.thinking != null ? String(entry.thinking) : '',
        systemPrompt: entry.systemPrompt != null ? String(entry.systemPrompt) : '',
        systemPromptEffective: entry.systemPromptEffective != null ? String(entry.systemPromptEffective) : '',
        contextPosition: entry.contextPosition || S.getContextPosition(),
        activeContexts: Array.isArray(entry.activeContexts) ? entry.activeContexts : [],
        usage: entry.usage && typeof entry.usage === 'object' ? entry.usage : null,
        duration_ms: entry.duration_ms != null ? entry.duration_ms : 0
    };
    list.push(item);
    if (list.length > S.MAX_CLEAN_HISTORY) {
        list = list.slice(list.length - S.MAX_CLEAN_HISTORY);
    }
    if (!S.set(S.KEYS.CLEAN_HISTORY, list)) return null;
    S.set(S.KEYS.HISTORY, list.length);
    return item;
};

S.deleteCleanEntry = function(id) {
    if (!id) return false;
    var list = S.getCleanHistory();
    var next = [];
    var removed = false;
    for (var i = 0; i < list.length; i++) {
        if (list[i] && list[i].id === id) {
            removed = true;
            continue;
        }
        next.push(list[i]);
    }
    if (!removed) return false;
    return S.setCleanHistory(next);
};

S.clearCleanHistory = function() {
    S.setCleanHistory([]);
    return true;
};

S.clearAllHistories = function() {
    S.clearCleanHistory();
    return true;
};

S.resetOldSystemPrompt = function() {
    var prompt = read(S.KEYS.SYSTEM_PROMPT);
    if (!prompt) return;

    var oldPrompts = [
        'Sniper Engine',
        'Tu es un assistant qui reformule',
        'Réponds en français',
        'You are a helpful assistant',
        'You are an expert translator',
        'You are a professional writer',
        'Vous êtes un assistant',
        'Vous êtes un expert',
        'Vous êtes un traducteur',
        'Vous êtes un rédacteur'
    ];

    for (var i = 0; i < oldPrompts.length; i++) {
        if (prompt.indexOf(oldPrompts[i]) !== -1) {
            del(S.KEYS.SYSTEM_PROMPT);
            return;
        }
    }
};

S._exportValueForKey = function(key) {
    if (key === S.KEYS.PROVIDER) return S.getProvider();
    if (key === S.KEYS.MODEL) return S.getModel();
    if (key === S.KEYS.SYSTEM_PROMPT) return S.getSystemPrompt();
    if (key === S.KEYS.LANGUAGE) return S.getLanguage();
    if (key === S.KEYS.THEME) return S.getTheme();
    if (key === S.KEYS.PROFILES) return S.getProfiles();
    if (key === S.KEYS.CLEAN_HISTORY) return S.getCleanHistory();
    if (key === S.KEYS.WORKSPACE) return S.getWorkspace();
    if (key === S.KEYS.STT_DEVICE_ID) return S.getSttDeviceId();
    if (key === S.KEYS.STT_ENGINE) return S.getSttEngine();
    if (key === S.KEYS.STT_COMPUTE) return S.getSttCompute();
    if (key === S.KEYS.HISTORY) return S.getCleanHistory().length;
    if (key === S.KEYS.CONTEXT_POSITION) return S.getContextPosition();
    if (key === S.KEYS.OLLAMA_URL) return S.getOllamaUrl();
    if (key === S.KEYS.SYSTEM_PROMPT_ENABLED) return S.isSystemPromptEnabled();
    if (key === S.KEYS.LLM_THINKING_ENABLED) return S.isLlmThinkingEnabled();
    if (key === S.KEYS.TOKEN_OLLAMA) return S.getToken('ollama');
    return null;
};

S._detectConfigFormat = function(data) {
    if (!data || typeof data !== 'object') return null;
    if (data.type === 'pdm-config') return 'pdm-config';
    if (data.version && data.pdm_provider !== undefined) return 'pdm-config';
    return null;
};

S.exportConfig = function() {
    var data = {
        version: S.VERSION,
        type: 'pdm-config',
        exportedAt: new Date().toISOString()
    };
    var keys = S._CONFIG_KEYS;
    for (var i = 0; i < keys.length; i++) {
        data[keys[i]] = S._exportValueForKey(keys[i]);
    }
    return data;
};

S._importConfigKeys = function(data) {
    S.set(S.KEYS.PROVIDER, data[S.KEYS.PROVIDER]);
    S.set(S.KEYS.MODEL, data[S.KEYS.MODEL]);
    S.set(S.KEYS.SYSTEM_PROMPT, data[S.KEYS.SYSTEM_PROMPT]);
    S.setSystemPromptEnabled(data[S.KEYS.SYSTEM_PROMPT_ENABLED]);
    S.setProfiles(data[S.KEYS.PROFILES].slice());
    S.set(S.KEYS.LANGUAGE, data[S.KEYS.LANGUAGE]);
    S.set(S.KEYS.THEME, data[S.KEYS.THEME]);
    S.setCleanHistory(data[S.KEYS.CLEAN_HISTORY].slice());
    S.set(S.KEYS.WORKSPACE, {
        input: String(data[S.KEYS.WORKSPACE].input),
        output: String(data[S.KEYS.WORKSPACE].output),
        thinking: String(data[S.KEYS.WORKSPACE].thinking),
        savedAt: data[S.KEYS.WORKSPACE].savedAt
    });
    S.setSttDeviceId(data[S.KEYS.STT_DEVICE_ID]);
    S.setSttEngine(data[S.KEYS.STT_ENGINE]);
    S.setSttCompute(data[S.KEYS.STT_COMPUTE]);
    S.setContextPosition(data[S.KEYS.CONTEXT_POSITION]);
    S.setOllamaUrl(data[S.KEYS.OLLAMA_URL]);
    S.setLlmThinkingEnabled(data[S.KEYS.LLM_THINKING_ENABLED]);
    S.setToken('ollama', data[S.KEYS.TOKEN_OLLAMA]);
};

S.importConfig = function(data) {
    if (!data || typeof data !== 'object') {
        return { ok: false, error: 'Données invalides', errors: ['Données invalides'] };
    }

    var CS = window.PDM && window.PDM.ConfigSchema;
    if (!CS) {
        return { ok: false, error: 'Module de validation indisponible.', errors: ['Module de validation indisponible.'] };
    }

    var normalized = CS.normalizeLegacyConfig(data);
    var format = S._detectConfigFormat(normalized);
    if (!format) {
        return {
            ok: false,
            error: 'Format de fichier non reconnu — seul pdm-config complet est accepté.',
            errors: ['Format de fichier non reconnu — seul pdm-config complet est accepté.']
        };
    }

    var validation = CS.validatePdmConfig(normalized);
    if (!validation.ok) {
        return {
            ok: false,
            error: validation.errors.length === 1
                ? validation.errors[0]
                : validation.errors.length + ' erreurs de validation',
            errors: validation.errors
        };
    }

    S.wipeAllUserData();
    S._importConfigKeys(normalized);
    return { ok: true, format: 'pdm-config' };
};

S.exportProfile = S.exportConfig;

S.importProfile = function(data) {
    var result = S.importConfig(data);
    return result && result.ok;
};

window.PDM = window.PDM || {};
window.PDM.Storage = S;
})();
