/**
 * PromptDeMerde.com — storage-config-import-synopsis.js
 *
 * Synopsis : Résoudre / stocker le slogan header à l’import ZIP.
 * Objectif : marketplace.synopsis_short sinon manifest.synopsis (Creator).
 */
(function () {

var S = window.PDM && window.PDM.Storage;
if (!S) { console.warn('[storage-config-import-synopsis] PDM.Storage missing'); return; }

S.resolveImportSynopsis = function (marketplace, manifest) {
    var short = marketplace && marketplace.synopsis_short
        ? String(marketplace.synopsis_short).trim() : '';
    if (short) return short.slice(0, 100);
    var fromManifest = manifest && manifest.synopsis
        ? String(manifest.synopsis).trim() : '';
    return fromManifest ? fromManifest.slice(0, 100) : '';
};

S.applyImportSynopsis = function (marketplace, manifest, locale) {
    var syn = S.resolveImportSynopsis(marketplace, manifest);
    if (!syn || typeof S.setProfileSynopsis !== 'function') return syn;
    S.setProfileSynopsis(syn);
    S.set('pdm_profile_synopsis_lang',
        String(S.getLanguage ? S.getLanguage() : locale).trim() || 'fr');
    return syn;
};

})();
