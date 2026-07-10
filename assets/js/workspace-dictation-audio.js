/**
 * PromptDeMerde.com — workspace-dictation-audio.js
 *
 * Synopsis : Gestion interface et persistance audio dictée WebM — cœur.
 * Objectif : État module, metadata workspace, hooks STT, bouton UI et init ;
 *            encodage/téléchargement (WAV/ZIP) dans workspace-dictation-audio-export.js.
 *
 * Architecture :
 * - Hook STT fin dictée pour définir audioRef workspace
 * - Bouton téléchargement dynamique (single WebM / ZIP multi-segments)
 * - Clear audio avec suppression IDB
 * - Mise à jour metadata session (inputSource, audioRef, segmentCount)
 * - Intégration historique
 */
(function() {
'use strict';

var WDA = {};

// État du module
WDA._state = {
    initialized: false,
    currentAudioRef: null,
    segmentCount: 0,
    isDownloading: false
};

/**
 * Génère un audioRef unique pour une nouvelle dictée
 */
WDA.generateAudioRef = function() {
    var timestamp = Date.now();
    var random = Math.random().toString(36).substr(2, 6);
    return 'dictation_' + timestamp + '_' + random;
};

/**
 * Met à jour les métadonnées audio du workspace
 */
WDA.updateWorkspaceAudioMeta = function(audioRef, segmentCount, fileName) {
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

/**
 * Efface les métadonnées audio du workspace
 */
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
};

/**
 * Met à jour l'état du bouton de téléchargement
 */
WDA.updateDownloadButtonState = function() {
    var btn = document.getElementById('ws-dictation-audio-btn');
    if (!btn) return;
    
    var hasAudio = !!WDA._state.currentAudioRef;
    var isDownloading = WDA._state.isDownloading;
    
    btn.hidden = !hasAudio;
    btn.disabled = isDownloading;
    
    if (isDownloading) {
        btn.textContent = '⏳';
        btn.title = 'Téléchargement en cours…';
    } else if (hasAudio) {
        btn.textContent = '⬇';
        btn.title = 'Télécharger l\'enregistrement micro' +
            (WDA._state.segmentCount > 1
                ? ' (' + WDA._state.segmentCount + ' dictées fusionnées en .wav)'
                : ' (.webm)');
    }
};

/**
 * Hook appelé à la fin d'une dictée STT
 */
WDA.onDictationEnd = function(transcription) {
    // Si pas d'audioRef actuel, on en génère un nouveau
    if (!WDA._state.currentAudioRef) {
        WDA._state.currentAudioRef = WDA.generateAudioRef();
        WDA._state.segmentCount = 1;
    } else {
        // Dictée successive : incrémente le nombre de segments
        WDA._state.segmentCount++;
    }
    
    // Met à jour les métadonnées workspace
    WDA.updateWorkspaceAudioMeta(
        WDA._state.currentAudioRef, 
        WDA._state.segmentCount,
        'dictation_' + new Date().toISOString().replace(/[:.]/g, '-') + '.webm'
    );
    
    // Met à jour le bouton
    WDA.updateDownloadButtonState();
};

/**
 * Hook appelé au début d'une nouvelle dictée (audioRef fourni par le recorder)
 */
WDA.onDictationStart = function(audioRef) {
    if (audioRef) {
        WDA._state.currentAudioRef = audioRef;
    } else if (!WDA._state.currentAudioRef) {
        WDA._state.currentAudioRef = WDA.generateAudioRef();
    }
};

/**
 * Hook appelé lors du reset/clear du workspace
 */
WDA.onWorkspaceClear = function() {
    if (WDA._state.currentAudioRef) {
        WDA.clearCurrentAudio().catch(function(error) {
            console.error('[workspace-dictation-audio] Erreur lors du reset :', error);
        });
    }
};

/**
 * Restaure l'état depuis le workspace persisté
 */
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

/**
 * Bind les événements de l'interface
 */
WDA.bindEvents = function() {
    // Bouton de téléchargement
    var downloadBtn = document.getElementById('ws-dictation-audio-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (!WDA._state.isDownloading) {
                WDA.downloadCurrentAudio().catch(function(error) {
                    console.error('[workspace-dictation-audio] Erreur téléchargement :', error);
                });
            }
        });
    }
    
    // Hook avec le système STT (si disponible)
    if (window.PDM && window.PDM.STTDictationRecorder && window.PDM.STTDictationRecorder.setHooks) {
        window.PDM.STTDictationRecorder.setHooks({
            onRecordingStart: WDA.onDictationStart,
            onSegmentReady: function(result) {
                if (!result || !result.audioRef) return;
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

/**
 * Initialisation du module
 */
WDA.init = function() {
    if (WDA._state.initialized) {
        return;
    }
    
    // Attendre que les dépendances soient chargées
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

// Export global
window.PDM = window.PDM || {};
window.PDM.WorkspaceDictationAudio = WDA;

// Auto-initialisation
WDA.init();

})();
