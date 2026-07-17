/**
 * PromptDeMerde.com — storage-audio-blobs.js
 *
 * Synopsis : Stockage local des fichiers audio importés (IndexedDB).
 * Objectif : Persister les blobs pour relecture historique ; hors export pdm-config.
 */
(function() {

var AB = {};
var DB_NAME = 'pdm-audio';
var DB_VERSION = 1;
var STORE = 'blobs';
var MAX_FILES = 20;
var MAX_BYTES = 100 * 1024 * 1024;

var _dbPromise = null;

function openDb() {
    if (_dbPromise) return _dbPromise;
    _dbPromise = new Promise(function(resolve, reject) {
        if (!window.indexedDB) {
            reject(new Error('IndexedDB indisponible'));
            return;
        }
        var req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onerror = function() { reject(req.error || new Error('IndexedDB open failed')); };
        req.onupgradeneeded = function(ev) {
            var db = ev.target.result;
            if (!db.objectStoreNames.contains(STORE)) {
                var store = db.createObjectStore(STORE, { keyPath: 'ref' });
                store.createIndex('savedAt', 'savedAt', { unique: false });
            }
        };
        req.onsuccess = function() { resolve(req.result); };
    });
    return _dbPromise;
}

function txStore(mode) {
    return openDb().then(function(db) {
        return db.transaction(STORE, mode).objectStore(STORE);
    });
}

function runRequest(req) {
    return new Promise(function(resolve, reject) {
        req.onsuccess = function() { resolve(req.result); };
        req.onerror = function() { reject(req.error || new Error('IndexedDB request failed')); };
    });
}

function normMeta(meta) {
    meta = meta || {};
    return {
        name: meta.name != null ? String(meta.name) : '',
        size: meta.size != null ? Number(meta.size) : 0,
        type: meta.type != null ? String(meta.type) : '',
        lastModified: meta.lastModified != null ? Number(meta.lastModified) : 0
    };
}

function byteSize(blob) {
    return blob && typeof blob.size === 'number' ? blob.size : 0;
}

AB.isAvailable = function() {
    return !!window.indexedDB;
};

AB.put = function(ref, blob, meta) {
    if (!ref || !blob) return Promise.resolve(false);
    var record = {
        ref: String(ref),
        blob: blob,
        meta: normMeta(meta),
        savedAt: Date.now(),
        byteSize: byteSize(blob)
    };
    return txStore('readwrite').then(function(store) {
        return runRequest(store.put(record));
    }).then(function() {
        return AB.enforceQuota();
    }).then(function() { return true; }).catch(function(err) {
        console.warn('[StorageAudioBlobs.put]', err);
        return false;
    });
};

AB.get = function(ref) {
    if (!ref) return Promise.resolve(null);
    return txStore('readonly').then(function(store) {
        return runRequest(store.get(String(ref)));
    }).then(function(row) {
        return row && row.blob ? row.blob : null;
    }).catch(function(err) {
        console.warn('[StorageAudioBlobs.get]', err);
        return null;
    });
};

AB.getMeta = function(ref) {
    if (!ref) return Promise.resolve(null);
    return txStore('readonly').then(function(store) {
        return runRequest(store.get(String(ref)));
    }).then(function(row) {
        if (!row) return null;
        return {
            ref: row.ref,
            meta: row.meta || {},
            savedAt: row.savedAt,
            byteSize: row.byteSize
        };
    }).catch(function() { return null; });
};

AB.delete = function(ref) {
    if (!ref) return Promise.resolve(false);
    return txStore('readwrite').then(function(store) {
        return runRequest(store.delete(String(ref)));
    }).then(function() { return true; }).catch(function(err) {
        console.warn('[StorageAudioBlobs.delete]', err);
        return false;
    });
};

AB.cloneRef = function(fromRef, toRef) {
    if (!fromRef || !toRef || fromRef === toRef) return Promise.resolve(false);
    return AB.get(fromRef).then(function(blob) {
        if (!blob) return false;
        return AB.getMeta(fromRef).then(function(info) {
            var meta = info && info.meta ? info.meta : {};
            return AB.put(toRef, blob, meta);
        });
    });
};

AB.listAll = function() {
    return txStore('readonly').then(function(store) {
        return runRequest(store.getAll());
    }).then(function(rows) {
        return Array.isArray(rows) ? rows : [];
    }).catch(function() { return []; });
};

AB.clearAll = function() {
    return openDb().then(function(db) {
        var names = [];
        try {
            for (var i = 0; i < db.objectStoreNames.length; i++) {
                names.push(db.objectStoreNames[i]);
            }
        } catch (e) {
            names = [STORE];
        }
        if (!names.length) return true;
        return new Promise(function(resolve, reject) {
            var tx = db.transaction(names, 'readwrite');
            tx.oncomplete = function() { resolve(true); };
            tx.onerror = function() { reject(tx.error || new Error('IndexedDB clearAll failed')); };
            tx.onabort = function() { reject(tx.error || new Error('IndexedDB clearAll aborted')); };
            for (var j = 0; j < names.length; j++) {
                tx.objectStore(names[j]).clear();
            }
        });
    }).catch(function(err) {
        console.warn('[StorageAudioBlobs.clearAll]', err);
        return false;
    });
};

AB.close = function() {
    if (!_dbPromise) return Promise.resolve();
    return _dbPromise.then(function(db) {
        try { db.close(); } catch (e) {}
        _dbPromise = null;
    }).catch(function() {
        _dbPromise = null;
    });
};

AB.deleteDatabase = function() {
    if (!window.indexedDB) return Promise.resolve(false);
    return AB.close().then(function() {
        return new Promise(function(resolve) {
            var req = indexedDB.deleteDatabase(DB_NAME);
            req.onsuccess = function() { resolve(true); };
            req.onerror = function() {
                console.warn('[StorageAudioBlobs.deleteDatabase]', req.error);
                resolve(false);
            };
            req.onblocked = function() {
                console.warn('[StorageAudioBlobs.deleteDatabase] blocked');
                resolve(false);
            };
        });
    });
};

AB.enforceQuota = function() {
    return AB.listAll().then(function(rows) {
        rows.sort(function(a, b) { return (a.savedAt || 0) - (b.savedAt || 0); });
        var total = 0;
        for (var i = 0; i < rows.length; i++) total += rows[i].byteSize || 0;
        var chain = Promise.resolve();
        while (rows.length > MAX_FILES || total > MAX_BYTES) {
            var oldest = rows.shift();
            if (!oldest) break;
            total -= oldest.byteSize || 0;
            chain = chain.then(function(ref) {
                return function() { return AB.delete(ref); };
            }(oldest.ref));
        }
        return chain;
    });
};

AB.purgeOrphans = function(validRefs) {
    validRefs = validRefs || [];
    var keep = {};
    for (var i = 0; i < validRefs.length; i++) {
        if (validRefs[i]) keep[String(validRefs[i])] = true;
    }
    return AB.listAll().then(function(rows) {
        var chain = Promise.resolve();
        for (var j = 0; j < rows.length; j++) {
            if (!keep[rows[j].ref]) {
                chain = chain.then(function(ref) {
                    return function() { return AB.delete(ref); };
                }(rows[j].ref));
            }
        }
        return chain;
    });
};

AB.collectValidRefsFromStorage = function() {
    var refs = [];
    var S = window.PDM && window.PDM.Storage;
    if (!S) return refs;
    var ws = S.getWorkspaceAudio ? S.getWorkspaceAudio() : null;
    if (ws && ws.audioRef) refs.push(ws.audioRef);
    var list = S.getCleanHistory ? S.getCleanHistory() : [];
    for (var i = 0; i < list.length; i++) {
        if (list[i] && list[i].audioRef) refs.push(list[i].audioRef);
    }
    return refs;
};

AB.syncOrphans = function() {
    return AB.purgeOrphans(AB.collectValidRefsFromStorage());
};

AB.fileMetaFromFile = function(file) {
    if (!file) return normMeta({});
    return normMeta({
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
    });
};

AB.newWorkspaceRef = function() {
    return 'ws-' + Date.now();
};

window.PDM = window.PDM || {};
window.PDM.StorageAudioBlobs = AB;

})();
