/**
 * PromptDeMerde.com — storage-profile-meta.js
 *
 * Synopsis : Profil actif, projet, synopsis, workspace UI, langue, thème.
 * Objectif : Étendre PDM.Storage avec métadonnées de session profil.
 */
(function(){

var S = window.PDM && window.PDM.Storage;
if (!S) { console.warn('[storage-profile-meta.js] PDM.Storage not found.'); return; }

function storedString(key) {
    var v = S.get(key);
    return v != null ? String(v) : '';
}

S.getActiveProfile = function() {
    var v = storedString(S.KEYS.ACTIVE_PROFILE);
    var id = v.trim() ? v : '';
    if (!id) {
        var I = window.PDM && window.PDM.I18n;
        if (I && typeof I.getBootProfileId === 'function') {
            id = I.getBootProfileId() || '';
        }
    }
    if (id === 'promptdemerde') {
        var fallback = '';
        if (window.PDM && window.PDM.I18n && typeof window.PDM.I18n.getBootProfileId === 'function') {
            fallback = window.PDM.I18n.getBootProfileId() || '';
        }
        if (fallback) {
            id = fallback;
            S.setActiveProfile(id);
            S.set('pdm_profile_bundle_fp', '');
        }
    }
    return id;
};
S.setActiveProfile = function(id) {
    return S.set(S.KEYS.ACTIVE_PROFILE, id != null ? String(id) : '');
};

S.getProject = function() {
    var v = S.get(S.KEYS.PROJECT);
    if (v && typeof v === 'object' && !Array.isArray(v)) return v;
    return null;
};
S.setProject = function(project) {
    var CS = window.PDM && window.PDM.ConfigSchema;
    var normalized = CS && typeof CS.normalizeProject === 'function'
        ? CS.normalizeProject(project)
        : project;
    return S.set(S.KEYS.PROJECT, normalized);
};
S.getProjectEffective = function() {
    var CS = window.PDM && window.PDM.ConfigSchema;
    if (CS && typeof CS.normalizeProject === 'function') {
        return CS.normalizeProject(S.getProject());
    }
    return S.getProject() || {};
};

S.getProfileSynopsis = function() {
    var v = S.get('pdm_profile_synopsis');
    return v != null ? String(v) : '';
};
S.setProfileSynopsis = function(text) {
    var CS = window.PDM && window.PDM.ConfigSchema;
    var max = CS && CS.MAX_PROFILE_SYNOPSIS_LEN ? CS.MAX_PROFILE_SYNOPSIS_LEN : 100;
    var s = String(text || '').trim();
    if (s.length > max) s = s.slice(0, max);
    return S.set('pdm_profile_synopsis', s);
};
S.getProfileSynopsisEffective = function() {
    var stored = S.getProfileSynopsis();
    if (stored) return stored;
    var CS = window.PDM && window.PDM.ConfigSchema;
    if (!CS) return '';
    if (typeof CS.getLocaleDefault === 'function') {
        return CS.getLocaleDefault('DEFAULT_PROFILE_SYNOPSIS');
    }
    return CS.DEFAULT_PROFILE_SYNOPSIS ? CS.DEFAULT_PROFILE_SYNOPSIS : '';
};

S.getWorkspaceUi = function() {
    var v = S.get(S.KEYS.WORKSPACE_UI);
    if (v && typeof v === 'object' && !Array.isArray(v)) return v;
    return null;
};
S.setWorkspaceUi = function(ui) {
    var CS = window.PDM && window.PDM.ConfigSchema;
    var normalized = CS && typeof CS.normalizeWorkspaceUi === 'function'
        ? CS.normalizeWorkspaceUi(ui)
        : ui;
    return S.set(S.KEYS.WORKSPACE_UI, normalized);
};
S.getWorkspaceUiEffective = function() {
    var v = S.getWorkspaceUi();
    var CS = window.PDM && window.PDM.ConfigSchema;
    if (CS && typeof CS.hardenWorkspaceUi === 'function') {
        return CS.hardenWorkspaceUi(v);
    }
    if (CS && typeof CS.normalizeWorkspaceUi === 'function') {
        return CS.normalizeWorkspaceUi(v);
    }
    return v || {};
};

S.ensureConfigDefaults = function() {
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
        var getFn = fields[i][0];
        var setFn = fields[i][1];
        var effFn = fields[i][2];
        if (!S[getFn]().trim()) S[setFn](S[effFn]());
    }
    if (!storedString(S.KEYS.ACTIVE_PROFILE).trim()) {
        var bootProfileId = null;
        if (window.PDM && window.PDM.I18n && typeof window.PDM.I18n.getBootProfileId === 'function') {
            bootProfileId = window.PDM.I18n.getBootProfileId();
        }
        var CSdef = window.PDM && window.PDM.ConfigSchema;
        S.setActiveProfile(bootProfileId || (CSdef && typeof CSdef.resolveDefaultActiveProfile === 'function'
            ? CSdef.resolveDefaultActiveProfile()
            : (CSdef && CSdef.DEFAULT_ACTIVE_PROFILE) || ''));
    }
    if (!S.getProject()) {
        S.setProject(S.getProjectEffective());
    }
    if (S.get(S.KEYS.SYSTEM_PROMPT_ENABLED) === null || S.get(S.KEYS.SYSTEM_PROMPT_ENABLED) === undefined) {
        S.setSystemPromptEnabled(true);
    }
    if (S.get(S.KEYS.CONTEXT_POSITION) === null || S.get(S.KEYS.CONTEXT_POSITION) === undefined) {
        S.setContextPosition('after_system');
    }
    if (!S.getContextProfileLineTemplate().trim()) {
        S.setContextProfileLineTemplate(S.getContextProfileLineTemplateEffective());
    }
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
    if (!S.get(S.KEYS.WORKSPACE_UI)) {
        var activeProfile = S.getActiveProfile();
        var hasProfileSelector = window.PDM && window.PDM.Env &&
            typeof window.PDM.Env.hasProfileSelector === 'function' &&
            window.PDM.Env.hasProfileSelector();
        if (!hasProfileSelector) {
            S.setWorkspaceUi(S.getWorkspaceUiEffective());
        }
    }
};

S.ensureContextGenDefaults = S.ensureConfigDefaults;

S.getLanguage = function() {
    var v = S.get(S.KEYS.LANGUAGE);
    var CS = window.PDM && window.PDM.ConfigSchema;
    if (CS && Array.isArray(CS.LANGUAGES) && CS.LANGUAGES.indexOf(v) >= 0) {
        return v;
    }
    if (window.PDM && window.PDM.I18n && Array.isArray(window.PDM.I18n.LOCALES) &&
        window.PDM.I18n.LOCALES.indexOf(v) >= 0) {
        return v;
    }
    return v === 'en' ? 'en' : 'fr';
};

S.syncWorkspaceUiTextsForLocale = function() {
    var CS = window.PDM && window.PDM.ConfigSchema;
    if (!CS || typeof CS.buildDefaultWorkspaceUi !== 'function') return false;
    var localized = CS.buildDefaultWorkspaceUi();
    var current = typeof CS.normalizeWorkspaceUi === 'function'
        ? CS.normalizeWorkspaceUi(S.get(S.KEYS.WORKSPACE_UI))
        : { identity: {}, brand: {}, texts: {} };
    var changed = false;
    if (localized && localized.texts && current.texts) {
        for (var k in localized.texts) {
            if (!Object.prototype.hasOwnProperty.call(localized.texts, k)) continue;
            if (localized.texts[k] == null) continue;
            var cur = current.texts[k];
            if (cur != null && String(cur).trim() !== '') continue;
            current.texts[k] = String(localized.texts[k]);
            changed = true;
        }
    }
    return changed ? S.setWorkspaceUi(current) : true;
};

S.getTheme = function() {
    if (window.PDM && window.PDM.Themes && window.PDM.Themes.resolveThemeId) {
        var saved = S.get(S.KEYS.THEME);
        return window.PDM.Themes.resolveThemeId(saved);
    }
    var saved = S.get(S.KEYS.THEME);
    if (saved) return String(saved);
    if (window.PDM && window.PDM.ConfigSchema && window.PDM.ConfigSchema.DEFAULT_THEME_ID) {
        return window.PDM.ConfigSchema.DEFAULT_THEME_ID;
    }
    return 'jaune';
};

})();
