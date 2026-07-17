/**
 * PromptDeMerde.com — workspace-image-encode.js
 *
 * Synopsis : Encode / redimensionne une image pour l’API vision Ollama.
 * Objectif : Produire un base64 JPEG compact sous le plafond proxy (~10 Mo).
 */
(function() {
'use strict';

var MAX_EDGE = 1536;
var JPEG_QUALITY = 0.85;
var MAX_BYTES = 8 * 1024 * 1024;
var ACCEPT_EXT = /\.(png|jpe?g|webp|gif)$/i;
var ACCEPT_MIME = {
    'image/png': 1,
    'image/jpeg': 1,
    'image/jpg': 1,
    'image/webp': 1,
    'image/gif': 1
};

function isAcceptedFile(file) {
    if (!file) return false;
    var mime = String(file.type || '').toLowerCase();
    if (mime && ACCEPT_MIME[mime]) return true;
    return ACCEPT_EXT.test(String(file.name || ''));
}

function loadImageFromFile(file) {
    return new Promise(function(resolve, reject) {
        var url = URL.createObjectURL(file);
        var img = new Image();
        img.onload = function() {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = function() {
            URL.revokeObjectURL(url);
            reject(new Error('image-decode-fail'));
        };
        img.src = url;
    });
}

function canvasToJpegBase64(canvas, quality) {
    return new Promise(function(resolve, reject) {
        try {
            canvas.toBlob(function(blob) {
                if (!blob) {
                    reject(new Error('image-encode-fail'));
                    return;
                }
                if (blob.size > MAX_BYTES) {
                    reject(new Error('image-too-large'));
                    return;
                }
                var reader = new FileReader();
                reader.onload = function() {
                    var dataUrl = String(reader.result || '');
                    var b64 = dataUrl.replace(/^data:[^;]+;base64,/, '');
                    if (!b64) {
                        reject(new Error('image-encode-fail'));
                        return;
                    }
                    resolve(b64);
                };
                reader.onerror = function() { reject(new Error('image-encode-fail')); };
                reader.readAsDataURL(blob);
            }, 'image/jpeg', quality);
        } catch (e) {
            reject(new Error('image-encode-fail'));
        }
    });
}

function encodeFile(file) {
    if (!isAcceptedFile(file)) {
        return Promise.reject(new Error('image-unsupported'));
    }
    return loadImageFromFile(file).then(function(img) {
        var w = img.naturalWidth || img.width || 0;
        var h = img.naturalHeight || img.height || 0;
        if (!w || !h) return Promise.reject(new Error('image-decode-fail'));
        var scale = 1;
        var longEdge = Math.max(w, h);
        if (longEdge > MAX_EDGE) scale = MAX_EDGE / longEdge;
        var cw = Math.max(1, Math.round(w * scale));
        var ch = Math.max(1, Math.round(h * scale));
        var canvas = document.createElement('canvas');
        canvas.width = cw;
        canvas.height = ch;
        var ctx = canvas.getContext('2d');
        if (!ctx) return Promise.reject(new Error('image-encode-fail'));
        ctx.drawImage(img, 0, 0, cw, ch);
        return canvasToJpegBase64(canvas, JPEG_QUALITY);
    });
}

window.PDM = window.PDM || {};
window.PDM.WorkspaceImageEncode = {
    isAcceptedFile: isAcceptedFile,
    encodeFile: encodeFile,
    MAX_BYTES: MAX_BYTES
};

})();
