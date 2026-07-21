/**
 * PromptDeMerde.com — workspace-input-chunk-split.js
 *
 * Synopsis : Découpe intelligente Input (transcript #USER/#SYSTEM ou texte libre).
 * Objectif : Couper aux tours de discussion, sinon paragraphes / ponctuation.
 */
(function() {
'use strict';

var IC = window.PDM && window.PDM.InputChunk;
if (!IC) { console.warn('[workspace-input-chunk-split] PDM.InputChunk missing.'); return; }

function cutFreeWindow(window, max) {
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
    return cut;
}

IC.splitFreeText = function(input, maxChars) {
    var text = String(input || '').trim();
    var max = Math.max(IC.CHUNK_MIN_CHARS, maxChars | 0 || IC.CHUNK_MAX_CHARS);
    if (!text) return [];
    if (text.length <= max) return [text];
    var parts = [];
    var rest = text;
    while (rest.length > max) {
        var window = rest.slice(0, max);
        var cut = cutFreeWindow(window, max);
        parts.push(rest.slice(0, cut).trim());
        rest = rest.slice(cut).trim();
    }
    if (rest) parts.push(rest);
    return parts.filter(Boolean);
};

IC.splitTranscriptTurns = function(input) {
    var text = String(input || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (!text.trim()) return [];
    var re = /(^|\n)(#(?:USER|SYSTEM):)/g;
    var marks = [];
    var m;
    while ((m = re.exec(text)) !== null) {
        marks.push(m.index + (m[1] === '\n' ? 1 : 0));
    }
    if (!marks.length) return [{ text: text.trim() }];
    var turns = [];
    if (marks[0] > 0) {
        var head = text.slice(0, marks[0]).trim();
        if (head) turns.push({ text: head });
    }
    for (var i = 0; i < marks.length; i++) {
        var start = marks[i];
        var end = i + 1 < marks.length ? marks[i + 1] : text.length;
        var block = text.slice(start, end).replace(/^\n+/, '').replace(/\s+$/g, '');
        if (block) turns.push({ text: block });
    }
    return turns;
};

IC.packTurns = function(turns, maxChars) {
    var max = Math.max(IC.CHUNK_MIN_CHARS, maxChars | 0 || IC.CHUNK_MAX_CHARS);
    var parts = [];
    var buf = '';
    for (var i = 0; i < turns.length; i++) {
        var turn = String(turns[i].text || '').trim();
        if (!turn) continue;
        if (turn.length > max) {
            if (buf) { parts.push(buf); buf = ''; }
            var bodyParts = IC.splitFreeText(turn, max);
            for (var j = 0; j < bodyParts.length; j++) parts.push(bodyParts[j]);
            continue;
        }
        if (!buf) { buf = turn; continue; }
        var merged = buf + '\n\n' + turn;
        if (merged.length <= max) { buf = merged; continue; }
        parts.push(buf);
        buf = turn;
    }
    if (buf) parts.push(buf);
    return parts.filter(Boolean);
};

IC.splitText = function(input, maxChars) {
    var text = String(input || '').trim();
    if (!text) return [];
    if (IC.hasTranscriptMarks(text)) {
        return IC.packTurns(IC.splitTranscriptTurns(text), maxChars);
    }
    return IC.splitFreeText(text, maxChars);
};

})();
