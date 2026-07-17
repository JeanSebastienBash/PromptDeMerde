/**
 * PromptDeMerde.com — profile-selector-export-modal-state.js
 *
 * Synopsis : Résumé et presets de la modale d’export.
 * Objectif : Étendre ProfileSelector avec summary/presets export.
 */
(function() {

var PS = window.PDM && window.PDM.ProfileSelector;
if (!PS) { console.warn('[profile-selector-export-modal-state.js] PDM.ProfileSelector not found.'); return; }

PS._updateExportSummary = function(els) {
    if (!els || !els.summary) return;
    var state = PS._exportModalState(els);
    var lines = [];
    lines.push(PS._exportModalT('settings.exportSummaryTitle'));
    lines.push(PS._exportModalT('settings.exportSummarySession'));
    lines.push(PS._exportModalT('settings.exportSummaryStartLang', { label: PS._formatLangLabel(state.language) }));
    if (!state.includeI18n) {
        lines.push(PS._exportModalT('settings.exportSummaryI18nNone'));
        lines.push(PS._exportModalT('settings.exportSummaryI18nAfterNone'));
        lines.push(PS._exportModalT('settings.exportSummaryI18nPagesServer'));
    } else if (state.i18nLangs.length) {
        var langLabels = state.i18nLangs.map(function(code) { return PS._formatLangLabel(code); }).join(', ');
        lines.push(PS._exportModalT('settings.exportSummaryI18nLangs', {
            langs: langLabels,
            count: state.i18nLangs.length
        }));
        lines.push(PS._exportModalT('settings.exportSummaryI18nAfter'));
        lines.push(PS._exportModalT('settings.exportSummaryI18nScope'));
        lines.push(PS._exportModalT('settings.exportSummaryI18nExcludes'));
    } else {
        lines.push(PS._exportModalT('settings.exportI18nLangsRequired'));
    }
    var PBE = window.PDM && window.PDM.ProfileBundleExport;
    if (PBE && typeof PBE.listExportFiles === 'function') {
        var exportFiles = PBE.listExportFiles({
            label: state.label || PS.getActiveLabel(),
            language: state.language,
            includeI18n: state.includeI18n,
            i18nLangs: state.i18nLangs,
            promptLocales: PS._exportPromptLocales(state),
            customProfile: true
        });
        lines.push(PS._exportModalT('settings.exportSummaryFiles', { count: exportFiles.length }));
        for (var fi = 0; fi < Math.min(exportFiles.length, 12); fi++) {
            lines.push('  · ' + exportFiles[fi]);
        }
        if (exportFiles.length > 12) {
            lines.push('  · … (+' + (exportFiles.length - 12) + ')');
        }
    }
    var bytes = PS._estimateExportBytes(state);
    var kb = Math.max(1, Math.round(bytes / 1024));
    var warn = bytes > PS._EXPORT_SIZE_WARN_BYTES;
    lines.push(PS._exportModalT('settings.exportSummarySize', { size: kb }));
    if (warn) {
        lines.push('  ⚠ ' + PS._exportModalT('settings.exportSizeWarning'));
    }
    els.summary.textContent = lines.join('\n');
    els.summary.classList.toggle('is-warn', warn);
};

PS._updateExportSizeHint = function(els) {
    PS._updateExportSummary(els);
};

PS._applyExportPreset = function(els, preset) {
    if (!els) return;
    var activeLang = window.PDM.Storage.getLanguage ? window.PDM.Storage.getLanguage() : 'fr';
    var userBundle = PS._isUserI18nBundleSession();
    var bundleLangs = userBundle ? PS._userBundleLangCodes() : [];
    var withI18n = preset === 'maximal';
    if (els.presetMinimal) els.presetMinimal.checked = !withI18n;
    if (els.presetMaximal) els.presetMaximal.checked = withI18n;
    if (els.langFlags) {
        PS._forEachNode(els.langFlags.querySelectorAll('.stg-lang-flag'), function(btn) {
            var on = btn.getAttribute('data-lang') === activeLang;
            btn.classList.toggle('is-active', on);
            btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
    }
    if (els.i18nWrap) {
        els.i18nWrap.hidden = !withI18n;
    }
    if (els.i18nFlags) {
        PS._forEachNode(els.i18nFlags.querySelectorAll('.stg-lang-flag'), function(btn) {
            var code = btn.getAttribute('data-lang');
            var on = false;
            if (withI18n) {
                if (userBundle && bundleLangs.length) {
                    on = bundleLangs.indexOf(code) >= 0;
                } else {
                    on = code === activeLang;
                }
            }
            btn.setAttribute('aria-checked', on ? 'true' : 'false');
        });
    }
    if (withI18n) {
        PS._ensureExportLanguageInI18n(els, activeLang);
    }
    PS._updateExportSummary(els);
};

PS._populateExportModalFlags = function(els) {
    if (!els) return;
    var locales = PS._exportKnownLocales();
    var I = window.PDM && window.PDM.I18n;
    var activeLang = window.PDM.Storage.getLanguage ? window.PDM.Storage.getLanguage() : 'fr';
    if (els.langFlags) {
        els.langFlags.innerHTML = '';
        for (var i = 0; i < locales.length; i++) {
            var loc = locales[i];
            var flag = (I && typeof I.getFlagUrl === 'function') ? I.getFlagUrl(loc.code) : (loc.flag || '');
            var btn = PS._buildExportFlagBtn(loc.code, flag, 'single');
            if (loc.code === activeLang) {
                btn.classList.add('is-active');
                btn.setAttribute('aria-pressed', 'true');
            }
            els.langFlags.appendChild(btn);
        }
    }
    if (els.i18nFlags) {
        els.i18nFlags.innerHTML = '';
        for (var j = 0; j < locales.length; j++) {
            var loc2 = locales[j];
            var flag2 = (I && typeof I.getFlagUrl === 'function') ? I.getFlagUrl(loc2.code) : (loc2.flag || '');
            els.i18nFlags.appendChild(PS._buildExportFlagBtn(loc2.code, flag2, 'multi'));
        }
    }
};

PS._forEachNode = function(list, fn) {
    for (var i = 0; i < list.length; i++) fn(list[i], i);
};



})();
