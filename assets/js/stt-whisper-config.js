/**
 * PromptDeMerde.com — stt-whisper-config.js
 *
 * Synopsis : Constantes et configuration dtype Whisper Mini/Maxi.
 */
export var SAMPLE_RATE = 16000;
export var SEGMENT_SECONDS = 2;
export var SEGMENT_SAMPLES = SAMPLE_RATE * SEGMENT_SECONDS;
export var MIN_INTERIM_SAMPLES = Math.floor(SAMPLE_RATE * 0.3);
export var MIN_VOICED_SAMPLES = Math.floor(SAMPLE_RATE * 0.35);
export var MIN_RELAUNCH_SAMPLES = Math.floor(SAMPLE_RATE * 0.5);
export var STREAM_INTERVAL_MS = 350;
export var SILENCE_RMS = 0.0012;
export var INFER_TIMEOUT_WASM_MS = 120000;
export var INFER_TIMEOUT_WEBGPU_MS = 30000;
export var GPU_EMPTY_STREAK_FALLBACK = 1;
export var FLUSH_TIMEOUT_MS = 6000;
export var WHISPER_DOWNLOAD_PERCENT_MAX = 68;
export var WHISPER_INIT_PERCENT_BASE = 68;
export var STT_DIR = 'assets/stt/';
export var VENDOR_DIR = 'assets/js/vendor/transformers/';

export var ENGINE_CONFIGS = {
    'whisper-mini': {
        sizeLabel: '~50–90 Mo',
        shortName: 'Whisper Mini',
        label: 'Whisper Mini',
        helpSize: 'q4 CPU / q4f16 GPU rapide / q4 GPU compat'
    },
    'whisper-maxi': {
        sizeLabel: '~90–165 Mo',
        shortName: 'Whisper Maxi',
        label: 'Whisper Maxi',
        helpSize: 'hybride q4 CPU / fp16+q4 GPU rapide / q4 GPU compat'
    }
};

export function resolveDtype(engineId, backend) {
    var gpu = backend === 'webgpu';
    var compat = false;
    if (gpu && typeof window !== 'undefined') {
        var S = window.PDM && window.PDM.STT && window.PDM.STT.Shared;
        if (S && S.getGpuCaps && !S.getGpuCaps().shaderF16) compat = true;
    }
    if (engineId === 'whisper-mini') {
        if (gpu && !compat) {
            return {
                dtype: { encoder_model: 'q4f16', decoder_model_merged: 'q4f16' },
                dtypeKey: 'q4f16'
            };
        }
        if (gpu && compat) {
            return {
                dtype: { encoder_model: 'q4', decoder_model_merged: 'q4' },
                dtypeKey: 'q4-webgpu'
            };
        }
        return {
            dtype: { encoder_model: 'q4', decoder_model_merged: 'q4' },
            dtypeKey: 'q4'
        };
    }
    if (gpu && !compat) {
        return {
            dtype: { encoder_model: 'fp16', decoder_model_merged: 'q4' },
            dtypeKey: 'hybrid-fp16-q4'
        };
    }
    if (gpu && compat) {
        return {
            dtype: { encoder_model: 'q4', decoder_model_merged: 'q4' },
            dtypeKey: 'hybrid-q4-webgpu'
        };
    }
    return {
        dtype: { encoder_model: 'q4', decoder_model_merged: 'q4' },
        dtypeKey: 'hybrid-q4'
    };
}

export function cfgFor(id) {
    return ENGINE_CONFIGS[id] || ENGINE_CONFIGS['whisper-mini'];
}

export function inferTimeoutMs(backend) {
    return backend === 'webgpu' ? INFER_TIMEOUT_WEBGPU_MS : INFER_TIMEOUT_WASM_MS;
}

export function whisperLanguage(lang) {
    if (typeof window !== 'undefined' && window.PDM && window.PDM.STT && window.PDM.STT.Shared) {
        return window.PDM.STT.Shared.whisperLanguage(lang);
    }
    var map = {
        fr: 'french', en: 'english', ar: 'arabic', zh: 'chinese', eo: 'english',
        es: 'spanish', de: 'german', pt: 'portuguese', it: 'italian', ru: 'russian',
        ja: 'japanese', ko: 'korean'
    };
    lang = lang || 'fr';
    return map[lang] || map.en || 'english';
}

export function modelDirFor(id) {
    return STT_DIR + id + '/';
}

export function modelLoadErrorHint(id) {
    var S = typeof window !== 'undefined' && window.PDM && window.PDM.STT && window.PDM.STT.Shared;
    if (S) return S.sttT('errorWhisperAbsent', { dir: modelDirFor(id) });
    return 'Mod\u00e8le Whisper absent dans ' + modelDirFor(id);
}

export function chunkLengthFor(buf) {
    var dur = buf.length / SAMPLE_RATE;
    if (dur < MIN_VOICED_SAMPLES / SAMPLE_RATE) return 0;
    return Math.min(30, Math.max(1, Math.ceil(dur)));
}
