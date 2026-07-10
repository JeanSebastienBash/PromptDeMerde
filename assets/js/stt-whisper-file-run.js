/**
 * PromptDeMerde.com — stt-whisper-file-run.js
 *
 * Synopsis : Transcription d'un fichier audio via Whisper Maxi (même moteur que la dictée).
 * Objectif : decode → ensureModel(whisper-maxi) → transcribeBuffer par chunk → texte joint.
 */
import { ensureModel, getPool } from './stt-whisper-model.js';
import { transcribeBuffer } from './stt-whisper-decode.js';
import { decodeFile } from './stt-whisper-file-decode.js';
import { chunkPcm } from './stt-whisper-file-chunk.js';

var ENGINE_ID = 'whisper-maxi';
var SR = 16000;

/** Remet l'UI dictée cohérente après un import fichier (sans laisser whisper-maxi en LOADING). */
export function syncSttUiAfterFileImport() {
    var STT = window.PDM && window.PDM.STT;
    if (!STT) return;
    var S = STT.Shared;
    var st = getPool(ENGINE_ID);
    if (st.state === S.STATE_LOADING) st.state = S.STATE_IDLE;
    var els = STT.getEls ? STT.getEls() : null;
    if (els) {
        S.hideLoadProgress(els);
        var id = window.PDM.Storage.getSttEngine();
        var eng = STT._engines && STT._engines[id];
        var uiState = eng && eng.getState ? eng.getState() : S.STATE_IDLE;
        if (uiState === S.STATE_LOADING && id !== ENGINE_ID) uiState = S.STATE_IDLE;
        S.setState(els, uiState);
        var audio = window.PDM.Storage.getWorkspaceAudio && window.PDM.Storage.getWorkspaceAudio();
        if (els.input && (!audio || audio.inputSource !== 'audio-file')) {
            els.input.readOnly = false;
            els.input.classList.remove('stt-streaming');
        }
    }
    if (STT.clearLoadProgress) STT.clearLoadProgress();
    if (STT.updateDictationButton) STT.updateDictationButton();
    if (STT.updatePreloadButton) STT.updatePreloadButton();
    if (STT.renderUi) STT.renderUi();
}

export async function transcribeAudioFile(file, opts) {
    opts = opts || {};
    var els = window.PDM.STT.getEls ? window.PDM.STT.getEls() : null;
    var join = window.PDM.STT.Shared.joinText;
    try {
        if (opts.onProgress) opts.onProgress({ phase: 'decode' });
        var pcm = await decodeFile(file);
        if (opts.onProgress) opts.onProgress({ phase: 'model' });
        await ensureModel(ENGINE_ID, els, { background: true });
        var chunks = chunkPcm(pcm, SR, 30), text = '';
        for (var i = 0; i < chunks.length; i++) {
            if (opts.onProgress) opts.onProgress({ phase: 'transcribe', index: i, total: chunks.length });
            text = join(text, await transcribeBuffer(ENGINE_ID, chunks[i], true, { force: true, els: els }));
        }
        return text;
    } finally {
        syncSttUiAfterFileImport();
    }
}
