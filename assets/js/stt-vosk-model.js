/**
 * PromptDeMerde.com — stt-vosk-model.js
 *
 * Synopsis : Chargement modèles Vosk (WASM, cache tar.gz).
 * Objectif : Téléchargement, extraction IDBFS et ensureModel pour vosk-mini/maxi.
 */
(function() {
var Shared = window.PDM.STT.Shared;
var S = Shared;
window.PDM.STT._vosk = window.PDM.STT._vosk || {};

var VOSK_LIB_URL = 'assets/js/vendor/vosk/vosk.js';
var VOSK_CACHE_NAME = 'pdm-vosk-models-v2';

var ENGINE_CONFIGS = {
    'vosk-mini': {
        modelPath: 'assets/stt/vosk-mini/model.tar.gz',
        sizeHint: '~39 Mo',
        sizeBytes: 39 * 1048576,
        downloadTimeoutMs: 180000,
        extractTimeoutMs: 300000,
        shortName: 'Vosk Mini',
        label: 'Vosk Mini',
        modelFileHint: 'assets/stt/vosk-mini/model.tar.gz'
    },
    'vosk-maxi': {
        modelPath: 'assets/stt/vosk-maxi/model.tar.gz',
        sizeHint: '~41 Mo',
        sizeBytes: 41 * 1048576,
        downloadTimeoutMs: 300000,
        extractTimeoutMs: 600000,
        shortName: 'Vosk Maxi',
        label: 'Vosk Maxi',
        modelFileHint: 'assets/stt/vosk-maxi/model.tar.gz'
    }
};

var voskLibPromise = null;
var pools = {};
var blobByPath = {};
var blobUrlByPath = {};
var downloadPromises = {};
var enginesById = {};

function getPool(id) {
    if (!pools[id]) {
        pools[id] = {
            state: S.STATE_IDLE,
            voskModel: null,
            voskModelPromise: null,
            voskModelLoading: null,
            modelLoadGen: 0,
            loadedModelId: null,
            recognizer: null,
            audio: {},
            text: null,
            timers: { maxTimer: null, tickTimer: null },
            startTime: 0,
            stopping: false,
            startGen: 0,
            ctx: null,
            pendingStream: null
        };
    }
    return pools[id];
}

function log() {
    return function() {};
}

function revokeBlobUrl(path) {
    if (blobUrlByPath[path]) {
        try { URL.revokeObjectURL(blobUrlByPath[path]); } catch (e) {}
        delete blobUrlByPath[path];
    }
}

function resetWasm(engineId) {
    var st = getPool(engineId);
    if (st.voskModelLoading) {
        try { st.voskModelLoading.terminate(); } catch (e) {}
        st.voskModelLoading = null;
    }
    if (st.voskModel) {
        try { st.voskModel.terminate(); } catch (e) {}
        st.voskModel = null;
    }
    st.loadedModelId = null;
    st.voskModelPromise = null;
}

function unloadModel(engineId) {
    var cfg = ENGINE_CONFIGS[engineId];
    var st = getPool(engineId);
    st.modelLoadGen++;
    resetWasm(engineId);
    if (cfg && cfg.modelPath) {
        delete blobByPath[cfg.modelPath];
        revokeBlobUrl(cfg.modelPath);
        delete downloadPromises[cfg.modelPath];
    }
}

function loadVoskLib() {
    if (window.Vosk) return Promise.resolve(window.Vosk);
    if (voskLibPromise) return voskLibPromise;
    voskLibPromise = new Promise(function(resolve, reject) {
        var s = document.createElement('script');
        s.src = VOSK_LIB_URL;
        s.async = true;
        s.onload = function() {
            if (window.Vosk) resolve(window.Vosk);
            else reject(new Error('Vosk introuvable apr\u00e8s chargement.'));
        };
        s.onerror = function() { voskLibPromise = null; reject(new Error('\u00c9chec de chargement de vosk.js')); };
        document.head.appendChild(s);
    });
    return voskLibPromise;
}

function readBlobFromCacheApi(url) {
    if (!window.caches || !window.caches.open) return Promise.resolve(null);
    return window.caches.open(VOSK_CACHE_NAME).then(function(cache) {
        return cache.match(url);
    }).then(function(res) {
        return res ? res.blob() : null;
    }).catch(function() { return null; });
}

function writeBlobToCacheApi(url, blob) {
    if (!window.caches || !window.caches.open) return Promise.resolve();
    return window.caches.open(VOSK_CACHE_NAME).then(function(cache) {
        return cache.put(url, new Response(blob));
    }).catch(function() { /* quota / mode privé */ });
}

function promiseTimeout(promise, ms, code) {
    return new Promise(function(resolve, reject) {
        var timer = setTimeout(function() {
            var err = new Error(code || 'timeout');
            err.code = 'timeout';
            reject(err);
        }, ms);
        promise.then(function(v) {
            clearTimeout(timer);
            resolve(v);
        }).catch(function(err) {
            clearTimeout(timer);
            reject(err);
        });
    });
}

function fetchModelBlob(cfg, tracker, background, myGen, engineId) {
    var path = cfg.modelPath;
    if (blobByPath[path]) {
        tracker.phase('Archive en m\u00e9moire', background ? 78 : 72, cfg.sizeHint);
        return Promise.resolve(blobByPath[path]);
    }
    if (downloadPromises[path]) return downloadPromises[path];

    var url = S.modelAbsoluteUrl(path);
    var dbg = log(engineId);

    downloadPromises[path] = promiseTimeout(
        readBlobFromCacheApi(url).then(function(cached) {
            if (myGen !== getPool(engineId).modelLoadGen) throw new Error('cancelled');
            if (cached) {
                dbg('archive depuis cache navigateur', path);
                tracker.phase('Archive trouv\u00e9e (cache navigateur)', background ? 12 : 8, cfg.sizeHint);
                return cached;
            }
            tracker.phase('T\u00e9l\u00e9chargement du mod\u00e8le', background ? 5 : 0, cfg.sizeHint);
            return S.fetchWithProgress(url, function(p) {
                var pct = null;
                if (p.total > 0) pct = Math.round((p.loaded / p.total) * 72);
                else if (p.loaded > 0) pct = Math.min(70, Math.round((p.loaded / cfg.sizeBytes) * 72));
                tracker.fileProgress('T\u00e9l\u00e9chargement', p.loaded, p.total || cfg.sizeBytes, pct);
            }).then(function(blob) {
                if (myGen !== getPool(engineId).modelLoadGen) throw new Error('cancelled');
                return writeBlobToCacheApi(url, blob).then(function() { return blob; });
            });
        }).then(function(blob) {
            blobByPath[path] = blob;
            return blob;
        }),
        cfg.downloadTimeoutMs,
        'download-timeout'
    ).finally(function() {
        delete downloadPromises[path];
    });

    return downloadPromises[path];
}

function getBlobUrl(path, blob) {
    if (blobUrlByPath[path]) return blobUrlByPath[path];
    blobUrlByPath[path] = URL.createObjectURL(blob);
    return blobUrlByPath[path];
}

function voskLogLevel() {
    return -2;
}

function initWasmModel(Vosk, blobUrl, cfg, tracker, myGen, engineId) {
    var st = getPool(engineId);
    tracker.startIndeterminate('Extraction WASM (IDBFS)', 74);
    var extractStart = Date.now();
    var extractTimer = setInterval(function() {
        if (myGen !== st.modelLoadGen) return;
        var sec = Math.floor((Date.now() - extractStart) / 1000);
        var pseudo = Math.min(98, 74 + Math.floor(sec * 0.8));
        tracker.phase('Extraction WASM (IDBFS)', pseudo, sec + ' s \u00e9coul\u00e9es');
    }, 500);
    st.voskModelLoading = new Vosk.Model(blobUrl, voskLogLevel(engineId));

    return promiseTimeout(new Promise(function(resolve, reject) {
        var done = false;
        function finish(ok, err) {
            if (done) return;
            done = true;
            if (extractTimer) { clearInterval(extractTimer); extractTimer = null; }
            try { st.voskModelLoading && st.voskModelLoading.removeEventListener && st.voskModelLoading.removeEventListener('load', onLoad); } catch (e) {}
            try { st.voskModelLoading && st.voskModelLoading.removeEventListener && st.voskModelLoading.removeEventListener('error', onErr); } catch (e) {}
            if (ok) resolve(st.voskModelLoading);
            else reject(err || new Error('load-failed'));
        }
        function onLoad(message) {
            var ok = message && message.detail ? message.detail.result : false;
            if (!ok) return finish(false, new Error('load-failed'));
            return finish(true);
        }
        function onErr(message) {
            var m = (message && message.detail && message.detail.error) ? message.detail.error : 'error';
            return finish(false, new Error(m));
        }
        try { st.voskModelLoading.addEventListener('load', onLoad); } catch (e) {}
        try { st.voskModelLoading.addEventListener('error', onErr); } catch (e) {}
    }), cfg.extractTimeoutMs, 'extract-timeout');
}

function ensureModel(engineId, els, opts) {
    opts = opts || {};
    var cfg = ENGINE_CONFIGS[engineId];
    var st = getPool(engineId);
    var background = !!opts.background;
    if (st.voskModel) return Promise.resolve(st.voskModel);
    if (st.voskModelPromise) return st.voskModelPromise;
    var myGen = st.modelLoadGen;
    var tracker = background
        ? S.createBackgroundLoadTracker(cfg.shortName, function(p) {
            if (window.PDM.STT && window.PDM.STT.reportLoadProgress) window.PDM.STT.reportLoadProgress(p);
        })
        : S.createLoadTracker(els, cfg.shortName);
    if (!background) {
        st.state = S.STATE_LOADING;
        S.setState(els, st.state);
        tracker.show();
        tracker.phase('Pr\u00e9paration', 0, cfg.sizeHint);
    } else {
        tracker.phase('Pr\u00e9paration', 0, cfg.sizeHint);
    }
    var loadStartedAt = Date.now();
    var dbg = log(engineId);

    st.voskModelPromise = loadVoskLib().then(function(Vosk) {
        if (myGen !== st.modelLoadGen) throw new Error('cancelled');
        if (background) tracker.phase('Librairie charg\u00e9e', 4, '');
        return fetchModelBlob(cfg, tracker, background, myGen, engineId).then(function(blob) {
            if (myGen !== st.modelLoadGen) throw new Error('cancelled');
            var blobUrl = getBlobUrl(cfg.modelPath, blob);
            dbg('initialisation WASM', cfg.modelPath);
            return initWasmModel(Vosk, blobUrl, cfg, tracker, myGen, engineId);
        });
    }).then(function(model) {
        if (myGen !== st.modelLoadGen) {
            try { model.terminate(); } catch (e) {}
            st.voskModelPromise = null;
            throw new Error('cancelled');
        }
        st.voskModelLoading = null;
        st.voskModel = model;
        st.loadedModelId = engineId;
        tracker.phase('Mod\u00e8le pr\u00eat', 100, 'Charg\u00e9 en ' + Math.round((Date.now() - loadStartedAt) / 1000) + ' s');
        dbg('mod\u00e8le charg\u00e9 en', (Date.now() - loadStartedAt) + 'ms');
        return model;
    }).catch(function(err) {
        resetWasm(engineId);
        st.voskModelPromise = null;
        throw err;
    }).finally(function() {
        tracker.hide();
        if (window.PDM.STT) window.PDM.STT.renderUi();
    });
    return st.voskModelPromise;
}

function bumpStartGen(st) {
    st.startGen = (st.startGen || 0) + 1;
    return st.startGen;
}

function isStartStale(st, gen) {
    return gen !== st.startGen;
}

function teardownRecognizer(engineId) {
    var st = getPool(engineId);
    if (st.recognizer) {
        try { st.recognizer.remove(); } catch (e) {}
        st.recognizer = null;
    }
}

function startAudioPipeline(engineId, model, stream, els) {
    var st = getPool(engineId);
    st.pendingStream = null;

    return S.setupMicCapture(st, stream, {
        onProcess: function(ev) {
            if (st.state !== S.STATE_LISTENING || !st.recognizer) return;
            S.tryDictationStartBeep(st);
            try { st.recognizer.acceptWaveform(ev.inputBuffer); } catch (e) { log(engineId)('acceptWaveform', e); }
        }
    }).then(function() {
        st.recognizer = new model.KaldiRecognizer(st.audio.audioContext.sampleRate);
        st.recognizer.setWords(false);
        st.recognizer.on('result', function(message) {
            var txt = message && message.result ? message.result.text : '';
            if (txt) st.text.setFinalized(txt.trim());
        });
        st.recognizer.on('partialresult', function(message) {
            var partial = message && message.result ? message.result.partial : '';
            st.text.setInterim(partial || '');
            if (partial && st.state === S.STATE_LISTENING) {
                S.setStatus(els, '\u00c9coute en cours\u2026 transcription active', 'listening');
            }
        });

        st.state = S.STATE_LISTENING;
        S.setState(els, st.state);
        S.updateButton(els, true);
        st.startTime = Date.now();
        S.armDictationStartBeep(st);
        S.startTickTimer(st.timers, function() { return st.state; }, els, st.startTime);
        S.setStatus(els, '\u00c9coute en cours\u2026 parle maintenant', 'listening');

        var maxMs = window.PDM.Storage.getSTTMaxMs();
        if (maxMs > 0) {
            st.timers.maxTimer = setTimeout(function() {
                window.PDM.UI.notif('Limite de dict\u00e9e atteinte.', 'info');
                if (st.ctx && st.ctx.facade) st.ctx.facade.stop();
            }, maxMs);
        }
    });
}

function teardownAll(engineId, els) {
    teardownRecognizer(engineId);
    var st = getPool(engineId);
    S.teardownAudioNodes(st.audio);
    S.clearTimers(st.timers);
    S.hideLoadProgress(els);
}

var V = window.PDM.STT._vosk;
V.ENGINE_CONFIGS = ENGINE_CONFIGS;
V.enginesById = enginesById;
V.getPool = getPool;
V.unloadModel = unloadModel;
V.ensureModel = ensureModel;
V.bumpStartGen = bumpStartGen;
V.isStartStale = isStartStale;
V.startAudioPipeline = startAudioPipeline;
V.teardownAll = teardownAll;
V.log = log;

})();

