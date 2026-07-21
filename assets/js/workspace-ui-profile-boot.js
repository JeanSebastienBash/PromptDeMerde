/**
 * PromptDeMerde.com — workspace-ui-profile-boot.js
 *
 * Synopsis : Boot WorkspaceUi — synopsis profil + apply chrome.
 * Objectif : Chaîner sync → synopsis → apply après chargement.
 */
(function() {
'use strict';

var WU = window.PDM && window.PDM.WorkspaceUi;
if (!WU) {
    console.warn('[workspace-ui-profile-boot.js] PDM.WorkspaceUi not found.');
    return;
}

var H = WU._profileSyncHelpers || {};

function getAssembleLang() {
    return typeof H.getAssembleLang === 'function' ? H.getAssembleLang() : 'fr';
}

function resolveOfficialProfileId(id) {
    return typeof H.resolveOfficialProfileId === 'function' ? H.resolveOfficialProfileId(id) : id;
}

function getBundledSynopsis(profileId) {
    return typeof H.getBundledSynopsis === 'function' ? H.getBundledSynopsis(profileId) : '';
}

WU.ensureProfileSynopsis = function() {
    if (!window.PDM || !window.PDM.Storage) return Promise.resolve();
    var synLang = getAssembleLang();
    var storedLang = window.PDM.Storage.get('pdm_profile_synopsis_lang');
    if (window.PDM.Storage.getProfileSynopsis() && storedLang === synLang) {
        return Promise.resolve();
    }
    if (!window.PDM.Env || typeof window.PDM.Env.hasProfileSelector !== 'function' ||
        !window.PDM.Env.hasProfileSelector()) {
        return Promise.resolve();
    }
    var activeId = resolveOfficialProfileId(window.PDM.Storage.getActiveProfile());
    if (!activeId) return Promise.resolve();

    if (window.PDM.Storage.isCustomProfileId(activeId)) {
        var cp = window.PDM.Storage.getCustomProfile(activeId);
        if (cp && typeof H.applyCustomSynopsis === 'function') {
            H.applyCustomSynopsis(cp);
            window.PDM.Storage.set('pdm_profile_synopsis_lang', synLang);
        }
        return Promise.resolve();
    }

    var synopsis = getBundledSynopsis(activeId);
    if (synopsis) {
        window.PDM.Storage.setProfileSynopsis(synopsis);
        window.PDM.Storage.set('pdm_profile_synopsis_lang', synLang);
    }
    return Promise.resolve();
};

WU.boot = function() {
    return WU.syncFromActiveProfile()
        .then(function() { return WU.ensureProfileSynopsis(); })
        .then(function() {
            WU.apply();
            if (window.PDM.AnimationSynopsis &&
                typeof window.PDM.AnimationSynopsis.bootFromStorage === 'function') {
                window.PDM.AnimationSynopsis.bootFromStorage();
            }
            return true;
        });
};

})();
