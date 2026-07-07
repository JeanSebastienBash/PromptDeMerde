/**
 * PromptDeMerde.com — Historique des nettoyages.
 */
(function(){
"use strict";

var A = window.PDM && window.PDM.App;
if (!A) { console.warn('[history-ui] PDM.App not found.'); return; }

A.bindHistory = function() {
    var wsClear = document.getElementById('ws-history-clear');
    if (wsClear) wsClear.addEventListener('click', function(){ A.doClearAllHistories(); });

    var prClear = document.getElementById('prompts-history-clear');
    if (prClear) prClear.addEventListener('click', function(){ A.doClearAllHistories(); });
};

A.doClearAllHistories = function() {
    if (!confirm('Vider tout l\u2019historique texte LLM ?')) return;
    window.PDM.Storage.clearAllHistories();
    A.renderAllHistories();
    window.PDM.UI.notif('Historique vid\u00e9.', 'info');
};

A.doDeleteHistoryEntry = function(id) {
    if (!id) return;
    if (!confirm('Supprimer cette entr\u00e9e texte ?')) return;
    var ok = window.PDM.Storage.deleteCleanEntry(id);
    if (!ok) {
        window.PDM.UI.notif('Entr\u00e9e introuvable.', 'err');
        return;
    }
    A.renderAllHistories();
    window.PDM.UI.notif('Entr\u00e9e supprim\u00e9e.', 'info');
};

A.formatHistoryDate = function(iso) {
    if (!iso) return '—';
    try {
        var d = new Date(iso);
        return d.toLocaleString('fr-FR', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    } catch (e) {
        return iso;
    }
};

A._truncateHistory = function(text, max) {
    max = max || 400;
    var s = text != null ? String(text) : '';
    if (s.length <= max) return s;
    return s.slice(0, max) + '\u2026';
};

A.renderAllHistories = function() {
    A.renderTextHistory('ws-history-list', 'ws-history-empty');
    A.renderTextHistory('prompts-history-list', 'prompts-history-empty');
};

A.renderTextHistory = function(listId, emptyId) {
    var box = document.getElementById(listId);
    var emptyEl = document.getElementById(emptyId);
    if (!box) return;

    var list = window.PDM.Storage.getCleanHistory();
    var reversed = list.slice().reverse();

    if (emptyEl) {
        emptyEl.classList.toggle('hidden', reversed.length > 0);
    }

    box.innerHTML = '';
    if (!reversed.length) return;

    for (var i = 0; i < reversed.length; i++) {
        (function(entry){
            var card = document.createElement('article');
            card.className = 'history-card';
            card.setAttribute('data-history-id', entry.id || '');

            var head = document.createElement('div');
            head.className = 'history-card-head';

            var meta = document.createElement('div');
            meta.className = 'history-card-meta';
            var dur = entry.duration_ms ? (entry.duration_ms / 1000).toFixed(1) + 's' : '—';
            var esc = window.PDM.UI.escapeHtml;
            meta.innerHTML =
                '<div><strong>' + esc(A.formatHistoryDate(entry.at)) + '</strong></div>' +
                '<div>Provider: <span class="val">' + esc(entry.provider || '—') + '</span> · Mod\u00e8le: <span class="val">' + esc(entry.model || '—') + '</span> · ' + esc(dur) + '</div>';

            var actions = document.createElement('div');
            actions.className = 'history-card-actions';

            var btnCopyAfter = document.createElement('button');
            btnCopyAfter.type = 'button';
            btnCopyAfter.className = 'btn-ghost btn-sm';
            btnCopyAfter.textContent = 'Copier apr\u00e8s';
            btnCopyAfter.addEventListener('click', function(){
                if (entry.output) window.PDM.UI.copy(entry.output);
                else window.PDM.UI.notif('Aucun r\u00e9sultat \u00e0 copier.', 'err');
            });

            var btnRestore = document.createElement('button');
            btnRestore.type = 'button';
            btnRestore.className = 'btn-ghost btn-sm';
            btnRestore.textContent = 'Reprendre';
            btnRestore.addEventListener('click', function(){
                A.doRestoreHistoryToWorkspace(entry);
            });

            var btnDelete = document.createElement('button');
            btnDelete.type = 'button';
            btnDelete.className = 'btn-ghost btn-sm history-delete-btn';
            btnDelete.textContent = 'Supprimer';
            btnDelete.addEventListener('click', function(){
                A.doDeleteHistoryEntry(entry.id);
            });

            actions.appendChild(btnCopyAfter);
            actions.appendChild(btnRestore);
            actions.appendChild(btnDelete);
            head.appendChild(meta);
            head.appendChild(actions);

            function block(label, text, extraClass) {
                var wrap = document.createElement('div');
                wrap.className = 'history-block';
                var lbl = document.createElement('div');
                lbl.className = 'history-block-label';
                lbl.textContent = label;
                var txt = document.createElement('div');
                txt.className = 'history-block-text' + (extraClass ? ' ' + extraClass : '');
                txt.textContent = text || '(vide)';
                wrap.appendChild(lbl);
                wrap.appendChild(txt);
                return wrap;
            }

            card.appendChild(head);
            card.appendChild(block('Avant nettoyage', A._truncateHistory(entry.input)));
            if (entry.thinking && entry.thinking.trim()) {
                card.appendChild(block('R\u00e9flexion', A._truncateHistory(entry.thinking), 'thinking'));
            }
            card.appendChild(block('Apr\u00e8s nettoyage', A._truncateHistory(entry.output), 'after'));

            box.appendChild(card);
        })(reversed[i]);
    }
};

A.doRestoreHistoryToWorkspace = function(entry) {
    if (!entry) return;
    var inp = document.getElementById('ws-input');
    var outputTa = document.getElementById('output-text');
    var outputBox = document.getElementById('output-box');
    if (inp) {
        inp.value = entry.input || '';
        var c = document.getElementById('char-count');
        if (c) c.textContent = inp.value.length + ' / 50000';
    }
    if (outputTa) outputTa.value = entry.output || '';
    if (outputBox) outputBox.classList.add('show');
    A.syncThinkingPanel(entry.thinking || '', { streaming: false, open: !!entry.thinking });
    window.PDM._wsBackup = {
        text: entry.output || '',
        thinking: entry.thinking || '',
        final: true
    };
    A.saveWorkspaceFromDom();
    window.location.hash = 'workspace';
    window.PDM.UI.notif('Entr\u00e9e restaur\u00e9e dans le Workspace.', 'ok');
};

})();
