/**
 * PromptDeMerde.com — storage-config-import-zip-apply.js
 *
 * Synopsis : Appliquer un bundle ZIP déjà validé (wipe, i18n, prompts, register).
 * Objectif : Corps métier de importConfigZip après loadFromZip + validatePdmConfig.
 */
(function () {

var S = window.PDM && window.PDM.Storage;
if (!S) { console.warn('[storage-config-import-zip-apply] PDM.Storage missing'); return; }

S._zipResolveImportProfileId = function (normalized, bundle, options) {
    var PS = window.PDM && window.PDM.ProfileSelector;
    var importProfileId = '';
    if (options.registerCustomProfile !== false && PS &&
        typeof PS.inferProfileLabel === 'function' &&
        typeof PS.resolveCustomProfileId === 'function') {
        var peekLabel = PS.inferProfileLabel(normalized, options.filename || '', {
            exportLabel: bundle.manifest && bundle.manifest.label
                ? String(bundle.manifest.label).trim() : ''
        });
        importProfileId = PS.resolveCustomProfileId(normalized, peekLabel);
        if (typeof PS.isBundledProfileId === 'function' &&
            (PS.isBundledProfileId(importProfileId) ||
                PS.isBundledProfileId(String(importProfileId).replace(/^custom-/, '')))) {
            importProfileId = S.ensureCustomProfileId(PS.labelToProfileId(peekLabel));
        }
    }
    if (!importProfileId) {
        importProfileId = (normalized && normalized.pdm_active_profile)
            || (bundle.manifest && bundle.manifest.id)
            || S.getActiveProfile();
    }
    if (typeof S.ensureCustomProfileId === 'function') {
        importProfileId = S.ensureCustomProfileId(importProfileId);
    }
    return importProfileId;
};

S._zipImportPromptsMap = function (bundle, importProfileId, locale) {
    var PBun = window.PDM && window.PDM.PromptsBundle;
    if (!PBun || !bundle.rawFileMap || !bundle.promptsIndex ||
        typeof PBun.importFromFileMap !== 'function') return;
    PBun.importFromFileMap(
        bundle.rawFileMap,
        bundle.promptsIndex,
        importProfileId,
        bundle.genPromptsIndex,
        bundle.localesIndex
    );
    if (typeof PBun.setLocaleMeta === 'function') {
        PBun.setLocaleMeta(
            locale,
            bundle.resolvedLocale || bundle.locale || locale,
            !!bundle.localeFallback
        );
    }
};

S._zipRegisterCustom = function (normalized, bundle, marketplace, options) {
    var PS = window.PDM && window.PDM.ProfileSelector;
    var PBun = window.PDM && window.PDM.PromptsBundle;
    if (options.registerCustomProfile === false || !PS ||
        typeof PS.registerImportedConfig !== 'function') return;
    var regOpts = Object.assign({}, options);
    if (bundle.manifest && bundle.manifest.label) {
        regOpts.exportLabel = String(bundle.manifest.label).trim();
    }
    var importSyn = S.resolveImportSynopsis(marketplace, bundle.manifest);
    if (importSyn) regOpts.synopsis = importSyn;
    var registered = PS.registerImportedConfig(normalized, regOpts);
    if (registered && registered.id && PBun &&
        typeof PBun.rebindProfileId === 'function') {
        PBun.rebindProfileId(registered.id);
    }
};

S._zipMarkUntrustedDisplay = function () {
    if (window.PDM && window.PDM.UI &&
        typeof window.PDM.UI.setUntrustedProfileDisplay === 'function') {
        window.PDM.UI.setUntrustedProfileDisplay(true);
    }
};

S._zipNormalizeAndValidate = function (bundle, options) {
    var CS = window.PDM && window.PDM.ConfigSchema;
    var normalized = CS.normalizeLegacyConfig(JSON.parse(JSON.stringify(bundle.assembled)));
    if (options.stripTokens !== false) {
        normalized.pdm_token_ollama = '';
        delete normalized.pdm_token_proxy;
    }
    var secRaw = CS.runImportSecurityChecks
        ? CS.runImportSecurityChecks(normalized) : { ok: true, errors: [] };
    if (!secRaw.ok) {
        return S._importFail(
            secRaw.errors.length === 1 ? secRaw.errors[0] : secRaw.errors.join('\n'),
            secRaw.errors
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

S._zipWipeAndI18n = function (incomingI18n) {
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
    return { ok: true };
};

S.applyValidatedZipBundle = function (bundle, options, locale) {
    options = options || {};
    var PB = window.PDM && window.PDM.ProfileBundle;
    var pre = S._zipNormalizeAndValidate(bundle, options);
    if (!pre.ok) return pre;
    var normalized = pre.normalized;
    var incomingI18n = PB.extractI18nFromFileMap
        ? PB.extractI18nFromFileMap(bundle.rawFileMap) : null;
    var marketplace = PB.extractMarketplaceFromFileMap
        ? PB.extractMarketplaceFromFileMap(bundle.rawFileMap) : null;
    var wiped = S._zipWipeAndI18n(incomingI18n);
    if (!wiped.ok) return wiped;
    var importProfileId = S._zipResolveImportProfileId(normalized, bundle, options);
    S._zipImportPromptsMap(bundle, importProfileId, locale);
    S._zipRegisterCustom(normalized, bundle, marketplace, options);
    S._importAlignLanguage(normalized, incomingI18n);
    S._importConfigKeys(normalized);
    S.applyImportSynopsis(marketplace, bundle.manifest, locale);
    if (window.PDM && window.PDM.I18n &&
        typeof window.PDM.I18n.rehydrateUserBundleFromStorage === 'function') {
        window.PDM.I18n.rehydrateUserBundleFromStorage();
    }
    S._zipMarkUntrustedDisplay();
    return { ok: true, format: 'pdm-profile-zip' };
};

})();
