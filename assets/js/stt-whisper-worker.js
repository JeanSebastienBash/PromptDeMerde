/**
 * Worker Whisper — inférence hors thread principal (évite gel UI + perte micro).
 */
import { pipeline, env } from './vendor/transformers/transformers-lib.js';

var transcriber = null;
var envReady = false;
var loadGen = 0;
var activeBackend = 'wasm';
var lastLoadMsg = null;
var webgpuValidationCount = 0;
var gpuBrokenPosted = false;

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
    return /webgpu|validation error|Invalid ComputePipeline|Invalid BindGroupLayout|Invalid CommandBuffer|device was lost|Device lost|Out of memory|OOM/i.test(String(msg));
}

function postGpuBroken(reason) {
    if (gpuBrokenPosted || activeBackend !== 'webgpu') return;
    gpuBrokenPosted = true;
    self.postMessage({ cmd: 'gpu-broken', reason: reason || 'webgpu-validation' });
}

self.addEventListener('error', function(ev) {
    var m = ev && ev.message ? ev.message : '';
    if (isWebGpuBrokenMessage(m)) {
        webgpuValidationCount++;
        if (webgpuValidationCount >= 2) postGpuBroken('validation-error');
    }
});

self.addEventListener('unhandledrejection', function(ev) {
    var m = '';
    if (ev && ev.reason) {
        m = ev.reason.message || String(ev.reason);
    }
    if (isWebGpuBrokenMessage(m)) {
        webgpuValidationCount++;
        postGpuBroken('rejection');
    }
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
    } catch (e) { /* ignore */ }
    envReady = true;
}

function whisperLanguage(lang) {
    if (!lang || lang === 'fr') return 'french';
    if (lang === 'en') return 'english';
    return lang;
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
    } catch (e) { /* ignore */ }
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

async function switchToWasm(msg, reason) {
    postInit(msg.reqId, 'fallback-wasm', 'wasm');
    await disposeTranscriber();
    activeBackend = 'wasm';
    gpuBrokenPosted = false;
    webgpuValidationCount = 0;
    transcriber = await buildPipeline(msg, 'wasm', msg.wasmDtype || msg.dtype);
    await warmupTranscriber(msg, msg.lang);
    return 'wasm';
}

async function loadModel(msg) {
    var myGen = ++loadGen;
    lastLoadMsg = msg;
    gpuBrokenPosted = false;
    webgpuValidationCount = 0;
    await disposeTranscriber();
    configureEnv(msg.paths);

    var backend = msg.backend || 'wasm';
    activeBackend = backend;
    postInit(msg.reqId, 'pipeline', backend);
    try {
        transcriber = await buildPipeline(msg, backend, msg.dtype);
    } catch (err) {
        if (backend === 'webgpu') {
            backend = await switchToWasm(msg, 'build-error');
        } else {
            throw err;
        }
    }
    if (myGen !== loadGen) throw new Error('cancelled');
    postInit(msg.reqId, 'warmup', backend);
    try {
        await warmupTranscriber(msg, msg.lang);
    } catch (e) {
        if (backend === 'webgpu' || isWebGpuBrokenMessage(e && e.message ? e.message : e)) {
            backend = await switchToWasm(msg, 'warmup-error');
        } else if (backend !== 'webgpu') {
            throw e;
        }
    }
    if (webgpuValidationCount > 0 && backend === 'webgpu') {
        backend = await switchToWasm(msg, 'warmup-validation');
    }
    if (myGen !== loadGen) throw new Error('cancelled');
    activeBackend = backend;
    self.postMessage({ cmd: 'loaded', reqId: msg.reqId, backend: backend });
}

async function transcribe(msg) {
    if (!transcriber) throw new Error('model-not-ready');
    var sampleCount = msg.audioSamples || (msg.audio ? msg.audio.byteLength / 4 : 0);
    var audio = new Float32Array(msg.audio, 0, sampleCount);
    try {
        var out = await transcriber(audio, {
            language: whisperLanguage(msg.lang || 'fr'),
            task: 'transcribe',
            return_timestamps: false,
            chunk_length_s: msg.chunkLengthS != null ? msg.chunkLengthS : 0
        });
        var text = parseText(out);
        if (!text && activeBackend === 'webgpu' && sampleCount >= 4800) {
            webgpuValidationCount++;
            if (webgpuValidationCount >= 1) postGpuBroken('empty-transcribe');
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
        if (activeBackend === 'webgpu' && isWebGpuBrokenMessage(errMsg)) {
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
