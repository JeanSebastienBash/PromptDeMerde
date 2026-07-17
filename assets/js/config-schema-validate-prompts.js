/**
 * PromptDeMerde.com — config-schema-validate-prompts.js
 *
 * Validation de parts/prompts.json (index prompts MD par locale).
 */
(function() {

var CS = window.PDM && window.PDM.ConfigSchema;
if (!CS) { console.warn('[config-schema-validate-prompts] PDM.ConfigSchema not found.'); return; }

CS.PROFILE_PROMPTS_TYPE = 'pdm-profile-prompts';
CS.PROFILE_PROMPTS_KEYS = ['version', 'type', 'system', 'contexts'];
CS.PROFILE_PROMPTS_SYSTEM_KEYS = ['enabled', 'pathTemplate'];
CS.PROFILE_PROMPTS_CONTEXT_KEYS = ['id', 'tag', 'active', 'pathTemplate'];

CS.validateProfilePromptsIndex = function(data, pathPrefix) {
    pathPrefix = pathPrefix || 'prompts.json';
    var errors = [];
    if (!CS.isPlainObject(data)) {
        errors.push(pathPrefix + ' doit être un objet.');
        return { ok: false, errors: errors };
    }
    if (!CS.hasOnlyKeys(data, CS.PROFILE_PROMPTS_KEYS)) {
        errors.push(pathPrefix + ' : clés autorisées — ' + CS.PROFILE_PROMPTS_KEYS.join(', ') + '.');
    }
    if (CS.assertNoForbiddenKeys && CS.FORBIDDEN_PROMPTS_INDEX_KEYS) {
        CS.assertNoForbiddenKeys(data, CS.FORBIDDEN_PROMPTS_INDEX_KEYS, pathPrefix, errors);
    }
    if (data.type !== CS.PROFILE_PROMPTS_TYPE) {
        errors.push(pathPrefix + '.type doit être « ' + CS.PROFILE_PROMPTS_TYPE + ' ».');
    }
    if (typeof data.version !== 'string' || !String(data.version).trim()) {
        errors.push(pathPrefix + '.version doit être une chaîne non vide.');
    }
    if (!CS.isPlainObject(data.system)) {
        errors.push(pathPrefix + '.system doit être un objet.');
    } else {
        if (!CS.hasOnlyKeys(data.system, CS.PROFILE_PROMPTS_SYSTEM_KEYS)) {
            errors.push(pathPrefix + '.system : clés autorisées — ' + CS.PROFILE_PROMPTS_SYSTEM_KEYS.join(', ') + '.');
        }
        if (!CS.isStrictBoolean(data.system.enabled)) {
            errors.push(pathPrefix + '.system.enabled doit être un booléen.');
        }
        if (typeof data.system.pathTemplate !== 'string' || !data.system.pathTemplate.trim()) {
            errors.push(pathPrefix + '.system.pathTemplate doit être une chaîne non vide.');
        }
    }
    if (!Array.isArray(data.contexts)) {
        errors.push(pathPrefix + '.contexts doit être un tableau.');
    } else if (data.contexts.length > 999) {
        errors.push(pathPrefix + '.contexts : maximum 999 entrées.');
    } else {
        for (var i = 0; i < data.contexts.length; i++) {
            var ctx = data.contexts[i];
            var cPath = pathPrefix + '.contexts[' + i + ']';
            if (!CS.isPlainObject(ctx)) {
                errors.push(cPath + ' doit être un objet.');
                continue;
            }
            if (!CS.hasOnlyKeys(ctx, CS.PROFILE_PROMPTS_CONTEXT_KEYS)) {
                errors.push(cPath + ' : clés autorisées — ' + CS.PROFILE_PROMPTS_CONTEXT_KEYS.join(', ') + '.');
            }
            if (typeof ctx.id !== 'string' || !ctx.id.length) {
                errors.push(cPath + '.id doit être une chaîne non vide.');
            }
            CS.validateProfileTag(ctx.tag, cPath, errors);
            if (!CS.isStrictBoolean(ctx.active)) {
                errors.push(cPath + '.active doit être un booléen.');
            }
            if (typeof ctx.pathTemplate !== 'string' || !ctx.pathTemplate.trim()) {
                errors.push(cPath + '.pathTemplate doit être une chaîne non vide.');
            }
        }
    }
    return { ok: errors.length === 0, errors: errors };
};

CS.resolvePromptPathTemplate = function(template, locale, tag) {
    if (typeof template !== 'string') return '';
    return template
        .replace(/\{locale\}/g, String(locale || ''))
        .replace(/\{tag\}/g, String(tag || ''));
};

})();
