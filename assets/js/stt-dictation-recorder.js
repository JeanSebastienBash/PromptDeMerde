/**
 * PromptDeMerde.com — stt-dictation-recorder.js
 *
 * Synopsis : Enregistrement parallèle WebM pendant la dictée STT.
 * Objectif : Patcher setupMicCapture pour lancer MediaRecorder en parallèle,
 *            stocker les segments WebM dans IndexedDB avec audioRef.
 *
 * Architecture :
 * - Patch non-invasif de PDM.STT.Shared.setupMicCapture()
 * - MediaRecorder parallèle au pipeline STT existant
 * - Buffer multi-segments pour dictées successives
 * - Stockage IndexedDB avec clé audioRef
 * - Notification fin dictée via hook
 */
(function() {
'use strict';

var DR = {};

// État d'enregistrement global
DR._state = {
    mediaRecorder: null,
    chunks: [],
    audioRef: null,
    segmentIndex: 0,
    originalSetupMicCapture: null,
    originalSttStop: null,
    hooks: {
        onRecordingStart: null,
        onRecordingStop: null,
        onSegmentReady: null
    },
    pendingStop: null
};

/**
 * Ouvre/crée la base IndexedDB pour stocker les blobs audio
 */
DR.openAudioDB = function() {
    return new Promise(function(resolve, reject) {
        var request = indexedDB.open('pdm-audio', 1);
        request.onerror = function() {
            reject(new Error('Impossible d\'ouvrir la base pdm-audio : ' + (request.error || 'erreur inconnue')));
        };
        request.onsuccess = function() {
            resolve(request.result);
        };
        request.onupgradeneeded = function(event) {
            var db = event.target.result;
            if (!db.objectStoreNames.contains('audio_blobs')) {
                var store = db.createObjectStore('audio_blobs', { keyPath: 'audioRef' });
                store.createIndex('createdAt', 'createdAt', { unique: false });
            }
        };
    });
};

/**
 * Stocke un segment WebM dans IndexedDB
 */
DR.storeAudioSegment = function(audioRef, segmentIndex, blob, metadata) {
    return DR.openAudioDB().then(function(db) {
        return new Promise(function(resolve, reject) {
            var transaction = db.transaction(['audio_blobs'], 'readwrite');
            var store = transaction.objectStore('audio_blobs');
            
            // Récupère l'entrée existante ou en crée une nouvelle
            var getRequest = store.get(audioRef);
            getRequest.onsuccess = function() {
                var entry = getRequest.result || {
                    audioRef: audioRef,
                    segments: [],
                    createdAt: Date.now(),
                    totalSize: 0
                };
                
                // Ajoute ou remplace le segment
                var segmentData = {
                    index: segmentIndex,
                    blob: blob,
                    size: blob.size,
                    mimeType: blob.type,
                    createdAt: Date.now()
                };
                
                if (metadata) {
                    segmentData.metadata = metadata;
                }
                
                // Trouve et remplace ou ajoute
                var found = false;
                for (var i = 0; i < entry.segments.length; i++) {
                    if (entry.segments[i].index === segmentIndex) {
                        entry.totalSize = entry.totalSize - entry.segments[i].size + blob.size;
                        entry.segments[i] = segmentData;
                        found = true;
                        break;
                    }
                }
                
                if (!found) {
                    entry.segments.push(segmentData);
                    entry.totalSize += blob.size;
                }
                
                entry.segments.sort(function(a, b) { return a.index - b.index; });
                entry.updatedAt = Date.now();
                
                var putRequest = store.put(entry);
                putRequest.onsuccess = function() {
                    resolve({
                        audioRef: audioRef,
                        segmentIndex: segmentIndex,
                        segmentCount: entry.segments.length,
                        totalSize: entry.totalSize
                    });
                };
                putRequest.onerror = function() {
                    reject(new Error('Erreur stockage segment : ' + (putRequest.error || 'erreur inconnue')));
                };
            };
            
            getRequest.onerror = function() {
                reject(new Error('Erreur lecture audioRef existant : ' + (getRequest.error || 'erreur inconnue')));
            };
        });
    });
};

/**
 * Récupère les segments audio pour un audioRef donné
 */
DR.getAudioSegments = function(audioRef) {
    return DR.openAudioDB().then(function(db) {
        return new Promise(function(resolve, reject) {
            var transaction = db.transaction(['audio_blobs'], 'readonly');
            var store = transaction.objectStore('audio_blobs');
            var request = store.get(audioRef);
            
            request.onsuccess = function() {
                resolve(request.result || null);
            };
            request.onerror = function() {
                reject(new Error('Erreur lecture segments : ' + (request.error || 'erreur inconnue')));
            };
        });
    });
};

/**
 * Supprime tous les segments pour un audioRef donné
 */
DR.deleteAudioSegments = function(audioRef) {
    return DR.openAudioDB().then(function(db) {
        return new Promise(function(resolve, reject) {
            var transaction = db.transaction(['audio_blobs'], 'readwrite');
            var store = transaction.objectStore('audio_blobs');
            var request = store.delete(audioRef);
            
            request.onsuccess = function() {
                resolve();
            };
            request.onerror = function() {
                reject(new Error('Erreur suppression segments : ' + (request.error || 'erreur inconnue')));
            };
        });
    });
};

/**
 * Génère un audioRef unique
 */
DR.generateAudioRef = function() {
    return 'dictation_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
};

/**
 * Démarre l'enregistrement WebM pour une passe de dictée (stream micro déjà ouvert).
 * Attend la fin du segment précédent pour éviter de perdre les dictées 2, 3…
 */
DR.beginDictationPass = function(stream) {
    if (!stream) return Promise.resolve();

    return DR.stopRecording().then(function() {
        if (DR._state.mediaRecorder) {
            console.warn('[stt-dictation-recorder] MediaRecorder encore actif, passe ignorée');
            return;
        }

        if (!DR._state.audioRef) {
            DR._state.audioRef = DR.generateAudioRef();
            DR._state.segmentIndex = 0;
        } else {
            DR._state.segmentIndex++;
        }
        DR._state.chunks = [];
        DR._startMediaRecorder(stream, DR._state.audioRef);
    });
};

/**
 * Démarre MediaRecorder pour un audioRef et segmentIndex courants
 */
DR._startMediaRecorder = function(stream, audioRef) {
    if (DR._state.mediaRecorder) {
        console.warn('[stt-dictation-recorder] Enregistrement déjà en cours');
        return;
    }

    try {
        // Tentative WebM/Opus, fallback WebM, fallback générique
        var mimeType = 'audio/webm;codecs=opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'audio/webm';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = '';
                console.warn('[stt-dictation-recorder] Format WebM non supporté, utilisation du format par défaut');
            }
        }
        
        var options = {};
        if (mimeType) options.mimeType = mimeType;
        
        DR._state.mediaRecorder = new MediaRecorder(stream, options);
        
        DR._state.mediaRecorder.ondataavailable = function(event) {
            if (event.data && event.data.size > 0) {
                DR._state.chunks.push(event.data);
            }
        };
        
        DR._state.mediaRecorder.onstop = function() {
            var recorder = DR._state.mediaRecorder;
            var mimeType = recorder ? recorder.mimeType : 'audio/webm';
            if (DR._state.chunks.length > 0) {
                var blob = new Blob(DR._state.chunks, { type: mimeType });
                DR.storeAudioSegment(DR._state.audioRef, DR._state.segmentIndex, blob, {
                    recordedAt: Date.now(),
                    duration: null // Pourrait être calculé si nécessaire
                }).then(function(result) {
                    if (DR._state.hooks.onSegmentReady) {
                        DR._state.hooks.onSegmentReady(result);
                    }
                }).catch(function(error) {
                    console.error('[stt-dictation-recorder] Erreur stockage segment :', error);
                });
            }
            
            DR._state.mediaRecorder = null;
            DR._state.chunks = [];
            
            if (DR._state.hooks.onRecordingStop) {
                DR._state.hooks.onRecordingStop(DR._state.audioRef, DR._state.segmentIndex);
            }
        };
        
        DR._state.mediaRecorder.start(250);
        
        if (DR._state.hooks.onRecordingStart) {
            DR._state.hooks.onRecordingStart(audioRef);
        }
        
    } catch (error) {
        console.error('[stt-dictation-recorder] Erreur démarrage MediaRecorder :', error);
        DR._state.mediaRecorder = null;
    }
};

/** @deprecated Utiliser beginDictationPass */
DR.startRecording = function(stream, audioRef) {
    DR._state.audioRef = audioRef;
    DR._state.segmentIndex = 0;
    DR._state.chunks = [];
    DR._startMediaRecorder(stream, audioRef);
};

/**
 * Arrête l'enregistrement en cours (Promise résolue quand le segment est finalisé).
 */
DR.stopRecording = function() {
    var rec = DR._state.mediaRecorder;
    if (!rec) return Promise.resolve();
    if (rec.state === 'inactive') return Promise.resolve();
    if (DR._state.pendingStop) return DR._state.pendingStop;

    DR._state.pendingStop = new Promise(function(resolve) {
        var settled = false;
        function finish() {
            if (settled) return;
            settled = true;
            DR._state.pendingStop = null;
            resolve();
        }

        rec.addEventListener('stop', finish, { once: true });
        try {
            if (rec.state === 'recording' && typeof rec.requestData === 'function') {
                rec.requestData();
            }
            rec.stop();
        } catch (e) {
            finish();
        }
        setTimeout(finish, 4000);
    });

    return DR._state.pendingStop;
};

/**
 * Patch de PDM.STT.Shared.setupMicCapture pour intégrer l'enregistrement
 */
DR.patchSetupMicCapture = function() {
    if (!window.PDM || !window.PDM.STT || !window.PDM.STT.Shared || !window.PDM.STT.Shared.setupMicCapture) {
        console.warn('[stt-dictation-recorder] PDM.STT.Shared.setupMicCapture non trouvé');
        return false;
    }
    
    if (DR._state.originalSetupMicCapture) {
        return true;
    }
    
    DR._state.originalSetupMicCapture = window.PDM.STT.Shared.setupMicCapture;

    // Signature réelle : setupMicCapture(st, stream, opts) — voir stt-shared-audio.js
    window.PDM.STT.Shared.setupMicCapture = function(st, stream, opts) {
        return DR._state.originalSetupMicCapture.call(this, st, stream, opts).then(function(result) {
            if (stream && typeof MediaRecorder !== 'undefined') {
                return DR.beginDictationPass(stream).then(function() {
                    return result;
                }).catch(function(recErr) {
                    console.warn('[stt-dictation-recorder] Enregistrement parallèle ignoré :', recErr);
                    return result;
                });
            }
            return result;
        });
    };

    return true;
};

/**
 * Patch STT.stop pour finaliser le segment WebM à la fin de chaque dictée
 */
DR.patchSttStop = function() {
    if (!window.PDM || !window.PDM.STT || !window.PDM.STT.stop) {
        return false;
    }
    if (DR._state.originalSttStop) {
        return true;
    }

    DR._state.originalSttStop = window.PDM.STT.stop;
    window.PDM.STT.stop = function(opts) {
        var stopP = DR.stopRecording();
        var out = DR._state.originalSttStop.call(this, opts);
        return stopP.then(function() { return out; });
    };

    return true;
};

/**
 * Retire le patch de setupMicCapture
 */
DR.unpatchSetupMicCapture = function() {
    if (DR._state.originalSetupMicCapture && window.PDM && window.PDM.STT && window.PDM.STT.Shared) {
        window.PDM.STT.Shared.setupMicCapture = DR._state.originalSetupMicCapture;
        DR._state.originalSetupMicCapture = null;
    }
};

/**
 * Configure les hooks d'événements
 */
DR.setHooks = function(hooks) {
    if (hooks && typeof hooks === 'object') {
        if (typeof hooks.onRecordingStart === 'function') {
            DR._state.hooks.onRecordingStart = hooks.onRecordingStart;
        }
        if (typeof hooks.onRecordingStop === 'function') {
            DR._state.hooks.onRecordingStop = hooks.onRecordingStop;
        }
        if (typeof hooks.onSegmentReady === 'function') {
            DR._state.hooks.onSegmentReady = hooks.onSegmentReady;
        }
    }
};

/**
 * État actuel de l'enregistrement
 */
DR.getRecordingState = function() {
    return {
        isRecording: !!(DR._state.mediaRecorder && DR._state.mediaRecorder.state === 'recording'),
        audioRef: DR._state.audioRef,
        segmentIndex: DR._state.segmentIndex,
        chunksCount: DR._state.chunks.length
    };
};

/**
 * Nettoie l'état d'enregistrement
 */
DR.cleanup = function() {
    DR.stopRecording();
    DR._state.audioRef = null;
    DR._state.segmentIndex = 0;
    DR._state.chunks = [];
};

/** Réinitialise la session d'enregistrement (clear workspace). */
DR.resetSession = function() {
    DR.cleanup();
};

/**
 * Initialisation du module
 */
DR.init = function() {
    function applyPatches() {
        DR.patchSetupMicCapture();
        DR.patchSttStop();
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(applyPatches, 100);
        });
    } else {
        setTimeout(applyPatches, 100);
    }
    
    // Nettoyage à la fermeture de page
    window.addEventListener('beforeunload', function() {
        DR.cleanup();
    });
};

// Export global
window.PDM = window.PDM || {};
window.PDM.STTDictationRecorder = DR;

// Auto-initialisation
DR.init();

})();