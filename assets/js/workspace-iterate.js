/**
 * PromptDeMerde.com — workspace-iterate.js
 *
 * Synopsis : Bouton Output ↪ — empile Input/Output en transcript #USER:/#SYSTEM:.
 * Objectif : Réécrire #ws-input pour la continuité de discussion, sans appel LLM.
 */
(function(){
'use strict';

var A = window.PDM && window.PDM.App;
if (!A) { console.warn('[workspace-iterate] PDM.App not found.'); return; }

function wuText(key, vars) {
    return window.PDM && window.PDM.WorkspaceUi ? window.PDM.WorkspaceUi.text(key, vars) : '';
}

function flattenBlock(text) {
    return String(text || '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
        .map(function(line) { return line.replace(/[ \t]+$/g, ''); })
        .filter(function(line) { return line.trim() !== ''; })
        .join('\n');
}

function hasTranscriptMarks(text) {
    return /(?:^|\n)#(?:USER|SYSTEM):/m.test(String(text || ''));
}

function buildIterateInput(input, outputPlain) {
    var flatOut = flattenBlock(outputPlain);
    if (hasTranscriptMarks(input)) {
        var base = String(input || '').replace(/\s+$/g, '');
        return base + '\n\n#SYSTEM:\n' + flatOut + '\n\n#USER:\n';
    }
    var flatIn = flattenBlock(input);
    var parts = ['#USER:'];
    if (flatIn) parts.push(flatIn);
    parts.push('');
    parts.push('#SYSTEM:');
    if (flatOut) parts.push(flatOut);
    parts.push('');
    parts.push('#USER:');
    return parts.join('\n') + '\n';
}

function readPlainOutput() {
    var ta = document.getElementById('output-text');
    var raw = ta ? ta.value : '';
    if (typeof A.extractPlainOutput === 'function') {
        return A.extractPlainOutput(raw || '');
    }
    return String(raw || '');
}

A.doIterateConversation = function() {
    if (A.isInferenceActive && A.isInferenceActive()) {
        window.PDM.UI.notif(wuText('inferenceRunningReset'), 'err');
        return;
    }
    if (window.PDM._compressActive) {
        window.PDM.UI.notif(wuText('compressLockOutput'), 'err');
        return;
    }
    if (window.PDM.STT && window.PDM.STT.isActive && window.PDM.STT.isActive()) {
        window.PDM.UI.notif(wuText('dictationRunningClear'), 'err');
        return;
    }

    var plainOut = String(readPlainOutput() || '').trim();
    if (!plainOut) {
        window.PDM.UI.notif(wuText('iterateEmptyOutput'), 'err');
        return;
    }

    var inp = document.getElementById('ws-input');
    if (!inp) return;

    var next = buildIterateInput(inp.value, plainOut);
    inp.value = next;

    if (typeof A.clearWorkspaceOutput === 'function') {
        A.clearWorkspaceOutput({ skipSave: true });
    }

    var cc = document.getElementById('char-count');
    if (cc) {
        var I = window.PDM && window.PDM.I18n;
        cc.textContent = I ? I.t('workspace.charCount', { count: next.length }) : (next.length + '');
    }

    inp.dispatchEvent(new Event('input', { bubbles: true }));
    if (typeof A.scheduleWorkspaceSave === 'function') A.scheduleWorkspaceSave();

    inp.focus();
    var end = next.length;
    inp.selectionStart = end;
    inp.selectionEnd = end;
};

A.bindWorkspaceIterate = function() {
    if (A._wsIterateBound) return;
    A._wsIterateBound = true;
    var btn = document.getElementById('ws-iterate-btn');
    if (btn) {
        btn.addEventListener('click', function() {
            A.doIterateConversation();
        });
    }
};
})();
