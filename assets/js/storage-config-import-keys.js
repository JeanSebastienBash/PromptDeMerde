/**
 * PromptDeMerde.com — storage-config-import-keys.js
 *
 * Synopsis : Application complète des clés pdm_* après validation import.
 * Objectif : Factoriser _importConfigKeys (workspace, STT/LLM, gen, chrome).
 */
(function () {

var S = window.PDM && window.PDM.Storage;
if (!S) { console.warn('[storage-config-import-keys] PDM.Storage missing'); return; }

S._importConfigKeysCore = function (data) {
    S.set(S.KEYS.PROVIDER, data[S.KEYS.PROVIDER]);
    S.set(S.KEYS.MODEL, data[S.KEYS.MODEL]);
    if (typeof S.setImageModel === 'function') {
        S.setImageModel(data[S.KEYS.IMAGE_MODEL]);
    } else {
        S.set(S.KEYS.IMAGE_MODEL, data[S.KEYS.IMAGE_MODEL] || '');
    }
    S.set(S.KEYS.IMAGE_PROMPT, data[S.KEYS.IMAGE_PROMPT] ||
        (S.getImagePromptEffective ? S.getImagePromptEffective() : ''));
    S.set(S.KEYS.SYSTEM_PROMPT, data[S.KEYS.SYSTEM_PROMPT] != null
        ? String(data[S.KEYS.SYSTEM_PROMPT]) : '');
    S.setSystemPromptEnabled(data[S.KEYS.SYSTEM_PROMPT_ENABLED]);
    S.setProfiles(data[S.KEYS.PROFILES].slice());
    S.set(S.KEYS.LANGUAGE, data[S.KEYS.LANGUAGE]);
    var rawTheme = data[S.KEYS.THEME];
    if (window.PDM && window.PDM.Themes && window.PDM.Themes.migrateThemeId) {
        rawTheme = window.PDM.Themes.migrateThemeId(rawTheme);
    }
    S.set(S.KEYS.THEME, rawTheme);
    S.setCleanHistory((data[S.KEYS.CLEAN_HISTORY] || []).slice());
};

S._importConfigKeysWorkspace = function (data) {
    var wsIn = data[S.KEYS.WORKSPACE] || {};
    S.set(S.KEYS.WORKSPACE, {
        input: String(wsIn.input != null ? wsIn.input : ''),
        output: String(wsIn.output != null ? wsIn.output : ''),
        thinking: String(wsIn.thinking != null ? wsIn.thinking : ''),
        savedAt: wsIn.savedAt,
        contextPanelOpen: wsIn.contextPanelOpen === true,
        inputSource: ['audio-file', 'audio-dictation', 'image-file'].indexOf(wsIn.inputSource) >= 0
            ? wsIn.inputSource : 'manual',
        audioFileName: wsIn.audioFileName != null ? String(wsIn.audioFileName) : null,
        audioFileSize: wsIn.audioFileSize != null ? wsIn.audioFileSize : null,
        audioMimeType: wsIn.audioMimeType != null ? String(wsIn.audioMimeType) : null,
        audioLastModified: wsIn.audioLastModified != null ? wsIn.audioLastModified : null,
        audioRef: wsIn.audioRef != null ? String(wsIn.audioRef) : null,
        audioSegmentCount: wsIn.audioSegmentCount != null ? wsIn.audioSegmentCount : null,
        compressIncludeSystem: wsIn.compressIncludeSystem === true,
        compressIncludeContexts: wsIn.compressIncludeContexts === true,
        compressIncludeInput: wsIn.compressIncludeInput === true,
        compressIncludeOutput: wsIn.compressIncludeOutput === true
    });
};

S._importConfigKeysStt = function (data) {
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
};

S._importConfigKeysLlm = function (data) {
    S.setOllamaUrl(data[S.KEYS.OLLAMA_URL]);
    S.setLlmThinkingEnabled(data[S.KEYS.LLM_THINKING_ENABLED]);
    S.setLlmThinkingMaxChars(data[S.KEYS.LLM_THINKING_MAX_CHARS]);
    if (data[S.KEYS.LLM_TEMPERATURE] !== undefined) {
        S.setLlmTemperature(data[S.KEYS.LLM_TEMPERATURE]);
    }
    if (data[S.KEYS.LLM_MAX_TOKENS] !== undefined) {
        S.setLlmMaxTokens(data[S.KEYS.LLM_MAX_TOKENS]);
    }
    if (data[S.KEYS.LLM_INPUT_CHAR_BUDGET] !== undefined) {
        S.setLlmInputCharBudget(data[S.KEYS.LLM_INPUT_CHAR_BUDGET]);
    }
    if (data[S.KEYS.LLM_TIMEOUT_SEC] !== undefined) {
        S.setLlmTimeoutSec(data[S.KEYS.LLM_TIMEOUT_SEC]);
    }
    S.setToken('ollama', data[S.KEYS.TOKEN_OLLAMA]);
};

S._importConfigKeysGen = function (data) {
    S.setContextGenSystem(data[S.KEYS.CONTEXT_GEN_SYSTEM] || S.getContextGenSystemEffective());
    S.setContextGenUserIntent(data[S.KEYS.CONTEXT_GEN_USER_INTENT] ||
        S.getContextGenUserIntentEffective());
    S.setContextGenUserTitle(data[S.KEYS.CONTEXT_GEN_USER_TITLE] ||
        S.getContextGenUserTitleEffective());
    S.setContextInjectHeader(data[S.KEYS.CONTEXT_INJECT_HEADER] ||
        S.getContextInjectHeaderEffective());
    S.setContextGenTagIntentSuffix(data[S.KEYS.CONTEXT_GEN_TAG_INTENT_SUFFIX] ||
        S.getContextGenTagIntentSuffixEffective());
    S.setContextGenForcedTagSystemSuffix(data[S.KEYS.CONTEXT_GEN_FORCED_TAG_SYSTEM_SUFFIX] ||
        S.getContextGenForcedTagSystemSuffixEffective());
    S.setContextGenRetrySystemSuffix(data[S.KEYS.CONTEXT_GEN_RETRY_SYSTEM_SUFFIX] ||
        S.getContextGenRetrySystemSuffixEffective());
    S.setContextGenRetryUserSuffix(data[S.KEYS.CONTEXT_GEN_RETRY_USER_SUFFIX] ||
        S.getContextGenRetryUserSuffixEffective());
    S.setContextGenMaxTokens(data[S.KEYS.CONTEXT_GEN_MAX_TOKENS]);
    S.setContextGenTemperature(data[S.KEYS.CONTEXT_GEN_TEMPERATURE]);
    S.setContextGenRetryTemperature(data[S.KEYS.CONTEXT_GEN_RETRY_TEMPERATURE]);
    S.setContextGenMaxRetries(data[S.KEYS.CONTEXT_GEN_MAX_RETRIES]);
    S.setContextGenJsonSchema(data[S.KEYS.CONTEXT_GEN_JSON_SCHEMA] ||
        S.getContextGenJsonSchemaEffective());
};

S._importConfigKeysChrome = function (data) {
    var CS = window.PDM && window.PDM.ConfigSchema;
    var defaultProfile = (CS && typeof CS.resolveDefaultActiveProfile === 'function')
        ? CS.resolveDefaultActiveProfile()
        : (data[S.KEYS.ACTIVE_PROFILE] || '');
    S.setActiveProfile(data[S.KEYS.ACTIVE_PROFILE] || defaultProfile);
    S.setProject(data[S.KEYS.PROJECT] || S.getProjectEffective());
    S.setContextProfileLineTemplate(data[S.KEYS.CONTEXT_PROFILE_LINE_TEMPLATE] ||
        S.getContextProfileLineTemplateEffective());
    S.setWorkspaceUi(data[S.KEYS.WORKSPACE_UI] || S.getWorkspaceUiEffective());
};

S._importConfigKeys = function (data) {
    S._importConfigKeysCore(data);
    S._importConfigKeysWorkspace(data);
    S._importConfigKeysStt(data);
    S._importConfigKeysLlm(data);
    S._importConfigKeysGen(data);
    S._importConfigKeysChrome(data);
    S.setProfileBundleFingerprint(S.computeProfileBundleFingerprint(data));
};

})();
