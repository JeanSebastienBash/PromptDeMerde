/**
 * PromptDeMerde.com — profile-selector-export-modal-flags.js
 *
 * Synopsis : Locales, drapeaux et estimation taille export.
 * Objectif : Étendre ProfileSelector avec helpers flags/locales export.
 */
(function() {

var PS = window.PDM && window.PDM.ProfileSelector;
if (!PS) { console.warn('[profile-selector-export-modal-flags.js] PDM.ProfileSelector not found.'); return; }

PS._EXPORT_SIZE_WARN_BYTES = 500 * 1024;

PS._exportModalEls = null;

PS._getExportModalEls = function() {
    var modal = document.getElementById('export-config-modal');
    if (!modal) return null;
    PS._exportModalEls = {
        modal: modal,
        labelInput: document.getElementById('export-config-label'),
        presetMinimal: modal.querySelector('input[name="export-preset"][value="minimal"]'),
        presetMaximal: modal.querySelector('input[name="export-preset"][value="maximal"]'),
        cleanFull: modal.querySelector('input[name="export-clean"][value="full"]'),
        cleanPure: modal.querySelector('input[name="export-clean"][value="clean"]'),
        langFlags: document.getElementById('export-config-lang-flags'),
        i18nWrap: document.getElementById('export-config-i18n-wrap'),
        i18nFlags: document.getElementById('export-config-i18n-flags'),
        summary: document.getElementById('export-config-summary'),
        confirmBtn: document.getElementById('export-config-confirm-btn')
    };
    return PS._exportModalEls;
};

PS._exportModalT = function(key, vars, fallback) {
    var I = window.PDM && window.PDM.I18n;
    if (I && typeof I.t === 'function') {
        var val = I.t(key, vars);
        if (val && val !== key) return val;
    }
    return fallback != null ? fallback : '';
};

PS._isUserI18nBundleSession = function() {
    var I = window.PDM && window.PDM.I18n;
    return !!(I && typeof I.isUserI18nBundle === 'function' && I.isUserI18nBundle());
};

PS._userBundleLangCodes = function() {
    var codes = [];
    var I = window.PDM && window.PDM.I18n;
    if (I && Array.isArray(I.LOCALES) && I.LOCALES.length) {
        codes = I.LOCALES.slice();
    }
    if (!codes.length && window.PDM.Storage && typeof window.PDM.Storage.getI18nBundle === 'function') {
        var stored = window.PDM.Storage.getI18nBundle();
        if (stored && Array.isArray(stored.langs) && stored.langs.length) {
            codes = stored.langs.slice();
        }
    }
    return codes;
};

PS._exportKnownLocales = function() {
    var I = window.PDM && window.PDM.I18n;
    if (I && Array.isArray(I.LOCALE_LIST) && I.LOCALE_LIST.length) {
        return I.LOCALE_LIST.slice();
    }
    if (PS._isUserI18nBundleSession()) {
        var codes = PS._userBundleLangCodes();
        if (codes.length) {
            return codes.map(function(code) {
                return {
                    code: code,
                    flag: (I && typeof I.getFlagUrl === 'function')
                        ? I.getFlagUrl(code)
                        : ('assets/images/flags/' + code + '.svg')
                };
            });
        }
    }
    return [
        { code: 'fr', flag: 'assets/images/flags/fr.svg' },
        { code: 'en', flag: 'assets/images/flags/en.svg' },
        { code: 'ar', flag: 'assets/images/flags/ar.svg' },
        { code: 'zh', flag: 'assets/images/flags/zh.svg' },
        { code: 'eo', flag: 'assets/images/flags/eo.svg' },
        { code: 'es', flag: 'assets/images/flags/es.svg' },
        { code: 'de', flag: 'assets/images/flags/de.svg' },
        { code: 'pt', flag: 'assets/images/flags/pt.svg' },
        { code: 'it', flag: 'assets/images/flags/it.svg' },
        { code: 'ru', flag: 'assets/images/flags/ru.svg' },
        { code: 'ja', flag: 'assets/images/flags/ja.svg' },
        { code: 'ko', flag: 'assets/images/flags/ko.svg' }
    ];
};

PS._buildExportFlagBtn = function(code, flagUrl, mode) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'stg-lang-flag';
    btn.setAttribute('data-lang', code);
    var I = window.PDM && window.PDM.I18n;
    var label = I && typeof I.getLocaleDisplayLabel === 'function'
        ? I.getLocaleDisplayLabel(code)
        : code;
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
    if (mode === 'multi') {
        btn.setAttribute('role', 'checkbox');
        btn.setAttribute('aria-checked', 'false');
    } else {
        btn.setAttribute('aria-pressed', 'false');
    }
    var img = document.createElement('img');
    img.src = flagUrl || ('assets/images/flags/' + code + '.svg');
    img.alt = '';
    img.width = 64;
    img.height = 42;
    btn.appendChild(img);
    return btn;
};

PS._ensureExportLanguageInI18n = function(els, langCode) {
    if (!els || !langCode || !els.presetMaximal || !els.presetMaximal.checked || !els.i18nFlags) return;
    var btn = els.i18nFlags.querySelector('[data-lang="' + langCode + '"]');
    if (btn) btn.setAttribute('aria-checked', 'true');
};

PS._exportIncludesI18n = function(els) {
    return !!(els && els.presetMaximal && els.presetMaximal.checked);
};

PS._formatLangLabel = function(code) {
    var I = window.PDM && window.PDM.I18n;
    if (I && typeof I.getLocaleDisplayLabel === 'function') {
        return I.getLocaleDisplayLabel(code);
    }
    var meta = I && typeof I.getLocaleMeta === 'function' ? I.getLocaleMeta(code) : null;
    var label = meta && meta.nativeLabel ? meta.nativeLabel : code;
    return label + ' (' + code + ')';
};

PS._exportModalState = function(els) {
    var preset = (els.presetMaximal && els.presetMaximal.checked) ? 'maximal' : 'minimal';
    var lang = els.langFlags && els.langFlags.querySelector('.is-active');
    var language = lang ? lang.getAttribute('data-lang') : (window.PDM.Storage.getLanguage ? window.PDM.Storage.getLanguage() : 'fr');
    var includeI18n = PS._exportIncludesI18n(els);
    var i18nLangs = [];
    if (includeI18n && els.i18nFlags) {
        var checked = els.i18nFlags.querySelectorAll('[aria-checked="true"]');
        for (var i = 0; i < checked.length; i++) {
            var c = checked[i].getAttribute('data-lang');
            if (c) i18nLangs.push(c);
        }
        if (language && i18nLangs.indexOf(language) < 0) {
            i18nLangs.unshift(language);
        }
    }
    var label = els.labelInput ? String(els.labelInput.value || '').trim() : '';
    if (typeof PS.normalizeProfileLabel === 'function') {
        label = PS.normalizeProfileLabel(label);
    }
    var cleanArchive = !!(els.cleanPure && els.cleanPure.checked);
    return {
        preset: preset,
        language: language,
        includeI18n: includeI18n,
        i18nLangs: i18nLangs,
        label: label,
        cleanArchive: cleanArchive
    };
};

PS._estimateExportBytes = function(state) {
    var PBE = window.PDM && window.PDM.ProfileBundleExport;
    if (PBE && typeof PBE.buildFileMap === 'function') {
        var promptLocales = PS._exportPromptLocales(state);
        var built = PBE.buildFileMap({
            label: state.label || PS.getActiveLabel(),
            language: state.language,
            includeI18n: state.includeI18n,
            i18nLangs: state.i18nLangs,
            promptLocales: promptLocales,
            customProfile: true,
            cleanArchive: !!state.cleanArchive
        });
        var total = 0;
        var files = built.files || {};
        for (var k in files) {
            if (Object.prototype.hasOwnProperty.call(files, k)) total += String(files[k]).length;
        }
        return total;
    }
    return 0;
};

PS._exportPromptLocales = function(state) {
    state = state || {};
    var locales = [state.language || 'fr'];
    var S = window.PDM && window.PDM.Storage;
    var PBun = window.PDM && window.PDM.PromptsBundle;
    var profileId = S && S.getActiveProfile ? S.getActiveProfile() : '';
    if (PBun && typeof PBun.getExportLocales === 'function') {
        locales = PBun.getExportLocales(profileId, locales);
    }
    if (state.includeI18n && Array.isArray(state.i18nLangs)) {
        for (var i = 0; i < state.i18nLangs.length; i++) {
            if (locales.indexOf(state.i18nLangs[i]) < 0) locales.push(state.i18nLangs[i]);
        }
    }
    return locales;
};


})();
