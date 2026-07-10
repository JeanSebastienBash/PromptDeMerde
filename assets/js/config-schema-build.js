/**
 * PromptDeMerde.com — config-schema-build.js
 *
 * Synopsis : Normalisation legacy et construction de la config pdm-config par défaut.
 * Objectif : Étendre PDM.ConfigSchema avec normalizeLegacyConfig, mergeMissingPdmKeys et buildDefaultConfig.
 */
(function() {

var CS = window.PDM && window.PDM.ConfigSchema;
if (!CS) { console.warn('[config-schema-build] PDM.ConfigSchema not found.'); return; }

CS.normalizeLegacyConfig = function(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return data;
    var copy = JSON.parse(JSON.stringify(data));

    if (copy.type === 'system-prompt' || copy.type === 'prompts') {
        return copy;
    }

    if (!copy.type && copy.version && copy.pdm_provider !== undefined) {
        copy.type = CS.CONFIG_TYPE;
    }

    if (copy.pdm_ollama_url === undefined && copy.pdm_endpoint !== undefined) {
        copy.pdm_ollama_url = copy.pdm_endpoint;
    }
    delete copy.pdm_endpoint;

    if (copy.pdm_token_ollama === undefined && copy.tokens && typeof copy.tokens === 'object') {
        copy.pdm_token_ollama = copy.tokens.ollama != null ? String(copy.tokens.ollama) : '';
    }
    delete copy.tokens;

    delete copy.pdm_stt_model;
    delete copy.pdm_version;

    if (copy.pdm_llm_thinking_max_chars === undefined) {
        if (copy.pdm_llm_thinking_max_tokens !== undefined) {
            copy.pdm_llm_thinking_max_chars = copy.pdm_llm_thinking_max_tokens;
        } else {
            copy.pdm_llm_thinking_max_chars = 5000;
        }
    }
    delete copy.pdm_llm_thinking_max_tokens;

    if (Array.isArray(copy.pdm_clean_history)) {
        copy.pdm_clean_history = copy.pdm_clean_history.map(function(entry) {
            if (!entry || typeof entry !== 'object') return entry;
            var next = Object.assign({}, entry);
            if (next.thinking == null) next.thinking = '';
            else next.thinking = String(next.thinking);
            var audio = CS.normalizeAudioMeta(next);
            next.inputSource = audio.inputSource;
            next.audioFileName = audio.audioFileName;
            next.audioFileSize = audio.audioFileSize;
            next.audioMimeType = audio.audioMimeType;
            next.audioLastModified = audio.audioLastModified;
            next.audioRef = audio.audioRef;
            return next;
        });
    }

    if (CS.isPlainObject(copy.pdm_workspace) && copy.pdm_workspace.contextPanelOpen === undefined) {
        copy.pdm_workspace.contextPanelOpen = true;
    }

    if (copy.pdm_context_gen_system === undefined || !String(copy.pdm_context_gen_system).trim()) {
        copy.pdm_context_gen_system = CS.DEFAULT_CONTEXT_GEN_SYSTEM;
    }
    if (copy.pdm_context_gen_user_intent === undefined || !String(copy.pdm_context_gen_user_intent).trim()) {
        copy.pdm_context_gen_user_intent = CS.DEFAULT_CONTEXT_GEN_USER_INTENT;
    }
    if (copy.pdm_context_gen_user_title === undefined || !String(copy.pdm_context_gen_user_title).trim()) {
        copy.pdm_context_gen_user_title = CS.DEFAULT_CONTEXT_GEN_USER_TITLE;
    }
    if (copy.pdm_system_prompt === undefined || !String(copy.pdm_system_prompt).trim()) {
        copy.pdm_system_prompt = CS.DEFAULT_SYSTEM_PROMPT;
    }
    if (copy.pdm_context_inject_header === undefined || !String(copy.pdm_context_inject_header).trim()) {
        copy.pdm_context_inject_header = CS.DEFAULT_CONTEXT_INJECT_HEADER;
    }
    if (copy.pdm_context_gen_tag_intent_suffix === undefined || !String(copy.pdm_context_gen_tag_intent_suffix).trim()) {
        copy.pdm_context_gen_tag_intent_suffix = CS.DEFAULT_CONTEXT_GEN_TAG_INTENT_SUFFIX;
    }
    if (copy.pdm_context_gen_forced_tag_system_suffix === undefined || !String(copy.pdm_context_gen_forced_tag_system_suffix).trim()) {
        copy.pdm_context_gen_forced_tag_system_suffix = CS.DEFAULT_CONTEXT_GEN_FORCED_TAG_SYSTEM_SUFFIX;
    }
    if (copy.pdm_context_gen_retry_system_suffix === undefined || !String(copy.pdm_context_gen_retry_system_suffix).trim()) {
        copy.pdm_context_gen_retry_system_suffix = CS.DEFAULT_CONTEXT_GEN_RETRY_SYSTEM_SUFFIX;
    }
    if (copy.pdm_context_gen_retry_user_suffix === undefined || !String(copy.pdm_context_gen_retry_user_suffix).trim()) {
        copy.pdm_context_gen_retry_user_suffix = CS.DEFAULT_CONTEXT_GEN_RETRY_USER_SUFFIX;
    }
    if (copy.pdm_active_profile === undefined) {
        copy.pdm_active_profile = CS.DEFAULT_ACTIVE_PROFILE;
    }
    if (copy.pdm_project === undefined) {
        copy.pdm_project = CS.buildDefaultProject();
    } else {
        copy.pdm_project = CS.normalizeProject(copy.pdm_project);
    }
    if (CS.isPlainObject(copy.pdm_workspace)) {
        var wsAudio = CS.normalizeAudioMeta(copy.pdm_workspace);
        copy.pdm_workspace.inputSource = wsAudio.inputSource;
        copy.pdm_workspace.audioFileName = wsAudio.audioFileName;
        copy.pdm_workspace.audioFileSize = wsAudio.audioFileSize;
        copy.pdm_workspace.audioMimeType = wsAudio.audioMimeType;
        copy.pdm_workspace.audioLastModified = wsAudio.audioLastModified;
        copy.pdm_workspace.audioRef = wsAudio.audioRef;
    }

    if (copy.pdm_context_profile_line_template === undefined || !String(copy.pdm_context_profile_line_template).trim()) {
        copy.pdm_context_profile_line_template = CS.DEFAULT_CONTEXT_PROFILE_LINE_TEMPLATE;
    }
    if (copy.pdm_context_gen_max_tokens === undefined) {
        copy.pdm_context_gen_max_tokens = CS.DEFAULT_CONTEXT_GEN_MAX_TOKENS;
    }
    if (copy.pdm_context_gen_temperature === undefined) {
        copy.pdm_context_gen_temperature = CS.DEFAULT_CONTEXT_GEN_TEMPERATURE;
    }
    if (copy.pdm_context_gen_retry_temperature === undefined) {
        copy.pdm_context_gen_retry_temperature = CS.DEFAULT_CONTEXT_GEN_RETRY_TEMPERATURE;
    }
    if (copy.pdm_context_gen_max_retries === undefined) {
        copy.pdm_context_gen_max_retries = CS.DEFAULT_CONTEXT_GEN_MAX_RETRIES;
    }
    if (!CS.isPlainObject(copy.pdm_context_gen_json_schema)) {
        copy.pdm_context_gen_json_schema = JSON.parse(JSON.stringify(CS.DEFAULT_CONTEXT_GEN_JSON_SCHEMA));
    }

    if (!CS.isPlainObject(copy.pdm_audio_blobs)) {
        copy.pdm_audio_blobs = {};
    }

    if (copy.pdm_workspace_ui !== undefined) {
        copy.pdm_workspace_ui = CS.normalizeWorkspaceUi(copy.pdm_workspace_ui);
    }

    return CS.mergeMissingPdmKeys(copy);
};

CS.mergeMissingPdmKeys = function(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return data;
    var defaults = CS.buildDefaultConfig();
    for (var i = 0; i < CS.PDM_KEYS.length; i++) {
        var k = CS.PDM_KEYS[i];
        if (data[k] === undefined) {
            data[k] = JSON.parse(JSON.stringify(defaults[k]));
        }
    }
    if (data.pdm_workspace_ui) {
        data.pdm_workspace_ui = CS.normalizeWorkspaceUi(data.pdm_workspace_ui);
    }
    return data;
};

CS.buildDefaultConfig = function() {
    var history = [];
    return {
        version: CS.VERSION,
        type: CS.CONFIG_TYPE,
        exportedAt: new Date().toISOString(),
        pdm_provider: CS.getDefaultProvider(),
        pdm_model: '',
        pdm_system_prompt: CS.DEFAULT_SYSTEM_PROMPT,
        pdm_system_prompt_enabled: true,
        pdm_profiles: JSON.parse(JSON.stringify(CS.DEFAULT_PROFILES)),
        pdm_language: 'fr',
        pdm_theme: CS.defaultThemeId(),
        pdm_history_count: 0,
        pdm_clean_history: history,
        pdm_workspace: Object.assign({
            input: '', output: '', thinking: '', savedAt: null, contextPanelOpen: true
        }, CS.emptyAudioMeta()),
        pdm_stt_device_id: '',
        pdm_stt_engine: 'vosk-maxi',
        pdm_stt_compute: 'cpu',
        pdm_context_position: 'after_system',
        pdm_ollama_url: 'http://localhost:11434',
        pdm_llm_thinking_enabled: false,
        pdm_llm_thinking_max_chars: 5000,
        pdm_token_ollama: '',
        pdm_context_gen_system: CS.DEFAULT_CONTEXT_GEN_SYSTEM,
        pdm_context_gen_user_intent: CS.DEFAULT_CONTEXT_GEN_USER_INTENT,
        pdm_context_gen_user_title: CS.DEFAULT_CONTEXT_GEN_USER_TITLE,
        pdm_context_inject_header: CS.DEFAULT_CONTEXT_INJECT_HEADER,
        pdm_context_gen_tag_intent_suffix: CS.DEFAULT_CONTEXT_GEN_TAG_INTENT_SUFFIX,
        pdm_context_gen_forced_tag_system_suffix: CS.DEFAULT_CONTEXT_GEN_FORCED_TAG_SYSTEM_SUFFIX,
        pdm_context_gen_retry_system_suffix: CS.DEFAULT_CONTEXT_GEN_RETRY_SYSTEM_SUFFIX,
        pdm_context_gen_retry_user_suffix: CS.DEFAULT_CONTEXT_GEN_RETRY_USER_SUFFIX,
        pdm_active_profile: CS.DEFAULT_ACTIVE_PROFILE,
        pdm_project: CS.buildDefaultProject(),
        pdm_context_profile_line_template: CS.DEFAULT_CONTEXT_PROFILE_LINE_TEMPLATE,
        pdm_context_gen_max_tokens: CS.DEFAULT_CONTEXT_GEN_MAX_TOKENS,
        pdm_context_gen_temperature: CS.DEFAULT_CONTEXT_GEN_TEMPERATURE,
        pdm_context_gen_retry_temperature: CS.DEFAULT_CONTEXT_GEN_RETRY_TEMPERATURE,
        pdm_context_gen_max_retries: CS.DEFAULT_CONTEXT_GEN_MAX_RETRIES,
        pdm_context_gen_json_schema: JSON.parse(JSON.stringify(CS.DEFAULT_CONTEXT_GEN_JSON_SCHEMA)),
        pdm_audio_blobs: {},
        pdm_workspace_ui: CS.buildDefaultWorkspaceUi()
    };
};

})();
