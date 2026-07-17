/**
 * PromptDeMerde.com — config-schema-validate-locales.js
 *
 * Validation de parts/locales.json (source unique des locales de prompts).
 */
(function() {

var CS = window.PDM && window.PDM.ConfigSchema;
if (!CS) { console.warn('[config-schema-validate-locales] PDM.ConfigSchema not found.'); return; }

CS.PROFILE_LOCALES_TYPE = 'pdm-profile-locales';
CS.PROFILE_LOCALES_KEYS = ['version', 'type', 'defaultLocale', 'locales'];

CS.FORBIDDEN_PROMPTS_INDEX_KEYS = ['availableLocales', 'defaultLocale'];
CS.FORBIDDEN_GEN_PROMPTS_INDEX_KEYS = ['availableLocales', 'defaultLocale'];
CS.FORBIDDEN_MANIFEST_KEYS = ['promptLocales'];

CS.validateProfileLocalesIndex = function(data, pathPrefix) {
    pathPrefix = pathPrefix || 'locales.json';
    var errors = [];
    if (!CS.isPlainObject(data)) {
        errors.push(pathPrefix + ' doit être un objet.');
        return { ok: false, errors: errors };
    }
    if (!CS.hasOnlyKeys(data, CS.PROFILE_LOCALES_KEYS)) {
        errors.push(pathPrefix + ' : clés autorisées — ' + CS.PROFILE_LOCALES_KEYS.join(', ') + '.');
    }
    if (data.type !== CS.PROFILE_LOCALES_TYPE) {
        errors.push(pathPrefix + '.type doit être « ' + CS.PROFILE_LOCALES_TYPE + ' ».');
    }
    if (typeof data.version !== 'string' || !String(data.version).trim()) {
        errors.push(pathPrefix + '.version doit être une chaîne non vide.');
    }
    if (typeof data.defaultLocale !== 'string' || !/^[a-z]{2}$/.test(data.defaultLocale)) {
        errors.push(pathPrefix + '.defaultLocale doit être un code langue à 2 lettres.');
    }
    if (!Array.isArray(data.locales) || !data.locales.length) {
        errors.push(pathPrefix + '.locales doit être un tableau non vide.');
    } else {
        var seen = {};
        for (var i = 0; i < data.locales.length; i++) {
            var loc = String(data.locales[i] || '');
            if (!/^[a-z]{2}$/.test(loc)) {
                errors.push(pathPrefix + '.locales[' + i + '] invalide.');
            }
            if (seen[loc]) {
                errors.push(pathPrefix + '.locales : doublon « ' + loc + ' ».');
            }
            seen[loc] = true;
        }
        if (data.defaultLocale && data.locales.indexOf(data.defaultLocale) < 0) {
            errors.push(pathPrefix + '.defaultLocale doit figurer dans .locales.');
        }
    }
    return { ok: errors.length === 0, errors: errors };
};

CS.assertNoForbiddenKeys = function(data, forbiddenKeys, pathPrefix, errors) {
    if (!data || typeof data !== 'object' || !Array.isArray(forbiddenKeys)) return;
    for (var i = 0; i < forbiddenKeys.length; i++) {
        var key = forbiddenKeys[i];
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            errors.push(pathPrefix + ' : clé interdite « ' + key + ' » (utiliser parts/locales.json).');
        }
    }
};

CS.validateProfileManifestMeta = function(data, pathPrefix) {
    pathPrefix = pathPrefix || 'manifest.json';
    var errors = [];
    if (!CS.isPlainObject(data)) return { ok: true, errors: errors };
    CS.assertNoForbiddenKeys(data, CS.FORBIDDEN_MANIFEST_KEYS, pathPrefix, errors);
    return { ok: errors.length === 0, errors: errors };
};

})();
