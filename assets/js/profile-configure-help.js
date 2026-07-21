/**
 * PromptDeMerde.com — profile-configure-help.js
 *
 * Synopsis : Sous-modale d’aide Groupe B (réglages live avant export).
 * Objectif : Écran info simple depuis Configurer le profil.
 */
(function() {

var PS = window.PDM && window.PDM.ProfileSelector;
if (!PS) { console.warn('[profile-configure-help.js] PDM.ProfileSelector not found.'); return; }

PS.openConfigureHelpModal = function() {
    var modal = document.getElementById('configure-profile-help-modal');
    if (!modal) return;
    if (window.PDM.I18n && typeof window.PDM.I18n.apply === 'function') {
        window.PDM.I18n.apply(modal);
    }
    modal.hidden = false;
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
};

PS._closeConfigureHelpModal = function() {
    var modal = document.getElementById('configure-profile-help-modal');
    if (!modal) return;
    modal.hidden = true;
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
};

PS._bindConfigureHelpOnce = function() {
    if (PS._configureHelpBound) return;
    var modal = document.getElementById('configure-profile-help-modal');
    if (!modal) return;
    PS._configureHelpBound = true;
    modal.addEventListener('click', function(ev) {
        var t = ev.target;
        if (t && t.getAttribute && t.getAttribute('data-configure-help-close') === '1') {
            PS._closeConfigureHelpModal();
        }
    });
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { PS._bindConfigureHelpOnce(); });
} else {
    PS._bindConfigureHelpOnce();
}

})();
