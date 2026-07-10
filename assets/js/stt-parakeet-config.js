/**
 * PromptDeMerde.com — stt-parakeet-config.js
 */
export var SAMPLE_RATE = 16000;
export var CHUNK_SAMPLES = 16000;
export var WASM_PATH = 'assets/js/vendor/onnxruntime-web/';
export var SPECIAL_TOKEN_RE = /<\|[^|]+\|>/g;
export var PUNCT_ONLY_RE = /^[,.;:!?…\-–—'"«»\s]+$/;
export var PARAKEET_DOWNLOAD_PERCENT_MAX = 78;
export var PARAKEET_INIT_PERCENT_BASE = 78;

export var ENGINE_CONFIGS = {
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

export function cfgFor(id) {
    return ENGINE_CONFIGS[id] || ENGINE_CONFIGS['parakeet'];
}

export function wasmPathsUrl() {
    var S = window.PDM.STT.Shared;
    var base = S.modelAbsoluteUrl(WASM_PATH);
    if (!base.endsWith('/')) base += '/';
    return base;
}

export function modelLoadErrorHint() {
    return 'Mod\u00e8le Parakeet absent. Lance : bash assets/stt/parakeet/restore-encoder.sh';
}

export function parakeetBackendLabel(backend) {
    if (!backend || backend === 'wasm') return 'WASM';
    if (backend.indexOf('webgpu') === 0) return 'WebGPU';
    return String(backend).toUpperCase();
}
