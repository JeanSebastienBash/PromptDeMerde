/**
 * PromptDeMerde.com — workspace-output-format.js
 *
 * Format d’affichage OUTPUT / réflexion (texte | JSON | HTML + stubs).
 * Canonique = texte brut (sans enveloppe). La réponse modèle peut rester en JSON
 * (profil output_*) mais l’UI extrait toujours avant d’afficher / d’enrober.
 */
(function() {
'use strict';

var A = window.PDM && window.PDM.App;
if (!A) { console.warn('[workspace-output-format] PDM.App not found.'); return; }

var FORMATS = [
    { id: 'text', enabled: true },
    { id: 'json', enabled: true },
    { id: 'html', enabled: true },
    { id: 'markdown', enabled: false },
    { id: 'xml', enabled: false },
    { id: 'yaml', enabled: false },
    { id: 'csv', enabled: false }
];

function escapeHtml(s) {
    return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function getFormatId() {
    var S = window.PDM.Storage;
    if (S && typeof S.getOutputDisplayFormat === 'function') {
        return S.getOutputDisplayFormat();
    }
    return 'text';
}

function outputKey() {
    var S = window.PDM.Storage;
    var POJ = window.PDM.ProfileOutputJson;
    var lang = S && S.getLanguage ? S.getLanguage() : 'fr';
    var pattern = S && S.getOutputJsonKeyPattern ? S.getOutputJsonKeyPattern() : 'output_{lang}';
    if (POJ && POJ.outputKeyForLang) return POJ.outputKeyForLang(lang, pattern);
    return 'output_' + String(lang || 'fr').slice(0, 2);
}

/**
 * Enrobe un texte canonique selon le format d’affichage.
 */
A.wrapOutputForDisplay = function(plain, formatId, kind) {
    var text = String(plain || '');
    // Si on reçoit encore une enveloppe JSON, décortiquer avant d’enrober
    text = A.extractPlainOutput(text);
    var fmt = formatId || getFormatId();
    var lang = window.PDM.Storage && window.PDM.Storage.getLanguage
        ? window.PDM.Storage.getLanguage()
        : 'fr';
    kind = kind || 'output';

    if (fmt === 'json') {
        var obj = {};
        if (kind === 'thinking') obj.thinking = text;
        else obj[outputKey()] = text;
        return JSON.stringify(obj, null, 2);
    }
    if (fmt === 'html') {
        var title = kind === 'thinking' ? 'Réflexion' : 'Output';
        return '<!DOCTYPE html>\n<html lang="' + escapeHtml(lang) + '">\n' +
            '<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
            '<title>' + escapeHtml(title) + ' — PromptDeMerde</title>\n' +
            '<style>body{font-family:system-ui,sans-serif;max-width:48rem;margin:2rem auto;padding:0 1rem;line-height:1.5;white-space:pre-wrap;}</style>\n' +
            '</head>\n<body>\n' + escapeHtml(text) + '\n</body>\n</html>\n';
    }
    return text;
};

/**
 * Extrait le texte brut depuis une réponse modèle (JSON profil ou texte libre).
 */
A.extractPlainOutput = function(raw) {
    var t = String(raw || '').trim();
    if (!t) return '';
    var POJ = window.PDM.ProfileOutputJson;
    var S = window.PDM.Storage;
    var lang = S && S.getLanguage ? S.getLanguage() : 'fr';
    var pattern = S && S.getOutputJsonKeyPattern ? S.getOutputJsonKeyPattern() : 'output_{lang}';
    if (POJ && typeof POJ.extractPlainFromModelRaw === 'function') {
        return POJ.extractPlainFromModelRaw(t, lang, pattern);
    }
    if (POJ && typeof POJ.parseRaw === 'function') {
        var parsed = POJ.parseRaw(t);
        if (parsed.ok && parsed.data && typeof POJ.extractOutputLang === 'function') {
            var plain = POJ.extractOutputLang(parsed.data, lang, pattern);
            if (plain) return plain;
        }
    }
    if (t.charAt(0) === '{') {
        try {
            var o = JSON.parse(t);
            var k = outputKey();
            if (o && typeof o[k] === 'string') return o[k];
            if (o && typeof o.output_fr === 'string') return o.output_fr;
        } catch (e) { /* leave as-is */ }
    }
    return t;
};

A.getOutputDisplayFormats = function() {
    return FORMATS.slice();
};

/**
 * Applique le format courant aux zones OUTPUT + réflexion.
 * Toujours re-extrait depuis bak.raw (réponse modèle) pour éviter
 * d’afficher l’enveloppe JSON en mode « texte brut ».
 */
A.applyWorkspaceOutputFormat = function() {
    var bak = window.PDM._wsBackup || (window.PDM._wsBackup = {});
    var candidate = bak.raw != null ? bak.raw
        : (bak.text != null ? bak.text
            : (bak.plain != null ? bak.plain : ''));
    var plainOut = A.extractPlainOutput(candidate);
    if (bak.raw == null && candidate) bak.raw = String(candidate);
    bak.plain = plainOut;
    bak.text = plainOut;

    var plainThink = bak.plainThinking != null ? String(bak.plainThinking)
        : (bak.thinking != null ? String(bak.thinking) : '');
    bak.plainThinking = plainThink;

    var fmt = getFormatId();
    var outputTa = document.getElementById('output-text');
    if (outputTa && (plainOut || bak.final)) {
        outputTa.value = A.wrapOutputForDisplay(plainOut, fmt, 'output');
        if (outputTa.value) outputTa.placeholder = '';
    }
    if (typeof A.syncThinkingPanel === 'function') {
        A.syncThinkingPanel(A.wrapOutputForDisplay(plainThink, fmt, 'thinking'), {
            streaming: !bak.final,
            open: bak.final ? true : !!String(plainThink || '').trim()
        });
    } else {
        var thinkingTa = document.getElementById('thinking-text');
        if (thinkingTa) {
            thinkingTa.value = A.wrapOutputForDisplay(plainThink, fmt, 'thinking');
        }
    }
    if (window.PDM.UI && window.PDM.UI.syncOutputEmptyState) {
        window.PDM.UI.syncOutputEmptyState();
    }
};

A.syncOutputFormatOptionUi = function() {
    var current = getFormatId();
    var inputs = document.querySelectorAll('input[name="ws-output-display-format"]');
    for (var i = 0; i < inputs.length; i++) {
        var el = inputs[i];
        var enabled = el.getAttribute('data-format-enabled') !== '0';
        el.disabled = !enabled;
        el.checked = enabled && el.value === current;
        var lab = el.closest('label');
        if (lab) lab.classList.toggle('is-disabled', !enabled);
    }
};

A.setWorkspaceOutputDisplayFormat = function(formatId) {
    var S = window.PDM.Storage;
    if (!S || typeof S.setOutputDisplayFormat !== 'function') return;
    var meta = FORMATS.filter(function(f) { return f.id === formatId; })[0];
    if (!meta || !meta.enabled) return;
    S.setOutputDisplayFormat(formatId);
    A.syncOutputFormatOptionUi();
    A.applyWorkspaceOutputFormat();
    if (typeof A.scheduleWorkspaceSave === 'function') A.scheduleWorkspaceSave();
};

window.PDM.WorkspaceOutputFormat = {
    formats: FORMATS,
    wrap: A.wrapOutputForDisplay,
    extractPlain: A.extractPlainOutput,
    apply: A.applyWorkspaceOutputFormat
};

})();
