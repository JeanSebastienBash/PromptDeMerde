/**
 * PromptDeMerde.com — workspace-stream.js
 *
 * Synopsis : Rendu streaming et panneau thinking.
 * Objectif : Afficher métadonnées stream et synchroniser le panneau réflexion.
 */
(function(){
"use strict";

var A = window.PDM && window.PDM.App;
if (!A) { console.warn('[workspace-stream] PDM.App not found.'); return; }
A.renderStreamMeta = function(metaEl, opts) {
    if (!metaEl) return;
    opts = opts || {};
    var elapsedSec = Math.max(opts.elapsedSec || 0, 0.001);
    var elapsed = elapsedSec.toFixed(1);
    var contentTokens = opts.contentTokens || 0;
    var thinkingTokens = opts.thinkingTokens || 0;
    var html = '<span>Temps: <span class="val">' + elapsed + 's</span></span>';

    if (opts.phase === 'thinking') {
        html += '<span>R\u00e9flexion: <span class="val">' + (opts.thinkingChars || 0);
        if (opts.thinkingLimitMax) html += '/' + opts.thinkingLimitMax;
        html += ' car.</span></span>';
        html += '<span>Tokens r\u00e9flexion: <span class="val">' + thinkingTokens + '</span></span>';
        if (thinkingTokens > 0) {
            html += '<span>Vitesse: <span class="val">' + (thinkingTokens / elapsedSec).toFixed(1) + ' tok/s</span></span>';
        }
        if (opts.thinkingLimitReached) html += '<span class="val">Limite atteinte</span>';
        else if (!opts.done) html += '<span class="streaming-dot">\ud83e\udde0 EN COURS</span>';
        metaEl.innerHTML = html;
        return;
    }

    html += '<span>Tokens: <span class="val">' + contentTokens + '</span></span>';
    if (contentTokens > 0) {
        html += '<span>Vitesse: <span class="val">' + (contentTokens / elapsedSec).toFixed(1) + ' tok/s</span></span>';
    }
    if (opts.chars !== undefined) {
        html += '<span>Caract\u00e8res: <span class="val">' + opts.chars + '</span></span>';
    }
    if (opts.thinkingChars) {
        html += '<span>R\u00e9flexion: <span class="val">' + opts.thinkingChars;
        if (opts.thinkingLimitMax) html += '/' + opts.thinkingLimitMax;
        html += ' car.</span></span>';
    }
    if (opts.thinkingLimitReached) {
        html += '<span class="val">Limite r\u00e9flexion atteinte</span>';
    }
    if (thinkingTokens > 0) {
        html += '<span>Tokens r\u00e9flexion: <span class="val">' + thinkingTokens + '</span></span>';
        html += '<span>Vitesse r\u00e9flexion: <span class="val">' + (thinkingTokens / elapsedSec).toFixed(1) + ' tok/s</span></span>';
    }
    if (opts.done && (contentTokens + thinkingTokens) > 0) {
        html += '<span>Vitesse moy.: <span class="val">' + ((contentTokens + thinkingTokens) / elapsedSec).toFixed(1) + ' tok/s</span></span>';
    }
    if (!opts.done) html += '<span class="streaming-dot">● EN COURS</span>';
    metaEl.innerHTML = html;
};

A.syncThinkingPanel = function(thinkingText, opts) {
    opts = opts || {};
    var panel = document.getElementById('thinking-panel');
    var ta = document.getElementById('thinking-text');
    var badge = document.getElementById('thinking-badge');
    var unavailable = document.getElementById('thinking-unavailable-msg');
    if (!panel || !ta) return;

    if (!thinkingText) {
        if (opts.reset) {
            ta.value = '';
            panel.classList.remove('show', 'streaming', 'thinking-unavailable-active');
            if (badge) badge.textContent = '';
            if (unavailable) {
                unavailable.hidden = true;
                unavailable.textContent = '';
            }
        }
        return;
    }

    if (unavailable) {
        unavailable.hidden = true;
        unavailable.textContent = '';
    }
    panel.classList.remove('thinking-unavailable-active');

    panel.classList.add('show');
    ta.value = thinkingText;
    ta.scrollTop = ta.scrollHeight;

    if (opts.streaming) {
        panel.classList.add('streaming');
        if (opts.open !== false) panel.open = true;
    } else {
        panel.classList.remove('streaming');
    }

    if (badge) {
        var maxChars = window.PDM.Storage && window.PDM.Storage.getLlmThinkingMaxChars
            ? window.PDM.Storage.getLlmThinkingMaxChars()
            : 0;
        var len = thinkingText.length;
        var countLabel = maxChars > 0 ? (len + '/' + maxChars + ' car.') : (len + ' car.');
        badge.textContent = countLabel +
            (opts.thinkingLimitReached ? ' \u00b7 LIMITE' : '') +
            (opts.streaming && !opts.thinkingLimitReached ? ' \u00b7 \u25cf EN COURS' : '');
    }
};

})();
