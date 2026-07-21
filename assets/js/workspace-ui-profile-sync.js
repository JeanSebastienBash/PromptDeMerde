/**
 * PromptDeMerde.com — workspace-ui-profile-sync.js
 *
 * Synopsis : Sync prompts du profil actif vers la session Storage.
 * Objectif : Overlay locale avant apply (évite l’écrasement par le config source).
 */
(function() {
'use strict';

var WU = window.PDM && window.PDM.WorkspaceUi;
if (!WU) {
    console.warn('[workspace-ui-profile-sync.js] PDM.WorkspaceUi not found.');
    return;
}

function getAssembleLang() {
    try {
        var S = window.PDM && window.PDM.Storage;
        if (S && typeof S.getLanguage === 'function') {
            var lang = String(S.getLanguage() || '').trim();
            if (lang) return lang;
        }
        var I = window.PDM && window.PDM.I18n;
        if (I && typeof I.getLocale === 'function') {
            lang = String(I.getLocale() || '').trim();
            if (lang) return lang;
        }
    } catch (e) {}
    return 'fr';
}

function resolveOfficialProfileId(requestedId) {
    if (window.PDM.Storage && typeof window.PDM.Storage.isCustomProfileId === 'function' &&
        window.PDM.Storage.isCustomProfileId(requestedId)) {
        return requestedId;
    }
    var I = window.PDM && window.PDM.I18n;
    if (I && typeof I.isBundledProfileId === 'function' && I.isBundledProfileId(requestedId)) {
        return requestedId;
    }
    if (I && typeof I.getBootProfileId === 'function') {
        var bootId = I.getBootProfileId();
        if (bootId) return bootId;
    }
    return requestedId;
}

function overlayCustomConfig(cp, activeId) {
    var customConfig = JSON.parse(JSON.stringify(cp.config));
    delete customConfig.i18n;
    delete customConfig.langs;
    customConfig.pdm_active_profile = activeId;
    var PBun = window.PDM && window.PDM.PromptsBundle;
    if (PBun && typeof PBun.applyLocaleOverlay === 'function') {
        customConfig = PBun.applyLocaleOverlay(customConfig, getAssembleLang(), activeId);
    }
    return customConfig;
}

function needsBundleResync(config) {
    var S = window.PDM.Storage;
    if (S.getProfileBundleFingerprint() !== S.computeProfileBundleFingerprint(config)) {
        return true;
    }
    var storedPrompt = S.getSystemPrompt();
    if (!config.pdm_system_prompt) return false;
    return !String(storedPrompt || '').trim() ||
        String(storedPrompt) !== String(config.pdm_system_prompt);
}

function applyCustomSynopsis(cp) {
    if (cp.synopsis) {
        window.PDM.Storage.setProfileSynopsis(cp.synopsis);
    } else if (cp.label) {
        window.PDM.Storage.setProfileSynopsis(
            WU.text('customProfileSynopsis', { label: cp.label }).slice(0, 100)
        );
    }
}

function syncCustomProfile(activeId) {
    var cp = window.PDM.Storage.getCustomProfile(activeId);
    if (!cp || !cp.config) return Promise.resolve(false);
    applyCustomSynopsis(cp);
    var customConfig = overlayCustomConfig(cp, activeId);
    if (!needsBundleResync(customConfig)) return Promise.resolve(false);
    window.PDM.Storage.applyProfileBundle(customConfig);
    return Promise.resolve(true);
}

function getBundledSynopsis(profileId) {
    var SR = window.PDM && window.PDM.SynopsisResolve;
    if (SR && typeof SR.resolveBundledProfileSynopsis === 'function') {
        return SR.resolveBundledProfileSynopsis(profileId, getAssembleLang());
    }
    var PS = window.PDM && window.PDM.ProfileSelector;
    if (PS && typeof PS.getBundledSynopsisRaw === 'function') {
        var fromPs = PS.getBundledSynopsisRaw(profileId);
        if (fromPs) return fromPs;
    }
    var I = window.PDM && window.PDM.I18n;
    if (I && typeof I.getBootManifest === 'function') {
        var manifest = I.getBootManifest();
        if (manifest && Array.isArray(manifest.profiles)) {
            for (var i = 0; i < manifest.profiles.length; i++) {
                var p = manifest.profiles[i];
                if (p && p.id === profileId && p.synopsis) return String(p.synopsis);
            }
        }
    }
    return '';
}

function mergeAndMaybeApply(config, activeId, bundle, locale, preserveChrome) {
    var PBun = window.PDM && window.PDM.PromptsBundle;
    if (bundle && PBun && typeof PBun.mergeLoadedConfig === 'function') {
        config = PBun.mergeLoadedConfig(config, bundle, activeId);
    }
    var synopsis = getBundledSynopsis(activeId);
    if (synopsis && !String(window.PDM.Storage.getProfileSynopsis() || '').trim()) {
        window.PDM.Storage.setProfileSynopsis(synopsis);
        window.PDM.Storage.set('pdm_profile_synopsis_lang', locale);
    }
    if (!needsBundleResync(config)) return false;
    var opts = preserveChrome ? { preserveSessionChrome: true } : undefined;
    window.PDM.Storage.applyProfileBundle(config, opts);
    return true;
}

WU._profileSyncHelpers = {
    getAssembleLang: getAssembleLang,
    resolveOfficialProfileId: resolveOfficialProfileId,
    applyCustomSynopsis: applyCustomSynopsis,
    getBundledSynopsis: getBundledSynopsis
};

WU.syncFromActiveProfile = function() {
    if (!window.PDM || !window.PDM.Storage || !window.PDM.Env ||
        typeof window.PDM.Env.hasProfileSelector !== 'function' ||
        !window.PDM.Env.hasProfileSelector()) {
        return Promise.resolve(false);
    }
    var activeId = resolveOfficialProfileId(window.PDM.Storage.getActiveProfile());
    if (!activeId) return Promise.resolve(false);
    if (window.PDM.Storage.isCustomProfileId(activeId)) {
        return syncCustomProfile(activeId);
    }
    var locale = getAssembleLang();
    var PB = window.PDM && window.PDM.ProfileBundle;
    if (PB && typeof PB.loadFromUrl === 'function') {
        return PB.loadFromUrl(activeId, locale).then(function(bundle) {
            var config = bundle && bundle.assembled;
            if (!config || typeof config !== 'object') return false;
            return mergeAndMaybeApply(config, activeId, bundle, locale, true);
        }).catch(function(err) {
            console.warn('[PDM.WorkspaceUi] syncFromActiveProfile', err && err.message ? err.message : err);
            return false;
        });
    }
    var PS = window.PDM && window.PDM.ProfileSelector;
    var url = PS && typeof PS.profileJsonUrl === 'function'
        ? PS.profileJsonUrl(activeId)
        : 'assets/profiles/' + encodeURIComponent(activeId) + '/parts/config.json';
    return fetch(url, { cache: 'no-store' })
        .then(function(res) { return res.json(); })
        .then(function(config) {
            if (!config || typeof config !== 'object') return false;
            return mergeAndMaybeApply(config, activeId, null, locale, true);
        })
        .catch(function(err) {
            console.warn('[PDM.WorkspaceUi] syncFromActiveProfile', err && err.message ? err.message : err);
            return false;
        });
};

})();
