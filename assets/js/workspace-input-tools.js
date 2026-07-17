/**
 * PromptDeMerde.com — workspace-input-tools.js
 *
 * Synopsis : État unifié des boutons de la zone saisie Workspace.
 * Objectif : Désactiver (griser) les actions inutiles et messages d'erreur utilisateur génériques.
 */
(function() {
'use strict';

var WIT = {};

WIT.CODES = {
    DOWNLOAD_NOTHING: 'PDM-W001',
    DOWNLOAD_FAIL: 'PDM-W002',
    DOWNLOAD_BUSY: 'PDM-W003',
    AUDIO_IMPORT_BLOCKED: 'PDM-W004',
    AUDIO_TRANSCRIBE_FAIL: 'PDM-W005',
    CLEAR_BLOCKED: 'PDM-W006',
    AUDIO_CLEAR_FAIL: 'PDM-W007',
    TTS_V2_UNAVAILABLE: 'PDM-W008',
    AUDIO_MODEL_MISSING: 'PDM-W009',
    AUDIO_UNSUPPORTED_MEDIA: 'PDM-W010'
};

WIT._downloadReady = false;
WIT._downloadCheckGen = 0;

function wuText(key, vars) {
    return window.PDM && window.PDM.WorkspaceUi ? window.PDM.WorkspaceUi.text(key, vars) : '';
}

function app() {
    return window.PDM && window.PDM.App;
}

function stt() {
    return window.PDM && window.PDM.STT;
}

function wda() {
    return window.PDM && window.PDM.WorkspaceDictationAudio;
}

function ensureTooltipWrap(btn) {
    if (!btn) return null;
    var parent = btn.parentElement;
    if (parent && parent.classList.contains('ws-btn-tooltip-wrap')) return parent;
    var wrap = document.createElement('span');
    wrap.className = 'ws-btn-tooltip-wrap';
    if (btn.classList.contains('ws-icon-btn')) wrap.classList.add('ws-icon-btn-wrap');
    if (btn.classList.contains('ws-audio-new-input-btn')) wrap.classList.add('ws-audio-new-input-wrap');
    btn.parentNode.insertBefore(wrap, btn);
    wrap.appendChild(btn);
    return wrap;
}

function setBtnState(btn, blocked, title, ariaLabel) {
    if (!btn) return;
    var wrap = ensureTooltipWrap(btn);
    btn.disabled = !!blocked;
    btn.setAttribute('aria-disabled', blocked ? 'true' : 'false');
    if (ariaLabel != null) btn.setAttribute('aria-label', ariaLabel);
    if (blocked && wrap) {
        wrap.title = title || '';
        wrap.setAttribute('data-blocked', 'true');
        btn.removeAttribute('title');
    } else {
        if (wrap) {
            wrap.removeAttribute('title');
            wrap.removeAttribute('data-blocked');
        }
        if (title != null) btn.title = title;
    }
}

function downloadBlockedTitle(flags) {
    if (flags.isDownloading) return wuText('downloadBusyTitle');
    if (flags.hybridAudioFile) return wuText('downloadImpossibleHybridAudio');
    if (!flags.downloadReady) return wuText('downloadImpossibleNothing');
    if (flags.dictationActive) return wuText('downloadImpossibleDictation');
    if (flags.inferActive) return wuText('downloadImpossibleInference');
    if (flags.audioMode) return wuText('downloadImpossibleAudioMode');
    return wuText('downloadReadyTitle');
}

function isDictationBusy() {
    var STT = stt();
    if (STT && STT.isDictating && STT.isDictating()) return true;
    var DR = window.PDM && window.PDM.STTDictationRecorder;
    if (DR && DR.getRecordingState && DR.getRecordingState().isRecording) return true;
    return false;
}

function ttsBlockedTitle(flags) {
    if (flags.inferActive) return wuText('ttsImpossibleInference');
    if (flags.dictationActive) return wuText('ttsImpossibleDictation');
    if (flags.audioMode || flags.audioProcessing) return wuText('ttsImpossibleAudioMode');
    if (!flags.hasTtsSource) return wuText('ttsImpossibleEmpty');
    return wuText('ttsDownloadTitle');
}

function importBlockedTitle(flags) {
    if (flags.inferActive) return wuText('audioImportImpossibleInference');
    if (flags.dictationActive) return wuText('audioImportImpossibleDictation');
    if (flags.audioMode || flags.audioProcessing) return wuText('audioImportImpossibleAudioMode');
    return wuText('audioImportTitle');
}

WIT.userMessage = function(textKey, code, vars) {
    var base = wuText(textKey, vars) || wuText('errorGeneric');
    return base + wuText('errorRefSuffix', { code: code });
};

WIT.notifyError = function(textKey, code, vars) {
    if (window.PDM && window.PDM.UI && window.PDM.UI.notif) {
        window.PDM.UI.notif(WIT.userMessage(textKey, code, vars), 'err');
    }
};

WIT.isDictationAudioContext = function() {
    var WDA = wda();
    if (WDA && WDA.isHybridFromAudioFile && WDA.isHybridFromAudioFile()) return false;
    if (WDA && WDA._state && WDA._state.currentAudioRef) return true;
    if (window.PDM && window.PDM.Storage && window.PDM.Storage.getWorkspace) {
        var ws = window.PDM.Storage.getWorkspace();
        return !!(ws && ws.inputSource === 'audio-dictation' && ws.audioRef);
    }
    return false;
};

WIT.refreshDownloadReady = function() {
    var WDA = wda();
    var ref = WDA && WDA._state && WDA._state.currentAudioRef;
    if (!ref || !window.PDM || !window.PDM.STTDictationRecorder) {
        WIT._downloadReady = false;
        WIT.sync();
        return Promise.resolve(false);
    }

    var gen = ++WIT._downloadCheckGen;
    return window.PDM.STTDictationRecorder.getAudioSegments(ref).then(function(data) {
        if (gen !== WIT._downloadCheckGen) return WIT._downloadReady;
        WIT._downloadReady = !!(data && data.segments && data.segments.length > 0);
        WIT.sync();
        return WIT._downloadReady;
    }).catch(function(err) {
        if (gen === WIT._downloadCheckGen) {
            WIT._downloadReady = false;
            WIT.sync();
        }
        try { console.warn('[workspace-input-tools] Vérification téléchargement :', err); } catch (e) {}
        return false;
    });
};

WIT.sync = function() {
    var A = app();
    var STT = stt();
    var WDA = wda();
    var inferActive = !!(A && A.isInferenceActive && A.isInferenceActive());
    var dictationActive = isDictationBusy();
    var audioMode = !!(A && A.isWorkspaceAudioMode && A.isWorkspaceAudioMode());
    var audioProcessing = !!(A && A.isWorkspaceAudioProcessing && A.isWorkspaceAudioProcessing());
    var audioProvenance = !!(A && A.hasWorkspaceAudioFileProvenance && A.hasWorkspaceAudioFileProvenance());
    var input = document.getElementById('ws-input');
    var output = document.getElementById('output-text');
    var inputEmpty = !input || !input.value.trim();
    var outputEmpty = !output || !output.value.trim();
    var isDownloading = !!(WDA && WDA._state && WDA._state.isDownloading);
    var dictationContext = WIT.isDictationAudioContext();
    var hybridAudioFile = !!(WDA && WDA.isHybridFromAudioFile && WDA.isHybridFromAudioFile());
    var flags = {
        inferActive: inferActive,
        dictationActive: dictationActive,
        audioMode: audioMode,
        audioProcessing: audioProcessing,
        audioProvenance: audioProvenance,
        isDownloading: isDownloading,
        downloadReady: WIT._downloadReady,
        hybridAudioFile: hybridAudioFile,
        inputHasText: !inputEmpty,
        outputHasText: !outputEmpty,
        hasTtsSource: !inputEmpty || !outputEmpty
    };

    var dlBtn = document.getElementById('ws-dictation-audio-btn');
    if (dlBtn) {
        var dlBlocked = hybridAudioFile || inferActive || dictationActive || audioMode || isDownloading || !WIT._downloadReady;
        dlBtn.hidden = hybridAudioFile || (!dictationContext && !WIT._downloadReady);
        dlBtn.textContent = isDownloading ? '\u23F3' : '\u2B07';
        setBtnState(
            dlBtn,
            dlBlocked,
            downloadBlockedTitle(flags),
            wuText('downloadAriaLabel')
        );
    }

    var ttsBtn = document.getElementById('ws-tts-download-btn');
    if (ttsBtn) {
        var ttsV2 = !!(window.PDM && window.PDM.WorkspaceTtsDownload && window.PDM.WorkspaceTtsDownload.V2_ENABLED);
        var ttsBlocked = !ttsV2 || inferActive || dictationActive || audioMode || audioProcessing || !flags.hasTtsSource;
        setBtnState(
            ttsBtn,
            ttsBlocked,
            ttsBlockedTitle(flags),
            wuText('ttsDownloadAriaLabel')
        );
    }

    var upBtn = document.getElementById('ws-audio-file-btn');
    if (upBtn) {
        var upBlocked = inferActive || dictationActive || audioMode || audioProcessing;
        setBtnState(
            upBtn,
            upBlocked,
            importBlockedTitle(flags),
            wuText('audioImportAriaLabel')
        );
    }

    var imgBtn = document.getElementById('ws-image-file-btn');
    if (imgBtn) {
        var imageProcessing = !!(A && A.isWorkspaceImageProcessing && A.isWorkspaceImageProcessing());
        var imgBlocked = inferActive || dictationActive || audioMode || audioProcessing || imageProcessing;
        var imgTitle = imgBlocked
            ? (imageProcessing
                ? wuText('imageImportBlockedTitle')
                : (inferActive
                    ? wuText('imageImportImpossibleInference')
                    : (dictationActive
                        ? wuText('imageImportImpossibleDictation')
                        : wuText('imageImportImpossibleAudioMode'))))
            : wuText('imageImportTitle');
        setBtnState(imgBtn, imgBlocked, imgTitle, wuText('imageImportAriaLabel'));
    }

    var clearBtn = document.getElementById('ws-input-clear');
    if (clearBtn) {
        var clearBlocked;
        if (dictationActive) {
            clearBlocked = true;
        } else if (audioProcessing) {
            clearBlocked = false;
        } else if (audioMode || audioProvenance) {
            clearBlocked = false;
        } else {
            clearBlocked = inputEmpty && !dictationContext;
        }
        if (!clearBlocked) {
            if (audioProcessing) {
                setBtnState(clearBtn, false, wuText('audioClearProcessingTitle'), wuText('audioClearProcessingTitle'));
            } else if (audioMode || audioProvenance) {
                setBtnState(clearBtn, false, wuText('audioClearCancelTitle'), wuText('audioClearCancelTitle'));
            } else {
                setBtnState(clearBtn, false, wuText('audioClearTitle'), wuText('audioClearTitle'));
            }
        } else {
            var clearTitle = dictationActive
                ? wuText('clearImpossibleDictation')
                : wuText('clearImpossibleNothing');
            setBtnState(clearBtn, true, clearTitle, wuText('audioClearTitle'));
        }
    }

    var newBtn = document.querySelector('.ws-audio-new-input-btn');
    if (newBtn) {
        var newBlocked = audioProcessing || inferActive || dictationActive;
        setBtnState(
            newBtn,
            newBlocked,
            newBlocked ? wuText('audioNewInputImpossible') : wuText('audioNewInput'),
            wuText('audioNewInput')
        );
    }
};

WIT.afterDictationAudioChange = function() {
    return WIT.refreshDownloadReady();
};

WIT.init = function() {
    if (WIT._inited) return;
    WIT._inited = true;
    if (!WIT._outputSyncBound) {
        WIT._outputSyncBound = true;
        var outputTa = document.getElementById('output-text');
        if (outputTa) {
            outputTa.addEventListener('input', function() { WIT.sync(); });
        }
    }
    WIT.refreshDownloadReady();
    WIT.sync();
};

window.PDM = window.PDM || {};
window.PDM.WorkspaceInputTools = WIT;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', WIT.init);
} else {
    WIT.init();
}

})();
