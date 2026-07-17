/**
 * PromptDeMerde.com — stt-whisper-worker.js
 *
 * Synopsis : Web Worker d'inférence Whisper hors thread principal.
 * Objectif : Charger transformers.js et exécuter pipeline.transcribe sans geler l'UI.
 */
import { pipeline, env } from './vendor/transformers/transformers-lib.js';

var transcriber = null;
var envReady = false;
var loadGen = 0;
var activeBackend = 'wasm';
var lastLoadMsg = null;
var webgpuValidationCount = 0;
var gpuBrokenPosted = false;
var webgpuDeviceBroken = false;

function noteWebGpuValidation(msg) {
    if (!isWebGpuBrokenMessage(msg)) return;
    webgpuValidationCount++;
    webgpuDeviceBroken = true;
}

function hookWebGpuDeviceErrors() {
    if (activeBackend !== 'webgpu') return;
    try {
        var webgpu = env.backends && env.backends.onnx && env.backends.onnx.webgpu;
        if (!webgpu) return;
        var dev = webgpu.device;
        if (!dev || dev._pdmUncapturedHooked) return;
        dev._pdmUncapturedHooked = true;
        var prev = dev.onuncapturederror;
        dev.onuncapturederror = function(ev) {
            var err = ev && ev.error;
            var msg = err && err.message ? err.message : (err ? String(err) : '');
            noteWebGpuValidation(msg);
            if (!isWebGpuBrokenMessage(msg) && typeof prev === 'function') prev.call(dev, ev);
        };
    } catch (e) {  }
}

function resetWebGpuErrorState() {
    webgpuValidationCount = 0;
    webgpuDeviceBroken = false;
    gpuBrokenPosted = false;
}

function installWebGpuConsoleTap() {
    if (self._pdmWebGpuConsoleTap) return;
    self._pdmWebGpuConsoleTap = true;
    var prev = console.error;
    console.error = function() {
        var joined = '';
        for (var i = 0; i < arguments.length; i++) {
            joined += (i ? ' ' : '') + String(arguments[i]);
        }
        if (/WebGPU validation error|Invalid ComputePipeline|Invalid BindGroupLayout|Invalid CommandBuffer|Error while parsing WGSL|f16 extension|shader-f16/i.test(joined)) {
            noteWebGpuValidation(joined);
            return;
        }
        return prev.apply(console, arguments);
    };
}

async function waitForWebGpuErrors(ms) {
    hookWebGpuDeviceErrors();
    await new Promise(function(resolve) { setTimeout(resolve, ms || 200); });
    hookWebGpuDeviceErrors();
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

function isWebGpuBrokenMessage(msg) {
    if (!msg) return false;
    return /webgpu|validation error|Invalid ComputePipeline|Invalid BindGroupLayout|Invalid CommandBuffer|device was lost|Device lost|Out of memory|OOM|shader-f16|f16 extension|Error while parsing WGSL/i.test(String(msg));
}

function postGpuBroken(reason) {
    if (gpuBrokenPosted || activeBackend !== 'webgpu') return;
    gpuBrokenPosted = true;
    self.postMessage({ cmd: 'gpu-broken', reason: reason || 'webgpu-validation' });
}

self.addEventListener('error', function(ev) {
    noteWebGpuValidation(ev && ev.message ? ev.message : '');
    if (webgpuValidationCount >= 1) postGpuBroken('validation-error');
});

self.addEventListener('unhandledrejection', function(ev) {
    var m = '';
    if (ev && ev.reason) {
        m = ev.reason.message || String(ev.reason);
    }
    noteWebGpuValidation(m);
    if (webgpuValidationCount >= 1) postGpuBroken('rejection');
});

function configureEnv(paths) {
    if (envReady) return;
    env.allowRemoteModels = false;
    env.allowLocalModels = true;
    var models = paths.modelsDir;
    if (!models.endsWith('/')) models += '/';
    env.localModelPath = models;
    var wasm = paths.vendorDir;
    if (!wasm.endsWith('/')) wasm += '/';
    try {
        env.backends.onnx.wasm.wasmPaths = wasm;
        var cores = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 2;
        env.backends.onnx.wasm.numThreads = Math.min(2, Math.max(1, cores));
        env.backends.onnx.wasm.simd = paths.simd !== false && isWasmSimdSupported();
    } catch (e) {  }
    envReady = true;
}

var WHISPER_LANG_MAP = {
    fr: 'french',
    en: 'english',
    ar: 'arabic',
    zh: 'chinese',
    eo: 'english',
    es: 'spanish',
    de: 'german',
    pt: 'portuguese',
    it: 'italian',
    ru: 'russian',
    ja: 'japanese',
    ko: 'korean'
};

function whisperLanguage(lang) {
    lang = lang || 'fr';
    return WHISPER_LANG_MAP[lang] || WHISPER_LANG_MAP.en || 'english';
}

function parseText(out) {
    if (!out) return '';
    if (typeof out === 'string') return out.trim();
    if (out.text != null) return String(out.text).trim();
    if (Array.isArray(out)) {
        if (out[0] && out[0].text != null) return String(out[0].text).trim();
        var parts = [];
        for (var i = 0; i < out.length; i++) {
            if (out[i] && out[i].text) parts.push(String(out[i].text).trim());
        }
        if (parts.length) return parts.join(' ').trim();
    }
    if (out.chunks && out.chunks.length) {
        var chunkText = [];
        for (var j = 0; j < out.chunks.length; j++) {
            if (out.chunks[j] && out.chunks[j].text) chunkText.push(String(out.chunks[j].text).trim());
        }
        if (chunkText.length) return chunkText.join(' ').trim();
    }
    return '';
}

function makeProgress(reqId) {
    return function(p) {
        if (!p) return;
        self.postMessage({ cmd: 'progress', reqId: reqId, payload: p });
    };
}

function postInit(reqId, phase, dev) {
    self.postMessage({
        cmd: 'progress',
        reqId: reqId,
        payload: { status: 'init', phase: phase, backend: dev }
    });
}

function buildPipeline(msg, dev, dtype) {
    return pipeline('automatic-speech-recognition', msg.modelId, {
        dtype: dtype || msg.dtype,
        device: dev,
        progress_callback: makeProgress(msg.reqId)
    });
}

async function disposeTranscriber() {
    if (!transcriber) return;
    try {
        if (typeof transcriber.dispose === 'function') await transcriber.dispose();
    } catch (e) {  }
    transcriber = null;
}

function warmupAudio() {
    var tone = new Float32Array(16000);
    for (var i = 0; i < tone.length; i++) {
        tone[i] = Math.sin(2 * Math.PI * 440 * i / 16000) * 0.12;
    }
    return tone;
}

async function warmupTranscriber(msg, lang) {
    return transcriber(warmupAudio(), {
        language: whisperLanguage(lang || 'fr'),
        task: 'transcribe',
        return_timestamps: false,
        chunk_length_s: 1
    });
}

async function switchToWasm(msg, reason, opts) {
    opts = opts || {};
    postInit(msg.reqId, 'fallback-wasm', 'wasm');
    await disposeTranscriber();
    activeBackend = 'wasm';
    resetWebGpuErrorState();
    transcriber = await buildPipeline(msg, 'wasm', msg.wasmDtype || msg.dtype);
    await warmupTranscriber(msg, msg.lang);
    if (opts.notifySwitch !== false && reason) {
        self.postMessage({ cmd: 'backend-switched', backend: 'wasm', reason: reason || 'webgpu-broken' });
    }
    return 'wasm';
}

async function ensureWasmForBrokenGpu(msg, reason) {
    if (activeBackend !== 'webgpu' || !lastLoadMsg) return false;
    await switchToWasm(msg || lastLoadMsg, reason, { notifySwitch: true });
    return true;
}

async function loadModel(msg) {
    var myGen = ++loadGen;
    lastLoadMsg = msg;
    resetWebGpuErrorState();
    await disposeTranscriber();
    configureEnv(msg.paths);
    installWebGpuConsoleTap();

    var wantedGpu = !!msg.wantedGpu;
    var requestedBackend = wantedGpu ? 'webgpu' : (msg.backend || 'wasm');
    var backend = msg.backend || 'wasm';
    if (requestedBackend === 'webgpu' && msg.gpuKnownBroken) {
        backend = 'wasm';
    }
    activeBackend = backend;
    postInit(msg.reqId, 'pipeline', backend);
    if (backend === 'wasm' && requestedBackend === 'webgpu') {
        postInit(msg.reqId, 'fallback-wasm', 'wasm');
        transcriber = await buildPipeline(msg, 'wasm', msg.wasmDtype || msg.dtype);
    } else {
        try {
            transcriber = await buildPipeline(msg, backend, msg.dtype);
            if (backend === 'webgpu') hookWebGpuDeviceErrors();
        } catch (err) {
            if (backend === 'webgpu') {
                backend = await switchToWasm(msg, 'build-error', { notifySwitch: true });
            } else {
                throw err;
            }
        }
    }
    if (myGen !== loadGen) throw new Error('cancelled');
    if (backend === 'webgpu') await waitForWebGpuErrors(100);
    if (webgpuDeviceBroken && backend === 'webgpu') {
        backend = await switchToWasm(msg, 'build-validation', { notifySwitch: true });
    }
    if (myGen !== loadGen) throw new Error('cancelled');
    postInit(msg.reqId, 'warmup', backend);
    try {
        await warmupTranscriber(msg, msg.lang);
        if (backend === 'webgpu') await waitForWebGpuErrors(250);
    } catch (e) {
        if (backend === 'webgpu' || isWebGpuBrokenMessage(e && e.message ? e.message : e)) {
            backend = await switchToWasm(msg, 'warmup-error', { notifySwitch: true });
        } else if (backend !== 'webgpu') {
            throw e;
        }
    }
    if (webgpuValidationCount > 0 && backend === 'webgpu') {
        backend = await switchToWasm(msg, 'warmup-validation', { notifySwitch: true });
    }
    if (myGen !== loadGen) throw new Error('cancelled');
    activeBackend = backend;
    self.postMessage({
        cmd: 'loaded',
        reqId: msg.reqId,
        backend: backend,
        fellBackFromWebgpu: wantedGpu && backend === 'wasm'
    });
}

async function runTranscribe(audio, msg) {
    var chunkS = msg.chunkLengthS != null ? msg.chunkLengthS : 1;
    var out = await transcriber(audio, {
        language: whisperLanguage(msg.lang || 'fr'),
        task: 'transcribe',
        return_timestamps: false,
        chunk_length_s: Math.max(1, chunkS)
    });
    if (activeBackend === 'webgpu') {
        await waitForWebGpuErrors(120);
    }
    return out;
}

async function transcribe(msg) {
    if (!transcriber) throw new Error('model-not-ready');
    var sampleCount = msg.audioSamples || (msg.audio ? msg.audio.byteLength / 4 : 0);
    var audio = new Float32Array(msg.audio, 0, sampleCount);
    try {
        if (activeBackend === 'webgpu') hookWebGpuDeviceErrors();
        var out = await runTranscribe(audio, msg);
        hookWebGpuDeviceErrors();
        var text = parseText(out);
        var gpuBroken = webgpuDeviceBroken || webgpuValidationCount > 0;
        if (activeBackend === 'webgpu' && lastLoadMsg && (gpuBroken || (!text && sampleCount >= 4800))) {
            try {
                await ensureWasmForBrokenGpu(lastLoadMsg, gpuBroken ? 'validation-error' : 'empty-transcribe');
                out = await runTranscribe(audio, msg);
                text = parseText(out);
            } catch (fallbackErr) {
                postGpuBroken(gpuBroken ? 'validation-error' : 'empty-transcribe');
            }
        }
        self.postMessage({
            cmd: 'result',
            reqId: msg.reqId,
            transcribeId: msg.transcribeId,
            text: text,
            rawType: out && typeof out,
            audioSamples: sampleCount,
            backend: activeBackend
        });
    } catch (err) {
        var errMsg = err && err.message ? err.message : String(err);
        if (activeBackend === 'webgpu' && lastLoadMsg && isWebGpuBrokenMessage(errMsg)) {
            try {
                await ensureWasmForBrokenGpu(lastLoadMsg, 'transcribe-error');
                var retryOut = await runTranscribe(audio, msg);
                var retryText = parseText(retryOut);
                self.postMessage({
                    cmd: 'result',
                    reqId: msg.reqId,
                    transcribeId: msg.transcribeId,
                    text: retryText,
                    rawType: retryOut && typeof retryOut,
                    audioSamples: sampleCount,
                    backend: activeBackend
                });
                return;
            } catch (fallbackErr) {
                postGpuBroken('transcribe-error');
            }
        } else if (activeBackend === 'webgpu' && isWebGpuBrokenMessage(errMsg)) {
            postGpuBroken('transcribe-error');
        }
        throw err;
    }
}

self.onmessage = function(ev) {
    var msg = ev.data || {};
    if (msg.cmd === 'load') {
        loadModel(msg).catch(function(err) {
            self.postMessage({
                cmd: 'error',
                reqId: msg.reqId,
                message: err && err.message ? err.message : String(err)
            });
        });
        return;
    }
    if (msg.cmd === 'transcribe') {
        transcribe(msg).catch(function(err) {
            self.postMessage({
                cmd: 'error',
                reqId: msg.reqId,
                transcribeId: msg.transcribeId,
                message: err && err.message ? err.message : String(err)
            });
        });
        return;
    }
    if (msg.cmd === 'dispose') {
        loadGen++;
        disposeTranscriber().finally(function() {
            activeBackend = 'wasm';
            self.postMessage({ cmd: 'disposed', reqId: msg.reqId });
        });
    }
};
