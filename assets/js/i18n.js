/**
 * PromptDeMerde.com — i18n.js
 *
 * Synopsis : Module i18n alimenté par assets/i18n/ui/ (projet) ou bundle user importé.
 * Objectif : Traduire l'UI selon pdm_language ; PDM.I18n.t(), apply(), localechange.
 */
(function() {

var I18n = {};
var _locale = 'fr';
var _dict = {};
var _frDict = null;
var _enDict = null;
var _ready = null;
var _manifest = null;
var _manifestPromise = null;

var _configDicts = null;
var _configLangs = null;
var _configMode = false;
var _maintenance = false;
var _partsProfileId = null;
var _partsUiManifest = null;
var _userI18nBundleActive = false;

var IL = window.PDM && window.PDM.I18nLocales;
if (!IL) {
    console.warn('[i18n] I18nLocales manquant — chargez i18n-locales.js avant i18n.js');
}
var KNOWN_LOCALES = IL ? IL.KNOWN_LOCALES : {};
var GLOBE_FLAG = IL ? IL.GLOBE_FLAG : 'assets/images/flags/globe.svg';
var localeMetaFor = IL ? IL.localeMetaFor : function(code) {
    return { code: code, nativeLabel: code, englishLabel: code, dir: 'ltr', profileLang: code, flag: GLOBE_FLAG };
};
var localeDisplayLabel = IL ? IL.localeDisplayLabel : function(meta) {
    if (!meta) return '';
    return meta.nativeLabel || meta.code || '';
};

I18n.LOCALES = ['fr', 'en', 'ar', 'zh', 'eo', 'es', 'de', 'pt', 'it', 'ru', 'ja', 'ko'];
I18n.LOCALE_LIST = [];
I18n.DEFAULT_LOCALE = 'fr';
I18n.FALLBACK_LOCALE = 'en';

I18n.useConfig = function(config, options) {
    options = options || {};
    if (!config || typeof config !== 'object' || !config.i18n || typeof config.i18n !== 'object') {
        return false;
    }
    _configDicts = config.i18n;
    _configLangs = Array.isArray(config.langs) && config.langs.length
        ? config.langs.slice()
        : Object.keys(config.i18n);
    _configMode = true;
    _userI18nBundleActive = !!options.userBundle;

    I18n.LOCALES = _configLangs.slice();
    I18n.LOCALE_LIST = _configLangs.map(localeMetaFor);
    I18n.PRIMARY_FLAG_LOCALES = _configLangs.slice();
    _manifest = null;
    if (I18n.LOCALES.indexOf('fr') >= 0) I18n.DEFAULT_LOCALE = 'fr';
    else I18n.DEFAULT_LOCALE = _configLangs[0];
    I18n.FALLBACK_LOCALE = I18n.LOCALES.indexOf('en') >= 0 ? 'en' : I18n.DEFAULT_LOCALE;

    _frDict = _configDicts[I18n.DEFAULT_LOCALE] || _configDicts.fr || null;
    _enDict = _configDicts[I18n.FALLBACK_LOCALE] || _configDicts.en || null;
    return true;
};

I18n.isConfigMode = function() { return _configMode; };
I18n.isUserI18nBundle = function() { return _userI18nBundleActive; };
I18n.isMaintenance = function() { return _maintenance; };

function isValidUiI18n(i18n) {
    if (!i18n || typeof i18n !== 'object') return false;
    var keys = Object.keys(i18n);
    if (!keys.length) return false;
    for (var i = 0; i < keys.length; i++) {
        var dict = i18n[keys[i]];
        if (dict && typeof dict === 'object' && Object.keys(dict).length > 0) {
            return true;
        }
    }
    return false;
}

function isValidProfileJson(json) {
    return !!(json && typeof json === 'object' && json.type === 'pdm-config'
        && typeof json.pdm_provider === 'string');
}

function bootLocaleForPrompts() {
    try {
        var S = window.PDM && window.PDM.Storage;
        if (S && typeof S.getLanguage === 'function') {
            var lang = String(S.getLanguage() || '').trim();
            if (lang) return normalizeLocale(lang);
        }
    } catch (e) {}
    return normalizeLocale(I18n.DEFAULT_LOCALE || 'fr');
}

function fetchProfileJsonLegacy(id) {
    return fetch(configProfileUrl(id), { cache: 'no-store' })
        .then(function(res) {
            if (!res.ok) throw new Error('profil HTTP ' + res.status);
            return res.json();
        })
        .then(function(json) {
            if (!isValidProfileJson(json)) throw new Error('profil JSON invalide');
            return { id: id, config: json, bundle: null };
        });
}

function fetchProfileBundle(id) {
    var PB = window.PDM && window.PDM.ProfileBundle;
    if (!PB || typeof PB.loadFromUrl !== 'function') {
        return fetchProfileJsonLegacy(id);
    }
    return PB.loadFromUrl(id, bootLocaleForPrompts()).then(function(bundle) {
        if (!bundle || !bundle.assembled) throw new Error('profil bundle invalide');
        var cfg = bundle.assembled;
        var PBun = window.PDM && window.PDM.PromptsBundle;
        if (PBun && typeof PBun.mergeLoadedConfig === 'function') {
            cfg = PBun.mergeLoadedConfig(cfg, bundle, id);
        }
        return { id: id, config: cfg, bundle: bundle };
    }).catch(function(err) {
        var msg = err && err.message ? err.message : String(err);
        throw new Error('[' + id + '] ' + msg);
    });
}

function projectI18nManifestUrl() {
    try {
        return new URL('assets/i18n/manifest.json', document.baseURI).toString();
    } catch (e) {
        return 'assets/i18n/manifest.json';
    }
}

function projectI18nLangUrl(lang) {
    try {
        return new URL('assets/i18n/ui/' + lang + '.json', document.baseURI).toString();
    } catch (e) {
        return 'assets/i18n/ui/' + lang + '.json';
    }
}

function projectSitePagesLangUrl(lang) {
    try {
        return new URL('assets/i18n/site-pages/' + lang + '.json', document.baseURI).toString();
    } catch (e) {
        return 'assets/i18n/site-pages/' + lang + '.json';
    }
}

function fetchSitePagesOverlay(lang) {
    if (!lang) return Promise.resolve(null);
    return fetch(projectSitePagesLangUrl(lang), { cache: 'no-store' })
        .then(function(res) {
            if (!res.ok) return null;
            return res.json();
        })
        .catch(function() { return null; });
}

function mergeSitePagesIntoDict(dict, sitePages) {
    if (!dict || typeof dict !== 'object') return dict;
    if (!sitePages || typeof sitePages !== 'object' || !sitePages.pages) return dict;
    dict.pages = shallowMergeDict(dict.pages || {}, sitePages.pages);
    return dict;
}

function profileUiOverrideUrl(profileId, lang) {
    try {
        return new URL('assets/profiles/' + profileId + '/parts/ui-overrides/' + lang + '.json', document.baseURI).toString();
    } catch (e) {
        return 'assets/profiles/' + profileId + '/parts/ui-overrides/' + lang + '.json';
    }
}

function bundledProfileManifestUrl(profileId) {
    try {
        return new URL('assets/profiles/' + profileId + '/manifest.json', document.baseURI).toString();
    } catch (e) {
        return 'assets/profiles/' + profileId + '/manifest.json';
    }
}

function fetchBundledProfileManifest(profileId) {
    if (!profileId) return Promise.resolve(null);
    return fetch(bundledProfileManifestUrl(profileId), { cache: 'no-store' })
        .then(function(res) { return res.ok ? res.json() : null; })
        .catch(function() { return null; });
}

function profileUiOverrideLangs(manifest) {
    if (!manifest || !Array.isArray(manifest.uiOverrides) || !manifest.uiOverrides.length) {
        return null;
    }
    var out = [];
    for (var i = 0; i < manifest.uiOverrides.length; i++) {
        var loc = String(manifest.uiOverrides[i] || '').trim();
        if (loc && out.indexOf(loc) < 0) out.push(loc);
    }
    return out.length ? out : null;
}

function shallowMergeDict(base, override) {
    if (!base || typeof base !== 'object') return override || {};
    if (!override || typeof override !== 'object') return base;
    var out = {};
    var k;
    for (k in base) {
        if (Object.prototype.hasOwnProperty.call(base, k)) out[k] = base[k];
    }
    for (k in override) {
        if (!Object.prototype.hasOwnProperty.call(override, k)) continue;
        if (override[k] && typeof override[k] === 'object' && !Array.isArray(override[k]) &&
            out[k] && typeof out[k] === 'object' && !Array.isArray(out[k])) {
            out[k] = shallowMergeDict(out[k], override[k]);
        } else {
            out[k] = override[k];
        }
    }
    return out;
}

function fetchProfileUiOverride(profileId, lang) {
    if (!profileId || !lang) return Promise.resolve(null);
    return fetch(profileUiOverrideUrl(profileId, lang), { cache: 'no-store' })
        .then(function(res) {
            if (!res.ok) return null;
            return res.json();
        })
        .catch(function() { return null; });
}

function tryStoredI18nBundle() {
    var S = window.PDM && window.PDM.Storage;
    if (!S || typeof S.getI18nBundle !== 'function') return null;
    return S.getI18nBundle();
}

function applyStoredUserBundle() {
    var bundle = tryStoredI18nBundle();
    if (!bundle || !bundle.i18n) return false;
    return I18n.useConfig(bundle, { userBundle: true });
}

I18n.rehydrateUserBundleFromStorage = function() {
    if (!applyStoredUserBundle()) return false;
    _manifest = null;
    return true;
};

function applyPartsUiManifest(manifest) {
    if (!manifest || typeof manifest !== 'object') return;
    _partsUiManifest = manifest;
    if (manifest.default) I18n.DEFAULT_LOCALE = manifest.default;
    if (manifest.fallback) I18n.FALLBACK_LOCALE = manifest.fallback;
    if (Array.isArray(manifest.primaryFlags) && manifest.primaryFlags.length) {
        I18n.PRIMARY_FLAG_LOCALES = manifest.primaryFlags.slice();
    }
}

I18n.loadProfileParts = function(profileId) {
    profileId = String(profileId || activeProfileId() || I18n.getBootProfileId() || '').trim();
    _partsProfileId = profileId;

    if (applyStoredUserBundle()) {
        _partsProfileId = profileId;
        var stored = tryStoredI18nBundle();
        return Promise.resolve({
            source: 'user',
            langs: _configLangs,
            i18n: stored ? stored.i18n : _configDicts
        });
    }

    _userI18nBundleActive = false;
    return fetchBundledProfileManifest(profileId).then(function(profileManifest) {
        var overrideLangs = profileUiOverrideLangs(profileManifest);
        return fetch(projectI18nManifestUrl(), { cache: 'no-store' })
            .then(function(res) {
                if (!res.ok) throw new Error('i18n manifest HTTP ' + res.status);
                return res.json();
            })
            .then(function(manifest) {
                applyPartsUiManifest(manifest);
                var langs = (manifest && Array.isArray(manifest.langs) && manifest.langs.length)
                    ? manifest.langs.slice()
                    : I18n.LOCALES.slice();
                return Promise.all(langs.map(function(lang) {
                    return fetch(projectI18nLangUrl(lang), { cache: 'no-store' })
                        .then(function(res) {
                            if (!res.ok) throw new Error('i18n/ui/' + lang + ' HTTP ' + res.status);
                            return res.json();
                        })
                        .then(function(dict) {
                            return fetchSitePagesOverlay(lang).then(function(sitePages) {
                                var merged = mergeSitePagesIntoDict(dict, sitePages);
                                if (!overrideLangs || overrideLangs.indexOf(lang) < 0) {
                                    return { lang: lang, dict: merged };
                                }
                                return fetchProfileUiOverride(profileId, lang).then(function(ov) {
                                    return {
                                        lang: lang,
                                        dict: ov ? shallowMergeDict(merged, ov) : merged
                                    };
                                });
                            });
                        });
                })).then(function(results) {
                    var i18n = {};
                    for (var i = 0; i < results.length; i++) {
                        i18n[results[i].lang] = results[i].dict;
                    }
                    if (!I18n.useConfig({ langs: langs, i18n: i18n })) {
                        throw new Error('useConfig project i18n');
                    }
                    return { source: 'project', langs: langs, i18n: i18n };
                });
            });
    });
};

function mergeExportDictSources() {
    var merged = {};
    if (window.PDM && window.PDM.Storage && typeof window.PDM.Storage.getI18nBundle === 'function') {
        var stored = window.PDM.Storage.getI18nBundle();
        if (stored && stored.i18n && typeof stored.i18n === 'object') {
            var sk = Object.keys(stored.i18n);
            for (var s = 0; s < sk.length; s++) {
                merged[sk[s]] = stored.i18n[sk[s]];
            }
        }
    }
    if (_configDicts && typeof _configDicts === 'object') {
        var mk = Object.keys(_configDicts);
        for (var m = 0; m < mk.length; m++) {
            merged[mk[m]] = _configDicts[mk[m]];
        }
    }
    return merged;
}

I18n.getExportBundle = function(langCodes) {
    var codes = Array.isArray(langCodes) ? langCodes.slice() : [];
    if (!codes.length) return null;
    var dictSource = (_userI18nBundleActive) ? mergeExportDictSources() : _configDicts;
    if (!dictSource || typeof dictSource !== 'object') return null;
    var i18n = {};
    var langs = [];
    for (var i = 0; i < codes.length; i++) {
        var c = String(codes[i] || '').trim();
        if (!c || !dictSource[c]) continue;
        i18n[c] = dictSource[c];
        langs.push(c);
    }
    if (!langs.length) return null;
    return { langs: langs, i18n: i18n };
};

I18n.enterMaintenance = function() {
    _maintenance = true;
    var loader = document.getElementById('loader');
    if (loader) loader.hidden = true;
    var nav = document.getElementById('main-nav');
    if (nav) nav.hidden = true;
    var footer = document.querySelector('footer');
    if (footer) footer.hidden = true;
    var notif = document.getElementById('notif-box');
    if (notif) notif.hidden = true;
    var sections = document.querySelectorAll('.section');
    for (var i = 0; i < sections.length; i++) {
        sections[i].classList.remove('active');
        if (sections[i].id !== 'section-maintenance') {
            sections[i].hidden = true;
        }
    }
    var maint = document.getElementById('section-maintenance');
    if (maint) {
        maint.hidden = false;
        maint.classList.add('active');
    }
    document.documentElement.setAttribute('data-pdm-maintenance', '1');
};

function getNested(obj, key) {
    if (!obj || !key) return undefined;
    var parts = String(key).split('.');
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
        if (cur == null || typeof cur !== 'object') return undefined;
        cur = cur[parts[i]];
    }
    return cur;
}

function interpolate(str, vars) {
    if (typeof str !== 'string') return str;
    if (!vars) return str;
    var out = str.replace(/\{\{(\w+)\}\}/g, function(_, k) {
        return vars[k] != null ? String(vars[k]) : '';
    });
    // Anti-fuite résiduelle
    return out.replace(/\{\{\w+\}\}/g, '');
}

I18n.t = function(key, vars) {
    var val = getNested(_dict, key);
    if (val == null && _locale !== I18n.FALLBACK_LOCALE && _enDict) {
        val = getNested(_enDict, key);
    }
    if (val == null && _locale !== I18n.DEFAULT_LOCALE && _frDict) {
        val = getNested(_frDict, key);
    }
    if (typeof val === 'string') return interpolate(val, vars);
    if (typeof val === 'number' || typeof val === 'boolean') return String(val);
    return key;
};

I18n.tHtml = function(key, vars) {
    return I18n.t(key, vars);
};

I18n.getLocale = function() {
    return _locale;
};

function getCopyEntry(dict, key) {
    var copy = getNested(dict, 'copy');
    if (copy && typeof copy === 'object' && copy[key] != null) return copy[key];
    return undefined;
}

I18n.getCopy = function(key) {
    var val = getCopyEntry(_dict, key);
    if (val == null && _locale !== I18n.FALLBACK_LOCALE && _enDict) {
        val = getCopyEntry(_enDict, key);
    }
    if (val == null && _locale !== I18n.DEFAULT_LOCALE && _frDict) {
        val = getCopyEntry(_frDict, key);
    }
    if (typeof val === 'string') return interpolate(val, null);
    if (typeof val === 'number' || typeof val === 'boolean') return String(val);
    return '';
};

I18n.getWorkspaceUiTexts = function() {
    var texts = getNested(_dict, 'workspaceUi');
    if (texts && typeof texts === 'object') return texts;
    if (_enDict && _locale !== I18n.FALLBACK_LOCALE) {
        texts = getNested(_enDict, 'workspaceUi');
        if (texts && typeof texts === 'object') return texts;
    }
    if (_frDict) return getNested(_frDict, 'workspaceUi') || {};
    return {};
};

I18n.getThemeFamilies = function() {
    return getNested(_dict, 'themes.families') || {};
};

I18n.getThemeModeLabel = function(mode) {
    return I18n.t('themes.' + mode);
};

I18n.getEnvLabel = function(env) {
    var map = { prod: 'env.prod', preprod: 'env.preprod', selfhosted: 'env.selfhosted' };
    return I18n.t(map[env] || 'env.selfhosted');
};

I18n.getFooterProjects = function() {
    var list = getNested(_dict, 'footer.projects');
    if (Array.isArray(list) && list.length) return list;
    if (_enDict && _locale !== I18n.FALLBACK_LOCALE) {
        list = getNested(_enDict, 'footer.projects');
        if (Array.isArray(list) && list.length) return list;
    }
    if (_frDict) {
        list = getNested(_frDict, 'footer.projects');
        if (Array.isArray(list) && list.length) return list;
    }
    return [];
};

I18n.getLandingDemoPairs = function() {
    var list = getNested(_dict, 'landing.demoPairs');
    if (Array.isArray(list) && list.length) return list;
    if (_enDict) {
        list = getNested(_enDict, 'landing.demoPairs');
        if (Array.isArray(list) && list.length) return list;
    }
    if (_frDict) {
        list = getNested(_frDict, 'landing.demoPairs');
        if (Array.isArray(list) && list.length) return list;
    }
    return [];
};

I18n.getLandingHtml = function() {
    var html = I18n.t('landing.html');
    if (typeof html === 'string' && html !== 'landing.html' && html.length > 100) return html;
    if (_locale !== I18n.FALLBACK_LOCALE && _enDict) {
        html = getNested(_enDict, 'landing.html');
        if (typeof html === 'string' && html.length > 100) return html;
    }
    if (_frDict) {
        html = getNested(_frDict, 'landing.html');
        if (typeof html === 'string' && html.length > 100) return html;
    }
    return '';
};

function fetchLocale(locale) {
    if (_configMode) {
        var dict = _configDicts && _configDicts[locale];
        if (dict) return Promise.resolve(dict);
        if (_userI18nBundleActive) {
            return Promise.reject(new Error('locale absente du bundle importé : ' + locale));
        }
        return Promise.reject(new Error('locale absente : ' + locale));
    }
    return Promise.reject(new Error('i18n non initialisé'));
}

function normalizeLocale(locale) {
    locale = String(locale || '').trim();
    if (!locale) locale = I18n.DEFAULT_LOCALE;
    if (_configMode && _configLangs && _configLangs.length) {
        if (_configLangs.indexOf(locale) >= 0) return locale;
        if (_userI18nBundleActive) {
            if (_configLangs.indexOf(I18n.DEFAULT_LOCALE) >= 0) return I18n.DEFAULT_LOCALE;
            if (_configLangs.indexOf(I18n.FALLBACK_LOCALE) >= 0) return I18n.FALLBACK_LOCALE;
            return _configLangs[0];
        }
        return locale;
    }
    return I18n.LOCALES.indexOf(locale) >= 0 ? locale : I18n.DEFAULT_LOCALE;
}

I18n.getLocaleMeta = function(code) {
    code = code || _locale;
    if (I18n.LOCALE_LIST.length) {
        for (var i = 0; i < I18n.LOCALE_LIST.length; i++) {
            if (I18n.LOCALE_LIST[i].code === code) return I18n.LOCALE_LIST[i];
        }
    }
    return localeMetaFor(code);
};

I18n.getLocaleDisplayLabel = function(code) {
    return localeDisplayLabel(I18n.getLocaleMeta(code));
};

I18n.getProfileLang = function() {
    var meta = I18n.getLocaleMeta(_locale);
    return meta && meta.profileLang ? meta.profileLang : (_locale === 'fr' ? 'fr' : 'en');
};

I18n.loadManifest = function() {
    if (_configMode) {
        _manifest = {
            locales: I18n.LOCALE_LIST.slice(),
            primaryFlags: I18n.LOCALES.slice(),
            default: I18n.DEFAULT_LOCALE,
            fallback: I18n.FALLBACK_LOCALE
        };
        return Promise.resolve(_manifest);
    }
    if (_manifest) return Promise.resolve(_manifest);
    return Promise.resolve(_manifest || {});
};

function ensureFallbackDicts(locale) {
    if (_configMode) {
        if (!_frDict) _frDict = _configDicts[I18n.DEFAULT_LOCALE] || _configDicts.fr || null;
        if (!_enDict) _enDict = _configDicts[I18n.FALLBACK_LOCALE] || _configDicts.en || null;
        return Promise.resolve();
    }
    var chain = Promise.resolve();
    if (!_frDict) {
        chain = chain.then(function() {
            return fetchLocale(I18n.DEFAULT_LOCALE).then(function(json) { _frDict = json; });
        });
    }
    if (!_enDict && locale !== I18n.FALLBACK_LOCALE) {
        chain = chain.then(function() {
            return fetchLocale(I18n.FALLBACK_LOCALE).then(function(json) { _enDict = json; });
        });
    }
    return chain;
}

I18n.load = function(locale) {
    locale = normalizeLocale(locale);
    return ensureFallbackDicts(locale).then(function() {
        if (_configMode && _configDicts && _configDicts[locale]) {
            _dict = _configDicts[locale];
            return _dict;
        }
        if (locale === I18n.DEFAULT_LOCALE && _frDict) {
            _dict = _frDict;
            return _dict;
        }
        if (locale === I18n.FALLBACK_LOCALE && _enDict) {
            _dict = _enDict;
            return _dict;
        }
        return fetchLocale(locale).then(function(json) {
            _dict = json;
            return _dict;
        }).catch(function(err) {
            console.warn('[PDM.I18n] locale ' + locale, err);
            _dict = _enDict || _frDict || {};
            return _dict;
        });
    });
};

window.PDM = window.PDM || {};
window.PDM._I18nPriv = {
    getLocale: function() { return _locale; },
    getFrDict: function() { return _frDict; },
    getEnDict: function() { return _enDict; },
    getNested: getNested
};

I18n.applyMeta = function() {
    document.title = I18n.t('meta.title');
    var desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', I18n.t('meta.description'));
    document.documentElement.lang = _locale;
    var meta = I18n.getLocaleMeta(_locale);
    document.documentElement.dir = meta && meta.dir ? meta.dir : 'ltr';
    try {
        if (window.PDM && window.PDM.SeoMeta && typeof window.PDM.SeoMeta.apply === 'function') {
            window.PDM.SeoMeta.apply();
            window.PDM.SeoMeta.bindHash();
        }
    } catch (e) {  }
};

I18n.finishBoot = function() {
    I18n.rehydrateUserBundleFromStorage();
    var lang = 'fr';
    if (window.PDM && window.PDM.Storage) {
        if (typeof window.PDM.Storage.getLanguage === 'function') {
            lang = window.PDM.Storage.getLanguage();
        } else {
            lang = window.PDM.Storage.get(window.PDM.Storage.KEYS.LANGUAGE) || 'fr';
        }
    }
    lang = normalizeLocale(lang);
    return I18n.setLocale(lang, { silent: true }).then(function() {
        if (window.PDM && window.PDM.Storage &&
            typeof window.PDM.Storage.syncWorkspaceUiTextsForLocale === 'function') {
            window.PDM.Storage.syncWorkspaceUiTextsForLocale();
        }
        I18n.apply(document);
        if (window.PDM && window.PDM.WorkspaceUi && typeof window.PDM.WorkspaceUi.apply === 'function') {
            window.PDM.WorkspaceUi.apply();
        }
        return lang;
    });
};

function activeProfileId() {
    try {
        var S = window.PDM && window.PDM.Storage;
        if (S && S.KEYS && typeof S.get === 'function') {
            var id = S.get(S.KEYS.ACTIVE_PROFILE);
            if (id && /^[a-z0-9-]+$/i.test(id)) return id;
        }
    } catch (e) {}
    return '';
}

function configProfileUrl(id) {
    try {
        return new URL('assets/profiles/' + id + '/parts/config.json', document.baseURI).toString();
    } catch (e) {
        return 'assets/profiles/' + id + '/parts/config.json';
    }
}

function fetchManifestForBoot() {
    var url = 'lib/api/manifest.php';
    if (window.PDM && window.PDM.Env && typeof window.PDM.Env.getServerPath === 'function') {
        url = window.PDM.Env.getServerPath('profileManifest') || url;
    }
    return fetch(url, { cache: 'no-store' })
        .then(function(res) {
            if (!res.ok) return null;
            return res.json();
        })
        .catch(function() { return null; });
}

function buildProfileTryOrder(manifest, activeId) {
    var ids = [];
    var seen = {};
    var entryIds = [];
    var i;
    function push(id) {
        id = String(id || '').trim();
        if (!id || seen[id]) return;
        seen[id] = true;
        ids.push(id);
    }
    if (manifest && Array.isArray(manifest.profiles)) {
        for (i = 0; i < manifest.profiles.length; i++) {
            if (manifest.profiles[i] && manifest.profiles[i].id) {
                entryIds.push(String(manifest.profiles[i].id));
            }
        }
    }
    if (entryIds.length > 0) {
        if (entryIds.indexOf(activeId) >= 0) push(activeId);
        if (manifest && manifest.defaultProfileId && entryIds.indexOf(manifest.defaultProfileId) >= 0) {
            push(manifest.defaultProfileId);
        }
        for (i = 0; i < manifest.profiles.length; i++) {
            var entry = manifest.profiles[i];
            if (entry && entry.default && entryIds.indexOf(entry.id) >= 0) push(entry.id);
        }
        for (i = 0; i < entryIds.length; i++) push(entryIds[i]);
        return ids;
    }
    if (activeId) push(activeId);
    return ids;
}

function fetchProfileJson(id) {
    return fetchProfileBundle(id).then(function(result) {
        return result.config;
    });
}

function tryLoadProfileJsonIds(ids) {
    var idx = 0;
    var lastErr = null;
    function next() {
        if (idx >= ids.length) {
            var detail = lastErr && lastErr.message ? lastErr.message : 'aucun profil bundle valide';
            return Promise.reject(new Error(detail));
        }
        var id = ids[idx++];
        return fetchProfileBundle(id).then(function(result) {
            return { id: id, config: result.config, bundle: result.bundle };
        }).catch(function(err) {
            lastErr = err;
            return next();
        });
    }
    return next();
}

function manifestBundledIds(manifest) {
    var ids = [];
    if (manifest && Array.isArray(manifest.profiles)) {
        for (var i = 0; i < manifest.profiles.length; i++) {
            var p = manifest.profiles[i];
            if (p && p.id) ids.push(String(p.id));
        }
    }
    return ids;
}

function manifestSynopsisForId(manifest, id) {
    var SR = window.PDM && window.PDM.SynopsisResolve;
    if (SR && typeof SR.resolveBundledProfileSynopsis === 'function') {
        var resolved = SR.resolveBundledProfileSynopsis(id);
        if (resolved) return resolved;
    }
    if (!manifest || !Array.isArray(manifest.profiles)) return '';
    for (var i = 0; i < manifest.profiles.length; i++) {
        var p = manifest.profiles[i];
        if (p && p.id === id && p.synopsis) return String(p.synopsis);
    }
    return '';
}

function reconcileBootProfile(manifest, loadedId, config) {
    var S = window.PDM && window.PDM.Storage;
    if (!S || !config || !loadedId) return;

    var storedId = activeProfileId();
    if (S.isCustomProfileId && S.isCustomProfileId(storedId)) {
        return;
    }

    var bundledIds = manifestBundledIds(manifest);
    var storedInBundle = bundledIds.length === 0 || bundledIds.indexOf(storedId) >= 0;
    var cfg = JSON.parse(JSON.stringify(config));
    cfg.pdm_active_profile = loadedId;

    var mustApply = !storedInBundle || storedId !== loadedId;
    if (!mustApply) {
        var fp = S.computeProfileBundleFingerprint(cfg);
        mustApply = S.getProfileBundleFingerprint() !== fp;
    }
    if (!mustApply) return;

    S.applyProfileBundle(cfg);
    var syn = manifestSynopsisForId(manifest, loadedId);
    if (syn && typeof S.setProfileSynopsis === 'function') {
        S.setProfileSynopsis(syn);
        if (typeof I18n.getProfileLang === 'function') {
            S.set('pdm_profile_synopsis_lang', I18n.getProfileLang());
        }
    }
}

var _bootManifest = null;
var _bootProfileId = null;

I18n.getBootManifest = function() { return _bootManifest; };
I18n.getBootProfileId = function() { return _bootProfileId; };
I18n.isBundledProfileId = function(id) {
    return manifestBundledIds(_bootManifest).indexOf(String(id || '')) >= 0;
};

function bootCustomProfile(storedActive) {
    var S = window.PDM && window.PDM.Storage;
    if (!S || typeof S.isCustomProfileId !== 'function' || !S.isCustomProfileId(storedActive)) {
        return null;
    }
    var cp = S.getCustomProfile(storedActive);
    if (!cp || !cp.config) return null;

    _bootProfileId = storedActive;
    var cfg = JSON.parse(JSON.stringify(cp.config));
    delete cfg.i18n;
    delete cfg.langs;
    cfg.pdm_active_profile = storedActive;
    var locale = bootLocaleForPrompts();
    var PBun = window.PDM && window.PDM.PromptsBundle;
    if (PBun && typeof PBun.applyLocaleOverlay === 'function') {
        var hasLocale = PBun.getLocaleData && PBun.getLocaleData(storedActive, locale);
        cfg = PBun.applyLocaleOverlay(cfg, locale, storedActive);
        if (typeof PBun.setLocaleMeta === 'function') {
            PBun.setLocaleMeta(locale, locale, !hasLocale);
        }
    }
    S.applyProfileBundle(cfg);
    if (cp.synopsis && typeof S.setProfileSynopsis === 'function') {
        S.setProfileSynopsis(cp.synopsis);
    }
    return cp.config;
}

I18n.loadConfigProfile = function() {
    var S = window.PDM && window.PDM.Storage;

    var storedActive = activeProfileId();
    if (S && typeof S.isCustomProfileId === 'function' && S.isCustomProfileId(storedActive)) {
        return fetchManifestForBoot().then(function(manifest) {
            _bootManifest = manifest;
            var customBoot = bootCustomProfile(storedActive);
            if (customBoot) return customBoot;
            return Promise.reject(new Error('profil personnel introuvable'));
        });
    }

    return fetchManifestForBoot().then(function(manifest) {
        _bootManifest = manifest;
        if (!manifest || manifest.runtimeOk === false) {
            return Promise.reject(new Error('profils runtime indisponibles'));
        }
        var ids = buildProfileTryOrder(manifest, activeProfileId());
        if (!ids.length) {
            return Promise.reject(new Error('aucun profil declare'));
        }
        return tryLoadProfileJsonIds(ids);
    }).then(function(result) {
        _bootProfileId = result.id;
        reconcileBootProfile(_bootManifest, result.id, result.config);
        return result.config;
    });
};

I18n.init = function() {
    if (_ready) return _ready;
    _ready = fetchManifestForBoot()
        .then(function(manifest) {
            _bootManifest = manifest;
            if (!manifest || manifest.runtimeOk === false) {
                return Promise.reject(new Error('profils runtime indisponibles'));
            }
            var ids = buildProfileTryOrder(manifest, activeProfileId());
            var uiProfileId = ids.length ? ids[0] : activeProfileId();
            return I18n.loadProfileParts(uiProfileId);
        })
        .then(function() {
            return I18n.loadConfigProfile();
        })
        .then(function(json) {
            if (!json || !I18n.isConfigMode()) {
                I18n.enterMaintenance();
                return Promise.reject(new Error('maintenance'));
            }
        var lang = I18n.DEFAULT_LOCALE;
        if (window.PDM && window.PDM.Storage) {
            if (typeof window.PDM.Storage.getLanguage === 'function') {
                lang = window.PDM.Storage.getLanguage();
            } else {
                lang = window.PDM.Storage.get(window.PDM.Storage.KEYS.LANGUAGE) || I18n.DEFAULT_LOCALE;
            }
        }
        lang = normalizeLocale(lang);
        if (window.PDM && window.PDM.Storage && typeof window.PDM.Storage.set === 'function') {
            var storedLang = window.PDM.Storage.getLanguage ? window.PDM.Storage.getLanguage() : lang;
            if (storedLang !== lang) {
                window.PDM.Storage.set(window.PDM.Storage.KEYS.LANGUAGE, lang);
            }
        }
        return I18n.setLocale(lang, { silent: true });
    }).catch(function(err) {
        I18n.enterMaintenance();
        throw err;
    });
    return _ready;
};

I18n.setLocale = function(locale, opts) {
    opts = opts || {};
    locale = normalizeLocale(locale);
    return I18n.loadManifest().then(function() {
        return I18n.load(locale);
    }).then(function() {
        _locale = locale;
        I18n.applyMeta();
        I18n.apply(document);
        if (!opts.silent) {
            document.dispatchEvent(new CustomEvent('pdm:localechange', {
                detail: { locale: locale }
            }));
        }
        return locale;
    }).catch(function(err) {
        console.warn('[PDM.I18n]', err);
        if (_enDict) {
            _dict = _enDict;
            _locale = I18n.FALLBACK_LOCALE;
        } else if (_frDict) {
            _dict = _frDict;
            _locale = I18n.DEFAULT_LOCALE;
        }
        I18n.applyMeta();
        I18n.apply(document);
        return _locale;
    });
};

I18n.reload = function() {
    _ready = null;
    _configMode = false;
    _configDicts = null;
    _configLangs = null;
    _userI18nBundleActive = false;
    _partsProfileId = null;
    _partsUiManifest = null;
    _manifest = null;
    return I18n.init();
};

window.PDM = window.PDM || {};
window.PDM.I18n = I18n;

})();
