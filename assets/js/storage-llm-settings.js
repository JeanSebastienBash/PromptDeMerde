/**
 * PromptDeMerde.com — storage-llm-settings.js
 *
 * Synopsis : Réglages Ollama, thinking, température, tokens, timeout.
 * Objectif : Étendre PDM.Storage avec options LLM et capacités.
 */
(function(){

var S = window.PDM && window.PDM.Storage;
if (!S) { console.warn('[storage-llm-settings.js] PDM.Storage not found.'); return; }

S.getOllamaUrl = function() { return S.get(S.KEYS.OLLAMA_URL) || 'http://localhost:11434'; };
S.setOllamaUrl = function(u) { return S.set(S.KEYS.OLLAMA_URL, u); };

var _proxyTokenLegacyPurged = false;
S.purgeProxyTokenLegacy = function() {
    if (_proxyTokenLegacyPurged) return;
    _proxyTokenLegacyPurged = true;
    try { localStorage.removeItem(S.KEYS.TOKEN_PROXY); } catch (e) {}
};

S.getProxyToken = function() {
    S.purgeProxyTokenLegacy();
    try {
        var v = sessionStorage.getItem(S.KEYS.TOKEN_PROXY);
        return v != null ? String(v) : '';
    } catch (e) {
        return '';
    }
};

S.setProxyToken = function(t) {
    S.purgeProxyTokenLegacy();
    try {
        var s = t != null ? String(t).trim() : '';
        if (s === '') {
            sessionStorage.removeItem(S.KEYS.TOKEN_PROXY);
        } else {
            sessionStorage.setItem(S.KEYS.TOKEN_PROXY, s);
        }
        return { ok: true };
    } catch (e) {
        var msg = (e && e.message) ? e.message : 'Erreur sessionStorage';
        return { ok: false, error: msg };
    }
};

S.clearProxyToken = function() {
    return S.setProxyToken('');
};

function parseLlmDirectLocalFlag(v) {
    return v === '1' || v === 'true' || v === true;
}

S.isLlmDirectLocal = function() {
    try {
        var v = sessionStorage.getItem(S.KEYS.LLM_DIRECT_LOCAL);
        if (v !== null && v !== undefined && v !== '') {
            return parseLlmDirectLocalFlag(v);
        }
        var pref = localStorage.getItem(S.KEYS.LLM_DIRECT_LOCAL_PREF);
        if (pref !== null && pref !== undefined && pref !== '') {
            return parseLlmDirectLocalFlag(pref);
        }
        return true;
    } catch (e) {
        return true;
    }
};

S.setLlmDirectLocal = function(enabled) {
    try {
        var flag = enabled ? '1' : '0';
        sessionStorage.setItem(S.KEYS.LLM_DIRECT_LOCAL, flag);
        localStorage.setItem(S.KEYS.LLM_DIRECT_LOCAL_PREF, flag);
        return { ok: true };
    } catch (e) {
        var msg = (e && e.message) ? e.message : 'Erreur sessionStorage';
        return { ok: false, error: msg };
    }
};

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
    if (v === null || v === undefined || v === '') return S.DEFAULT_LLM_THINKING_MAX_CHARS;
    var n = parseInt(v, 10);
    if (!Number.isFinite(n) || n < 0) return 0;
    if (n > S.MAX_LLM_THINKING_MAX_CHARS) n = S.MAX_LLM_THINKING_MAX_CHARS;
    return n;
};

S.setLlmThinkingMaxChars = function(value) {
    var n = parseInt(value, 10);
    if (!Number.isFinite(n) || n < 0) n = 0;
    if (n > S.MAX_LLM_THINKING_MAX_CHARS) n = S.MAX_LLM_THINKING_MAX_CHARS;
    return S.set(S.KEYS.LLM_THINKING_MAX_CHARS, n);
};

S.getLlmTemperature = function() {
    var v = S.get(S.KEYS.LLM_TEMPERATURE);
    if (v === null || v === undefined || v === '') return 0;
    var n = parseFloat(v);
    if (!Number.isFinite(n)) return 0;
    if (n < 0) n = 0;
    if (n > 2) n = 2;
    return n;
};

S.setLlmTemperature = function(value) {
    if (value === null || value === undefined || value === '') {
        return S.set(S.KEYS.LLM_TEMPERATURE, 0);
    }
    var n = parseFloat(value);
    if (!Number.isFinite(n)) return S.set(S.KEYS.LLM_TEMPERATURE, 0);
    if (n < 0) n = 0;
    if (n > 2) n = 2;
    return S.set(S.KEYS.LLM_TEMPERATURE, n);
};

S.getLlmMaxTokens = function() {
    var v = S.get(S.KEYS.LLM_MAX_TOKENS);
    if (v === null || v === undefined || v === '') return 0;
    var n = parseInt(v, 10);
    if (!Number.isFinite(n) || n < 0) return 0;
    if (n > S.MAX_LLM_MAX_TOKENS) n = S.MAX_LLM_MAX_TOKENS;
    return n;
};

S.setLlmMaxTokens = function(value) {
    if (value === null || value === undefined || value === '') {
        return S.set(S.KEYS.LLM_MAX_TOKENS, 0);
    }
    var n = parseInt(value, 10);
    if (!Number.isFinite(n) || n < 0) n = 0;
    if (n > S.MAX_LLM_MAX_TOKENS) n = S.MAX_LLM_MAX_TOKENS;
    return S.set(S.KEYS.LLM_MAX_TOKENS, n);
};

S.getLlmInputCharBudget = function() {
    var v = S.get(S.KEYS.LLM_INPUT_CHAR_BUDGET);
    if (v === null || v === undefined || v === '') return S.DEFAULT_LLM_INPUT_CHAR_BUDGET;
    var n = parseInt(v, 10);
    if (!Number.isFinite(n) || n < 0) return 0;
    if (n > S.MAX_LLM_INPUT_CHAR_BUDGET) n = S.MAX_LLM_INPUT_CHAR_BUDGET;
    return n;
};

S.setLlmInputCharBudget = function(value) {
    if (value === null || value === undefined || value === '') {
        return S.set(S.KEYS.LLM_INPUT_CHAR_BUDGET, S.DEFAULT_LLM_INPUT_CHAR_BUDGET);
    }
    var n = parseInt(value, 10);
    if (!Number.isFinite(n) || n < 0) n = 0;
    if (n > S.MAX_LLM_INPUT_CHAR_BUDGET) n = S.MAX_LLM_INPUT_CHAR_BUDGET;
    return S.set(S.KEYS.LLM_INPUT_CHAR_BUDGET, n);
};

S.getLlmTimeoutSec = function() {
    var v = S.get(S.KEYS.LLM_TIMEOUT_SEC);
    if (v === null || v === undefined || v === '') return S.DEFAULT_LLM_TIMEOUT_SEC;
    var n = parseInt(v, 10);
    if (!Number.isFinite(n) || n < 0) return 0;
    if (n > S.MAX_LLM_TIMEOUT_SEC) n = S.MAX_LLM_TIMEOUT_SEC;
    return n;
};

S.setLlmTimeoutSec = function(value) {
    var n = parseInt(value, 10);
    if (!Number.isFinite(n) || n < 0) n = 0;
    if (n > S.MAX_LLM_TIMEOUT_SEC) n = S.MAX_LLM_TIMEOUT_SEC;
    return S.set(S.KEYS.LLM_TIMEOUT_SEC, n);
};

S.getLlmTimeoutMs = function() {
    var sec = S.getLlmTimeoutSec();
    if (sec <= 0) return 0;
    return sec * 1000;
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
