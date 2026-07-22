/**
 * PromptDeMerde.com — storage-config-import-apply.js
 *
 * Synopsis : Application partielle d’un bundle profil (chrome + gen-prompts).
 * Objectif : applyProfileBundle / applyProfileGenPrompts sans wipe session.
 */
(function () {

var S = window.PDM && window.PDM.Storage;
if (!S) { console.warn('[storage-config-import-apply] PDM.Storage missing'); return; }

S.applyProfileGenPrompts = function (config) {
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

S._applyProfileBundleCore = function (config) {
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
};

S._applyProfileBundlePrefs = function (config) {
    if (config[S.KEYS.THEME]) {
        var themeVal = config[S.KEYS.THEME];
        if (window.PDM && window.PDM.Themes && window.PDM.Themes.migrateThemeId) {
            themeVal = window.PDM.Themes.migrateThemeId(themeVal);
        }
        S.set(S.KEYS.THEME, themeVal);
    }
    if (config[S.KEYS.STT_ENGINE]) S.setSttEngine(config[S.KEYS.STT_ENGINE]);
    if (config[S.KEYS.STT_COMPUTE]) S.setSttCompute(config[S.KEYS.STT_COMPUTE]);
    if (config[S.KEYS.CONTEXT_POSITION]) {
        S.setContextPosition(config[S.KEYS.CONTEXT_POSITION]);
    }
};

S._applyProfileBundleChrome = function (config, preserveChrome) {
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
};

S.applyProfileBundle = function (config, options) {
    if (!config || typeof config !== 'object') return false;
    options = options || {};
    var preserveChrome = options.preserveSessionChrome === true;
    S._applyProfileBundleCore(config);
    S._applyProfileBundlePrefs(config);
    S._applyProfileBundleChrome(config, preserveChrome);
    S.applyProfileGenPrompts(config);
    S.setProfileBundleFingerprint(S.computeProfileBundleFingerprint(config));
    return true;
};

})();
