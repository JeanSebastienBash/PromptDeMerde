/**
 * PromptDeMerde.com — workspace-dictation-audio-export.js
 *
 * Synopsis : Encodage et téléchargement de l'audio de dictée (WebM/WAV/ZIP).
 * Objectif : Étendre PDM.WorkspaceDictationAudio avec la fusion WAV, le ZIP multi-segments,
 *            le téléchargement et la suppression de l'audio courant.
 */
(function() {
'use strict';

var WDA = window.PDM && window.PDM.WorkspaceDictationAudio;
if (!WDA) { console.warn('[workspace-dictation-audio-export] PDM.WorkspaceDictationAudio not found.'); return; }

/**
 * Télécharge un blob en tant que fichier
 */
WDA.downloadBlob = function(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

/**
 * Décode un blob WebM en AudioBuffer
 */
WDA.decodeSegmentBlob = function(ctx, blob) {
    return blob.arrayBuffer().then(function(ab) {
        return ctx.decodeAudioData(ab.slice(0));
    });
};

/**
 * Fusionne plusieurs segments WebM en un seul WAV (dictées successives).
 */
WDA.mergeSegmentsToWav = function(segments) {
    var AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
        return Promise.reject(new Error('Web Audio API indisponible pour la fusion'));
    }

    var ctx = new AudioCtx();
    var sorted = segments.slice().sort(function(a, b) { return a.index - b.index; });
    var chain = Promise.resolve([]);

    sorted.forEach(function(seg) {
        if (!seg || !seg.blob) return;
        chain = chain.then(function(buffers) {
            return WDA.decodeSegmentBlob(ctx, seg.blob).then(function(buf) {
                buffers.push(buf);
                return buffers;
            });
        });
    });

    return chain.then(function(buffers) {
        if (!buffers.length) {
            throw new Error('Aucun segment audio décodable');
        }

        var channels = buffers[0].numberOfChannels;
        var sampleRate = buffers[0].sampleRate;
        var totalLength = 0;
        for (var i = 0; i < buffers.length; i++) {
            totalLength += buffers[i].length;
        }

        var merged = ctx.createBuffer(channels, totalLength, sampleRate);
        var offset = 0;
        for (var j = 0; j < buffers.length; j++) {
            var buf = buffers[j];
            for (var ch = 0; ch < channels; ch++) {
                var srcCh = Math.min(ch, buf.numberOfChannels - 1);
                merged.getChannelData(ch).set(buf.getChannelData(srcCh), offset);
            }
            offset += buf.length;
        }

        var wavBlob = WDA.audioBufferToWavBlob(merged);
        if (ctx.close) ctx.close();
        return wavBlob;
    }).catch(function(err) {
        if (ctx.close) ctx.close();
        throw err;
    });
};

/**
 * Exporte un AudioBuffer en blob WAV 16-bit PCM
 */
WDA.audioBufferToWavBlob = function(buffer) {
    var numChannels = buffer.numberOfChannels;
    var sampleRate = buffer.sampleRate;
    var numFrames = buffer.length;
    var bytesPerSample = 2;
    var blockAlign = numChannels * bytesPerSample;
    var dataSize = numFrames * blockAlign;
    var arrayBuffer = new ArrayBuffer(44 + dataSize);
    var view = new DataView(arrayBuffer);

    function writeStr(offset, str) {
        for (var i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
        }
    }

    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, dataSize, true);

    var interleaved = new Float32Array(numFrames * numChannels);
    for (var ch = 0; ch < numChannels; ch++) {
        var channel = buffer.getChannelData(ch);
        for (var i = 0; i < numFrames; i++) {
            interleaved[i * numChannels + ch] = channel[i];
        }
    }

    var offset = 44;
    for (var s = 0; s < interleaved.length; s++) {
        var sample = Math.max(-1, Math.min(1, interleaved[s]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
};

/**
 * Crée un fichier ZIP contenant plusieurs segments audio et la transcription
 */
WDA.createMultiSegmentZip = function(segments, transcription, audioRef) {
    return new Promise(function(resolve, reject) {
        // Vérification de la disponibilité de JSZip
        if (typeof JSZip === 'undefined') {
            console.warn('[workspace-dictation-audio] JSZip non disponible, téléchargement du premier segment seulement');
            if (segments.length > 0 && segments[0].blob) {
                resolve({
                    blob: segments[0].blob,
                    filename: audioRef + '_segment_0.webm',
                    isZip: false
                });
            } else {
                reject(new Error('Aucun segment disponible'));
            }
            return;
        }
        
        try {
            var zip = new JSZip();
            
            // Ajoute chaque segment audio
            for (var i = 0; i < segments.length; i++) {
                var segment = segments[i];
                var filename = 'segment_' + segment.index.toString().padStart(2, '0') + '.webm';
                zip.file(filename, segment.blob);
            }
            
            // Ajoute la transcription si disponible
            if (transcription && transcription.trim()) {
                zip.file('transcript.txt', transcription);
            }
            
            // Ajoute un fichier d'information
            var info = 'Enregistrement dictée WebM\n';
            info += 'AudioRef: ' + audioRef + '\n';
            info += 'Segments: ' + segments.length + '\n';
            info += 'Généré: ' + new Date().toISOString() + '\n';
            info += '\nSegments:\n';
            for (var j = 0; j < segments.length; j++) {
                var seg = segments[j];
                info += '- segment_' + seg.index.toString().padStart(2, '0') + '.webm: ' + 
                       (seg.size / 1024).toFixed(1) + ' KB\n';
            }
            zip.file('info.txt', info);
            
            zip.generateAsync({ type: 'blob' }).then(function(zipBlob) {
                resolve({
                    blob: zipBlob,
                    filename: audioRef + '_dictation.zip',
                    isZip: true
                });
            });
            
        } catch (error) {
            reject(error);
        }
    });
};

/**
 * Télécharge l'audio de dictée actuel
 */
WDA.downloadCurrentAudio = function() {
    if (!WDA._state.currentAudioRef || WDA._state.isDownloading) {
        console.warn('[workspace-dictation-audio] Aucun audio à télécharger ou téléchargement en cours');
        return Promise.resolve();
    }
    
    if (!window.PDM || !window.PDM.STTDictationRecorder) {
        console.error('[workspace-dictation-audio] PDM.STTDictationRecorder non disponible');
        return Promise.reject(new Error('Module d\'enregistrement non disponible'));
    }
    
    WDA._state.isDownloading = true;
    WDA.updateDownloadButtonState();
    
    return window.PDM.STTDictationRecorder.getAudioSegments(WDA._state.currentAudioRef).then(function(data) {
        if (!data || !data.segments || data.segments.length === 0) {
            throw new Error('Aucun segment audio trouvé pour ' + WDA._state.currentAudioRef);
        }
        
        var transcription = '';
        if (window.PDM && window.PDM.Storage && window.PDM.Storage.getWorkspace) {
            var workspace = window.PDM.Storage.getWorkspace();
            if (workspace && workspace.input) {
                transcription = workspace.input;
            }
        }
        
        if (data.segments.length === 1) {
            var segment = data.segments[0];
            var filename = WDA._state.currentAudioRef + '.webm';
            WDA.downloadBlob(segment.blob, filename);
            return { downloaded: 1, filename: filename };
        }

        // Plusieurs dictées : fusion en un seul WAV (toutes les passes à la suite)
        return WDA.mergeSegmentsToWav(data.segments).then(function(wavBlob) {
            var mergedName = WDA._state.currentAudioRef + '_dictation.wav';
            WDA.downloadBlob(wavBlob, mergedName);
            if (window.PDM && window.PDM.UI && window.PDM.UI.notif) {
                window.PDM.UI.notif(
                    data.segments.length + ' dictées fusionnées dans ' + mergedName + '.',
                    'ok'
                );
            }
            return { downloaded: data.segments.length, filename: mergedName, merged: true };
        });
    }).catch(function(error) {
        console.error('[workspace-dictation-audio] Erreur téléchargement :', error);
        if (window.PDM && window.PDM.UI && window.PDM.UI.notif) {
            window.PDM.UI.notif('Erreur téléchargement audio : ' + (error.message || error), 'err');
        }
        throw error;
    }).finally(function() {
        WDA._state.isDownloading = false;
        WDA.updateDownloadButtonState();
    });
};

/**
 * Supprime l'audio de dictée actuel
 */
WDA.clearCurrentAudio = function() {
    if (!WDA._state.currentAudioRef) {
        return Promise.resolve();
    }
    
    if (!window.PDM || !window.PDM.STTDictationRecorder) {
        console.error('[workspace-dictation-audio] PDM.STTDictationRecorder non disponible');
        return Promise.reject(new Error('Module d\'enregistrement non disponible'));
    }
    
    var audioRef = WDA._state.currentAudioRef;
    
    return window.PDM.STTDictationRecorder.deleteAudioSegments(audioRef).then(function() {
        if (window.PDM.STTDictationRecorder.resetSession) {
            window.PDM.STTDictationRecorder.resetSession();
        }
        WDA.clearWorkspaceAudioMeta();
        WDA.updateDownloadButtonState();
        
        if (window.PDM && window.PDM.UI && window.PDM.UI.notif) {
            window.PDM.UI.notif('Enregistrement audio supprimé.', 'info');
        }
    }).catch(function(error) {
        console.error('[workspace-dictation-audio] Erreur suppression :', error);
        if (window.PDM && window.PDM.UI && window.PDM.UI.notif) {
            window.PDM.UI.notif('Erreur suppression audio : ' + (error.message || error), 'err');
        }
        throw error;
    });
};

})();
