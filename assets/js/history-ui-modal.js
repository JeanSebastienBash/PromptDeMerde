/**
 * PromptDeMerde.com — history-ui-modal.js
 *
 * Synopsis : Modal plein écran d'une entrée d'historique LLM.
 * Objectif : Étendre PDM.App avec openHistoryModal/closeHistoryModal, sections et lecteur audio source.
 */
(function(){
"use strict";

var A = window.PDM && window.PDM.App;
if (!A) { console.warn('[history-ui-modal] PDM.App not found.'); return; }

A._appendHistoryAudioSection = function(container, entry) {
    if (!A._isHistoryAudioEntry(entry) || !container) return;

    var esc = window.PDM.UI.escapeHtml;
    var section = document.createElement('section');
    section.className = 'history-audio-section';

    var title = document.createElement('h3');
    title.className = 'history-audio-section-title';
    title.textContent = 'Fichier audio source';

    var fileLine = document.createElement('p');
    fileLine.className = 'history-audio-file';
    var parts = [];
    if (entry.audioFileName) parts.push(esc(entry.audioFileName));
    if (entry.audioFileSize) parts.push(esc(A._formatAudioSize(entry.audioFileSize)));
    if (entry.audioMimeType) parts.push(esc(entry.audioMimeType));
    fileLine.textContent = parts.length ? parts.join(' · ') : 'Fichier importé localement';

    section.appendChild(title);
    section.appendChild(fileLine);
    container.appendChild(section);

    if (!entry.audioRef || !(window.PDM.StorageAudioBlobs && window.PDM.StorageAudioBlobs.get)) {
        var missing = document.createElement('p');
        missing.className = 'history-audio-unavailable';
        missing.textContent = 'Fichier audio indisponible (session précédente, export JSON ou quota).';
        section.appendChild(missing);
        return;
    }

    var status = document.createElement('p');
    status.className = 'history-audio-unavailable';
    status.textContent = 'Chargement du fichier audio…';
    section.appendChild(status);

    window.PDM.StorageAudioBlobs.get(entry.audioRef).then(function(blob) {
        status.remove();
        if (!blob) {
            var gone = document.createElement('p');
            gone.className = 'history-audio-unavailable';
            gone.textContent = 'Fichier audio indisponible (session précédente, export JSON ou quota).';
            section.appendChild(gone);
            return;
        }
        A._revokeHistoryAudioUrl();
        A._historyAudioObjectUrl = URL.createObjectURL(blob);
        var audio = document.createElement('audio');
        audio.className = 'history-audio-player';
        audio.controls = true;
        audio.preload = 'metadata';
        audio.src = A._historyAudioObjectUrl;
        audio.setAttribute('aria-label', 'Lecture du fichier audio : ' + (entry.audioFileName || 'source'));
        section.appendChild(audio);
    });
};

A._historyModalSection = function(label, text, kind, entry) {
    var section = document.createElement('section');
    section.className = 'history-modal-section history-modal-section-' + kind;

    var head = document.createElement('div');
    head.className = 'history-modal-section-head';

    var title = document.createElement('h3');
    title.className = 'history-modal-section-title history-zone-label-' + kind;
    title.textContent = label;

    var copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'history-modal-copy';
    copy.textContent = 'Copier';
    copy.addEventListener('click', function() {
        var payload = text != null ? String(text) : '';
        if (payload) window.PDM.UI.copy(payload);
        else window.PDM.UI.notif('Aucun texte à copier.', 'err');
    });

    var body = document.createElement('div');
    body.className = 'history-modal-text';
    body.textContent = text != null && String(text).length ? String(text) : '(vide)';

    head.appendChild(title);
    head.appendChild(copy);
    section.appendChild(head);
    section.appendChild(body);
    return section;
};

A.closeHistoryModal = function() {
    A._revokeHistoryAudioUrl();
    var modal = document.getElementById('history-view-modal');
    if (!modal) return;
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('history-modal-open');
    var body = modal.querySelector('.history-modal-body');
    if (body) body.innerHTML = '';
};

A.openHistoryModal = function(entry) {
    if (!entry) return;
    var modal = document.getElementById('history-view-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'history-view-modal';
        modal.className = 'history-view-modal';
        modal.setAttribute('aria-hidden', 'true');
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.innerHTML =
            '<div class="history-modal-backdrop" data-history-modal-close="1"></div>' +
            '<div class="history-modal-shell" role="document">' +
                '<div class="history-modal-head">' +
                    '<div class="history-modal-title-wrap">' +
                        '<div class="history-modal-kicker">Historique LLM</div>' +
                        '<h2 class="history-modal-title">Vue complète</h2>' +
                        '<div class="history-modal-meta"></div>' +
                    '</div>' +
                    '<div class="history-modal-actions"></div>' +
                '</div>' +
                '<div class="history-modal-body"></div>' +
            '</div>';
        document.body.appendChild(modal);
        modal.addEventListener('click', function(e) {
            if (e.target && e.target.getAttribute('data-history-modal-close') === '1') {
                A.closeHistoryModal();
            }
        });
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') A.closeHistoryModal();
        });
    }

    var esc = window.PDM.UI.escapeHtml;
    var meta = modal.querySelector('.history-modal-meta');
    var actions = modal.querySelector('.history-modal-actions');
    var body = modal.querySelector('.history-modal-body');
    var dur = entry.duration_ms ? (entry.duration_ms / 1000).toFixed(1) + 's' : '—';

    if (meta) {
        meta.innerHTML =
            '<span>' + esc(A.formatHistoryDate(entry.at)) + '</span>' +
            '<span>' + esc(entry.provider || '—') + '</span>' +
            '<span>' + esc(dur) + '</span>' +
            '<span class="history-modal-model">' + esc(entry.model || '—') + '</span>';
    }
    if (actions) {
        actions.innerHTML = '';
        actions.appendChild(A._historyIconBtn('restore', 'Reprendre cette entrée', 'history-modal-icon', function() {
            A.doRestoreHistoryToWorkspace(entry);
            A.closeHistoryModal();
        }));
        actions.appendChild(A._historyIconBtn('json', 'Copiez input, réflexion et output (JSON)', 'history-modal-icon', function() {
            window.PDM.UI.copy(A._historyJsonPayload(entry));
        }));
        var close = document.createElement('button');
        close.type = 'button';
        close.className = 'history-modal-close';
        close.textContent = 'Fermer';
        close.setAttribute('data-history-modal-close', '1');
        actions.appendChild(close);
    }
    if (body) {
        body.innerHTML = '';
        A._appendHistoryAudioSection(body, entry);
        body.appendChild(A._historyModalSection('Réflexion', entry.thinking || '', 'thinking', entry));
        body.appendChild(A._historyModalSection('Input', entry.input || '', 'before', entry));
        body.appendChild(A._historyModalSection('Output', entry.output || '', 'after', entry));
    }

    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('history-modal-open');
    var closeBtn = modal.querySelector('.history-modal-close');
    if (closeBtn) closeBtn.focus();
};

})();
