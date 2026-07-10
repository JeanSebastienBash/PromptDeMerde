/**
 * PromptDeMerde.com — workspace-persistence.js
 *
 * Synopsis : Persistance brouillon workspace et guards prompt.
 * Objectif : Lire/écrire le brouillon workspace et bloquer la saisie si aucun prompt actif.
 */
(function(){
"use strict";

var A = window.PDM && window.PDM.App;
if (!A) { console.warn('[workspace-persistence] PDM.App not found.'); return; }

function wuText(key) {
    return window.PDM && window.PDM.WorkspaceUi ? window.PDM.WorkspaceUi.text(key) : '';
}
A.isInferenceActive = function() {
    return window.PDM._activeAbort !== null && window.PDM._activeAbort !== undefined;
};

A.canSendToLlm = function() {
    return window.PDM.Storage.canSendToLlm();
};

A.updateWorkspacePromptGuard = function() {
    var ok = A.canSendToLlm();
    var guard = document.getElementById('ws-prompt-guard');
    var btn = document.getElementById('sniperise-btn');
    var panel = document.querySelector('.ws-panel.ws-input');
    var inferActive = A.isInferenceActive();

    if (guard) guard.style.display = ok ? 'none' : 'block';
    if (panel) panel.classList.toggle('ws-blocked', !ok);

    var sttBtn = document.getElementById('stt-btn');
    if (window.PDM.STT && typeof window.PDM.STT.updateDictationButton === 'function') {
        window.PDM.STT.updateDictationButton();
    } else if (sttBtn) {
        sttBtn.disabled = !!inferActive;
        sttBtn.title = inferActive ? wuText('inferenceRunningDictation') : '';
    }

    if (btn && !inferActive) {
        btn.disabled = !ok;
        btn.title = ok ? '' : wuText('guardNoContextTitle');
    }

    var resetBtn = document.getElementById('ws-reset-btn');
    if (resetBtn) {
        resetBtn.disabled = !!inferActive;
        resetBtn.title = inferActive
            ? wuText('inferenceRunningReset')
            : wuText('resetTitle');
    }

    var outModelSel = document.getElementById('ws-output-model-select');
    if (outModelSel) {
        outModelSel.title = inferActive
            ? 'Changer de mod\u00e8le relancera le nettoyage'
            : 'Changer de mod\u00e8le LLM';
    }
};

A.saveWorkspaceFromDom = function() {
    var inp = document.getElementById('ws-input');
    var outputTa = document.getElementById('output-text');
    var thinkingTa = document.getElementById('thinking-text');
    var contextPanel = document.getElementById('context-panel');
    var panelOpen = contextPanel ? contextPanel.open : true;
    var inputVal = inp ? inp.value : '';
    if (!inputVal.trim()) {
        return window.PDM.Storage.setWorkspace({
            input: inputVal,
            output: '',
            thinking: '',
            contextPanelOpen: panelOpen
        });
    }
    return window.PDM.Storage.setWorkspace({
        input: inputVal,
        output: outputTa ? outputTa.value : '',
        thinking: thinkingTa ? thinkingTa.value : '',
        contextPanelOpen: panelOpen
    });
};

/** Masque OUTPUT et efface thinking / backup (sans toucher INPUT). */
A.clearWorkspaceOutput = function(opts) {
    opts = opts || {};
    var outputTa = document.getElementById('output-text');
    if (outputTa) {
        outputTa.value = '';
        if (window.PDM && window.PDM.WorkspaceUi && typeof window.PDM.WorkspaceUi.applyPlaceholders === 'function') {
            window.PDM.WorkspaceUi.applyPlaceholders();
        } else {
            outputTa.placeholder = '';
        }
    }
    window.PDM.UI.hideOutput();
    if (typeof A.syncThinkingPanel === 'function') {
        A.syncThinkingPanel('', { reset: true });
    }
    var meta = document.getElementById('output-meta');
    if (meta) meta.innerHTML = '';
    window.PDM._wsBackup = null;
    if (!opts.skipSave) {
        var inp = document.getElementById('ws-input');
        var extra = {};
        if (window.PDM.Storage.getWorkspaceAudio) {
            var a = window.PDM.Storage.getWorkspaceAudio();
            extra.inputSource = a.inputSource;
            extra.audioFileName = a.audioFileName;
            extra.audioFileSize = a.audioFileSize;
            extra.audioMimeType = a.audioMimeType;
            extra.audioLastModified = a.audioLastModified;
            extra.audioRef = a.audioRef;
        }
        window.PDM.Storage.setWorkspace(Object.assign({
            input: inp ? inp.value : '',
            output: '',
            thinking: '',
            contextPanelOpen: document.getElementById('context-panel')
                ? document.getElementById('context-panel').open
                : true
        }, extra));
    }
};

/**
 * OUTPUT en phase avec INPUT : vide si INPUT vide ; invalidé si INPUT modifié.
 * Ignoré pendant inférence ou dictée active.
 */
A.syncWorkspaceOutputWithInput = function() {
    if (A.isInferenceActive()) return;
    if (window.PDM.STT && window.PDM.STT.isActive && window.PDM.STT.isActive()) return;

    var inp = document.getElementById('ws-input');
    if (!inp || !inp.value.trim()) {
        A.clearWorkspaceOutput();
        return;
    }

    var outputBox = document.getElementById('output-box');
    var outputTa = document.getElementById('output-text');
    if (outputBox && outputBox.classList.contains('show') && outputTa && outputTa.value.trim()) {
        A.clearWorkspaceOutput();
    }
};

A.scheduleWorkspaceSave = function() {
    if (A._wsSaveTimer) clearTimeout(A._wsSaveTimer);
    A._wsSaveTimer = setTimeout(function() {
        A._wsSaveTimer = null;
        A.saveWorkspaceFromDom();
    }, 300);
};

A.restoreWorkspaceFromStorage = function() {
    var ws = window.PDM.Storage.getWorkspace();
    var contextPanel = document.getElementById('context-panel');
    if (contextPanel) contextPanel.open = ws.contextPanelOpen !== false;
    var inp = document.getElementById('ws-input');
    if (inp) {
        inp.value = ws.input || '';
        var c = document.getElementById('char-count');
        if (c) c.textContent = inp.value.length + ' / 50000';
    }
    if (!inp || !inp.value.trim()) {
        A.clearWorkspaceOutput({ skipSave: true });
        return;
    }
    if (ws.output || ws.thinking) {
        var outputTa = document.getElementById('output-text');
        var outputBox = document.getElementById('output-box');
        if (outputTa) outputTa.value = ws.output || '';
        if (outputBox) outputBox.classList.add('show');
        A.syncThinkingPanel(ws.thinking || '', { streaming: false });
        window.PDM._wsBackup = {
            text: ws.output || '',
            thinking: ws.thinking || '',
            final: true
        };
    } else {
        window.PDM.UI.hideOutput();
    }

    if (window.PDM.WorkspaceUi && typeof window.PDM.WorkspaceUi.applyPlaceholders === 'function') {
        window.PDM.WorkspaceUi.applyPlaceholders();
    }
};

})();
