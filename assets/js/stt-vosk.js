/**
 * PromptDeMerde.com — Plugin dictée vocale Vosk (Mini / Maxi, CPU, sans autocorrection).
 */
(function() {
var Shared = window.PDM.STT.Shared;
var S = Shared;

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

function log(engineId) {
    return function() {
        var engine = enginesById[engineId];
        if (!engine || !engine.debug) return;
        try {
            console.log.apply(console, ['[PDM.STT.' + engineId + ']'].concat(Array.prototype.slice.call(arguments)));
        } catch (e) { /* ignore */ }
    };
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

function voskLogLevel(engineId) {
    var eng = enginesById[engineId];
    return (eng && eng.debug) ? 0 : -2;
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

var enginesById = {};

function createVoskEngine(engineId) {
    var cfg = ENGINE_CONFIGS[engineId];
    if (!cfg) return null;

    var engine = {
        id: engineId,
        shortName: cfg.shortName,
        label: cfg.label,
        debug: S.isSttDebugEnabled(),

        isSupported: function() {
            return S.isSupported();
        },

        getHelpText: function() {
            if (!S.isSupported()) {
                return 'Dict\u00e9e vocale non support\u00e9e : ce navigateur ne g\u00e8re pas WebAssembly.';
            }
            if (S.needsLanBypass()) {
                return S.getLanHelpText();
            }
            var quality = engineId === 'vosk-maxi'
                ? 'meilleure reconnaissance Vosk compatible navigateur'
                : 'l\u00e9ger sur CPU, peu performant';
            if (!S.isSecureContext()) {
                return cfg.shortName + ' (' + cfg.sizeHint + ') : ' + quality + ' \u2014 transcription mot \u00e0 mot, pas d\u2019autocorrection. Retouchez le texte dans le Workspace.';
            }
            return 'Dict\u00e9e ' + cfg.shortName + ' hors-ligne (' + cfg.sizeHint + ') : ' + quality + ' \u2014 articulation nette, pas d\u2019autocorrection. Pr\u00e9f\u00e9rez Whisper/Parakeet (GPU) pour l\u2019oral assist\u00e9.';
        },

        unloadModel: function() { unloadModel(engineId); },

        isModelReady: function() {
            return !!getPool(engineId).voskModel;
        },

        isModelLoading: function() {
            var st = getPool(engineId);
            return !!(st.voskModelPromise && !st.voskModel);
        },

        preloadModel: function(els) {
            if (!S.isSupported() || S.needsLanBypass()) return Promise.resolve(null);
            return ensureModel(engineId, els, { background: true });
        },

        isActive: function() {
            var st = getPool(engineId);
            return st.state === S.STATE_LISTENING || st.state === S.STATE_PERMISSION || st.state === S.STATE_LOADING;
        },

        getState: function() { return getPool(engineId).state; },

        onEngineSelected: function() {},

        toggle: function(c) {
            var st = getPool(engineId);
            st.ctx = c;
            var els = c.els;
            if (engine.isActive()) { engine.stop(c); return; }
            if (!S.isSupported()) {
                window.PDM.UI.notif('Dict\u00e9e vocale non support\u00e9e par ce navigateur.', 'err');
                return;
            }
            if (S.needsLanBypass()) {
                c.facade.showLanSettings();
                return;
            }

            st.stopping = false;
            var startGen = bumpStartGen(st);
            st.state = S.STATE_PERMISSION;
            S.setState(els, st.state);
            S.setStatus(els, 'Pr\u00e9paration de la dict\u00e9e\u2026', 'listening');
            S.updateButton(els, true);
            S.setBusy(els, true, true);
            S.updatePermButton(els, false);
            st.text = S.createTextSession(els, c.onSave);
            st.text.reset();

            var stream = null;
            c.facade.ensureMicAccess({ fromToggle: true }).then(function(s) {
                stream = s;
                st.pendingStream = s;
                if (isStartStale(st, startGen)) { s.getTracks().forEach(function(t){ t.stop(); }); st.pendingStream = null; throw new Error('cancelled'); }
                if (st.voskModel) return st.voskModel;
                st.state = S.STATE_LOADING;
                S.setState(els, st.state);
                S.setStatus(els, 'Chargement de ' + cfg.shortName + '\u2026', 'listening');
                return ensureModel(engineId, els);
            }).then(function(model) {
                if (isStartStale(st, startGen)) { if (stream) stream.getTracks().forEach(function(t){ t.stop(); }); throw new Error('cancelled'); }
                return startAudioPipeline(engineId, model, stream, els);
            }).catch(function(err) {
                if (stream && (isStartStale(st, startGen) || !st.recognizer)) {
                    try { stream.getTracks().forEach(function(t){ t.stop(); }); } catch (e) {}
                }
                if (err && err.message === 'cancelled') { engine._reset(c); return; }
                var denied = S.isPermissionDeniedError(err);
                var micErr = S.isMicError(err);
                st.state = S.STATE_ERROR;
                S.setState(els, st.state);
                if (micErr) {
                    S.setStatus(els, S.getMicErrorLabel(err), 'error');
                    S.updatePermButton(els, true, denied || c.micPermissionState === 'denied');
                    if (denied && !err._pdmPermDenied) window.PDM.UI.notif(S.deniedHint(), 'err');
                    else window.PDM.UI.notif(S.getMicErrorLabel(err), 'err');
                } else {
                    log(engineId)('engine error', err);
                    var isDownloadTimeout = err && err.code === 'download-timeout';
                    var isExtractTimeout = err && err.code === 'extract-timeout';
                    var base = isDownloadTimeout
                        ? 'T\u00e9l\u00e9chargement ' + cfg.shortName + ' trop long.'
                        : (isExtractTimeout
                            ? 'Extraction WASM ' + cfg.shortName + ' trop longue (mod\u00e8le lourd).'
                            : '\u00c9chec de ' + cfg.shortName + '.');
                    S.setStatus(els, base + ' ' + (err && err.message ? err.message : ''), 'error');
                    var hint = isExtractTimeout
                        ? cfg.shortName + ' : l\u2019archive est en cache \u2014 r\u00e9essaie (plus de t\u00e9l\u00e9chargement).'
                        : ('Mod\u00e8le absent dans ' + cfg.modelFileHint);
                    window.PDM.UI.notif(hint, 'err');
                }
                engine._reset(c);
                c.facade.syncPermissionUI();
            });
        },

        stop: function(c, opts) {
            opts = opts || {};
            var st = getPool(engineId);
            var state = st.state;
            var wasListening = state === S.STATE_LISTENING;
            var wasStarting = state === S.STATE_PERMISSION || state === S.STATE_LOADING;

            bumpStartGen(st);
            st.stopping = true;
            S.releaseMediaStream(st);

            if (wasStarting && !st.voskModel) {
                st.modelLoadGen++;
                st.voskModelPromise = null;
                st.voskModelLoading = null;
            }

            if (!engine.isActive() && !wasStarting) {
                engine._reset(c);
                return;
            }

            if (wasListening && st.text) {
                st.text.finalizeInterim();
                st.text.apply();
                st.text.triggerSave();
                if (!opts.silent) S.setStatus(c.els, 'Dict\u00e9e termin\u00e9e.', 'ok');
            } else if (!opts.silent) {
                S.setStatus(c.els, 'Annul\u00e9.', 'ok');
            }
            if (wasListening) S.playDictationStopBeep(st, opts);
            S.clearDictationBeepSession(st);
            teardownAll(engineId, c.els);
            st.state = S.isSupported() ? S.STATE_IDLE : S.STATE_UNSUPPORTED;
            S.setState(c.els, st.state);
            S.updateButton(c.els, false);
            S.setBusy(c.els, false, false);
            st.stopping = false;
            if (c.facade) {
                if (wasStarting && c.facade.ensureActiveEngineLoaded) c.facade.ensureActiveEngineLoaded();
                if (c.facade.updateDictationButton) c.facade.updateDictationButton();
                else if (c.facade.renderUi) c.facade.renderUi();
            }
        },

        _reset: function(c) {
            var st = getPool(engineId);
            var wasStarting = st.state === S.STATE_PERMISSION || st.state === S.STATE_LOADING;
            bumpStartGen(st);
            S.releaseMediaStream(st);
            if (wasStarting && !st.voskModel) {
                st.modelLoadGen++;
                st.voskModelPromise = null;
                st.voskModelLoading = null;
            }
            teardownAll(engineId, c.els);
            S.clearDictationBeepSession(st);
            st.state = S.isSupported() ? S.STATE_IDLE : S.STATE_UNSUPPORTED;
            S.setState(c.els, st.state);
            S.updateButton(c.els, false);
            S.setBusy(c.els, false, false);
            st.stopping = false;
            if (c.facade) {
                if (wasStarting && c.facade.ensureActiveEngineLoaded) c.facade.ensureActiveEngineLoaded();
                if (c.facade.updateDictationButton) c.facade.updateDictationButton();
                else if (c.facade.renderUi) c.facade.renderUi();
            }
        },

        getStatusLabel: function() {
            var st = getPool(engineId);
            if (st.loadedModelId) return cfg.shortName + ' \u2014 mod\u00e8le pr\u00eat (CPU WASM)';
            if (engine.isModelLoading()) return cfg.shortName + ' \u2014 chargement en arri\u00e8re-plan\u2026';
            return cfg.shortName + ' \u2014 pr\u00e9paration\u2026';
        },

        getLoadedBackend: function() {
            return getPool(engineId).voskModel ? 'wasm' : null;
        },
    };

    enginesById[engineId] = engine;
    window.PDM.STT.registerEngine(engine);
    return engine;
}

createVoskEngine('vosk-mini');
createVoskEngine('vosk-maxi');

if (window.PDM.STT.syncEngineSelect) window.PDM.STT.syncEngineSelect();
if (window.PDM.STT.refresh) window.PDM.STT.refresh();
})();
