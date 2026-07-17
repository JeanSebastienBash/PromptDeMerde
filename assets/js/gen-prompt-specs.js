/**
 * PromptDeMerde.com — gen-prompt-specs.js
 *
 * Source unique : liste des 9 prompts LLM de génération de contextes
 * (id, clé session pdm_context_gen_*, fichier MD gen-prompts/{locale}/).
 */
(function() {

window.PDM = window.PDM || {};

var SPECS = [
    { id: 'context_gen_system', storageKey: 'pdm_context_gen_system', fileName: 'context-gen-system.md' },
    { id: 'context_gen_user_intent', storageKey: 'pdm_context_gen_user_intent', fileName: 'context-gen-user-intent.md' },
    { id: 'context_gen_user_title', storageKey: 'pdm_context_gen_user_title', fileName: 'context-gen-user-title.md' },
    { id: 'context_inject_header', storageKey: 'pdm_context_inject_header', fileName: 'context-inject-header.md' },
    { id: 'context_gen_tag_intent_suffix', storageKey: 'pdm_context_gen_tag_intent_suffix', fileName: 'context-gen-tag-intent-suffix.md' },
    { id: 'context_gen_forced_tag_system_suffix', storageKey: 'pdm_context_gen_forced_tag_system_suffix', fileName: 'context-gen-forced-tag-system-suffix.md' },
    { id: 'context_gen_retry_system_suffix', storageKey: 'pdm_context_gen_retry_system_suffix', fileName: 'context-gen-retry-system-suffix.md' },
    { id: 'context_gen_retry_user_suffix', storageKey: 'pdm_context_gen_retry_user_suffix', fileName: 'context-gen-retry-user-suffix.md' },
    { id: 'context_profile_line_template', storageKey: 'pdm_context_profile_line_template', fileName: 'context-profile-line-template.md' }
];

var STORAGE_GETTERS = {
    pdm_context_gen_system: 'getContextGenSystemEffective',
    pdm_context_gen_user_intent: 'getContextGenUserIntentEffective',
    pdm_context_gen_user_title: 'getContextGenUserTitleEffective',
    pdm_context_inject_header: 'getContextInjectHeaderEffective',
    pdm_context_gen_tag_intent_suffix: 'getContextGenTagIntentSuffixEffective',
    pdm_context_gen_forced_tag_system_suffix: 'getContextGenForcedTagSystemSuffixEffective',
    pdm_context_gen_retry_system_suffix: 'getContextGenRetrySystemSuffixEffective',
    pdm_context_gen_retry_user_suffix: 'getContextGenRetryUserSuffixEffective',
    pdm_context_profile_line_template: 'getContextProfileLineTemplateEffective'
};

window.PDM.GenPromptSpecs = {
    GEN_PROMPT_DIR: 'gen-prompts',
    SPECS: SPECS,
    STORAGE_GETTERS: STORAGE_GETTERS,
    storageGetterName: function(storageKey) {
        return STORAGE_GETTERS[storageKey] || null;
    }
};

})();
