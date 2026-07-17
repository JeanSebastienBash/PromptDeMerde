/**
 * PromptDeMerde.com — workspace-audio-bind.js
 *
 * Synopsis : Bindings import audio/vidéo Workspace (bouton discret, transcription Whisper Maxi locale).
 * Objectif : Priorité média, verrouillage temporaire pendant le traitement, édition libre après transcription.
 */
(function(){
"use strict";

var A = window.PDM && window.PDM.App;
if (!A) { console.warn('[workspace-audio-bind] PDM.App not found.'); return; }

function wuText(key, vars) {
    return window.PDM && window.PDM.WorkspaceUi ? window.PDM.WorkspaceUi.text(key, vars) : '';
}

var audioJobGen = 0;

function syncInputTools() {
    if (window.PDM && window.PDM.WorkspaceInputTools) {
        window.PDM.WorkspaceInputTools.sync();
    }
}

function busy() {
    if (A.isInferenceActive && A.isInferenceActive()) {
        window.PDM.UI.notif(wuText('audioInferenceWait'), 'err'); return true;
    }
    if (window.PDM.STT && window.PDM.STT.isActive && window.PDM.STT.isActive()) {
        window.PDM.UI.notif(wuText('audioDictationImportWait'), 'err'); return true;
    }
    if (A.isWorkspaceAudioMode && A.isWorkspaceAudioMode()) {
        window.PDM.UI.notif(wuText('audioImportBlockedTitle'), 'err'); return true;
    }
    if (A.isWorkspaceAudioProcessing && A.isWorkspaceAudioProcessing()) {
        window.PDM.UI.notif(wuText('audioImportBlockedTitle'), 'err'); return true;
    }
    return false;
}

function setInput(text) {
    var inp = document.getElementById('ws-input');
    if (!inp) return;
    inp.value = text || '';
    var cc = document.getElementById('char-count');
    if (cc) cc.textContent = inp.value.length + ' / ' + (window.PDM.STT.Shared.MAX_CHARS);
}

function refreshSttUi() {
    if (window.PDM.STT && window.PDM.STT.syncSttAfterFileImport) {
        window.PDM.STT.syncSttAfterFileImport();
    }
}

function toManual() {
    A.setWorkspaceAudioMode(false);
    window.PDM.Storage.clearWorkspaceAudioMeta();
    refreshSttUi();
}

function deleteWorkspaceAudioBlob() {
    var AB = window.PDM && window.PDM.StorageAudioBlobs;
    if (!AB) return Promise.resolve();
    var audio = window.PDM.Storage.getWorkspaceAudio();
    if (!audio || !audio.audioRef) return Promise.resolve();
    return AB.delete(audio.audioRef);
}

function clearAudioInput(opts) {
    opts = opts || {};
    audioJobGen++;
    var wasProcessing = A.isWorkspaceAudioProcessing && A.isWorkspaceAudioProcessing();
    var hybridReset = (window.PDM.WorkspaceDictationAudio && window.PDM.WorkspaceDictationAudio.resetHybridState)
        ? window.PDM.WorkspaceDictationAudio.resetHybridState()
        : Promise.resolve();
    setInput('');
    hybridReset.finally(function() {
        deleteWorkspaceAudioBlob().finally(function() {
            toManual();
            A.clearWorkspaceOutput();
            window.PDM.Storage.setWorkspace({
                input: '', output: '', thinking: '',
                inputSource: 'manual', audioFileName: null,
                audioFileSize: null, audioMimeType: null, audioLastModified: null, audioRef: null
            });
            if (A.scheduleWorkspaceSave) A.scheduleWorkspaceSave();
            var inp = document.getElementById('ws-input');
            if (inp) inp.focus();
            if (!opts.silent) {
                if (wasProcessing) {
                    window.PDM.UI.notif(wuText('audioTranscriptionCancelled'), 'info');
                } else {
                    window.PDM.UI.notif(wuText('audioModeExited'), 'ok');
                }
            }
            syncInputTools();
        });
    });
}

A.exitWorkspaceAudioMode = clearAudioInput;

function isEditKey(e) {
    if (e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Escape') return true;
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) return true;
    return false;
}

function bindAudioInputEscape() {
    var inp = document.getElementById('ws-input');
    if (!inp || inp._pdmAudioEscapeBound) return;
    inp._pdmAudioEscapeBound = true;

    inp.addEventListener('keydown', function(e) {
        if (!A.isWorkspaceAudioMode || !A.isWorkspaceAudioMode()) return;



        if (!A.isWorkspaceAudioProcessing || !A.isWorkspaceAudioProcessing()) return;
        if (!isEditKey(e)) return;
        e.preventDefault();
        var silent = e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Escape';
        clearAudioInput({ silent: silent });
    });
}

function progressFromPhase(p) {
    if (p.phase === 'decode') return { detail: wuText('audioProgressDecode'), pct: 12 };
    if (p.phase === 'model') return { detail: wuText('audioProgressModel'), pct: 28 };
    if (p.phase === 'transcribe') {
        var total = p.total > 0 ? p.total : 1;
        var idx = (p.index != null ? p.index : 0) + 1;
        var pct = 35 + Math.round((idx / total) * 60);
        var detail = total > 1
            ? wuText('audioProgressTranscribeSegment', { idx: idx, total: total })
            : wuText('audioProgressTranscribeFile');
        return { detail: detail, pct: pct };
    }
    return { detail: wuText('audioProgressDefault'), pct: null };
}

function handleFile(file) {
    if (!file || busy()) return;
    if (!(window.PDM.STT && window.PDM.STT.transcribeAudioFile)) {
        window.PDM.UI.notif(wuText('audioEngineUnavailable'), 'err'); return;
    }
    var job = ++audioJobGen;
    A.clearWorkspaceOutput();
    A.setWorkspaceAudioMode(true, file.name);
    A.setWorkspaceAudioProcessing(file.name, wuText('audioPrepDetail'), 4);
    setInput('');
    syncInputTools();

    window.PDM.STT.transcribeAudioFile(file, {
        onProgress: function(p) {
            if (job !== audioJobGen) return;
            var ui = progressFromPhase(p);
            A.setWorkspaceAudioProcessing(file.name, ui.detail, ui.pct);
        }
    }).then(function(text) {
        if (job !== audioJobGen) return;
        setInput(text);
        A.setWorkspaceAudioDone(file.name, function() { clearAudioInput(); });
        syncInputTools();

        var AB = window.PDM && window.PDM.StorageAudioBlobs;
        var prev = window.PDM.Storage.getWorkspaceAudio();
        var audioRef = AB && AB.newWorkspaceRef ? AB.newWorkspaceRef() : ('ws-' + Date.now());
        var meta = window.PDM.Storage.fileToWorkspaceAudioMeta
            ? window.PDM.Storage.fileToWorkspaceAudioMeta(file, audioRef)
            : {
                inputSource: 'audio-file',
                audioFileName: file.name,
                audioFileSize: file.size,
                audioMimeType: file.type,
                audioLastModified: file.lastModified,
                audioRef: audioRef
            };

        function persistWorkspace() {
            window.PDM.Storage.setWorkspace(Object.assign({
                input: text || '', output: '', thinking: ''
            }, meta));
            A.clearWorkspaceOutput({ skipSave: true });
            A.updateWorkspacePromptGuard();
            refreshSttUi();
        }

        if (AB && AB.put) {
            if (prev && prev.audioRef && prev.audioRef !== audioRef) {
                AB.delete(prev.audioRef).finally(function() {
                    AB.put(audioRef, file, AB.fileMetaFromFile ? AB.fileMetaFromFile(file) : file).finally(persistWorkspace);
                });
            } else {
                AB.put(audioRef, file, AB.fileMetaFromFile ? AB.fileMetaFromFile(file) : file).finally(persistWorkspace);
            }
        } else {
            meta.audioRef = null;
            persistWorkspace();
        }
    }).catch(function(e) {
        if (job !== audioJobGen) return;
        var msg = e && e.message;
        var key = 'audioTranscribeFail';
        var code = null;
        var WIT = window.PDM && window.PDM.WorkspaceInputTools;
        if (msg === 'missing-model') {
            key = 'audioModelMissing';
            code = WIT && WIT.CODES ? WIT.CODES.AUDIO_MODEL_MISSING : null;
        } else if (msg === 'unsupported-media') {
            key = 'audioUnsupportedMedia';
            code = WIT && WIT.CODES ? WIT.CODES.AUDIO_UNSUPPORTED_MEDIA : null;
        } else if (WIT && WIT.CODES) {
            code = WIT.CODES.AUDIO_TRANSCRIBE_FAIL;
        }
        if (WIT && WIT.notifyError && code) {
            WIT.notifyError(key, code);
        } else {
            window.PDM.UI.notif(wuText(key), 'err');
        }
        setInput('');
        toManual();
    });
}

A.bindWorkspaceAudio = function() {
    if (A._wsAudioBound) return;
    A._wsAudioBound = true;

    if (A.rememberWorkspaceInputPlaceholder) A.rememberWorkspaceInputPlaceholder();
    bindAudioInputEscape();

    var btn = document.getElementById('ws-audio-file-btn');
    var picker = document.getElementById('ws-audio-file-input');
    if (btn && picker) {
        btn.addEventListener('click', function(){
            if (btn.disabled || busy()) return;
            picker.click();
        });
        picker.addEventListener('change', function(e){
            if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
            e.target.value = '';
        });
    }

    if (!A._wsAudioEventsBound) {
        A._wsAudioEventsBound = true;
        document.addEventListener('pdm:workspace-reset', function() {
            audioJobGen++;
            toManual();
        });
        document.addEventListener('pdm:workspace-input-clear', function() {
            var audio = window.PDM.Storage.getWorkspaceAudio && window.PDM.Storage.getWorkspaceAudio();
            var fileProvenance = !!(audio && audio.inputSource === 'audio-file');
            if ((A.isWorkspaceAudioMode && A.isWorkspaceAudioMode()) || fileProvenance) {
                clearAudioInput();
            }
        });
    }

    syncInputTools();
};

})();
