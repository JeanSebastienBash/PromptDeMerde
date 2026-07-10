/**
 * PromptDeMerde.com — llm.js
 *
 * Synopsis : Façade générique PDM.LLM indépendante du provider.
 * Objectif : Assembler system+contextes, déléguer sniperise/complete/test au provider actif.
 */
(function() {

function buildDefaultSystemPrompt() {
    if (window.PDM.Storage && typeof window.PDM.Storage.getSystemPromptEffective === 'function') {
        return window.PDM.Storage.getSystemPromptEffective();
    }
    var CS = window.PDM && window.PDM.ConfigSchema;
    return CS ? CS.DEFAULT_SYSTEM_PROMPT : '';
}

function getContextInjectHeader() {
    if (window.PDM.Storage && typeof window.PDM.Storage.getContextInjectHeaderEffective === 'function') {
        return window.PDM.Storage.getContextInjectHeaderEffective();
    }
    var CS = window.PDM && window.PDM.ConfigSchema;
    return CS ? CS.DEFAULT_CONTEXT_INJECT_HEADER : '';
}

function applyLineTemplate(template, tag, prompt) {
    return String(template || '- #{{tag}} : {{prompt}}\n')
        .split('{{tag}}').join(String(tag))
        .split('{{prompt}}').join(String(prompt));
}

function buildProfilesBlock(profiles) {
    var active = profiles.filter(function(p){ return p.active; });
    if (!active.length) return '';
    var lineTpl = '- #{{tag}} : {{prompt}}\n';
    if (window.PDM.Storage && typeof window.PDM.Storage.getContextProfileLineTemplateEffective === 'function') {
        lineTpl = window.PDM.Storage.getContextProfileLineTemplateEffective();
    }
    var pb = '';
    for (var i = 0; i < active.length; i++) {
        pb += applyLineTemplate(lineTpl, active[i].tag, active[i].prompt);
    }
    return getContextInjectHeader() + pb;
}

function buildSystemWithProfiles(systemPrompt, profiles) {
    var block = buildProfilesBlock(profiles);
    var systemEnabled = window.PDM.Storage && window.PDM.Storage.isSystemPromptEnabled
        ? window.PDM.Storage.isSystemPromptEnabled()
        : true;
    var base = '';
    if (systemEnabled) {
        base = systemPrompt && String(systemPrompt).trim()
            ? systemPrompt
            : buildDefaultSystemPrompt();
    }
    if (!base) return block;
    if (!block) return base;
    var position = window.PDM.Storage.getContextPosition();
    if (position === 'before_system') {
        return block + '\n\n' + base;
    }
    return base + '\n\n' + block;
}

function getAdapter(providerId) {
    var id = providerId || window.PDM.Providers.getActiveId();
    var adapter = window.PDM.Providers.get(id);
    if (!adapter || !window.PDM.Providers.has(id)) {
        return Promise.reject(new Error('Provider LLM indisponible : ' + id));
    }
    return Promise.resolve(adapter);
}

function mergeLlmOptions(options, explicitModelId) {
    var merged = {};
    var src = options || {};
    for (var k in src) {
        if (Object.prototype.hasOwnProperty.call(src, k)) merged[k] = src[k];
    }
    var modelId = explicitModelId || merged.model;
    if (!modelId && window.PDM.Storage) {
        modelId = window.PDM.Storage.get(window.PDM.Storage.KEYS.MODEL);
    }
    var wantsThinking = window.PDM.Storage && window.PDM.Storage.isLlmThinkingEnabled
        ? window.PDM.Storage.isLlmThinkingEnabled()
        : false;
    var pid = window.PDM.Providers ? window.PDM.Providers.getActiveId() : null;
    var meta = window.PDM.Providers && window.PDM.Providers.modelMeta && modelId
        ? window.PDM.Providers.modelMeta(pid, modelId)
        : null;
    var knownUnsupported = !!(meta && meta.thinkingSupported === false);
    if (merged.think === undefined) {
        merged.think = !!(wantsThinking && !knownUnsupported);
    }
    if (merged.format === 'json' || (merged.format && typeof merged.format === 'object')) {
        merged.think = false;
    }
    return merged;
}

window.PDM = window.PDM || {};
window.PDM.LLM = {
    buildSystemWithProfiles: buildSystemWithProfiles,
    buildDefaultSystemPrompt: buildDefaultSystemPrompt,

    sniperise: function(provider, model, token, systemPrompt, profiles, userPrompt, options) {
        var sys = buildSystemWithProfiles(systemPrompt, profiles);
        if (!sys || !String(sys).trim()) {
            return Promise.reject(new Error('Aucune instruction pour le modèle : active le prompt système ou un prompt de contexte.'));
        }
        return getAdapter(provider).then(function(adapter) {
            return adapter.sniperise(model, sys, userPrompt, mergeLlmOptions(options, model));
        });
    },

    complete: function(provider, model, token, systemPrompt, userPrompt, options) {
        return getAdapter(provider).then(function(adapter) {
            return adapter.complete(model, systemPrompt, userPrompt, mergeLlmOptions(options, model));
        });
    },

    test: function(provider, model, token, baseUrl) {
        return getAdapter(provider).then(function(adapter) {
            return adapter.test(baseUrl);
        });
    }
};

})();
