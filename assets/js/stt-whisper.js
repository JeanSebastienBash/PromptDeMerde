/**
 * PromptDeMerde.com — Plugin dictée vocale Whisper (Mini / Maxi, transformers.js).
 *
 * Whisper n'est pas un vrai moteur "streaming" (il réanalyse une fenêtre de 30 s
 * à chaque inférence). On simule du live à LATENCE BORNÉE : une seule inférence en
 * vol à la fois, toujours sur le tampon courant, affichée en interim ; au-delà de
 * SEGMENT_SECONDS on fige le texte (commit) et on repart. Pas de file qui s'empile.
 *
 * transformers.js (~1,7 Mo) est chargé en import DYNAMIQUE au 1er clic : ainsi
 * l'enregistrement du moteur ci-dessous est toujours exécuté (le moteur reste
 * sélectionnable) même si la lib met du temps ou échoue à se charger.
 */
var S = window.PDM.STT.Shared;
var SAMPLE_RATE = 16000;
var SEGMENT_SECONDS = 2;
var SEGMENT_SAMPLES = SAMPLE_RATE * SEGMENT_SECONDS; // au-delà : on fige le segment (commit)
var MIN_INTERIM_SAMPLES = Math.floor(SAMPLE_RATE * 0.3);  // 0,3 s avant 1re tentative live
var MIN_VOICED_SAMPLES = Math.floor(SAMPLE_RATE * 0.35);  // minimum envoyé à Whisper
var MIN_RELAUNCH_SAMPLES = Math.floor(SAMPLE_RATE * 0.5); // nouveaux samples avant relance interim
var STREAM_INTERVAL_MS = 350;
var SILENCE_RMS = 0.0012;                             // seuil bas (micros faibles / vieux PC)
var INFER_TIMEOUT_WASM_MS = 120000;                   // CPU lent : ne pas abandonner en silence
var INFER_TIMEOUT_WEBGPU_MS = 120000;                 // GPU lent (1 Go VRAM) : même borne que WASM
var GPU_EMPTY_STREAK_FALLBACK = 1;                    // repli WASM après N transcriptions vides
var FLUSH_TIMEOUT_MS = 6000;                           // borne finalisation à l'arrêt
var WHISPER_DOWNLOAD_PERCENT_MAX = 68;                 // 0–68 % = fichiers ONNX ; 68–99 % = init GPU/CPU
var WHISPER_INIT_PERCENT_BASE = 68;
var STT_DIR = 'assets/stt/';
var VENDOR_DIR = 'assets/js/vendor/transformers/';

var ENGINE_CONFIGS = {
    'whisper-mini': {
        sizeLabel: '~50–90 Mo',
        shortName: 'Whisper Mini',
        label: 'Whisper Mini',
        helpSize: 'q4 CPU / q4f16 GPU'
    },
    'whisper-maxi': {
        sizeLabel: '~90–165 Mo',
        shortName: 'Whisper Maxi',
        label: 'Whisper Maxi',
        helpSize: 'hybride q4 CPU / fp16+q4 GPU'
    }
};

function resolveDtype(engineId, backend) {
    var gpu = backend === 'webgpu';
    if (engineId === 'whisper-mini') {
        if (gpu) {
            return {
                dtype: { encoder_model: 'q4f16', decoder_model_merged: 'q4f16' },
                dtypeKey: 'q4f16'
            };
        }
        return {
            dtype: { encoder_model: 'q4', decoder_model_merged: 'q4' },
            dtypeKey: 'q4'
        };
    }
    if (gpu) {
        return {
            dtype: { encoder_model: 'fp16', decoder_model_merged: 'q4' },
            dtypeKey: 'hybrid-fp16-q4'
        };
    }
    return {
        dtype: { encoder_model: 'q4', decoder_model_merged: 'q4' },
        dtypeKey: 'hybrid-q4'
    };
}

var pools = {};

function getPool(id) {
    if (!pools[id]) {
        pools[id] = {
            state: S.STATE_IDLE,
            transcriber: null,
            modelPromise: null,
            modelLoadGen: 0,
            audio: {},
            text: null,
            timers: { maxTimer: null, tickTimer: null },
            streamTimer: null,
            startTime: 0,
            stopping: false,
            startGen: 0,
            pendingSamples: new Float32Array(0),
            segProcessing: false,
            loadedModelId: null,
            usedBackend: null,
            usedDtype: null,
            worker: null,
            workerReady: false,
            workerReqSeq: 0,
            workerTranscribeSeq: 0,
            libLoadDetail: '',
            lastTranscribedSamples: 0,
            lang: 'fr',
            chunkErrorReported: false,
            gotAnyText: false,
            inferGen: 0,
            pendingStream: null,
            gpuEmptyStreak: 0,
            _wasmFallbackActive: false
        };
    }
    return pools[id];
}

function cfgFor(id) {
    return ENGINE_CONFIGS[id] || ENGINE_CONFIGS['whisper-mini'];
}

function log(id) {
    var eng = enginesById[id];
    if (!eng || !eng.debug) return;
    try {
        var args = ['[PDM.STT.' + id + ']'].concat(Array.prototype.slice.call(arguments, 1));
        console.log.apply(console, args);
    } catch (e) { /* ignore */ }
}

var enginesById = {};

function detectBackend(opts) {
    opts = opts || {};
    if (opts.forceBackend) return Promise.resolve(opts.forceBackend);
    if (!S.wantsGpuCompute()) return Promise.resolve('wasm');
    if (S.isWhisperGpuBroken && S.isWhisperGpuBroken()) return Promise.resolve('wasm');
    return S.detectOnnxBackend();
}

function getSttEls() {
    return window.PDM && window.PDM.STT && window.PDM.STT.getEls ? window.PDM.STT.getEls() : null;
}

function scheduleWhisperGpuBroken(id, reason) {
    var st = getPool(id);
    if (!st || st._wasmFallbackActive) return;
    if (st.usedBackend !== 'webgpu' && reason !== 'validation-error') return;
    whisperRuntimeWasmFallback(id, getSttEls(), reason);
}

function whisperRuntimeWasmFallback(id, els, reason) {
    var st = getPool(id);
    if (!st || st._wasmFallbackActive) return Promise.resolve(false);
    if (st.usedBackend !== 'webgpu' && reason !== 'force') return Promise.resolve(false);
    st._wasmFallbackActive = true;
    st.gpuEmptyStreak = 0;
    st.segProcessing = false;
    if (S.markWhisperGpuBroken) S.markWhisperGpuBroken();
    log(id, 'repli WASM', reason);
    var notifMsg = (reason === 'validation-error' || reason === 'gpu-broken' || reason === 'transcribe-error')
        ? 'WebGPU incompatible sur cette carte \u2014 repli CPU (WASM)\u2026'
        : 'Whisper GPU sans r\u00e9sultat \u2014 repli CPU (WASM)\u2026';
    window.PDM.UI.notif(notifMsg, 'info');
    if (els && els.status && st.state === S.STATE_LISTENING) {
        S.setStatus(els, 'Repli CPU (WASM) en cours\u2026', 'listening');
    }
    st.modelLoadGen++;
    st.modelPromise = null;
    st.workerReady = false;
    return terminateWorker(st).then(function() {
        return ensureModel(id, els, { background: st.state === S.STATE_LISTENING, forceBackend: 'wasm' });
    }).then(function() {
        st._wasmFallbackActive = false;
        if (st.state === S.STATE_LISTENING && els && els.status) {
            S.setStatus(els, '\u00c9coute en cours\u2026 (CPU)', 'listening');
        }
        window.PDM.UI.notif('Whisper actif en CPU (WASM).', 'ok');
        if (window.PDM && window.PDM.STT && window.PDM.STT.renderUi) window.PDM.STT.renderUi();
        return true;
    }).catch(function(err) {
        st._wasmFallbackActive = false;
        log(id, 'repli WASM \u00e9chou\u00e9', err);
        return false;
    });
}

function noteGpuEmptyResult(id, els, level, raw) {
    var st = getPool(id);
    if (!st || st.usedBackend !== 'webgpu' || st._wasmFallbackActive) return;
    if (level < SILENCE_RMS * 1.5) return;
    st.gpuEmptyStreak = (st.gpuEmptyStreak || 0) + 1;
    if (enginesById[id] && enginesById[id].debug) {
        log(id, 'GPU vide', 'streak=' + st.gpuEmptyStreak, 'raw=' + JSON.stringify(raw));
    }
    if (st.gpuEmptyStreak >= GPU_EMPTY_STREAK_FALLBACK) {
        whisperRuntimeWasmFallback(id, els, 'empty-streak');
    }
}

function isWasmSimdSupported() {
    try {
        return WebAssembly.validate(new Uint8Array([
            0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0,
            65, 0, 253, 15, 253, 98, 11
        ]));
    } catch (e) {
        return false;
    }
}

function whisperLanguage(lang) {
    if (!lang || lang === 'fr') return 'french';
    if (lang === 'en') return 'english';
    return lang;
}

function inferTimeoutMs(backend) {
    return backend === 'webgpu' ? INFER_TIMEOUT_WEBGPU_MS : INFER_TIMEOUT_WASM_MS;
}

function normalizeAudio(buf) {
    if (!buf || !buf.length) return buf;
    var peak = 0;
    for (var i = 0; i < buf.length; i++) {
        var a = Math.abs(buf[i]);
        if (a > peak) peak = a;
    }
    if (peak < 1e-7) return buf;
    var gain = Math.min(12, 0.9 / peak);
    if (gain <= 1.05) return buf;
    var out = new Float32Array(buf.length);
    for (var j = 0; j < buf.length; j++) {
        out[j] = Math.max(-1, Math.min(1, buf[j] * gain));
    }
    return out;
}

function bumpStartGen(st) {
    st.startGen = (st.startGen || 0) + 1;
    return st.startGen;
}

function isStartStale(st, gen) {
    return gen !== st.startGen;
}

function workerUrl() {
    return new URL('stt-whisper-worker.js', import.meta.url).href;
}

function nextWorkerReqId(st) {
    st.workerReqSeq += 1;
    return st.workerReqSeq;
}

function nextTranscribeId(st) {
    st.workerTranscribeSeq += 1;
    return st.workerTranscribeSeq;
}

function terminateWorker(st) {
    if (!st.worker) return Promise.resolve();
    var w = st.worker;
    st.worker = null;
    st.workerReady = false;
    var reqId = nextWorkerReqId(st);
    return new Promise(function(resolve) {
        var timer = setTimeout(function() {
            try { w.terminate(); } catch (e) {}
            resolve();
        }, 1500);
        w.onmessage = function() {
            clearTimeout(timer);
            try { w.terminate(); } catch (e) {}
            resolve();
        };
        try { w.postMessage({ cmd: 'dispose', reqId: reqId }); } catch (e) {
            clearTimeout(timer);
            try { w.terminate(); } catch (e2) {}
            resolve();
        }
    });
}

function attachWorkerHandlers(id, st, worker, tracker, myGen, loadStartedAt, cfg) {
    var files = {};
    var onnxDone = 0;
    var initStarted = false;
    worker.onerror = function(err) {
        try { console.error('[PDM.STT.' + id + '] worker error', err); } catch (e) {}
        if (S.isWebGpuBrokenError && S.isWebGpuBrokenError(err && err.message ? err.message : err)) {
            scheduleWhisperGpuBroken(id, 'worker-error');
        }
    };
    worker.onmessage = function(ev) {
        var msg = ev.data || {};
        if (msg.cmd === 'gpu-broken') {
            scheduleWhisperGpuBroken(id, msg.reason || 'gpu-broken');
            return;
        }
        if (msg.cmd === 'progress' && msg.payload) {
            var p = msg.payload;
            if (p.status === 'progress' && p.file) {
                files[p.file] = { loaded: p.loaded || 0, total: p.total || 0 };
                var loaded = 0, total = 0;
                for (var k in files) {
                    if (files.hasOwnProperty(k)) { loaded += files[k].loaded; total += files[k].total; }
                }
                var pct = total > 0 ? Math.round(loaded / total * WHISPER_DOWNLOAD_PERCENT_MAX) : null;
                if (tracker && tracker.fileProgress) {
                    tracker.fileProgress('T\u00e9l\u00e9chargement du mod\u00e8le', loaded, total, pct);
                }
            } else if (p.status === 'init') {
                var backend = p.backend || st.usedBackend || 'onnx';
                var backendUp = String(backend).toUpperCase();
                var phaseLabel = 'Initialisation ONNX (' + backendUp + ')';
                if (p.phase === 'fallback-wasm') {
                    phaseLabel = 'Repli CPU (WASM)';
                    backend = 'wasm';
                    backendUp = 'WASM';
                }
                if (tracker && tracker.startIndeterminate) {
                    initStarted = true;
                    var initBase = p.phase === 'warmup' ? 90 : WHISPER_INIT_PERCENT_BASE;
                    var initHint = p.phase === 'warmup' ? 'Warmup mod\u00e8le' : 'Chargement ONNX';
                    if (p.phase === 'fallback-wasm') initHint = 'WebGPU indisponible, repli WASM';
                    tracker.startIndeterminate(phaseLabel, initBase, { backend: backend, hint: initHint });
                } else if (tracker && tracker.phase) {
                    var phaseHint = p.phase === 'warmup' ? 'Warmup mod\u00e8le' : 'Chargement ONNX';
                    tracker.phase(phaseLabel, p.phase === 'warmup' ? 92 : 75, phaseHint);
                }
            } else if (p.status === 'done' && p.file && /\.onnx$/.test(p.file)) {
                onnxDone++;
                if (onnxDone >= 2 && !initStarted && tracker && tracker.startIndeterminate) {
                    initStarted = true;
                    tracker.startIndeterminate(
                        'Initialisation ONNX (' + String(st.usedBackend || 'onnx').toUpperCase() + ')',
                        WHISPER_INIT_PERCENT_BASE,
                        { backend: st.usedBackend, hint: 'Fichiers ONNX charg\u00e9s' }
                    );
                }
            }
            return;
        }
        if (msg.cmd === 'loaded') {
            if (myGen !== st.modelLoadGen) return;
            st.workerReady = true;
            st.transcriber = true;
            st.loadedModelId = id + '-' + (st.usedDtype || cfg.dtypeKey);
            st.usedBackend = msg.backend || st.usedBackend || 'wasm';
            if (tracker) {
                tracker.phase('Mod\u00e8le pr\u00eat', 100, 'Charg\u00e9 en ' + Math.round((Date.now() - loadStartedAt) / 1000) + ' s');
            }
            if (st._loadResolve) { st._loadResolve(true); st._loadResolve = null; }
            return;
        }
        if (msg.cmd === 'result' && msg.transcribeId && st._transcribeWaiters) {
            var waiter = st._transcribeWaiters[msg.transcribeId];
            if (waiter) {
                delete st._transcribeWaiters[msg.transcribeId];
                waiter.resolve(msg.text || '');
            }
            return;
        }
        if (msg.cmd === 'error') {
            if (msg.transcribeId && st._transcribeWaiters && st._transcribeWaiters[msg.transcribeId]) {
                var tw = st._transcribeWaiters[msg.transcribeId];
                delete st._transcribeWaiters[msg.transcribeId];
                if (S.isWebGpuBrokenError && S.isWebGpuBrokenError(msg.message) && st.usedBackend === 'webgpu') {
                    scheduleWhisperGpuBroken(id, 'transcribe-error');
                }
                tw.reject(new Error(msg.message || 'worker-error'));
                return;
            }
            if (st._loadReject) {
                st._loadReject(new Error(msg.message || 'worker-load-error'));
                st._loadReject = null;
                st._loadResolve = null;
            }
        }
    };
}

function transcribeViaWorker(id, buf, opts) {
    opts = opts || {};
    var st = getPool(id);
    if (!st.worker || !st.workerReady) return Promise.resolve('');
    if (!st._transcribeWaiters) st._transcribeWaiters = {};
    var transcribeId = nextTranscribeId(st);
    var myGen = opts.force ? -1 : st.inferGen;
    return new Promise(function(resolve, reject) {
        var timer = setTimeout(function() {
            delete st._transcribeWaiters[transcribeId];
            reject(Object.assign(new Error('transcribe-timeout'), { code: 'transcribe-timeout' }));
        }, inferTimeoutMs(st.usedBackend || 'wasm'));
        st._transcribeWaiters[transcribeId] = {
            resolve: function(text) {
                clearTimeout(timer);
                if (!opts.force && myGen !== st.inferGen) resolve('');
                else resolve(text);
            },
            reject: function(err) {
                clearTimeout(timer);
                reject(err);
            }
        };
        try {
            st.worker.postMessage({
                cmd: 'transcribe',
                reqId: nextWorkerReqId(st),
                transcribeId: transcribeId,
                audio: buf.buffer,
                audioSamples: buf.length,
                lang: st.lang,
                chunkLengthS: chunkLengthFor(buf)
            }, [buf.buffer]);
        } catch (e) {
            clearTimeout(timer);
            delete st._transcribeWaiters[transcribeId];
            reject(e);
        }
    });
}

function modelDirFor(id) {
    return STT_DIR + id + '/';
}

function modelLoadErrorHint(id) {
    return 'Mod\u00e8le Whisper absent dans ' + modelDirFor(id);
}

function checkModelFiles(id) {
    var url = S.modelAbsoluteUrl(modelDirFor(id) + 'config.json');
    return fetch(url, { method: 'HEAD', cache: 'no-store' }).then(function(r) {
        if (!r.ok) throw new Error('missing-model');
        return true;
    });
}

function unloadModel(id) {
    var st = getPool(id);
    st.modelLoadGen++;
    st.transcriber = null;
    st.workerReady = false;
    st.modelPromise = null;
    st._loadResolve = null;
    st._loadReject = null;
    st._transcribeWaiters = {};
    if (st.streamTimer) { clearInterval(st.streamTimer); st.streamTimer = null; }
    st.pendingSamples = new Float32Array(0);
    st.segProcessing = false;
    st.inferGen++;
    st.loadedModelId = null;
    st.usedBackend = null;
    st.usedDtype = null;
    st.lastTranscribedSamples = 0;
    terminateWorker(st);
}

function ensureModel(id, els, opts) {
    opts = opts || {};
    var st = getPool(id);
    var cfg = cfgFor(id);
    var background = !!opts.background;
    if (st.workerReady && st.worker && !opts.forceBackend) return Promise.resolve(true);
    if (st.modelPromise && !opts.forceBackend) return st.modelPromise;
    var myGen = st.modelLoadGen;
    var tracker = background
        ? S.createBackgroundLoadTracker(cfg.shortName, function(p) {
            if (window.PDM.STT && window.PDM.STT.reportLoadProgress) window.PDM.STT.reportLoadProgress(p);
        })
        : S.createLoadTracker(els, cfg.shortName);
    if (!background) {
        tracker.els = els;
        st.state = S.STATE_LOADING;
        S.setState(els, st.state);
        tracker.show();
        tracker.phase('Chargement du worker', 0, cfg.sizeLabel);
    } else {
        tracker.phase('Chargement du worker', 0, cfg.sizeLabel);
    }
    var loadStartedAt = Date.now();

    st.modelPromise = checkModelFiles(id).then(function() {
        if (myGen !== st.modelLoadGen) throw new Error('cancelled');
        return detectBackend(opts);
    }).then(function(backend) {
        if (myGen !== st.modelLoadGen) throw new Error('cancelled');
        var resolved = resolveDtype(id, backend);
        st.usedBackend = backend;
        st.usedDtype = resolved.dtypeKey;
        var wasmResolved = resolveDtype(id, 'wasm');
        if (st.worker) terminateWorker(st);
        var worker;
        try {
            worker = new Worker(workerUrl(), { type: 'module' });
        } catch (e) {
            st.libLoadDetail = e && e.message ? e.message : 'Worker indisponible';
            throw new Error('lib-load');
        }
        st.worker = worker;
        attachWorkerHandlers(id, st, worker, tracker, myGen, loadStartedAt, cfg);
        tracker.phase('Chargement de la librairie', 5, backend.toUpperCase());
        return new Promise(function(resolve, reject) {
            st._loadResolve = resolve;
            st._loadReject = reject;
            worker.postMessage({
                cmd: 'load',
                reqId: nextWorkerReqId(st),
                modelId: id,
                dtype: resolved.dtype,
                wasmDtype: wasmResolved.dtype,
                backend: backend,
                lang: st.lang,
                paths: {
                    modelsDir: S.modelAbsoluteUrl(STT_DIR),
                    vendorDir: S.modelAbsoluteUrl(VENDOR_DIR),
                    simd: isWasmSimdSupported()
                }
            });
        });
    }).then(function() {
        if (myGen !== st.modelLoadGen) throw new Error('cancelled');
        log(id, 'mod\u00e8le charg\u00e9 (worker)');
        return true;
    }).catch(function(err) {
        unloadModel(id);
        if (err && err.message && err.message.indexOf('worker') >= 0) {
            st.libLoadDetail = err.message;
            throw new Error('lib-load');
        }
        throw err;
    }).finally(function() {
        tracker.hide();
        if (window.PDM.STT) window.PDM.STT.renderUi();
    });
    return st.modelPromise;
}

function appendSamples(id, samples) {
    var st = getPool(id);
    if (!samples || !samples.length) return;
    var merged = new Float32Array(st.pendingSamples.length + samples.length);
    merged.set(st.pendingSamples, 0);
    merged.set(samples, st.pendingSamples.length);
    st.pendingSamples = merged;
}

function rms(buf) {
    if (!buf.length) return 0;
    var sum = 0;
    for (var i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    return Math.sqrt(sum / buf.length);
}

function frameRms(buf, off, len) {
    var s = 0;
    for (var i = 0; i < len && off + i < buf.length; i++) { var v = buf[off + i] || 0; s += v * v; }
    return Math.sqrt(s / len);
}

// VAD minimal : on rogne le silence au début/à la fin pour n'envoyer à Whisper
// que la partie « voix ». Le silence (padding 30 s) est la 1re cause d'hallucinations.
function trimSilence(buf) {
    var win = Math.round(SAMPLE_RATE * 0.02); // fenêtres de 20 ms
    var thr = SILENCE_RMS;
    var start = -1, end = -1;
    for (var i = 0; i + win <= buf.length; i += win) {
        if (frameRms(buf, i, win) > thr) { start = i; break; }
    }
    if (start < 0) return new Float32Array(0);
    for (var j = buf.length - win; j >= 0; j -= win) {
        if (frameRms(buf, j, win) > thr) { end = j + win; break; }
    }
    if (end <= start) return new Float32Array(0);
    var pad = win * 4; // un peu de marge pour ne pas couper les attaques/fins de mots
    start = Math.max(0, start - pad);
    end = Math.min(buf.length, end + pad);
    return buf.slice(start, end);
}

// Annotations non-verbales que Whisper produit sur du bruit/silence.
function stripAnnotations(s) {
    return s
        .replace(/\([^)]*\)/g, ' ')
        .replace(/\[[^\]]*\]/g, ' ')
        .replace(/\*[^*]*\*/g, ' ')
        .replace(/[\u266a\u266b\u2669\u266c\u2103]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// Phrases-fantômes classiques (sous-titres YouTube) hallucinées sur du silence.
var HALLU_RE = [
    /sous[- ]?titr\w*/i,
    /amara\.?org/i,
    /merci d['\u2019 ]?avoir regard/i,
    /merci d['\u2019 ]?avoir suivi/i,
    /abonnez[- ]?vous/i,
    /n['\u2019 ]?oubliez pas (de vous )?(abonner|liker)/i,
    /je vous invite \u00e0 vous (faire|abonner|inscrire)/i,
    /(partagez|aimez|likez).{0,20}vid[\u00e9e]o/i,
    /\u00e0 (la )?(tr\u00e8s )?(bient\u00f4t|prochaine)/i,
    /g[\u00e9e]n[\u00e9e]rique/i,
    /^\s*musique\s*\.?\s*$/i,
    /^\s*applaudissements\s*\.?\s*$/i,
    /^\s*merci\s*\.?\s*$/i,
    /^\s*sous-titrage\b/i
];

function isHallucination(s) {
    for (var i = 0; i < HALLU_RE.length; i++) {
        if (HALLU_RE[i].test(s)) return true;
    }
    return false;
}

function cleanTranscript(s, opts) {
    opts = opts || {};
    if (!s) return '';
    var c = stripAnnotations(s);
    if (!c) return '';
    if (!opts.strict && c.length > 1) return c;
    if (isHallucination(c)) return '';
    return c;
}

function logSeg(id, level, raw, clean) {
    try {
        console.info('[PDM.STT.' + id + '] rms=' + level.toFixed(3) +
            ' brut=' + JSON.stringify(raw) + ' \u2192 ' + JSON.stringify(clean));
    } catch (e) {}
}

function chunkLengthFor(buf) {
    var dur = buf.length / SAMPLE_RATE;
    if (dur < MIN_VOICED_SAMPLES / SAMPLE_RATE) return 0;
    return Math.min(30, Math.max(1, Math.ceil(dur)));
}

function prepareAudioForWhisper(buf, isFinal) {
    var normalized = normalizeAudio(buf);
    if (!isFinal) return normalized;
    var voiced = trimSilence(normalized);
    return voiced.length >= MIN_VOICED_SAMPLES ? voiced : normalized;
}

function transcribeBuffer(id, buf, isFinal, opts) {
    opts = opts || {};
    var st = getPool(id);
    if (!st.workerReady || (st.stopping && !opts.force)) return Promise.resolve('');
    var voiced = prepareAudioForWhisper(buf, isFinal);
    var level = rms(voiced);
    if (voiced.length < MIN_VOICED_SAMPLES || level < SILENCE_RMS) {
        if (isFinal) logSeg(id, rms(buf), '(silence ignor\u00e9)', '');
        return Promise.resolve('');
    }
    var sendBuf = voiced;
    if (voiced.byteOffset !== 0 || voiced.byteLength !== voiced.buffer.byteLength) {
        sendBuf = voiced.slice(0);
    }
    var els = opts.els;
    return transcribeViaWorker(id, sendBuf, opts).then(function(raw) {
        if (st.stopping && !opts.force) return '';
        var clean = cleanTranscript(raw, { strict: isFinal });
        if (!clean && raw && raw.length > 1 && !isFinal) clean = raw.trim();
        if (clean) {
            st.gpuEmptyStreak = 0;
        } else if (st.usedBackend === 'webgpu' && els) {
            noteGpuEmptyResult(id, els, level, raw);
        }
        if (isFinal || (raw && !clean)) logSeg(id, level, raw, clean);
        return clean;
    }).catch(function(e) {
        if (st.stopping) return '';
        if (e && e.code === 'transcribe-timeout') {
            if (st.usedBackend === 'webgpu' && els) {
                whisperRuntimeWasmFallback(id, els, 'timeout');
            }
            if (!st.chunkErrorReported) {
                st.chunkErrorReported = true;
                window.PDM.UI.notif('Whisper met trop de temps — continue de parler ou essaie Vosk Mini.', 'info');
            }
            return '';
        }
        throw e;
    });
}

// Latence BORNÉE : une seule transcription en vol à la fois (garde segProcessing).
// On transcrit toujours le tampon « live » courant (audio depuis le dernier commit),
// affiché en interim. Quand ce tampon dépasse SEGMENT_SAMPLES, on fige (commit) et
// on repart. Ainsi la latence ≈ une inférence, jamais une file qui s'accumule.
function processLive(id, els) {
    var st = getPool(id);
    if (st.segProcessing || st.stopping || !st.workerReady || st.state !== S.STATE_LISTENING) return;
    if (st.pendingSamples.length < MIN_INTERIM_SAMPLES) return;
    var newSamples = st.pendingSamples.length - (st.lastTranscribedSamples || 0);
    if (newSamples < MIN_RELAUNCH_SAMPLES && st.pendingSamples.length < SEGMENT_SAMPLES) return;
    st.segProcessing = true;
    if (!st.gotAnyText) {
        S.setStatus(els, 'Analyse vocale en cours\u2026', 'listening');
    }
    var snapshot = st.pendingSamples.slice(0);
    var isFinal = snapshot.length >= SEGMENT_SAMPLES;
    var inferStart = Date.now();
    var audioDur = snapshot.length / SAMPLE_RATE;
    transcribeBuffer(id, snapshot, isFinal, { els: els }).then(function(t) {
        if (enginesById[id] && enginesById[id].debug) {
            var inferMs = Date.now() - inferStart;
            log(id, 'RTF', audioDur > 0 ? (audioDur / (inferMs / 1000)).toFixed(2) + 'x' : 'n/a',
                'inferMs=' + inferMs, 'audio=' + audioDur.toFixed(2) + 's', 'final=' + isFinal);
        }
        if (st.stopping || st.state !== S.STATE_LISTENING || !st.text) return;
        if (isFinal) {
            if (t) { st.gotAnyText = true; st.text.setFinalized(t); }
            st.pendingSamples = snapshot.length <= st.pendingSamples.length
                ? st.pendingSamples.slice(snapshot.length)
                : new Float32Array(0);
            st.lastTranscribedSamples = 0;
            st.text.setInterim('');
            S.setStatus(els, '\u00c9coute en cours\u2026 transcription active', 'listening');
        } else if (t) {
            st.gotAnyText = true;
            st.text.setInterim(t);
            st.lastTranscribedSamples = snapshot.length;
        }
    }).catch(function(e) {
        if (st.stopping) return;
        try { console.error('[PDM.STT.' + id + '] transcription error', e); } catch (ee) {}
        if (!st.chunkErrorReported && st.state === S.STATE_LISTENING) {
            st.chunkErrorReported = true;
            var msg = 'Erreur de transcription Whisper : ' + (e && e.message ? e.message : e);
            S.setStatus(els, msg, 'error');
            window.PDM.UI.notif(msg + ' \u2014 essaie Vosk si \u00e7a persiste.', 'err');
            if (st.usedBackend === 'webgpu') whisperRuntimeWasmFallback(id, els, 'error');
        }
    }).then(function() {
        st.segProcessing = false;
        if (!st.stopping && isFinal && st.pendingSamples.length >= SEGMENT_SAMPLES) processLive(id, els);
    });
}

function flushRemaining(id, els) {
    var st = getPool(id);
    if (!st.workerReady) return Promise.resolve();
    var tail = st.pendingSamples.slice(0);
    st.pendingSamples = new Float32Array(0);
    if (tail.length < MIN_VOICED_SAMPLES) return Promise.resolve();
    return transcribeBuffer(id, tail, true, { force: true }).then(function(t) {
        if (st.text) {
            if (t) { st.gotAnyText = true; st.text.setFinalized(t); }
            st.text.setInterim('');
        }
    }).catch(function(e) {
        if (e && e.code !== 'flush-timeout') log(id, 'flush error', e);
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

    st.pendingSamples = new Float32Array(0);
    st.segProcessing = false;
    st.gotAnyText = false;
    st.chunkErrorReported = false;
    st.lastTranscribedSamples = 0;

    return S.setupMicCapture(st, stream, {
        sampleRate: SAMPLE_RATE,
        onProcess: function(ev) {
            if (st.state !== S.STATE_LISTENING || !st.workerReady) return;
            S.tryDictationStartBeep(st);
            appendSamples(id, extractMono(ev, st.audio.audioContext.sampleRate));
        }
    }).then(function() {

        if (st.streamTimer) clearInterval(st.streamTimer);
        st.streamTimer = setInterval(function() { processLive(id, els); }, STREAM_INTERVAL_MS);

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

function teardownAll(id, els) {
    var st = getPool(id);
    if (st.streamTimer) { clearInterval(st.streamTimer); st.streamTimer = null; }
    S.teardownAudioNodes(st.audio);
    S.clearTimers(st.timers);
    S.hideLoadProgress(els);
}

function teardownStream(id) {
    var st = getPool(id);
    if (st.streamTimer) { clearInterval(st.streamTimer); st.streamTimer = null; }
    st.pendingSamples = new Float32Array(0);
    st.segProcessing = false;
    st.chunkErrorReported = false;
}

function createWhisperEngine(engineId) {
    var cfg = cfgFor(engineId);

    var engine = {
        id: engineId,
        label: cfg.label,
        shortName: cfg.shortName,
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
            var gpu = S.hasWebGPU() ? 'WebGPU si dispo, sinon CPU' : 'CPU (WASM)';
            return 'Dict\u00e9e ' + cfg.shortName + ' (' + cfg.helpSize + ') : autocorrection \u00e0 l\u2019oral. ' + gpu + '. Segments ~' + SEGMENT_SECONDS + ' s.';
        },

        unloadModel: function() { unloadModel(engineId); },

        isModelReady: function() {
            return !!getPool(engineId).workerReady;
        },

        isModelLoading: function() {
            var st = getPool(engineId);
            return !!(st.modelPromise && !st.workerReady);
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

            if (c.getLang) {
                try { st.lang = c.getLang() || 'fr'; } catch (e) { st.lang = 'fr'; }
            }

            st.stopping = false;
            st.inferGen = 0;
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
                if (isStartStale(st, startGen)) { s.getTracks().forEach(function(t) { t.stop(); }); st.pendingStream = null; throw new Error('cancelled'); }
                if (st.workerReady) return true;
                st.state = S.STATE_LOADING;
                S.setState(els, st.state);
                S.setStatus(els, 'Chargement de ' + cfg.shortName + '\u2026', 'listening');
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
                    log(engineId, 'engine error', err);
                    var missing = err && err.message === 'missing-model';
                    var libLoad = err && err.message === 'lib-load';
                    var oom = err && /memory|oom|alloc/i.test(String(err.message || err));
                    var base = libLoad ? 'Librairie Whisper (transformers.js) non charg\u00e9e.'
                        : (missing ? 'Mod\u00e8le Whisper introuvable.'
                        : (oom ? 'M\u00e9moire insuffisante pour Whisper.' : '\u00c9chec du moteur Whisper.'));
                    var detail = libLoad ? st.libLoadDetail : (err && err.message ? err.message : '');
                    S.setStatus(els, base + ' ' + detail, 'error');
                    var hint = libLoad ? ('Cause : ' + (st.libLoadDetail || 'inconnue') + ' \u2014 vide le cache (Ctrl+Shift+R).')
                        : (missing ? modelLoadErrorHint(engineId)
                        : (oom ? 'Ferme d\u2019autres onglets ou utilise Vosk (Petit).' : modelLoadErrorHint(engineId)));
                    window.PDM.UI.notif(hint, 'err');
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
            st.inferGen++;

            S.releaseMediaStream(st);
            if (st.streamTimer) { clearInterval(st.streamTimer); st.streamTimer = null; }
            S.teardownAudioNodes(st.audio);
            S.clearTimers(st.timers);
            S.hideLoadProgress(els);

            if (wasStarting && !st.workerReady) {
                unloadModel(engineId);
            }

            if (!wasListening && !wasStarting) {
                engine._reset(c);
                return;
            }

            if (wasListening) S.playDictationStopBeep(st, opts);
            S.clearDictationBeepSession(st);

            var producedText = st.gotAnyText;
            var tail = wasListening ? st.pendingSamples.slice(0) : new Float32Array(0);
            if (wasListening && st.text) {
                st.text.finalizeInterim();
                st.text.apply();
                st.text.triggerSave();
            }

            st.state = S.isSupported() ? S.STATE_IDLE : S.STATE_UNSUPPORTED;
            S.setState(els, st.state);
            S.updateButton(els, false);
            S.setBusy(els, false, false);
            st.stopping = false;

            if (!opts.silent) {
                S.setStatus(els, wasListening ? 'Dict\u00e9e termin\u00e9e.' : 'Annul\u00e9.', 'ok');
            }

            teardownStream(engineId);

            if (wasListening && !producedText && !st.gotAnyText && !st.chunkErrorReported && !opts.silent) {
                window.PDM.UI.notif(cfg.shortName + ' n\u2019a transcrit aucun texte. Ouvre la console (F12), ou essaie Vosk.', 'info');
            }

            if (c.facade) {
                if (wasStarting && c.facade.ensureActiveEngineLoaded) c.facade.ensureActiveEngineLoaded();
                if (c.facade.updateDictationButton) c.facade.updateDictationButton();
                else if (c.facade.renderUi) c.facade.renderUi();
            }

            if (wasListening && st.workerReady && tail.length >= MIN_VOICED_SAMPLES) {
                transcribeBuffer(engineId, tail, true, { force: true }).then(function(t) {
                    if (!t || !st.text) return;
                    st.text.setFinalized(t);
                    st.text.setInterim('');
                    st.text.apply();
                    st.text.triggerSave();
                }).catch(function() {});
            }
        },

        _reset: function(c) {
            var st = getPool(engineId);
            var wasStarting = st.state === S.STATE_PERMISSION || st.state === S.STATE_LOADING;
            bumpStartGen(st);
            S.releaseMediaStream(st);
            if (wasStarting && !st.workerReady) unloadModel(engineId);
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
            if (engine.isModelLoading()) return cfg.shortName + ' \u2014 chargement en arri\u00e8re-plan\u2026';
            return cfg.shortName + ' \u2014 pr\u00e9paration\u2026';
        },

        getLoadedBackend: function() {
            var st = getPool(engineId);
            return st.workerReady ? (st.usedBackend || 'wasm') : null;
        },
    };

    enginesById[engineId] = engine;
    window.PDM.STT.registerEngine(engine);
    return engine;
}

createWhisperEngine('whisper-mini');
createWhisperEngine('whisper-maxi');

if (window.PDM.STT.syncEngineSelect) window.PDM.STT.syncEngineSelect();
if (window.PDM.STT.refresh) window.PDM.STT.refresh();
