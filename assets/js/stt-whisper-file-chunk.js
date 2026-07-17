/**
 * PromptDeMerde.com — stt-whisper-file-chunk.js
 *
 * Synopsis : Découpage d'un PCM long en segments transcrits séquentiellement.
 * Objectif : Fournir chunkPcm (fenêtres ~30 s) pour l'import audio Whisper Maxi.
 */
export function chunkPcm(pcm, sampleRate, windowSec) {
    var size = Math.round(sampleRate * (windowSec || 30));
    if (!pcm || pcm.length <= size) return [pcm];
    var chunks = [];
    for (var off = 0; off < pcm.length; off += size) {
        chunks.push(pcm.subarray(off, Math.min(off + size, pcm.length)));
    }
    return chunks;
}
