/**
 * PromptDeMerde.com — stt-shared-core.js
 *
 * Synopsis : Constantes STT et registre moteurs.
 * Objectif : Créer PDM.STT.Shared et registerEngine.
 */
(function() {
var Shared = {};

Shared.MAX_CHARS = 50000;
Shared.BTN_START = '\uD83C\uDFA4 Dicter';
Shared.BTN_STOP = '\u23F9 Arr\u00eater';
Shared.BTN_CANCEL_LOAD = '\u23F9 ANNULER LE CHARGEMENT';

Shared.STATE_UNSUPPORTED = 'unsupported';
Shared.STATE_IDLE = 'idle';
Shared.STATE_LOADING = 'loading';
Shared.STATE_PERMISSION = 'permission';
Shared.STATE_LISTENING = 'listening';
Shared.STATE_ERROR = 'error';

window.PDM = window.PDM || {};
window.PDM.STT = window.PDM.STT || {};
window.PDM.STT.Shared = Shared;

window.PDM.STT._engines = window.PDM.STT._engines || {};
window.PDM.STT.registerEngine = window.PDM.STT.registerEngine || function(engine) {
    if (!engine || !engine.id) return;
    window.PDM.STT._engines[engine.id] = engine;
};
})();
