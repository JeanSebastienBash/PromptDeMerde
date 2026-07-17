/**
 * PromptDeMerde.com — workspace-dictation-audio.js
 *
 * Synopsis : Gestion interface et persistance audio dictée WebM — cœur.
 * Objectif : État module, metadata workspace, hooks STT, bouton UI et init ;
 *            encodage/téléchargement (WebM/WAV) dans workspace-dictation-audio-export.js.
 *
 * Architecture :
 * - Hook STT fin dictée pour définir audioRef workspace
 * - Bouton téléchargement dictée WebM (segment unique ou WAV fusionné)
 * - Clear audio avec suppression IDB
 * - Mise à jour metadata session (inputSource, audioRef, segmentCount)
 * - Intégration historique
 */
(function() {
'use strict';

var WDA = {};

WDA._state = {
    initialized: false,
    currentAudioRef: null,
    segmentCount: 0,
    isDownloading: false,
    hybridFromAudioFile: false,
    hybridDictationRef: null
};

WDA.isHybridFromAudioFile = function() {
    return !!WDA._state.hybridFromAudioFile;
};

WDA.detectHybridContext = function() {
    if (!window.PDM || !window.PDM.Storage || !window.PDM.Storage.getWorkspace) return false;
    var ws = window.PDM.Storage.getWorkspace();
    return !!(ws && ws.inputSource === 'audio-file');
};

WDA.resetHybridState = function() {
    var ref = WDA._state.hybridDictationRef;
    WDA._state.hybridFromAudioFile = false;
    WDA._state.hybridDictationRef = null;
    var done = Promise.resolve();
    if (ref && window.PDM && window.PDM.STTDictationRecorder && window.PDM.STTDictationRecorder.deleteAudioSegments) {
        done = window.PDM.STTDictationRecorder.deleteAudioSegments(ref).catch(function() {});
    }
    return done.finally(function() {
        if (window.PDM && window.PDM.STTDictationRecorder && window.PDM.STTDictationRecorder.resetSession) {
            window.PDM.STTDictationRecorder.resetSession();
        }
        WDA.updateDownloadButtonState();
    });
};

WDA.generateAudioRef = function() {
    var timestamp = Date.now();
    var random = Math.random().toString(36).substr(2, 6);
    return 'dictation_' + timestamp + '_' + random;
};

WDA.updateWorkspaceAudioMeta = function(audioRef, segmentCount, fileName) {
    if (WDA._state.hybridFromAudioFile) return;
    if (!window.PDM || !window.PDM.Storage || !window.PDM.Storage.setWorkspace) {
        console.warn('[workspace-dictation-audio] PDM.Storage.setWorkspace non disponible');
        return;
    }

    var w = window.PDM.Storage.getWorkspace ? window.PDM.Storage.getWorkspace() : {};
    window.PDM.Storage.setWorkspace(Object.assign({}, w, {
        inputSource: 'audio-dictation',
        audioRef: audioRef,
        audioSegmentCount: segmentCount || 1,
        audioFileName: fileName || null,
        audioMimeType: 'audio/webm',
        audioLastModified: Date.now()
    }));
    WDA._state.currentAudioRef = audioRef;
    WDA._state.segmentCount = segmentCount || 1;
};

WDA.clearWorkspaceAudioMeta = function() {
    if (!window.PDM || !window.PDM.Storage || !window.PDM.Storage.setWorkspace) {
        return;
    }

    var w = window.PDM.Storage.getWorkspace ? window.PDM.Storage.getWorkspace() : {};
    window.PDM.Storage.setWorkspace(Object.assign({}, w, {
        inputSource: 'manual',
        audioRef: null,
        audioSegmentCount: null,
        audioFileName: null,
        audioFileSize: null,
        audioMimeType: null,
        audioLastModified: null
    }));
    WDA._state.currentAudioRef = null;
    WDA._state.segmentCount = 0;
    if (window.PDM && window.PDM.WorkspaceInputTools) {
        window.PDM.WorkspaceInputTools.afterDictationAudioChange();
    }
};

WDA.updateDownloadButtonState = function() {
    if (window.PDM && window.PDM.WorkspaceInputTools) {
        window.PDM.WorkspaceInputTools.afterDictationAudioChange();
        return;
    }
    var btn = document.getElementById('ws-dictation-audio-btn');
    if (!btn) return;
    btn.hidden = !WDA._state.currentAudioRef;
};

WDA.onDictationEnd = function(transcription) {
    if (WDA._state.hybridFromAudioFile) {
        WDA.updateDownloadButtonState();
        return;
    }
    if (!WDA._state.currentAudioRef) {
        WDA._state.currentAudioRef = WDA.generateAudioRef();
        WDA._state.segmentCount = 1;
    } else {
        WDA._state.segmentCount++;
    }

    WDA.updateWorkspaceAudioMeta(
        WDA._state.currentAudioRef,
        WDA._state.segmentCount,
        'dictation_' + new Date().toISOString().replace(/[:.]/g, '-') + '.webm'
    );

    WDA.updateDownloadButtonState();
};

WDA.onDictationStart = function(audioRef) {
    if (WDA.detectHybridContext()) {
        WDA._state.hybridFromAudioFile = true;
        if (!WDA._state.hybridDictationRef) {
            WDA._state.hybridDictationRef = audioRef || WDA.generateAudioRef();
        }
        WDA.updateDownloadButtonState();
        return;
    }
    if (audioRef) {
        WDA._state.currentAudioRef = audioRef;
    } else if (!WDA._state.currentAudioRef) {
        WDA._state.currentAudioRef = WDA.generateAudioRef();
    }
};

WDA.onWorkspaceClear = function() {
    WDA.resetHybridState();
    if (WDA._state.currentAudioRef) {
        WDA.clearCurrentAudio().catch(function(error) {
            console.error('[workspace-dictation-audio] Erreur lors du reset :', error);
        });
    }
};

WDA.restoreFromWorkspace = function() {
    if (!window.PDM || !window.PDM.Storage || !window.PDM.Storage.getWorkspace) {
        return;
    }

    var workspace = window.PDM.Storage.getWorkspace();
    if (workspace && workspace.inputSource === 'audio-dictation' && workspace.audioRef) {
        WDA._state.currentAudioRef = workspace.audioRef;
        WDA._state.segmentCount = workspace.audioSegmentCount || 1;
        WDA.updateDownloadButtonState();
    }
};

WDA.bindEvents = function() {
    var downloadBtn = document.getElementById('ws-dictation-audio-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (downloadBtn.disabled || WDA._state.isDownloading) return;
            WDA.downloadCurrentAudio().catch(function(error) {
                console.error('[workspace-dictation-audio] Erreur téléchargement :', error);
            });
        });
    }

    if (window.PDM && window.PDM.STTDictationRecorder && window.PDM.STTDictationRecorder.setHooks) {
        window.PDM.STTDictationRecorder.setHooks({
            onRecordingStart: WDA.onDictationStart,
            onRecordingStop: function() {
                WDA.updateDownloadButtonState();
            },
            onSegmentReady: function(result) {
                if (!result || !result.audioRef) return;
                if (WDA._state.hybridFromAudioFile) {
                    WDA._state.hybridDictationRef = result.audioRef;
                    WDA.updateDownloadButtonState();
                    return;
                }
                WDA._state.currentAudioRef = result.audioRef;
                WDA._state.segmentCount = result.segmentCount || 1;
                WDA.updateWorkspaceAudioMeta(
                    result.audioRef,
                    WDA._state.segmentCount,
                    'dictation_' + new Date().toISOString().replace(/[:.]/g, '-') + '.webm'
                );
                WDA.updateDownloadButtonState();
            }
        });
    }

    if (!WDA._eventsBound) {
        WDA._eventsBound = true;
        document.addEventListener('pdm:workspace-reset', function() {
            WDA.onWorkspaceClear();
        });
        document.addEventListener('pdm:workspace-input-clear', function() {
            if (WDA._state.currentAudioRef) {
                WDA.clearCurrentAudio().catch(function(error) {
                    console.error('[workspace-dictation-audio] Erreur clear via bouton :', error);
                });
            }
        });
    }
};

WDA.init = function() {
    if (WDA._state.initialized) {
        return;
    }

    var attempts = 0;
    var maxAttempts = 50;
    var checkDependencies = function() {
        if (!window.PDM || !window.PDM.STTDictationRecorder) {
            attempts++;
            if (attempts >= maxAttempts) {
                console.warn('[workspace-dictation-audio] STTDictationRecorder indisponible après attente.');
                return;
            }
            setTimeout(checkDependencies, 100);
            return;
        }

        WDA.bindEvents();
        WDA.restoreFromWorkspace();
        WDA._state.initialized = true;
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkDependencies);
    } else {
        checkDependencies();
    }
};

window.PDM = window.PDM || {};
window.PDM.WorkspaceDictationAudio = WDA;

WDA.init();

})();
