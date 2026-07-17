/**
 * PromptDeMerde.com — history-ui-list.js
 *
 * Synopsis : Rendu de la liste des cartes d'historique (Workspace).
 * Objectif : Matrice input/system/contextes/output (± compression), sans <details> imbriqués.
 */
(function(){
"use strict";

var A = window.PDM && window.PDM.App;
if (!A) { console.warn('[history-ui-list] PDM.App not found.'); return; }

function jsT(key, vars) {
    var I = window.PDM && window.PDM.I18n;
    return I ? I.t('js.' + key, vars) : '';
}

function histT(key, vars) {
    var I = window.PDM && window.PDM.I18n;
    var raw = I ? I.t('history.' + key, vars) : '';
    if (!raw || raw === 'history.' + key) {
        var fb = ({
            badgeCompressed: 'Compressé',
            badgeRaw: 'Sans compression',
            labelOriginal: 'Original',
            labelCompressed: 'Compressé',
            blockInput: 'Zone Input',
            blockSystem: 'Prompt système',
            blockContexts: 'Prompts de contexte ({{count}})',
            blockOutput: 'Zone Output',
            contextsEmpty: 'Aucun prompt de contexte actif à cette entrée.',
            contextUntitled: 'Contexte',
            emptyText: '(vide)',
            seeMore: 'Voir tout',
            seeLess: 'Réduire',
            copyLabel: 'Copier {{label}}',
            thinking: 'Réflexion'
        })[key];
        raw = fb || key;
        if (vars && typeof vars === 'object') {
            Object.keys(vars).forEach(function(k) {
                raw = String(raw).split('{{' + k + '}}').join(String(vars[k]));
            });
        }
    }
    return raw;
}

function textOrEmpty(v) {
    var s = v != null ? String(v) : '';
    return s;
}

A._historyAudioBadge = function(entry) {
    if (!A._isHistoryAudioEntry(entry)) return null;
    var esc = window.PDM.UI.escapeHtml;
    var badge = document.createElement('div');
    badge.className = 'history-audio-badge';

    if (entry.inputSource === 'audio-dictation') {
        var segmentText = entry.audioSegmentCount > 1
            ? histT('segmentsSuffix', { count: entry.audioSegmentCount })
            : '';
        var name = entry.audioFileName ? esc(entry.audioFileName) : histT('badgeDictationDefault');
        badge.innerHTML = '<span>🎙️ ' + esc(histT('badgeDictation')) + '</span><span class="history-audio-badge-name">' + name + segmentText + '</span>';
        badge.classList.add('history-audio-badge-dictation');
    } else {
        var audioName = entry.audioFileName ? esc(entry.audioFileName) : histT('badgeAudioDefault');
        badge.innerHTML = '<span>Audio</span><span class="history-audio-badge-name">' + audioName + '</span>';
    }

    return badge;
};

/** Bloc texte copiable — 2 lignes par défaut, « Voir tout » pour déplier. */
A._historyTextBlock = function(label, text, kind) {
    var wrap = document.createElement('div');
    wrap.className = 'history-zone history-zone--' + kind;

    var lbl = document.createElement('div');
    lbl.className = 'history-zone-label history-zone-label-' + kind;
    lbl.textContent = label;

    var field = document.createElement('div');
    field.className = 'history-zone-field';

    var body = document.createElement('div');
    body.className = 'history-zone-text';
    var payload = textOrEmpty(text);
    body.textContent = payload.length ? payload : histT('emptyText');

    var tools = document.createElement('div');
    tools.className = 'history-zone-tools';
    tools.appendChild(A._historyIconBtn('copy', histT('copyLabel', { label: label }), '', function() {
        if (payload) window.PDM.UI.copy(payload);
        else window.PDM.UI.notif(jsT('copyEmpty'), 'err');
    }));

    var expandBtn = document.createElement('button');
    expandBtn.type = 'button';
    expandBtn.className = 'history-zone-expand';
    expandBtn.hidden = true;
    expandBtn.textContent = histT('seeMore');
    expandBtn.setAttribute('aria-expanded', 'false');
    expandBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var open = field.classList.toggle('is-expanded');
        expandBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        expandBtn.textContent = open ? histT('seeLess') : histT('seeMore');
    });

    field.appendChild(body);
    field.appendChild(tools);
    wrap.appendChild(lbl);
    wrap.appendChild(field);
    wrap.appendChild(expandBtn);

    wrap._pdmSyncExpand = function() {
        if (!payload.length || field.classList.contains('is-expanded')) return;
        // Mesure fiable une fois le parent visible (section dépliée).
        expandBtn.hidden = !(body.scrollHeight > body.clientHeight + 1);
    };

    if (payload.length) {
        requestAnimationFrame(function() {
            wrap._pdmSyncExpand();
        });
    }

    return wrap;
};

/**
 * Section pliable (div+bouton — évite <details> imbriqués dans le panneau Historique).
 */
A._historyPairSection = function(title, original, compressed, openByDefault) {
    // Par défaut : tout replié — l’utilisateur déplie explicitement chaque bloc.
    openByDefault = !!openByDefault;
    var section = document.createElement('div');
    section.className = 'history-block' + (openByDefault ? ' is-open' : '');

    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'history-block-summary';
    toggle.setAttribute('aria-expanded', openByDefault ? 'true' : 'false');

    var titleEl = document.createElement('span');
    titleEl.className = 'history-block-title';
    titleEl.textContent = title;
    toggle.appendChild(titleEl);

    var pip = document.createElement('span');
    if (compressed != null) {
        pip.className = 'history-block-pip history-block-pip--compress';
        pip.textContent = histT('badgeCompressed');
    } else {
        pip.className = 'history-block-pip';
        pip.textContent = histT('badgeRaw');
    }
    toggle.appendChild(pip);

    var body = document.createElement('div');
    body.className = 'history-block-body' + (compressed != null ? ' history-block-body--pair' : '');
    body.hidden = !openByDefault;

    body.appendChild(A._historyTextBlock(histT('labelOriginal'), original, 'before'));
    if (compressed != null) {
        body.appendChild(A._historyTextBlock(histT('labelCompressed'), compressed, 'compressed'));
    }

    function syncExpandButtons() {
        var zones = body.querySelectorAll('.history-zone');
        for (var i = 0; i < zones.length; i++) {
            if (typeof zones[i]._pdmSyncExpand === 'function') zones[i]._pdmSyncExpand();
        }
    }

    toggle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var open = section.classList.toggle('is-open');
        body.hidden = !open;
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) requestAnimationFrame(syncExpandButtons);
    });

    section.appendChild(toggle);
    section.appendChild(body);
    if (openByDefault) requestAnimationFrame(syncExpandButtons);
    return section;
};

A._historyTraceSections = function(entry) {
    var frag = document.createDocumentFragment();
    var trace = typeof A.ensureHistoryTrace === 'function' ? A.ensureHistoryTrace(entry) : null;
    if (!trace) {
        // Dernier recours : legacy input/output
        frag.appendChild(A._historyPairSection(histT('blockInput'), entry && entry.input, null, false));
        frag.appendChild(A._historyPairSection(histT('blockOutput'), entry && entry.output, null, false));
        return frag;
    }

    frag.appendChild(A._historyPairSection(
        histT('blockInput'),
        trace.input && trace.input.original,
        trace.input ? trace.input.compressed : null,
        false
    ));

    frag.appendChild(A._historyPairSection(
        histT('blockSystem'),
        trace.system && trace.system.original,
        trace.system ? trace.system.compressed : null,
        false
    ));

    var ctxWrap = document.createElement('div');
    ctxWrap.className = 'history-block history-block--contexts';
    var ctxToggle = document.createElement('button');
    ctxToggle.type = 'button';
    ctxToggle.className = 'history-block-summary';
    ctxToggle.setAttribute('aria-expanded', 'false');
    var ctxList = (trace.contexts && trace.contexts.length) ? trace.contexts : [];
    var ctxTitle = document.createElement('span');
    ctxTitle.className = 'history-block-title';
    ctxTitle.textContent = histT('blockContexts', { count: String(ctxList.length) });
    ctxToggle.appendChild(ctxTitle);

    var ctxBody = document.createElement('div');
    ctxBody.className = 'history-block-contexts';
    ctxBody.hidden = true;

    if (!ctxList.length) {
        var empty = document.createElement('p');
        empty.className = 'history-block-empty';
        empty.textContent = histT('contextsEmpty');
        ctxBody.appendChild(empty);
    } else {
        for (var i = 0; i < ctxList.length; i++) {
            var c = ctxList[i] || {};
            var tag = c.tag ? ('#' + String(c.tag).replace(/^#/, '')) : histT('contextUntitled');
            ctxBody.appendChild(A._historyPairSection(
                tag,
                c.original,
                c.compressed,
                false
            ));
        }
    }

    ctxToggle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var open = ctxWrap.classList.toggle('is-open');
        ctxBody.hidden = !open;
        ctxToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    ctxWrap.appendChild(ctxToggle);
    ctxWrap.appendChild(ctxBody);
    frag.appendChild(ctxWrap);

    frag.appendChild(A._historyPairSection(
        histT('blockOutput'),
        trace.output && trace.output.original,
        trace.output ? trace.output.compressed : null,
        false
    ));

    if (trace.thinking && String(trace.thinking).trim()) {
        frag.appendChild(A._historyPairSection(
            histT('thinking'),
            trace.thinking,
            null,
            false
        ));
    }

    return frag;
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
            var compressBadge = (typeof A.historyHadCompress === 'function' && A.historyHadCompress(entry))
                ? ('<span class="history-meta-flag history-meta-flag--compress">' + esc(histT('badgeCompressed')) + '</span>')
                : ('<span class="history-meta-flag">' + esc(histT('badgeRaw')) + '</span>');
            meta.innerHTML =
                '<span class="history-meta-line">' +
                '<strong>' + esc(A.formatHistoryDate(entry.at)) + '</strong>' +
                ' · <span class="history-meta-provider">' + esc(entry.provider || '—') + '</span>' +
                ' · <span class="history-meta-dur">' + esc(dur) + '</span>' +
                ' · ' + compressBadge +
                '</span>' +
                '<span class="history-meta-model">' + esc(modelLabel) + '</span>';

            var audioBadge = A._historyAudioBadge(entry);
            if (audioBadge) meta.appendChild(audioBadge);

            var headTools = document.createElement('div');
            headTools.className = 'history-head-tools';

            headTools.appendChild(A._historyIconBtn('eye', histT('viewFullscreen'), '', function() {
                A.openHistoryModal(entry);
            }));
            headTools.appendChild(A._historyIconBtn('json', histT('copyJsonTitle'), '', function() {
                window.PDM.UI.copy(A._historyJsonPayload(entry));
            }));
            headTools.appendChild(A._historyIconBtn('restore', histT('restoreTitle'), '', function() {
                A.doRestoreHistoryToWorkspace(entry);
            }));
            headTools.appendChild(A._historyIconBtn('delete', histT('deleteTitle'), 'history-icon-btn-danger', function() {
                A.doDeleteHistoryEntry(entry.id);
            }));

            head.appendChild(meta);
            head.appendChild(headTools);

            // Aperçu toujours visible (même si les sections sont repliées)
            var preview = document.createElement('div');
            preview.className = 'history-card-preview';
            var tracePrev = typeof A.ensureHistoryTrace === 'function' ? A.ensureHistoryTrace(entry) : null;
            var prevIn = document.createElement('div');
            prevIn.className = 'history-card-preview-line';
            var inTxt = textOrEmpty(entry.input)
                || (tracePrev && tracePrev.input ? textOrEmpty(tracePrev.input.original) : '')
                || (tracePrev && tracePrev.input ? textOrEmpty(tracePrev.input.compressed) : '');
            prevIn.innerHTML = '<span class="history-card-preview-k">In</span> ';
            prevIn.appendChild(document.createTextNode(inTxt ? inTxt.slice(0, 160) + (inTxt.length > 160 ? '…' : '') : histT('emptyText')));
            var prevOut = document.createElement('div');
            prevOut.className = 'history-card-preview-line';
            var outTxt = textOrEmpty(entry.output)
                || (tracePrev && tracePrev.output ? textOrEmpty(tracePrev.output.original) : '')
                || (tracePrev && tracePrev.output ? textOrEmpty(tracePrev.output.compressed) : '');
            prevOut.innerHTML = '<span class="history-card-preview-k">Out</span> ';
            prevOut.appendChild(document.createTextNode(outTxt ? outTxt.slice(0, 160) + (outTxt.length > 160 ? '…' : '') : histT('emptyText')));
            preview.appendChild(prevIn);
            preview.appendChild(prevOut);

            var sections = document.createElement('div');
            sections.className = 'history-sections';
            sections.appendChild(A._historyTraceSections(entry));

            card.appendChild(head);
            card.appendChild(preview);
            card.appendChild(sections);

            box.appendChild(card);
        })(reversed[i]);
    }
};

})();
