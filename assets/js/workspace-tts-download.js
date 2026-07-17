/**
 * PromptDeMerde.com — workspace-tts-download.js
 *
 * Synopsis : Moteur d'export Text-to-Speech Workspace (V2 / AV2).
 * Objectif : Placeholder UI — synthèse vocale via GenericVoice (voix + moteur),
 *            non implémenté en v1 ; canon Bible RFC.md §18.3.
 */
(function() {
'use strict';

var WTD = {};

WTD.V2_ENABLED = false;

WTD.isAvailable = function() {
    return false;
};

WTD.downloadSpeech = function() {
    var WIT = window.PDM && window.PDM.WorkspaceInputTools;
    if (WIT && WIT.notifyError) {
        WIT.notifyError('ttsV2UnavailableMsg', WIT.CODES.TTS_V2_UNAVAILABLE);
    }
    return Promise.resolve();
};

WTD.bindEvents = function() {
    var btn = document.getElementById('ws-tts-download-btn');
    if (!btn || btn._pdmTtsBound) return;
    btn._pdmTtsBound = true;
    btn.addEventListener('click', function(e) {
        e.preventDefault();
        if (btn.disabled || !WTD.V2_ENABLED) {
            WTD.downloadSpeech();
            return;
        }
        WTD.downloadSpeech();
    });
};

WTD.init = function() {
    WTD.bindEvents();
    if (window.PDM && window.PDM.WorkspaceInputTools) {
        window.PDM.WorkspaceInputTools.sync();
    }
};

window.PDM = window.PDM || {};
window.PDM.WorkspaceTtsDownload = WTD;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', WTD.init);
} else {
    WTD.init();
}

})();
