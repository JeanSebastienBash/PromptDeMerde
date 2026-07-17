/**
 * PromptDeMerde.com — storage-workspace-audio.js
 *
 * Synopsis : Extension brouillon Workspace pour l'import audio (métadonnées + audioRef).
 * Objectif : Persister le mode d'entrée ; champs audio exportés via pdm_workspace.
 */
(function(){

var S = window.PDM && window.PDM.Storage;
if (!S) { console.warn('[storage-workspace-audio] PDM.Storage not found.'); return; }

var CS = window.PDM && window.PDM.ConfigSchema;
var baseSet = S.setWorkspace;

function normAudio(raw) {
    if (CS && CS.normalizeAudioMeta) return CS.normalizeAudioMeta(raw);
    var src = raw && raw.inputSource;
    if (src !== 'audio-file' && src !== 'audio-dictation' && src !== 'image-file') src = 'manual';
    return {
        inputSource: src,
        audioFileName: raw && raw.audioFileName != null ? String(raw.audioFileName) : null,
        audioFileSize: null,
        audioMimeType: null,
        audioLastModified: null,
        audioRef: null
    };
}

S.getWorkspaceAudio = function() {
    return normAudio(S.get(S.KEYS.WORKSPACE) || {});
};

S.fileToWorkspaceAudioMeta = function(file, audioRef) {
    var meta = normAudio({ inputSource: 'audio-file' });
    if (!file) return meta;
    meta.audioFileName = file.name != null ? String(file.name) : null;
    meta.audioFileSize = typeof file.size === 'number' ? file.size : null;
    meta.audioMimeType = file.type != null ? String(file.type) : null;
    meta.audioLastModified = typeof file.lastModified === 'number' ? file.lastModified : null;
    meta.audioRef = audioRef != null ? String(audioRef) : null;
    return meta;
};

S.setWorkspace = function(data) {
    data = data || {};
    var prev = S.get(S.KEYS.WORKSPACE) || {};
    var res = baseSet(data);
    var w = S.get(S.KEYS.WORKSPACE);
    if (!w) return res;

    var merged = Object.assign({}, prev, data);
    var audio = normAudio(merged);
    w.inputSource = audio.inputSource;
    w.audioFileName = audio.audioFileName;
    w.audioFileSize = audio.audioFileSize;
    w.audioMimeType = audio.audioMimeType;
    w.audioLastModified = audio.audioLastModified;
    w.audioRef = audio.audioRef;
    w.audioSegmentCount = audio.audioSegmentCount != null ? audio.audioSegmentCount : null;

    if (!('contextPanelOpen' in data) && prev.contextPanelOpen !== undefined) {
        w.contextPanelOpen = prev.contextPanelOpen === true;
    }
    S.set(S.KEYS.WORKSPACE, w);
    return res;
};

S.setWorkspaceInputSource = function(source, fileName, extra) {
    var w = S.getWorkspace();
    var patch = Object.assign({}, w, extra || {});
    patch.inputSource = source === 'audio-file' ? 'audio-file' : 'manual';
    if (patch.inputSource !== 'audio-file') {
        patch.audioFileName = null;
        patch.audioFileSize = null;
        patch.audioMimeType = null;
        patch.audioLastModified = null;
        patch.audioRef = null;
    } else if (fileName != null) {
        patch.audioFileName = String(fileName);
    }
    return S.setWorkspace(patch);
};

S.clearWorkspaceAudioMeta = function() {
    var w = S.getWorkspace();
    return S.setWorkspace(Object.assign({}, w, normAudio({ inputSource: 'manual' })));
};

})();
