/**
 * PromptDeMerde.com — ui-safe-display.js
 *
 * Synopsis : Affichage sûr des textes d’archive profil (DOM only).
 * Objectif : setSafeText / flag non-fiable sans muter localStorage.
 */
(function() {

var U = window.PDM && window.PDM.UI;
if (!U) { console.warn('[ui-safe-display] PDM.UI missing'); return; }

/** Alias : coque HTML code-owned + valeur dynamique. */
U.safeText = U.escapeHtml;

U.setSafeText = function(el, s) {
    if (!el) return;
    el.textContent = s == null ? '' : String(s);
};

/** Sticky après import ZIP ; sinon dérivé (custom / i18n user bundle). Non exporté. */
U._archiveDisplayUntrusted = false;

U.setUntrustedProfileDisplay = function(on) {
    U._archiveDisplayUntrusted = !!on;
};

U.isUntrustedProfileDisplay = function() {
    if (U._archiveDisplayUntrusted) return true;
    var I = window.PDM && window.PDM.I18n;
    if (I && typeof I.isUserI18nBundle === 'function' && I.isUserI18nBundle()) return true;
    var S = window.PDM && window.PDM.Storage;
    var id = S && typeof S.getActiveProfile === 'function' ? String(S.getActiveProfile() || '') : '';
    if (!id) return false;
    if (id.indexOf('custom-') === 0) return true;
    var PS = window.PDM && window.PDM.ProfileSelector;
    if (PS && typeof PS.isCustomProfileId === 'function' && PS.isCustomProfileId(id)) return true;
    return false;
};

})();
