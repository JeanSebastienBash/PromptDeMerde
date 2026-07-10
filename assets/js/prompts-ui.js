/**
 * PromptDeMerde.com — prompts-ui.js
 *
 * Synopsis : UI onglet Prompts — cœur (prompt système, contextes, bindings).
 * Objectif : Synchroniser textareas/toggles et brancher les événements ; génération dans prompts-ui-generate.js, liste/DnD dans prompts-ui-list.js.
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

A.getSystemPromptDisplayValue = function() {
    return window.PDM.Storage.getSystemPromptEffective();
};

A._promptTemplateBindings = [
    { id: 'context-gen-system', get: 'getContextGenSystemEffective', set: 'setContextGenSystem' },
    { id: 'context-gen-user-intent', get: 'getContextGenUserIntentEffective', set: 'setContextGenUserIntent' },
    { id: 'context-gen-user-title', get: 'getContextGenUserTitleEffective', set: 'setContextGenUserTitle' },
    { id: 'context-inject-header', get: 'getContextInjectHeaderEffective', set: 'setContextInjectHeader' },
    { id: 'context-gen-tag-intent-suffix', get: 'getContextGenTagIntentSuffixEffective', set: 'setContextGenTagIntentSuffix' },
    { id: 'context-gen-forced-tag-system-suffix', get: 'getContextGenForcedTagSystemSuffixEffective', set: 'setContextGenForcedTagSystemSuffix' },
    { id: 'context-gen-retry-system-suffix', get: 'getContextGenRetrySystemSuffixEffective', set: 'setContextGenRetrySystemSuffix' },
    { id: 'context-gen-retry-user-suffix', get: 'getContextGenRetryUserSuffixEffective', set: 'setContextGenRetryUserSuffix' },
    { id: 'context-profile-line-template', get: 'getContextProfileLineTemplateEffective', set: 'setContextProfileLineTemplate' }
];

A.syncContextGenParams = function(forceValue) {
    var S = window.PDM.Storage;
    var bindings = [
        { id: 'context-gen-max-tokens', get: 'getContextGenMaxTokens', set: 'setContextGenMaxTokens', parse: parseInt },
        { id: 'context-gen-temperature', get: 'getContextGenTemperature', set: 'setContextGenTemperature', parse: parseFloat },
        { id: 'context-gen-retry-temperature', get: 'getContextGenRetryTemperature', set: 'setContextGenRetryTemperature', parse: parseFloat },
        { id: 'context-gen-max-retries', get: 'getContextGenMaxRetries', set: 'setContextGenMaxRetries', parse: parseInt }
    ];
    for (var i = 0; i < bindings.length; i++) {
        var b = bindings[i];
        var el = document.getElementById(b.id);
        if (!el || typeof S[b.get] !== 'function') continue;
        if (forceValue || document.activeElement !== el) el.value = String(S[b.get]());
    }
    var schemaEl = document.getElementById('context-gen-json-schema');
    if (schemaEl && typeof S.getContextGenJsonSchemaEffective === 'function') {
        if (forceValue || document.activeElement !== schemaEl) {
            schemaEl.value = JSON.stringify(S.getContextGenJsonSchemaEffective(), null, 2);
        }
    }
};

A.syncContextGenTextareas = function(forceValue) {
    var S = window.PDM.Storage;
    for (var i = 0; i < A._promptTemplateBindings.length; i++) {
        var b = A._promptTemplateBindings[i];
        var el = document.getElementById(b.id);
        if (!el || typeof S[b.get] !== 'function') continue;
        var val = S[b.get]();
        if (forceValue || document.activeElement !== el) el.value = val;
    }
    A.syncContextGenParams(forceValue);
};

A.syncSystemPromptTextarea = function(forceValue) {
    var sys = document.getElementById('prompts-system');
    if (!sys) return;
    var effective = A.getSystemPromptDisplayValue();
    sys.placeholder = effective || 'Prompt système du profil actif...';
    if (forceValue || document.activeElement !== sys) {
        sys.value = effective;
    }
};

A.updateSystemPromptUI = function() {
    var enabled = window.PDM.Storage.isSystemPromptEnabled();
    var cb = document.getElementById('system-prompt-enabled');
    var label = document.getElementById('system-prompt-toggle-label');
    var sys = document.getElementById('prompts-system');
    if (cb) cb.checked = enabled;
    if (label) label.textContent = enabled ? ' Actif' : ' Inactif';
    A.syncSystemPromptTextarea(false);
    if (sys) {
        sys.style.opacity = enabled ? '1' : '0.55';
    }
    A.updateContextInjectUI();
    A.updateWorkspacePromptGuard();
};

A.refreshPrompts = function() {
    A.syncSystemPromptTextarea(true);
    A.syncContextGenTextareas(true);
    A.updateSystemPromptUI();
    A.rebuildProfileList();
    A.reloadTags();
};

A.flushPromptsFromDom = function() {
    var sys = document.getElementById('prompts-system');
    if (sys) {
        var domVal = sys.value;
        var stored = window.PDM.Storage.getSystemPrompt();
        /* Textarea vide au boot tant que l’onglet Prompts n’a pas été ouvert : ne pas écraser le bundle profil. */
        if (domVal.trim() || !String(stored || '').trim()) {
            window.PDM.Storage.set(window.PDM.Storage.KEYS.SYSTEM_PROMPT, domVal);
        }
    }
    var box = document.getElementById('profiles-list');
    if (!box) return;
    var items = box.querySelectorAll('.profile-item[data-profile-id]');
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var id = item.getAttribute('data-profile-id');
        if (!id) continue;
        var tagInp = item.querySelector('.profile-tag');
        var ta = item.querySelector('.profile-prompt');
        var patch = {};
        if (tagInp) patch.tag = tagInp.value;
        if (ta) patch.prompt = ta.value;
        if (Object.keys(patch).length) {
            window.PDM.Profiles.edit(id, patch);
        }
    }
};

/* ===== PROMPTS ===== */
A.bindPrompts = function() {
    if (A._promptsBound) return;
    A._promptsBound = true;

    var debounceInput = window.PDM.UI.debounce;

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
        sysTextarea.addEventListener('input', debounceInput(function(){
            window.PDM.Storage.set(window.PDM.Storage.KEYS.SYSTEM_PROMPT, sysTextarea.value);
        }, 300));
    }

    var sysToggle = document.getElementById('system-prompt-enabled');
    if (sysToggle) {
        sysToggle.addEventListener('change', function(){
            window.PDM.Storage.setSystemPromptEnabled(sysToggle.checked);
            A.updateSystemPromptUI();
            window.PDM.UI.notif(sysToggle.checked ? 'Prompt syst\u00e8me activ\u00e9.' : 'Prompt syst\u00e8me d\u00e9sactiv\u00e9.', 'ok');
        });
    }

    var ctxGenSys = document.getElementById('context-gen-system');
    if (ctxGenSys) {
        ctxGenSys.addEventListener('input', debounceInput(function(){
            window.PDM.Storage.setContextGenSystem(ctxGenSys.value);
        }, 300));
    }
    var ctxGenIntent = document.getElementById('context-gen-user-intent');
    if (ctxGenIntent) {
        ctxGenIntent.addEventListener('input', debounceInput(function(){
            window.PDM.Storage.setContextGenUserIntent(ctxGenIntent.value);
        }, 300));
    }
    var ctxGenTitle = document.getElementById('context-gen-user-title');
    if (ctxGenTitle) {
        ctxGenTitle.addEventListener('input', debounceInput(function(){
            window.PDM.Storage.setContextGenUserTitle(ctxGenTitle.value);
        }, 300));
    }
    for (var ti = 3; ti < A._promptTemplateBindings.length; ti++) {
        (function(binding) {
            var el = document.getElementById(binding.id);
            if (!el) return;
            el.addEventListener('input', debounceInput(function() {
                if (typeof window.PDM.Storage[binding.set] === 'function') {
                    window.PDM.Storage[binding.set](el.value);
                }
            }, 300));
        })(A._promptTemplateBindings[ti]);
    }

    var genParamBindings = [
        { id: 'context-gen-max-tokens', set: 'setContextGenMaxTokens', parse: parseInt },
        { id: 'context-gen-temperature', set: 'setContextGenTemperature', parse: parseFloat },
        { id: 'context-gen-retry-temperature', set: 'setContextGenRetryTemperature', parse: parseFloat },
        { id: 'context-gen-max-retries', set: 'setContextGenMaxRetries', parse: parseInt }
    ];
    for (var gi = 0; gi < genParamBindings.length; gi++) {
        (function(binding) {
            var el = document.getElementById(binding.id);
            if (!el) return;
            el.addEventListener('change', function() {
                if (typeof window.PDM.Storage[binding.set] === 'function') {
                    window.PDM.Storage[binding.set](binding.parse(el.value, 10));
                }
            });
        })(genParamBindings[gi]);
    }
    var schemaEl = document.getElementById('context-gen-json-schema');
    if (schemaEl) {
        schemaEl.addEventListener('change', function() {
            try {
                var parsed = JSON.parse(schemaEl.value);
                window.PDM.Storage.setContextGenJsonSchema(parsed);
            } catch (e) {
                window.PDM.UI.notif('Schéma JSON invalide — modification ignorée.', 'err');
            }
        });
    }

    A.bindProfileListDnD();
    if (window.PDM.PolishTextareaResize && window.PDM.PolishTextareaResize.scan) {
        window.PDM.PolishTextareaResize.scan(document.getElementById('section-prompts'));
    }
};

})();
