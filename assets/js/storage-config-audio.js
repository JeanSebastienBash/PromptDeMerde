/**
 * PromptDeMerde.com — storage-config-audio.js
 *
 * Synopsis : Export/import asynchrone des blobs audio (dictée) dans pdm-config.
 * Objectif : Sérialiser/désérialiser les segments audio (base64) via PDM.STTDictationRecorder.
 */
(function(){

var S = window.PDM && window.PDM.Storage;
if (!S) { console.warn('[storage-config-audio] PDM.Storage not found.'); return; }

S._blobToBase64 = function(blob) {
    return new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.onload = function() {
            var dataUrl = reader.result;
            var base64 = dataUrl.split(',')[1];
            resolve(base64);
        };
        reader.onerror = function(error) {
            reject(error);
        };
        reader.readAsDataURL(blob);
    });
};

S._base64ToBlob = function(base64, mimeType) {
    mimeType = mimeType || 'audio/webm';
    var byteCharacters = atob(base64);
    var byteNumbers = new Array(byteCharacters.length);
    for (var i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    var byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
};

S._getRelevantAudioRefs = function() {
    var refs = new Set();

    var workspace = S.getWorkspace();
    if (workspace && workspace.inputSource === 'audio-dictation' && workspace.audioRef) {
        refs.add(workspace.audioRef);
    }

    var history = S.getCleanHistory();
    if (Array.isArray(history)) {
        for (var i = 0; i < history.length; i++) {
            var entry = history[i];
            if (entry && entry.inputSource === 'audio-dictation' && entry.audioRef) {
                refs.add(entry.audioRef);
            }
        }
    }

    return Array.from(refs);
};

S.exportConfigAsync = function(options) {
    options = options || {};
    var includeAudio = options.includeAudio !== false;
    var maxBlobSize = options.maxBlobSize || (50 * 1024 * 1024);

    var config = S.exportConfig();

    if (!includeAudio || !window.PDM || !window.PDM.STTDictationRecorder) {
        return Promise.resolve({
            config: config,
            warnings: includeAudio ? ['Module audio non disponible - export sans blobs'] : []
        });
    }

    var audioRefs = S._getRelevantAudioRefs();
    if (audioRefs.length === 0) {
        return Promise.resolve({
            config: config,
            warnings: []
        });
    }

    var warnings = [];
    var promises = audioRefs.map(function(audioRef) {
        return window.PDM.STTDictationRecorder.getAudioSegments(audioRef)
            .then(function(data) {
                if (!data || !data.segments || data.segments.length === 0) {
                    warnings.push('Aucun segment audio trouvé pour ' + audioRef);
                    return null;
                }

                var totalSize = data.totalSize || 0;
                if (totalSize > maxBlobSize) {
                    warnings.push('Audio ' + audioRef + ' trop volumineux (' +
                                (totalSize/1024/1024).toFixed(1) + 'MB > ' +
                                (maxBlobSize/1024/1024).toFixed(1) + 'MB) - ignoré');
                    return null;
                }

                var segmentPromises = data.segments.map(function(segment, index) {
                    return S._blobToBase64(segment.blob)
                        .then(function(base64) {
                            return {
                                index: segment.index,
                                base64: base64,
                                size: segment.size,
                                mimeType: segment.mimeType || 'audio/webm',
                                createdAt: segment.createdAt
                            };
                        })
                        .catch(function(error) {
                            warnings.push('Erreur conversion segment ' + index + ' de ' + audioRef + ': ' + error.message);
                            return null;
                        });
                });

                return Promise.all(segmentPromises)
                    .then(function(segments) {
                        var validSegments = segments.filter(function(s) { return s !== null; });
                        if (validSegments.length === 0) {
                            warnings.push('Aucun segment valide pour ' + audioRef);
                            return null;
                        }

                        return {
                            audioRef: audioRef,
                            segments: validSegments,
                            totalSegments: data.segments.length,
                            createdAt: data.createdAt,
                            updatedAt: data.updatedAt
                        };
                    });
            })
            .catch(function(error) {
                warnings.push('Erreur lecture audio ' + audioRef + ': ' + error.message);
                return null;
            });
    });

    return Promise.all(promises)
        .then(function(results) {
            var audioBlobs = {};
            var validResults = results.filter(function(r) { return r !== null; });

            for (var i = 0; i < validResults.length; i++) {
                var result = validResults[i];
                audioBlobs[result.audioRef] = {
                    segments: result.segments,
                    totalSegments: result.totalSegments,
                    createdAt: result.createdAt,
                    updatedAt: result.updatedAt
                };
            }

            config.pdm_audio_blobs = audioBlobs;

            return {
                config: config,
                warnings: warnings,
                audioCount: validResults.length,
                totalAudioRefs: audioRefs.length
            };
        });
};

S._importAudioBlobs = function(audioBlobs) {
    if (!audioBlobs || typeof audioBlobs !== 'object' || !window.PDM || !window.PDM.STTDictationRecorder) {
        return Promise.resolve([]);
    }

    var CS = window.PDM && window.PDM.ConfigSchema;
    if (CS && typeof CS.validateAudioBlobsSecurity === 'function') {
        var blobErrors = [];
        CS.validateAudioBlobsSecurity(audioBlobs, blobErrors);
        if (blobErrors.length) {
            return Promise.resolve(blobErrors);
        }
    }

    var warnings = [];
    var promises = [];

    for (var audioRef in audioBlobs) {
        if (!audioBlobs.hasOwnProperty(audioRef)) continue;

        var blobData = audioBlobs[audioRef];
        if (!blobData || !Array.isArray(blobData.segments)) {
            warnings.push('Données audio invalides pour ' + audioRef);
            continue;
        }

        var segmentPromises = blobData.segments.map(function(segmentData) {
            if (!segmentData || !segmentData.base64) {
                warnings.push('Segment invalide dans ' + audioRef);
                return Promise.resolve(null);
            }

            try {
                var blob = S._base64ToBlob(segmentData.base64, segmentData.mimeType);
                return window.PDM.STTDictationRecorder.storeAudioSegment(
                    audioRef,
                    segmentData.index,
                    blob,
                    {
                        importedAt: Date.now(),
                        originalCreatedAt: segmentData.createdAt,
                        originalSize: segmentData.size
                    }
                ).catch(function(error) {
                    warnings.push('Erreur stockage segment ' + segmentData.index + ' de ' + audioRef + ': ' + error.message);
                    return null;
                });
            } catch (error) {
                warnings.push('Erreur conversion base64 segment ' + segmentData.index + ' de ' + audioRef + ': ' + error.message);
                return Promise.resolve(null);
            }
        });

        promises.push(Promise.all(segmentPromises));
    }

    return Promise.all(promises)
        .then(function() {
            return warnings;
        });
};

S.importConfigAsync = function(data, options) {
    options = options || {};
    var includeAudio = options.includeAudio !== false;

    var result = S.importConfig(data, options);
    if (!result.ok) {
        return Promise.resolve(result);
    }

    if (!includeAudio || !data.pdm_audio_blobs || !window.PDM || !window.PDM.STTDictationRecorder) {
        return Promise.resolve({
            ok: true,
            format: result.format,
            audioImported: false,
            audioWarnings: includeAudio && data.pdm_audio_blobs ?
                ['Module audio non disponible - blobs ignorés'] : []
        });
    }

    return S._importAudioBlobs(data.pdm_audio_blobs)
        .then(function(audioWarnings) {
            return {
                ok: true,
                format: result.format,
                audioImported: true,
                audioWarnings: audioWarnings
            };
        })
        .catch(function(error) {
            console.error('[storage-config-io] Erreur import audio :', error);
            return {
                ok: true,
                format: result.format,
                audioImported: false,
                audioWarnings: ['Erreur import audio : ' + error.message]
            };
        });
};

})();
