/**
 * PromptDeMerde.com — storage-wipe.js
 *
 * Synopsis : Wipe données utilisateur, tokens provider et caches navigateur PDM.
 * Objectif : Étendre PDM.Storage avec purge, invalidateRuntimeCaches et getToken.
 */
(function(){

var S = window.PDM && window.PDM.Storage;
if (!S) { console.warn('[storage-wipe.js] PDM.Storage not found.'); return; }

S.PDM_AUDIO_DB = 'pdm-audio';
S.PDM_CACHE_PREFIX = 'pdm-';
S.KNOWN_IDB_NAMES = ['pdm-audio', 'parakeet-cache-db'];

S.tokenKey = function(p) { return 'pdm_token_' + p; };

S.userDataKeys = function() {
    var keys = Object.keys(S.KEYS).map(function(k) { return S.KEYS[k]; });
    for (var j = 0; j < S._CONFIG_PROVIDERS.length; j++) {
        var tk = S.tokenKey(S._CONFIG_PROVIDERS[j]);
        if (keys.indexOf(tk) === -1) keys.push(tk);
    }
    for (var e = 0; e < S.EXTRA_KEYS.length; e++) keys.push(S.EXTRA_KEYS[e]);
    for (var l = 0; l < S._LEGACY_CONFIG_KEYS.length; l++) keys.push(S._LEGACY_CONFIG_KEYS[l]);
    return keys;
};

S._scanPdmKeys = function(store) {
    var found = [];
    if (!store) return found;
    try {
        for (var i = store.length - 1; i >= 0; i--) {
            var k = store.key(i);
            if (!k) continue;
            if (k.indexOf(S._PDM_PREFIX) === 0 || k.indexOf(S._DEV_PREFIX) === 0) {
                found.push(k);
            }
        }
    } catch (e) {}
    return found;
};

S._removeKeysFromStores = function(keys) {
    for (var i = 0; i < keys.length; i++) {
        S.remove(keys[i]);
        try { sessionStorage.removeItem(keys[i]); } catch(e) {}
    }
};

S.invalidateRuntimeCaches = function() {
    var PBE = window.PDM && window.PDM.ProfileBundleExport;
    if (PBE && typeof PBE.clearBundledPartsCache === 'function') {
        PBE.clearBundledPartsCache();
    } else if (PBE) {
        PBE._bundledPartsCache = null;
    }
    var M = window.PDM && window.PDM.MarketCatalog;
    if (M && typeof M.reset === 'function') {
        M.reset();
    }
};

S.invalidateSttRuntime = function() {
    var STT = window.PDM && window.PDM.STT;
    if (!STT) return;
    try {
        if (typeof STT.stop === 'function' && STT.isActive && STT.isActive()) {
            STT.stop();
        }
    } catch (e1) {}
    try {
        var engines = STT.engines || STT._engines;
        if (engines) {
            for (var k in engines) {
                if (engines.hasOwnProperty(k) && engines[k] && typeof engines[k].unloadModel === 'function') {
                    try { engines[k].unloadModel(); } catch (e2) {}
                }
            }
        }
    } catch (e3) {}
};

S.wipeCacheStorage = function() {
    if (!window.caches || typeof window.caches.keys !== 'function') {
        return Promise.resolve();
    }
    var prefix = S.PDM_CACHE_PREFIX;
    return window.caches.keys().then(function(keys) {
        var jobs = [];
        for (var i = 0; i < keys.length; i++) {
            if (keys[i] && keys[i].indexOf(prefix) === 0) {
                jobs.push(window.caches.delete(keys[i]));
            }
        }
        return Promise.all(jobs);
    }).catch(function() {});
};

S.deleteIndexedDbByName = function(name) {
    if (!window.indexedDB || !name) return Promise.resolve(false);
    return new Promise(function(resolve) {
        try {
            var req = indexedDB.deleteDatabase(String(name));
            req.onsuccess = function() { resolve(true); };
            req.onerror = function() { resolve(false); };
            req.onblocked = function() { resolve(false); };
        } catch (e) {
            resolve(false);
        }
    });
};

S.wipeIndexedDatabases = function() {
    var known = (S.KNOWN_IDB_NAMES || []).slice();
    var resolveNames = Promise.resolve(known);
    if (window.indexedDB && typeof indexedDB.databases === 'function') {
        resolveNames = indexedDB.databases().then(function(dbs) {
            var map = {};
            var i;
            for (i = 0; i < known.length; i++) map[known[i]] = true;
            if (Array.isArray(dbs)) {
                for (i = 0; i < dbs.length; i++) {
                    var n = dbs[i] && dbs[i].name;
                    if (!n) continue;
                    if (n.indexOf(S.PDM_CACHE_PREFIX) === 0 || n === 'parakeet-cache-db' || n === S.PDM_AUDIO_DB) {
                        map[n] = true;
                    }
                }
            }
            return Object.keys(map);
        }).catch(function() { return known; });
    }
    var AB = window.PDM && window.PDM.StorageAudioBlobs;
    var prep = (AB && typeof AB.close === 'function') ? AB.close() : Promise.resolve();
    return prep.then(function() {
        return resolveNames;
    }).then(function(names) {
        var jobs = [];
        for (var i = 0; i < names.length; i++) {
            (function(dbName) {
                if (dbName === S.PDM_AUDIO_DB && AB && typeof AB.deleteDatabase === 'function') {
                    jobs.push(AB.deleteDatabase().then(function(ok) {
                        if (ok) return true;
                        return S.deleteIndexedDbByName(dbName);
                    }));
                } else {
                    jobs.push(S.deleteIndexedDbByName(dbName));
                }
            })(names[i]);
        }
        return Promise.all(jobs);
    }).catch(function() {});
};

S.wipeBrowserCaches = function() {
    S.invalidateSttRuntime();
    return Promise.all([
        S.wipeCacheStorage(),
        S.wipeIndexedDatabases()
    ]).then(function() { return true; }).catch(function() { return false; });
};

S.wipeAllUserData = function(options) {
    options = options || {};
    var preservedCustom = options.preserveCustomProfiles
        ? S.get(S.KEYS.CUSTOM_PROFILES)
        : null;
    var keys = {};
    var known = S.userDataKeys();
    for (var i = 0; i < known.length; i++) keys[known[i]] = true;
    var scanned = S._scanPdmKeys(localStorage).concat(S._scanPdmKeys(sessionStorage));
    for (var j = 0; j < scanned.length; j++) keys[scanned[j]] = true;
    for (var b = 0; b < S.LEGACY_KEYS.length; b++) keys[S.LEGACY_KEYS[b]] = true;
    S._removeKeysFromStores(Object.keys(keys));
    if (preservedCustom != null) {
        S.set(S.KEYS.CUSTOM_PROFILES, preservedCustom);
    }
    S.invalidateRuntimeCaches();
};

S.getToken = function(p) {
    var v = S.get(S.tokenKey(p));
    return v != null ? String(v) : '';
};
S.setToken = function(p, t) {
    return S.set(S.tokenKey(p), t != null ? String(t) : '');
};

S.getProvider = function() {
    var v = S.get(S.KEYS.PROVIDER);
    if (v) return String(v);
    if (window.PDM && window.PDM.Env && typeof window.PDM.Env.getDefaultProvider === 'function') {
        return window.PDM.Env.getDefaultProvider();
    }
    return S._CONFIG_PROVIDERS[0] || 'ollama';
};

S.getModel = function() {
    var v = S.get(S.KEYS.MODEL);
    return v != null ? String(v) : '';
};

S.getImageModel = function() {
    var CS = window.PDM && window.PDM.ConfigSchema;
    var def = CS && CS.DEFAULT_IMAGE_MODEL ? String(CS.DEFAULT_IMAGE_MODEL) : 'moondream';
    var v = S.get(S.KEYS.IMAGE_MODEL);
    if (v != null && String(v).trim()) return String(v).trim();
    return def;
};
S.setImageModel = function(model) {
    var CS = window.PDM && window.PDM.ConfigSchema;
    var list = CS && Array.isArray(CS.IMAGE_VISION_MODELS) ? CS.IMAGE_VISION_MODELS : [];
    var def = CS && CS.DEFAULT_IMAGE_MODEL ? String(CS.DEFAULT_IMAGE_MODEL) : 'moondream';
    var id = model != null ? String(model).trim() : '';
    if (!id || (list.length && list.indexOf(id) < 0)) id = def;
    return S.set(S.KEYS.IMAGE_MODEL, id);
};

})();
