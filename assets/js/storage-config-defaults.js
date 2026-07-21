/**
 * PromptDeMerde.com — storage-config-defaults.js
 *
 * Synopsis : Amorçage des défauts de configuration Storage.
 * Objectif : Matérialiser prompts, profil, projet et workspace UI si absents.
 */
(function(){

var S = window.PDM && window.PDM.Storage;
if (!S) { console.warn('[storage-config-defaults.js] PDM.Storage not found.'); return; }

function storedString(key) {
    var v = S.get(key);
    return v != null ? String(v) : '';
}

function ensurePromptFieldDefaults() {
    var fields = [
        ['getSystemPrompt', 'setSystemPrompt', 'getSystemPromptEffective'],
        ['getContextGenSystem', 'setContextGenSystem', 'getContextGenSystemEffective'],
        ['getContextGenUserIntent', 'setContextGenUserIntent', 'getContextGenUserIntentEffective'],
        ['getContextGenUserTitle', 'setContextGenUserTitle', 'getContextGenUserTitleEffective'],
        ['getContextInjectHeader', 'setContextInjectHeader', 'getContextInjectHeaderEffective'],
        ['getContextGenTagIntentSuffix', 'setContextGenTagIntentSuffix', 'getContextGenTagIntentSuffixEffective'],
        ['getContextGenForcedTagSystemSuffix', 'setContextGenForcedTagSystemSuffix', 'getContextGenForcedTagSystemSuffixEffective'],
        ['getContextGenRetrySystemSuffix', 'setContextGenRetrySystemSuffix', 'getContextGenRetrySystemSuffixEffective'],
        ['getContextGenRetryUserSuffix', 'setContextGenRetryUserSuffix', 'getContextGenRetryUserSuffixEffective']
    ];
    for (var i = 0; i < fields.length; i++) {
        if (!S[fields[i][0]]().trim()) S[fields[i][1]](S[fields[i][2]]());
    }
}

function ensureActiveProfileDefault() {
    if (storedString(S.KEYS.ACTIVE_PROFILE).trim()) return;
    var bootProfileId = null;
    if (window.PDM && window.PDM.I18n && typeof window.PDM.I18n.getBootProfileId === 'function') {
        bootProfileId = window.PDM.I18n.getBootProfileId();
    }
    var CSdef = window.PDM && window.PDM.ConfigSchema;
    S.setActiveProfile(bootProfileId || (CSdef && typeof CSdef.resolveDefaultActiveProfile === 'function'
        ? CSdef.resolveDefaultActiveProfile()
        : (CSdef && CSdef.DEFAULT_ACTIVE_PROFILE) || ''));
}

function ensureProjectAndFlagDefaults() {
    if (!S.getProject()) S.setProject(S.getProjectEffective());
    if (S.get(S.KEYS.SYSTEM_PROMPT_ENABLED) === null || S.get(S.KEYS.SYSTEM_PROMPT_ENABLED) === undefined) {
        S.setSystemPromptEnabled(true);
    }
    if (S.get(S.KEYS.CONTEXT_POSITION) === null || S.get(S.KEYS.CONTEXT_POSITION) === undefined) {
        S.setContextPosition('after_system');
    }
    if (!S.getContextProfileLineTemplate().trim()) {
        S.setContextProfileLineTemplate(S.getContextProfileLineTemplateEffective());
    }
}

function ensureContextGenParamDefaults() {
    if (S.get(S.KEYS.CONTEXT_GEN_MAX_TOKENS) == null) {
        S.setContextGenMaxTokens(S.getContextGenMaxTokens());
    }
    if (S.get(S.KEYS.CONTEXT_GEN_TEMPERATURE) == null) {
        S.setContextGenTemperature(S.getContextGenTemperature());
    }
    if (S.get(S.KEYS.CONTEXT_GEN_RETRY_TEMPERATURE) == null) {
        S.setContextGenRetryTemperature(S.getContextGenRetryTemperature());
    }
    if (S.get(S.KEYS.CONTEXT_GEN_MAX_RETRIES) == null) {
        S.setContextGenMaxRetries(S.getContextGenMaxRetries());
    }
    if (!S.getContextGenJsonSchema()) {
        S.setContextGenJsonSchema(S.getContextGenJsonSchemaEffective());
    }
}

function ensureWorkspaceUiDefault() {
    if (S.get(S.KEYS.WORKSPACE_UI)) return;
    var hasProfileSelector = window.PDM && window.PDM.Env &&
        typeof window.PDM.Env.hasProfileSelector === 'function' &&
        window.PDM.Env.hasProfileSelector();
    if (!hasProfileSelector) {
        S.setWorkspaceUi(S.getWorkspaceUiEffective());
    }
}

S.ensureConfigDefaults = function() {
    ensurePromptFieldDefaults();
    ensureActiveProfileDefault();
    ensureProjectAndFlagDefaults();
    ensureContextGenParamDefaults();
    ensureWorkspaceUiDefault();
};

S.ensureContextGenDefaults = S.ensureConfigDefaults;

})();
