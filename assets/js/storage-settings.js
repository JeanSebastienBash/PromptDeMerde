/**
 * PromptDeMerde.com — storage-settings.js
 *
 * Synopsis : Getters/setters provider, modèle, thème, tokens et thinking LLM.
 * Objectif : Étendre PDM.Storage avec les réglages utilisateur persistés.
 */
(function(){

var S = window.PDM && window.PDM.Storage;
if (!S) { console.warn('[storage-settings] PDM.Storage not found.'); return; }

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
        S.remove(keys[i]);
        try { sessionStorage.removeItem(keys[i]); } catch(e) {}
    }
};

S.wipeAllUserData = function() {
    var preservedCustom = S.get(S.KEYS.CUSTOM_PROFILES);
    var keys = {};
    var known = S.userDataKeys();
    for (var i = 0; i < known.length; i++) keys[known[i]] = true;
    var scanned = S._scanPdmKeys(localStorage).concat(S._scanPdmKeys(sessionStorage));
    for (var j = 0; j < scanned.length; j++) keys[scanned[j]] = true;
    for (var b = 0; b < S.LEGACY_KEYS.length; b++) keys[S.LEGACY_KEYS[b]] = true;
    S._removeKeysFromStores(Object.keys(keys));
    if (preservedCustom != null) {
        S.set(S.KEYS.CUSTOM_PROFILES, preservedCustom);
    }
};

S.getToken = function(p) {
    var v = S.get(S.tokenKey(p));
    return v != null ? String(v) : '';
};
S.setToken = function(p, t) {
    return S.set(S.tokenKey(p), t != null ? String(t) : '');
};

S.getProvider = function() {
    var v = S.get(S.KEYS.PROVIDER);
    if (v) return String(v);
    if (window.PDM && window.PDM.Env && typeof window.PDM.Env.getDefaultProvider === 'function') {
        return window.PDM.Env.getDefaultProvider();
    }
    return S._CONFIG_PROVIDERS[0] || 'ollama';
};

S.getModel = function() {
    var v = S.get(S.KEYS.MODEL);
    return v != null ? String(v) : '';
};

function schemaDefault(field) {
    var CS = window.PDM && window.PDM.ConfigSchema;
    if (!CS || !CS[field]) return '';
    return String(CS[field]);
}

function storedString(key) {
    var v = S.get(key);
    return v != null ? String(v) : '';
}

function makePromptField(storageKey, defaultField, getName, setName, effectiveName) {
    S[getName] = function() { return storedString(storageKey); };
    S[setName] = function(text) {
        return S.set(storageKey, text != null ? String(text) : '');
    };
    S[effectiveName] = function() {
        var v = S[getName]();
        if (v && v.trim()) return v;
        return schemaDefault(defaultField);
    };
}

makePromptField(S.KEYS.SYSTEM_PROMPT, 'DEFAULT_SYSTEM_PROMPT', 'getSystemPrompt', 'setSystemPrompt', 'getSystemPromptEffective');
makePromptField(S.KEYS.CONTEXT_GEN_SYSTEM, 'DEFAULT_CONTEXT_GEN_SYSTEM', 'getContextGenSystem', 'setContextGenSystem', 'getContextGenSystemEffective');
makePromptField(S.KEYS.CONTEXT_GEN_USER_INTENT, 'DEFAULT_CONTEXT_GEN_USER_INTENT', 'getContextGenUserIntent', 'setContextGenUserIntent', 'getContextGenUserIntentEffective');
makePromptField(S.KEYS.CONTEXT_GEN_USER_TITLE, 'DEFAULT_CONTEXT_GEN_USER_TITLE', 'getContextGenUserTitle', 'setContextGenUserTitle', 'getContextGenUserTitleEffective');
makePromptField(S.KEYS.CONTEXT_INJECT_HEADER, 'DEFAULT_CONTEXT_INJECT_HEADER', 'getContextInjectHeader', 'setContextInjectHeader', 'getContextInjectHeaderEffective');
makePromptField(S.KEYS.CONTEXT_GEN_TAG_INTENT_SUFFIX, 'DEFAULT_CONTEXT_GEN_TAG_INTENT_SUFFIX', 'getContextGenTagIntentSuffix', 'setContextGenTagIntentSuffix', 'getContextGenTagIntentSuffixEffective');
makePromptField(S.KEYS.CONTEXT_GEN_FORCED_TAG_SYSTEM_SUFFIX, 'DEFAULT_CONTEXT_GEN_FORCED_TAG_SYSTEM_SUFFIX', 'getContextGenForcedTagSystemSuffix', 'setContextGenForcedTagSystemSuffix', 'getContextGenForcedTagSystemSuffixEffective');
makePromptField(S.KEYS.CONTEXT_GEN_RETRY_SYSTEM_SUFFIX, 'DEFAULT_CONTEXT_GEN_RETRY_SYSTEM_SUFFIX', 'getContextGenRetrySystemSuffix', 'setContextGenRetrySystemSuffix', 'getContextGenRetrySystemSuffixEffective');
makePromptField(S.KEYS.CONTEXT_GEN_RETRY_USER_SUFFIX, 'DEFAULT_CONTEXT_GEN_RETRY_USER_SUFFIX', 'getContextGenRetryUserSuffix', 'setContextGenRetryUserSuffix', 'getContextGenRetryUserSuffixEffective');
makePromptField(S.KEYS.CONTEXT_PROFILE_LINE_TEMPLATE, 'DEFAULT_CONTEXT_PROFILE_LINE_TEMPLATE', 'getContextProfileLineTemplate', 'setContextProfileLineTemplate', 'getContextProfileLineTemplateEffective');

function schemaNumber(field, fallback) {
    var CS = window.PDM && window.PDM.ConfigSchema;
    if (!CS || CS[field] === undefined) return fallback;
    return CS[field];
}

function clampInt(value, fallback, min, max) {
    var n = parseInt(value, 10);
    if (!Number.isFinite(n)) return fallback;
    if (n < min) return min;
    if (n > max) return max;
    return n;
}

function clampFloat(value, fallback, min, max) {
    var n = parseFloat(value);
    if (!Number.isFinite(n)) return fallback;
    if (n < min) return min;
    if (n > max) return max;
    return n;
}

S.getContextGenMaxTokens = function() {
    return clampInt(
        S.get(S.KEYS.CONTEXT_GEN_MAX_TOKENS),
        schemaNumber('DEFAULT_CONTEXT_GEN_MAX_TOKENS', 512),
        1,
        schemaNumber('MAX_CONTEXT_GEN_MAX_TOKENS', 8192)
    );
};
S.setContextGenMaxTokens = function(value) {
    return S.set(S.KEYS.CONTEXT_GEN_MAX_TOKENS, clampInt(
        value,
        schemaNumber('DEFAULT_CONTEXT_GEN_MAX_TOKENS', 512),
        1,
        schemaNumber('MAX_CONTEXT_GEN_MAX_TOKENS', 8192)
    ));
};

S.getContextGenTemperature = function() {
    return clampFloat(
        S.get(S.KEYS.CONTEXT_GEN_TEMPERATURE),
        schemaNumber('DEFAULT_CONTEXT_GEN_TEMPERATURE', 0.2),
        0,
        2
    );
};
S.setContextGenTemperature = function(value) {
    return S.set(S.KEYS.CONTEXT_GEN_TEMPERATURE, clampFloat(
        value,
        schemaNumber('DEFAULT_CONTEXT_GEN_TEMPERATURE', 0.2),
        0,
        2
    ));
};

S.getContextGenRetryTemperature = function() {
    return clampFloat(
        S.get(S.KEYS.CONTEXT_GEN_RETRY_TEMPERATURE),
        schemaNumber('DEFAULT_CONTEXT_GEN_RETRY_TEMPERATURE', 0.1),
        0,
        2
    );
};
S.setContextGenRetryTemperature = function(value) {
    return S.set(S.KEYS.CONTEXT_GEN_RETRY_TEMPERATURE, clampFloat(
        value,
        schemaNumber('DEFAULT_CONTEXT_GEN_RETRY_TEMPERATURE', 0.1),
        0,
        2
    ));
};

S.getContextGenMaxRetries = function() {
    return clampInt(
        S.get(S.KEYS.CONTEXT_GEN_MAX_RETRIES),
        schemaNumber('DEFAULT_CONTEXT_GEN_MAX_RETRIES', 2),
        0,
        schemaNumber('MAX_CONTEXT_GEN_MAX_RETRIES', 10)
    );
};
S.setContextGenMaxRetries = function(value) {
    return S.set(S.KEYS.CONTEXT_GEN_MAX_RETRIES, clampInt(
        value,
        schemaNumber('DEFAULT_CONTEXT_GEN_MAX_RETRIES', 2),
        0,
        schemaNumber('MAX_CONTEXT_GEN_MAX_RETRIES', 10)
    ));
};

S.getContextGenJsonSchema = function() {
    var v = S.get(S.KEYS.CONTEXT_GEN_JSON_SCHEMA);
    if (v && typeof v === 'object' && !Array.isArray(v)) return v;
    return null;
};
S.setContextGenJsonSchema = function(schema) {
    if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
        return S.set(S.KEYS.CONTEXT_GEN_JSON_SCHEMA, null);
    }
    return S.set(S.KEYS.CONTEXT_GEN_JSON_SCHEMA, schema);
};
S.getContextGenJsonSchemaEffective = function() {
    var v = S.getContextGenJsonSchema();
    if (v) return v;
    var CS = window.PDM && window.PDM.ConfigSchema;
    if (CS && CS.DEFAULT_CONTEXT_GEN_JSON_SCHEMA) {
        return JSON.parse(JSON.stringify(CS.DEFAULT_CONTEXT_GEN_JSON_SCHEMA));
    }
    return { type: 'object', properties: { tag: { type: 'string' }, prompt: { type: 'string' } }, required: ['tag', 'prompt'], additionalProperties: false };
};

S.getActiveProfile = function() {
    var v = storedString(S.KEYS.ACTIVE_PROFILE);
    var id = v.trim() ? v : 'speech2texte';
    if (id === 'promptdemerde') {
        id = 'speech2texte';
        S.setActiveProfile(id);
        S.set('pdm_profile_bundle_fp', '');
    }
    return id;
};
S.setActiveProfile = function(id) {
    return S.set(S.KEYS.ACTIVE_PROFILE, id != null ? String(id) : '');
};

S.getWorkspaceUi = function() {
    var v = S.get(S.KEYS.WORKSPACE_UI);
    if (v && typeof v === 'object' && !Array.isArray(v)) return v;
    return null;
};
S.setWorkspaceUi = function(ui) {
    var CS = window.PDM && window.PDM.ConfigSchema;
    var normalized = CS && typeof CS.normalizeWorkspaceUi === 'function'
        ? CS.normalizeWorkspaceUi(ui)
        : ui;
    return S.set(S.KEYS.WORKSPACE_UI, normalized);
};
S.getWorkspaceUiEffective = function() {
    var v = S.getWorkspaceUi();
    var CS = window.PDM && window.PDM.ConfigSchema;
    if (CS && typeof CS.normalizeWorkspaceUi === 'function') {
        return CS.normalizeWorkspaceUi(v);
    }
    return v || {};
};

S.ensureConfigDefaults = function() {
    var fields = [
        ['getSystemPrompt', 'setSystemPrompt', 'getSystemPromptEffective'],
        ['getContextGenSystem', 'setContextGenSystem', 'getContextGenSystemEffective'],
        ['getContextGenUserIntent', 'setContextGenUserIntent', 'getContextGenUserIntentEffective'],
        ['getContextGenUserTitle', 'setContextGenUserTitle', 'getContextGenUserTitleEffective'],
        ['getContextInjectHeader', 'setContextInjectHeader', 'getContextInjectHeaderEffective'],
        ['getContextGenTagIntentSuffix', 'setContextGenTagIntentSuffix', 'getContextGenTagIntentSuffixEffective'],
        ['getContextGenForcedTagSystemSuffix', 'setContextGenForcedTagSystemSuffix', 'getContextGenForcedTagSystemSuffixEffective'],
        ['getContextGenRetrySystemSuffix', 'setContextGenRetrySystemSuffix', 'getContextGenRetrySystemSuffixEffective'],
        ['getContextGenRetryUserSuffix', 'setContextGenRetryUserSuffix', 'getContextGenRetryUserSuffixEffective']
    ];
    for (var i = 0; i < fields.length; i++) {
        var getFn = fields[i][0];
        var setFn = fields[i][1];
        var effFn = fields[i][2];
        if (!S[getFn]().trim()) S[setFn](S[effFn]());
    }
    if (!storedString(S.KEYS.ACTIVE_PROFILE).trim()) {
        S.setActiveProfile('speech2texte');
    }
    if (S.get(S.KEYS.SYSTEM_PROMPT_ENABLED) === null || S.get(S.KEYS.SYSTEM_PROMPT_ENABLED) === undefined) {
        S.setSystemPromptEnabled(true);
    }
    if (S.get(S.KEYS.CONTEXT_POSITION) === null || S.get(S.KEYS.CONTEXT_POSITION) === undefined) {
        S.setContextPosition('after_system');
    }
    if (!S.getContextProfileLineTemplate().trim()) {
        S.setContextProfileLineTemplate(S.getContextProfileLineTemplateEffective());
    }
    if (S.get(S.KEYS.CONTEXT_GEN_MAX_TOKENS) == null) {
        S.setContextGenMaxTokens(S.getContextGenMaxTokens());
    }
    if (S.get(S.KEYS.CONTEXT_GEN_TEMPERATURE) == null) {
        S.setContextGenTemperature(S.getContextGenTemperature());
    }
    if (S.get(S.KEYS.CONTEXT_GEN_RETRY_TEMPERATURE) == null) {
        S.setContextGenRetryTemperature(S.getContextGenRetryTemperature());
    }
    if (S.get(S.KEYS.CONTEXT_GEN_MAX_RETRIES) == null) {
        S.setContextGenMaxRetries(S.getContextGenMaxRetries());
    }
    if (!S.getContextGenJsonSchema()) {
        S.setContextGenJsonSchema(S.getContextGenJsonSchemaEffective());
    }
    if (!S.get(S.KEYS.WORKSPACE_UI)) {
        var activeProfile = S.getActiveProfile();
        var hasProfileSelector = window.PDM && window.PDM.Env &&
            typeof window.PDM.Env.hasProfileSelector === 'function' &&
            window.PDM.Env.hasProfileSelector();
        if (!hasProfileSelector) {
            S.setWorkspaceUi(S.getWorkspaceUiEffective());
        }
    }
};

S.ensureContextGenDefaults = S.ensureConfigDefaults;

S.getLanguage = function() {
    var v = S.get(S.KEYS.LANGUAGE);
    return v === 'en' ? 'en' : 'fr';
};

S.getTheme = function() {
    var saved = S.get(S.KEYS.THEME);
    if (saved) return String(saved);
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
    }
    return 'dark';
};

S.getOllamaUrl = function() { return S.get(S.KEYS.OLLAMA_URL) || 'http://localhost:11434'; };
S.setOllamaUrl = function(u) { return S.set(S.KEYS.OLLAMA_URL, u); };
S.getProxyToken = function() { return S.get(S.KEYS.TOKEN_PROXY) || ''; };
S.setProxyToken = function(t) { return S.set(S.KEYS.TOKEN_PROXY, t != null ? String(t) : ''); };

S.getContextPosition = function() {
    var v = S.get(S.KEYS.CONTEXT_POSITION);
    return (v === 'before_system') ? 'before_system' : 'after_system';
};
S.setContextPosition = function(pos) {
    return S.set(S.KEYS.CONTEXT_POSITION, pos === 'before_system' ? 'before_system' : 'after_system');
};

S.isSystemPromptEnabled = function() {
    var v = S.get(S.KEYS.SYSTEM_PROMPT_ENABLED);
    if (v === null || v === undefined) return true;
    return v === true || v === 'true' || v === 1 || v === '1';
};
S.setSystemPromptEnabled = function(enabled) {
    return S.set(S.KEYS.SYSTEM_PROMPT_ENABLED, !!enabled);
};

S.isLlmThinkingEnabled = function() {
    var v = S.get(S.KEYS.LLM_THINKING_ENABLED);
    return v === true;
};

S.setLlmThinkingEnabled = function(enabled) {
    return S.set(S.KEYS.LLM_THINKING_ENABLED, !!enabled);
};

S.getLlmThinkingMaxChars = function() {
    var v = S.get(S.KEYS.LLM_THINKING_MAX_CHARS);
    if (v === null || v === undefined) {
        v = S.get('pdm_llm_thinking_max_tokens');
    }
    if (v === null || v === undefined) return S.DEFAULT_LLM_THINKING_MAX_CHARS;
    var n = parseInt(v, 10);
    if (!Number.isFinite(n) || n < 0) return S.DEFAULT_LLM_THINKING_MAX_CHARS;
    return Math.min(n, S.MAX_LLM_THINKING_MAX_CHARS);
};

S.setLlmThinkingMaxChars = function(value) {
    var n = parseInt(value, 10);
    if (!Number.isFinite(n) || n < 0) n = S.DEFAULT_LLM_THINKING_MAX_CHARS;
    if (n > S.MAX_LLM_THINKING_MAX_CHARS) n = S.MAX_LLM_THINKING_MAX_CHARS;
    return S.set(S.KEYS.LLM_THINKING_MAX_CHARS, n);
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

})();
