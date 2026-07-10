/**
 * PromptDeMerde.com — storage-config-io.js
 *
 * Synopsis : Export/import JSON pdm-config (cœur) et profils personnels.
 * Objectif : Étendre PDM.Storage avec exportConfig et le CRUD profils perso ; blobs audio dans storage-config-audio.js, import/bundle dans storage-config-import.js.
 */
(function(){

var S = window.PDM && window.PDM.Storage;
if (!S) { console.warn('[storage-config-io] PDM.Storage not found.'); return; }

S.resetOldSystemPrompt = function() {
    var prompt = S.get(S.KEYS.SYSTEM_PROMPT);
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
            S.remove(S.KEYS.SYSTEM_PROMPT);
            return;
        }
    }
};

S._exportValueForKey = function(key) {
    if (key === S.KEYS.PROVIDER) return S.getProvider();
    if (key === S.KEYS.MODEL) return S.getModel();
    if (key === S.KEYS.SYSTEM_PROMPT) return S.getSystemPromptEffective();
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
    if (key === S.KEYS.LLM_THINKING_MAX_CHARS) return S.getLlmThinkingMaxChars();
    if (key === S.KEYS.TOKEN_OLLAMA) return S.getToken('ollama');
    if (key === S.KEYS.CONTEXT_GEN_SYSTEM) return S.getContextGenSystemEffective();
    if (key === S.KEYS.CONTEXT_GEN_USER_INTENT) return S.getContextGenUserIntentEffective();
    if (key === S.KEYS.CONTEXT_GEN_USER_TITLE) return S.getContextGenUserTitleEffective();
    if (key === S.KEYS.CONTEXT_INJECT_HEADER) return S.getContextInjectHeaderEffective();
    if (key === S.KEYS.CONTEXT_GEN_TAG_INTENT_SUFFIX) return S.getContextGenTagIntentSuffixEffective();
    if (key === S.KEYS.CONTEXT_GEN_FORCED_TAG_SYSTEM_SUFFIX) return S.getContextGenForcedTagSystemSuffixEffective();
    if (key === S.KEYS.CONTEXT_GEN_RETRY_SYSTEM_SUFFIX) return S.getContextGenRetrySystemSuffixEffective();
    if (key === S.KEYS.CONTEXT_GEN_RETRY_USER_SUFFIX) return S.getContextGenRetryUserSuffixEffective();
    if (key === S.KEYS.ACTIVE_PROFILE) return S.getActiveProfile();
    if (key === S.KEYS.CONTEXT_PROFILE_LINE_TEMPLATE) return S.getContextProfileLineTemplateEffective();
    if (key === S.KEYS.CONTEXT_GEN_MAX_TOKENS) return S.getContextGenMaxTokens();
    if (key === S.KEYS.CONTEXT_GEN_TEMPERATURE) return S.getContextGenTemperature();
    if (key === S.KEYS.CONTEXT_GEN_RETRY_TEMPERATURE) return S.getContextGenRetryTemperature();
    if (key === S.KEYS.CONTEXT_GEN_MAX_RETRIES) return S.getContextGenMaxRetries();
    if (key === S.KEYS.CONTEXT_GEN_JSON_SCHEMA) return S.getContextGenJsonSchemaEffective();
    if (key === S.KEYS.WORKSPACE_UI) return S.getWorkspaceUiEffective();
    if (key === 'pdm_audio_blobs') return {}; // Placeholder - sera rempli par exportConfigAsync
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
    var keys = (window.PDM && window.PDM.ConfigSchema && window.PDM.ConfigSchema.PDM_KEYS)
        ? window.PDM.ConfigSchema.PDM_KEYS
        : S._CONFIG_KEYS;
    for (var i = 0; i < keys.length; i++) {
        data[keys[i]] = S._exportValueForKey(keys[i]);
    }
    return data;
};

/** Export partageable type profil bundlé : config actuelle, sans historique ni brouillon ni token. */
S.exportConfigForNewProfile = function() {
    var data = S.exportConfig();
    if (!data) return null;
    data.pdm_history_count = 0;
    data.pdm_clean_history = [];
    data.pdm_workspace = {
        input: '',
        output: '',
        thinking: '',
        savedAt: null,
        contextPanelOpen: true,
        inputSource: 'manual',
        audioFileName: null,
        audioFileSize: null,
        audioMimeType: null,
        audioLastModified: null,
        audioRef: null,
        audioSegmentCount: null
    };
    data.pdm_token_ollama = '';
    return data;
};

S.CUSTOM_PROFILE_PREFIX = 'custom-';

S.ensureCustomProfileId = function(id) {
    var s = String(id || '').trim().toLowerCase();
    s = s.replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
    if (!s) s = 'profile';
    if (s.indexOf(S.CUSTOM_PROFILE_PREFIX) === 0) return s;
    return S.CUSTOM_PROFILE_PREFIX + s;
};

S.isCustomProfileId = function(id) {
    return String(id || '').indexOf(S.CUSTOM_PROFILE_PREFIX) === 0;
};

S.getCustomProfiles = function() {
    var v = S.get(S.KEYS.CUSTOM_PROFILES);
    if (!Array.isArray(v)) return [];
    var out = [];
    for (var i = 0; i < v.length; i++) {
        var p = v[i];
        if (p && p.id && p.config && typeof p.config === 'object') out.push(p);
    }
    return out;
};

S.saveCustomProfile = function(id, label, config) {
    var pid = S.ensureCustomProfileId(id);
    var list = S.getCustomProfiles();
    var entry = {
        id: pid,
        label: String(label || pid),
        config: JSON.parse(JSON.stringify(config)),
        updatedAt: new Date().toISOString()
    };
    var found = false;
    for (var i = 0; i < list.length; i++) {
        if (list[i].id === pid) {
            list[i] = entry;
            found = true;
            break;
        }
    }
    if (!found) list.push(entry);
    return S.set(S.KEYS.CUSTOM_PROFILES, list);
};

S.getCustomProfile = function(id) {
    var list = S.getCustomProfiles();
    for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) return list[i];
    }
    return null;
};

S.removeCustomProfile = function(id) {
    var list = S.getCustomProfiles();
    var next = list.filter(function(p) { return p.id !== id; });
    return S.set(S.KEYS.CUSTOM_PROFILES, next);
};

S.snapshotConfigForCustomProfile = function(config) {
    var snap = JSON.parse(JSON.stringify(config));
    snap.pdm_history_count = 0;
    snap.pdm_clean_history = [];
    snap.pdm_workspace = {
        input: '',
        output: '',
        thinking: '',
        savedAt: null,
        contextPanelOpen: true,
        inputSource: 'manual',
        audioFileName: null,
        audioFileSize: null,
        audioMimeType: null,
        audioLastModified: null,
        audioRef: null,
        audioSegmentCount: null
    };
    snap.pdm_token_ollama = '';
    delete snap.pdm_audio_blobs;
    return snap;
};

})();
