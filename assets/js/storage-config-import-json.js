/**
 * PromptDeMerde.com — storage-config-import-json.js
 *
 * Synopsis : Import JSON pdm-config (validation, wipe, application).
 * Objectif : importConfig / importProfile / alias exportProfile.
 */
(function () {

var S = window.PDM && window.PDM.Storage;
if (!S) { console.warn('[storage-config-import-json] PDM.Storage missing'); return; }

S._importFail = function (msg, errors) {
    return { ok: false, error: msg, errors: errors || [msg] };
};

S._importPeekI18n = function (normalized) {
    if (!normalized.i18n || typeof normalized.i18n !== 'object') return null;
    var langs = Array.isArray(normalized.langs) && normalized.langs.length
        ? normalized.langs.slice()
        : Object.keys(normalized.i18n);
    if (!langs.length) return null;
    return { langs: langs, i18n: JSON.parse(JSON.stringify(normalized.i18n)) };
};

S._importAlignLanguage = function (normalized, incomingI18n) {
    if (!incomingI18n || !incomingI18n.langs.length) return;
    var wantLang = String(normalized.pdm_language || S.get(S.KEYS.LANGUAGE) || 'fr').trim();
    if (incomingI18n.langs.indexOf(wantLang) >= 0) return;
    normalized.pdm_language = incomingI18n.langs.indexOf('fr') >= 0 ? 'fr'
        : (incomingI18n.langs.indexOf('en') >= 0 ? 'en' : incomingI18n.langs[0]);
};

S._importReservedNameFail = function (options) {
    if (!options.filename || !window.PDM.ProfileSelector ||
        typeof window.PDM.ProfileSelector.isReservedImportName !== 'function') {
        return null;
    }
    if (!window.PDM.ProfileSelector.isReservedImportName(options.filename)) return null;
    return S._importFail(
        'Import refus\u00e9 : ce nom de fichier est r\u00e9serv\u00e9 \u00e0 un profil JSON officiel (Profil JSON).'
    );
};

S._importValidateJson = function (data, options) {
    var reserved = S._importReservedNameFail(options);
    if (reserved) return reserved;
    if (!data || typeof data !== 'object') {
        return S._importFail('Donn\u00e9es invalides');
    }
    var CS = window.PDM && window.PDM.ConfigSchema;
    if (!CS) return S._importFail('Module de validation indisponible.');
    var normalized = CS.normalizeLegacyConfig(data);
    if (options.stripTokens !== false) {
        normalized.pdm_token_ollama = '';
        delete normalized.pdm_token_proxy;
    }
    if (!S._detectConfigFormat(normalized)) {
        return S._importFail(
            'Format de fichier non reconnu \u2014 seul pdm-config complet est accept\u00e9.'
        );
    }
    var validation = CS.validatePdmConfig(normalized);
    if (!validation.ok) {
        var err = validation.errors.length === 1
            ? validation.errors[0]
            : validation.errors.length + ' erreurs de validation';
        return S._importFail(err, validation.errors);
    }
    return { ok: true, normalized: normalized };
};

S.importConfig = function (data, options) {
    options = options || {};
    var pre = S._importValidateJson(data, options);
    if (!pre.ok) return pre;
    var normalized = pre.normalized;
    var incomingI18n = S._importPeekI18n(normalized);
    S.wipeAllUserData({ preserveCustomProfiles: true });
    if (incomingI18n) {
        if (!S.setI18nBundle(incomingI18n)) {
            return S._importFail(
                'Impossible d\u2019enregistrer le dictionnaire UI import\u00e9 (stockage local plein ?).'
            );
        }
    } else {
        S.clearI18nBundle();
    }
    if (options.registerCustomProfile !== false &&
        window.PDM.ProfileSelector &&
        typeof window.PDM.ProfileSelector.registerImportedConfig === 'function') {
        window.PDM.ProfileSelector.registerImportedConfig(normalized, options);
    }
    S._importAlignLanguage(normalized, incomingI18n);
    S._importConfigKeys(normalized);
    if (window.PDM && window.PDM.I18n &&
        typeof window.PDM.I18n.rehydrateUserBundleFromStorage === 'function') {
        window.PDM.I18n.rehydrateUserBundleFromStorage();
    }
    return { ok: true, format: 'pdm-config' };
};

S.exportProfile = S.exportConfig;

S.importProfile = function (data) {
    var result = S.importConfig(data);
    return result && result.ok;
};

})();
