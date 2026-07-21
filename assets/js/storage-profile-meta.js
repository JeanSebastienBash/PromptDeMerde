/**
 * PromptDeMerde.com — storage-profile-meta.js
 *
 * Synopsis : Profil actif, projet, synopsis, langue, thème.
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
