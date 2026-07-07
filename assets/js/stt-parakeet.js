/**
 * PromptDeMerde.com — Plugin dictée vocale Parakeet (ONNX Runtime Web, GPU conseillé).
 *
 * Isolation : chaque moteur a son propre "pool" d'état obtenu via getPool(engineId),
 * exactement comme Vosk et Whisper. Aucun état partagé entre moteurs.
 */
import { fromUrls } from './vendor/parakeet/parakeet-lib.js';

var S = window.PDM.STT.Shared;
var SAMPLE_RATE = 16000;
var CHUNK_SAMPLES = 16000;
var WASM_PATH = 'assets/js/vendor/onnxruntime-web/';
var SPECIAL_TOKEN_RE = /<\|[^|]+\|>/g;
var PUNCT_ONLY_RE = /^[,.;:!?…\-–—'"«»\s]+$/;

var ENGINE_CONFIGS = {
    'parakeet': {
        shortName: 'Parakeet',
        label: 'Parakeet',
        sizeHint: '~409 Mo',
        loadedModelId: 'parakeet-tdt-0.6b-v3-int4',
        model: {
            encoder: 'assets/stt/parakeet/encoder-model.int4.onnx',
            decoder: 'assets/stt/parakeet/decoder_joint-model.int8.onnx',
            vocab: 'assets/stt/parakeet/vocab.txt'
        }
    }
};

var pools = {};
var enginesById = {};

function getPool(id) {
    if (!pools[id]) {
        pools[id] = {
            state: S.STATE_IDLE,
            parakeetModel: null,
            modelPromise: null,
            modelLoadGen: 0,
            streamer: null,
            audio: {},
            text: null,
            timers: { maxTimer: null, tickTimer: null },
            startTime: 0,
            stopping: false,
            startGen: 0,
            pendingSamples: new Float32Array(0),
            chunkProcessing: false,
            chunkQueue: Promise.resolve(),
            modelBlobUrls: [],
            loadedModelId: null,
            usedBackend: null,
            lang: 'fr',
            chunkErrorReported: false,
            gotAnyText: false,
            pendingStream: null
        };
    }
    return pools[id];
}

function cfgFor(id) {
    return ENGINE_CONFIGS[id] || ENGINE_CONFIGS['parakeet'];
}

function log(id) {
    return function() {
        var eng = enginesById[id];
        if (!eng || !eng.debug) return;
        try {
            console.log.apply(console, ['[PDM.STT.' + id + ']'].concat(Array.prototype.slice.call(arguments)));
        } catch (e) { /* ignore */ }
    };
}

function wasmPathsUrl() {
    var base = S.modelAbsoluteUrl(WASM_PATH);
    if (!base.endsWith('/')) base += '/';
    return base;
}

function modelLoadErrorHint() {
    return 'Mod\u00e8le Parakeet absent. Lance : bash assets/stt/parakeet/restore-encoder.sh';
}

function bumpStartGen(st) {
    st.startGen = (st.startGen || 0) + 1;
    return st.startGen;
}

function isStartStale(st, gen) {
    return gen !== st.startGen;
}

function releaseSessions(model) {
    if (!model) return;
    // Libère les sessions ONNX Runtime (pool de threads WASM) sinon le CPU
    // continue de tourner après l'arrêt.
    try { if (model.encoderSession && model.encoderSession.release) model.encoderSession.release(); } catch (e) {}
    try { if (model.joinerSession && model.joinerSession.release) model.joinerSession.release(); } catch (e) {}
    try {
        if (model.preprocessor && model.preprocessor.session && model.preprocessor.session.release) {
            model.preprocessor.session.release();
        }
    } catch (e) {}
    try { if (model._onnxPreprocessor && model._onnxPreprocessor.session && model._onnxPreprocessor.session.release) model._onnxPreprocessor.session.release(); } catch (e) {}
}

function unloadModel(id) {
    var st = getPool(id);
    st.modelLoadGen++;
    st.streamer = null;
    if (st.parakeetModel) releaseSessions(st.parakeetModel);
    st.parakeetModel = null;
    st.modelPromise = null;
    st.pendingSamples = new Float32Array(0);
    st.chunkQueue = Promise.resolve();
    st.chunkProcessing = false;
    st.loadedModelId = null;
    st.usedBackend = null;
    for (var i = 0; i < st.modelBlobUrls.length; i++) {
        try { URL.revokeObjectURL(st.modelBlobUrls[i]); } catch (e) {}
    }
    st.modelBlobUrls = [];
}

function checkModelFiles(cfg) {
    return fetch(S.modelAbsoluteUrl(cfg.model.encoder), { method: 'HEAD', cache: 'no-store' }).then(function(r) {
        if (!r.ok) throw new Error('missing-model');
        return true;
    });
}

var PARAKEET_DOWNLOAD_PERCENT_MAX = 78;
var PARAKEET_INIT_PERCENT_BASE = 78;

function initParakeetFromBlobs(id, urls, backend, tracker, myGen) {
    var st = getPool(id);
    var backendLabel = parakeetBackendLabel(backend);
    tracker.startIndeterminate('Initialisation ONNX (' + backendLabel + ')', PARAKEET_INIT_PERCENT_BASE, {
        backend: backend,
        hint: 'Compilation / chargement ONNX'
    });
    return S.promiseTimeout(fromUrls({
        encoderUrl: urls.encoder,
        decoderUrl: urls.decoder,
        tokenizerUrl: urls.vocab,
        backend: backend,
        preprocessorBackend: 'js',
        wasmPaths: wasmPathsUrl()
    }), 300000, 'onnx-init');
}

function ensureModel(id, els, opts) {
    opts = opts || {};
    var st = getPool(id);
    var cfg = cfgFor(id);
    var background = !!opts.background;
    if (st.parakeetModel) return Promise.resolve(st.parakeetModel);
    if (st.modelPromise) return st.modelPromise;
    var myGen = st.modelLoadGen;
    var tracker = background
        ? S.createBackgroundLoadTracker(cfg.shortName, function(p) {
            if (window.PDM.STT && window.PDM.STT.reportLoadProgress) window.PDM.STT.reportLoadProgress(p);
        })
        : S.createLoadTracker(els, cfg.shortName);
    var loadStartedAt = Date.now();
    if (!background) {
        st.state = S.STATE_LOADING;
        S.setState(els, st.state);
        tracker.show();
        tracker.phase('V\u00e9rification des fichiers', 0, cfg.sizeHint);
    } else {
        tracker.phase('V\u00e9rification des fichiers', 0, cfg.sizeHint);
    }
    var dbg = log(id);

    st.modelPromise = checkModelFiles(cfg).then(function() {
        if (myGen !== st.modelLoadGen) throw new Error('cancelled');
        return tracker.fetchWeighted([
            {
                url: S.modelAbsoluteUrl(cfg.model.encoder),
                weight: 391,
                label: 'T\u00e9l\u00e9chargement encodeur (~391 Mo)'
            },
            {
                url: S.modelAbsoluteUrl(cfg.model.decoder),
                weight: 18,
                label: 'T\u00e9l\u00e9chargement d\u00e9codeur (~18 Mo)'
            },
            {
                url: S.modelAbsoluteUrl(cfg.model.vocab),
                weight: 1,
                label: 'Vocabulaire'
            }
        ], { maxPercent: PARAKEET_DOWNLOAD_PERCENT_MAX });
    }).then(function(blobs) {
        if (myGen !== st.modelLoadGen) throw new Error('cancelled');
        var urls = {
            encoder: URL.createObjectURL(blobs[0]),
            decoder: URL.createObjectURL(blobs[1]),
            vocab: URL.createObjectURL(blobs[2])
        };
        st.modelBlobUrls = [urls.encoder, urls.decoder, urls.vocab];
        return S.detectParakeetBackend().then(function(backend) {
            st.usedBackend = backend;
            return initParakeetFromBlobs(id, urls, backend, tracker, myGen).catch(function(err) {
                if (backend.indexOf('webgpu') !== 0) throw err;
                try { console.warn('[PDM.STT.' + id + '] WebGPU KO, repli WASM', err); } catch (e) {}
                tracker.startIndeterminate('Repli CPU (WASM)', PARAKEET_INIT_PERCENT_BASE, {
                    backend: 'wasm',
                    hint: 'WebGPU indisponible'
                });
                st.usedBackend = 'wasm';
                return initParakeetFromBlobs(id, urls, 'wasm', tracker, myGen);
            });
        });
    }).then(function(model) {
        if (myGen !== st.modelLoadGen) throw new Error('cancelled');
        st.parakeetModel = model;
        st.loadedModelId = cfg.loadedModelId;
        tracker.phase('Mod\u00e8le pr\u00eat', 100, 'Charg\u00e9 en ' + Math.round((Date.now() - loadStartedAt) / 1000) + ' s');
        dbg('mod\u00e8le charg\u00e9');
        return model;
    }).catch(function(err) {
        unloadModel(id);
        throw err;
    }).finally(function() {
        tracker.hide();
        if (window.PDM.STT) window.PDM.STT.renderUi();
    });
    return st.modelPromise;
}

function joinTimedWords(words) {
    var text = '';
    for (var i = 0; i < (words || []).length; i++) {
        var part = words[i] && words[i].text != null ? String(words[i].text) : '';
        if (!part) continue;
        if (!text) text = part;
        else if (/^[,.;:!?)}\]]+$/.test(part)) text += part;
        else text += ' ' + part;
    }
    return text;
}

function stripSpecialTokens(s) {
    return String(s || '').replace(SPECIAL_TOKEN_RE, '').replace(/\s+/g, ' ').trim();
}

function sanitizeParakeetText(text, words) {
    var joined = words && words.length ? joinTimedWords(words) : stripSpecialTokens(text);
    joined = stripSpecialTokens(joined);
    if (!joined || PUNCT_ONLY_RE.test(joined)) return '';
    return joined;
}

function applyChunkResult(id, els, result) {
    var st = getPool(id);
    if (!result || !st.text) return;
    var finalized = sanitizeParakeetText(null, result.words);
    var chunkText = sanitizeParakeetText(result.chunkText, result.chunkWords);
    if (!finalized && !chunkText) return;
    st.gotAnyText = true;
    if (finalized) {
        st.text.finalizedSession = finalized;
        st.text.currentInterim = '';
    } else if (chunkText) {
        st.text.currentInterim = chunkText;
    }
    st.text.apply();
    st.text.triggerSave();
    if (st.state === S.STATE_LISTENING) {
        S.setStatus(els, '\u00c9coute en cours\u2026 transcription active', 'listening');
    }
}

function parakeetBackendLabel(backend) {
    if (!backend || backend === 'wasm') return 'WASM';
    if (backend.indexOf('webgpu') === 0) return 'WebGPU';
    return String(backend).toUpperCase();
}

function appendSamples(id, samples) {
    var st = getPool(id);
    if (!samples || !samples.length) return;
    var merged = new Float32Array(st.pendingSamples.length + samples.length);
    merged.set(st.pendingSamples, 0);
    merged.set(samples, st.pendingSamples.length);
    st.pendingSamples = merged;
}

function drainChunks(id, els) {
    var st = getPool(id);
    if (st.chunkProcessing || !st.streamer) return;
    if (st.pendingSamples.length < CHUNK_SAMPLES) return;
    st.chunkProcessing = true;
    var chunkStart = Date.now();
    var chunk = st.pendingSamples.slice(0, CHUNK_SAMPLES);
    st.pendingSamples = st.pendingSamples.slice(CHUNK_SAMPLES);
    st.chunkQueue = st.chunkQueue.then(function() {
        if (!st.streamer || st.state !== S.STATE_LISTENING) return;
        return st.streamer.processChunk(chunk);
    }).then(function(result) {
        if (enginesById[id] && enginesById[id].debug && result && result.metrics) {
            var inferMs = Date.now() - chunkStart;
            log(id)('RTF', result.metrics.rtf != null ? result.metrics.rtf.toFixed(2) + 'x' : 'n/a',
                'inferMs=' + inferMs, 'chunk=' + (result.chunkCount || '?'),
                'text=' + JSON.stringify(result.chunkText || ''));
        }
        applyChunkResult(id, els, result);
    }).catch(function(e) {
        // Toujours visible : l'inférence Parakeet échouait en silence avant.
        try { console.error('[PDM.STT.' + id + '] processChunk error', e); } catch (ee) {}
        if (!st.chunkErrorReported && st.state === S.STATE_LISTENING) {
            st.chunkErrorReported = true;
            var msg = 'Erreur de transcription Parakeet : ' + (e && e.message ? e.message : e);
            S.setStatus(els, msg, 'error');
            window.PDM.UI.notif(msg + ' \u2014 essaie le moteur Vosk si \u00e7a persiste.', 'err');
        }
    }).then(function() {
        st.chunkProcessing = false;
        if (st.pendingSamples.length >= CHUNK_SAMPLES) drainChunks(id, els);
    });
}

function resampleTo16k(input, fromRate) {
    if (fromRate === SAMPLE_RATE) return input;
    var ratio = fromRate / SAMPLE_RATE;
    var outLen = Math.round(input.length / ratio);
    var out = new Float32Array(outLen);
    for (var i = 0; i < outLen; i++) {
        var src = i * ratio;
        var idx = Math.floor(src);
        var frac = src - idx;
        var a = input[idx] || 0;
        var b = input[idx + 1] || a;
        out[i] = a + (b - a) * frac;
    }
    return out;
}

function extractMono(ev, fromRate) {
    var buf = ev.inputBuffer;
    var ch0 = buf.getChannelData(0);
    var mono;
    if (buf.numberOfChannels === 1) {
        mono = new Float32Array(ch0);
    } else {
        mono = new Float32Array(buf.length);
        for (var i = 0; i < buf.length; i++) {
            var sum = 0;
            for (var c = 0; c < buf.numberOfChannels; c++) sum += buf.getChannelData(c)[i];
            mono[i] = sum / buf.numberOfChannels;
        }
    }
    return resampleTo16k(mono, fromRate);
}

function startAudioPipeline(id, stream, els) {
    var st = getPool(id);
    st.pendingStream = null;

    st.streamer = st.parakeetModel.createStreamingTranscriber({
        returnTimestamps: true,
        sampleRate: SAMPLE_RATE,
        debug: !!(enginesById[id] && enginesById[id].debug)
    });
    st.gotAnyText = false;
    st.chunkErrorReported = false;

    return S.setupMicCapture(st, stream, {
        sampleRate: SAMPLE_RATE,
        onProcess: function(ev) {
            if (st.state !== S.STATE_LISTENING || !st.streamer) return;
            S.tryDictationStartBeep(st);
            appendSamples(id, extractMono(ev, st.audio.audioContext.sampleRate));
            drainChunks(id, els);
        }
    }).then(function() {
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
                window.PDM.STT.stop();
            }, maxMs);
        }
    });
}

function flushRemaining(id, els) {
    var st = getPool(id);
    if (!st.streamer || st.pendingSamples.length === 0) return Promise.resolve();
    var tail = st.pendingSamples;
    st.pendingSamples = new Float32Array(0);
    return st.streamer.processChunk(tail).then(function(result) {
        applyChunkResult(id, els, result);
    }).catch(function(e) { log(id)('flush error', e); });
}

function teardownAll(id, els) {
    var st = getPool(id);
    S.teardownAudioNodes(st.audio);
    S.clearTimers(st.timers);
    S.hideLoadProgress(els);
}

// Arrête le flux audio + le streamer SANS libérer le modèle ONNX :
// le modèle reste en cache pour un redémarrage instantané. Il n'est
// libéré qu'au changement de moteur (unloadOtherEngines dans stt.js).
function teardownStream(id) {
    var st = getPool(id);
    st.streamer = null;
    st.pendingSamples = new Float32Array(0);
    st.chunkQueue = Promise.resolve();
    st.chunkProcessing = false;
    st.chunkErrorReported = false;
}

function createParakeetEngine(engineId) {
    var cfg = cfgFor(engineId);

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
            var gpu = S.hasWebGPU() ? 'WebGPU recommand\u00e9' : 'WASM uniquement (plus lent)';
            return 'Dict\u00e9e ' + cfg.shortName + ' (' + cfg.sizeHint + ') : forte autocorrection \u00e0 l\u2019oral. ' + gpu + '. Retouchez si besoin avant nettoyage. Si absent : bash assets/stt/parakeet/restore-encoder.sh';
        },

        unloadModel: function() { unloadModel(engineId); },
        onEngineSelected: function() {},

        isModelReady: function() {
            return !!getPool(engineId).parakeetModel;
        },

        isModelLoading: function() {
            var st = getPool(engineId);
            return !!(st.modelPromise && !st.parakeetModel);
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

        toggle: function(c) {
            var st = getPool(engineId);
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
            if (c.getLang) {
                try { st.lang = c.getLang() || 'fr'; } catch (e) { st.lang = 'fr'; }
            }
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
                if (isStartStale(st, startGen)) { s.getTracks().forEach(function(t) { t.stop(); }); st.pendingStream = null; throw new Error('cancelled'); }
                if (st.parakeetModel) return st.parakeetModel;
                st.state = S.STATE_LOADING;
                S.setState(els, st.state);
                S.setStatus(els, 'Chargement du moteur ' + cfg.shortName + '\u2026', 'listening');
                return ensureModel(engineId, els);
            }).then(function() {
                if (isStartStale(st, startGen)) { if (stream) stream.getTracks().forEach(function(t) { t.stop(); }); throw new Error('cancelled'); }
                return startAudioPipeline(engineId, stream, els);
            }).catch(function(err) {
                if (stream && (isStartStale(st, startGen) || st.state !== S.STATE_LISTENING)) {
                    try { stream.getTracks().forEach(function(t) { t.stop(); }); } catch (e) {}
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
                    var missing = err && err.message === 'missing-model';
                    var oom = err && /memory|oom|alloc/i.test(String(err.message || err));
                    var base = missing ? 'Mod\u00e8le Parakeet introuvable.' : (oom ? 'M\u00e9moire insuffisante pour Parakeet.' : '\u00c9chec du moteur Parakeet.');
                    S.setStatus(els, base + ' ' + (err && err.message ? err.message : ''), 'error');
                    window.PDM.UI.notif(missing ? modelLoadErrorHint() : (oom ? 'Ferme d\u2019autres onglets ou utilise Vosk (Petit).' : modelLoadErrorHint()), 'err');
                }
                engine._reset(c);
                c.facade.syncPermissionUI();
            });
        },

        stop: function(c, opts) {
            opts = opts || {};
            var st = getPool(engineId);
            var els = c.els;
            var state = st.state;
            var wasListening = state === S.STATE_LISTENING;
            var wasStarting = state === S.STATE_PERMISSION || state === S.STATE_LOADING;

            bumpStartGen(st);
            st.stopping = true;
            S.releaseMediaStream(st);
            S.hideLoadProgress(els);

            if (wasStarting && !st.parakeetModel) {
                unloadModel(engineId);
            }

            if (!wasListening) {
                teardownAll(engineId, els);
                teardownStream(engineId);
                st.state = S.isSupported() ? S.STATE_IDLE : S.STATE_UNSUPPORTED;
                S.setState(els, st.state);
                S.updateButton(els, false);
                S.setBusy(els, false, false);
                st.stopping = false;
                if (!opts.silent) S.setStatus(els, 'Annul\u00e9.', 'ok');
                if (c.facade) {
                    if (wasStarting && c.facade.ensureActiveEngineLoaded) c.facade.ensureActiveEngineLoaded();
                    if (c.facade.updateDictationButton) c.facade.updateDictationButton();
                    else if (c.facade.renderUi) c.facade.renderUi();
                }
                return;
            }

            if (wasListening) S.playDictationStopBeep(st, opts);
            S.clearDictationBeepSession(st);
            var producedText = st.gotAnyText;
            flushRemaining(engineId, els).then(function() {
                if (st.streamer && st.streamer.finalize) {
                    var fin = st.streamer.finalize();
                    if (fin && st.text) {
                        var finText = sanitizeParakeetText(fin.text, fin.words);
                        if (finText) {
                            st.text.finalizedSession = finText;
                            st.text.currentInterim = '';
                            st.text.apply();
                        }
                    }
                }
                if (st.text) {
                    st.text.finalizeInterim();
                    st.text.apply();
                    st.text.triggerSave();
                }
            }).finally(function() {
                if (!opts.silent && wasListening && !producedText && !st.chunkErrorReported) {
                    window.PDM.UI.notif(cfg.shortName + ' n\u2019a transcrit aucun texte. Ouvre la console (F12) pour les logs [PDM.STT.' + engineId + '], ou essaie Vosk.', 'info');
                }
                if (!opts.silent) S.setStatus(els, 'Dict\u00e9e termin\u00e9e.', 'ok');
                teardownAll(engineId, els);
                teardownStream(engineId);
                st.state = S.isSupported() ? S.STATE_IDLE : S.STATE_UNSUPPORTED;
                S.setState(els, st.state);
                S.updateButton(els, false);
                S.setBusy(els, false, false);
                st.stopping = false;
                if (c.facade && c.facade.updateDictationButton) c.facade.updateDictationButton();
                else if (c.facade && c.facade.renderUi) c.facade.renderUi();
            });
        },

        _reset: function(c) {
            var st = getPool(engineId);
            var wasStarting = st.state === S.STATE_PERMISSION || st.state === S.STATE_LOADING;
            bumpStartGen(st);
            S.releaseMediaStream(st);
            if (wasStarting && !st.parakeetModel) unloadModel(engineId);
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

        getStatusLabel: function() {
            var st = getPool(engineId);
            if (st.loadedModelId) {
                return cfg.shortName + ' \u2014 mod\u00e8le pr\u00eat (' + S.formatBackendLoadedLabel(st.usedBackend) + ')';
            }
            if (engine.isModelLoading()) {
                return cfg.shortName + ' \u2014 chargement en arri\u00e8re-plan (' + S.formatBackendLoadingLabel(engineId, S.wantsGpuCompute()) + ')\u2026';
            }
            return cfg.shortName + ' \u2014 pr\u00e9paration\u2026';
        },

        getLoadedBackend: function() {
            var st = getPool(engineId);
            return st.parakeetModel ? (st.usedBackend || 'wasm') : null;
        },
    };

    enginesById[engineId] = engine;
    window.PDM.STT.registerEngine(engine);
    return engine;
}

createParakeetEngine('parakeet');
