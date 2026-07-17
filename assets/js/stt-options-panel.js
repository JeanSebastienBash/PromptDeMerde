/**
 * PromptDeMerde.com — stt-options-panel.js
 *
 * Synopsis : Panneau Options dictée extensible (strip Input).
 * Objectif : Miroir du panneau Options LLM — moteur, accélération, micro, insertion.
 */
(function() {
'use strict';

var STT = window.PDM && window.PDM.STT;
if (!STT) { console.warn('[stt-options-panel] PDM.STT not found.'); return; }

function T(key, vars) {
    return STT.Shared ? STT.Shared.sttT(key, vars) : '';
}

STT._sttOptionsPanelOpen = false;

STT.toggleSttOptionsPanel = function() {
    STT._sttOptionsPanelOpen = !STT._sttOptionsPanelOpen;
    STT.syncSttOptionsPanelOpen();
};

STT.syncSttOptionsPanelOpen = function() {
    var btn = document.getElementById('stt-options-btn');
    var panel = document.getElementById('stt-options-panel');
    if (btn) {
        btn.classList.toggle('is-open', STT._sttOptionsPanelOpen);
        btn.setAttribute('aria-expanded', STT._sttOptionsPanelOpen ? 'true' : 'false');
        btn.title = STT._sttOptionsPanelOpen
            ? T('optionsOpenTitle')
            : T('optionsTitle');
    }
    if (panel) panel.hidden = !STT._sttOptionsPanelOpen;
};

STT.bindSttOptionsPanel = function() {
    if (STT._sttOptionsPanelBound) return;
    STT._sttOptionsPanelBound = true;
    var btn = document.getElementById('stt-options-btn');
    if (btn) {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            STT.toggleSttOptionsPanel();
        });
    }
};

})();
