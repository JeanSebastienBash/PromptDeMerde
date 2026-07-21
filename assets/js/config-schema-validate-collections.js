/**
 * PromptDeMerde.com — config-schema-validate-collections.js
 *
 * Synopsis : Validation des collections de pdm-config (profils, workspace, historique).
 * Objectif : Étendre PDM.ConfigSchema avec _validateProfiles et _validateWorkspaceAndHistory (appelés par validatePdmConfig).
 */
(function() {

var CS = window.PDM && window.PDM.ConfigSchema;
if (!CS) { console.warn('[config-schema-validate-collections] PDM.ConfigSchema not found.'); return; }

CS._validateProfiles = function(data, errors) {
    if (!Array.isArray(data.pdm_profiles)) {
        errors.push('pdm_profiles doit être un tableau.');
    } else if (data.pdm_profiles.length > 999) {
        errors.push('pdm_profiles : maximum 999 profils.');
    } else {
        for (var i = 0; i < data.pdm_profiles.length; i++) {
            var prof = data.pdm_profiles[i];
            var pPath = 'pdm_profiles[' + i + ']';
            if (!CS.isPlainObject(prof)) {
                errors.push(pPath + ' doit être un objet.');
                continue;
            }
            if (!CS.hasOnlyKeys(prof, CS.PROFILE_KEYS)) {
                errors.push(pPath + ' : clés autorisées uniquement — id, tag, prompt, active, origin.');
            }
            if (typeof prof.id !== 'string' || !prof.id.length) {
                errors.push(pPath + '.id doit être une chaîne non vide.');
            }
            if (typeof prof.prompt !== 'string') {
                errors.push(pPath + '.prompt doit être une chaîne.');
            }
            if (!CS.isStrictBoolean(prof.active)) {
                errors.push(pPath + '.active doit être un booléen.');
            }
            CS.validateProfileTag(prof.tag, pPath, errors);
            if (prof.origin !== undefined) {
                if (!CS.isPlainObject(prof.origin)) {
                    errors.push(pPath + '.origin doit être un objet.');
                } else if (!CS.hasOnlyKeys(prof.origin, CS.PROFILE_ORIGIN_KEYS)) {
                    errors.push(pPath + '.origin : clés autorisées — ' + CS.PROFILE_ORIGIN_KEYS.join(', ') + '.');
                } else if (typeof prof.origin.method !== 'string' ||
                    CS.PROFILE_ORIGIN_METHODS.indexOf(prof.origin.method) === -1) {
                    errors.push(pPath + '.origin.method invalide — valeurs : ' + CS.PROFILE_ORIGIN_METHODS.join(', ') + '.');
                } else {
                    if (prof.origin.generatedAt !== undefined &&
                        (typeof prof.origin.generatedAt !== 'string' || !CS.isIso8601(prof.origin.generatedAt))) {
                        errors.push(pPath + '.origin.generatedAt doit être une date ISO 8601 valide.');
                    }
                    if (prof.origin.createdAt !== undefined &&
                        (typeof prof.origin.createdAt !== 'string' || !CS.isIso8601(prof.origin.createdAt))) {
                        errors.push(pPath + '.origin.createdAt doit être une date ISO 8601 valide.');
                    }
                    if (prof.origin.provider !== undefined && typeof prof.origin.provider !== 'string') {
                        errors.push(pPath + '.origin.provider doit être une chaîne.');
                    }
                    if (prof.origin.model !== undefined && typeof prof.origin.model !== 'string') {
                        errors.push(pPath + '.origin.model doit être une chaîne.');
                    }
                    if (prof.origin.systemPrompt !== undefined && typeof prof.origin.systemPrompt !== 'string') {
                        errors.push(pPath + '.origin.systemPrompt doit être une chaîne.');
                    }
                    if (prof.origin.userPrompt !== undefined && typeof prof.origin.userPrompt !== 'string') {
                        errors.push(pPath + '.origin.userPrompt doit être une chaîne.');
                    }
                    if (prof.origin.sourceFile !== undefined && typeof prof.origin.sourceFile !== 'string') {
                        errors.push(pPath + '.origin.sourceFile doit être une chaîne.');
                    }
                }
            }
        }
    }
};

CS._validateWorkspaceAndHistory = function(data, errors) {
    if (!CS.isPlainObject(data.pdm_workspace)) {
        errors.push('pdm_workspace doit être un objet.');
    } else if (!CS.hasOnlyKeys(data.pdm_workspace, CS.WORKSPACE_KEYS)) {
        errors.push('pdm_workspace : clés autorisées uniquement — ' + CS.WORKSPACE_KEYS.join(', ') + '.');
    } else {
        var ws = data.pdm_workspace;
        if (typeof ws.input !== 'string') errors.push('pdm_workspace.input doit être une chaîne.');
        if (typeof ws.output !== 'string') errors.push('pdm_workspace.output doit être une chaîne.');
        if (typeof ws.thinking !== 'string') errors.push('pdm_workspace.thinking doit être une chaîne.');
        if (ws.savedAt !== null && (typeof ws.savedAt !== 'string' || !CS.isIso8601(ws.savedAt))) {
            errors.push('pdm_workspace.savedAt doit être null ou une date ISO 8601 valide.');
        }
        if (!CS.isStrictBoolean(ws.contextPanelOpen)) {
            errors.push('pdm_workspace.contextPanelOpen doit être un booléen.');
        }
        var compressKeys = [
            'compressIncludeSystem', 'compressIncludeContexts',
            'compressIncludeInput', 'compressIncludeOutput'
        ];
        for (var ci = 0; ci < compressKeys.length; ci++) {
            var ck = compressKeys[ci];
            if (ws[ck] !== undefined && !CS.isStrictBoolean(ws[ck])) {
                errors.push('pdm_workspace.' + ck + ' doit être un booléen.');
            }
        }
        CS.validateAudioMetaFields(ws, 'pdm_workspace', errors);
    }

    if (!Array.isArray(data.pdm_clean_history)) {
        errors.push('pdm_clean_history doit être un tableau.');
    } else if (data.pdm_clean_history.length > 100) {
        errors.push('pdm_clean_history : maximum 100 entrées.');
    } else {
        var histAllowed = CS.HISTORY_REQUIRED.concat(CS.HISTORY_OPTIONAL);
        for (var hi = 0; hi < data.pdm_clean_history.length; hi++) {
            var entry = data.pdm_clean_history[hi];
            var hPath = 'pdm_clean_history[' + hi + ']';
            if (!CS.isPlainObject(entry)) {
                errors.push(hPath + ' doit être un objet.');
                continue;
            }
            if (!CS.hasOnlyKeys(entry, histAllowed)) {
                errors.push(hPath + ' : contient une clé non reconnue.');
            }
            for (var hr = 0; hr < CS.HISTORY_REQUIRED.length; hr++) {
                var req = CS.HISTORY_REQUIRED[hr];
                if (entry[req] === undefined || entry[req] === null) {
                    errors.push(hPath + '.' + req + ' est obligatoire.');
                }
            }
            if (typeof entry.id !== 'string' || !entry.id.length) {
                errors.push(hPath + '.id doit être une chaîne non vide.');
            }
            if (typeof entry.type !== 'string' || !entry.type.length) {
                errors.push(hPath + '.type doit être une chaîne non vide.');
            }
            if (typeof entry.at !== 'string' || !CS.isIso8601(entry.at)) {
                errors.push(hPath + '.at doit être une date ISO 8601 valide.');
            }
            if (typeof entry.input !== 'string') {
                errors.push(hPath + '.input doit être une chaîne.');
            }
            if (entry.thinking !== undefined && typeof entry.thinking !== 'string') {
                errors.push(hPath + '.thinking doit être une chaîne.');
            }
            if (entry.output !== undefined && typeof entry.output !== 'string') {
                errors.push(hPath + '.output doit être une chaîne.');
            }
            if (entry.activeContexts !== undefined && !Array.isArray(entry.activeContexts)) {
                errors.push(hPath + '.activeContexts doit être un tableau.');
            }
            if (entry.trace !== undefined && entry.trace !== null && !CS.isPlainObject(entry.trace)) {
                errors.push(hPath + '.trace doit être un objet.');
            }
            if (entry.usage !== undefined && entry.usage !== null && !CS.isPlainObject(entry.usage)) {
                errors.push(hPath + '.usage doit être un objet ou null.');
            }
            if (entry.duration_ms !== undefined && typeof entry.duration_ms !== 'number') {
                errors.push(hPath + '.duration_ms doit être un nombre.');
            }
            if (entry.provider !== undefined) {
                if (typeof entry.provider !== 'string' || entry.provider.length > 64) {
                    errors.push(hPath + '.provider invalide (chaîne, max 64 car.).');
                } else if (/[<>&]/.test(entry.provider)) {
                    errors.push(hPath + '.provider contient des caractères interdits.');
                }
            }
            if (entry.model !== undefined) {
                if (typeof entry.model !== 'string' || entry.model.length > 128) {
                    errors.push(hPath + '.model invalide (chaîne, max 128 car.).');
                } else if (/[<>&]/.test(entry.model)) {
                    errors.push(hPath + '.model contient des caractères interdits.');
                }
            }
            CS.validateAudioMetaFields(entry, hPath, errors);
        }
    }

    if (typeof data.pdm_history_count !== 'number' || !Number.isInteger(data.pdm_history_count)) {
        errors.push('pdm_history_count doit être un entier.');
    } else if (Array.isArray(data.pdm_clean_history) &&
        data.pdm_history_count !== data.pdm_clean_history.length) {
        errors.push('pdm_history_count (' + data.pdm_history_count +
            ') doit être égal à la longueur de pdm_clean_history (' +
            data.pdm_clean_history.length + ').');
    }
};

})();
