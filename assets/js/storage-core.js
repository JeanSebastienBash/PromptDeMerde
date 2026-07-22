/**
 * PromptDeMerde.com — storage-core.js
 *
 * Synopsis : Primitives localStorage et constantes de clés pdm_*.
 * Objectif : Créer PDM.Storage avec read/write/get/set et gestion d'erreurs.
 */
(function(){

var S = {};

S.KEYS = {
    PROVIDER: 'pdm_provider',
    MODEL: 'pdm_model',
    IMAGE_MODEL: 'pdm_image_model',
    IMAGE_PROMPT: 'pdm_image_prompt',
    SYSTEM_PROMPT: 'pdm_system_prompt',
    SYSTEM_PROMPT_ENABLED: 'pdm_system_prompt_enabled',
    PROFILES: 'pdm_profiles',
    LANGUAGE: 'pdm_language',
    HISTORY: 'pdm_history_count',
    CLEAN_HISTORY: 'pdm_clean_history',
    WORKSPACE: 'pdm_workspace',
    STT_DEVICE_ID: 'pdm_stt_device_id',
    STT_ENGINE: 'pdm_stt_engine',
    STT_COMPUTE: 'pdm_stt_compute',
    STT_INSERT_AT_CURSOR: 'pdm_stt_insert_at_cursor',
    STT_DELETE_WORD_ENABLED: 'pdm_stt_delete_word_enabled',
    STT_DELETE_WORD_SHORTCUT: 'pdm_stt_delete_word_shortcut',
    STT_DELETE_WORD_TARGET: 'pdm_stt_delete_word_target',
    STT_VOSK_LANG: 'pdm_stt_vosk_lang',
    THEME: 'pdm_theme',
    OLLAMA_URL: 'pdm_ollama_url',
    CONTEXT_POSITION: 'pdm_context_position',
    LLM_THINKING_ENABLED: 'pdm_llm_thinking_enabled',
    LLM_THINKING_MAX_CHARS: 'pdm_llm_thinking_max_chars',
    LLM_TEMPERATURE: 'pdm_llm_temperature',
    LLM_MAX_TOKENS: 'pdm_llm_max_tokens',
    LLM_INPUT_CHAR_BUDGET: 'pdm_llm_input_char_budget',
    LLM_TIMEOUT_SEC: 'pdm_llm_timeout_sec',
    TOKEN_OLLAMA: 'pdm_token_ollama',
    TOKEN_PROXY: 'pdm_token_proxy',

    LLM_DIRECT_LOCAL: 'pdm_llm_direct_local',

    LLM_DIRECT_LOCAL_PREF: 'pdm_llm_direct_local_pref',
    CONTEXT_GEN_SYSTEM: 'pdm_context_gen_system',
    CONTEXT_GEN_USER_INTENT: 'pdm_context_gen_user_intent',
    CONTEXT_GEN_USER_TITLE: 'pdm_context_gen_user_title',
    CONTEXT_INJECT_HEADER: 'pdm_context_inject_header',
    CONTEXT_GEN_TAG_INTENT_SUFFIX: 'pdm_context_gen_tag_intent_suffix',
    CONTEXT_GEN_FORCED_TAG_SYSTEM_SUFFIX: 'pdm_context_gen_forced_tag_system_suffix',
    CONTEXT_GEN_RETRY_SYSTEM_SUFFIX: 'pdm_context_gen_retry_system_suffix',
    CONTEXT_GEN_RETRY_USER_SUFFIX: 'pdm_context_gen_retry_user_suffix',
    ACTIVE_PROFILE: 'pdm_active_profile',
    PROJECT: 'pdm_project',
    CONTEXT_PROFILE_LINE_TEMPLATE: 'pdm_context_profile_line_template',
    CONTEXT_GEN_MAX_TOKENS: 'pdm_context_gen_max_tokens',
    CONTEXT_GEN_TEMPERATURE: 'pdm_context_gen_temperature',
    CONTEXT_GEN_RETRY_TEMPERATURE: 'pdm_context_gen_retry_temperature',
    CONTEXT_GEN_MAX_RETRIES: 'pdm_context_gen_max_retries',
    CONTEXT_GEN_JSON_SCHEMA: 'pdm_context_gen_json_schema',
    OUTPUT_JSON_ENABLED: 'pdm_output_json_enabled',
    OUTPUT_JSON_SCHEMA: 'pdm_output_json_schema',
    OUTPUT_JSON_KEY_PATTERN: 'pdm_output_json_key_pattern',
    OUTPUT_JSON_VALUE_SCHEMA: 'pdm_output_json_value_schema',
    OUTPUT_DISPLAY_FORMAT: 'pdm_output_display_format',
    WORKSPACE_UI: 'pdm_workspace_ui',
    CUSTOM_PROFILES: 'pdm_custom_profiles'
};

S.LEGACY_KEYS = ['pdm_badge', 'pdm_tier', 'pdm_badge_expires'];
S.I18N_BUNDLE_KEY = 'pdm_i18n_bundle';
S.EXTRA_KEYS = ['_pending', 'pdm_profile_bundle_fp', 'pdm_profile_synopsis', 'pdm_profile_synopsis_lang'];
var _schemaVersion = window.PDM && window.PDM.ConfigSchema && window.PDM.ConfigSchema.VERSION;
S.VERSION = _schemaVersion ? String(_schemaVersion) : '1.24.1';
S.MAX_CLEAN_HISTORY = 100;
S._LEGACY_IMAGE_KEYS = ['pdm_image_history', 'pdm_image_options', 'pdm_image_ollama_config', 'pdm_workspace_mode'];
S._LEGACY_CONFIG_KEYS = ['pdm_endpoint', 'pdm_stt_model', 'pdm_version'];
S.MAX_PROFILES = 999;
S.DEFAULT_LLM_THINKING_MAX_CHARS = 5000; // 1er install seulement (null) — 0 stocké = illimité
S.MAX_LLM_THINKING_MAX_CHARS = 100000;
S.DEFAULT_LLM_TEMPERATURE_MANUAL = 0.8;
S.DEFAULT_LLM_MAX_TOKENS_MANUAL = 2048;
S.MAX_LLM_MAX_TOKENS = 32768;
S.DEFAULT_LLM_INPUT_CHAR_BUDGET = 10000;
S.MAX_LLM_INPUT_CHAR_BUDGET = 100000;
S.DEFAULT_LLM_TIMEOUT_SEC = 1000; // 1er install seulement — 0 stocké = illimité
S.MIN_LLM_TIMEOUT_SEC = 0; // 0 = illimité
S.MAX_LLM_TIMEOUT_SEC = 86400; // 24 h
S._CONFIG_PROVIDERS = ['ollama'];
S._PDM_PREFIX = 'pdm_';
S._DEV_PREFIX = 'pdm_dev_snap_';

S._CONFIG_KEYS = [
    S.KEYS.PROVIDER, S.KEYS.MODEL, S.KEYS.IMAGE_MODEL, S.KEYS.IMAGE_PROMPT,
    S.KEYS.SYSTEM_PROMPT, S.KEYS.SYSTEM_PROMPT_ENABLED,
    S.KEYS.PROFILES, S.KEYS.LANGUAGE, S.KEYS.THEME,
    S.KEYS.HISTORY, S.KEYS.CLEAN_HISTORY, S.KEYS.WORKSPACE,
    S.KEYS.STT_DEVICE_ID, S.KEYS.STT_ENGINE, S.KEYS.STT_COMPUTE, S.KEYS.STT_INSERT_AT_CURSOR,
    S.KEYS.STT_DELETE_WORD_ENABLED, S.KEYS.STT_DELETE_WORD_SHORTCUT, S.KEYS.STT_DELETE_WORD_TARGET,
    S.KEYS.CONTEXT_POSITION, S.KEYS.OLLAMA_URL, S.KEYS.LLM_THINKING_ENABLED,
    S.KEYS.LLM_THINKING_MAX_CHARS, S.KEYS.LLM_TEMPERATURE, S.KEYS.LLM_MAX_TOKENS,
    S.KEYS.LLM_INPUT_CHAR_BUDGET, S.KEYS.LLM_TIMEOUT_SEC,
    S.KEYS.TOKEN_OLLAMA,
    S.KEYS.CONTEXT_GEN_SYSTEM,
    S.KEYS.CONTEXT_GEN_USER_INTENT,
    S.KEYS.CONTEXT_GEN_USER_TITLE,
    S.KEYS.CONTEXT_INJECT_HEADER,
    S.KEYS.CONTEXT_GEN_TAG_INTENT_SUFFIX,
    S.KEYS.CONTEXT_GEN_FORCED_TAG_SYSTEM_SUFFIX,
    S.KEYS.CONTEXT_GEN_RETRY_SYSTEM_SUFFIX,
    S.KEYS.CONTEXT_GEN_RETRY_USER_SUFFIX,
    S.KEYS.ACTIVE_PROFILE,
    S.KEYS.PROJECT,
    S.KEYS.CONTEXT_PROFILE_LINE_TEMPLATE,
    S.KEYS.CONTEXT_GEN_MAX_TOKENS,
    S.KEYS.CONTEXT_GEN_TEMPERATURE,
    S.KEYS.CONTEXT_GEN_RETRY_TEMPERATURE,
    S.KEYS.CONTEXT_GEN_MAX_RETRIES,
    S.KEYS.CONTEXT_GEN_JSON_SCHEMA,
    S.KEYS.WORKSPACE_UI
];

function read(k) {
    try {
        var v = localStorage.getItem(k);
        if (v === null || v === 'undefined') return null;
        try { return JSON.parse(v); } catch(e) { return v; }
    } catch(e) { return null; }
}

function write(k, v) {
    try {
        var val = (typeof v === 'string') ? v : JSON.stringify(v);
        localStorage.setItem(k, val);
        return { ok: true };
    } catch(e) {
        var msg = (e && e.name === 'QuotaExceededError')
            ? 'Espace localStorage insuffisant.'
            : ((e && e.message) ? e.message : 'Erreur de stockage');
        return { ok: false, error: msg };
    }
}

function del(k) {
    try { localStorage.removeItem(k); } catch(e) {}
}

function delFromStore(store, k) {
    try { store.removeItem(k); } catch(e) {}
}

S.get = read;
S.set = function(k, v) {
    var r = write(k, v);
    if (!r.ok && S.onStorageError) S.onStorageError(r.error, k);
    return r.ok;
};
S.remove = del;
S.onStorageError = null;

window.PDM = window.PDM || {};
window.PDM.Storage = S;

})();
