/**
 * PromptDeMerde.com — profile-selector.js
 *
 * Synopsis : Sélecteur Options Profil JSON (bundle assets/profiles/) — cœur.
 * Objectif : État partagé et helpers PS._* ; populate / lifecycle / ZIP dans modules dédiés.
 */
(function() {

var PS = {};
window.PDM = window.PDM || {};
window.PDM.ProfileSelector = PS;

PS._busy = false;
PS._reservedNamesNormalized = [];
PS._bundledProfiles = [];
PS._zipFreeProfiles = PS._zipFreeProfiles || [];
PS._selectorChangeBound = false;
PS._selectorAppliedId = null;

function psT(key, vars, fallback) {
    var I = window.PDM && window.PDM.I18n;
    if (I) {
        var val = I.t('settings.' + key, vars);
        if (val && val.indexOf('settings.' + key) !== 0) return val;
    }
    return fallback != null ? fallback : '';
}
PS.t = psT;

PS._FALLBACK_RESERVED_NAMES = ['promptdemerde'];

PS._getFileStem = function(fileName) {
    var base = String(fileName || '').replace(/^.*[\\/]/, '');
    var dot = base.lastIndexOf('.');
    if (dot > 0) base = base.slice(0, dot);
    return base.trim();
};

PS._normalizeReservedKey = function(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '');
};

PS._rememberReservedNames = function(profiles) {
    var seen = {};
    PS._reservedNamesNormalized = [];
    if (!Array.isArray(profiles)) return;
    for (var i = 0; i < profiles.length; i++) {
        var p = profiles[i];
        if (!p) continue;
        var keys = [];
        if (p.id) keys.push(PS._normalizeReservedKey(p.id));
        if (p.label) keys.push(PS._normalizeReservedKey(p.label));
        for (var j = 0; j < keys.length; j++) {
            var key = keys[j];
            if (!key || seen[key]) continue;
            seen[key] = true;
            PS._reservedNamesNormalized.push(key);
        }
    }
};

PS.getReservedNames = function() {
    return (PS._reservedNamesNormalized.length ? PS._reservedNamesNormalized : PS._FALLBACK_RESERVED_NAMES).slice();
};

PS.isReservedImportName = function(fileName) {
    if (!window.PDM.Env || !window.PDM.Env.hasProfileSelector()) return false;
    var key = PS._normalizeReservedKey(PS._getFileStem(fileName));
    if (!key) return false;
    var list = PS._reservedNamesNormalized.length ? PS._reservedNamesNormalized : PS._FALLBACK_RESERVED_NAMES;
    return list.indexOf(key) !== -1;
};

PS._getSelect = function() {
    return document.getElementById('profile-selector');
};

PS._getCreateBtn = function() {
    return document.getElementById('profile-create-btn');
};

PS._getActiveId = function() {
    if (window.PDM.Storage && typeof window.PDM.Storage.getActiveProfile === 'function') {
        return window.PDM.Storage.getActiveProfile();
    }
    var I = window.PDM && window.PDM.I18n;
    if (I && typeof I.getBootProfileId === 'function') {
        return I.getBootProfileId() || '';
    }
    return '';
};

PS._setActiveId = function(id) {
    if (window.PDM.Storage && typeof window.PDM.Storage.setActiveProfile === 'function') {
        window.PDM.Storage.setActiveProfile(id);
    }
};

PS._getEndpoint = function(key, fallback) {
    if (window.PDM.Env && window.PDM.Env.getServerPath) {
        return window.PDM.Env.getServerPath(key) || fallback;
    }
    return fallback;
};

PS._getAssembleLang = function() {
    var I = window.PDM && window.PDM.I18n;
    if (I) {
        if (typeof I.getProfileLang === 'function') {
            return I.getProfileLang();
        }
        if (typeof I.getLocale === 'function') {
            var loc = I.getLocale();
            return loc === 'fr' ? 'fr' : 'en';
        }
    }
    return 'fr';
};

PS._withQuery = function(url, query) {
    return url + (url.indexOf('?') === -1 ? '?' : '&') + query;
};

PS.profileJsonUrl = function(id) {
    id = String(id || '').trim();
    try {
        return new URL('assets/profiles/' + encodeURIComponent(id) + '/parts/config.json', document.baseURI).toString();
    } catch (e) {
        return 'assets/profiles/' + encodeURIComponent(id) + '/parts/config.json';
    }
};

PS._readJsonResponse = function(res, label) {
    return res.text().then(function(text) {
        var payload = null;
        if (text) {
            try {
                payload = JSON.parse(text);
            } catch (e) {
                var preview = text.replace(/\s+/g, ' ').slice(0, 80);
                throw new Error(psT('profileJsonInvalid', {
                    label: label,
                    status: res.status,
                    preview: preview
                }, label + ' n\'a pas renvoyé du JSON (HTTP ' + res.status + ') : ' + preview));
            }
        }
        if (!res.ok) {
            throw new Error((payload && payload.error) ? payload.error : psT('profileHttpError', {
                label: label,
                status: res.status
            }, label + ' HTTP ' + res.status));
        }
        return payload;
    });
};

PS.getBundledSynopsisRaw = function(profileId) {
    for (var i = 0; i < PS._bundledProfiles.length; i++) {
        var p = PS._bundledProfiles[i];
        if (p && p.id === profileId && p.synopsis) {
            return String(p.synopsis);
        }
    }
    return '';
};

PS.getBundledSynopsis = function(profileId) {
    var SR = window.PDM && window.PDM.SynopsisResolve;
    var lang = PS._getAssembleLang ? PS._getAssembleLang() : '';
    if (SR && typeof SR.resolveBundledProfileSynopsis === 'function') {
        return SR.resolveBundledProfileSynopsis(profileId, lang);
    }
    return PS.getBundledSynopsisRaw(profileId);
};

PS._selectHasOption = function(sel, id) {
    if (!sel || id == null) return false;
    id = String(id);
    for (var i = 0; i < sel.options.length; i++) {
        if (sel.options[i].value === id) return true;
    }
    return false;
};

PS._syncSelectorToActive = function() {
    var sel = PS._getSelect();
    if (!sel) return;
    var active = PS._getActiveId();
    PS._selectorAppliedId = active;
    if (PS._selectHasOption(sel, active)) {
        sel.value = active;
    }
};

})();
