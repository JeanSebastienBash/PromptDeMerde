/**
 * PromptDeMerde.com — stt-vosk-catalog.js
 *
 * Manifest runtime des modèles Vosk mini (assets/stt/vosk/catalog.json).
 */
(function() {
var STT = window.PDM.STT;
STT.VoskCatalog = STT.VoskCatalog || {};

var Cat = STT.VoskCatalog;
var CATALOG_URL = 'assets/stt/vosk/catalog.json';

var UI_TO_VOSK = {
    fr: 'fr',
    en: 'en-us',
    ar: 'ar',
    zh: 'cn',
    eo: 'eo',
    es: 'es',
    de: 'de',
    pt: 'pt',
    it: 'it',
    ru: 'ru',
    ja: 'ja',
    ko: 'ko'
};

var TIMEOUTS = {
    standard: { download: 180000, extract: 300000 },
    heavy: { download: 600000, extract: 900000 }
};

var _catalog = null;
var _loadPromise = null;

function catalogUrl() {
    try {
        return new URL(CATALOG_URL, document.baseURI).toString();
    } catch (e) {
        return CATALOG_URL;
    }
}

function normalizeLangId(id) {
    id = String(id != null ? id : '').trim();
    if (!id) return 'fr';
    if (_catalog && _catalog.langs && _catalog.langs[id]) return id;
    return id;
}

function uiLocaleToVoskLang(uiCode) {
    uiCode = String(uiCode || '').trim();
    var mapped = UI_TO_VOSK[uiCode];
    if (!mapped) return null;
    if (_catalog && _catalog.langs && _catalog.langs[mapped]) return mapped;
    return mapped;
}

function formatSizeHint(sizeBytes) {
    var mb = Math.max(1, Math.round((sizeBytes || 0) / 1048576));
    return '~' + mb + ' Mo';
}

function formatLangLabel(entry) {
    if (!entry || !entry.label) return '';
    var native = entry.label.native || '';
    var english = entry.label.en || '';
    var ui = window.PDM && window.PDM.I18n && window.PDM.I18n.getLocale
        ? window.PDM.I18n.getLocale() : 'fr';
    if (ui === 'en' && english) return english;
    if (!english || english === native) return native;
    return native + ' (' + english + ')';
}

function getLangEntry(langId) {
    langId = String(langId != null ? langId : '').trim();
    if (!langId || !_catalog || !_catalog.langs) return null;
    var entry = _catalog.langs[langId];
    if (!entry) return null;
    return Object.assign({ id: langId }, entry);
}

function isLangAvailable(langId) {
    var entry = getLangEntry(langId);
    return !!(entry && entry.available);
}

function isMaxiLangAvailable(langId) {
    var entry = getLangEntry(langId);
    return !!(entry && entry.maxi && entry.maxi.available);
}

function isLangAvailableForTier(langId, tier) {
    if (tier === 'maxi') return isMaxiLangAvailable(langId);
    return isLangAvailable(langId);
}

function listAvailable() {
    var out = [];
    if (!_catalog || !_catalog.langs) return out;
    var keys = Object.keys(_catalog.langs);
    keys.sort(function(a, b) {
        var ea = _catalog.langs[a];
        var eb = _catalog.langs[b];
        if (!!ea.available !== !!eb.available) return ea.available ? -1 : 1;
        return formatLangLabel(ea).localeCompare(formatLangLabel(eb), undefined, { sensitivity: 'base' });
    });
    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        var e = _catalog.langs[id];
        if (e && e.available) out.push(Object.assign({ id: id }, e));
    }
    return out;
}

function listAllLangs() {
    var out = [];
    if (!_catalog || !_catalog.langs) return out;
    var keys = Object.keys(_catalog.langs);
    keys.sort(function(a, b) {
        var ea = _catalog.langs[a];
        var eb = _catalog.langs[b];
        var aa = !!(ea && ea.available);
        var ab = !!(eb && eb.available);
        if (aa !== ab) return aa ? -1 : 1;
        return formatLangLabel(ea).localeCompare(formatLangLabel(eb), undefined, { sensitivity: 'base' });
    });
    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        var e = _catalog.langs[id];
        if (e) out.push(Object.assign({ id: id }, e));
    }
    return out;
}

function getTimeouts(sizeTier) {
    return TIMEOUTS[sizeTier === 'heavy' ? 'heavy' : 'standard'] || TIMEOUTS.standard;
}

function guessMiniModelPath(langId) {
    if (langId === 'fr') return 'assets/stt/vosk-mini/model.tar.gz';
    return 'assets/stt/vosk-mini/' + langId + '/model.tar.gz';
}

function guessMaxiModelPath(langId) {
    if (langId === 'fr') return 'assets/stt/vosk-maxi/model.tar.gz';
    return 'assets/stt/vosk-maxi/' + langId + '/model.tar.gz';
}

function resolveMiniModelConfig(langId) {
    langId = String(langId != null ? langId : '').trim();
    if (!langId) langId = 'fr';
    var entry = getLangEntry(langId);
    if (!entry || !entry.available) {
        var timeouts = TIMEOUTS.standard;
        return {
            voskLangId: langId,
            modelPath: entry && entry.path ? entry.path : guessMiniModelPath(langId),
            sizeBytes: entry && entry.sizeBytes ? entry.sizeBytes : 40894464,
            sizeHint: formatSizeHint(entry && entry.sizeBytes),
            downloadTimeoutMs: timeouts.download,
            extractTimeoutMs: timeouts.extract,
            modelFileHint: entry && entry.path ? entry.path : guessMiniModelPath(langId),
            sizeTier: entry && entry.sizeTier ? entry.sizeTier : 'standard',
            available: false,
            label: entry ? formatLangLabel(entry) : langId
        };
    }
    var timeouts = getTimeouts(entry.sizeTier);
    return {
        voskLangId: entry.id,
        modelPath: entry.path,
        sizeBytes: entry.sizeBytes || TIMEOUTS.standard.download,
        sizeHint: formatSizeHint(entry.sizeBytes),
        downloadTimeoutMs: timeouts.download,
        extractTimeoutMs: timeouts.extract,
        modelFileHint: entry.path,
        sizeTier: entry.sizeTier || 'standard',
        available: true,
        label: formatLangLabel(entry)
    };
}

function resolveMaxiModelConfig(langId) {
    langId = String(langId != null ? langId : '').trim();
    if (!langId) langId = 'fr';
    var entry = getLangEntry(langId);
    var maxi = entry && entry.maxi ? entry.maxi : null;
    if (!maxi || !maxi.available) {
        var fallbackPath = maxi && maxi.path ? maxi.path : guessMaxiModelPath(langId);
        var fallbackSize = maxi && maxi.sizeBytes ? maxi.sizeBytes : 42233136;
        var timeouts = TIMEOUTS.standard;
        return {
            voskLangId: langId,
            modelPath: fallbackPath,
            sizeBytes: fallbackSize,
            sizeHint: formatSizeHint(fallbackSize),
            downloadTimeoutMs: timeouts.download,
            extractTimeoutMs: timeouts.extract,
            modelFileHint: fallbackPath,
            sizeTier: maxi && maxi.sizeTier ? maxi.sizeTier : 'standard',
            available: false,
            label: entry ? formatLangLabel(entry) : langId
        };
    }
    var maxiTimeouts = getTimeouts(maxi.sizeTier);
    return {
        voskLangId: entry.id,
        modelPath: maxi.path,
        sizeBytes: maxi.sizeBytes || maxiTimeouts.download,
        sizeHint: formatSizeHint(maxi.sizeBytes),
        downloadTimeoutMs: maxiTimeouts.download,
        extractTimeoutMs: maxiTimeouts.extract,
        modelFileHint: maxi.path,
        sizeTier: maxi.sizeTier || 'standard',
        available: true,
        label: formatLangLabel(entry)
    };
}

Cat.load = function() {
    if (_catalog) return Promise.resolve(_catalog);
    if (_loadPromise) return _loadPromise;
    _loadPromise = fetch(catalogUrl(), { cache: 'no-store' })
        .then(function(res) {
            if (!res.ok) throw new Error('catalog-http-' + res.status);
            return res.json();
        })
        .then(function(json) {
            _catalog = json && typeof json === 'object' ? json : { langs: {} };
            return _catalog;
        })
        .catch(function(err) {
            console.warn('[VoskCatalog] load failed', err);
            _catalog = {
                version: 1,
                defaultLang: 'fr',
                langs: {
                    fr: {
                        legacy: true,
                        available: true,
                        path: 'assets/stt/vosk-mini/model.tar.gz',
                        sizeBytes: 40894464,
                        sizeTier: 'standard',
                        label: { native: 'Français', en: 'French' },
                        maxi: {
                            legacy: true,
                            available: true,
                            path: 'assets/stt/vosk-maxi/model.tar.gz',
                            sizeBytes: 42233136,
                            sizeTier: 'standard'
                        }
                    }
                }
            };
            return _catalog;
        });
    return _loadPromise;
};

Cat.isReady = function() { return !!_catalog; };
Cat.uiLocaleToVoskLang = uiLocaleToVoskLang;
Cat.normalizeLangId = normalizeLangId;
Cat.getLangEntry = getLangEntry;
Cat.isLangAvailable = isLangAvailable;
Cat.isMaxiLangAvailable = isMaxiLangAvailable;
Cat.isLangAvailableForTier = isLangAvailableForTier;
Cat.listAvailable = listAvailable;
Cat.listAllLangs = listAllLangs;
Cat.formatLangLabel = formatLangLabel;
Cat.formatSizeHint = formatSizeHint;
Cat.getTimeouts = getTimeouts;
Cat.resolveMiniModelConfig = resolveMiniModelConfig;
Cat.resolveMaxiModelConfig = resolveMaxiModelConfig;
Cat.UI_TO_VOSK = UI_TO_VOSK;
Cat.MAXI_LANG_IDS = ['fr', 'en-us'];

})();
