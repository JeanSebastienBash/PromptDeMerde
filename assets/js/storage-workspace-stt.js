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
            input: '', output: '', thinking: '', savedAt: null, contextPanelOpen: false,
            compressIncludeSystem: false,
            compressIncludeContexts: false,
            compressIncludeInput: false,
            compressIncludeOutput: false
        }, emptyAudio);
    }
    var audio = CS && CS.normalizeAudioMeta ? CS.normalizeAudioMeta(w) : emptyAudio;
    return {
        input: w.input != null ? String(w.input) : '',
        output: w.output != null ? String(w.output) : '',
        thinking: w.thinking != null ? String(w.thinking) : '',
        savedAt: w.savedAt || null,
        contextPanelOpen: w.contextPanelOpen === true,
        inputSource: audio.inputSource,
        audioFileName: audio.audioFileName,
        audioFileSize: audio.audioFileSize,
        audioMimeType: audio.audioMimeType,
        audioLastModified: audio.audioLastModified,
        audioRef: audio.audioRef,
        audioSegmentCount: audio.audioSegmentCount != null ? audio.audioSegmentCount : null,
        compressIncludeSystem: w.compressIncludeSystem === true,
        compressIncludeContexts: w.compressIncludeContexts === true,
        compressIncludeInput: w.compressIncludeInput === true,
        compressIncludeOutput: w.compressIncludeOutput === true
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
        contextPanelOpen: 'contextPanelOpen' in data ? data.contextPanelOpen === true : (prevRaw.contextPanelOpen === true),
        inputSource: audio.inputSource,
        audioFileName: audio.audioFileName,
        audioFileSize: audio.audioFileSize,
        audioMimeType: audio.audioMimeType,
        audioLastModified: audio.audioLastModified,
        audioRef: audio.audioRef,
        audioSegmentCount: audio.audioSegmentCount != null ? audio.audioSegmentCount : null,
        compressIncludeSystem: 'compressIncludeSystem' in data
            ? data.compressIncludeSystem === true
            : (prevRaw.compressIncludeSystem === true),
        compressIncludeContexts: 'compressIncludeContexts' in data
            ? data.compressIncludeContexts === true
            : (prevRaw.compressIncludeContexts === true),
        compressIncludeInput: 'compressIncludeInput' in data
            ? data.compressIncludeInput === true
            : (prevRaw.compressIncludeInput === true),
        compressIncludeOutput: 'compressIncludeOutput' in data
            ? data.compressIncludeOutput === true
            : (prevRaw.compressIncludeOutput === true)
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
            contextPanelOpen: w.contextPanelOpen === true
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

S.getSttInsertAtCursor = function() {
    return S.get(S.KEYS.STT_INSERT_AT_CURSOR) === true;
};
S.setSttInsertAtCursor = function(on) {
    return S.set(S.KEYS.STT_INSERT_AT_CURSOR, !!on);
};

S.STT_DELETE_WORD_SHORTCUTS = ['ctrl+backspace', 'ctrl+delete', 'alt+backspace', 'ctrl+shift+backspace'];
S.STT_DELETE_WORD_TARGETS = ['end', 'cursor'];

S._sttDeleteWordShortcutSpec = function(id) {
    var specs = {
        'ctrl+backspace': { key: 'Backspace', ctrl: true, alt: false, shift: false, meta: false },
        'ctrl+delete': { key: 'Delete', ctrl: true, alt: false, shift: false, meta: false },
        'alt+backspace': { key: 'Backspace', ctrl: false, alt: true, shift: false, meta: false },
        'ctrl+shift+backspace': { key: 'Backspace', ctrl: true, alt: false, shift: true, meta: false }
    };
    return specs[id] || specs['ctrl+backspace'];
};

S._normSttDeleteWordShortcut = function(v) {
    return S.STT_DELETE_WORD_SHORTCUTS.indexOf(v) !== -1 ? v : 'ctrl+backspace';
};

S._normSttDeleteWordTarget = function(v) {
    return S.STT_DELETE_WORD_TARGETS.indexOf(v) !== -1 ? v : 'end';
};

S.getSttDeleteWordEnabled = function() {
    var v = S.get(S.KEYS.STT_DELETE_WORD_ENABLED);
    return v === false ? false : true;
};

S.setSttDeleteWordEnabled = function(on) {
    return S.set(S.KEYS.STT_DELETE_WORD_ENABLED, !!on);
};

S.getSttDeleteWordShortcut = function() {
    return S._normSttDeleteWordShortcut(S.get(S.KEYS.STT_DELETE_WORD_SHORTCUT));
};

S.setSttDeleteWordShortcut = function(id) {
    return S.set(S.KEYS.STT_DELETE_WORD_SHORTCUT, S._normSttDeleteWordShortcut(id));
};

S.getSttDeleteWordTarget = function() {
    return S._normSttDeleteWordTarget(S.get(S.KEYS.STT_DELETE_WORD_TARGET));
};

S.setSttDeleteWordTarget = function(mode) {
    return S.set(S.KEYS.STT_DELETE_WORD_TARGET, S._normSttDeleteWordTarget(mode));
};

S._normSttVoskLang = function(v) {
    v = String(v != null ? v : '').trim();
    if (!v) return 'fr';
    var Cat = window.PDM && window.PDM.STT && window.PDM.STT.VoskCatalog;
    if (Cat && Cat.normalizeLangId) return Cat.normalizeLangId(v);
    return v;
};

S.getSttVoskLang = function() {
    return S._normSttVoskLang(S.get(S.KEYS.STT_VOSK_LANG) || 'fr');
};

S.setSttVoskLang = function(langId) {
    return S.set(S.KEYS.STT_VOSK_LANG, S._normSttVoskLang(langId));
};

S.eventMatchesSttDeleteWordShortcut = function(e) {
    if (!S.getSttDeleteWordEnabled() || !e) return false;
    var spec = S._sttDeleteWordShortcutSpec(S.getSttDeleteWordShortcut());
    if (e.key !== spec.key) return false;
    return !!e.ctrlKey === !!spec.ctrl
        && !!e.altKey === !!spec.alt
        && !!e.shiftKey === !!spec.shift
        && !!e.metaKey === !!spec.meta;
};

})();
