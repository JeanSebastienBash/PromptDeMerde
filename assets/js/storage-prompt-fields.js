/**
 * PromptDeMerde.com — storage-prompt-fields.js
 *
 * Synopsis : Champs prompts context-gen et output JSON.
 * Objectif : Étendre PDM.Storage avec getters/setters prompts et schémas.
 */
(function(){

var S = window.PDM && window.PDM.Storage;
if (!S) { console.warn('[storage-prompt-fields.js] PDM.Storage not found.'); return; }

function schemaDefault(field) {
    var CS = window.PDM && window.PDM.ConfigSchema;
    if (!CS) return '';
    if (typeof CS.getLocaleDefault === 'function') {
        return CS.getLocaleDefault(field);
    }
    if (!CS[field]) return '';
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
S.getSystemPromptEffective = function() {
    return S.getSystemPrompt();
};
(function wrapSystemPromptSet() {
    var orig = S.setSystemPrompt;
    if (typeof orig !== 'function' || orig._pdmCompressWrapped) return;
    S.setSystemPrompt = function(text) {
        var ok = orig.call(S, text);
        try { document.dispatchEvent(new CustomEvent('pdm:system-prompt-changed')); } catch (e) {}
        return ok;
    };
    S.setSystemPrompt._pdmCompressWrapped = true;
})();
makePromptField(S.KEYS.IMAGE_PROMPT, 'DEFAULT_IMAGE_PROMPT', 'getImagePrompt', 'setImagePrompt', 'getImagePromptEffective');
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

S.isOutputJsonEnabled = function() {
    return !!S.get(S.KEYS.OUTPUT_JSON_ENABLED);
};
S.setOutputJsonEnabled = function(enabled) {
    return S.set(S.KEYS.OUTPUT_JSON_ENABLED, !!enabled);
};
S.getOutputJsonSchema = function() {
    var v = S.get(S.KEYS.OUTPUT_JSON_SCHEMA);
    if (v && typeof v === 'object' && !Array.isArray(v)) return v;
    return null;
};
S.setOutputJsonSchema = function(schema) {
    if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
        return S.set(S.KEYS.OUTPUT_JSON_SCHEMA, null);
    }
    return S.set(S.KEYS.OUTPUT_JSON_SCHEMA, schema);
};
S.getOutputJsonKeyPattern = function() {
    var v = S.get(S.KEYS.OUTPUT_JSON_KEY_PATTERN);
    if (v && typeof v === 'string' && v.trim()) return v.trim();
    return 'output_{lang}';
};
S.setOutputJsonKeyPattern = function(pattern) {
    if (!pattern || typeof pattern !== 'string') {
        return S.set(S.KEYS.OUTPUT_JSON_KEY_PATTERN, null);
    }
    return S.set(S.KEYS.OUTPUT_JSON_KEY_PATTERN, pattern.trim());
};
S.getOutputJsonValueSchema = function() {
    var v = S.get(S.KEYS.OUTPUT_JSON_VALUE_SCHEMA);
    if (v && typeof v === 'object' && !Array.isArray(v)) return v;
    var POJ = window.PDM && window.PDM.ProfileOutputJson;
    var stored = S.getOutputJsonSchema();
    if (POJ && typeof POJ.extractValueSchemaFromStored === 'function') {
        var extracted = POJ.extractValueSchemaFromStored(stored);
        if (extracted) return extracted;
    }
    return { type: 'string' };
};
S.setOutputJsonValueSchema = function(schema) {
    if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
        return S.set(S.KEYS.OUTPUT_JSON_VALUE_SCHEMA, null);
    }
    return S.set(S.KEYS.OUTPUT_JSON_VALUE_SCHEMA, schema);
};
S.getOutputJsonSchemaEffective = function() {
    var POJ = window.PDM && window.PDM.ProfileOutputJson;
    if (!POJ || typeof POJ.buildSchemaForLang !== 'function') {
        return S.getOutputJsonSchema();
    }
    var lang = S.getLanguage();
    var pattern = S.getOutputJsonKeyPattern();
    var valueSchema = S.getOutputJsonValueSchema();
    return POJ.buildSchemaForLang(valueSchema, lang, pattern);
};

var OUTPUT_DISPLAY_FORMATS = { text: 1, json: 1, html: 1 };
S.getOutputDisplayFormat = function() {
    var v = S.get(S.KEYS.OUTPUT_DISPLAY_FORMAT);
    if (typeof v === 'string' && OUTPUT_DISPLAY_FORMATS[v]) return v;
    return 'text';
};
S.setOutputDisplayFormat = function(format) {
    var id = typeof format === 'string' ? format : 'text';
    if (!OUTPUT_DISPLAY_FORMATS[id]) id = 'text';
    return S.set(S.KEYS.OUTPUT_DISPLAY_FORMAT, id);
};

})();
