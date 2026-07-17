/**
 * PromptDeMerde.com — workspace-input-chunk.js
 *
 * Synopsis : Découpe INPUT long pour inférence LLM sans toucher au STT.
 * Objectif : Éviter la saturation num_ctx en morceaux INPUT bornés.
 */
(function() {
'use strict';

var IC = window.PDM.InputChunk = window.PDM.InputChunk || {};


IC.PROMPT_CHAR_BUDGET = 10000;

IC.CHUNK_MAX_CHARS = 3200;

IC.CHUNK_FORCE_CHARS = 2800;
IC.CHUNK_MIN_CHARS = 1200;

IC.estimateProfilesChars = function(profiles) {
    var n = 0;
    (profiles || []).forEach(function(p) {
        if (!p || !p.active) return;
        n += String(p.tag || '').length + String(p.prompt || '').length + 16;
    });
    return n;
};

IC.estimateOverheadChars = function(sys, profiles) {
    return String(sys || '').length + IC.estimateProfilesChars(profiles) + 200;
};


IC.chunkSizeFor = function(sys, profiles) {
    var overhead = IC.estimateOverheadChars(sys, profiles);
    var room = IC.PROMPT_CHAR_BUDGET - overhead - 600;
    if (room < IC.CHUNK_MIN_CHARS) room = IC.CHUNK_MIN_CHARS;
    if (room > IC.CHUNK_MAX_CHARS) room = IC.CHUNK_MAX_CHARS;
    return room;
};

IC.shouldChunk = function(input, sys, profiles) {
    var text = String(input || '');
    if (text.length <= IC.CHUNK_FORCE_CHARS) {
        var overhead = IC.estimateOverheadChars(sys, profiles);
        return (overhead + text.length) > IC.PROMPT_CHAR_BUDGET;
    }
    return true;
};


IC.splitText = function(input, maxChars) {
    var text = String(input || '').trim();
    var max = Math.max(IC.CHUNK_MIN_CHARS, maxChars | 0 || IC.CHUNK_MAX_CHARS);
    if (!text) return [];
    if (text.length <= max) return [text];

    var parts = [];
    var rest = text;
    while (rest.length > max) {
        var window = rest.slice(0, max);
        var cut = -1;
        var para = window.lastIndexOf('\n\n');
        if (para >= max * 0.4) cut = para + 2;
        if (cut < 0) {
            var nl = window.lastIndexOf('\n');
            if (nl >= max * 0.5) cut = nl + 1;
        }
        if (cut < 0) {
            var m = window.match(/^[\s\S]*[.!?…]["»"]?\s+/);
            if (m && m[0].length >= max * 0.45) cut = m[0].length;
        }
        if (cut < 0) {
            var sp = window.lastIndexOf(' ');
            if (sp >= max * 0.5) cut = sp + 1;
        }
        if (cut < 0) cut = max;
        parts.push(rest.slice(0, cut).trim());
        rest = rest.slice(cut).trim();
    }
    if (rest) parts.push(rest);
    return parts.filter(Boolean);
};


IC.wrapUserChunk = function(chunk, opts) {
    opts = opts || {};
    var idx = opts.index != null ? opts.index : 0;
    var total = opts.total != null ? opts.total : 1;
    var strict = !!opts.strict;
    var head = strict
        ? '[PDM_TASK=clean_only_STRICT]\n'
        : '[PDM_TASK=clean_only]\n';
    var rules = [
        'Tâche UNIQUE : post-éditer / nettoyer le texte utilisateur ci-dessous.',
        'INTERDIT : te présenter, expliquer ton rôle, dire que la demande est ambitieuse,',
        'proposer un plan, fabriquer un « prompt sniper », résumer au lieu de tout couvrir.',
        'Sortie = le texte nettoyé UNIQUEMENT (UTF-8 brut). Aucun préambule.'
    ].join(' ');
    if (strict) {
        rules += ' Si tu commences par une présentation ou un méta-commentaire, tu as ÉCHOUÉ.';
    }
    var partLine = total > 1
        ? ('Partie ' + (idx + 1) + '/' + total + ' du monologue (traite cette partie seule, sans résumer les autres).\n\n')
        : '';
    return head + rules + '\n\n---\n' + partLine + String(chunk || '');
};

/** Si le modèle a renvoyé le wrapper user (PDM_TASK…---…texte), récupère le texte après ---. */
IC.unwrapEchoedUserWrapper = function(output, inputChunk) {
    var out = String(output || '').trim();
    if (!out) return out;
    if (!/\[PDM_TASK=clean_only/i.test(out)) return out;
    var marker = '\n---\n';
    var idx = out.indexOf(marker);
    if (idx < 0) {
        idx = out.indexOf('\n---');
        if (idx >= 0) marker = '\n---';
    }
    if (idx < 0) return out;
    var after = out.slice(idx + marker.length).trim();
    after = after.replace(/^Partie\s+\d+\s*\/\s*\d+[^\n]*\n+/i, '').trim();
    var inp = String(inputChunk || '').trim();
    if (!after && inp) return inp;
    return after || out;
};

IC.looksLikeMetaDrift = function(output, inputChunk) {
    var out = String(output || '').trim();
    var inp = String(inputChunk || '').trim();
    if (!out) return true;
    // Écho du wrapper d’envoi (fréquent sur petits modèles)
    if (/\[PDM_TASK=clean_only/i.test(out)) return true;
    if (/t[aâ]che unique\s*:\s*post-[\u00e9e]diter/i.test(out)) return true;
    if (/sortie\s*=\s*le texte nettoy/i.test(out) && /INTERDIT\s*:/i.test(out)) return true;
    var head = out.slice(0, 280).toLowerCase();
    var patterns = [
        /^bonjour[, ]/,
        /^je suis (un |l['’])?/,
        /^en tant qu/,
        /mon rôle (est|consiste)/,
        /votre demande (est |semble )?ambitieuse/,
        /demande (est |semble )?ambitieuse/,
        /je vais (vous )?(aider|fabriquer|créer|générer)/,
        /prompt(s)? de (qualité|sniper)/,
        /fabriquer des prompts/,
        /agent (de |spécialisé )?(prompt|ia)/,
        /^voici (un )?plan/,
        /^pour (bien )?répondre/
    ];
    for (var i = 0; i < patterns.length; i++) {
        if (patterns[i].test(head)) return true;
    }
    if (inp.length > 400 && out.length < Math.min(120, inp.length * 0.04)) return true;
    return false;
};

})();
