/**
 * PromptDeMerde.com — profile-configure-modal.js
 *
 * Synopsis : Ouverture / onglets / fermeture modale Configurer le profil.
 * Objectif : Point d’entrée Options → hydrate / save délégués aux helpers form.
 */
(function() {

var PS = window.PDM && window.PDM.ProfileSelector;
if (!PS) { console.warn('[profile-configure-modal.js] PDM.ProfileSelector not found.'); return; }

function cfgT(key, fallback) {
    var I = window.PDM && window.PDM.I18n;
    if (I && typeof I.t === 'function') {
        var v = I.t('settings.' + key);
        if (v && v !== 'settings.' + key) return v;
    }
    return fallback != null ? fallback : key;
}

PS._getConfigureModal = function() {
    return document.getElementById('configure-profile-modal');
};

PS._closeConfigureModal = function() {
    var modal = PS._getConfigureModal();
    if (!modal) return;
    modal.hidden = true;
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('configure-profile-modal-open');
};

PS._showConfigureTab = function(tabId) {
    var modal = PS._getConfigureModal();
    if (!modal) return;
    var tabs = modal.querySelectorAll('[data-configure-tab]');
    var panels = modal.querySelectorAll('[data-configure-panel]');
    for (var i = 0; i < tabs.length; i++) {
        var on = tabs[i].getAttribute('data-configure-tab') === tabId;
        tabs[i].classList.toggle('is-active', on);
        tabs[i].setAttribute('aria-selected', on ? 'true' : 'false');
    }
    for (var j = 0; j < panels.length; j++) {
        var show = panels[j].getAttribute('data-configure-panel') === tabId;
        panels[j].hidden = !show;
        panels[j].classList.toggle('is-active', show);
    }
};

PS.openConfigureProfileModal = function() {
    var modal = PS._getConfigureModal();
    if (!modal) return;
    if (typeof PS._hydrateConfigureForm === 'function') PS._hydrateConfigureForm();
    PS._showConfigureTab('logo');
    if (window.PDM.I18n && typeof window.PDM.I18n.apply === 'function') {
        window.PDM.I18n.apply(modal);
    }
    modal.hidden = false;
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('configure-profile-modal-open');
};

PS._bindConfigureModalOnce = function() {
    if (PS._configureModalBound) return;
    var modal = PS._getConfigureModal();
    if (!modal) return;
    PS._configureModalBound = true;
    modal.addEventListener('click', function(ev) {
        var t = ev.target;
        if (t && t.getAttribute && t.getAttribute('data-configure-modal-close') === '1') {
            PS._closeConfigureModal();
            return;
        }
        var tab = t && t.closest ? t.closest('[data-configure-tab]') : null;
        if (tab) PS._showConfigureTab(tab.getAttribute('data-configure-tab'));
    });
    var saveBtn = document.getElementById('configure-profile-save-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            var ok = typeof PS._saveConfigureForm === 'function' && PS._saveConfigureForm();
            if (window.PDM.UI && window.PDM.UI.notif) {
                window.PDM.UI.notif(
                    ok ? cfgT('configureSavedOk', 'Profil mis à jour. L\'export ZIP reprendra ces valeurs.')
                        : cfgT('configureSaveFail', 'Enregistrement impossible. Vérifier les champs obligatoires.'),
                    ok ? 'ok' : 'err'
                );
            }
            if (ok) PS._closeConfigureModal();
        });
    }
    var helpBtn = document.getElementById('configure-profile-help-btn');
    if (helpBtn && typeof PS.openConfigureHelpModal === 'function') {
        helpBtn.addEventListener('click', function() { PS.openConfigureHelpModal(); });
    }
    var openBtn = document.getElementById('profile-configure-btn');
    if (openBtn) {
        openBtn.addEventListener('click', function() { PS.openConfigureProfileModal(); });
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { PS._bindConfigureModalOnce(); });
} else {
    PS._bindConfigureModalOnce();
}

})();
