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

DR._state = {
    mediaRecorder: null,
    recordStream: null,
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

DR.openAudioDB = function() {
    return new Promise(function(resolve, reject) {
        var request = indexedDB.open('pdm-audio', 1);
        request.onerror = function() {
            reject(new Error('Cannot open pdm-audio database: ' + (request.error || 'unknown error')));
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

DR.storeAudioSegment = function(audioRef, segmentIndex, blob, metadata) {
    return DR.openAudioDB().then(function(db) {
        return new Promise(function(resolve, reject) {
            var transaction = db.transaction(['audio_blobs'], 'readwrite');
            var store = transaction.objectStore('audio_blobs');

            var getRequest = store.get(audioRef);
            getRequest.onsuccess = function() {
                var entry = getRequest.result || {
                    audioRef: audioRef,
                    segments: [],
                    createdAt: Date.now(),
                    totalSize: 0
                };

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
                    reject(new Error('Segment storage error: ' + (putRequest.error || 'unknown error')));
                };
            };

            getRequest.onerror = function() {
                reject(new Error('Existing audioRef read error: ' + (getRequest.error || 'unknown error')));
            };
        });
    });
};

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
                reject(new Error('Segments read error: ' + (request.error || 'unknown error')));
            };
        });
    });
};

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
                reject(new Error('Segments delete error: ' + (request.error || 'unknown error')));
            };
        });
    });
};

DR.generateAudioRef = function() {
    return 'dictation_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
};

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

DR._stopRecordStream = function() {
    var stream = DR._state.recordStream;
    DR._state.recordStream = null;
    if (!stream || !stream.getTracks) return;
    try {
        stream.getTracks().forEach(function(track) {
            try { track.stop(); } catch (e) {}
        });
    } catch (e) {}
};

DR._finalizeRecorderStop = function(audioRef, segmentIndex, chunks, mimeType) {
    function done() {
        if (DR._state.hooks.onRecordingStop) {
            DR._state.hooks.onRecordingStop(audioRef, segmentIndex);
        }
        if (DR._state._stopResolve) {
            var resolve = DR._state._stopResolve;
            DR._state._stopResolve = null;
            resolve();
        }
    }

    DR._stopRecordStream();

    if (!chunks || !chunks.length) {
        console.warn('[stt-dictation-recorder] Aucune donnée audio enregistrée pour cette dictée');
        done();
        return;
    }

    var blob = new Blob(chunks, { type: mimeType || 'audio/webm' });
    DR.storeAudioSegment(audioRef, segmentIndex, blob, {
        recordedAt: Date.now(),
        duration: null
    }).then(function(result) {
        if (DR._state.hooks.onSegmentReady) {
            DR._state.hooks.onSegmentReady(result);
        }
    }).catch(function(error) {
        console.error('[stt-dictation-recorder] Erreur stockage segment :', error);
    }).finally(done);
};

DR._startMediaRecorder = function(stream, audioRef) {
    if (DR._state.mediaRecorder) {
        console.warn('[stt-dictation-recorder] Enregistrement déjà en cours');
        return;
    }

    try {
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

        var recordStream = stream;
        if (stream && typeof stream.clone === 'function') {
            try {
                recordStream = stream.clone();
            } catch (cloneErr) {
                console.warn('[stt-dictation-recorder] stream.clone indisponible, flux partagé avec la dictée');
            }
        }
        DR._state.recordStream = recordStream;

        DR._state.mediaRecorder = new MediaRecorder(recordStream, options);

        DR._state.mediaRecorder.ondataavailable = function(event) {
            if (event.data && event.data.size > 0) {
                DR._state.chunks.push(event.data);
            }
        };

        DR._state.mediaRecorder.onstop = function() {
            var recorder = DR._state.mediaRecorder;
            var stopMime = recorder ? recorder.mimeType : (mimeType || 'audio/webm');
            var chunks = DR._state.chunks.slice();
            var segIndex = DR._state.segmentIndex;
            var ref = DR._state.audioRef;

            DR._state.mediaRecorder = null;
            DR._state.chunks = [];
            DR._finalizeRecorderStop(ref, segIndex, chunks, stopMime);
        };

        DR._state.mediaRecorder.start(250);

        if (DR._state.hooks.onRecordingStart) {
            DR._state.hooks.onRecordingStart(audioRef);
        }

    } catch (error) {
        console.error('[stt-dictation-recorder] Erreur démarrage MediaRecorder :', error);
        DR._state.mediaRecorder = null;
        DR._stopRecordStream();
    }
};

DR.startRecording = function(stream, audioRef) {
    DR._state.audioRef = audioRef;
    DR._state.segmentIndex = 0;
    DR._state.chunks = [];
    DR._startMediaRecorder(stream, audioRef);
};

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

        DR._state._stopResolve = finish;
        rec.addEventListener('stop', function onStop() {
            rec.removeEventListener('stop', onStop);
            if (!DR._state._stopResolve) finish();
        }, { once: true });
        try {
            if (rec.state === 'recording' && typeof rec.requestData === 'function') {
                rec.requestData();
            }
            rec.stop();
        } catch (e) {
            DR._state._stopResolve = null;
            finish();
        }
        setTimeout(function() {
            if (DR._state._stopResolve) {
                DR._state._stopResolve = null;
                finish();
            }
        }, 8000);
    });

    return DR._state.pendingStop;
};

DR.patchSetupMicCapture = function() {
    if (!window.PDM || !window.PDM.STT || !window.PDM.STT.Shared || !window.PDM.STT.Shared.setupMicCapture) {
        console.warn('[stt-dictation-recorder] PDM.STT.Shared.setupMicCapture non trouvé');
        return false;
    }

    if (DR._state.originalSetupMicCapture) {
        return true;
    }

    DR._state.originalSetupMicCapture = window.PDM.STT.Shared.setupMicCapture;

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

DR.patchReleaseMediaStream = function() {
    if (!window.PDM || !window.PDM.STT || !window.PDM.STT.Shared) return false;
    var Shared = window.PDM.STT.Shared;
    if (!Shared.releaseMediaStream || DR._state.originalReleaseMediaStream) return true;

    DR._state.originalReleaseMediaStream = Shared.releaseMediaStream;
    Shared.releaseMediaStream = function(st) {
        return DR.stopRecording().then(function() {
            DR._state.originalReleaseMediaStream(st);
        }).catch(function(err) {
            try { console.warn('[stt-dictation-recorder] stopRecording avant release :', err); } catch (e) {}
            DR._state.originalReleaseMediaStream(st);
        });
    };
    return true;
};

DR.patchSttStop = function() {
    if (!window.PDM || !window.PDM.STT || !window.PDM.STT.stop) {
        return false;
    }
    if (DR._state.originalSttStop) {
        return true;
    }

    DR._state.originalSttStop = window.PDM.STT.stop;
    window.PDM.STT.stop = function(opts) {
        return DR.stopRecording().then(function() {
            return DR._state.originalSttStop.call(this, opts);
        }.bind(this));
    };

    return true;
};

DR.unpatchSetupMicCapture = function() {
    if (DR._state.originalSetupMicCapture && window.PDM && window.PDM.STT && window.PDM.STT.Shared) {
        window.PDM.STT.Shared.setupMicCapture = DR._state.originalSetupMicCapture;
        DR._state.originalSetupMicCapture = null;
    }
    if (DR._state.originalReleaseMediaStream && window.PDM && window.PDM.STT && window.PDM.STT.Shared) {
        window.PDM.STT.Shared.releaseMediaStream = DR._state.originalReleaseMediaStream;
        DR._state.originalReleaseMediaStream = null;
    }
};

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

DR.getRecordingState = function() {
    return {
        isRecording: !!(DR._state.mediaRecorder && DR._state.mediaRecorder.state === 'recording'),
        audioRef: DR._state.audioRef,
        segmentIndex: DR._state.segmentIndex,
        chunksCount: DR._state.chunks.length
    };
};

DR.cleanup = function() {
    DR.stopRecording();
    DR._stopRecordStream();
    DR._state.audioRef = null;
    DR._state.segmentIndex = 0;
    DR._state.chunks = [];
};

DR.resetSession = function() {
    DR.cleanup();
};

DR.init = function() {
    function applyPatches() {
        DR.patchSetupMicCapture();
        DR.patchReleaseMediaStream();
        DR.patchSttStop();
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(applyPatches, 100);
        });
    } else {
        setTimeout(applyPatches, 100);
    }

    window.addEventListener('beforeunload', function() {
        DR.cleanup();
    });
};

window.PDM = window.PDM || {};
window.PDM.STTDictationRecorder = DR;

DR.init();

})();