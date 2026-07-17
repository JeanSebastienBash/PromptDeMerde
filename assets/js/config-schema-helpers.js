/**
 * PromptDeMerde.com — config-schema-helpers.js
 *
 * Synopsis : Helpers de type, validation et normalisation atomique (projet, audio, workspace UI).
 * Objectif : Étendre PDM.ConfigSchema avec les prédicats de type et les builders/normalizers unitaires.
 */
(function() {

var CS = window.PDM && window.PDM.ConfigSchema;
if (!CS) { console.warn('[config-schema-helpers] PDM.ConfigSchema not found.'); return; }

CS.buildDefaultProject = function() {
    return {
        platform_url: CS.DEFAULT_PLATFORM_URL,
        name: 'Speech2Texte',
        url: CS.DEFAULT_PLATFORM_URL,
        vitrine_url: 'https://dreamproject.online'
    };
};

CS.normalizeProject = function(raw) {
    var defaults = CS.buildDefaultProject();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return defaults;
    }
    return {
        platform_url: raw.platform_url != null && String(raw.platform_url).trim()
            ? String(raw.platform_url).trim() : defaults.platform_url,
        name: raw.name != null && String(raw.name).trim()
            ? String(raw.name).trim() : defaults.name,
        url: raw.url != null && String(raw.url).trim()
            ? String(raw.url).trim() : defaults.url,
        vitrine_url: raw.vitrine_url != null && String(raw.vitrine_url).trim()
            ? String(raw.vitrine_url).trim() : defaults.vitrine_url
    };
};

CS.emptyAudioMeta = function() {
    return {
        inputSource: 'manual',
        audioFileName: null,
        audioFileSize: null,
        audioMimeType: null,
        audioLastModified: null,
        audioRef: null,
        audioSegmentCount: null
    };
};

CS.normalizeAudioMeta = function(raw, fallbackSource) {
    var out = CS.emptyAudioMeta();
    if (!raw || typeof raw !== 'object') {
        if (fallbackSource === 'audio-file') out.inputSource = 'audio-file';
        else if (fallbackSource === 'audio-dictation') out.inputSource = 'audio-dictation';
        else if (fallbackSource === 'image-file') out.inputSource = 'image-file';
        return out;
    }
    out.inputSource = CS.WORKSPACE_INPUT_SOURCES.indexOf(raw.inputSource) >= 0 ? raw.inputSource : 'manual';
    if (fallbackSource && CS.WORKSPACE_INPUT_SOURCES.indexOf(fallbackSource) >= 0 && out.inputSource === 'manual') {
        out.inputSource = fallbackSource;
    }
    if (out.inputSource === 'manual' && (raw.audioFileName || raw.audioRef)) {
        out.inputSource = raw.audioSegmentCount > 1 ? 'audio-dictation' : 'audio-file';
    }
    out.audioFileName = raw.audioFileName != null ? String(raw.audioFileName) : null;
    out.audioFileSize = (typeof raw.audioFileSize === 'number' && Number.isFinite(raw.audioFileSize))
        ? Math.max(0, Math.floor(raw.audioFileSize)) : null;
    out.audioMimeType = raw.audioMimeType != null ? String(raw.audioMimeType) : null;
    out.audioLastModified = (typeof raw.audioLastModified === 'number' && Number.isFinite(raw.audioLastModified))
        ? Math.floor(raw.audioLastModified) : null;
    out.audioRef = raw.audioRef != null ? String(raw.audioRef) : null;
    out.audioSegmentCount = (typeof raw.audioSegmentCount === 'number' && Number.isFinite(raw.audioSegmentCount))
        ? Math.max(1, Math.floor(raw.audioSegmentCount)) : null;
    if (out.inputSource === 'manual') {
        out.audioFileName = null;
        out.audioFileSize = null;
        out.audioMimeType = null;
        out.audioLastModified = null;
        out.audioRef = null;
        out.audioSegmentCount = null;
    }
    return out;
};

CS.isPlainObject = function(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
};

CS.isStrictBoolean = function(v) {
    return v === true || v === false;
};

/** Hex brand color: empty string (theme fallback) or #RGB / #RRGGBB. */
CS.isBrandHexColor = function(v) {
    if (typeof v !== 'string') return false;
    if (v === '') return true;
    return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(v);
};

CS.isIso8601 = function(v) {
    if (typeof v !== 'string' || !CS._ISO8601_RE.test(v)) return false;
    return !isNaN(Date.parse(v));
};

CS.isHttpUrl = function(v) {
    if (typeof v !== 'string' || !v.length) return false;
    try {
        var u = new URL(v);
        return u.protocol === 'http:' || u.protocol === 'https:';
    } catch (e) {
        return false;
    }
};

CS.hasOnlyKeys = function(obj, allowed) {
    if (!CS.isPlainObject(obj)) return false;
    var set = {};
    for (var i = 0; i < allowed.length; i++) set[allowed[i]] = true;
    for (var k in obj) {
        if (obj.hasOwnProperty(k) && !set[k]) return false;
    }
    return true;
};

CS.validateProfileTag = function(tag, path, errors) {
    if (window.PDM && window.PDM.Profiles && typeof window.PDM.Profiles.validateTag === 'function') {
        var err = window.PDM.Profiles.validateTag(tag);
        if (err) errors.push(path + '.tag : ' + err);
        return;
    }
    if (typeof tag !== 'string' || !/^[A-Z][a-zA-Z0-9]*$/.test(tag)) {
        errors.push(path + '.tag : tag invalide (majuscule initiale, alphanumérique, max 30 car.)');
    }
};

CS.getEnabledProviders = function() {
    if (window.PDM && window.PDM.Env && typeof window.PDM.Env.getEnabledProviders === 'function') {
        return window.PDM.Env.getEnabledProviders();
    }
    return ['ollama'];
};

CS.getDefaultProvider = function() {
    if (window.PDM && window.PDM.Env && typeof window.PDM.Env.getDefaultProvider === 'function') {
        return window.PDM.Env.getDefaultProvider();
    }
    return 'ollama';
};

CS.defaultThemeId = function() {
    return CS.DEFAULT_THEME_ID;
};

CS.buildDefaultWorkspaceUi = function() {
    var out = JSON.parse(JSON.stringify(CS.DEFAULT_WORKSPACE_UI));
    var I = window.PDM && window.PDM.I18n;
    if (I && typeof I.getWorkspaceUiTexts === 'function') {
        var localized = I.getWorkspaceUiTexts();
        if (localized && typeof localized === 'object') {
            for (var ti = 0; ti < CS.WORKSPACE_UI_TEXT_KEYS.length; ti++) {
                var tk = CS.WORKSPACE_UI_TEXT_KEYS[ti];
                if (Object.prototype.hasOwnProperty.call(localized, tk) && localized[tk] != null) {
                    out.texts[tk] = String(localized[tk]);
                }
            }
        }
    }
    return out;
};

CS.normalizeWorkspaceUi = function(raw) {
    var out = CS.buildDefaultWorkspaceUi();
    if (!CS.isPlainObject(raw)) return out;

    var identity = raw.identity;
    if (CS.isPlainObject(identity)) {
        for (var ii = 0; ii < CS.WORKSPACE_UI_IDENTITY_KEYS.length; ii++) {
            var ik = CS.WORKSPACE_UI_IDENTITY_KEYS[ii];
            if (identity[ik] !== undefined && identity[ik] !== null) {
                out.identity[ik] = String(identity[ik]);
            }
        }
    }

    var brand = raw.brand;
    if (CS.isPlainObject(brand)) {
        for (var bi = 0; bi < CS.WORKSPACE_UI_BRAND_KEYS.length; bi++) {
            var bk = CS.WORKSPACE_UI_BRAND_KEYS[bi];
            if (brand[bk] === undefined || brand[bk] === null) continue;
            if (bk === 'showExtension') {
                if (CS.isStrictBoolean(brand.showExtension)) {
                    out.brand.showExtension = brand.showExtension;
                }
            } else {
                out.brand[bk] = String(brand[bk]);
            }
        }
        // Ancien brand sans clés couleur → complète les champs v1.22+ (conserve showExtension).
        if (brand.firstWordColor === undefined && brand.secondWordColor === undefined) {
            if (!String(out.brand.firstWordClass || '').trim()) {
                out.brand.firstWordClass = 'logo-word1';
            }
            out.brand.firstWordColor = '';
            out.brand.secondWordColor = '';
        }
    }

    var texts = raw.texts;
    if (CS.isPlainObject(texts)) {
        for (var ti = 0; ti < CS.WORKSPACE_UI_TEXT_KEYS.length; ti++) {
            var tk = CS.WORKSPACE_UI_TEXT_KEYS[ti];
            if (texts[tk] !== undefined && texts[tk] !== null) {
                out.texts[tk] = String(texts[tk]);
            }
        }
    }

    return out;
};

})();
