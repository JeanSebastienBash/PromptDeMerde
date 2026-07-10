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

/** Applique le bundle profil (prompts, contextes, thème, UI) sans effacer workspace ni historique. */
S.applyProfileBundle = function(config) {
    if (!config || typeof config !== 'object') return false;

    if (config[S.KEYS.SYSTEM_PROMPT]) {
        S.set(S.KEYS.SYSTEM_PROMPT, config[S.KEYS.SYSTEM_PROMPT]);
    }
    if (config[S.KEYS.SYSTEM_PROMPT_ENABLED] !== undefined) {
        S.setSystemPromptEnabled(config[S.KEYS.SYSTEM_PROMPT_ENABLED]);
    }
    if (Array.isArray(config[S.KEYS.PROFILES])) {
        S.setProfiles(config[S.KEYS.PROFILES].slice());
    }
    if (config[S.KEYS.THEME]) {
        S.set(S.KEYS.THEME, config[S.KEYS.THEME]);
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
    if (config[S.KEYS.LANGUAGE]) {
        S.set(S.KEYS.LANGUAGE, config[S.KEYS.LANGUAGE]);
    }
    if (config[S.KEYS.WORKSPACE_UI]) {
        S.setWorkspaceUi(config[S.KEYS.WORKSPACE_UI]);
    }
    if (config[S.KEYS.ACTIVE_PROFILE]) {
        S.setActiveProfile(config[S.KEYS.ACTIVE_PROFILE]);
    }

    S.setProfileBundleFingerprint(S.computeProfileBundleFingerprint(config));
    return true;
};

S._importConfigKeys = function(data) {
    S.set(S.KEYS.PROVIDER, data[S.KEYS.PROVIDER]);
    S.set(S.KEYS.MODEL, data[S.KEYS.MODEL]);
    S.set(S.KEYS.SYSTEM_PROMPT, data[S.KEYS.SYSTEM_PROMPT] || S.getSystemPromptEffective());
    S.setSystemPromptEnabled(data[S.KEYS.SYSTEM_PROMPT_ENABLED]);
    S.setProfiles(data[S.KEYS.PROFILES].slice());
    S.set(S.KEYS.LANGUAGE, data[S.KEYS.LANGUAGE]);
    S.set(S.KEYS.THEME, data[S.KEYS.THEME]);
    S.setCleanHistory((data[S.KEYS.CLEAN_HISTORY] || []).slice());
    var wsIn = data[S.KEYS.WORKSPACE] || {};
    S.set(S.KEYS.WORKSPACE, {
        input: String(wsIn.input != null ? wsIn.input : ''),
        output: String(wsIn.output != null ? wsIn.output : ''),
        thinking: String(wsIn.thinking != null ? wsIn.thinking : ''),
        savedAt: wsIn.savedAt,
        contextPanelOpen: wsIn.contextPanelOpen !== false,
        inputSource: ['audio-file', 'audio-dictation'].indexOf(wsIn.inputSource) >= 0 ? wsIn.inputSource : 'manual',
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
    S.setContextPosition(data[S.KEYS.CONTEXT_POSITION]);
    S.setOllamaUrl(data[S.KEYS.OLLAMA_URL]);
    S.setLlmThinkingEnabled(data[S.KEYS.LLM_THINKING_ENABLED]);
    S.setLlmThinkingMaxChars(data[S.KEYS.LLM_THINKING_MAX_CHARS]);
    S.setToken('ollama', data[S.KEYS.TOKEN_OLLAMA]);
    S.setContextGenSystem(data[S.KEYS.CONTEXT_GEN_SYSTEM] || S.getContextGenSystemEffective());
    S.setContextGenUserIntent(data[S.KEYS.CONTEXT_GEN_USER_INTENT] || S.getContextGenUserIntentEffective());
    S.setContextGenUserTitle(data[S.KEYS.CONTEXT_GEN_USER_TITLE] || S.getContextGenUserTitleEffective());
    S.setContextInjectHeader(data[S.KEYS.CONTEXT_INJECT_HEADER] || S.getContextInjectHeaderEffective());
    S.setContextGenTagIntentSuffix(data[S.KEYS.CONTEXT_GEN_TAG_INTENT_SUFFIX] || S.getContextGenTagIntentSuffixEffective());
    S.setContextGenForcedTagSystemSuffix(data[S.KEYS.CONTEXT_GEN_FORCED_TAG_SYSTEM_SUFFIX] || S.getContextGenForcedTagSystemSuffixEffective());
    S.setContextGenRetrySystemSuffix(data[S.KEYS.CONTEXT_GEN_RETRY_SYSTEM_SUFFIX] || S.getContextGenRetrySystemSuffixEffective());
    S.setContextGenRetryUserSuffix(data[S.KEYS.CONTEXT_GEN_RETRY_USER_SUFFIX] || S.getContextGenRetryUserSuffixEffective());
    S.setActiveProfile(data[S.KEYS.ACTIVE_PROFILE] || 'speech2texte');
    S.setContextProfileLineTemplate(data[S.KEYS.CONTEXT_PROFILE_LINE_TEMPLATE] || S.getContextProfileLineTemplateEffective());
    S.setContextGenMaxTokens(data[S.KEYS.CONTEXT_GEN_MAX_TOKENS]);
    S.setContextGenTemperature(data[S.KEYS.CONTEXT_GEN_TEMPERATURE]);
    S.setContextGenRetryTemperature(data[S.KEYS.CONTEXT_GEN_RETRY_TEMPERATURE]);
    S.setContextGenMaxRetries(data[S.KEYS.CONTEXT_GEN_MAX_RETRIES]);
    S.setContextGenJsonSchema(data[S.KEYS.CONTEXT_GEN_JSON_SCHEMA] || S.getContextGenJsonSchemaEffective());
    S.setWorkspaceUi(data[S.KEYS.WORKSPACE_UI] || S.getWorkspaceUiEffective());
    S.setProfileBundleFingerprint(S.computeProfileBundleFingerprint(data));

    // pdm_audio_blobs sera traité par importConfigAsync si présent
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

    S.wipeAllUserData();
    S._importConfigKeys(normalized);
    if (options.registerCustomProfile !== false &&
        window.PDM.ProfileSelector &&
        typeof window.PDM.ProfileSelector.registerImportedConfig === 'function') {
        window.PDM.ProfileSelector.registerImportedConfig(normalized, options);
    }
    return { ok: true, format: 'pdm-config' };
};

S.exportProfile = S.exportConfig;

S.importProfile = function(data) {
    var result = S.importConfig(data);
    return result && result.ok;
};

})();
