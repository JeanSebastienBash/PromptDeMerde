/**
 * PromptDeMerde.com — workspace-input-chunk.js
 *
 * Synopsis : Budget caractères Input et décision multipass LLM.
 * Objectif : Lire pdm_llm_input_char_budget (0 = illimité) sans toucher au STT.
 */
(function() {
'use strict';

var IC = window.PDM.InputChunk = window.PDM.InputChunk || {};

IC.DEFAULT_PROMPT_CHAR_BUDGET = 10000;
IC.MAX_PROMPT_CHAR_BUDGET = 100000;
IC.CHUNK_MAX_CHARS = 3200;
IC.CHUNK_MIN_CHARS = 1200;

IC.getPromptCharBudget = function() {
    var S = window.PDM && window.PDM.Storage;
    if (S && typeof S.getLlmInputCharBudget === 'function') {
        return S.getLlmInputCharBudget();
    }
    return IC.DEFAULT_PROMPT_CHAR_BUDGET;
};

IC.hasTranscriptMarks = function(text) {
    var WI = window.PDM && window.PDM.Iterate;
    if (WI && typeof WI.hasTranscriptMarks === 'function') {
        return WI.hasTranscriptMarks(text);
    }
    return /(?:^|\n)#(?:USER|SYSTEM):/m.test(String(text || ''));
};

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
    var budget = IC.getPromptCharBudget();
    if (budget <= 0) return IC.CHUNK_MAX_CHARS;
    var overhead = IC.estimateOverheadChars(sys, profiles);
    var room = budget - overhead - 600;
    if (room < IC.CHUNK_MIN_CHARS) room = IC.CHUNK_MIN_CHARS;
    if (room > IC.CHUNK_MAX_CHARS) room = IC.CHUNK_MAX_CHARS;
    return room;
};

IC.shouldChunk = function(input, sys, profiles) {
    var budget = IC.getPromptCharBudget();
    if (budget <= 0) return false;
    var text = String(input || '');
    var overhead = IC.estimateOverheadChars(sys, profiles);
    return (overhead + text.length) > budget;
};

IC.wrapUserChunk = function(chunk, opts) {
    opts = opts || {};
    var idx = opts.index != null ? opts.index : 0;
    var total = opts.total != null ? opts.total : 1;
    var part = String(chunk || '');
    if (total <= 1) return part;
    if (opts.transcript) {
        return 'Segment ' + (idx + 1) + '/' + total +
            ' du transcript (traite ce segment seul, sans r\u00e9sumer les autres).\n\n' + part;
    }
    return 'Partie ' + (idx + 1) + '/' + total +
        ' du monologue (traite cette partie seule, sans r\u00e9sumer les autres).\n\n' + part;
};

IC.unwrapEchoedUserWrapper = function(output, inputChunk) {
    var out = String(output || '').trim();
    if (!out) return out;
    var marker = '\n---\n';
    var idx = out.indexOf(marker);
    if (idx < 0) {
        idx = out.indexOf('\n---');
        if (idx >= 0) marker = '\n---';
    }
    if (/\[PDM_TASK=clean_only/i.test(out) && idx >= 0) {
        var after = out.slice(idx + marker.length).trim();
        after = after.replace(/^Partie\s+\d+\s*\/\s*\d+[^\n]*\n+/i, '').trim();
        after = after.replace(/^Segment\s+\d+\s*\/\s*\d+[^\n]*\n+/i, '').trim();
        var inp = String(inputChunk || '').trim();
        if (!after && inp) return inp;
        return after || out;
    }
    if (/^Partie\s+\d+\s*\/\s*\d+[^\n]*\n+/i.test(out)) {
        var stripped = out.replace(/^Partie\s+\d+\s*\/\s*\d+[^\n]*\n+/i, '').trim();
        return stripped || out;
    }
    if (/^Segment\s+\d+\s*\/\s*\d+[^\n]*\n+/i.test(out)) {
        var strippedSeg = out.replace(/^Segment\s+\d+\s*\/\s*\d+[^\n]*\n+/i, '').trim();
        return strippedSeg || out;
    }
    return out;
};

IC.looksLikeMetaDrift = function(output, inputChunk) {
    var out = String(output || '').trim();
    if (!out) return false;
    if (/\[PDM_TASK=clean_only/i.test(out)) return true;
    if (/t[aâ]che unique\s*:\s*post-[\u00e9e]diter/i.test(out)) return true;
    if (/sortie\s*=\s*le texte nettoy/i.test(out) && /INTERDIT\s*:/i.test(out)) return true;
    var head = out.slice(0, 280).toLowerCase();
    var patterns = [
        /votre demande (est |semble )?ambitieuse/,
        /demande (est |semble )?ambitieuse/,
        /prompt(s)? de (qualit[eé]|sniper)/,
        /fabriquer des prompts/,
        /agent (de |sp[eé]cialis[eé] )?(prompt|ia)/
    ];
    for (var i = 0; i < patterns.length; i++) {
        if (patterns[i].test(head)) return true;
    }
    return false;
};

})();
