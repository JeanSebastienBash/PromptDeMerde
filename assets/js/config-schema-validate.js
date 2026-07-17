/**
 * PromptDeMerde.com — config-schema-validate.js
 *
 * Synopsis : Validateur strict du format pdm-config complet — orchestrateur.
 * Objectif : Étendre PDM.ConfigSchema avec validatePdmConfig() ; validations de champs dans
 *            config-schema-validate-fields.js et config-schema-validate-collections.js.
 */
(function() {

var CS = window.PDM && window.PDM.ConfigSchema;
if (!CS) { console.warn('[config-schema-validate] PDM.ConfigSchema not found.'); return; }

CS.validatePdmConfig = function(data) {
    var errors = [];

    if (!CS.isPlainObject(data)) {
        return { ok: false, errors: ['La racine doit être un objet JSON.'] };
    }

    if (typeof CS.runImportSecurityChecks === 'function') {
        var sec = CS.runImportSecurityChecks(data);
        if (!sec.ok) {
            return { ok: false, errors: sec.errors };
        }
    }

    if (data.type === 'system-prompt' || data.type === 'prompts') {
        errors.push('Format « ' + data.type + ' » non supporté — seul « pdm-config » complet est accepté.');
        return { ok: false, errors: errors };
    }

    if (data.type !== CS.CONFIG_TYPE) {
        errors.push('type doit être "' + CS.CONFIG_TYPE + '".');
    }

    if (typeof data.version !== 'string' || !CS._SEMVER_RE.test(data.version)) {
        errors.push('version doit être une chaîne semver (ex. 1.5.0).');
    }

    if (data.exportedAt !== undefined && data.exportedAt !== null) {
        if (typeof data.exportedAt !== 'string' || !CS.isIso8601(data.exportedAt)) {
            errors.push('exportedAt doit être une date ISO 8601 valide ou être absent.');
        }
    }

    var allowedRoot = {};
    for (var rk = 0; rk < CS.REQUIRED_ROOT_KEYS.length; rk++) {
        allowedRoot[CS.REQUIRED_ROOT_KEYS[rk]] = true;
    }
    if (Array.isArray(CS.OPTIONAL_ROOT_KEYS)) {
        for (var ok = 0; ok < CS.OPTIONAL_ROOT_KEYS.length; ok++) {
            allowedRoot[CS.OPTIONAL_ROOT_KEYS[ok]] = true;
        }
    }
    for (var key in data) {
        if (!data.hasOwnProperty(key)) continue;
        if (!allowedRoot[key]) {
            errors.push('Clé racine inconnue : ' + key + '.');
        }
    }

    for (var mi = 0; mi < CS.META_KEYS.length; mi++) {
        var mk = CS.META_KEYS[mi];
        if (mk === 'exportedAt') continue;
        if (data[mk] === undefined || data[mk] === null) {
            errors.push('Clé racine manquante : ' + mk + '.');
        }
    }

    for (var pi = 0; pi < CS.PDM_KEYS.length; pi++) {
        var pk = CS.PDM_KEYS[pi];
        if (data[pk] === undefined) {
            errors.push('Clé manquante : ' + pk + '.');
        }
    }

    if (errors.length) {
        return { ok: false, errors: errors };
    }

    CS._validateScalarFields(data, errors);
    CS._validateGenAndUiFields(data, errors);
    if (typeof CS._validateOptionalI18n === 'function') {
        CS._validateOptionalI18n(data, errors);
    }
    CS._validateProfiles(data, errors);
    CS._validateWorkspaceAndHistory(data, errors);
    if (typeof CS.validateStringLengths === 'function') {
        CS.validateStringLengths(data, errors);
    }

    return { ok: errors.length === 0, errors: errors };
};

CS.validateAudioMetaFields = function(obj, path, errors) {
    var source = obj.inputSource;
    if (source === undefined) {
        if (obj.audioFileName != null || obj.audioRef != null) source = 'audio-file';
        else return;
    }
    if (CS.WORKSPACE_INPUT_SOURCES.indexOf(source) === -1) {
        errors.push(path + '.inputSource invalide — valeurs : manual, audio-file, audio-dictation.');
    }
    if (obj.audioFileName !== undefined && obj.audioFileName !== null && typeof obj.audioFileName !== 'string') {
        errors.push(path + '.audioFileName doit être une chaîne ou null.');
    }
    if (obj.audioFileSize !== undefined && obj.audioFileSize !== null) {
        if (typeof obj.audioFileSize !== 'number' || !Number.isFinite(obj.audioFileSize) || obj.audioFileSize < 0) {
            errors.push(path + '.audioFileSize doit être un nombre >= 0 ou null.');
        }
    }
    if (obj.audioMimeType !== undefined && obj.audioMimeType !== null && typeof obj.audioMimeType !== 'string') {
        errors.push(path + '.audioMimeType doit être une chaîne ou null.');
    }
    if (obj.audioLastModified !== undefined && obj.audioLastModified !== null) {
        if (typeof obj.audioLastModified !== 'number' || !Number.isFinite(obj.audioLastModified)) {
            errors.push(path + '.audioLastModified doit être un nombre (epoch ms) ou null.');
        }
    }
    if (obj.audioRef !== undefined && obj.audioRef !== null && typeof obj.audioRef !== 'string') {
        errors.push(path + '.audioRef doit être une chaîne ou null.');
    }
    if (obj.audioSegmentCount !== undefined && obj.audioSegmentCount !== null) {
        if (typeof obj.audioSegmentCount !== 'number' || !Number.isFinite(obj.audioSegmentCount) || obj.audioSegmentCount < 1) {
            errors.push(path + '.audioSegmentCount doit être un nombre >= 1 ou null.');
        }
    }
    if (source === 'audio-file') {
        if (!obj.audioFileName || typeof obj.audioFileName !== 'string' || !obj.audioFileName.trim()) {
            errors.push(path + '.audioFileName est requis quand inputSource vaut audio-file.');
        }
    } else if (source === 'audio-dictation') {
        if (!obj.audioRef || typeof obj.audioRef !== 'string' || !obj.audioRef.trim()) {
            errors.push(path + '.audioRef est requis quand inputSource vaut audio-dictation.');
        }
        if (obj.audioSegmentCount == null || obj.audioSegmentCount < 1) {
            errors.push(path + '.audioSegmentCount est requis (>= 1) quand inputSource vaut audio-dictation.');
        }
    } else if (source === 'manual') {
        if (obj.audioFileName != null || obj.audioRef != null || obj.audioSegmentCount != null) {
            errors.push(path + ' : champs audio doivent être null quand inputSource vaut manual.');
        }
    }
};

})();
