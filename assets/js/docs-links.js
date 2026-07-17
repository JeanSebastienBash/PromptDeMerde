/**
 * PromptDeMerde.com — docs-links.js
 *
 * Synopsis : Lien documentation GitHub selon la langue IHM.
 * Objectif : FR → Documentation.md ; autres locales → Documentation.en.md.
 */
(function () {

var BASE = 'https://github.com/JeanSebastienBash/promptdemerde/blob/main/docs/';
var Docs = {};

function currentLang(lang) {
    var l = String(lang || '').trim().toLowerCase();
    if (l) return l;
    var I = window.PDM && window.PDM.I18n;
    if (I && typeof I.getLocale === 'function') {
        l = String(I.getLocale() || '').toLowerCase();
        if (l) return l;
    }
    var S = window.PDM && window.PDM.Storage;
    if (S && typeof S.getLanguage === 'function') {
        return String(S.getLanguage() || '').toLowerCase();
    }
    return 'fr';
}

Docs.techDocUrl = function (lang) {
    return BASE + (currentLang(lang) === 'fr'
        ? 'Documentation.md'
        : 'Documentation.en.md');
};

Docs.openTechDoc = function (lang) {
    var url = Docs.techDocUrl(lang);
    window.open(url, '_blank', 'noopener,noreferrer');
    return url;
};

Docs.syncFooterLink = function () {
    var a = document.getElementById('footer-link-documentation');
    if (!a) return;
    a.setAttribute('href', Docs.techDocUrl());
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener');
};

Docs.isLegacyDocHash = function (raw) {
    var h = String(raw || '').replace(/^#/, '').trim().toLowerCase();
    return h === 'documentation' || /^doc-[a-z0-9-]+$/.test(h);
};

Docs.handleLegacyHash = function (raw) {
    if (!Docs.isLegacyDocHash(raw)) return false;
    Docs.openTechDoc();
    if (window.history && typeof window.history.replaceState === 'function') {
        window.history.replaceState(null, '', '#workspace');
    } else {
        window.location.hash = 'workspace';
    }
    return true;
};

window.PDM = window.PDM || {};
window.PDM.Docs = Docs;

document.addEventListener('pdm:localechange', Docs.syncFooterLink);
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', Docs.syncFooterLink);
} else {
    Docs.syncFooterLink();
}

})();
