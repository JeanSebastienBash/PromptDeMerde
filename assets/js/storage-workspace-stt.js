/**
 * PromptDeMerde.com — storage-workspace-stt.js
 *
 * Synopsis : Persistance brouillon workspace et réglages dictée vocale.
 * Objectif : Étendre PDM.Storage avec workspace, profils contexte et STT.
 */
(function(){

var S = window.PDM && window.PDM.Storage;
if (!S) { console.warn('[storage-workspace-stt] PDM.Storage not found.'); return; }

S.getProfiles = function() {
    var p = S.get(S.KEYS.PROFILES);
    return Array.isArray(p) ? p : [];
};
S.setProfiles = function(p) { return S.set(S.KEYS.PROFILES, p); };

S.getWorkspace = function() {
    var w = S.get(S.KEYS.WORKSPACE);
    var CS = window.PDM && window.PDM.ConfigSchema;
    var emptyAudio = CS && CS.emptyAudioMeta ? CS.emptyAudioMeta() : {
        inputSource: 'manual', audioFileName: null, audioFileSize: null,
        audioMimeType: null, audioLastModified: null, audioRef: null
    };
    if (!w || typeof w !== 'object') {
        return Object.assign({
            input: '', output: '', thinking: '', savedAt: null, contextPanelOpen: true
        }, emptyAudio);
    }
    var audio = CS && CS.normalizeAudioMeta ? CS.normalizeAudioMeta(w) : emptyAudio;
    return {
        input: w.input != null ? String(w.input) : '',
        output: w.output != null ? String(w.output) : '',
        thinking: w.thinking != null ? String(w.thinking) : '',
        savedAt: w.savedAt || null,
        contextPanelOpen: w.contextPanelOpen !== false,
        inputSource: audio.inputSource,
        audioFileName: audio.audioFileName,
        audioFileSize: audio.audioFileSize,
        audioMimeType: audio.audioMimeType,
        audioLastModified: audio.audioLastModified,
        audioRef: audio.audioRef
    };
};

S.setWorkspace = function(data) {
    if (!data || typeof data !== 'object') data = {};
    var prevRaw = S.get(S.KEYS.WORKSPACE) || {};
    var CS = window.PDM && window.PDM.ConfigSchema;
    var merged = Object.assign({}, prevRaw, data);
    var audio = CS && CS.normalizeAudioMeta ? CS.normalizeAudioMeta(merged) : { inputSource: 'manual' };
    var ws = {
        input: data.input != null ? String(data.input) : '',
        output: data.output != null ? String(data.output) : '',
        thinking: data.thinking != null ? String(data.thinking) : '',
        savedAt: data.savedAt !== undefined ? data.savedAt : new Date().toISOString(),
        contextPanelOpen: 'contextPanelOpen' in data ? data.contextPanelOpen !== false : (prevRaw.contextPanelOpen !== false),
        inputSource: audio.inputSource,
        audioFileName: audio.audioFileName,
        audioFileSize: audio.audioFileSize,
        audioMimeType: audio.audioMimeType,
        audioLastModified: audio.audioLastModified,
        audioRef: audio.audioRef
    };
    return S.set(S.KEYS.WORKSPACE, ws);
};

S.purgeLegacyImageStorage = function() {
    for (var i = 0; i < S._LEGACY_IMAGE_KEYS.length; i++) {
        S.remove(S._LEGACY_IMAGE_KEYS[i]);
        try { sessionStorage.removeItem(S._LEGACY_IMAGE_KEYS[i]); } catch(e) {}
    }
    var w = S.get(S.KEYS.WORKSPACE);
    if (w && typeof w === 'object' && (
        w.imageInput != null || w.imageModelInput != null ||
        w.imageImg2imgInput != null || w.imageReferenceInput != null
    )) {
        S.setWorkspace({
            input: w.input,
            output: w.output,
            thinking: w.thinking,
            savedAt: w.savedAt,
            contextPanelOpen: w.contextPanelOpen !== false
        });
    }
};

S.getSttDeviceId = function() {
    var v = S.get(S.KEYS.STT_DEVICE_ID);
    return v != null ? String(v) : '';
};
S.setSttDeviceId = function(id) {
    return S.set(S.KEYS.STT_DEVICE_ID, id != null ? String(id) : '');
};

S.STT_ENGINES = ['vosk-mini', 'vosk-maxi', 'whisper-mini', 'whisper-maxi', 'parakeet'];
S._normSttEngine = function(v) {
    if (v === 'whisper') v = 'whisper-mini';
    if (v === 'whisper-q4') v = 'whisper-mini';
    if (v === 'whisper-q8') v = 'whisper-maxi';
    if (v === 'vosk') v = 'vosk-maxi';
    if (v === 'vosk-big') v = 'vosk-maxi';
    return S.STT_ENGINES.indexOf(v) !== -1 ? v : 'vosk-maxi';
};
S.getSttEngine = function() {
    return S._normSttEngine(S.get(S.KEYS.STT_ENGINE));
};
S.setSttEngine = function(engine) {
    return S.set(S.KEYS.STT_ENGINE, S._normSttEngine(engine));
};

S._normSttCompute = function(v) {
    return (v === 'gpu' || v === 'cpu') ? v : 'cpu';
};
S.getSttCompute = function() {
    var v = S._normSttCompute(S.get(S.KEYS.STT_COMPUTE));
    var caps = window.PDM && window.PDM.STT && typeof window.PDM.STT.getGpuCaps === 'function'
        ? window.PDM.STT.getGpuCaps() : null;
    if (!caps || !caps.canUserChooseGpu) return 'cpu';
    return v;
};
S.setSttCompute = function(mode) {
    return S.set(S.KEYS.STT_COMPUTE, S._normSttCompute(mode));
};

})();
