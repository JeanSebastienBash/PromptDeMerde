/**
 * PromptDeMerde.com — config-schema-validate-gen-prompts.js
 *
 * Validation de parts/gen-prompts.json (index prompts LLM génération contextes).
 */
(function() {

var CS = window.PDM && window.PDM.ConfigSchema;
if (!CS) { console.warn('[config-schema-validate-gen-prompts] PDM.ConfigSchema not found.'); return; }

CS.PROFILE_GEN_PROMPTS_TYPE = 'pdm-profile-gen-prompts';
CS.PROFILE_GEN_PROMPTS_KEYS = ['version', 'type', 'templates'];
CS.PROFILE_GEN_PROMPTS_TEMPLATE_KEYS = ['id', 'storageKey', 'pathTemplate'];

CS.validateProfileGenPromptsIndex = function(data, pathPrefix) {
    pathPrefix = pathPrefix || 'gen-prompts.json';
    var errors = [];
    if (!CS.isPlainObject(data)) {
        errors.push(pathPrefix + ' doit être un objet.');
        return { ok: false, errors: errors };
    }
    if (!CS.hasOnlyKeys(data, CS.PROFILE_GEN_PROMPTS_KEYS)) {
        errors.push(pathPrefix + ' : clés autorisées — ' + CS.PROFILE_GEN_PROMPTS_KEYS.join(', ') + '.');
    }
    if (CS.assertNoForbiddenKeys && CS.FORBIDDEN_GEN_PROMPTS_INDEX_KEYS) {
        CS.assertNoForbiddenKeys(data, CS.FORBIDDEN_GEN_PROMPTS_INDEX_KEYS, pathPrefix, errors);
    }
    if (data.type !== CS.PROFILE_GEN_PROMPTS_TYPE) {
        errors.push(pathPrefix + '.type doit être « ' + CS.PROFILE_GEN_PROMPTS_TYPE + ' ».');
    }
    if (typeof data.version !== 'string' || !String(data.version).trim()) {
        errors.push(pathPrefix + '.version doit être une chaîne non vide.');
    }
    if (!Array.isArray(data.templates)) {
        errors.push(pathPrefix + '.templates doit être un tableau.');
    } else if (data.templates.length > 32) {
        errors.push(pathPrefix + '.templates : maximum 32 entrées.');
    } else {
        for (var i = 0; i < data.templates.length; i++) {
            var tpl = data.templates[i];
            var tPath = pathPrefix + '.templates[' + i + ']';
            if (!CS.isPlainObject(tpl)) {
                errors.push(tPath + ' doit être un objet.');
                continue;
            }
            if (!CS.hasOnlyKeys(tpl, CS.PROFILE_GEN_PROMPTS_TEMPLATE_KEYS)) {
                errors.push(tPath + ' : clés autorisées — ' + CS.PROFILE_GEN_PROMPTS_TEMPLATE_KEYS.join(', ') + '.');
            }
            if (typeof tpl.id !== 'string' || !tpl.id.length) {
                errors.push(tPath + '.id doit être une chaîne non vide.');
            }
            if (typeof tpl.storageKey !== 'string' || !/^pdm_/.test(tpl.storageKey)) {
                errors.push(tPath + '.storageKey doit commencer par pdm_.');
            }
            if (typeof tpl.pathTemplate !== 'string' || !tpl.pathTemplate.trim()) {
                errors.push(tPath + '.pathTemplate doit être une chaîne non vide.');
            }
        }
    }
    return { ok: errors.length === 0, errors: errors };
};

})();
