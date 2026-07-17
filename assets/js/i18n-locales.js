/**
 * PromptDeMerde.com — i18n-locales.js
 *
 * Métadonnées des langues UI (drapeaux, RTL, locale prompts).
 */
(function() {

window.PDM = window.PDM || {};

var KNOWN_LOCALES = {
    fr: { code: 'fr', nativeLabel: 'Français', englishLabel: 'French', dir: 'ltr', profileLang: 'fr', flag: 'assets/images/flags/fr.svg' },
    en: { code: 'en', nativeLabel: 'English', englishLabel: 'English', dir: 'ltr', profileLang: 'en', flag: 'assets/images/flags/en.svg' },
    ar: { code: 'ar', nativeLabel: 'العربية', englishLabel: 'Arabic', dir: 'rtl', profileLang: 'ar', flag: 'assets/images/flags/ar.svg' },
    zh: { code: 'zh', nativeLabel: '中文', englishLabel: 'Chinese', dir: 'ltr', profileLang: 'zh', flag: 'assets/images/flags/zh.svg' },
    eo: { code: 'eo', nativeLabel: 'Esperanto', englishLabel: 'Esperanto', dir: 'ltr', profileLang: 'eo', flag: 'assets/images/flags/eo.svg' },
    es: { code: 'es', nativeLabel: 'Español', englishLabel: 'Spanish', dir: 'ltr', profileLang: 'es', flag: 'assets/images/flags/es.svg' },
    de: { code: 'de', nativeLabel: 'Deutsch', englishLabel: 'German', dir: 'ltr', profileLang: 'de', flag: 'assets/images/flags/de.svg' },
    pt: { code: 'pt', nativeLabel: 'Português', englishLabel: 'Portuguese', dir: 'ltr', profileLang: 'pt', flag: 'assets/images/flags/pt.svg' },
    it: { code: 'it', nativeLabel: 'Italiano', englishLabel: 'Italian', dir: 'ltr', profileLang: 'it', flag: 'assets/images/flags/it.svg' },
    ru: { code: 'ru', nativeLabel: 'Русский', englishLabel: 'Russian', dir: 'ltr', profileLang: 'ru', flag: 'assets/images/flags/ru.svg' },
    ja: { code: 'ja', nativeLabel: '日本語', englishLabel: 'Japanese', dir: 'ltr', profileLang: 'ja', flag: 'assets/images/flags/ja.svg' },
    ko: { code: 'ko', nativeLabel: '한국어', englishLabel: 'Korean', dir: 'ltr', profileLang: 'ko', flag: 'assets/images/flags/ko.svg' }
};
var GLOBE_FLAG = 'assets/images/flags/globe.svg';

function localeMetaFor(code) {
    if (KNOWN_LOCALES[code]) return KNOWN_LOCALES[code];
    return { code: code, nativeLabel: code, englishLabel: code, dir: 'ltr', profileLang: code, flag: GLOBE_FLAG };
}

function localeDisplayLabel(meta) {
    if (!meta) return '';
    var native = meta.nativeLabel || meta.code || '';
    var english = meta.englishLabel || meta.code || '';
    if (!english || english === native) return native;
    return native + ' (' + english + ')';
}

window.PDM.I18nLocales = {
    KNOWN_LOCALES: KNOWN_LOCALES,
    GLOBE_FLAG: GLOBE_FLAG,
    localeMetaFor: localeMetaFor,
    localeDisplayLabel: localeDisplayLabel,
    DEFAULT_LOCALES: ['fr', 'en', 'ar', 'zh', 'eo', 'es', 'de', 'pt', 'it', 'ru', 'ja', 'ko']
};

})();
