/**
 * PromptDeMerde.com — stt-shared-gpu.js
 *
 * Synopsis : Sonde GPU et backends ONNX.
 * Objectif : probeGpuCapabilities, detectOnnxBackend et labels backend.
 */
(function() {
var Shared = window.PDM && window.PDM.STT && window.PDM.STT.Shared;
if (!Shared) { console.warn('[stt-shared-gpu] PDM.STT.Shared not found.'); return; }

Shared.hasWebGPU = function() {
    return !!(navigator.gpu && navigator.gpu.requestAdapter);
};

/** Seuils VRAM pour le choix CPU/GPU (CHOICE : ≥ 1 Go pour proposer le mode GPU). */
Shared.GPU_VRAM_MIN_GB = 1;
Shared.GPU_VRAM_CHOICE_GB = 1;

Shared._gpuCaps = null;
Shared._gpuCapsPromise = null;

Shared.getGpuCaps = function() {
    return Shared._gpuCaps || {
        webgpuAvailable: false,
        vramGb: 0,
        canUserChooseGpu: false,
        adapterIsFallback: true,
        label: 'CPU uniquement'
    };
};

function requestGpuProbeDevice(adapter) {
    var limits = adapter.limits || {};
    var requiredLimits = {};
    if (limits.maxBufferSize) {
        requiredLimits.maxBufferSize = limits.maxBufferSize;
    }
    if (limits.maxStorageBufferBindingSize) {
        requiredLimits.maxStorageBufferBindingSize = limits.maxStorageBufferBindingSize;
    }
    var opts = Object.keys(requiredLimits).length ? { requiredLimits: requiredLimits } : undefined;
    return adapter.requestDevice(opts);
}

function estimateAdapterVramGb(adapter) {
    if (!adapter || adapter.isFallbackAdapter) return Promise.resolve(0);
    var limits = adapter.limits || {};
    var maxBuf = limits.maxBufferSize || 0;
    if (maxBuf > 0 && maxBuf < 512 * 1024 * 1024) {
        return Promise.resolve(Math.max(0.25, maxBuf / (1024 * 1024 * 1024)));
    }
    var storageUsage = (typeof GPUBufferUsage !== 'undefined' && GPUBufferUsage.STORAGE) ? GPUBufferUsage.STORAGE : 0x80;
    return requestGpuProbeDevice(adapter).then(function(device) {
        var deviceMaxBuf = (device.limits && device.limits.maxBufferSize) ? device.limits.maxBufferSize : maxBuf;
        var ladderGb = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 24];
        var maxOk = 0;
        var chain = Promise.resolve();
        ladderGb.forEach(function(gb) {
            chain = chain.then(function() {
                var bytes = gb * 1024 * 1024 * 1024;
                var cap = deviceMaxBuf > 0 ? deviceMaxBuf : maxBuf;
                if (cap > 0 && bytes > cap) return;
                try {
                    var buf = device.createBuffer({ size: bytes, usage: storageUsage });
                    buf.destroy();
                    maxOk = gb;
                } catch (e) { /* capacité atteinte */ }
            });
        });
        return chain.then(function() {
            try { device.destroy(); } catch (e2) { /* ignore */ }
            if (maxOk > 0) return maxOk;
            if (maxBuf > 0) return maxBuf / (1024 * 1024 * 1024);
            return 0;
        });
    }).catch(function() {
        if (maxBuf > 0) return maxBuf / (1024 * 1024 * 1024);
        return 0;
    });
}

Shared.probeGpuCapabilities = function() {
    if (Shared._gpuCapsPromise) return Shared._gpuCapsPromise;
    var base = {
        webgpuAvailable: false,
        vramGb: 0,
        canUserChooseGpu: false,
        adapterIsFallback: true,
        label: 'CPU uniquement'
    };
    if (!Shared.hasWebGPU()) {
        base.label = 'Pas de WebGPU — CPU uniquement';
        Shared._gpuCaps = base;
        Shared._gpuCapsPromise = Promise.resolve(base);
        return Shared._gpuCapsPromise;
    }
    Shared._gpuCapsPromise = Promise.resolve().then(function() {
        return navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    }).then(function(adapter) {
        if (!adapter) {
            base.label = 'Pas de WebGPU — CPU uniquement';
            Shared._gpuCaps = base;
            return base;
        }
        base.webgpuAvailable = true;
        base.adapterIsFallback = !!adapter.isFallbackAdapter;
        if (adapter.isFallbackAdapter) {
            base.label = 'GPU logiciel — mode CPU uniquement';
            Shared._gpuCaps = base;
            return base;
        }
        return estimateAdapterVramGb(adapter).then(function(gb) {
            base.vramGb = Math.round(gb * 10) / 10;
            if (gb < Shared.GPU_VRAM_CHOICE_GB) {
                base.canUserChooseGpu = false;
                base.label = 'GPU insuffisant (~' + base.vramGb + ' Go, minimum ' + Shared.GPU_VRAM_CHOICE_GB + ' Go) — CPU uniquement';
            } else {
                base.canUserChooseGpu = true;
                base.label = 'GPU ~' + base.vramGb + ' Go — CPU ou GPU au choix';
            }
            Shared._gpuCaps = base;
            return base;
        });
    }).catch(function() {
        Shared._gpuCaps = base;
        return base;
    });
    return Shared._gpuCapsPromise;
};

Shared.wantsGpuCompute = function() {
    if (!Shared.getGpuCaps().canUserChooseGpu) return false;
    try {
        return window.PDM && window.PDM.Storage && window.PDM.Storage.getSttCompute() === 'gpu';
    } catch (e) {
        return false;
    }
};

Shared._detectOnnxBackendAuto = function() {
    if (!Shared.hasWebGPU()) return Promise.resolve('wasm');
    var p;
    try { p = navigator.gpu.requestAdapter({ powerPreference: 'high-performance' }); } catch (e) { return Promise.resolve('wasm'); }
    return Promise.resolve(p).then(function(adapter) {
        return (adapter && !adapter.isFallbackAdapter) ? 'webgpu' : 'wasm';
    }).catch(function() { return 'wasm'; });
};

Shared.detectOnnxBackend = function() {
    if (!Shared.wantsGpuCompute()) return Promise.resolve('wasm');
    return Shared._detectOnnxBackendAuto();
};

/** Backend Parakeet : webgpu-hybrid configure les executionProviders ONNX (webgpu seul ne le fait pas). */
Shared.detectParakeetBackend = function() {
    if (!Shared.wantsGpuCompute()) return Promise.resolve('wasm');
    if (!Shared.hasWebGPU()) return Promise.resolve('wasm');
    var p;
    try { p = navigator.gpu.requestAdapter({ powerPreference: 'high-performance' }); } catch (e) { return Promise.resolve('wasm'); }
    return Promise.resolve(p).then(function(adapter) {
        return (adapter && !adapter.isFallbackAdapter) ? 'webgpu-hybrid' : 'wasm';
    }).catch(function() { return 'wasm'; });
};

Shared.getComputeBackendLabel = function(backend) {
    if (!backend || backend === 'wasm') return 'CPU';
    if (backend.indexOf('webgpu') === 0) return 'GPU';
    return String(backend).toUpperCase();
};

/** Libellé affiché une fois le modèle chargé (barres statut Workspace). */
Shared.formatBackendLoadedLabel = function(backend) {
    if (!backend || backend === 'wasm') return 'CPU (WASM)';
    if (backend === 'webgpu') return 'GPU (WebGPU)';
    if (backend === 'webgpu-hybrid') return 'GPU hybride (WebGPU + WASM)';
    return Shared.getComputeBackendLabel(backend);
};

/** Libellé pendant le chargement (cible attendue). */
Shared.formatBackendLoadingLabel = function(engineId, wantsGpu) {
    if (engineId && engineId.indexOf('vosk') === 0) return 'CPU (WASM)';
    return wantsGpu ? 'GPU (WebGPU)' : 'CPU (WASM)';
};

/** Erreurs WebGPU ONNX (VRAM insuffisante, pipelines invalides, etc.). */
Shared.isWebGpuBrokenError = function(err) {
    var msg = '';
    if (typeof err === 'string') msg = err;
    else if (err && err.message) msg = err.message;
    else if (err) msg = String(err);
    return /webgpu|validation error|Invalid ComputePipeline|Invalid BindGroupLayout|Invalid CommandBuffer|device was lost|Device lost|Out of memory|OOM/i.test(msg);
};

Shared.markWhisperGpuBroken = function() {
    try { sessionStorage.setItem('pdm_whisper_gpu_broken', '1'); } catch (e) { /* ignore */ }
};

Shared.isWhisperGpuBroken = function() {
    try { return sessionStorage.getItem('pdm_whisper_gpu_broken') === '1'; } catch (e) { return false; }
};

Shared.promiseTimeout = function(promise, ms, errCode) {
    return new Promise(function(resolve, reject) {
        var timer = setTimeout(function() {
            var err = new Error(errCode || 'timeout');
            err.code = 'timeout';
            reject(err);
        }, ms);
        Promise.resolve(promise).then(function(v) {
            clearTimeout(timer);
            resolve(v);
        }).catch(function(e) {
            clearTimeout(timer);
            reject(e);
        });
    });
};

})();
