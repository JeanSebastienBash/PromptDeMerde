/**
 * PromptDeMerde.com — stt-whisper-file-decode.js
 *
 * Synopsis : Décodage d'un fichier audio en PCM mono 16 kHz (100 % navigateur).
 * Objectif : Fournir decodeFile pour l'import audio Workspace, sans toucher au flux micro.
 */
var SR = 16000;

function toMono(audio) {
    var n = audio.length, ch = audio.numberOfChannels;
    if (ch === 1) return audio.getChannelData(0);
    var out = new Float32Array(n);
    for (var c = 0; c < ch; c++) {
        var d = audio.getChannelData(c);
        for (var i = 0; i < n; i++) out[i] += d[i] / ch;
    }
    return out;
}

function resampleTo16k(input, fromRate) {
    if (fromRate === SR) return input;
    var ratio = fromRate / SR, outLen = Math.round(input.length / ratio);
    var out = new Float32Array(outLen);
    for (var i = 0; i < outLen; i++) {
        var src = i * ratio, idx = Math.floor(src), frac = src - idx;
        var a = input[idx] || 0, b = input[idx + 1] || a;
        out[i] = a + (b - a) * frac;
    }
    return out;
}

export async function decodeFile(file) {
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) throw new Error('AudioContext indisponible');
    var ctx = new Ctx();
    try {
        var audio = await ctx.decodeAudioData(await file.arrayBuffer());
        return resampleTo16k(toMono(audio), audio.sampleRate);
    } finally {
        try { ctx.close(); } catch (e) { /* ignore */ }
    }
}
