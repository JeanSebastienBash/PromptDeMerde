/**
 * PromptDeMerde.com — prompts-ui-list.js
 *
 * Synopsis : Liste des contextes (onglet Prompts) — rendu, réordonnancement, DnD.
 * Objectif : Construire la liste des profils/contextes, gérer drag & drop et provenance.
 */
(function(){
"use strict";

var A = window.PDM && window.PDM.App;
if (!A) { console.warn('[prompts-ui-list] PDM.App not found.'); return; }

A._applyProfileOrder = function(ids, silent) {
    window.PDM.Profiles.reorder(ids);
    A.rebuildProfileList();
    A.reloadTags();
    if (!silent) window.PDM.UI.notif('Ordre des contextes mis \u00e0 jour.', 'ok');
};

A.moveProfile = function(id, delta) {
    if (!id || !delta) return;
    A.flushPromptsFromDom();
    var list = window.PDM.Profiles.move(id, delta);
    if (!list) return;
    A.rebuildProfileList();
    A.reloadTags();
};

A.bindProfileListDnD = function() {
    var box = document.getElementById('profiles-list');
    if (!box || box._profileDndBound) return;
    box._profileDndBound = true;

    var draggedId = null;
    var dragAllowed = false;

    box.addEventListener('mousedown', function(e) {
        dragAllowed = !!e.target.closest('.profile-drag-handle');
    });

    box.addEventListener('dragstart', function(e) {
        var item = e.target.closest('.profile-item');
        if (!item || !dragAllowed) {
            e.preventDefault();
            return;
        }
        dragAllowed = false;
        draggedId = item.getAttribute('data-profile-id');
        item.classList.add('is-dragging');
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', draggedId || '');
            try {
                e.dataTransfer.setDragImage(item, 24, 24);
            } catch (err) {}
        }
    });

    box.addEventListener('dragend', function() {
        draggedId = null;
        var items = box.querySelectorAll('.profile-item');
        for (var i = 0; i < items.length; i++) {
            items[i].classList.remove('is-dragging', 'is-drag-over');
        }
    });

    box.addEventListener('dragover', function(e) {
        if (!draggedId) return;
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
        var item = e.target.closest('.profile-item');
        var items = box.querySelectorAll('.profile-item');
        for (var i = 0; i < items.length; i++) {
            items[i].classList.remove('is-drag-over');
        }
        if (item && item.getAttribute('data-profile-id') !== draggedId) {
            item.classList.add('is-drag-over');
        }
    });

    box.addEventListener('drop', function(e) {
        e.preventDefault();
        var target = e.target.closest('.profile-item');
        if (!target || !draggedId) return;
        var targetId = target.getAttribute('data-profile-id');
        if (!targetId || targetId === draggedId) return;

        A.flushPromptsFromDom();
        var items = box.querySelectorAll('.profile-item[data-profile-id]');
        var ids = [];
        for (var i = 0; i < items.length; i++) {
            ids.push(items[i].getAttribute('data-profile-id'));
        }
        var from = ids.indexOf(draggedId);
        var to = ids.indexOf(targetId);
        if (from < 0 || to < 0) return;
        ids.splice(from, 1);
        ids.splice(to, 0, draggedId);
        A._applyProfileOrder(ids, false);
    });
};

A._profileOriginLabel = function(origin) {
    if (!origin || !origin.method) return '';
    var labels = {
        ai_intent: 'G\u00e9n\u00e9r\u00e9 par IA (intention)',
        ai_title: 'G\u00e9n\u00e9r\u00e9 par IA (titre)',
        manual: 'Ajout manuel',
        profile_bundle: 'Profil JSON officiel'
    };
    return labels[origin.method] || origin.method;
};

A.rebuildProfileList = function() {
    var box = document.getElementById('profiles-list');
    if (!box) return;
    var list = window.PDM.Profiles.load();
    var cnt = document.getElementById('profile-count');
    var maxP = window.PDM.Storage.getMaxProfiles();
    if (cnt) cnt.innerHTML = '<span class="num">' + list.length + '/' + (maxP >= 999 ? '\u221e' : maxP) + '</span> prompts utilis\u00e9s';

    box.innerHTML = '';
    for (var i = 0; i < list.length; i++) {
        (function(p, index, total){
            var div = document.createElement('div');
            div.className = 'profile-item';
            div.setAttribute('data-profile-id', p.id);
            div.setAttribute('draggable', 'true');

            var head = document.createElement('div');
            head.className = 'profile-head';

            var orderCol = document.createElement('div');
            orderCol.className = 'profile-order-col';

            var drag = document.createElement('span');
            drag.className = 'profile-drag-handle';
            drag.title = 'Glisser pour r\u00e9organiser';
            drag.setAttribute('role', 'button');
            drag.setAttribute('tabindex', '0');
            drag.setAttribute('aria-label', 'Glisser pour r\u00e9organiser');
            drag.textContent = '\u22EE\u22EE';

            var orderBtns = document.createElement('div');
            orderBtns.className = 'profile-order-btns';

            var upBtn = document.createElement('button');
            upBtn.type = 'button';
            upBtn.className = 'profile-order-btn';
            upBtn.title = 'Monter';
            upBtn.setAttribute('aria-label', 'Monter');
            upBtn.textContent = '\u2191';
            upBtn.disabled = index === 0;
            upBtn.addEventListener('click', function(){
                A.moveProfile(p.id, -1);
            });

            var downBtn = document.createElement('button');
            downBtn.type = 'button';
            downBtn.className = 'profile-order-btn';
            downBtn.title = 'Descendre';
            downBtn.setAttribute('aria-label', 'Descendre');
            downBtn.textContent = '\u2193';
            downBtn.disabled = index >= total - 1;
            downBtn.addEventListener('click', function(){
                A.moveProfile(p.id, 1);
            });

            orderBtns.appendChild(upBtn);
            orderBtns.appendChild(downBtn);

            var orderNum = document.createElement('span');
            orderNum.className = 'profile-order-num';
            orderNum.textContent = String(index + 1);
            orderNum.title = 'Position dans l\u2019ordre d\u2019injection';

            orderCol.appendChild(drag);
            orderCol.appendChild(orderBtns);
            orderCol.appendChild(orderNum);

            var identity = document.createElement('div');
            identity.className = 'profile-identity';

            var idBadge = document.createElement('span');
            idBadge.className = 'profile-id-badge';
            idBadge.textContent = p.id;
            idBadge.title = 'Identifiant technique (export JSON)';

            var tagWrap = document.createElement('div');
            tagWrap.className = 'profile-tag-wrap';

            var tagPrefix = document.createElement('span');
            tagPrefix.className = 'profile-tag-prefix';
            tagPrefix.textContent = '#';
            tagPrefix.setAttribute('aria-hidden', 'true');

            var tag = document.createElement('input');
            tag.type = 'text';
            tag.className = 'profile-tag';
            tag.value = p.tag;
            tag.placeholder = 'TonFormel';
            tag.addEventListener('change', function(){
                var err = window.PDM.Profiles.validateTag(tag.value);
                if (err) { window.PDM.UI.notif(err, 'err'); return; }
                window.PDM.Profiles.edit(p.id, {tag: tag.value});
                A.reloadTags();
            });

            tagWrap.appendChild(tagPrefix);
            tagWrap.appendChild(tag);
            identity.appendChild(idBadge);
            identity.appendChild(tagWrap);

            var actions = document.createElement('div');
            actions.className = 'profile-head-actions';

            var tw = document.createElement('label');
            tw.className = 'toggle-wrap';
            var cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.checked = p.active;
            var label = document.createTextNode(p.active ? ' Actif' : ' Inactif');
            cb.addEventListener('change', function(){
                window.PDM.Profiles.edit(p.id, {active: cb.checked});
                label.textContent = cb.checked ? ' Actif' : ' Inactif';
                A.reloadTags();
            });
            tw.appendChild(cb);
            tw.appendChild(label);

            var del = document.createElement('button');
            del.type = 'button';
            del.className = 'profile-del';
            del.textContent = '\u00D7';
            del.title = 'Supprimer';
            del.addEventListener('click', function(){
                window.PDM.Profiles.del(p.id);
                A.rebuildProfileList();
                A.reloadTags();
            });

            actions.appendChild(tw);
            actions.appendChild(del);

            head.appendChild(orderCol);
            head.appendChild(identity);
            head.appendChild(actions);

            var ta = document.createElement('textarea');
            ta.className = 'profile-prompt';
            ta.value = p.prompt;
            ta.placeholder = 'Instructions pour ce profil...';
            ta.addEventListener('input', window.PDM.UI.debounce(function(){
                window.PDM.Profiles.edit(p.id, {prompt: ta.value});
            }, 300));

            div.appendChild(head);
            div.appendChild(ta);

            if (p.origin && p.origin.method) {
                var originBox = document.createElement('details');
                originBox.className = 'profile-origin-box';

                var originSum = document.createElement('summary');
                originSum.className = 'profile-origin-summary';
                originSum.textContent = 'Provenance : ' + A._profileOriginLabel(p.origin);

                var originBody = document.createElement('div');
                originBody.className = 'profile-origin-body';

                function addOriginField(label, value) {
                    if (value == null || value === '') return;
                    var wrap = document.createElement('div');
                    wrap.className = 'profile-origin-field';
                    var lbl = document.createElement('div');
                    lbl.className = 'profile-origin-label';
                    lbl.textContent = label;
                    var pre = document.createElement('pre');
                    pre.className = 'profile-origin-value';
                    pre.textContent = String(value);
                    wrap.appendChild(lbl);
                    wrap.appendChild(pre);
                    originBody.appendChild(wrap);
                }

                addOriginField('M\u00e9thode', p.origin.method);
                addOriginField('Date', p.origin.generatedAt || p.origin.createdAt);
                addOriginField('Fournisseur', p.origin.provider);
                addOriginField('Mod\u00e8le', p.origin.model);
                addOriginField('Fichier source', p.origin.sourceFile);
                addOriginField('Prompt syst\u00e8me (g\u00e9n\u00e9ration)', p.origin.systemPrompt);
                addOriginField('Message utilisateur (g\u00e9n\u00e9ration)', p.origin.userPrompt);

                originBox.appendChild(originSum);
                originBox.appendChild(originBody);
                div.appendChild(originBox);
            }

            box.appendChild(div);
        })(list[i], i, list.length);
    }

    if (window.PDM.PolishTextareaResize && window.PDM.PolishTextareaResize.scan) {
        window.PDM.PolishTextareaResize.scan(box);
    }
};

})();
