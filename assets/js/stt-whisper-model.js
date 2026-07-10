/**
 * PromptDeMerde.com — stt-whisper-model.js
 *
 * Synopsis : État pools, chargement et déchargement modèles Whisper.
 */
import {
    STT_DIR, VENDOR_DIR, cfgFor, modelDirFor, resolveDtype,
    GPU_EMPTY_STREAK_FALLBACK, SILENCE_RMS
} from './stt-whisper-config.js';
import {
    workerUrl, terminateWorker, attachWorkerHandlers, nextWorkerReqId
} from './stt-whisper-worker-bridge.js';

var S = window.PDM.STT.Shared;

export var pools = {};
export var enginesById = {};

export function getPool(id) {
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

export function log() {}

export function getSttEls() {
    return window.PDM && window.PDM.STT && window.PDM.STT.getEls ? window.PDM.STT.getEls() : null;
}

function detectBackend(opts) {
    opts = opts || {};
    if (opts.forceBackend) return Promise.resolve(opts.forceBackend);
    if (!S.wantsGpuCompute()) return Promise.resolve('wasm');
    if (S.isWhisperGpuBroken && S.isWhisperGpuBroken()) return Promise.resolve('wasm');
    return S.detectOnnxBackend();
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

export function scheduleWhisperGpuBroken(id, reason) {
    var st = getPool(id);
    if (!st || st._wasmFallbackActive) return;
    if (st.usedBackend !== 'webgpu' && reason !== 'validation-error') return;
    whisperRuntimeWasmFallback(id, getSttEls(), reason);
}

export function whisperRuntimeWasmFallback(id, els, reason) {
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

export function noteGpuEmptyResult(id, els, level, raw) {
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

export function checkModelFiles(id) {
    var url = S.modelAbsoluteUrl(modelDirFor(id) + 'config.json');
    return fetch(url, { method: 'HEAD', cache: 'no-store' }).then(function(r) {
        if (!r.ok) throw new Error('missing-model');
        return true;
    });
}

export function unloadModel(id) {
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

export function ensureModel(id, els, opts) {
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
        attachWorkerHandlers(id, st, worker, tracker, myGen, loadStartedAt, cfg, {
            onGpuBroken: scheduleWhisperGpuBroken
        });
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
