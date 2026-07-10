/**
 * PromptDeMerde.com — context-generation.js
 *
 * Synopsis : Prompts LLM pour fabriquer des prompts de contexte (#Tag).
 * Objectif : Défauts depuis ConfigSchema/Storage, assemblage system/user pour Ollama.
 */
(function() {

var CS = window.PDM && window.PDM.ConfigSchema;
var CG = {};

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

CG.buildDefaultSystem = function() {
    return CG.DEFAULT_SYSTEM;
};

CG.buildDefaultUserIntent = function() {
    return CG.DEFAULT_USER_INTENT;
};

CG.buildDefaultUserTitle = function() {
    return CG.DEFAULT_USER_TITLE;
};

CG.getSystemBase = function() {
    return storageSuffix('getContextGenSystemEffective') || CG.DEFAULT_SYSTEM;
};

CG.getUserIntentPrefix = function() {
    return storageSuffix('getContextGenUserIntentEffective') || CG.DEFAULT_USER_INTENT;
};

CG.getUserTitleTemplate = function() {
    return storageSuffix('getContextGenUserTitleEffective') || CG.DEFAULT_USER_TITLE;
};

CG.buildSystemPrompt = function(forcedTag, isRetry) {
    var sys = CG.getSystemBase();
    if (forcedTag) {
        sys += applyPlaceholders(storageSuffix('getContextGenForcedTagSystemSuffixEffective'), { tag: forcedTag });
    }
    if (isRetry) {
        sys += storageSuffix('getContextGenRetrySystemSuffixEffective');
    }
    return sys;
};

CG.buildUserFromIntent = function(intent, suggestedTag, isRetry) {
    var user = CG.getUserIntentPrefix() + String(intent || '').trim();
    if (suggestedTag) {
        user += applyPlaceholders(storageSuffix('getContextGenTagIntentSuffixEffective'), { tag: suggestedTag });
    }
    if (isRetry) {
        user += storageSuffix('getContextGenRetryUserSuffixEffective');
    }
    return user;
};

CG.buildUserFromTitle = function(title, isRetry) {
    var user = applyPlaceholders(CG.getUserTitleTemplate(), { title: title });
    if (isRetry) {
        user += storageSuffix('getContextGenRetryUserSuffixEffective');
    }
    return user;
};

CG.getLlmOptions = function(step) {
    var S = window.PDM && window.PDM.Storage;
    if (!S) {
        return { streaming: false, maxTokens: 512, format: 'json', think: false, temperature: step === 0 ? 0.2 : 0.1 };
    }
    return {
        streaming: false,
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
