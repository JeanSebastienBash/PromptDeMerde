/**
 * PromptDeMerde.com — history-ui-list.js
 *
 * Synopsis : Rendu de la liste des cartes d'historique (Workspace).
 * Objectif : Étendre PDM.App avec renderTextHistory, les zones avant/après, le clamp « Voir plus » et le badge audio.
 */
(function(){
"use strict";

var A = window.PDM && window.PDM.App;
if (!A) { console.warn('[history-ui-list] PDM.App not found.'); return; }

A._historyAudioBadge = function(entry) {
    if (!A._isHistoryAudioEntry(entry)) return null;
    var esc = window.PDM.UI.escapeHtml;
    var badge = document.createElement('div');
    badge.className = 'history-audio-badge';
    
    if (entry.inputSource === 'audio-dictation') {
        var segmentText = entry.audioSegmentCount > 1 ? ' (' + entry.audioSegmentCount + ' segments)' : '';
        var name = entry.audioFileName ? esc(entry.audioFileName) : 'Dictée WebM';
        badge.innerHTML = '<span>🎙️ Dictée</span><span class="history-audio-badge-name">' + name + segmentText + '</span>';
        badge.classList.add('history-audio-badge-dictation');
    } else {
        var name = entry.audioFileName ? esc(entry.audioFileName) : 'Fichier audio';
        badge.innerHTML = '<span>Audio</span><span class="history-audio-badge-name">' + name + '</span>';
    }
    
    return badge;
};

A._setupHistoryTextClamp = function(field, body) {
    function refresh() {
        if (field.classList.contains('is-expanded')) return;
        var overflow = body.scrollHeight > body.clientHeight + 1;
        var btn = field.querySelector('.history-zone-expand');
        if (!overflow) {
            if (btn) btn.remove();
            return;
        }
        if (!btn) {
            btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'history-zone-expand';
            btn.textContent = 'Voir plus';
            btn.setAttribute('aria-expanded', 'false');
            btn.addEventListener('click', function() {
                var expanded = field.classList.toggle('is-expanded');
                btn.textContent = expanded ? 'R\u00e9duire' : 'Voir plus';
                btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
                if (!expanded) refresh();
            });
            field.appendChild(btn);
        }
    }
    if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(function() {
            requestAnimationFrame(refresh);
        });
    } else {
        setTimeout(refresh, 0);
    }
};

A._historyZone = function(label, text, entry, kind) {
    var wrap = document.createElement('div');
    wrap.className = 'history-zone';

    var lbl = document.createElement('div');
    lbl.className = 'history-zone-label history-zone-label-' + kind;
    lbl.textContent = label;

    var field = document.createElement('div');
    field.className = 'history-zone-field';

    var body = document.createElement('div');
    body.className = 'history-zone-text';
    body.textContent = text != null && String(text).length ? String(text) : '(vide)';

    var tools = document.createElement('div');
    tools.className = 'history-zone-tools';

    tools.appendChild(A._historyIconBtn('copy', 'Copier ' + label.toLowerCase(), '', function() {
        var payload = kind === 'after' ? entry.output : entry.input;
        if (payload) window.PDM.UI.copy(payload);
        else window.PDM.UI.notif('Aucun texte \u00e0 copier.', 'err');
    }));
    tools.appendChild(A._historyIconBtn('restore', 'Reprendre cette entr\u00e9e', '', function() {
        A.doRestoreHistoryToWorkspace(entry);
    }));
    tools.appendChild(A._historyIconBtn('delete', 'Supprimer cette entr\u00e9e', 'history-icon-btn-danger', function() {
        A.doDeleteHistoryEntry(entry.id);
    }));

    field.appendChild(body);
    field.appendChild(tools);
    wrap.appendChild(lbl);
    wrap.appendChild(field);
    A._setupHistoryTextClamp(field, body);
    wrap._historyField = field;
    wrap._historyBody = body;
    return wrap;
};

A.renderTextHistory = function(listId, emptyId) {
    var box = document.getElementById(listId);
    var emptyEl = document.getElementById(emptyId);
    if (!box) return;

    var list = window.PDM.Storage.getCleanHistory();
    var reversed = list.slice().reverse();
    if (listId === 'ws-history-list') A._updateHistoryCountBadge(list.length);

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
            var modelLabel = entry.model || '—';
            meta.innerHTML =
                '<span class="history-meta-line">' +
                '<strong>' + esc(A.formatHistoryDate(entry.at)) + '</strong>' +
                ' · <span class="history-meta-provider">' + esc(entry.provider || '—') + '</span>' +
                ' · <span class="history-meta-dur">' + esc(dur) + '</span>' +
                '</span>' +
                '<span class="history-meta-model">' + esc(modelLabel) + '</span>';

            var audioBadge = A._historyAudioBadge(entry);
            if (audioBadge) meta.appendChild(audioBadge);

            var headTools = document.createElement('div');
            headTools.className = 'history-head-tools';

            headTools.appendChild(A._historyIconBtn('eye', 'Voir cette entrée en plein écran', '', function() {
                A.openHistoryModal(entry);
            }));
            headTools.appendChild(A._historyIconBtn('json', 'Copiez input, r\u00e9flexion et output (JSON)', '', function() {
                window.PDM.UI.copy(A._historyJsonPayload(entry));
            }));

            var thinkingWrap = null;
            var thinkingToggle = null;
            if (entry.thinking && entry.thinking.trim()) {
                thinkingWrap = document.createElement('div');
                thinkingWrap.className = 'history-thinking';

                var thinkLbl = document.createElement('div');
                thinkLbl.className = 'history-zone-label history-zone-label-thinking';
                thinkLbl.textContent = 'R\u00e9flexion';

                var thinkField = document.createElement('div');
                thinkField.className = 'history-zone-field';

                var thinkBody = document.createElement('div');
                thinkBody.className = 'history-zone-text thinking';
                thinkBody.textContent = entry.thinking;

                var thinkTools = document.createElement('div');
                thinkTools.className = 'history-zone-tools';
                thinkTools.appendChild(A._historyIconBtn('copy', 'Copier la r\u00e9flexion', '', function() {
                    if (entry.thinking) window.PDM.UI.copy(entry.thinking);
                    else window.PDM.UI.notif('Aucune r\u00e9flexion \u00e0 copier.', 'err');
                }));

                thinkField.appendChild(thinkBody);
                thinkField.appendChild(thinkTools);
                thinkingWrap.appendChild(thinkLbl);
                thinkingWrap.appendChild(thinkField);
                A._setupHistoryTextClamp(thinkField, thinkBody);

                thinkingToggle = A._historyIconBtn('thinking', 'Masquer la r\u00e9flexion', 'history-icon-btn-toggle is-active', function() {
                    if (!thinkingWrap) return;
                    var isCollapsed = thinkingWrap.classList.toggle('collapsed');
                    thinkingToggle.classList.toggle('is-active', !isCollapsed);
                    thinkingToggle.title = isCollapsed ? 'Afficher la r\u00e9flexion' : 'Masquer la r\u00e9flexion';
                    thinkingToggle.setAttribute('aria-label', thinkingToggle.title);
                });
                headTools.appendChild(thinkingToggle);
            }

            head.appendChild(meta);
            head.appendChild(headTools);

            var zones = document.createElement('div');
            zones.className = 'history-zones';
            var zoneBefore = A._historyZone('Avant nettoyage', entry.input, entry, 'before');
            var zoneAfter = A._historyZone('Apr\u00e8s nettoyage', entry.output, entry, 'after');
            zones.appendChild(zoneBefore);
            zones.appendChild(zoneAfter);

            card.appendChild(head);
            if (thinkingWrap) card.appendChild(thinkingWrap);
            card.appendChild(zones);

            box.appendChild(card);
        })(reversed[i]);
    }
};

})();
