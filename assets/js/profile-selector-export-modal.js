/**
 * PromptDeMerde.com — profile-selector-export-modal.js
 *
 * Synopsis : Ouverture / liaison événements modale d’export ZIP.
 * Objectif : Étendre ProfileSelector avec open/bind/close de la modale.
 */
(function() {

var PS = window.PDM && window.PDM.ProfileSelector;
if (!PS) { console.warn('[profile-selector-export-modal.js] PDM.ProfileSelector not found.'); return; }

function psT(key, vars, fallback) {
    if (typeof PS.t === 'function') return PS.t(key, vars, fallback);
    return fallback != null ? fallback : '';
}

PS._closeExportModal = function() {
    var els = PS._getExportModalEls();
    if (!els || !els.modal) return;
    els.modal.hidden = true;
    els.modal.classList.remove('show');
    els.modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('export-config-modal-open');
};

PS._openExportModal = function(options) {
    options = options || {};
    var els = PS._getExportModalEls();
    if (!els || !els.modal) {
        return Promise.resolve(null);
    }
    PS._populateExportModalFlags(els);
    var defaultPreset = options.preset || (PS._isUserI18nBundleSession() ? 'maximal' : 'minimal');
    PS._applyExportPreset(els, defaultPreset);
    var defaultLabel = options.label != null ? String(options.label).trim() : PS.getActiveLabel();
    if (els.labelInput) {
        var norm = typeof PS.normalizeProfileLabel === 'function'
            ? (PS.normalizeProfileLabel(defaultLabel) || PS.toPascalProfileName(defaultLabel))
            : defaultLabel;
        els.labelInput.value = norm || psT('profileDefaultLabel', null, 'MonProfil');
        els.labelInput.setAttribute('spellcheck', 'false');
        els.labelInput.setAttribute('autocomplete', 'off');
        els.labelInput.setAttribute('pattern', '[A-Z][A-Za-z0-9]*');
        els.labelInput.setAttribute('title', psT('profileNamePascalHint', null,
            'PascalCase obligatoire : majuscule en t\u00eate de chaque mot, sans tiret ni espace (ex. PromptListStructurator, Speech2Texte).'));
    }
    if (window.PDM.I18n && typeof window.PDM.I18n.apply === 'function') {
        window.PDM.I18n.apply(els.modal);
    }
    els.modal.hidden = false;
    els.modal.classList.add('show');
    els.modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('export-config-modal-open');
    if (els.labelInput) {
        els.labelInput.focus();
        els.labelInput.select();
    }
    return new Promise(function(resolve) {
        PS._exportModalResolve = resolve;
    });
};

PS._bindExportModalOnce = function() {
    if (PS._exportModalBound) return;
    var els = PS._getExportModalEls();
    if (!els || !els.modal) return;
    PS._exportModalBound = true;

    els.modal.addEventListener('click', function(e) {
        var t = e.target;
        if (t && t.getAttribute('data-export-modal-close') === '1') {
            PS._closeExportModal();
            if (PS._exportModalResolve) PS._exportModalResolve(null);
            return;
        }
        if (t && t.closest && t.closest('#export-config-lang-flags [data-lang]')) {
            var langBtn = t.closest('[data-lang]');
            var langCode = langBtn.getAttribute('data-lang');
            PS._forEachNode(els.langFlags.querySelectorAll('.stg-lang-flag'), function(b) {
                b.classList.remove('is-active');
                b.setAttribute('aria-pressed', 'false');
            });
            langBtn.classList.add('is-active');
            langBtn.setAttribute('aria-pressed', 'true');
            PS._ensureExportLanguageInI18n(els, langCode);
            PS._updateExportSizeHint(els);
            return;
        }
        if (t && t.closest && t.closest('#export-config-i18n-flags [data-lang]')) {
            var i18nBtn = t.closest('[data-lang]');
            var checked = i18nBtn.getAttribute('aria-checked') === 'true';
            i18nBtn.setAttribute('aria-checked', checked ? 'false' : 'true');
            PS._updateExportSizeHint(els);
        }
    });

    if (els.presetMinimal) {
        els.presetMinimal.addEventListener('change', function() {
            if (els.presetMinimal.checked) PS._applyExportPreset(els, 'minimal');
        });
    }
    if (els.presetMaximal) {
        els.presetMaximal.addEventListener('change', function() {
            if (els.presetMaximal.checked) PS._applyExportPreset(els, 'maximal');
        });
    }
    if (els.cleanFull) {
        els.cleanFull.addEventListener('change', function() {
            if (els.cleanFull.checked) PS._updateExportSizeHint(els);
        });
    }
    if (els.cleanPure) {
        els.cleanPure.addEventListener('change', function() {
            if (els.cleanPure.checked) PS._updateExportSizeHint(els);
        });
    }
    if (els.labelInput) {
        els.labelInput.addEventListener('input', function() {
            var caret = els.labelInput.selectionStart;
            var before = els.labelInput.value;
            var norm = typeof PS.toPascalProfileName === 'function'
                ? PS.toPascalProfileName(before)
                : before;
            if (norm !== before) {
                els.labelInput.value = norm;
                try {
                    var pos = Math.min(norm.length, caret || 0);
                    els.labelInput.setSelectionRange(pos, pos);
                } catch (e) { /* ignore */ }
            }
            PS._updateExportSizeHint(els);
        });
    }
    if (els.confirmBtn) {
        els.confirmBtn.addEventListener('click', function() {
            var state = PS._exportModalState(els);
            if (!state.label) {
                if (window.PDM.UI && window.PDM.UI.notif) {
                    window.PDM.UI.notif(psT('profileNamePascalInvalid', null,
                        'Nom de profil invalide. Utiliser PascalCase sans tiret ni espace (ex. PromptListStructurator).'), 'err');
                }
                if (els.labelInput) els.labelInput.focus();
                return;
            }
            if (state.includeI18n && !state.i18nLangs.length) {
                if (window.PDM.UI && window.PDM.UI.notif) {
                    window.PDM.UI.notif(PS._exportModalT('settings.exportI18nLangsRequired'), 'err');
                }
                return;
            }
            if (state.includeI18n && state.language && window.PDM.I18n &&
                typeof window.PDM.I18n.getExportBundle === 'function') {
                var exportBundle = window.PDM.I18n.getExportBundle(state.i18nLangs);
                if (!exportBundle || !exportBundle.langs || exportBundle.langs.indexOf(state.language) < 0) {
                    if (window.PDM.UI && window.PDM.UI.notif) {
                        window.PDM.UI.notif(PS._exportModalT('settings.exportLanguageDictMissing', { lang: state.language }), 'err');
                    }
                    return;
                }
            }
            if (PS.isReservedImportName(state.label + '.json')) {
                if (!confirm(psT('profileExportReservedConfirm', { label: state.label },
                    'Le nom \u00ab ' + state.label + ' \u00bb est r\u00e9serv\u00e9 aux profils officiels. Continuer ?'))) {
                    return;
                }
            }
            PS._closeExportModal();
            if (PS._exportModalResolve) {
                PS._exportModalResolve(state);
                PS._exportModalResolve = null;
            }
        });
    }
};

})();
