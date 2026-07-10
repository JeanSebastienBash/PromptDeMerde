/**
 * PromptDeMerde.com — storage-history.js
 *
 * Synopsis : Historique nettoyages, migration session et purge données.
 * Objectif : Étendre PDM.Storage avec toggle profils, clearAll et clean history.
 */
(function(){

var S = window.PDM && window.PDM.Storage;
if (!S) { console.warn('[storage-history] PDM.Storage not found.'); return; }

var CS = window.PDM && window.PDM.ConfigSchema;

function normAudio(raw) {
    if (CS && CS.normalizeAudioMeta) return CS.normalizeAudioMeta(raw);
    return {
        inputSource: 'manual',
        audioFileName: null,
        audioFileSize: null,
        audioMimeType: null,
        audioLastModified: null,
        audioRef: null
    };
}

function audioRefsFromList(list) {
    var refs = [];
    if (!Array.isArray(list)) return refs;
    for (var i = 0; i < list.length; i++) {
        if (list[i] && list[i].audioRef) refs.push(list[i].audioRef);
    }
    return refs;
}

function deleteAudioRefs(refs) {
    var AB = window.PDM && window.PDM.StorageAudioBlobs;
    if (!AB || !refs || !refs.length) return Promise.resolve();
    var chain = Promise.resolve();
    for (var i = 0; i < refs.length; i++) {
        (function(ref) {
            chain = chain.then(function() { return AB.delete(ref); });
        })(refs[i]);
    }
    return chain;
}

S.syncHistoryAudioOrphans = function() {
    var AB = window.PDM && window.PDM.StorageAudioBlobs;
    if (!AB || !AB.syncOrphans) return Promise.resolve();
    return AB.syncOrphans();
};

S.toggleProfile = function(id) {
    var list = S.getProfiles();
    var idx = -1;
    for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) { idx = i; break; }
    }
    if (idx === -1) return;
    list[idx].active = !list[idx].active;
    S.setProfiles(list);
};

S.clearAll = function() {
    var AB = window.PDM && window.PDM.StorageAudioBlobs;
    if (AB && AB.clearAll) AB.clearAll();
    S.wipeAllUserData();
};

S._dataKeys = S.userDataKeys;

S.migrateSessionToLocal = function() {
    var keys = S.userDataKeys();
    for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        try {
            if (localStorage.getItem(k) !== null) continue;
            var sv = sessionStorage.getItem(k);
            if (sv !== null) localStorage.setItem(k, sv);
        } catch (e) {}
    }
    for (var b = 0; b < S.LEGACY_KEYS.length; b++) {
        try {
            localStorage.removeItem(S.LEGACY_KEYS[b]);
            sessionStorage.removeItem(S.LEGACY_KEYS[b]);
        } catch (e2) {}
    }
    var devPrefix = S._DEV_PREFIX;
    try {
        for (var d = localStorage.length - 1; d >= 0; d--) {
            var dk = localStorage.key(d);
            if (dk && dk.indexOf(devPrefix) === 0) localStorage.removeItem(dk);
        }
    } catch (e3) {}
    S.purgeLegacyImageStorage();
};

S.incHistory = function() {
    var c = parseInt(S.get(S.KEYS.HISTORY) || '0', 10);
    S.set(S.KEYS.HISTORY, c + 1);
};

S.getCleanHistory = function() {
    var h = S.get(S.KEYS.CLEAN_HISTORY);
    if (!Array.isArray(h)) return [];
    var out = [];
    for (var i = 0; i < h.length; i++) {
        var item = S.normalizeCleanEntry(h[i]);
        if (item) out.push(item);
    }
    return out;
};

S.normalizeCleanEntry = function(entry) {
    if (!entry || typeof entry !== 'object') return null;
    var input = entry.input != null ? String(entry.input).trim() : '';
    if (!input) return null;
    var audio = normAudio(entry);
    return {
        id: entry.id || ('h' + Date.now()),
        type: entry.type || 'text',
        at: entry.at || new Date().toISOString(),
        provider: entry.provider != null ? String(entry.provider) : '',
        model: entry.model != null ? String(entry.model) : '',
        input: input,
        output: entry.output != null ? String(entry.output) : '',
        thinking: entry.thinking != null ? String(entry.thinking) : '',
        systemPrompt: entry.systemPrompt != null ? String(entry.systemPrompt) : '',
        systemPromptEffective: entry.systemPromptEffective != null ? String(entry.systemPromptEffective) : '',
        contextPosition: entry.contextPosition || S.getContextPosition(),
        activeContexts: Array.isArray(entry.activeContexts) ? entry.activeContexts : [],
        usage: entry.usage && typeof entry.usage === 'object' ? entry.usage : null,
        duration_ms: entry.duration_ms != null ? entry.duration_ms : 0,
        inputSource: audio.inputSource,
        audioFileName: audio.audioFileName,
        audioFileSize: audio.audioFileSize,
        audioMimeType: audio.audioMimeType,
        audioLastModified: audio.audioLastModified,
        audioRef: audio.audioRef
    };
};

S.setCleanHistory = function(list) {
    if (!Array.isArray(list)) return false;
    var prev = S.getCleanHistory();
    var normalized = [];
    for (var i = 0; i < list.length; i++) {
        var item = S.normalizeCleanEntry(list[i]);
        if (item) normalized.push(item);
    }
    if (normalized.length > S.MAX_CLEAN_HISTORY) {
        normalized = normalized.slice(normalized.length - S.MAX_CLEAN_HISTORY);
    }
    var prevRefs = audioRefsFromList(prev);
    var nextRefs = audioRefsFromList(normalized);
    var removed = [];
    for (var r = 0; r < prevRefs.length; r++) {
        if (nextRefs.indexOf(prevRefs[r]) === -1) removed.push(prevRefs[r]);
    }
    var ok = S.set(S.KEYS.CLEAN_HISTORY, normalized);
    if (ok) S.set(S.KEYS.HISTORY, normalized.length);
    deleteAudioRefs(removed).then(function() {
        S.syncHistoryAudioOrphans();
    });
    return ok;
};

S.addCleanEntry = function(entry) {
    if (!entry || typeof entry !== 'object') return null;
    var list = S.getCleanHistory();
    var item = S.normalizeCleanEntry(entry);
    if (!item) return null;
    item.id = entry.id || ('h' + Date.now() + '-' + list.length);
    item.at = entry.at || new Date().toISOString();
    list.push(item);
    var removedRef = null;
    if (list.length > S.MAX_CLEAN_HISTORY) {
        var dropped = list.slice(0, list.length - S.MAX_CLEAN_HISTORY);
        list = list.slice(list.length - S.MAX_CLEAN_HISTORY);
        if (dropped.length && dropped[0].audioRef) removedRef = dropped[0].audioRef;
    }
    if (!S.set(S.KEYS.CLEAN_HISTORY, list)) return null;
    S.set(S.KEYS.HISTORY, list.length);
    if (removedRef) {
        deleteAudioRefs([removedRef]).then(function() {
            S.syncHistoryAudioOrphans();
        });
    }
    return item;
};

S.deleteCleanEntry = function(id) {
    if (!id) return false;
    var list = S.getCleanHistory();
    var next = [];
    var removed = false;
    var audioRef = null;
    for (var i = 0; i < list.length; i++) {
        if (list[i] && list[i].id === id) {
            removed = true;
            audioRef = list[i].audioRef || null;
            continue;
        }
        next.push(list[i]);
    }
    if (!removed) return false;
    return S.setCleanHistory(next);
};

S.clearCleanHistory = function() {
    var prev = S.getCleanHistory();
    var refs = audioRefsFromList(prev);
    S.setCleanHistory([]);
    deleteAudioRefs(refs);
    return true;
};

S.clearAllHistories = function() {
    return S.clearCleanHistory();
};

})();
