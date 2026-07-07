/**
 * PromptDeMerde.com — Prompts de contexte et génération assistée.
 */
(function(){
"use strict";

var A = window.PDM && window.PDM.App;
if (!A) { console.warn('[prompts-ui] PDM.App not found.'); return; }

A.updateContextInjectUI = function() {
    var pos = window.PDM.Storage.getContextPosition();
    var isBefore = pos === 'before_system';
    var systemOn = window.PDM.Storage.isSystemPromptEnabled();
    var diagram = document.getElementById('context-inject-diagram');
    var systemLine = systemOn
        ? '\u2460 Le prompt syst\u00e8me (r\u00e8gles de base de l\u2019outil)\n'
        : '\u2460 <span class="inject-muted">Prompt syst\u00e8me (d\u00e9sactiv\u00e9)</span>\n';
    var systemLineAfter = systemOn
        ? '\u2461 Le prompt syst\u00e8me (r\u00e8gles de base de l\u2019outil)\n'
        : '\u2461 <span class="inject-muted">Prompt syst\u00e8me (d\u00e9sactiv\u00e9)</span>\n';
    if (diagram) {
        if (isBefore) {
            diagram.innerHTML =
                '\u2460 Tes prompts de contexte <span class="inject-highlight">(#TonFormel, etc.)</span>\n' +
                systemLineAfter +
                '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 message utilisateur (toujours en dernier)\n' +
                '\u2462 Ton texte \u00e0 nettoyer (zone du haut du Workspace)';
        } else {
            diagram.innerHTML =
                systemLine +
                '\u2461 Tes prompts de contexte <span class="inject-highlight">(#TonFormel, etc.)</span>\n' +
                '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 message utilisateur (toujours en dernier)\n' +
                '\u2462 Ton texte \u00e0 nettoyer (zone du haut du Workspace)';
        }
    }
    var after = document.getElementById('context-inject-after');
    var before = document.getElementById('context-inject-before');
    if (after) after.checked = !isBefore;
    if (before) before.checked = isBefore;
};

A.updateSystemPromptUI = function() {
    var enabled = window.PDM.Storage.isSystemPromptEnabled();
    var cb = document.getElementById('system-prompt-enabled');
    var label = document.getElementById('system-prompt-toggle-label');
    var sys = document.getElementById('prompts-system');
    if (cb) cb.checked = enabled;
    if (label) label.textContent = enabled ? ' Actif' : ' Inactif';
    if (sys) {
        sys.style.opacity = enabled ? '1' : '0.55';
    }
    A.updateContextInjectUI();
    A.updateWorkspacePromptGuard();
};

A.doQuickAddContext = function() {
    if (window.PDM.Profiles.maxReached()) {
        window.PDM.UI.notif('Limite de prompts atteinte (' + window.PDM.Storage.getMaxProfiles() + ' max).', 'err');
        return;
    }
    var tagInp = document.getElementById('context-new-tag');
    var promptTa = document.getElementById('context-new-prompt');
    var tag = tagInp ? tagInp.value.trim() : '';
    var prompt = promptTa ? promptTa.value.trim() : '';
    var err = window.PDM.Profiles.validateTag(tag);
    if (err) {
        window.PDM.UI.notif(err, 'err');
        return;
    }
    if (!prompt) {
        window.PDM.UI.notif('Saisis les instructions du contexte.', 'err');
        return;
    }
    var obj = window.PDM.Profiles.add(tag, prompt);
    if (!obj) {
        window.PDM.UI.notif('Impossible d\u2019ajouter le prompt.', 'err');
        return;
    }
    if (tagInp) tagInp.value = '';
    if (promptTa) promptTa.value = '';
    A.rebuildProfileList();
    A.reloadTags();
    window.PDM.UI.notif('Prompt #' + obj.tag + ' ajout\u00e9.', 'ok');
};

A.doGenerateContext = function() {
    var intentTa = document.getElementById('context-generate-intent');
    var statusEl = document.getElementById('context-generate-status');
    var btn = document.getElementById('context-generate-btn');
    var intent = intentTa ? intentTa.value.trim() : '';
    if (!intent) {
        window.PDM.UI.notif('D\u00e9cris d\u2019abord le comportement souhait\u00e9.', 'err');
        return;
    }
    var suggestedTag = window.PDM.Profiles.extractSuggestedTag(intent);
    if (suggestedTag) {
        var tagErr = window.PDM.Profiles.validateTag(suggestedTag);
        if (tagErr) {
            if (statusEl) statusEl.textContent = '\u274c ' + tagErr;
            window.PDM.UI.notif(tagErr, 'err');
            return;
        }
    }
    var user = 'G\u00e9n\u00e8re le meilleur prompt de contexte pour ce besoin :\n' + intent;
    if (suggestedTag) {
        user += '\n\nLe tag DOIT \u00eatre exactement "' + suggestedTag + '" (majuscule au d\u00e9but, sans di\u00e8se).';
    }
    A._runContextGeneration(user, statusEl, btn, 'G\u00e9n\u00e9rer le meilleur contexte', null, suggestedTag);
};

A.doGenerateContextFromTitle = function() {
    var titleInp = document.getElementById('context-title-input');
    var statusEl = document.getElementById('context-title-gen-status');
    var btn = document.getElementById('context-title-gen-btn');
    var title = titleInp ? window.PDM.Profiles.normalizeTag(titleInp.value.trim()) : '';
    if (!title) {
        window.PDM.UI.notif('Saisis d\u2019abord un titre (ex. TonFormel).', 'err');
        return;
    }
    var tagErr = window.PDM.Profiles.validateTag(title);
    if (tagErr) {
        window.PDM.UI.notif(tagErr, 'err');
        return;
    }
    var user = 'G\u00e9n\u00e8re le meilleur prompt de contexte pour un profil nomm\u00e9 #' + title + '.\n' +
        'Le tag doit \u00eatre exactement "' + title + '" (majuscule au d\u00e9but, sans espace).\n' +
        'Les instructions doivent d\u00e9crire pr\u00e9cis\u00e9ment le comportement attendu lors de la reformulation de prompts utilisateur, en coh\u00e9rence avec ce titre.';
    A._runContextGeneration(user, statusEl, btn, 'G\u00e9n\u00e9rer le prompt', function(obj) {
        if (titleInp) titleInp.value = '';
    }, title);
};

A._runContextGeneration = function(userPrompt, statusEl, btn, btnDefaultText, onSuccess, forcedTag) {
    if (window.PDM.Profiles.maxReached()) {
        window.PDM.UI.notif('Limite de prompts atteinte.', 'err');
        return;
    }
    var provider = A.getActiveProviderId();
    var model = window.PDM.Storage.get(window.PDM.Storage.KEYS.MODEL) || window.PDM.Providers.defaultModel(provider);
    if (btn) { btn.disabled = true; btn.textContent = '\u23F3 G\u00e9n\u00e9ration...'; }
    if (statusEl) {
        var adapter = A.getActiveProvider();
        statusEl.textContent = adapter ? adapter.formatStatusInProgress(model) : 'G\u00e9n\u00e9ration en cours...';
    }

    var sys = 'Tu es un expert en ing\u00e9nierie de prompts pour un outil de reformulation de prompts utilisateur.\n' +
        'R\u00e9ponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans commentaire.\n' +
        'Exemple de format (invente ton propre tag adapt\u00e9 au besoin, ne recopie pas cet exemple) :\n' +
        '{"tag":"UpperCase","prompt":"Reformule toujours le texte en majuscules."}\n' +
        'R\u00e8gles pour "tag" : un mot court commen\u00e7ant par une majuscule (ex. TonFormel, AntiBullshit), lettres et chiffres uniquement, sans di\u00e8se.';
    if (forcedTag) {
        sys += '\nLe champ "tag" DOIT \u00eatre exactement "' + forcedTag + '".';
    }

    var llmOptions = {
        streaming: true,
        maxTokens: 512,
        format: 'json',
        temperature: 0.3,
        onToken: function(fullText) {
            if (statusEl && fullText) {
                statusEl.textContent = 'R\u00e9ception en cours\u2026 (' + fullText.length + ' car.)';
            }
        }
    };

    window.PDM.LLM.complete(provider, model, null, sys, userPrompt, llmOptions).then(function(data){
        var raw = (data && data.result) ? data.result : '';
        var parsed = null;
        try {
            parsed = JSON.parse(raw.trim());
        } catch (e1) {
            var m = raw.match(/\{[\s\S]*\}/);
            if (m) {
                try { parsed = JSON.parse(m[0]); } catch (e2) { parsed = null; }
            }
        }
        if (!parsed || !parsed.prompt) {
            throw new Error('R\u00e9ponse IA illisible. R\u00e9essaie avec une description plus pr\u00e9cise.');
        }
        var tag = forcedTag || window.PDM.Profiles.normalizeTag(parsed.tag);
        var placeholderTags = /^(PascalCaseSansDi[eè]se|PascalCase|NomDuTag|TagName|ExampleTag|MonTag)$/i;
        if (!forcedTag && (!tag || placeholderTags.test(tag) || window.PDM.Profiles.validateTag(tag))) {
            var fromIntent = window.PDM.Profiles.extractSuggestedTag(userPrompt);
            if (fromIntent && !window.PDM.Profiles.validateTag(fromIntent)) {
                tag = fromIntent;
            }
        }
        if (!tag) {
            throw new Error('L\u2019IA n\u2019a pas propos\u00e9 de tag valide. Ajoute un tag dans ta description (ex. #UpperCase).');
        }
        var err = window.PDM.Profiles.validateTag(tag);
        if (err) {
            throw new Error(err + (parsed.tag ? ' (re\u00e7u : "' + parsed.tag + '")' : ''));
        }
        var obj = window.PDM.Profiles.add(tag, String(parsed.prompt).trim());
        if (!obj) throw new Error('Limite de prompts atteinte.');
        A.rebuildProfileList();
        A.reloadTags();
        if (statusEl) statusEl.textContent = 'Prompt #' + obj.tag + ' g\u00e9n\u00e9r\u00e9 et ajout\u00e9.';
        window.PDM.UI.notif('Contexte g\u00e9n\u00e9r\u00e9 : #' + obj.tag, 'ok');
        if (onSuccess) onSuccess(obj);
    }).catch(function(err){
        var msg = err.message || String(err);
        if (adapter && adapter.getErrorHints) {
            msg = adapter.getErrorHints(err, model);
        }
        if (statusEl) statusEl.textContent = '\u274c ' + msg;
        window.PDM.UI.notif('Erreur : ' + msg, 'err');
    }).finally(function(){
        if (btn) { btn.disabled = false; btn.textContent = btnDefaultText; }
    });
};

/* ===== PROMPTS ===== */
A.bindPrompts = function() {
    var add = document.getElementById('add-profile-btn');
    if (add) add.addEventListener('click', function(){ A.doAddProfile(); });

    var ctxAfter = document.getElementById('context-inject-after');
    var ctxBefore = document.getElementById('context-inject-before');
    if (ctxAfter) {
        ctxAfter.addEventListener('change', function(){
            if (ctxAfter.checked) {
                window.PDM.Storage.setContextPosition('after_system');
                A.updateContextInjectUI();
            }
        });
    }
    if (ctxBefore) {
        ctxBefore.addEventListener('change', function(){
            if (ctxBefore.checked) {
                window.PDM.Storage.setContextPosition('before_system');
                A.updateContextInjectUI();
            }
        });
    }

    var ctxAddBtn = document.getElementById('context-add-btn');
    if (ctxAddBtn) ctxAddBtn.addEventListener('click', function(){ A.doQuickAddContext(); });

    var ctxGenBtn = document.getElementById('context-generate-btn');
    if (ctxGenBtn) ctxGenBtn.addEventListener('click', function(){ A.doGenerateContext(); });

    var ctxTitleGenBtn = document.getElementById('context-title-gen-btn');
    if (ctxTitleGenBtn) ctxTitleGenBtn.addEventListener('click', function(){ A.doGenerateContextFromTitle(); });

    var sysTextarea = document.getElementById('prompts-system');
    if (sysTextarea) {
        sysTextarea.addEventListener('input', function(){
            window.PDM.Storage.set(window.PDM.Storage.KEYS.SYSTEM_PROMPT, sysTextarea.value);
        });
    }

    var sysToggle = document.getElementById('system-prompt-enabled');
    if (sysToggle) {
        sysToggle.addEventListener('change', function(){
            window.PDM.Storage.setSystemPromptEnabled(sysToggle.checked);
            A.updateSystemPromptUI();
            window.PDM.UI.notif(sysToggle.checked ? 'Prompt syst\u00e8me activ\u00e9.' : 'Prompt syst\u00e8me d\u00e9sactiv\u00e9.', 'ok');
        });
    }
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
        (function(p){
            var div = document.createElement('div');
            div.className = 'profile-item';

            var head = document.createElement('div');
            head.className = 'profile-head';

            var tag = document.createElement('input');
            tag.type = 'text';
            tag.className = 'profile-tag';
            tag.value = p.tag;
            tag.placeholder = '#TonFormel';
            tag.addEventListener('change', function(){
                var err = window.PDM.Profiles.validateTag(tag.value);
                if (err) { window.PDM.UI.notif(err, 'err'); return; }
                window.PDM.Profiles.edit(p.id, {tag: tag.value});
            });

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
            del.className = 'profile-del';
            del.textContent = '\u00D7';
            del.title = 'Supprimer';
            del.addEventListener('click', function(){
                window.PDM.Profiles.del(p.id);
                A.rebuildProfileList();
                A.reloadTags();
            });

            head.appendChild(tag);
            head.appendChild(tw);
            head.appendChild(del);

            var ta = document.createElement('textarea');
            ta.className = 'profile-prompt';
            ta.value = p.prompt;
            ta.placeholder = 'Instructions pour ce profil...';
            ta.addEventListener('change', function(){
                window.PDM.Profiles.edit(p.id, {prompt: ta.value});
            });

            div.appendChild(head);
            div.appendChild(ta);
            box.appendChild(div);
        })(list[i]);
    }

    var add = document.getElementById('add-profile-btn');
    if (add) add.disabled = window.PDM.Profiles.maxReached();
};

A.doAddProfile = function() {
    if (window.PDM.Profiles.maxReached()) {
        var max = window.PDM.Storage.getMaxProfiles();
        window.PDM.UI.notif('Limite de prompts atteinte (' + window.PDM.Storage.getMaxProfiles() + ' max).', 'err');
        return;
    }
    window.PDM.Profiles.add('NouveauPrompt', 'Description...');
    A.rebuildProfileList();
    A.reloadTags();
    window.PDM.UI.notif('Prompt ajout\u00e9.', 'ok');
};

})();
