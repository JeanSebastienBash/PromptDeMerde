/**
 * PromptDeMerde.com — stt-shared-gpu.js
 *
 * Synopsis : Sonde GPU et backends ONNX.
 * Objectif : probeGpuCapabilities, detectOnnxBackend et labels backend.
 */
(function() {
var Shared = window.PDM && window.PDM.STT && window.PDM.STT.Shared;
if (!Shared) { console.warn('[stt-shared-gpu] PDM.STT.Shared not found.'); return; }

Shared.GPU_VRAM_MIN_GB = 1;
Shared.GPU_VRAM_WHISPER_MINI_GB = 2;
Shared.GPU_VRAM_WHISPER_MAXI_GB = 4;
Shared.GPU_VRAM_PARAKEET_GB = 4;
Shared.GPU_VRAM_CHOICE_GB = Shared.GPU_VRAM_WHISPER_MINI_GB;

Shared.getGpuVramRecommendedGb = function(engineId) {
    if (!engineId || engineId.indexOf('vosk') === 0) return 0;
    if (engineId === 'whisper-maxi' || engineId === 'parakeet') {
        return Shared.GPU_VRAM_WHISPER_MAXI_GB;
    }
    if (engineId.indexOf('whisper') === 0) return Shared.GPU_VRAM_WHISPER_MINI_GB;
    return 0;
};

Shared.getGpuVramHintForEngine = function(engineId) {
    if (!engineId || engineId.indexOf('vosk') === 0) return null;
    var caps = Shared.getGpuCaps();
    if (!caps.probeDone || !caps.canUserChooseGpu) return null;
    var vram = caps.vramGb || 0;
    if (vram <= 0) return null;
    if (vram < Shared.GPU_VRAM_MIN_GB) return 'computeGpuVramBelow1';
    if (engineId === 'whisper-maxi' || engineId === 'parakeet') {
        if (vram < Shared.GPU_VRAM_WHISPER_MAXI_GB) return 'computeGpuVramLowMaxi';
        return null;
    }
    if (engineId.indexOf('whisper') === 0 && vram < Shared.GPU_VRAM_WHISPER_MINI_GB) {
        return 'computeGpuVramLowMini';
    }
    return null;
};

Shared.getGpuVramHintVars = function(engineId) {
    var caps = Shared.getGpuCaps();
    return {
        vram: caps.vramGb || 0,
        min: Shared.getGpuVramRecommendedGb(engineId),
        mini: Shared.GPU_VRAM_WHISPER_MINI_GB,
        maxi: Shared.GPU_VRAM_WHISPER_MAXI_GB
    };
};

Shared._gpuCaps = null;
Shared._gpuCapsPromise = null;

var PROBE_ADAPTER_MS = 8000;
var PROBE_DEVICE_MS = 3000;
var PROBE_TOTAL_MS = 10000;

function defaultGpuCaps() {
    return {
        probeDone: false,
        webgpuAvailable: false,
        vramGb: 0,
        canUserChooseGpu: false,
        adapterIsFallback: true,
        shaderF16: false,
        reason: 'probing'
    };
}

function adapterHasShaderF16(adapter) {
    if (!adapter || !adapter.features) return false;
    try {
        return adapter.features.has('shader-f16');
    } catch (e) {
        return false;
    }
}

function finalizeWhisperGpuCaps(base, adapter) {
    base.shaderF16 = adapter ? adapterHasShaderF16(adapter) : false;

    if (base.canUserChooseGpu && !base.shaderF16) {
        if (base.reason === 'ok' || base.reason === 'unknown_vram') {
            base.reason = 'gpu_compat';
        }
    }
    return finalizeGpuCaps(base);
}

Shared.hasWebGPU = function() {
    return Shared.isSecureContext()
        && !!(navigator.gpu && navigator.gpu.requestAdapter);
};

function requestAdapterOnce(opts) {
    var gpu = navigator.gpu;
    try {
        var p = opts ? gpu.requestAdapter(opts) : gpu.requestAdapter();
        return Shared.promiseTimeout(Promise.resolve(p), PROBE_ADAPTER_MS, 'adapter-timeout')
            .catch(function() { return null; });
    } catch (e) {
        return Promise.resolve(null);
    }
}

function requestWebGpuAdapter() {
    if (Shared.isLinux() || Shared.isFirefox()) {
        return requestAdapterOnce(undefined)
            .then(function(adapter) {
                return adapter || requestAdapterOnce({ powerPreference: 'high-performance' });
            })
            .then(function(adapter) {
                return adapter || requestAdapterOnce({ powerPreference: 'low-power' });
            })
            .then(function(adapter) {
                return adapter || requestAdapterOnce({ forceFallbackAdapter: true });
            });
    }
    return requestAdapterOnce({ powerPreference: 'high-performance', forceFallbackAdapter: false })
        .then(function(adapter) {
            return adapter || requestAdapterOnce(undefined);
        });
}

function adapterFailureReason() {
    if (Shared.isFirefox()) return 'firefox_no_adapter';
    if (Shared.isChromium() && Shared.isLinux()) return 'chrome_linux_no_adapter';
    if (Shared.isChromium()) return 'chrome_no_adapter';
    return 'no_adapter';
}

function finalizeGpuCaps(base) {
    base.probeDone = true;
    Shared._gpuCaps = base;
    return base;
}

function capsFromAdapter(adapter) {
    var base = defaultGpuCaps();
    if (!adapter) {
        base.reason = adapterFailureReason();
        return finalizeGpuCaps(base);
    }
    base.webgpuAvailable = true;
    base.adapterIsFallback = !!adapter.isFallbackAdapter;
    if (adapter.isFallbackAdapter) {
        base.reason = 'fallback';
        base.canUserChooseGpu = false;
        return finalizeWhisperGpuCaps(base, adapter);
    }
    var limits = adapter.limits || {};
    var maxBuf = limits.maxBufferSize || 0;
    var gbFromLimits = maxBuf > 0 ? (maxBuf / (1024 * 1024 * 1024)) : 0;
    base.vramGb = Math.round(gbFromLimits * 10) / 10;


    if (Shared.isLinux() || gbFromLimits >= Shared.GPU_VRAM_CHOICE_GB) {
        base.canUserChooseGpu = true;
        if (gbFromLimits >= Shared.GPU_VRAM_WHISPER_MINI_GB) {
            base.reason = 'ok';
        } else if (gbFromLimits > 0) {
            base.reason = 'vram_low';
        } else {
            base.reason = 'unknown_vram';
        }
        return finalizeWhisperGpuCaps(base, adapter);
    }
    return estimateAdapterVramGb(adapter).then(function(gb) {
        base.vramGb = Math.round(gb * 10) / 10;
        base.canUserChooseGpu = true;
        if (gb >= Shared.GPU_VRAM_WHISPER_MINI_GB) {
            base.reason = 'ok';
        } else if (gb > 0) {
            base.reason = 'vram_low';
        } else {
            base.reason = 'unknown_vram';
        }
        return finalizeWhisperGpuCaps(base, adapter);
    }).catch(function() {
        base.canUserChooseGpu = true;
        base.reason = 'unknown_vram';
        return finalizeWhisperGpuCaps(base, adapter);
    });
}

Shared.resetGpuProbe = function() {
    Shared._gpuCaps = null;
    Shared._gpuCapsPromise = null;
};

Shared.reprobeGpuCapabilities = function() {
    Shared.resetGpuProbe();
    return Shared.probeGpuCapabilities({ force: true });
};

Shared.getGpuCaps = function() {
    return Shared._gpuCaps || defaultGpuCaps();
};

function requestGpuProbeDevice(adapter) {
    return Shared.promiseTimeout(adapter.requestDevice(), PROBE_DEVICE_MS, 'device-timeout');
}

function estimateAdapterVramGb(adapter) {
    if (!adapter || adapter.isFallbackAdapter) return Promise.resolve(0);
    var limits = adapter.limits || {};
    var maxBuf = limits.maxBufferSize || 0;
    var gbFromLimits = maxBuf > 0 ? (maxBuf / (1024 * 1024 * 1024)) : 0;
    if (gbFromLimits >= Shared.GPU_VRAM_CHOICE_GB) return Promise.resolve(gbFromLimits);

    if (maxBuf > 0) {
        return requestGpuProbeDevice(adapter).then(function(device) {
            var storageUsage = (typeof GPUBufferUsage !== 'undefined' && GPUBufferUsage.STORAGE)
                ? GPUBufferUsage.STORAGE
                : 0x80;
            var probeBytes = Math.min(maxBuf, 64 * 1024 * 1024);
            try {
                var buf = device.createBuffer({ size: probeBytes, usage: storageUsage });
                buf.destroy();
            } catch (e) {
                try { device.destroy(); } catch (e2) { }
                return Math.max(0.25, Math.min(gbFromLimits, 0.5));
            }
            try { device.destroy(); } catch (e2) { }
            return gbFromLimits;
        }).catch(function() {
            return gbFromLimits > 0 ? gbFromLimits : 0;
        });
    }

    return requestGpuProbeDevice(adapter).then(function(device) {
        var storageUsage = (typeof GPUBufferUsage !== 'undefined' && GPUBufferUsage.STORAGE)
            ? GPUBufferUsage.STORAGE
            : 0x80;
        var ladderMb = [64, 128, 256, 512];
        var maxOkMb = 0;
        for (var i = 0; i < ladderMb.length; i++) {
            try {
                var bytes = ladderMb[i] * 1024 * 1024;
                var buf = device.createBuffer({ size: bytes, usage: storageUsage });
                buf.destroy();
                maxOkMb = ladderMb[i];
            } catch (e) {
                break;
            }
        }
        try { device.destroy(); } catch (e2) { }
        return maxOkMb > 0 ? maxOkMb / 1024 : 0;
    }).catch(function() { return 0; });
}

function runGpuProbe() {
    if (!Shared.isSecureContext()) {
        return Promise.resolve(finalizeGpuCaps(Object.assign(defaultGpuCaps(), { reason: 'insecure' })));
    }
    if (!navigator.gpu || !navigator.gpu.requestAdapter) {
        return Promise.resolve(finalizeGpuCaps(Object.assign(defaultGpuCaps(), {
            reason: Shared.isFirefox() ? 'firefox_no_api' : 'no_api'
        })));
    }
    return requestWebGpuAdapter().then(function(adapter) {
        var out = capsFromAdapter(adapter);
        return Promise.resolve(out);
    }).catch(function() {
        return finalizeGpuCaps(Object.assign(defaultGpuCaps(), { reason: adapterFailureReason() }));
    });
}

Shared.probeGpuCapabilities = function(opts) {
    if (Shared._gpuCaps && Shared._gpuCaps.probeDone && !(opts && opts.force)) {
        return Promise.resolve(Shared._gpuCaps);
    }
    if (Shared._gpuCapsPromise && !(opts && opts.force)) {
        return Shared._gpuCapsPromise;
    }
    if (opts && opts.force) Shared.resetGpuProbe();

    Shared._gpuCapsPromise = Shared.promiseTimeout(runGpuProbe(), PROBE_TOTAL_MS, 'probe-timeout')
        .catch(function() {
            if (Shared._gpuCaps && Shared._gpuCaps.probeDone) return Shared._gpuCaps;
            return finalizeGpuCaps(Object.assign(defaultGpuCaps(), { reason: adapterFailureReason() }));
        })
        .then(function(caps) {
            Shared._gpuCapsPromise = null;
            return caps;
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
    return requestWebGpuAdapter().then(function(adapter) {
        if (!adapter) return 'wasm';
        if (adapter.isFallbackAdapter) return 'wasm';
        if (Shared.isWhisperGpuBroken && Shared.isWhisperGpuBroken()
            && adapterHasShaderF16(adapter)) {
            return 'wasm';
        }
        return 'webgpu';
    }).catch(function() { return 'wasm'; });
};

Shared.hasShaderF16 = adapterHasShaderF16;

Shared.getExpectedWhisperDtypeKey = function(engineId) {
    if (!Shared.wantsGpuCompute()) {
        return engineId === 'whisper-maxi' ? 'hybrid-q4' : 'q4';
    }
    var caps = Shared.getGpuCaps();
    if (!caps.canUserChooseGpu) {
        return engineId === 'whisper-maxi' ? 'hybrid-q4' : 'q4';
    }
    if (caps.shaderF16) {
        return engineId === 'whisper-maxi' ? 'hybrid-fp16-q4' : 'q4f16';
    }
    return engineId === 'whisper-maxi' ? 'hybrid-q4-webgpu' : 'q4-webgpu';
};

Shared.isWhisperGpuCompatTier = function() {
    var caps = Shared.getGpuCaps();
    return !!caps.canUserChooseGpu && !caps.shaderF16;
};

Shared.detectOnnxBackend = function() {
    if (!Shared.wantsGpuCompute()) return Promise.resolve('wasm');
    return Shared._detectOnnxBackendAuto();
};

Shared.detectParakeetBackend = function() {
    if (!Shared.wantsGpuCompute()) return Promise.resolve('wasm');
    if (!Shared.hasWebGPU()) return Promise.resolve('wasm');
    if (Shared.isWhisperGpuBroken && Shared.isWhisperGpuBroken()
        && Shared.getGpuCaps().shaderF16) {
        return Promise.resolve('wasm');
    }
    return requestWebGpuAdapter().then(function(adapter) {
        if (!adapter) return 'wasm';
        if (adapter.isFallbackAdapter) return 'wasm';
        return 'webgpu-hybrid';
    }).catch(function() { return 'wasm'; });
};

Shared.getComputeBackendLabel = function(backend) {
    if (!backend || backend === 'wasm') return 'CPU';
    if (backend.indexOf('webgpu') === 0) return 'GPU';
    return String(backend).toUpperCase();
};

Shared.formatBackendLoadedLabel = function(backend, dtypeKey) {
    if (!backend || backend === 'wasm') return 'CPU (WASM)';
    if (backend === 'webgpu') {
        if (dtypeKey === 'q4-webgpu' || dtypeKey === 'hybrid-q4-webgpu') {
            return 'GPU (WebGPU compat)';
        }
        return 'GPU (WebGPU)';
    }
    if (backend === 'webgpu-hybrid') return 'GPU hybride (WebGPU + WASM)';
    return Shared.getComputeBackendLabel(backend);
};

Shared.formatBackendLoadingLabel = function(engineId, wantsGpu) {
    if (engineId && engineId.indexOf('vosk') === 0) return 'CPU (WASM)';
    if (!wantsGpu) return 'CPU (WASM)';
    if (Shared.isWhisperGpuCompatTier()) return 'GPU (WebGPU compat)';
    return 'GPU (WebGPU)';
};

Shared.isWebGpuBrokenError = function(err) {
    var msg = '';
    if (typeof err === 'string') msg = err;
    else if (err && err.message) msg = err.message;
    else if (err) msg = String(err);
    return /webgpu|validation error|Invalid ComputePipeline|Invalid BindGroupLayout|Invalid CommandBuffer|device was lost|Device lost|Out of memory|OOM|VK_ERROR_OUT_OF_DEVICE_MEMORY|shader-f16|f16 extension|Error while parsing WGSL/i.test(msg);
};

Shared.markWhisperGpuBroken = function() {
    try { sessionStorage.setItem('pdm_whisper_gpu_broken', '1'); } catch (e) {  }
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
