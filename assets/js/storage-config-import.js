/**
 * PromptDeMerde.com — storage-config-import.js
 *
 * Synopsis : Import pdm-config (validation, wipe, application) et bundle profil.
 * Objectif : Étendre PDM.Storage avec importConfig, applyProfileBundle et le fingerprint de bundle.
 */
(function(){

var S = window.PDM && window.PDM.Storage;
if (!S) { console.warn('[storage-config-import] PDM.Storage not found.'); return; }

S.PROFILE_BUNDLE_FP_KEY = 'pdm_profile_bundle_fp';

S.computeProfileBundleFingerprint = function(config) {
    if (!config || typeof config !== 'object') return '';
    var parts = [String(config.pdm_active_profile || '')];
    parts.push(String(config.pdm_system_prompt || ''));
    var profs = config.pdm_profiles;
    if (Array.isArray(profs)) {
        for (var i = 0; i < profs.length; i++) {
            var p = profs[i];
            if (!p) continue;
            parts.push(String(p.id || '') + ':' + String(p.tag || ''));
        }
    }
    parts.push(String(config.pdm_theme || ''));
    parts.push(String(config.pdm_stt_engine || ''));
    parts.push(String(config.pdm_context_position || ''));
    return parts.join('\x1e');
};

S.getProfileBundleFingerprint = function() {
    var v = S.get(S.PROFILE_BUNDLE_FP_KEY);
    return v != null ? String(v) : '';
};

S.setProfileBundleFingerprint = function(fp) {
    return S.set(S.PROFILE_BUNDLE_FP_KEY, fp != null ? String(fp) : '');
};

S.applyProfileBundle = function(config, options) {
    if (!config || typeof config !== 'object') return false;
    options = options || {};
    var preserveChrome = options.preserveSessionChrome === true;

    if (config[S.KEYS.SYSTEM_PROMPT]) {
        S.set(S.KEYS.SYSTEM_PROMPT, config[S.KEYS.SYSTEM_PROMPT]);
    }
    if (config[S.KEYS.IMAGE_PROMPT]) {
        S.set(S.KEYS.IMAGE_PROMPT, config[S.KEYS.IMAGE_PROMPT]);
    }
    if (config[S.KEYS.IMAGE_MODEL] && typeof S.setImageModel === 'function') {
        S.setImageModel(config[S.KEYS.IMAGE_MODEL]);
    }
    if (config[S.KEYS.SYSTEM_PROMPT_ENABLED] !== undefined) {
        S.setSystemPromptEnabled(config[S.KEYS.SYSTEM_PROMPT_ENABLED]);
    }
    if (Array.isArray(config[S.KEYS.PROFILES])) {
        S.setProfiles(config[S.KEYS.PROFILES].slice());
    }
    if (config[S.KEYS.THEME]) {
        var themeVal = config[S.KEYS.THEME];
        if (window.PDM && window.PDM.Themes && window.PDM.Themes.migrateThemeId) {
            themeVal = window.PDM.Themes.migrateThemeId(themeVal);
        }
        S.set(S.KEYS.THEME, themeVal);
    }
    if (config[S.KEYS.STT_ENGINE]) {
        S.setSttEngine(config[S.KEYS.STT_ENGINE]);
    }
    if (config[S.KEYS.STT_COMPUTE]) {
        S.setSttCompute(config[S.KEYS.STT_COMPUTE]);
    }
    if (config[S.KEYS.CONTEXT_POSITION]) {
        S.setContextPosition(config[S.KEYS.CONTEXT_POSITION]);
    }

    if (config[S.KEYS.WORKSPACE_UI]) {
        var hasLocalUi = !!S.get(S.KEYS.WORKSPACE_UI);
        if (!preserveChrome || !hasLocalUi) {
            S.setWorkspaceUi(config[S.KEYS.WORKSPACE_UI]);
        }
    }
    if (config[S.KEYS.ACTIVE_PROFILE]) {
        S.setActiveProfile(config[S.KEYS.ACTIVE_PROFILE]);
    }
    if (config[S.KEYS.PROJECT]) {
        var hasLocalProject = !!S.getProject();
        if (!preserveChrome || !hasLocalProject) {
            S.setProject(config[S.KEYS.PROJECT]);
        }
    }

    S.applyProfileGenPrompts(config);

    S.setProfileBundleFingerprint(S.computeProfileBundleFingerprint(config));
    return true;
};

S.applyProfileGenPrompts = function(config) {
    if (!config || typeof config !== 'object') return false;
    var setters = [
        ['pdm_context_gen_system', 'setContextGenSystem'],
        ['pdm_context_gen_user_intent', 'setContextGenUserIntent'],
        ['pdm_context_gen_user_title', 'setContextGenUserTitle'],
        ['pdm_context_inject_header', 'setContextInjectHeader'],
        ['pdm_context_gen_tag_intent_suffix', 'setContextGenTagIntentSuffix'],
        ['pdm_context_gen_forced_tag_system_suffix', 'setContextGenForcedTagSystemSuffix'],
        ['pdm_context_gen_retry_system_suffix', 'setContextGenRetrySystemSuffix'],
        ['pdm_context_gen_retry_user_suffix', 'setContextGenRetryUserSuffix'],
        ['pdm_context_profile_line_template', 'setContextProfileLineTemplate']
    ];
    for (var i = 0; i < setters.length; i++) {
        var key = setters[i][0];
        var setter = setters[i][1];
        if (config[key] !== undefined && typeof S[setter] === 'function') {
            S[setter](config[key]);
        }
    }
    return true;
};

S._importConfigKeys = function(data) {
    S.set(S.KEYS.PROVIDER, data[S.KEYS.PROVIDER]);
    S.set(S.KEYS.MODEL, data[S.KEYS.MODEL]);
    if (typeof S.setImageModel === 'function') {
        S.setImageModel(data[S.KEYS.IMAGE_MODEL]);
    } else {
        S.set(S.KEYS.IMAGE_MODEL, data[S.KEYS.IMAGE_MODEL] || '');
    }
    S.set(S.KEYS.IMAGE_PROMPT, data[S.KEYS.IMAGE_PROMPT] || (S.getImagePromptEffective ? S.getImagePromptEffective() : ''));
    S.set(S.KEYS.SYSTEM_PROMPT, data[S.KEYS.SYSTEM_PROMPT] != null
        ? String(data[S.KEYS.SYSTEM_PROMPT])
        : '');
    S.setSystemPromptEnabled(data[S.KEYS.SYSTEM_PROMPT_ENABLED]);
    S.setProfiles(data[S.KEYS.PROFILES].slice());
    S.set(S.KEYS.LANGUAGE, data[S.KEYS.LANGUAGE]);
    var rawTheme = data[S.KEYS.THEME];
    if (window.PDM && window.PDM.Themes && window.PDM.Themes.migrateThemeId) {
        rawTheme = window.PDM.Themes.migrateThemeId(rawTheme);
    }
    S.set(S.KEYS.THEME, rawTheme);
    S.setCleanHistory((data[S.KEYS.CLEAN_HISTORY] || []).slice());
    var wsIn = data[S.KEYS.WORKSPACE] || {};
    S.set(S.KEYS.WORKSPACE, {
        input: String(wsIn.input != null ? wsIn.input : ''),
        output: String(wsIn.output != null ? wsIn.output : ''),
        thinking: String(wsIn.thinking != null ? wsIn.thinking : ''),
        savedAt: wsIn.savedAt,
        contextPanelOpen: wsIn.contextPanelOpen === true,
        inputSource: ['audio-file', 'audio-dictation', 'image-file'].indexOf(wsIn.inputSource) >= 0 ? wsIn.inputSource : 'manual',
        audioFileName: wsIn.audioFileName != null ? String(wsIn.audioFileName) : null,
        audioFileSize: wsIn.audioFileSize != null ? wsIn.audioFileSize : null,
        audioMimeType: wsIn.audioMimeType != null ? String(wsIn.audioMimeType) : null,
        audioLastModified: wsIn.audioLastModified != null ? wsIn.audioLastModified : null,
        audioRef: wsIn.audioRef != null ? String(wsIn.audioRef) : null,
        audioSegmentCount: wsIn.audioSegmentCount != null ? wsIn.audioSegmentCount : null
    });
    S.setSttDeviceId(data[S.KEYS.STT_DEVICE_ID]);
    S.setSttEngine(data[S.KEYS.STT_ENGINE]);
    S.setSttCompute(data[S.KEYS.STT_COMPUTE]);
    S.setSttInsertAtCursor(data[S.KEYS.STT_INSERT_AT_CURSOR]);
    if (data[S.KEYS.STT_DELETE_WORD_ENABLED] !== undefined) {
        S.setSttDeleteWordEnabled(data[S.KEYS.STT_DELETE_WORD_ENABLED]);
    }
    if (data[S.KEYS.STT_DELETE_WORD_SHORTCUT] !== undefined) {
        S.setSttDeleteWordShortcut(data[S.KEYS.STT_DELETE_WORD_SHORTCUT]);
    }
    if (data[S.KEYS.STT_DELETE_WORD_TARGET] !== undefined) {
        S.setSttDeleteWordTarget(data[S.KEYS.STT_DELETE_WORD_TARGET]);
    }
    S.setContextPosition(data[S.KEYS.CONTEXT_POSITION]);
    S.setOllamaUrl(data[S.KEYS.OLLAMA_URL]);
    S.setLlmThinkingEnabled(data[S.KEYS.LLM_THINKING_ENABLED]);
    S.setLlmThinkingMaxChars(data[S.KEYS.LLM_THINKING_MAX_CHARS]);
    if (data[S.KEYS.LLM_TEMPERATURE] !== undefined) {
        S.setLlmTemperature(data[S.KEYS.LLM_TEMPERATURE]);
    }
    if (data[S.KEYS.LLM_MAX_TOKENS] !== undefined) {
        S.setLlmMaxTokens(data[S.KEYS.LLM_MAX_TOKENS]);
    }
    if (data[S.KEYS.LLM_TIMEOUT_SEC] !== undefined) {
        S.setLlmTimeoutSec(data[S.KEYS.LLM_TIMEOUT_SEC]);
    }
    S.setToken('ollama', data[S.KEYS.TOKEN_OLLAMA]);
    S.setContextGenSystem(data[S.KEYS.CONTEXT_GEN_SYSTEM] || S.getContextGenSystemEffective());
    S.setContextGenUserIntent(data[S.KEYS.CONTEXT_GEN_USER_INTENT] || S.getContextGenUserIntentEffective());
    S.setContextGenUserTitle(data[S.KEYS.CONTEXT_GEN_USER_TITLE] || S.getContextGenUserTitleEffective());
    S.setContextInjectHeader(data[S.KEYS.CONTEXT_INJECT_HEADER] || S.getContextInjectHeaderEffective());
    S.setContextGenTagIntentSuffix(data[S.KEYS.CONTEXT_GEN_TAG_INTENT_SUFFIX] || S.getContextGenTagIntentSuffixEffective());
    S.setContextGenForcedTagSystemSuffix(data[S.KEYS.CONTEXT_GEN_FORCED_TAG_SYSTEM_SUFFIX] || S.getContextGenForcedTagSystemSuffixEffective());
    S.setContextGenRetrySystemSuffix(data[S.KEYS.CONTEXT_GEN_RETRY_SYSTEM_SUFFIX] || S.getContextGenRetrySystemSuffixEffective());
    S.setContextGenRetryUserSuffix(data[S.KEYS.CONTEXT_GEN_RETRY_USER_SUFFIX] || S.getContextGenRetryUserSuffixEffective());
    var CS = window.PDM && window.PDM.ConfigSchema;
    var defaultProfile = (CS && typeof CS.resolveDefaultActiveProfile === 'function')
        ? CS.resolveDefaultActiveProfile()
        : (data[S.KEYS.ACTIVE_PROFILE] || '');
    S.setActiveProfile(data[S.KEYS.ACTIVE_PROFILE] || defaultProfile);
    S.setProject(data[S.KEYS.PROJECT] || S.getProjectEffective());
    S.setContextProfileLineTemplate(data[S.KEYS.CONTEXT_PROFILE_LINE_TEMPLATE] || S.getContextProfileLineTemplateEffective());
    S.setContextGenMaxTokens(data[S.KEYS.CONTEXT_GEN_MAX_TOKENS]);
    S.setContextGenTemperature(data[S.KEYS.CONTEXT_GEN_TEMPERATURE]);
    S.setContextGenRetryTemperature(data[S.KEYS.CONTEXT_GEN_RETRY_TEMPERATURE]);
    S.setContextGenMaxRetries(data[S.KEYS.CONTEXT_GEN_MAX_RETRIES]);
    S.setContextGenJsonSchema(data[S.KEYS.CONTEXT_GEN_JSON_SCHEMA] || S.getContextGenJsonSchemaEffective());
    S.setWorkspaceUi(data[S.KEYS.WORKSPACE_UI] || S.getWorkspaceUiEffective());
    S.setProfileBundleFingerprint(S.computeProfileBundleFingerprint(data));

};

S.importConfig = function(data, options) {
    options = options || {};

    if (options.filename &&
        window.PDM.ProfileSelector &&
        typeof window.PDM.ProfileSelector.isReservedImportName === 'function' &&
        window.PDM.ProfileSelector.isReservedImportName(options.filename)) {
        return {
            ok: false,
            error: 'Import refusé : ce nom de fichier est réservé à un profil JSON officiel (Profil JSON).',
            errors: ['Import refusé : ce nom de fichier est réservé à un profil JSON officiel (Profil JSON).']
        };
    }

    if (!data || typeof data !== 'object') {
        return { ok: false, error: 'Données invalides', errors: ['Données invalides'] };
    }

    var CS = window.PDM && window.PDM.ConfigSchema;
    if (!CS) {
        return { ok: false, error: 'Module de validation indisponible.', errors: ['Module de validation indisponible.'] };
    }

    var normalized = CS.normalizeLegacyConfig(data);
    if (options.stripTokens !== false) {
        normalized.pdm_token_ollama = '';
        delete normalized.pdm_token_proxy;
    }
    var format = S._detectConfigFormat(normalized);
    if (!format) {
        return {
            ok: false,
            error: 'Format de fichier non reconnu — seul pdm-config complet est accepté.',
            errors: ['Format de fichier non reconnu — seul pdm-config complet est accepté.']
        };
    }

    var validation = CS.validatePdmConfig(normalized);
    if (!validation.ok) {
        return {
            ok: false,
            error: validation.errors.length === 1
                ? validation.errors[0]
                : validation.errors.length + ' erreurs de validation',
            errors: validation.errors
        };
    }

    var incomingI18n = null;
    if (normalized.i18n && typeof normalized.i18n === 'object') {
        var importLangs = Array.isArray(normalized.langs) && normalized.langs.length
            ? normalized.langs.slice()
            : Object.keys(normalized.i18n);
        if (importLangs.length) {
            incomingI18n = {
                langs: importLangs,
                i18n: JSON.parse(JSON.stringify(normalized.i18n))
            };
        }
    }

    S.wipeAllUserData({ preserveCustomProfiles: true });

    if (incomingI18n) {
        if (!S.setI18nBundle(incomingI18n)) {
            return {
                ok: false,
                error: 'Impossible d\u2019enregistrer le dictionnaire UI import\u00e9 (stockage local plein ?).',
                errors: ['Impossible d\u2019enregistrer le dictionnaire UI import\u00e9 (stockage local plein ?).']
            };
        }
    } else {
        S.clearI18nBundle();
    }

    if (options.registerCustomProfile !== false &&
        window.PDM.ProfileSelector &&
        typeof window.PDM.ProfileSelector.registerImportedConfig === 'function') {
        window.PDM.ProfileSelector.registerImportedConfig(normalized, options);
    }

    if (incomingI18n && incomingI18n.langs.length) {
        var wantLang = String(normalized.pdm_language || S.get(S.KEYS.LANGUAGE) || 'fr').trim();
        if (incomingI18n.langs.indexOf(wantLang) < 0) {
            var resolved = incomingI18n.langs.indexOf('fr') >= 0 ? 'fr'
                : (incomingI18n.langs.indexOf('en') >= 0 ? 'en' : incomingI18n.langs[0]);
            normalized.pdm_language = resolved;
        }
    }

    S._importConfigKeys(normalized);

    if (window.PDM && window.PDM.I18n &&
        typeof window.PDM.I18n.rehydrateUserBundleFromStorage === 'function') {
        window.PDM.I18n.rehydrateUserBundleFromStorage();
    }

    return { ok: true, format: 'pdm-config' };
};

S.exportProfile = S.exportConfig;

S.importProfile = function(data) {
    var result = S.importConfig(data);
    return result && result.ok;
};

S.importConfigZip = function(arrayBuffer, options) {
    options = options || {};
    var PB = window.PDM && window.PDM.ProfileBundle;
    if (!PB || typeof PB.loadFromZip !== 'function') {
        return Promise.resolve({
            ok: false,
            error: 'Module d\'import ZIP indisponible.',
            errors: ['Module d\'import ZIP indisponible.']
        });
    }

    if (options.filename &&
        window.PDM.ProfileSelector &&
        typeof window.PDM.ProfileSelector.isReservedImportName === 'function' &&
        window.PDM.ProfileSelector.isReservedImportName(options.filename)) {
        return Promise.resolve({
            ok: false,
            error: 'Import refusé : nom réservé à un profil officiel.',
            errors: ['Import refusé : nom réservé à un profil officiel.']
        });
    }

    var CS = window.PDM && window.PDM.ConfigSchema;
    var maxZip = (CS && CS.MAX_IMPORT_ZIP_BYTES) ? CS.MAX_IMPORT_ZIP_BYTES : (20 * 1024 * 1024);
    if (!arrayBuffer || arrayBuffer.byteLength > maxZip) {
        return Promise.resolve({
            ok: false,
            error: 'Archive ZIP trop volumineuse.',
            errors: ['Archive ZIP trop volumineuse.']
        });
    }

    var locale = S.getLanguage ? S.getLanguage() : 'fr';
    var PBI = window.PDM && window.PDM.ProfileBundleIntegrity;
    var expected = options.expectedChecksum || options.checksum_sha256 || null;

    var runImport = function() {
        return PB.loadFromZip(arrayBuffer, locale).then(function(bundle) {
        if (!bundle || !bundle.assembled) {
            return { ok: false, error: 'Archive profil invalide.', errors: ['Archive profil invalide.'] };
        }

        if (!CS) {
            return { ok: false, error: 'Module de validation indisponible.', errors: ['Module de validation indisponible.'] };
        }

        var normalized = CS.normalizeLegacyConfig(JSON.parse(JSON.stringify(bundle.assembled)));
        if (options.stripTokens !== false) {
            normalized.pdm_token_ollama = '';
            delete normalized.pdm_token_proxy;
        }

        var secRaw = CS.runImportSecurityChecks ? CS.runImportSecurityChecks(normalized) : { ok: true, errors: [] };
        if (!secRaw.ok) {
            return {
                ok: false,
                error: secRaw.errors.length === 1 ? secRaw.errors[0] : secRaw.errors.join('\n'),
                errors: secRaw.errors
            };
        }

        var validation = CS.validatePdmConfig(normalized);
        if (!validation.ok) {
            return {
                ok: false,
                error: validation.errors.length === 1
                    ? validation.errors[0]
                    : validation.errors.length + ' erreurs de validation',
                errors: validation.errors
            };
        }

        var incomingI18n = PB.extractI18nFromFileMap ? PB.extractI18nFromFileMap(bundle.rawFileMap) : null;
        var marketplace = PB.extractMarketplaceFromFileMap
            ? PB.extractMarketplaceFromFileMap(bundle.rawFileMap)
            : null;

        S.wipeAllUserData({ preserveCustomProfiles: true });

        if (incomingI18n) {
            if (!S.setI18nBundle(incomingI18n)) {
                return {
                    ok: false,
                    error: 'Impossible d\u2019enregistrer le dictionnaire UI import\u00e9 (stockage local plein ?).',
                    errors: ['Impossible d\u2019enregistrer le dictionnaire UI import\u00e9 (stockage local plein ?).']
                };
            }
        } else {
            S.clearI18nBundle();
        }

        var PBun = window.PDM && window.PDM.PromptsBundle;
        if (PBun && bundle.rawFileMap && bundle.promptsIndex &&
            typeof PBun.importFromFileMap === 'function') {
            var importProfileId = (bundle.manifest && bundle.manifest.id)
                || normalized.pdm_active_profile
                || S.getActiveProfile();
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
        }

        if (options.registerCustomProfile !== false &&
            window.PDM.ProfileSelector &&
            typeof window.PDM.ProfileSelector.registerImportedConfig === 'function') {
            var regOpts = Object.assign({}, options);
            if (bundle.manifest && bundle.manifest.label) {
                regOpts.exportLabel = String(bundle.manifest.label).trim();
            }
            if (marketplace && marketplace.synopsis_short) {
                regOpts.synopsis = marketplace.synopsis_short;
            }
            window.PDM.ProfileSelector.registerImportedConfig(normalized, regOpts);
        }

        if (incomingI18n && incomingI18n.langs.length) {
            var wantLang = String(normalized.pdm_language || S.get(S.KEYS.LANGUAGE) || 'fr').trim();
            if (incomingI18n.langs.indexOf(wantLang) < 0) {
                var resolved = incomingI18n.langs.indexOf('fr') >= 0 ? 'fr'
                    : (incomingI18n.langs.indexOf('en') >= 0 ? 'en' : incomingI18n.langs[0]);
                normalized.pdm_language = resolved;
            }
        }

        S._importConfigKeys(normalized);

        if (marketplace && marketplace.synopsis_short &&
            typeof S.setProfileSynopsis === 'function') {
            S.setProfileSynopsis(marketplace.synopsis_short);
            S.set('pdm_profile_synopsis_lang',
                String(S.getLanguage ? S.getLanguage() : locale).trim() || 'fr');
        }

        if (window.PDM && window.PDM.I18n &&
            typeof window.PDM.I18n.rehydrateUserBundleFromStorage === 'function') {
            window.PDM.I18n.rehydrateUserBundleFromStorage();
        }

        return { ok: true, format: 'pdm-profile-zip' };
    }).catch(function(err) {
        return {
            ok: false,
            error: err && err.message ? err.message : 'Import ZIP échoué.',
            errors: [err && err.message ? err.message : 'Import ZIP échoué.']
        };
    });
    };

    if (expected && PBI && typeof PBI.verifyZipChecksum === 'function') {
        return PBI.verifyZipChecksum(arrayBuffer, expected).then(function(vr) {
            if (!vr.ok) {
                var msg = vr.error || 'Checksum SHA-256 mismatch.';
                return { ok: false, error: msg, errors: [msg] };
            }
            return runImport();
        });
    }

    return runImport();
};

S.importConfigZipAsync = S.importConfigZip;

})();
