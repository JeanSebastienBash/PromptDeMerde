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

function prT(key, vars) {
    var I = window.PDM && window.PDM.I18n;
    return I ? I.t('prompts.' + key, vars) : '';
}

function prTHtml(key, vars) {
    var I = window.PDM && window.PDM.I18n;
    return I ? I.tHtml('prompts.' + key, vars) : '';
}

A.updateContextInjectUI = function() {
    var pos = window.PDM.Storage.getContextPosition();
    var isBefore = pos === 'before_system';
    var systemOn = window.PDM.Storage.isSystemPromptEnabled();
    var diagram = document.getElementById('context-inject-diagram');
    var systemLine = systemOn
        ? prTHtml('injectSystemOn0')
        : prTHtml('injectSystemOff0');
    var systemLineAfter = systemOn
        ? prTHtml('injectSystemOn1')
        : prTHtml('injectSystemOff1');
    if (diagram) {
        if (isBefore) {
            diagram.innerHTML =
                prTHtml('injectContexts0') +
                systemLineAfter +
                prT('injectUserMessage') +
                prT('injectCleanText');
        } else {
            diagram.innerHTML =
                systemLine +
                prTHtml('injectContexts1') +
                prT('injectUserMessage') +
                prT('injectCleanText');
        }
    }
    var after = document.getElementById('context-inject-after');
    var before = document.getElementById('context-inject-before');
    if (after) after.checked = !isBefore;
    if (before) before.checked = isBefore;
};

A.getSystemPromptDisplayValue = function() {
    return window.PDM.Storage.getSystemPrompt
        ? window.PDM.Storage.getSystemPrompt()
        : '';
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

A._contextGenParamBindings = [
    {
        advancedId: 'context-gen-max-tokens',
        intentId: 'context-intent-max-tokens',
        get: 'getContextGenMaxTokens',
        set: 'setContextGenMaxTokens',
        parse: parseInt
    },
    {
        advancedId: 'context-gen-temperature',
        intentId: 'context-intent-temperature',
        get: 'getContextGenTemperature',
        set: 'setContextGenTemperature',
        parse: parseFloat
    },
    {
        advancedId: 'context-gen-retry-temperature',
        intentId: 'context-intent-retry-temperature',
        get: 'getContextGenRetryTemperature',
        set: 'setContextGenRetryTemperature',
        parse: parseFloat
    },
    {
        advancedId: 'context-gen-max-retries',
        intentId: 'context-intent-max-retries',
        get: 'getContextGenMaxRetries',
        set: 'setContextGenMaxRetries',
        parse: parseInt
    }
];

A.syncContextGenParams = function(forceValue) {
    var S = window.PDM.Storage;
    var bindings = A._contextGenParamBindings;
    for (var i = 0; i < bindings.length; i++) {
        var b = bindings[i];
        if (typeof S[b.get] !== 'function') continue;
        var val = String(S[b.get]());
        var ids = [b.advancedId, b.intentId];
        for (var j = 0; j < ids.length; j++) {
            var el = document.getElementById(ids[j]);
            if (!el) continue;
            if (forceValue || document.activeElement !== el) el.value = val;
        }
    }
    var schemaEl = document.getElementById('context-gen-json-schema');
    if (schemaEl && typeof S.getContextGenJsonSchemaEffective === 'function') {
        if (forceValue || document.activeElement !== schemaEl) {
            schemaEl.value = JSON.stringify(S.getContextGenJsonSchemaEffective(), null, 2);
        }
    }
};

A.applyContextGenParamFromInput = function(el) {
    if (!el || !el.id) return;
    var S = window.PDM.Storage;
    var bindings = A._contextGenParamBindings;
    for (var i = 0; i < bindings.length; i++) {
        var b = bindings[i];
        if (el.id !== b.advancedId && el.id !== b.intentId) continue;
        if (typeof S[b.set] !== 'function') return;
        S[b.set](b.parse(el.value, 10));
        var mirrorId = el.id === b.advancedId ? b.intentId : b.advancedId;
        var mirror = document.getElementById(mirrorId);
        if (mirror && document.activeElement !== mirror) {
            mirror.value = String(S[b.get]());
        }
        return;
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
    var stored = A.getSystemPromptDisplayValue();
    sys.placeholder = prT('systemProfilePlaceholder');
    if (forceValue || document.activeElement !== sys) {
        sys.value = stored;
    }
};

A.syncImagePromptUI = function(forceValue) {
    var ta = document.getElementById('image-prompt');
    if (ta) {
        var effective = window.PDM.Storage.getImagePromptEffective
            ? window.PDM.Storage.getImagePromptEffective()
            : '';
        if (forceValue || document.activeElement !== ta) {
            ta.value = effective;
        }
    }
    A.syncImageModelSelect();
};

A.syncImageModelSelect = function() {
    var sel = document.getElementById('image-model-select');
    if (!sel) return;
    var CS = window.PDM && window.PDM.ConfigSchema;
    var list = CS && Array.isArray(CS.IMAGE_VISION_MODELS) ? CS.IMAGE_VISION_MODELS : [];
    var current = window.PDM.Storage.getImageModel ? window.PDM.Storage.getImageModel() : '';
    sel.innerHTML = '';
    for (var i = 0; i < list.length; i++) {
        var opt = document.createElement('option');
        opt.value = list[i];
        opt.textContent = list[i];
        if (list[i] === current) opt.selected = true;
        sel.appendChild(opt);
    }
    if (current && list.indexOf(current) < 0) {
        var orphan = document.createElement('option');
        orphan.value = current;
        orphan.textContent = current;
        orphan.selected = true;
        sel.appendChild(orphan);
    }
    A.syncImagePullHint(sel.value || current);
};

A.syncImagePullHint = function(model) {
    var hint = document.getElementById('image-prompt-pull-hint');
    if (!hint) return;
    var id = model || (window.PDM.Storage.getImageModel ? window.PDM.Storage.getImageModel() : 'moondream');
    var I = window.PDM && window.PDM.I18n;
    var html = I ? I.tHtml('prompts.imageConfigPullHint', { model: id }) : '';
    if (!html || String(html).indexOf('prompts.imageConfigPullHint') === 0) {
        html = 'Vous devez installer ce modèle : (<code>ollama pull ' + String(id) + '</code>)';
    }
    hint.innerHTML = html;
};

A.updateSystemPromptUI = function() {
    var enabled = window.PDM.Storage.isSystemPromptEnabled();
    var cb = document.getElementById('system-prompt-enabled');
    var label = document.getElementById('system-prompt-toggle-label');
    var sys = document.getElementById('prompts-system');
    if (cb) cb.checked = enabled;
    if (label) label.textContent = enabled ? prT('systemActive') : prT('systemInactive');
    A.syncSystemPromptTextarea(false);
    if (sys) {
        sys.style.opacity = enabled ? '1' : '0.55';
    }
    A.updateContextInjectUI();
    A.updateWorkspacePromptGuard();
};

A.refreshPrompts = function() {
    A.syncSystemPromptTextarea(true);
    A.syncImagePromptUI(true);
    A.syncContextGenTextareas(true);
    A.updateSystemPromptUI();
    A.updatePromptsLocaleHint();
    if (typeof A.syncContextGenModelSelect === 'function') A.syncContextGenModelSelect();
    A.rebuildProfileList();
    A.reloadTags();
};

A.flushPromptsFromDom = function() {
    var sys = document.getElementById('prompts-system');
    if (sys) {
        var domVal = sys.value;
        var stored = window.PDM.Storage.getSystemPrompt();
        if (domVal.trim() || !String(stored || '').trim()) {
            window.PDM.Storage.set(window.PDM.Storage.KEYS.SYSTEM_PROMPT, domVal);
        }
    }
    var imgTa = document.getElementById('image-prompt');
    if (imgTa && typeof window.PDM.Storage.setImagePrompt === 'function') {
        var imgVal = imgTa.value;
        var imgStored = window.PDM.Storage.getImagePrompt ? window.PDM.Storage.getImagePrompt() : '';
        if (imgVal.trim() || !String(imgStored || '').trim()) {
            window.PDM.Storage.setImagePrompt(imgVal);
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
    var PBun = window.PDM && window.PDM.PromptsBundle;
    var S = window.PDM.Storage;
    if (PBun && S && typeof PBun.captureFromSession === 'function') {
        var locale = S.getLanguage ? S.getLanguage() : 'fr';
        var profileId = S.getActiveProfile ? S.getActiveProfile() : '';
        PBun.captureFromSession(locale, profileId);
    }
};

A.flushGenPromptsFromDom = function() {
    var S = window.PDM.Storage;
    if (!S) return;
    for (var ti = 0; ti < A._promptTemplateBindings.length; ti++) {
        var binding = A._promptTemplateBindings[ti];
        var el = document.getElementById(binding.id);
        if (!el || typeof S[binding.set] !== 'function') continue;
        S[binding.set](el.value);
    }
};

A.updatePromptsLocaleHint = function() {
    var el = document.getElementById('prompts-locale-hint');
    if (!el) return;
    var PBun = window.PDM && window.PDM.PromptsBundle;
    var meta = PBun && typeof PBun.getLocaleMeta === 'function'
        ? PBun.getLocaleMeta()
        : { requested: '', resolved: '', fallback: false };
    if (meta.fallback && meta.requested && meta.resolved && meta.requested !== meta.resolved) {
        el.textContent = prT('localeFallback', {
            requested: meta.requested.toUpperCase(),
            resolved: meta.resolved.toUpperCase()
        });
    } else {
        el.textContent = prT('systemEditHint');
    }
    el.hidden = !el.textContent;
};

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
        sysTextarea.addEventListener('blur', function(){
            window.PDM.Storage.set(window.PDM.Storage.KEYS.SYSTEM_PROMPT, sysTextarea.value);
        });
    }

    var imagePromptTa = document.getElementById('image-prompt');
    if (imagePromptTa && typeof window.PDM.Storage.setImagePrompt === 'function') {
        imagePromptTa.addEventListener('input', debounceInput(function() {
            window.PDM.Storage.setImagePrompt(imagePromptTa.value);
        }, 300));
        imagePromptTa.addEventListener('blur', function() {
            window.PDM.Storage.setImagePrompt(imagePromptTa.value);
        });
    }

    var imageModelSel = document.getElementById('image-model-select');
    if (imageModelSel && typeof window.PDM.Storage.setImageModel === 'function') {
        imageModelSel.addEventListener('change', function() {
            window.PDM.Storage.setImageModel(imageModelSel.value);
            A.syncImagePullHint(imageModelSel.value);
            window.PDM.UI.notif(prT('imageModelSavedNotif', { model: imageModelSel.value }), 'ok');
        });
    }

    var ctxGenModelSel = document.getElementById('context-gen-model-select');
    if (ctxGenModelSel) {
        ctxGenModelSel.addEventListener('change', function(){
            A.handleContextGenModelChange();
        });
    }

    var ctxGenCancelBtn = document.getElementById('context-generate-cancel-btn');
    if (ctxGenCancelBtn) {
        ctxGenCancelBtn.addEventListener('click', function(){
            A.cancelContextGeneration();
        });
    }

    var sysToggle = document.getElementById('system-prompt-enabled');
    if (sysToggle) {
        sysToggle.addEventListener('change', function(){
            window.PDM.Storage.setSystemPromptEnabled(sysToggle.checked);
            A.updateSystemPromptUI();
            window.PDM.UI.notif(sysToggle.checked ? prT('systemEnabledNotif') : prT('systemDisabledNotif'), 'ok');
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

    var genParamBindings = A._contextGenParamBindings || [];
    for (var gi = 0; gi < genParamBindings.length; gi++) {
        (function(binding) {
            var ids = [binding.advancedId, binding.intentId];
            for (var j = 0; j < ids.length; j++) {
                var el = document.getElementById(ids[j]);
                if (!el) continue;
                el.addEventListener('change', function() {
                    A.applyContextGenParamFromInput(this);
                });
            }
        })(genParamBindings[gi]);
    }
    var schemaEl = document.getElementById('context-gen-json-schema');
    if (schemaEl) {
        schemaEl.addEventListener('change', function() {
            try {
                var parsed = JSON.parse(schemaEl.value);
                window.PDM.Storage.setContextGenJsonSchema(parsed);
            } catch (e) {
                window.PDM.UI.notif(prT('invalidJsonSchema'), 'err');
            }
        });
    }

    var intentOptsBtn = document.getElementById('context-intent-options-btn');
    var intentOptsPanel = document.getElementById('context-intent-options-panel');
    if (intentOptsBtn && intentOptsPanel) {
        intentOptsBtn.addEventListener('click', function() {
            var open = intentOptsPanel.hidden;
            intentOptsPanel.hidden = !open;
            intentOptsBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
            if (open) intentOptsBtn.classList.add('is-open');
            else intentOptsBtn.classList.remove('is-open');
        });
    }

    A.bindProfileListDnD();
    A.syncImagePromptUI(true);
    if (window.PDM.PolishTextareaResize && window.PDM.PolishTextareaResize.scan) {
        window.PDM.PolishTextareaResize.scan(document.getElementById('section-prompts'));
    }
};

})();
