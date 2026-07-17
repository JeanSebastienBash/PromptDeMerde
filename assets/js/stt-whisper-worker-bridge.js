/**
 * PromptDeMerde.com — stt-whisper-worker-bridge.js
 *
 * Synopsis : Pont Worker Whisper (URL, handlers, transcription).
 */
import {
    WHISPER_DOWNLOAD_PERCENT_MAX, WHISPER_INIT_PERCENT_BASE,
    inferTimeoutMs, chunkLengthFor
} from './stt-whisper-config.js';

var S = window.PDM.STT.Shared;
function T(key, vars) { return S.sttT(key, vars); }

export function workerUrl() {
    return new URL('stt-whisper-worker.js', import.meta.url).href;
}

export function nextWorkerReqId(st) {
    st.workerReqSeq += 1;
    return st.workerReqSeq;
}

export function nextTranscribeId(st) {
    st.workerTranscribeSeq += 1;
    return st.workerTranscribeSeq;
}

export function terminateWorker(st) {
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

export function attachWorkerHandlers(id, st, worker, tracker, myGen, loadStartedAt, cfg, hooks) {
    hooks = hooks || {};
    var files = {};
    var onnxDone = 0;
    var initStarted = false;
    worker.onerror = function(err) {
        try { console.error('[PDM.STT.' + id + '] worker error', err); } catch (e) {}
        if (S.isWebGpuBrokenError && S.isWebGpuBrokenError(err && err.message ? err.message : err)) {
            if (hooks.onGpuBroken) hooks.onGpuBroken(id, 'worker-error');
        }
    };
    worker.onmessage = function(ev) {
        var msg = ev.data || {};
        if (msg.cmd === 'gpu-broken') {
            if (hooks.onGpuBroken) hooks.onGpuBroken(id, msg.reason || 'gpu-broken');
            return;
        }
        if (msg.cmd === 'backend-switched') {
            st.usedBackend = msg.backend || 'wasm';
            if (S.markWhisperGpuBroken) S.markWhisperGpuBroken();
            if (msg.reason === 'validation-error' || msg.reason === 'build-validation' || msg.reason === 'warmup-validation' || msg.reason === 'build-error' || msg.reason === 'warmup-error' || msg.reason === 'webgpu-broken') {
                window.PDM.UI.notif(T('gpuIncompatibleWhisper'), 'info');
            } else if (msg.reason === 'empty-transcribe' || msg.reason === 'transcribe-error') {
                window.PDM.UI.notif(T('gpuFallbackWhisper'), 'info');
            }
            if (window.PDM && window.PDM.STT && window.PDM.STT.renderUi) window.PDM.STT.renderUi();
            if (st.state === S.STATE_LISTENING) {
                var replayEls = window.PDM && window.PDM.STT && window.PDM.STT.getEls
                    ? window.PDM.STT.getEls() : null;
                import('./stt-whisper-model.js').then(function(mod) {
                    mod.replayLiveIfPending(id, replayEls);
                }).catch(function() {});
            }
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
                    tracker.fileProgress(T('loadDownloadModel'), loaded, total, pct);
                }
            } else if (p.status === 'init') {
                var backend = p.backend || st.usedBackend || 'onnx';
                var backendUp = String(backend).toUpperCase();
                var phaseLabel = T('loadOnnxInit', { backend: backendUp });
                if (p.phase === 'fallback-wasm') {
                    phaseLabel = T('loadCpuFallback');
                    backend = 'wasm';
                    backendUp = 'WASM';
                }
                if (tracker && tracker.startIndeterminate) {
                    initStarted = true;
                    var initBase = p.phase === 'warmup' ? 90 : WHISPER_INIT_PERCENT_BASE;
                    var initHint = p.phase === 'warmup' ? T('loadOnnxWarmup') : T('loadOnnx');
                    if (p.phase === 'fallback-wasm') initHint = T('loadWebgpuUnavailable');
                    tracker.startIndeterminate(phaseLabel, initBase, { backend: backend, hint: initHint });
                } else if (tracker && tracker.phase) {
                    var phaseHint = p.phase === 'warmup' ? T('loadOnnxWarmup') : T('loadOnnx');
                    tracker.phase(phaseLabel, p.phase === 'warmup' ? 92 : 75, phaseHint);
                }
            } else if (p.status === 'done' && p.file && /\.onnx$/.test(p.file)) {
                onnxDone++;
                if (onnxDone >= 2 && !initStarted && tracker && tracker.startIndeterminate) {
                    initStarted = true;
                    tracker.startIndeterminate(
                        T('loadOnnxInit', { backend: String(st.usedBackend || 'onnx').toUpperCase() }),
                        WHISPER_INIT_PERCENT_BASE,
                        { backend: st.usedBackend, hint: T('loadOnnxFilesLoaded') }
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
            if (msg.fellBackFromWebgpu) {
                if (S.markWhisperGpuBroken) S.markWhisperGpuBroken();
                window.PDM.UI.notif(T('gpuIncompatibleWhisper'), 'info');
            }
            if (tracker) {
                var loadSec = Math.round((Date.now() - loadStartedAt) / 1000);
                tracker.phase(T('loadModelReady'), 100, T('loadLoadedIn', { seconds: loadSec }));
            }
            if (st._loadResolve) { st._loadResolve(true); st._loadResolve = null; }
            return;
        }
        if (msg.cmd === 'result' && msg.transcribeId && st._transcribeWaiters) {
            if (msg.backend) st.usedBackend = msg.backend;
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
                    if (hooks.onGpuBroken) hooks.onGpuBroken(id, 'transcribe-error');
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

export function transcribeViaWorker(id, st, buf, opts) {
    opts = opts || {};
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
