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

function jsT(key, vars) {
    var I = window.PDM && window.PDM.I18n;
    return I ? I.t('js.' + key, vars) : '';
}

function histT(key, vars) {
    var I = window.PDM && window.PDM.I18n;
    return I ? I.t('history.' + key, vars) : '';
}

A._appendHistoryAudioSection = function(container, entry) {
    if (!A._isHistoryAudioEntry(entry) || !container) return;

    var esc = window.PDM.UI.escapeHtml;
    var section = document.createElement('section');
    section.className = 'history-audio-section';

    var title = document.createElement('h3');
    title.className = 'history-audio-section-title';
    title.textContent = histT('audioSourceTitle');

    var fileLine = document.createElement('p');
    fileLine.className = 'history-audio-file';
    var parts = [];
    if (entry.audioFileName) parts.push(esc(entry.audioFileName));
    if (entry.audioFileSize) parts.push(esc(A._formatAudioSize(entry.audioFileSize)));
    if (entry.audioMimeType) parts.push(esc(entry.audioMimeType));
    fileLine.textContent = parts.length ? parts.join(' · ') : histT('audioImportedLocally');

    section.appendChild(title);
    section.appendChild(fileLine);
    container.appendChild(section);

    if (!entry.audioRef || !(window.PDM.StorageAudioBlobs && window.PDM.StorageAudioBlobs.get)) {
        var missing = document.createElement('p');
        missing.className = 'history-audio-unavailable';
        missing.textContent = histT('audioUnavailable');
        section.appendChild(missing);
        return;
    }

    var status = document.createElement('p');
    status.className = 'history-audio-unavailable';
    status.textContent = histT('audioLoading');
    section.appendChild(status);

    window.PDM.StorageAudioBlobs.get(entry.audioRef).then(function(blob) {
        status.remove();
        if (!blob) {
            var gone = document.createElement('p');
            gone.className = 'history-audio-unavailable';
            gone.textContent = histT('audioUnavailable');
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
        audio.setAttribute('aria-label', histT('audioPlayAria', {
            name: entry.audioFileName || histT('audioPlayDefault')
        }));
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
    copy.textContent = histT('copy');
    copy.addEventListener('click', function() {
        var payload = text != null ? String(text) : '';
        if (payload) window.PDM.UI.copy(payload);
        else window.PDM.UI.notif(jsT('copyEmpty'), 'err');
    });

    var body = document.createElement('div');
    body.className = 'history-modal-text';
    body.textContent = text != null && String(text).length ? String(text) : histT('emptyText');

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
                        '<div class="history-modal-kicker">' + histT('modalKicker') + '</div>' +
                        '<h2 class="history-modal-title">' + histT('modalTitle') + '</h2>' +
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
        actions.appendChild(A._historyIconBtn('restore', histT('restoreTitle'), 'history-modal-icon', function() {
            A.doRestoreHistoryToWorkspace(entry);
            A.closeHistoryModal();
        }));
        actions.appendChild(A._historyIconBtn('json', histT('copyJsonTitle'), 'history-modal-icon', function() {
            window.PDM.UI.copy(A._historyJsonPayload(entry));
        }));
        var close = document.createElement('button');
        close.type = 'button';
        close.className = 'history-modal-close';
        close.textContent = histT('modalClose');
        close.setAttribute('data-history-modal-close', '1');
        actions.appendChild(close);
    }
    if (body) {
        body.innerHTML = '';
        A._appendHistoryAudioSection(body, entry);
        var sections = document.createElement('div');
        sections.className = 'history-sections history-sections--modal';
        if (typeof A._historyTraceSections === 'function') {
            sections.appendChild(A._historyTraceSections(entry));
        } else {
            sections.appendChild(A._historyModalSection(histT('sectionThinking'), entry.thinking || '', 'thinking', entry));
            sections.appendChild(A._historyModalSection(histT('sectionInput'), entry.input || '', 'before', entry));
            sections.appendChild(A._historyModalSection(histT('sectionOutput'), entry.output || '', 'after', entry));
        }
        body.appendChild(sections);
    }

    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('history-modal-open');
    var closeBtn = modal.querySelector('.history-modal-close');
    if (closeBtn) closeBtn.focus();
};

})();
