/**
 * PromptDeMerde.com — stt-whisper-file.js
 *
 * Synopsis : Point d'entrée import audio — branche la façade publique.
 * Objectif : Exposer window.PDM.STT.transcribeAudioFile (Whisper Maxi, 100 % local).
 */
import { transcribeAudioFile, syncSttUiAfterFileImport } from './stt-whisper-file-run.js';

window.PDM = window.PDM || {};
window.PDM.STT = window.PDM.STT || {};
window.PDM.STT.transcribeAudioFile = transcribeAudioFile;
window.PDM.STT.syncSttAfterFileImport = syncSttUiAfterFileImport;
