/**
 * PromptDeMerde.com — history-ui.js
 *
 * Synopsis : UI historique des nettoyages (Workspace et Prompts) — cœur.
 * Objectif : Internes partagés (icônes, iconBtn, audio), actions (purge/suppression/restauration) ;
 *            modal dans history-ui-modal.js, liste des cartes dans history-ui-list.js.
 */
(function(){
"use strict";

var A = window.PDM && window.PDM.App;
if (!A) { console.warn('[history-ui] PDM.App not found.'); return; }

function jsT(key, vars) {
    var I = window.PDM && window.PDM.I18n;
    return I ? I.t('js.' + key, vars) : '';
}

function histT(key, vars) {
    var I = window.PDM && window.PDM.I18n;
    return I ? I.t('history.' + key, vars) : '';
}

function wsCharCount(n) {
    var I = window.PDM && window.PDM.I18n;
    return I ? I.t('workspace.charCount', { count: n }) : (n + ' / 50000');
}

function historyDateLocale() {
    var I = window.PDM && window.PDM.I18n;
    var loc = I && I.getLocale ? I.getLocale() : 'fr';
    var map = { zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR' };
    return map[loc] || loc;
}

A._HISTORY_ICONS = {
    copy: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="9" y="9" width="13" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    restore: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 12a9 9 0 1 0 3-6.7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M3 4v5h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    delete: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 6h18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M8 6V4h8v2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M19 6l-1 14H6L5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M10 11v6M14 11v6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    json: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 3C5.8 3 5 4.8 5 7v2c0 1.1-.9 2-2 2 1.1 0 2 .9 2 2v2c0 2.2.8 4 3 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M16 3c2.2 0 3 1.8 3 4v2c0 1.1.9 2 2 2-1.1 0-2 .9-2 2v2c0 2.2-.8 4-3 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    eye: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    thinking: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3a7 7 0 0 1 7 7c0 2.5-1.3 4.7-3.2 6L15 21H9l-1.8-5A7 7 0 0 1 12 3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>'
};

A._historyAudioObjectUrl = null;

A._isHistoryAudioEntry = function(entry) {
    return entry && (entry.inputSource === 'audio-file' || entry.inputSource === 'audio-dictation');
};

A._revokeHistoryAudioUrl = function() {
    if (A._historyAudioObjectUrl) {
        URL.revokeObjectURL(A._historyAudioObjectUrl);
        A._historyAudioObjectUrl = null;
    }
};

A._formatAudioSize = function(bytes) {
    var n = Number(bytes);
    if (!Number.isFinite(n) || n <= 0) return '';
    if (n < 1024) return n + ' o';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' Ko';
    return (n / (1024 * 1024)).toFixed(1) + ' Mo';
};

A._historyIconBtn = function(kind, label, extraClass, onClick) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'history-icon-btn' + (extraClass ? ' ' + extraClass : '');
    if (kind === 'copy' || kind === 'json') btn.classList.add('history-icon-btn-copy');
    btn.title = label;
    btn.setAttribute('aria-label', label);
    btn.innerHTML = A._HISTORY_ICONS[kind] || '';
    btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        onClick();
    });
    return btn;
};

A.bindHistory = function() {
    var wsClear = document.getElementById('ws-history-clear');
    if (wsClear) {
        wsClear.addEventListener('click', function(e){
            e.preventDefault();
            e.stopPropagation();
            A.doClearAllHistories();
        });
    }

};

A._updateHistoryCountBadge = function(count) {
    var badge = document.getElementById('ws-history-count');
    if (!badge) return;
    if (!count) {
        badge.textContent = '';
        badge.hidden = true;
        return;
    }
    badge.hidden = false;
    badge.textContent = count === 1
        ? histT('entryCount', { count: count })
        : histT('entryCountPlural', { count: count });
};

A.doClearAllHistories = function() {
    if (!confirm(jsT('historyPurgeConfirm'))) return;
    window.PDM.Storage.clearAllHistories();
    A.renderAllHistories();
    window.PDM.UI.notif(jsT('historyPurged'), 'info');
};

A.doDeleteHistoryEntry = function(id) {
    if (!id) return;
    if (!confirm(jsT('historyDeleteConfirm'))) return;
    var ok = window.PDM.Storage.deleteCleanEntry(id);
    if (!ok) {
        window.PDM.UI.notif(jsT('historyNotFound'), 'err');
        return;
    }
    A.renderAllHistories();
    window.PDM.UI.notif(jsT('historyDeleted'), 'info');
};

A.formatHistoryDate = function(iso) {
    if (!iso) return '—';
    try {
        var d = new Date(iso);
        return d.toLocaleString(historyDateLocale(), {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    } catch (e) {
        return iso;
    }
};

A._historyJsonPayload = function(entry) {
    var trace = typeof A.ensureHistoryTrace === 'function' ? A.ensureHistoryTrace(entry) : null;
    return JSON.stringify({
        input: entry.input || '',
        thinking: entry.thinking || '',
        output: entry.output || '',
        systemPrompt: entry.systemPrompt || '',
        activeContexts: entry.activeContexts || [],
        trace: trace
    }, null, 2);
};

A.renderAllHistories = function() {
    A.renderTextHistory('ws-history-list', 'ws-history-empty');
};

A.doRestoreHistoryToWorkspace = function(entry) {
    if (!entry) return;
    var inp = document.getElementById('ws-input');
    var outputTa = document.getElementById('output-text');
    if (inp) {
        inp.value = entry.input || '';
        var c = document.getElementById('char-count');
        if (c) c.textContent = wsCharCount(inp.value.length);
    }
    var plainOut = typeof A.extractPlainOutput === 'function'
        ? A.extractPlainOutput(entry.output || '')
        : (entry.output || '');
    var plainThink = entry.thinking || '';
    window.PDM._wsBackup = {
        text: plainOut,
        plain: plainOut,
        thinking: plainThink,
        plainThinking: plainThink,
        final: true
    };
    if (typeof A.applyWorkspaceOutputFormat === 'function') {
        A.applyWorkspaceOutputFormat();
    } else if (outputTa) {
        outputTa.value = plainOut;
    }
    A.syncThinkingPanel(
        typeof A.wrapOutputForDisplay === 'function'
            ? A.wrapOutputForDisplay(plainThink, null, 'thinking')
            : plainThink,
        {
            streaming: false,
            open: !!plainThink.trim()
        }
    );
    if (window.PDM.UI && window.PDM.UI.syncOutputEmptyState) {
        window.PDM.UI.syncOutputEmptyState();
    }

    if (A._isHistoryAudioEntry(entry)) {
        window.PDM.Storage.setWorkspace({
            input: entry.input || '',
            output: entry.output || '',
            thinking: entry.thinking || '',
            inputSource: 'audio-file',
            audioFileName: entry.audioFileName,
            audioFileSize: entry.audioFileSize,
            audioMimeType: entry.audioMimeType,
            audioLastModified: entry.audioLastModified,
            audioRef: entry.audioRef
        });
        if (A.setWorkspaceAudioDone && entry.audioFileName) {
            A.setWorkspaceAudioDone(entry.audioFileName, function() {
                if (A.exitWorkspaceAudioMode) A.exitWorkspaceAudioMode();
            });
        }
    } else {
        if (A.setWorkspaceAudioMode) A.setWorkspaceAudioMode(false);
        window.PDM.Storage.setWorkspace({
            input: entry.input || '',
            output: entry.output || '',
            thinking: entry.thinking || '',
            inputSource: 'manual',
            audioFileName: null,
            audioFileSize: null,
            audioMimeType: null,
            audioLastModified: null,
            audioRef: null
        });
    }

    A.saveWorkspaceFromDom();
    window.location.hash = 'workspace';
    window.PDM.UI.notif(jsT('historyRestored'), 'ok');
};

})();
