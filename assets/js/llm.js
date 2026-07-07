/**
 * PromptDeMerde.com — Façade LLM générique (délégation aux providers).
 */
(function() {

function buildDefaultSystemPrompt() {
    return (
        'Tu es un Nettoyeur / Reformulateur de prompts.\n\n' +
        'RÔLE UNIQUE : reprendre le prompt de l\'utilisateur et le restituer en français correct, clair et fluide. Tu ne fais RIEN d\'autre.\n\n' +
        'RÈGLES :\n' +
        '1. REFORMULER mot pour mot l\'intention originale, en français correct (orthographe, grammaire, syntaxe, ponctuation).\n' +
        '2. NE JAMAIS interpréter, exécuter, analyser ou répondre à la demande.\n' +
        '3. NE JAMAIS poser de questions à l\'utilisateur.\n' +
        '4. NE JAMAIS demander de précisions, de contexte ou d\'exemples.\n' +
        '5. NE JAMAIS ajouter de sections, de structure ou de formatage qui ne sont pas dans le texte source.\n' +
        '6. NE JAMAIS inventer de contraintes, de compétences, de rôles ou de contexte qui ne sont pas déjà implicites dans le texte source.\n' +
        '7. Si une information essentielle est absolument indispensable et strictement indéductible du texte source, remplacer par [à préciser] UNE SEULE FOIS, entre crochets, sans commentaire.\n' +
        '8. Garder le même registre (tutoiement/vouvoiement) et le même ton que le texte source.\n' +
        '9. Supprimer les fautes de frappe, les répétitions, les anglicismes mal employés et les expressions familières inutiles, sauf si elles font partie du style voulu.\n' +
        '10. Préserver l\'ordre logique des idées ; on peut réorganiser l\'ordre des mots ou des phrases pour un français plus naturel.\n' +
        '11. La sortie doit être UNIQUEMENT le texte reformulé, sans préambule, sans conclusion, sans explication, sans markdown superflu.\n\n' +
        'EXEMPLES :\n' +
        '- Input : « il faut remonter le slogan vers le haut (là il est vers le bas de la vignette) putain ! »\n' +
        '  Output : « Il faut remonter le slogan vers le haut (actuellement, il est positionné vers le bas de la vignette). »\n' +
        '- Input : « fait moi un mail pour dire au client quon a recaler son offre car trop cherre »\n' +
        '  Output : « Rédige un mail au client pour l\'informer que son offre a été refusée en raison d\'un prix trop élevé. »\n\n' +
        'RAPPEL : tu es un nettoyeur de texte, pas un assistant conversationnel.'
    );
}

function buildProfilesBlock(profiles) {
    var active = profiles.filter(function(p){ return p.active; });
    if (!active.length) return '';
    var pb = '';
    for (var i = 0; i < active.length; i++) {
        pb += '- #' + active[i].tag + ' : ' + active[i].prompt + '\n';
    }
    return 'INSTRUCTIONS SUPPLÉMENTAIRES (profils actifs) :\n' + pb;
}

function buildSystemWithProfiles(systemPrompt, profiles) {
    var block = buildProfilesBlock(profiles);
    var systemEnabled = window.PDM.Storage && window.PDM.Storage.isSystemPromptEnabled
        ? window.PDM.Storage.isSystemPromptEnabled()
        : true;
    var base = '';
    if (systemEnabled) {
        base = systemPrompt || buildDefaultSystemPrompt();
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

function mergeLlmOptions(options) {
    var merged = {};
    var src = options || {};
    for (var k in src) {
        if (Object.prototype.hasOwnProperty.call(src, k)) merged[k] = src[k];
    }
    var modelId = merged.model;
    if (!modelId && window.PDM.Storage) {
        modelId = window.PDM.Storage.get(window.PDM.Storage.KEYS.MODEL);
    }
    var wantsThinking = window.PDM.Storage && window.PDM.Storage.isLlmThinkingEnabled
        ? window.PDM.Storage.isLlmThinkingEnabled()
        : false;
    var supportsThinking = window.PDM.Providers && window.PDM.Providers.modelSupportsThinking
        ? window.PDM.Providers.modelSupportsThinking(null, modelId)
        : false;
    merged.think = !!(wantsThinking && supportsThinking);
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
            return adapter.sniperise(model, sys, userPrompt, mergeLlmOptions(options));
        });
    },

    complete: function(provider, model, token, systemPrompt, userPrompt, options) {
        return getAdapter(provider).then(function(adapter) {
            return adapter.complete(model, systemPrompt, userPrompt, mergeLlmOptions(options));
        });
    },

    test: function(provider, model, token, baseUrl) {
        return getAdapter(provider).then(function(adapter) {
            return adapter.test(baseUrl);
        });
    }
};

})();
