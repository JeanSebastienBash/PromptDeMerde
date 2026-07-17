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

function wuText(key, vars) {
    return window.PDM && window.PDM.WorkspaceUi ? window.PDM.WorkspaceUi.text(key, vars) : '';
}
function wsI18n(key, vars) {
    var I = window.PDM && window.PDM.I18n;
    return I ? I.t('workspace.' + key, vars) : '';
}
function wsCharCount(n) {
    return wsI18n('charCount', { count: n });
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

    var resetBtns = document.querySelectorAll('.ws-reset-btn');
    for (var ri = 0; ri < resetBtns.length; ri++) {
        resetBtns[ri].disabled = !!inferActive;
        resetBtns[ri].title = inferActive
            ? wuText('inferenceRunningReset')
            : wuText('resetTitle');
    }

    var outModelSel = document.getElementById('ws-output-model-select');
    if (outModelSel) {
        outModelSel.title = inferActive
            ? wuText('modelChangeRestartTitle')
            : wsI18n('modelTitle');
    }

    if (window.PDM.WorkspaceInputTools) window.PDM.WorkspaceInputTools.sync();
};

A.saveWorkspaceFromDom = function() {
    var inp = document.getElementById('ws-input');
    var outputTa = document.getElementById('output-text');
    var thinkingTa = document.getElementById('thinking-text');
    var contextPanel = document.getElementById('context-panel');
    var panelOpen = contextPanel ? contextPanel.open : false;
    var inputVal = inp ? inp.value : '';
    var bak = window.PDM._wsBackup || {};
    var plainOut = bak.plain != null
        ? String(bak.plain)
        : (typeof A.extractPlainOutput === 'function'
            ? A.extractPlainOutput(outputTa ? outputTa.value : '')
            : (outputTa ? outputTa.value : ''));
    var plainThink = bak.plainThinking != null
        ? String(bak.plainThinking)
        : (thinkingTa ? thinkingTa.value : '');
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
        output: plainOut,
        thinking: plainThink,
        contextPanelOpen: panelOpen
    });
};

A.clearWorkspaceOutput = function(opts) {
    opts = opts || {};
    if (typeof A.syncThinkingPanel === 'function') {
        A.syncThinkingPanel('', { reset: true });
    }
    window.PDM.UI.hideOutput();
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
                : false
        }, extra));
    }
};

A.syncWorkspaceOutputWithInput = function() {
    if (A.isInferenceActive()) return;
    if (window.PDM.STT && window.PDM.STT.isActive && window.PDM.STT.isActive()) return;

    var inp = document.getElementById('ws-input');
    if (!inp || !inp.value.trim()) {
        A.clearWorkspaceOutput();
        return;
    }

    var outputTa = document.getElementById('output-text');
    if (outputTa && outputTa.value.trim()) {
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
    if (contextPanel) contextPanel.open = ws.contextPanelOpen === true;
    var inp = document.getElementById('ws-input');
    if (inp) {
        inp.value = ws.input || '';
        var c = document.getElementById('char-count');
        if (c) c.textContent = wsCharCount(inp.value.length);
    }
    if (!inp || !inp.value.trim()) {
        A.clearWorkspaceOutput({ skipSave: true });
        return;
    }
    if (ws.output || ws.thinking) {
        var plainOut = typeof A.extractPlainOutput === 'function'
            ? A.extractPlainOutput(ws.output || '')
            : (ws.output || '');
        var plainThink = ws.thinking || '';
        window.PDM._wsBackup = {
            text: plainOut,
            plain: plainOut,
            thinking: plainThink,
            plainThinking: plainThink,
            final: true
        };
        if (typeof A.applyWorkspaceOutputFormat === 'function') {
            A.applyWorkspaceOutputFormat();
        } else {
            var outputTa = document.getElementById('output-text');
            if (outputTa) outputTa.value = plainOut;
            A.syncThinkingPanel(plainThink, { streaming: false });
        }
        if (typeof A.syncThinkingPanel === 'function' && typeof A.wrapOutputForDisplay === 'function') {
            A.syncThinkingPanel(
                A.wrapOutputForDisplay(plainThink, null, 'thinking'),
                { streaming: false }
            );
        }
    } else if (window.PDM.WorkspaceUi && typeof window.PDM.WorkspaceUi.applyOutputPendingPlaceholder === 'function') {
        window.PDM.WorkspaceUi.applyOutputPendingPlaceholder();
    }

    if (window.PDM.UI && window.PDM.UI.syncOutputEmptyState) {
        window.PDM.UI.syncOutputEmptyState();
    }
    if (window.PDM.WorkspaceUi && typeof window.PDM.WorkspaceUi.applyPlaceholders === 'function') {
        window.PDM.WorkspaceUi.applyPlaceholders();
    }
};

})();
