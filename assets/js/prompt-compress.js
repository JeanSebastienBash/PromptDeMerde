/**
 * PromptDeMerde.com — prompt-compress.js
 *
 * Synopsis : Compression de tokens (system, contextes, Input, Output) au clic Nettoyer.
 * Objectif : Cases cochées → compresser avant l’inférence (system/contextes/Input) ;
 *            Output après succès (affichage seulement). Pas de bouton Compresser dédié.
 */
(function() {
'use strict';

var PC = window.PDM.PromptCompress = window.PDM.PromptCompress || {};

var DEFAULT_RATE = 0.55;
var MIN_CHARS_LLM = 40;

function wuText(key, vars) {
    var raw = window.PDM && window.PDM.WorkspaceUi ? window.PDM.WorkspaceUi.text(key, vars) : key;
    if (raw == null || raw === '' || raw === key || /^workspace(\.|Ui\.|\.)/i.test(String(raw))
        || /\{\{\w+\}\}/.test(String(raw))) {
        var CS = window.PDM && window.PDM.ConfigSchema;
        var fb = CS && CS.DEFAULT_WORKSPACE_UI && CS.DEFAULT_WORKSPACE_UI.texts
            ? CS.DEFAULT_WORKSPACE_UI.texts[key]
            : '';
        if (fb) {
            raw = String(fb);
            if (vars && typeof vars === 'object') {
                for (var k in vars) {
                    if (!Object.prototype.hasOwnProperty.call(vars, k)) continue;
                    raw = raw.split('{{' + k + '}}').join(String(vars[k] == null ? '' : vars[k]));
                }
            }
            raw = raw.replace(/\{\{\w+\}\}/g, '');
        }
    }
    return raw == null ? '' : String(raw);
}

function readCompressOpts(opts) {
    opts = opts || {};
    var explicit = opts.includeSystem !== undefined
        || opts.includeContexts !== undefined
        || opts.includeInput !== undefined
        || opts.includeOutput !== undefined;
    // Appel nu (API) ou UI : tout off par défaut — l’utilisateur coche explicitement.
    if (!explicit) {
        return {
            includeSystem: false,
            includeContexts: false,
            includeInput: false,
            includeOutput: false,
            rate: opts.rate != null ? opts.rate : DEFAULT_RATE,
            onProgress: opts.onProgress
        };
    }
    return {
        includeSystem: !!opts.includeSystem,
        includeContexts: !!opts.includeContexts,
        includeInput: !!opts.includeInput,
        includeOutput: !!opts.includeOutput,
        rate: opts.rate != null ? opts.rate : DEFAULT_RATE,
        onProgress: opts.onProgress
    };
}

function countActiveContexts() {
    var list = window.PDM.Profiles && window.PDM.Profiles.load ? window.PDM.Profiles.load() : [];
    var n = 0;
    for (var i = 0; i < list.length; i++) {
        if (list[i] && list[i].active) n++;
    }
    return n;
}

function preflightCompressUi(uiOpts, preview) {
    if (uiOpts.includeContexts && countActiveContexts() === 0) {
        window.PDM.UI.notif(wuText('compressNoActiveContexts'), 'err');
        return false;
    }
    if (uiOpts.includeOutput && !String(getPlainOutputFromDom() || '').trim()) {
        window.PDM.UI.notif(wuText('compressNoOutputYet'), 'err');
        return false;
    }
    if (!preview || !preview.length) {
        window.PDM.UI.notif(wuText('compressNothing'), 'err');
        return false;
    }
    return true;
}

function partDisplayLabel(p) {
    if (!p) return '?';
    if (p.kind === 'system') return wuText('compressLabelSystem');
    if (p.kind === 'context') {
        return wuText('compressLabelContext', { tag: String(p.label || ('#' + (p.id || ''))) });
    }
    if (p.kind === 'input') return wuText('compressLabelInput');
    if (p.kind === 'output') return wuText('compressLabelOutput');
    return p.label || p.kind || '?';
}

function previewLabels(preview) {
    return (preview || []).map(partDisplayLabel).join('\n• ');
}

function markKindFromPartKind(kind) {
    if (kind === 'context') return 'contexts';
    return kind;
}

function chipTooltipFor(kind, chip, input) {
    if (chip && chip.classList.contains('is-disabled')) {
        return '';
    }
    var compressed = !!(chip && chip.classList.contains('is-compressed'));
    if (kind === 'contexts' && countActiveContexts() === 0) {
        return wuText('compressTipContextsEmpty');
    }
    if (kind === 'output' && !String(getPlainOutputFromDom() || '').trim()) {
        return wuText('compressTipOutputEmpty');
    }
    if (compressed) {
        if (kind === 'system') return wuText('compressTipSystemDone');
        if (kind === 'contexts') return wuText('compressTipContextsDone');
        if (kind === 'input') return wuText('compressTipInputDone');
        if (kind === 'output') return wuText('compressTipOutputDone');
    }
    var checked = !!(input && input.checked);
    if (kind === 'system') return wuText(checked ? 'compressTipSystemOn' : 'compressTipSystemOff');
    if (kind === 'contexts') return wuText(checked ? 'compressTipContextsOn' : 'compressTipContextsOff');
    if (kind === 'input') return wuText(checked ? 'compressTipInputOn' : 'compressTipInputOff');
    if (kind === 'output') return wuText(checked ? 'compressTipOutputOn' : 'compressTipOutputOff');
    return '';
}

function syncChipTooltips() {
    var chips = document.querySelectorAll('#ws-prompt-compress .ws-compress-chip[data-compress-kind]');
    for (var i = 0; i < chips.length; i++) {
        var chip = chips[i];
        var kind = chip.getAttribute('data-compress-kind') || '';
        var input = chip.querySelector('input');
        var tip = chipTooltipFor(kind, chip, input);
        var tipEl = chip.querySelector('.tip');
        if (!tipEl) {
            tipEl = document.createElement('span');
            tipEl.className = 'tip';
            tipEl.setAttribute('aria-hidden', 'true');
            chip.appendChild(tipEl);
        }
        if (tip) {
            tipEl.textContent = tip;
            tipEl.hidden = false;
            chip.removeAttribute('title');
        } else {
            tipEl.textContent = '';
            tipEl.hidden = true;
            chip.removeAttribute('title');
        }
    }
}
PC.syncChipTooltips = syncChipTooltips;

function readOptsFromUi() {
    var sysEl = document.getElementById('ws-compress-include-system');
    var ctxEl = document.getElementById('ws-compress-include-contexts');
    var inEl = document.getElementById('ws-compress-include-input');
    var outEl = document.getElementById('ws-compress-include-output');
    return {
        includeSystem: !!(sysEl && sysEl.checked),
        includeContexts: !!(ctxEl && ctxEl.checked),
        includeInput: !!(inEl && inEl.checked),
        includeOutput: !!(outEl && outEl.checked)
    };
}

function getPlainOutputFromDom() {
    var A = window.PDM.App;
    var bak = window.PDM._wsBackup;
    if (bak && bak.plain != null && String(bak.plain).trim()) {
        return String(bak.plain);
    }
    if (bak && bak.text != null && String(bak.text).trim()) {
        var fromText = String(bak.text);
        if (A && typeof A.extractPlainOutput === 'function') {
            fromText = A.extractPlainOutput(fromText);
        }
        if (fromText && String(fromText).trim()) return String(fromText);
    }
    var outTa = document.getElementById('output-text');
    var rawOut = outTa ? String(outTa.value || '') : '';
    if (!rawOut.trim()) return '';
    if (A && typeof A.extractPlainOutput === 'function') {
        return String(A.extractPlainOutput(rawOut) || '');
    }
    return rawOut;
}


PC.normalizeLocal = function(text) {
    return String(text || '')
        .replace(/\r\n/g, '\n')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]{2,}/g, ' ')
        .trim();
};

PC.estimateChars = function(parts) {
    var n = 0;
    (parts || []).forEach(function(p) {
        n += String(p && p.text != null ? p.text : p || '').length;
    });
    return n;
};

/** Sentinelles hors vocabulaire LLM — protège placeholders / balises pendant la passe. */
var FRAGILE_OPEN = '\uE000PDM';
var FRAGILE_CLOSE = '\uE001';

function protectFragileTokens(text) {
    var tokens = [];
    var out = String(text || '');

    function shield(re) {
        out = out.replace(re, function(m) {
            var i = tokens.length;
            tokens.push(m);
            return FRAGILE_OPEN + i + FRAGILE_CLOSE;
        });
    }

    // Ordre : plus spécifiques d’abord
    shield(/\{\{[\s\S]*?\}\}/g);
    shield(/\{%[\s\S]*?%\}/g);
    shield(/\$\{[A-Za-z_][\w.]*\}/g);
    shield(/`[^`\n]+`/g);
    // Balises structurelles PDM / XML utiles — pas tout le HTML libre (trop de sentinelles)
    shield(/<\/?(?:output_contract|output_[a-z]{2}|system|user|assistant|do|dont|thinking|context)(?:\s[^>]*)?>/gi);

    return { text: out, tokens: tokens };
}

function restoreFragileTokens(text, tokens) {
    var out = String(text || '');
    var list = tokens || [];
    for (var i = 0; i < list.length; i++) {
        var needle = FRAGILE_OPEN + i + FRAGILE_CLOSE;
        if (out.indexOf(needle) === -1) return null;
        out = out.split(needle).join(list[i]);
    }
    if (out.indexOf(FRAGILE_OPEN) !== -1) return null;
    for (var j = 0; j < list.length; j++) {
        if (out.indexOf(list[j]) === -1) return null;
    }
    return out;
}

/** Annule artefacts typiques du LLM (LaTeX, placeholders de taux). */
PC.sanitizeCompressArtifacts = function(text, original) {
    var s = String(text || '');
    var src = String(original || '');
    s = s
        .replace(/\$\\rightarrow\$/g, '\u2192')
        .replace(/\$\\to\$/g, '\u2192')
        .replace(/\$\\Rightarrow\$/g, '\u21D2')
        .replace(/\$\\leftarrow\$/g, '\u2190')
        .replace(/\$\\times\$/g, '\u00D7')
        .replace(/\$\\cdot\$/g, '\u00B7')
        .replace(/\$\\ldots\$/g, '\u2026')
        .replace(/\$\\dots\$/g, '\u2026')
        .replace(/\$\\geq\$/g, '\u2265')
        .replace(/\$\\leq\$/g, '\u2264')
        .replace(/\$\\neq\$/g, '\u2260')
        .replace(/\{\{\s*rate\s*\}\}/gi, '')
        .replace(/__RATE_PCT__/g, '')
        .replace(/\bRATE_PCT\b/g, '');
    // Source sans « $ » : défaire le math mode introduit
    if (src.indexOf('$') === -1) {
        s = s.replace(/\$\\[A-Za-z]+\{?[^$]*\}?\$/g, '');
        s = s.replace(/\$([^$\n]{1,48})\$/g, '$1');
        s = s.replace(/\$+/g, '');
    }
    return PC.normalizeLocal(s);
};

function compressSystemPrompt(kind) {
    var target = 'un prompt système OU un prompt de contexte PromptDeMerde';
    if (kind === 'output') target = 'un résultat d’inférence (zone Output) PromptDeMerde';
    else if (kind === 'input') target = 'une saisie utilisateur (zone Input) PromptDeMerde';
    return [
        'Tu es un compresseur extractif (style LLMLingua : garder l’essentiel, couper le redondant).',
        'Tu reçois ' + target + '.',
        'Conserve verbatim : faits, consignes, balises XML/HTML, listes do/dont, exemples critiques,',
        'clés output_*, placeholders {{…}} et ${…}, identifiants entre backticks, flèches Unicode (→),',
        'et toute sentinelle du type « ' + FRAGILE_OPEN + '0' + FRAGILE_CLOSE + ' » (ne pas les altérer ni les supprimer).',
        'Supprime : reformulations, padding, intros creuses, doublons, politesse inutile.',
        'INTERDIT : LaTeX, mode math ($...$ ou $\\command$), fences markdown, préambules, commentaires.',
        'Ne remplace jamais → par $\\rightarrow$ ni aucun symbole par une commande LaTeX.',
        'Ne renomme pas, n’échappe pas et ne « fuis » pas les noms de variables / identifiants.',
        'Cible : environ __RATE_PCT__ % de la longueur d’origine (caractères). Raccourcis réellement le texte.',
        'Réponds UNIQUEMENT avec le texte compressé — aucun préambule, aucun markdown fence.'
    ].join(' ');
}


PC.compressBlockViaOllama = function(text, opts) {
    opts = opts || {};
    var rate = opts.rate != null ? Number(opts.rate) : DEFAULT_RATE;
    if (!Number.isFinite(rate) || rate <= 0 || rate > 1) rate = DEFAULT_RATE;
    var kind = opts.kind || '';
    var raw = String(text || '');
    var normalized = PC.normalizeLocal(raw);
    if (normalized.length < MIN_CHARS_LLM) return Promise.resolve(normalized);

    var provider = window.PDM.Providers && window.PDM.Providers.getActiveId
        ? window.PDM.Providers.getActiveId()
        : 'ollama';
    var model = window.PDM.Storage && window.PDM.Storage.get
        ? (window.PDM.Storage.get(window.PDM.Storage.KEYS.MODEL) || '')
        : '';
    if (!model) {
        return Promise.reject(new Error(wuText('compressNoModel')));
    }

    var shielded = protectFragileTokens(normalized);
    var ratePct = String(Math.round(rate * 100));
    var sys = compressSystemPrompt(kind)
        .split('__RATE_PCT__').join(ratePct)
        .split('{{rate}}').join(ratePct)
        .split('RATE_PCT').join(ratePct);
    var user = 'Texte à compresser :\n\n' + shielded.text;

    return window.PDM.LLM.complete(provider, model, null, sys, user, {
        think: false,
        temperature: 0,
        maxTokens: -1,
        abortController: window.PDM._compressAbort || null
    }).then(function(data) {
        var out = PC.normalizeLocal(data && data.result != null ? data.result : '');
        if (!out) return normalized;
        out = PC.sanitizeCompressArtifacts(out, normalized);
        var restored = restoreFragileTokens(out, shielded.tokens);
        if (restored == null) {
            // Sentinelles mangées → mieux garder l’original que des variables fuites / perdues
            return normalized;
        }
        out = PC.normalizeLocal(restored);
        if (!out) return normalized;
        if (out.length > normalized.length * 1.05) return normalized;
        return out;
    });
};


PC.collectSessionParts = function(opts) {
    var o = readCompressOpts(opts);
    var parts = [];
    var S = window.PDM.Storage;

    if (o.includeSystem && S && S.isSystemPromptEnabled && S.isSystemPromptEnabled()) {
        var sys = S.getSystemPromptEffective ? S.getSystemPromptEffective() : '';
        if (sys && String(sys).trim()) {
            parts.push({
                kind: 'system',
                id: 'system',
                label: wuText('compressLabelSystem'),
                text: String(sys)
            });
        }
    }

    if (o.includeContexts) {
        var list = window.PDM.Profiles && window.PDM.Profiles.load ? window.PDM.Profiles.load() : [];
        for (var i = 0; i < list.length; i++) {
            var p = list[i];
            if (!p || !p.active) continue;
            var tag = '#' + (p.tag || p.id);
            parts.push({
                kind: 'context',
                id: p.id,
                label: wuText('compressLabelContext', { tag: tag }),
                text: String(p.prompt || '')
            });
        }
    }

    if (o.includeInput) {
        var inp = document.getElementById('ws-input');
        var v = inp ? String(inp.value || '') : '';
        if (v.trim()) {
            parts.push({
                kind: 'input',
                id: 'input',
                label: wuText('compressLabelInput'),
                text: v
            });
        }
    }

    if (o.includeOutput) {
        var plainOut = getPlainOutputFromDom();
        if (plainOut && String(plainOut).trim()) {
            parts.push({
                kind: 'output',
                id: 'output',
                label: wuText('compressLabelOutput'),
                text: String(plainOut)
            });
        }
    }

    return parts;
};

function applyOutputCompressed(plain) {
    var A = window.PDM.App;
    var text = String(plain == null ? '' : plain);
    var bak = window.PDM._wsBackup || (window.PDM._wsBackup = {});
    // Nouvelle source de vérité = texte compressé (pas l’ancien raw d’inférence)
    bak.plain = text;
    bak.text = text;
    bak.raw = text;
    bak.final = true;

    if (A && typeof A.applyWorkspaceOutputFormat === 'function') {
        A.applyWorkspaceOutputFormat();
    } else {
        var outTa = document.getElementById('output-text');
        if (outTa) {
            outTa.value = text;
            if (outTa.value) outTa.placeholder = '';
        }
        if (window.PDM.UI && window.PDM.UI.syncOutputEmptyState) {
            window.PDM.UI.syncOutputEmptyState();
        }
    }
}


PC.applyCompressedParts = function(parts) {
    var S = window.PDM.Storage;
    var outputPart = null;
    var touchedPrompts = false;

    // Évite que pdm:profiles-changed / system-prompt-changed effacent les pastilles
    // pendant l’écriture, et qu’un flush DOM ultérieur restaure l’ancien texte.
    window.PDM._compressMarksSuspended = true;
    try {
        (parts || []).forEach(function(p) {
            if (!p || p.text == null) return;
            if (p.kind === 'system' && S && S.setSystemPrompt) {
                S.setSystemPrompt(p.text);
                touchedPrompts = true;
            } else if (p.kind === 'context' && window.PDM.Profiles && window.PDM.Profiles.edit) {
                window.PDM.Profiles.edit(p.id, { prompt: p.text });
                touchedPrompts = true;
            } else if (p.kind === 'input') {
                var inp = document.getElementById('ws-input');
                if (inp) {
                    inp.value = p.text;
                    var c = document.getElementById('char-count');
                    if (c && window.PDM.App && window.PDM.App.wsCharCount) {
                        c.textContent = window.PDM.App.wsCharCount(inp.value.length);
                    } else if (c) {
                        c.textContent = inp.value.length + ' / 50000';
                    }
                }
            } else if (p.kind === 'output') {
                outputPart = p;
            }
        });

        var A = window.PDM.App;
        if (touchedPrompts && A) {
            // Aligner les textareas Prompts sur le storage compressé
            // (sinon flushPromptsFromDom juste après Nettoyer réécrit l’ancien texte).
            if (typeof A.refreshPrompts === 'function') {
                A.refreshPrompts();
            } else {
                if (typeof A.syncSystemPromptTextarea === 'function') A.syncSystemPromptTextarea(true);
                if (typeof A.rebuildProfileList === 'function') A.rebuildProfileList();
                if (typeof A.reloadTags === 'function') A.reloadTags();
            }
        } else if (A && typeof A.reloadTags === 'function') {
            A.reloadTags();
        } else if (A && typeof A.refreshProfiles === 'function') {
            A.refreshProfiles();
        }

        // Affichage en dernier : évite qu’un refresh tags / format réécrase avec l’ancien raw
        if (outputPart) {
            applyOutputCompressed(outputPart.text);
        }

        if (A && typeof A.saveWorkspaceFromDom === 'function') {
            A.saveWorkspaceFromDom();
        }
    } finally {
        window.PDM._compressMarksSuspended = false;
    }
};


PC.compressSession = function(opts) {
    var o = readCompressOpts(opts);
    var parts = PC.collectSessionParts(o);
    if (!parts.length) {
        return Promise.reject(new Error(wuText('compressNothing')));
    }
    var before = PC.estimateChars(parts);
    var i = 0;
    var out = [];

    function cancelledError() {
        var err = new Error(wuText('compressCancelled'));
        err.cancelled = true;
        err.partial = out.slice();
        err.before = before;
        return err;
    }

    function next() {
        if (window.PDM._compressUserCancel) {
            return Promise.reject(cancelledError());
        }
        if (i >= parts.length) {
            return {
                before: before,
                after: PC.estimateChars(out),
                parts: out
            };
        }
        var cur = parts[i++];
        if (typeof o.onProgress === 'function') {
            o.onProgress(i, parts.length, cur.label);
        }
        return PC.compressBlockViaOllama(cur.text, { rate: o.rate, kind: cur.kind }).then(function(text) {
            if (window.PDM._compressUserCancel) {
                return Promise.reject(cancelledError());
            }
            out.push({
                kind: cur.kind,
                id: cur.id,
                label: cur.label,
                text: text,
                before: cur.text.length,
                after: text.length
            });
            PC._sessionPartial = out.slice();
            return next();
        }).catch(function(err) {
            if (window.PDM._compressUserCancel || (err && err.name === 'AbortError')) {
                var cErr = cancelledError();
                return Promise.reject(cErr);
            }
            return Promise.reject(err);
        });
    }

    PC._sessionPartial = [];
    return Promise.resolve().then(next);
};

function setStatus(el, msg, busy) {
    if (!el) el = document.getElementById('ws-compress-status');
    if (!el) return;
    if (!msg) {
        el.textContent = '';
        el.hidden = true;
        el.classList.remove('is-busy');
        return;
    }
    el.hidden = false;
    el.textContent = msg;
    el.classList.toggle('is-busy', !!busy);
}

function restoreWorkspaceChromeAfterCompress() {
    var A = window.PDM.App;
    var cancelBtn = document.getElementById('cancel-btn');
    var sniper = document.getElementById('sniperise-btn');
    var resetBtns = document.querySelectorAll('.ws-reset-btn');
    var inferActive = A && A.isInferenceActive ? A.isInferenceActive() : false;

    if (!inferActive) {
        if (cancelBtn) cancelBtn.style.display = 'none';
        if (sniper) {
            sniper.disabled = false;
            if (window.PDM.WorkspaceUi && typeof window.PDM.WorkspaceUi.submitLabel === 'function') {
                sniper.textContent = window.PDM.WorkspaceUi.submitLabel();
            }
            sniper.title = '';
        }
        for (var ri = 0; ri < resetBtns.length; ri++) {
            resetBtns[ri].disabled = false;
            resetBtns[ri].title = wuText('resetTitle');
        }
    }
    if (A && typeof A.updateWorkspacePromptGuard === 'function') {
        A.updateWorkspacePromptGuard();
    }
    if (window.PDM.WorkspaceInputTools && typeof window.PDM.WorkspaceInputTools.sync === 'function') {
        window.PDM.WorkspaceInputTools.sync();
    }
}

function setCompressUiBusy(busy) {
    var cancelLock = document.getElementById('ws-compress-cancel-btn-lock');
    var cancelMain = document.getElementById('cancel-btn');
    var panel = document.getElementById('ws-prompt-compress');
    var outPanel = document.querySelector('.ws-panel.ws-output');
    var lock = document.getElementById('ws-output-compress-lock');
    var status = document.getElementById('ws-compress-status');
    var sniper = document.getElementById('sniperise-btn');
    var chips = document.querySelectorAll('#ws-prompt-compress .ws-compress-chip:not(.is-disabled) input');

    if (cancelLock) {
        cancelLock.disabled = false;
    }
    if (cancelMain && busy) {
        cancelMain.style.display = 'inline-block';
    }
    if (panel) panel.classList.toggle('is-compressing', !!busy);
    if (outPanel) {
        outPanel.classList.toggle('ws-compress-locked', !!busy);
        outPanel.setAttribute('aria-busy', busy ? 'true' : 'false');
    }
    if (lock) {
        lock.hidden = !busy;
        lock.setAttribute('aria-hidden', busy ? 'false' : 'true');
        lock.classList.toggle('is-active', !!busy);
    }
    if (!busy && status) {
        setStatus(status, '', false);
    }
    if (sniper && busy) {
        sniper.disabled = true;
        sniper.title = wuText('compressLockOutput');
    }
    for (var c = 0; c < chips.length; c++) {
        chips[c].disabled = !!busy;
    }
    window.PDM._compressActive = !!busy;
    if (!busy) {
        restoreWorkspaceChromeAfterCompress();
    }
}

function cancelCompress() {
    if (!window.PDM._compressActive) return;
    window.PDM._compressUserCancel = true;
    if (window.PDM._compressAbort) {
        try { window.PDM._compressAbort.abort(); } catch (e) {}
    }
}
PC.cancel = cancelCompress;

var MARKS_KEY = 'pdm_ws_compress_marks';
var MARK_KINDS = ['system', 'contexts', 'input', 'output'];

function fingerprint(text) {
    var s = String(text || '');
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return s.length + ':' + (h >>> 0).toString(16);
}

function contentFingerprintForKind(kind) {
    var S = window.PDM.Storage;
    if (kind === 'system') {
        var sys = S && S.getSystemPromptEffective ? S.getSystemPromptEffective() : '';
        return fingerprint(sys);
    }
    if (kind === 'contexts') {
        var list = window.PDM.Profiles && window.PDM.Profiles.load ? window.PDM.Profiles.load() : [];
        var buf = [];
        for (var i = 0; i < list.length; i++) {
            if (!list[i] || !list[i].active) continue;
            buf.push(String(list[i].id || '') + '=' + String(list[i].prompt || ''));
        }
        return fingerprint(buf.join('\n'));
    }
    if (kind === 'input') {
        var inp = document.getElementById('ws-input');
        return fingerprint(inp ? inp.value : '');
    }
    if (kind === 'output') {
        return fingerprint(getPlainOutputFromDom());
    }
    return '';
}

function loadMarks() {
    try {
        var raw = sessionStorage.getItem(MARKS_KEY);
        if (!raw) return {};
        var parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
        return {};
    }
}

function saveMarks(marks) {
    try {
        sessionStorage.setItem(MARKS_KEY, JSON.stringify(marks || {}));
    } catch (e) { /* quota / private */ }
}

function applyMarksToDom(marks) {
    marks = marks || {};
    var chips = document.querySelectorAll('#ws-prompt-compress .ws-compress-chip[data-compress-kind]');
    for (var i = 0; i < chips.length; i++) {
        var kind = chips[i].getAttribute('data-compress-kind');
        var on = !!(marks[kind] && marks[kind].fp);
        chips[i].classList.toggle('is-compressed', on);
        chips[i].setAttribute('data-compressed', on ? '1' : '0');
    }
    syncChipTooltips();
}

function syncCompressMarks() {
    if (window.PDM._compressMarksSuspended) return;
    var marks = loadMarks();
    var changed = false;
    for (var i = 0; i < MARK_KINDS.length; i++) {
        var kind = MARK_KINDS[i];
        if (!marks[kind] || !marks[kind].fp) continue;
        var now = contentFingerprintForKind(kind);
        if (!now || now !== marks[kind].fp) {
            delete marks[kind];
            changed = true;
        }
    }
    if (changed) saveMarks(marks);
    applyMarksToDom(marks);
}

function markKindsCompressed(kinds) {
    var marks = loadMarks();
    (kinds || []).forEach(function(kind) {
        if (MARK_KINDS.indexOf(kind) < 0) return;
        marks[kind] = { fp: contentFingerprintForKind(kind), at: Date.now() };
    });
    saveMarks(marks);
    applyMarksToDom(marks);
}

function updateCompressBadge() {
    var badge = document.getElementById('ws-compress-badge');
    if (badge) {
        var preview = PC.collectSessionParts(readOptsFromUi());
        if (!preview.length) {
            badge.hidden = true;
            badge.textContent = '';
        } else {
            badge.hidden = false;
            badge.textContent = wuText('compressBadge', { count: String(preview.length) });
        }
    }
    syncChipTooltips();
}

function bindMarkInvalidation() {
    if (bindMarkInvalidation._bound) return;
    bindMarkInvalidation._bound = true;

    var inp = document.getElementById('ws-input');
    if (inp) {
        inp.addEventListener('input', function() { syncCompressMarks(); });
    }
    var outTa = document.getElementById('output-text');
    if (outTa) {
        outTa.addEventListener('input', function() { syncCompressMarks(); });
    }
    document.addEventListener('pdm:profiles-changed', function() { syncCompressMarks(); });
    document.addEventListener('pdm:system-prompt-changed', function() { syncCompressMarks(); });
    // Revalidation légère au retour focus (autre onglet / pause)
    window.addEventListener('focus', function() { syncCompressMarks(); });
}

function runSelectedPipeline(uiOpts) {
    var status = document.getElementById('ws-compress-status');
    var preview = PC.collectSessionParts(uiOpts);
    if (!preflightCompressUi(uiOpts, preview)) {
        return Promise.reject(new Error(wuText('compressNothing')));
    }

    window.PDM._compressUserCancel = false;
    window.PDM._compressAbort = new AbortController();
    setCompressUiBusy(true);
    setStatus(status, wuText('compressRunning'), true);

    return PC.compressSession({
        includeSystem: uiOpts.includeSystem,
        includeContexts: uiOpts.includeContexts,
        includeInput: uiOpts.includeInput,
        includeOutput: uiOpts.includeOutput,
        rate: DEFAULT_RATE,
        onProgress: function(i, n, label) {
            setStatus(status, wuText('compressProgress', {
                i: String(i),
                n: String(n),
                label: String(label || '')
            }), true);
        }
    }).then(function(result) {
        PC.applyCompressedParts(result.parts);
        var kinds = {};
        (result.parts || []).forEach(function(p) {
            if (p && p.kind) kinds[markKindFromPartKind(p.kind)] = true;
        });
        markKindsCompressed(Object.keys(kinds));
        updateCompressBadge();
        var saved = Math.max(0, result.before - result.after);
        var pct = result.before > 0 ? Math.round((saved / result.before) * 100) : 0;
        setStatus(status, wuText('compressDone', {
            before: String(result.before),
            after: String(result.after),
            pct: String(pct)
        }), false);
        window.PDM.UI.notif(wuText('compressDoneNotif', { pct: String(pct) }), 'ok');
        return result;
    }).catch(function(err) {
        var cancelled = !!(err && (err.cancelled || window.PDM._compressUserCancel
            || (err.name === 'AbortError')
            || /abort/i.test(String(err && err.message || ''))));
        var partial = (err && err.partial) || PC._sessionPartial || [];
        if (cancelled && partial.length) {
            PC.applyCompressedParts(partial);
            var kindsPartial = {};
            partial.forEach(function(p) {
                if (p && p.kind) kindsPartial[markKindFromPartKind(p.kind)] = true;
            });
            markKindsCompressed(Object.keys(kindsPartial));
            updateCompressBadge();
        }
        setStatus(status, '', false);
        if (cancelled) {
            window.PDM.UI.notif(wuText('compressCancelled'), 'info');
        } else {
            var msg = err && err.message ? err.message : String(err);
            window.PDM.UI.notif(wuText('compressError', { msg: msg }), 'err');
        }
        return Promise.reject(err);
    }).then(function(result) {
        PC._sessionPartial = null;
        window.PDM._compressAbort = null;
        window.PDM._compressUserCancel = false;
        setCompressUiBusy(false);
        return result;
    }, function(err) {
        PC._sessionPartial = null;
        window.PDM._compressAbort = null;
        window.PDM._compressUserCancel = false;
        setCompressUiBusy(false);
        return Promise.reject(err);
    });
}

/**
 * Avant Nettoyer : system / contextes / Input cochés.
 * Rien coché ou rien à compresser → resolve { skipped: true } (pas d’erreur).
 */
PC.maybeRunBeforeInference = function() {
    if (window.PDM._compressActive) {
        return Promise.reject(new Error(wuText('compressBusyInference')));
    }
    var ui = readOptsFromUi();
    var opts = {
        includeSystem: ui.includeSystem,
        includeContexts: ui.includeContexts,
        includeInput: ui.includeInput,
        includeOutput: false
    };
    if (!opts.includeSystem && !opts.includeContexts && !opts.includeInput) {
        return Promise.resolve({ skipped: true });
    }
    if (opts.includeContexts && countActiveContexts() === 0) {
        window.PDM.UI.notif(wuText('compressNoActiveContexts'), 'err');
        return Promise.reject(new Error(wuText('compressNoActiveContexts')));
    }
    var preview = PC.collectSessionParts(opts);
    if (!preview.length) {
        return Promise.resolve({ skipped: true });
    }
    return runSelectedPipeline(opts);
};

/**
 * Après Nettoyer réussi : Output coché → raccourcir l’affichage.
 */
PC.maybeRunAfterInference = function() {
    if (window.PDM._compressActive) {
        return Promise.reject(new Error(wuText('compressBusyInference')));
    }
    var ui = readOptsFromUi();
    if (!ui.includeOutput) {
        return Promise.resolve({ skipped: true });
    }
    var opts = {
        includeSystem: false,
        includeContexts: false,
        includeInput: false,
        includeOutput: true
    };
    var preview = PC.collectSessionParts(opts);
    if (!preview.length) {
        return Promise.resolve({ skipped: true });
    }
    return runSelectedPipeline(opts);
};

PC.bindUi = function() {
    var panel = document.getElementById('ws-prompt-compress');
    var cancelLock = document.getElementById('ws-compress-cancel-btn-lock');
    if (!panel || panel._pdmCompressBound) return;
    panel._pdmCompressBound = true;

    setCompressUiBusy(false);
    bindMarkInvalidation();
    syncCompressMarks();

    var checkIds = [
        'ws-compress-include-system',
        'ws-compress-include-contexts',
        'ws-compress-include-input',
        'ws-compress-include-output'
    ];
    checkIds.forEach(function(id) {
        var el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('change', function() {
            updateCompressBadge();
            var A = window.PDM && window.PDM.App;
            if (A && typeof A.scheduleWorkspaceSave === 'function') {
                A.scheduleWorkspaceSave();
            } else if (A && typeof A.saveWorkspaceFromDom === 'function') {
                A.saveWorkspaceFromDom();
            }
        });
    });
    document.addEventListener('pdm:localechange', function() {
        syncChipTooltips();
        updateCompressBadge();
    });
    if (window.PDM && window.PDM.Storage && typeof window.PDM.Storage.getWorkspace === 'function') {
        var ws0 = window.PDM.Storage.getWorkspace();
        var hydrateMap = {
            'ws-compress-include-system': ws0.compressIncludeSystem === true,
            'ws-compress-include-contexts': ws0.compressIncludeContexts === true,
            'ws-compress-include-input': ws0.compressIncludeInput === true,
            'ws-compress-include-output': ws0.compressIncludeOutput === true
        };
        for (var hid in hydrateMap) {
            if (!Object.prototype.hasOwnProperty.call(hydrateMap, hid)) continue;
            var hel = document.getElementById(hid);
            if (hel) hel.checked = hydrateMap[hid];
        }
    }
    updateCompressBadge();

    function onCancelClick(ev) {
        if (ev) {
            ev.preventDefault();
            ev.stopPropagation();
        }
        cancelCompress();
    }
    if (cancelLock) cancelLock.addEventListener('click', onCancelClick);
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { PC.bindUi(); });
} else {
    PC.bindUi();
}

})();
