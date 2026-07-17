/**
 * PromptDeMerde.com — history-trace.js
 *
 * Synopsis : Trace d’inférence (avant/après compression) pour pdm_clean_history.
 * Objectif : Capturer input / system / contextes / output originaux et compressés.
 */
(function(){
"use strict";

var A = window.PDM && window.PDM.App;
if (!A) { console.warn('[history-trace] PDM.App not found.'); return; }

function readCompressTargets() {
    var sysEl = document.getElementById('ws-compress-include-system');
    var ctxEl = document.getElementById('ws-compress-include-contexts');
    var inEl = document.getElementById('ws-compress-include-input');
    var outEl = document.getElementById('ws-compress-include-output');
    return {
        system: !!(sysEl && sysEl.checked),
        contexts: !!(ctxEl && ctxEl.checked),
        input: !!(inEl && inEl.checked),
        output: !!(outEl && outEl.checked)
    };
}

function snapshotActiveContexts() {
    var list = window.PDM.Profiles && window.PDM.Profiles.load ? window.PDM.Profiles.load() : [];
    var out = [];
    for (var i = 0; i < list.length; i++) {
        var p = list[i];
        if (!p || !p.active) continue;
        out.push({
            id: String(p.id || ''),
            tag: String(p.tag || p.id || ''),
            original: String(p.prompt || ''),
            compressed: null
        });
    }
    return out;
}

function currentSystemPrompt() {
    var S = window.PDM.Storage;
    if (S && S.getSystemPromptEffective) return String(S.getSystemPromptEffective() || '');
    return '';
}

function currentInputText() {
    var inp = document.getElementById('ws-input');
    return inp ? String(inp.value || '') : '';
}

function contextPromptById(id) {
    var list = window.PDM.Profiles && window.PDM.Profiles.load ? window.PDM.Profiles.load() : [];
    for (var i = 0; i < list.length; i++) {
        if (list[i] && String(list[i].id) === String(id)) {
            return String(list[i].prompt || '');
        }
    }
    return '';
}

/** Début Nettoyer — avant toute compression. */
A.beginCleanTrace = function() {
    var targets = readCompressTargets();
    window.PDM._cleanTrace = {
        version: 1,
        targets: targets,
        anyCompress: !!(targets.system || targets.contexts || targets.input || targets.output),
        system: {
            original: currentSystemPrompt(),
            compressed: null
        },
        contexts: snapshotActiveContexts(),
        input: {
            original: currentInputText(),
            compressed: null
        },
        output: {
            original: null,
            compressed: null
        },
        thinking: ''
    };
    return window.PDM._cleanTrace;
};

/** Après passe compress avant inférence. */
A.sealCleanTraceAfterPreCompress = function() {
    var t = window.PDM._cleanTrace;
    if (!t) return null;
    if (t.targets.system) {
        t.system.compressed = currentSystemPrompt();
    }
    if (t.targets.input) {
        t.input.compressed = currentInputText();
    }
    if (t.targets.contexts && t.contexts && t.contexts.length) {
        for (var i = 0; i < t.contexts.length; i++) {
            var c = t.contexts[i];
            if (!c) continue;
            c.compressed = contextPromptById(c.id);
        }
    }
    t.anyCompress = !!(t.targets.system || t.targets.contexts || t.targets.input || t.targets.output);
    return t;
};

/** Compat entrées anciennes sans `trace` — ou trace incomplète. */
A.ensureHistoryTrace = function(entry) {
    if (!entry) return null;
    var base = null;
    if (entry.trace && typeof entry.trace === 'object') {
        try {
            base = JSON.parse(JSON.stringify(entry.trace));
        } catch (e) {
            base = entry.trace;
        }
    }
    if (!base || typeof base !== 'object') {
        base = {
            version: 1,
            targets: { system: false, contexts: false, input: false, output: false },
            anyCompress: false,
            system: { original: '', compressed: null },
            contexts: [],
            input: { original: '', compressed: null },
            output: { original: '', compressed: null },
            thinking: ''
        };
    }
    if (!base.system || typeof base.system !== 'object') {
        base.system = { original: '', compressed: null };
    }
    if (!base.input || typeof base.input !== 'object') {
        base.input = { original: '', compressed: null };
    }
    if (!base.output || typeof base.output !== 'object') {
        base.output = { original: '', compressed: null };
    }
    if (!Array.isArray(base.contexts)) base.contexts = [];

    // Réparer les originaux vides depuis les champs legacy
    if (!String(base.input.original || '').trim() && entry.input) {
        base.input.original = String(entry.input);
    }
    if (!String(base.output.original || '').trim() && entry.output) {
        base.output.original = String(entry.output);
    }
    if (!String(base.system.original || '').trim() && entry.systemPrompt) {
        base.system.original = String(entry.systemPrompt);
    }
    if ((!base.contexts || !base.contexts.length) && Array.isArray(entry.activeContexts)) {
        base.contexts = [];
        for (var i = 0; i < entry.activeContexts.length; i++) {
            var a = entry.activeContexts[i] || {};
            base.contexts.push({
                id: String(a.id || a.tag || i),
                tag: String(a.tag || a.id || ('#' + i)),
                original: String(a.prompt || ''),
                compressed: null
            });
        }
    }
    if (base.thinking == null || base.thinking === '') {
        base.thinking = String(entry.thinking || '');
    }
    return base;
};

/** Après inférence (± compress Output) — ne jamais réinitialiser la trace. */
A.sealCleanTraceOutput = function(plainBefore, plainAfter, thinking) {
    var t = window.PDM._cleanTrace;
    if (!t) {
        t = {
            version: 1,
            targets: { system: false, contexts: false, input: false, output: false },
            anyCompress: false,
            system: { original: '', compressed: null },
            contexts: [],
            input: { original: '', compressed: null },
            output: { original: null, compressed: null },
            thinking: ''
        };
        window.PDM._cleanTrace = t;
    }
    if (!t.output || typeof t.output !== 'object') {
        t.output = { original: null, compressed: null };
    }
    t.output.original = plainBefore != null ? String(plainBefore) : '';
    if (t.targets && t.targets.output) {
        t.output.compressed = plainAfter != null ? String(plainAfter) : t.output.original;
    } else {
        t.output.compressed = null;
    }
    if (thinking != null) t.thinking = String(thinking);
    return t;
};

A.takeCleanTrace = function() {
    var t = window.PDM._cleanTrace || null;
    window.PDM._cleanTrace = null;
    return t;
};

A.historyHadCompress = function(entry) {
    var t = A.ensureHistoryTrace(entry);
    if (!t) return false;
    if (t.anyCompress) return true;
    if (t.system && t.system.compressed != null) return true;
    if (t.input && t.input.compressed != null) return true;
    if (t.output && t.output.compressed != null) return true;
    if (t.contexts) {
        for (var i = 0; i < t.contexts.length; i++) {
            if (t.contexts[i] && t.contexts[i].compressed != null) return true;
        }
    }
    return false;
};

})();
