/**
 * PromptDeMerde.com — docs-links.js
 *
 * Synopsis : Lien documentation GitHub (miroir public anglais).
 * Objectif : footer et hash legacy → docs/Documentation.md.
 */
(function () {

var BASE = 'https://github.com/JeanSebastienBash/promptdemerde/blob/main/docs/';
var Docs = {};

Docs.techDocUrl = function () {
    return BASE + 'Documentation.md';
};

Docs.openTechDoc = function () {
    var url = Docs.techDocUrl();
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
