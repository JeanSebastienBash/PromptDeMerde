/**
 * PromptDeMerde.com — workspace-audio-mode.js
 *
 * Synopsis : Bascule lecture seule du Workspace en mode fichier audio.
 * Objectif : Toggle .ws-audio-mode + readonly + statut, sans effet de bord sur la dictée.
 */
(function(){
"use strict";

var A = window.PDM && window.PDM.App;
if (!A) { console.warn('[workspace-audio-mode] PDM.App not found.'); return; }

var INPUT_PLACEHOLDER = '';

function wu() { return window.PDM && window.PDM.WorkspaceUi; }
function wuText(key, vars) {
    return wu() ? wu().text(key, vars) : '';
}

function field() { return document.querySelector('.ws-panel.ws-input .ws-input-field'); }
function statusEl() { return document.getElementById('ws-audio-status'); }
function clearBtn() { return document.getElementById('ws-input-clear'); }

function truncateFileLabel(name, maxLen) {
    var n = String(name || '').trim();
    if (!n) return 'fichier audio';
    if (n.length <= maxLen) return n;
    var dot = n.lastIndexOf('.');
    var ext = dot > 0 ? n.slice(dot) : '';
    var base = ext ? n.slice(0, dot) : n;
    var keep = Math.max(8, maxLen - ext.length - 1);
    if (base.length <= keep) return n;
    return base.slice(0, keep) + '\u2026' + ext;
}

A.rememberWorkspaceInputPlaceholder = function(force) {
    var inp = document.getElementById('ws-input');
    if (wu()) {
        INPUT_PLACEHOLDER = wuText('inputPlaceholder');
        if (inp && (force || !A.isWorkspaceAudioProcessing())) {
            inp.setAttribute('placeholder', INPUT_PLACEHOLDER);
        }
        return;
    }
    if (inp && (!INPUT_PLACEHOLDER || force)) {
        INPUT_PLACEHOLDER = inp.getAttribute('placeholder') || '';
    }
};

A.isWorkspaceAudioMode = function() {
    var f = field();
    return !!(f && f.classList.contains('ws-audio-mode'));
};

A.isWorkspaceAudioProcessing = function() {
    var f = field();
    return !!(f && f.classList.contains('ws-audio-mode-processing'));
};

function resetStatusEl(st) {
    if (!st) return;
    st.classList.remove('ws-audio-status-done', 'ws-audio-status-processing');
    st.textContent = '';
    st.hidden = true;
}

function restoreInputPlaceholder(inp) {
    if (!inp) return;
    if (wu()) {
        inp.setAttribute('placeholder', wuText('inputPlaceholder'));
        return;
    }
    if (INPUT_PLACEHOLDER) inp.setAttribute('placeholder', INPUT_PLACEHOLDER);
}

function setProcessingUi(on) {
    var f = field(), inp = document.getElementById('ws-input');
    if (f) f.classList.toggle('ws-audio-mode-processing', !!on);
    if (inp) {
        if (on) {
            inp.setAttribute('placeholder', wuText('audioProcessingPlaceholder'));
        } else {
            restoreInputPlaceholder(inp);
        }
    }
}

function updateClearButtonHint(on, processing) {
    var btn = clearBtn();
    if (!btn) return;
    btn.classList.remove('ws-audio-clear-hint', 'ws-audio-clear-cancel');
    if (!on) {
        btn.title = wuText('audioClearTitle');
        btn.setAttribute('aria-label', wuText('audioClearTitle'));
        return;
    }
    if (processing) {
        btn.title = wuText('audioClearProcessingTitle');
        btn.setAttribute('aria-label', wuText('audioClearProcessingTitle'));
        btn.classList.add('ws-audio-clear-cancel');
    } else {
        btn.title = wuText('audioClearCancelTitle');
        btn.setAttribute('aria-label', wuText('audioClearCancelTitle'));
        btn.classList.add('ws-audio-clear-hint');
    }
}

A.setWorkspaceAudioMode = function(on, fileName) {
    var f = field(), inp = document.getElementById('ws-input'), st = statusEl();
    if (f) {
        f.classList.toggle('ws-audio-mode', !!on);
        if (!on) f.classList.remove('ws-audio-mode-processing');
    }
    if (inp) inp.readOnly = !!on;
    if (!on) restoreInputPlaceholder(inp);
    updateClearButtonHint(!!on, false);
    if (!on) {
        resetStatusEl(st);
    } else if (st) {
        st.classList.remove('ws-audio-status-done', 'ws-audio-status-processing');
        st.hidden = false;
        st.textContent = fileName || wuText('audioFileDefault');
    }
};

A.setWorkspaceAudioStatus = function(msg) {
    var st = statusEl();
    if (!st || st.hidden) return;
    st.classList.remove('ws-audio-status-done');
    st.classList.add('ws-audio-status-processing');
    st.textContent = msg || '';
};

A.setWorkspaceAudioProcessing = function(fileName, detail, pct) {
    var st = statusEl(), f = field();
    if (!st) return;
    setProcessingUi(true);
    updateClearButtonHint(true, true);

    st.hidden = false;
    st.classList.remove('ws-audio-status-done');
    st.classList.add('ws-audio-status-processing');
    st.textContent = '';

    var head = document.createElement('div');
    head.className = 'ws-audio-processing-head';

    var spinner = document.createElement('span');
    spinner.className = 'ws-audio-status-spinner';
    spinner.setAttribute('aria-hidden', 'true');
    spinner.textContent = '\u23F3';

    var label = document.createElement('span');
    label.className = 'ws-audio-status-label';
    var shortName = truncateFileLabel(fileName, 48);
    label.textContent = wuText('audioTranscribingLabel', { name: shortName });
    if (fileName && shortName !== fileName) label.title = fileName;

    head.appendChild(spinner);
    head.appendChild(label);

    var detailEl = document.createElement('span');
    detailEl.className = 'ws-audio-status-detail';
    detailEl.textContent = detail || wuText('audioPrepDetail');

    var bar = document.createElement('div');
    bar.className = 'ws-audio-progress';
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', '100');
    var val = pct != null && pct >= 0 ? Math.min(100, Math.round(pct)) : 0;
    bar.setAttribute('aria-valuenow', String(val));

    var fill = document.createElement('div');
    fill.className = 'ws-audio-progress-fill';
    fill.style.width = (pct != null && pct >= 0 ? val : 8) + '%';
    bar.appendChild(fill);

    var hint = document.createElement('span');
    hint.className = 'ws-audio-status-hint';
    hint.textContent = wuText('audioProcessingHint');

    st.appendChild(head);
    st.appendChild(detailEl);
    st.appendChild(bar);
    st.appendChild(hint);

    if (f) f.classList.add('ws-audio-mode');
};

A.setWorkspaceAudioDone = function(fileName, onNewInput) {
    var st = statusEl();
    if (!st) return;
    setProcessingUi(false);
    st.hidden = false;
    st.classList.remove('ws-audio-status-processing');
    st.classList.add('ws-audio-status-done');
    st.textContent = '';

    var label = document.createElement('span');
    label.className = 'ws-audio-status-label';
    var doneName = truncateFileLabel(fileName, 56);
    label.textContent = wuText('audioDoneLabel', { name: doneName });
    if (fileName && doneName !== fileName) label.title = fileName;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ws-audio-new-input-btn btn-ghost btn-sm';
    btn.textContent = wuText('audioNewInput');
    btn.addEventListener('click', function(e) {
        e.preventDefault();
        if (typeof onNewInput === 'function') onNewInput();
    });

    st.appendChild(label);
    st.appendChild(btn);
    updateClearButtonHint(true, false);
};

A.restoreWorkspaceAudioMode = function() {
    var a = window.PDM.Storage.getWorkspaceAudio();
    var on = a.inputSource === 'audio-file';
    A.setWorkspaceAudioMode(on, a.audioFileName);
    if (on && a.audioFileName) {
        A.setWorkspaceAudioDone(a.audioFileName, function() {
            if (A.exitWorkspaceAudioMode) A.exitWorkspaceAudioMode();
        });
    }
};

})();
