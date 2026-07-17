/**
 * PromptDeMerde.com — context-generation.js
 *
 * Synopsis : Prompts LLM pour fabriquer des prompts de contexte (#Tag).
 * Objectif : Défauts depuis ConfigSchema/Storage/locale, assemblage system/user pour Ollama.
 */
(function() {

var CS = window.PDM && window.PDM.ConfigSchema;
var CG = {};

function cgT(key, schemaDefault, vars) {
    var I = window.PDM && window.PDM.I18n;
    if (I) {
        var val = I.t('contextGen.' + key, vars);
        if (val && val.indexOf('contextGen.' + key) !== 0) return val;
    }
    if (vars && schemaDefault) {
        var out = String(schemaDefault);
        for (var k in vars) {
            if (!Object.prototype.hasOwnProperty.call(vars, k)) continue;
            out = out.split('{{' + k + '}}').join(String(vars[k]));
        }
        return out;
    }
    return schemaDefault != null ? schemaDefault : '';
}

CG.DEFAULT_SYSTEM = CS ? CS.DEFAULT_CONTEXT_GEN_SYSTEM : '';
CG.DEFAULT_USER_INTENT = CS ? CS.DEFAULT_CONTEXT_GEN_USER_INTENT : '';
CG.DEFAULT_USER_TITLE = CS ? CS.DEFAULT_CONTEXT_GEN_USER_TITLE : '';

function applyPlaceholders(template, map) {
    var out = String(template || '');
    for (var key in map) {
        if (!Object.prototype.hasOwnProperty.call(map, key)) continue;
        out = out.split('{{' + key + '}}').join(String(map[key]));
    }
    return out;
}

function storageSuffix(name) {
    var S = window.PDM && window.PDM.Storage;
    if (S && typeof S[name] === 'function') return S[name]();
    return '';
}

function localeSuffix(key, storageName, schemaDefault, vars) {
    var stored = storageSuffix(storageName);
    if (stored) return stored;
    return cgT(key, schemaDefault, vars);
}

CG.buildDefaultSystem = function() {
    return cgT('system', CG.DEFAULT_SYSTEM);
};

CG.buildDefaultUserIntent = function() {
    return cgT('userIntent', CG.DEFAULT_USER_INTENT);
};

CG.buildDefaultUserTitle = function() {
    return cgT('userTitle', CG.DEFAULT_USER_TITLE);
};

CG.getSystemBase = function() {
    return storageSuffix('getContextGenSystemEffective') || cgT('system', CG.DEFAULT_SYSTEM);
};

CG.getUserIntentPrefix = function() {
    return storageSuffix('getContextGenUserIntentEffective') || cgT('userIntent', CG.DEFAULT_USER_INTENT);
};

CG.getUserTitleTemplate = function() {
    return storageSuffix('getContextGenUserTitleEffective') || cgT('userTitle', CG.DEFAULT_USER_TITLE);
};

CG.buildSystemPrompt = function(forcedTag, isRetry) {
    var sys = CG.getSystemBase();
    if (forcedTag) {
        sys += applyPlaceholders(
            localeSuffix('forcedTagSystemSuffix', 'getContextGenForcedTagSystemSuffixEffective', CS ? CS.DEFAULT_CONTEXT_GEN_FORCED_TAG_SYSTEM_SUFFIX : ''),
            { tag: forcedTag }
        );
    }
    if (isRetry) {
        sys += localeSuffix('retrySystemSuffix', 'getContextGenRetrySystemSuffixEffective', CS ? CS.DEFAULT_CONTEXT_GEN_RETRY_SYSTEM_SUFFIX : '');
    }
    return sys;
};

CG.buildUserFromIntent = function(intent, suggestedTag, isRetry) {
    var user = CG.getUserIntentPrefix() + String(intent || '').trim();
    if (suggestedTag) {
        user += applyPlaceholders(
            localeSuffix('tagIntentSuffix', 'getContextGenTagIntentSuffixEffective', CS ? CS.DEFAULT_CONTEXT_GEN_TAG_INTENT_SUFFIX : ''),
            { tag: suggestedTag }
        );
    }
    if (isRetry) {
        user += localeSuffix('retryUserSuffix', 'getContextGenRetryUserSuffixEffective', CS ? CS.DEFAULT_CONTEXT_GEN_RETRY_USER_SUFFIX : '');
    }
    return user;
};

CG.buildUserFromTitle = function(title, isRetry) {
    var user = applyPlaceholders(CG.getUserTitleTemplate(), { title: title });
    if (isRetry) {
        user += localeSuffix('retryUserSuffix', 'getContextGenRetryUserSuffixEffective', CS ? CS.DEFAULT_CONTEXT_GEN_RETRY_USER_SUFFIX : '');
    }
    return user;
};

CG.getLlmOptions = function(step, opts) {
    opts = opts || {};
    var streaming = opts.streaming === true;
    var S = window.PDM && window.PDM.Storage;
    if (!S) {
        return { streaming: streaming, maxTokens: 512, format: 'json', think: false, temperature: step === 0 ? 0.2 : 0.1 };
    }
    return {
        streaming: streaming,
        maxTokens: S.getContextGenMaxTokens(),
        format: step === 0 ? S.getContextGenJsonSchemaEffective() : 'json',
        think: false,
        temperature: step === 0 ? S.getContextGenTemperature() : S.getContextGenRetryTemperature()
    };
};

CG.getMaxRetries = function() {
    var S = window.PDM && window.PDM.Storage;
    return S ? S.getContextGenMaxRetries() : 2;
};

window.PDM = window.PDM || {};
window.PDM.ContextGeneration = CG;

})();
