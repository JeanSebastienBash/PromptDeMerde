/**
 * PromptDeMerde.com — prompts-ui-generate.js
 *
 * Synopsis : Création/génération de contextes (onglet Prompts).
 * Objectif : Ajout manuel et génération assistée par IA (intention/titre), parsing et retries JSON.
 */
(function(){
"use strict";

var A = window.PDM && window.PDM.App;
if (!A) { console.warn('[prompts-ui-generate] PDM.App not found.'); return; }

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
    var obj = window.PDM.Profiles.add(tag, prompt, {
        method: 'manual',
        createdAt: new Date().toISOString()
    });
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
    var CG = window.PDM.ContextGeneration;
    var user = CG ? CG.buildUserFromIntent(intent, suggestedTag, false) : intent;
    A._runContextGeneration(user, statusEl, btn, 'G\u00e9n\u00e9rer le meilleur contexte', null, suggestedTag, 'ai_intent');
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
    var CG = window.PDM.ContextGeneration;
    var user = CG ? CG.buildUserFromTitle(title, false) : title;
    A._runContextGeneration(user, statusEl, btn, 'G\u00e9n\u00e9rer le prompt', function(obj) {
        if (titleInp) titleInp.value = '';
    }, title, 'ai_title');
};

A._parseContextGenerationResponse = function(data) {
    var raw = (data && data.result) ? String(data.result) : '';
    if (!raw.trim() && data && data.thinking) raw = String(data.thinking);
    raw = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
    var parsed = null;
    try {
        parsed = JSON.parse(raw);
    } catch (e1) {
        var m = raw.match(/\{[\s\S]*\}/);
        if (m) {
            try { parsed = JSON.parse(m[0]); } catch (e2) { parsed = null; }
        }
    }
    return parsed;
};

A._pickContextField = function(obj, names) {
    if (!obj || typeof obj !== 'object') return '';
    for (var i = 0; i < names.length; i++) {
        var key = names[i];
        if (obj[key] != null && String(obj[key]).trim()) return String(obj[key]).trim();
    }
    var lowerMap = {};
    for (var k in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, k)) {
            lowerMap[String(k).toLowerCase()] = obj[k];
        }
    }
    for (var j = 0; j < names.length; j++) {
        var lk = names[j].toLowerCase();
        if (lowerMap[lk] != null && String(lowerMap[lk]).trim()) return String(lowerMap[lk]).trim();
    }
    return '';
};

A._normalizeContextGenerationPayload = function(parsed) {
    if (!parsed || typeof parsed !== 'object') return null;
    var prompt = A._pickContextField(parsed, ['prompt', 'instructions', 'instruction', 'text', 'content', 'body']);
    var tag = A._pickContextField(parsed, ['tag', 'name', 'title', 'label']);
    if (!prompt) return null;
    return { tag: tag, prompt: prompt };
};

A._CONTEXT_JSON_FORMAT = null;

A._getContextJsonFormat = function() {
    if (window.PDM.Storage && typeof window.PDM.Storage.getContextGenJsonSchemaEffective === 'function') {
        return window.PDM.Storage.getContextGenJsonSchemaEffective();
    }
    var CS = window.PDM && window.PDM.ConfigSchema;
    return CS && CS.DEFAULT_CONTEXT_GEN_JSON_SCHEMA
        ? CS.DEFAULT_CONTEXT_GEN_JSON_SCHEMA
        : { type: 'object', properties: { tag: { type: 'string' }, prompt: { type: 'string' } }, required: ['tag', 'prompt'], additionalProperties: false };
};

A._buildContextGenerationSystem = function(forcedTag, isRetry) {
    var CG = window.PDM.ContextGeneration;
    if (CG && typeof CG.buildSystemPrompt === 'function') {
        return CG.buildSystemPrompt(forcedTag, isRetry);
    }
    return '';
};

A._buildContextGenerationUser = function(userPrompt, isRetry, genMethod, forcedTag, rawIntent) {
    var CG = window.PDM.ContextGeneration;
    if (CG && genMethod === 'ai_intent' && rawIntent != null) {
        var suggested = forcedTag || window.PDM.Profiles.extractSuggestedTag(rawIntent);
        return CG.buildUserFromIntent(rawIntent, suggested, isRetry);
    }
    if (CG && genMethod === 'ai_title' && forcedTag) {
        return CG.buildUserFromTitle(forcedTag, isRetry);
    }
    var user = String(userPrompt || '').trim();
    if (isRetry && CG) {
        user += CG.RETRY_USER_SUFFIX;
    }
    return user;
};

A._tryParseContextGeneration = function(data) {
    return A._normalizeContextGenerationPayload(A._parseContextGenerationResponse(data));
};

A._completeContextGeneration = function(provider, model, sys, userPrompt, llmOptions) {
    return window.PDM.LLM.complete(provider, model, null, sys, userPrompt, llmOptions);
};

A._runContextGeneration = function(userPrompt, statusEl, btn, btnDefaultText, onSuccess, forcedTag, genMethod) {
    if (window.PDM.Profiles.maxReached()) {
        window.PDM.UI.notif('Limite de prompts atteinte.', 'err');
        return;
    }
    var provider = A.getActiveProviderId();
    var adapter = A.getActiveProvider();
    var model = window.PDM.Storage.get(window.PDM.Storage.KEYS.MODEL) || window.PDM.Providers.defaultModel(provider);
    if (!model || !String(model).trim()) {
        window.PDM.UI.notif('Choisis un mod\u00e8le Ollama dans Options.', 'err');
        if (statusEl) statusEl.textContent = '\u274c Aucun mod\u00e8le LLM s\u00e9lectionn\u00e9 (Options).';
        return;
    }
    if (btn) { btn.disabled = true; btn.textContent = '\u23F3 G\u00e9n\u00e9ration...'; }
    if (statusEl) {
        statusEl.textContent = adapter ? adapter.formatStatusInProgress(model) : 'G\u00e9n\u00e9ration en cours...';
    }

    var rawIntent = genMethod === 'ai_intent' ? String(userPrompt || '').replace(/^\s*G[\u00e9e]n[\u00e8e]re[^\n]*\n?/i, '').trim() : null;
    if (genMethod === 'ai_intent') {
        var intentTa = document.getElementById('context-generate-intent');
        if (intentTa && intentTa.value.trim()) rawIntent = intentTa.value.trim();
    }

    function finishWithParsed(parsed, genMeta) {
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
        var origin = {
            method: genMethod || 'ai_intent',
            generatedAt: new Date().toISOString(),
            provider: provider,
            model: model,
            systemPrompt: genMeta && genMeta.systemPrompt ? genMeta.systemPrompt : '',
            userPrompt: genMeta && genMeta.userPrompt ? genMeta.userPrompt : userPrompt
        };
        var obj = window.PDM.Profiles.add(tag, String(parsed.prompt).trim(), origin);
        if (!obj) throw new Error('Limite de prompts atteinte.');
        A.rebuildProfileList();
        A.reloadTags();
        if (statusEl) statusEl.textContent = 'Prompt #' + obj.tag + ' g\u00e9n\u00e9r\u00e9 et ajout\u00e9.';
        window.PDM.UI.notif('Contexte g\u00e9n\u00e9r\u00e9 : #' + obj.tag, 'ok');
        if (onSuccess) onSuccess(obj);
    }

    function attempt(step) {
        var sys = A._buildContextGenerationSystem(forcedTag, step > 0);
        var user = A._buildContextGenerationUser(userPrompt, step > 0, genMethod, forcedTag, rawIntent);
        var useSchema = step === 0;
        var CG = window.PDM.ContextGeneration;
        var llmOptions = CG && typeof CG.getLlmOptions === 'function'
            ? CG.getLlmOptions(step)
            : {
                streaming: false,
                maxTokens: 512,
                format: useSchema ? A._getContextJsonFormat() : 'json',
                think: false,
                temperature: step === 0 ? 0.2 : 0.1
            };
        if (statusEl && step > 0) {
            statusEl.textContent = 'Nouvelle tentative (format JSON' + (useSchema ? ' schéma' : '') + ')...';
        }
        return A._completeContextGeneration(provider, model, sys, user, llmOptions).then(function(data) {
            var parsed = A._tryParseContextGeneration(data);
            if (parsed && parsed.prompt) {
                return { parsed: parsed, genMeta: { systemPrompt: sys, userPrompt: user } };
            }
            var preview = (data && data.result) ? String(data.result).trim().slice(0, 160) : '';
            if (preview) console.warn('[PDM.ContextGen] JSON non reconnu (étape ' + step + '):', preview);
            var maxRetries = CG && typeof CG.getMaxRetries === 'function' ? CG.getMaxRetries() : 2;
            if (step < maxRetries) return attempt(step + 1);
            throw new Error('Réponse IA illisible. Réessaie avec une description plus précise.');
        });
    }

    attempt(0).then(function(result) {
        finishWithParsed(result.parsed, result.genMeta);
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

})();
