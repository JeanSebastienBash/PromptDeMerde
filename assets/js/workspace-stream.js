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

function wuText(key, vars) {
    return window.PDM && window.PDM.WorkspaceUi ? window.PDM.WorkspaceUi.text(key, vars) : '';
}

function thinkingCharsLabel(len, max) {
    if (max > 0) return wuText('streamBadgeCharsMax', { len: len, max: max });
    return wuText('streamBadgeChars', { len: len });
}

A.renderStreamMeta = function(metaEl, opts) {
    if (!metaEl) return;
    opts = opts || {};
    var elapsedSec = Math.max(opts.elapsedSec || 0, 0.001);
    var elapsed = elapsedSec.toFixed(1);
    var contentTokens = opts.contentTokens || 0;
    var thinkingTokens = opts.thinkingTokens || 0;
    var html = '<span>' + wuText('streamTime') + ' <span class="val">' + elapsed + 's</span></span>';

    if (opts.phase === 'thinking') {
        html += '<span>' + wuText('streamThinking') + ' <span class="val">' +
            thinkingCharsLabel(opts.thinkingChars || 0, opts.thinkingLimitMax || 0) +
            '</span></span>';
        html += '<span>' + wuText('streamThinkingTokens') + ' <span class="val">' + thinkingTokens + '</span></span>';
        if (thinkingTokens > 0) {
            html += '<span>' + wuText('streamSpeed') + ' <span class="val">' + (thinkingTokens / elapsedSec).toFixed(1) + ' tok/s</span></span>';
        }
        if (opts.thinkingLimitReached) html += '<span class="val">' + wuText('streamLimitReached') + '</span>';
        else if (!opts.done) html += '<span class="streaming-dot">' + wuText('streamInProgressBrain') + '</span>';
        metaEl.innerHTML = html;
        return;
    }

    html += '<span>' + wuText('streamTokens') + ' <span class="val">' + contentTokens + '</span></span>';
    if (opts.streamChunks != null && !opts.done) {
        html += '<span>chunks: <span class="val">' + String(opts.streamChunks) + '</span></span>';
    }
    if (opts.chunkTotal > 1 && opts.chunkIndex != null) {
        html += '<span>pass: <span class="val">' + String(opts.chunkIndex) + '/' + String(opts.chunkTotal) + '</span></span>';
    }
    if (contentTokens > 0) {
        html += '<span>' + wuText('streamSpeed') + ' <span class="val">' + (contentTokens / elapsedSec).toFixed(1) + ' tok/s</span></span>';
    }
    if (opts.chars !== undefined) {
        html += '<span>' + wuText('streamChars') + ' <span class="val">' + opts.chars + '</span></span>';
    }
    if (opts.thinkingChars) {
        html += '<span>' + wuText('streamThinking') + ' <span class="val">' +
            thinkingCharsLabel(opts.thinkingChars, opts.thinkingLimitMax || 0) +
            '</span></span>';
    }
    if (opts.thinkingLimitReached) {
        html += '<span class="val">' + wuText('streamThinkingLimitReached') + '</span>';
    }
    if (thinkingTokens > 0) {
        html += '<span>' + wuText('streamThinkingTokens') + ' <span class="val">' + thinkingTokens + '</span></span>';
        html += '<span>' + wuText('streamSpeedThinking') + ' <span class="val">' + (thinkingTokens / elapsedSec).toFixed(1) + ' tok/s</span></span>';
    }
    if (opts.done && (contentTokens + thinkingTokens) > 0) {
        html += '<span>' + wuText('streamSpeedAvg') + ' <span class="val">' + ((contentTokens + thinkingTokens) / elapsedSec).toFixed(1) + ' tok/s</span></span>';
    }
    if (opts.done && opts.doneReason) {
        html += '<span>done: <span class="val">' + String(opts.doneReason) + '</span></span>';
    }
    if (opts.done && opts.evalCount != null && opts.evalCount > 0) {
        html += '<span>eval: <span class="val">' + String(opts.evalCount) + '</span></span>';
    }
    if (!opts.done) html += '<span class="streaming-dot">' + wuText('streamInProgressDot') + '</span>';
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
        var countLabel = thinkingCharsLabel(len, maxChars);
        badge.textContent = countLabel +
            (opts.thinkingLimitReached ? wuText('streamThinkingBadgeLimit') : '') +
            (opts.streaming && !opts.thinkingLimitReached ? wuText('streamThinkingBadgeProgress') : '');
    }
};

})();
