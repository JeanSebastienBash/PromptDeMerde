/**
 * PromptDeMerde.com — workspace-llm-options.js
 *
 * Synopsis : Panneau Options LLM extensible (strip Output).
 * Objectif : Panel, réflexion, sync UI ; sliders via workspace-llm-options-bind.js.
 */
(function(){
"use strict";

var A = window.PDM && window.PDM.App;
if (!A) { console.warn('[workspace-llm-options] PDM.App not found.'); return; }

var S = window.PDM.Storage;
var P = window.PDM.Providers;

function wuText(key, vars) {
    return window.PDM && window.PDM.WorkspaceUi ? window.PDM.WorkspaceUi.text(key, vars) : '';
}

function getActiveModelMeta() {
    var model = A.getActiveModelId && A.getActiveModelId();
    if (!model || !P) return null;
    return P.modelMeta(A.getActiveProviderId(), model);
}

function isThinkingKnownUnsupported() {
    var meta = getActiveModelMeta();
    return !!(meta && meta.thinkingSupported === false);
}

A._llmOptionsPanelOpen = false;

A.toggleLlmOptionsPanel = function() {
    A._llmOptionsPanelOpen = !A._llmOptionsPanelOpen;
    A.syncLlmOptionsPanelOpen();
};

A.syncLlmOptionsPanelOpen = function() {
    var btn = document.getElementById('ws-llm-options-btn');
    var panel = document.getElementById('ws-llm-options-panel');
    if (btn) {
        btn.classList.toggle('is-open', A._llmOptionsPanelOpen);
        btn.setAttribute('aria-expanded', A._llmOptionsPanelOpen ? 'true' : 'false');
        btn.title = A._llmOptionsPanelOpen ? wuText('llmOptionsBtnOpen') : wuText('llmOptionsBtn');
    }
    if (panel) panel.hidden = !A._llmOptionsPanelOpen;
};

A.syncThinkingOptionRow = function() {
    var thinkingRow = document.querySelector('.llm-opt-row[data-llm-opt="thinking"]');
    var optHint = document.getElementById('ws-thinking-opt-hint');
    var toggle = document.getElementById('ws-thinking-toggle');
    var maxRow = document.getElementById('ws-thinking-max-row');
    var unsupported = isThinkingKnownUnsupported();
    var enabled = S.isLlmThinkingEnabled();
    if (thinkingRow) thinkingRow.hidden = unsupported;
    if (optHint) {
        if (unsupported) {
            optHint.hidden = false;
            optHint.textContent = wuText('thinkingUnsupportedShort');
        } else {
            optHint.hidden = true;
            optHint.textContent = '';
        }
    }
    if (toggle) {
        toggle.classList.toggle('is-on', enabled);
        toggle.setAttribute('aria-pressed', enabled ? 'true' : 'false');
        toggle.title = enabled ? wuText('thinkingToggleOn') : wuText('thinkingToggleOff');
        var I = window.PDM && window.PDM.I18n;
        toggle.textContent = enabled
            ? (I ? I.t('workspace.toggleOff') : 'ON')
            : (I ? I.t('workspace.toggleOn') : 'OFF');
    }
    if (maxRow) maxRow.hidden = !(enabled && !unsupported);
    A.syncLlmOptRangeRow && A.syncLlmOptRangeRow('thinkingMaxChars');
};

A.syncLlmOptionsUi = function() {
    A.syncThinkingOptionRow();
    if (A.syncLlmOptRangeRow) {
        A.syncLlmOptRangeRow('temperature');
        A.syncLlmOptRangeRow('maxTokens');
        A.syncLlmOptRangeRow('timeout');
        A.syncLlmOptRangeRow('inputCharBudget');
    }
    if (typeof A.syncOutputFormatOptionUi === 'function') {
        A.syncOutputFormatOptionUi();
    }
};

A.syncLlmThinkingRadios = function() {
    A.syncLlmOptionsUi();
};

A.toggleWorkspaceThinking = function() {
    if (isThinkingKnownUnsupported()) return;
    var next = !S.isLlmThinkingEnabled();
    S.setLlmThinkingEnabled(next);
    A.syncLlmOptionsUi();
    if (typeof A.updateThinkingAvailabilityUi === 'function') A.updateThinkingAvailabilityUi();
    A.restartInferenceIfActive && A.restartInferenceIfActive();
    if (window.PDM.UI && window.PDM.UI.notif) {
        window.PDM.UI.notif(next ? wuText('thinkingEnabledNotif') : wuText('thinkingDisabledNotif'), 'info');
    }
};

A.saveWorkspaceThinkingMaxChars = function(value) {
    S.setLlmThinkingMaxChars(value);
    A.syncLlmOptRangeRow && A.syncLlmOptRangeRow('thinkingMaxChars');
    A.restartInferenceIfActive && A.restartInferenceIfActive();
};

A.bindLlmOptions = function() {
    if (A._llmOptionsBound) return;
    A._llmOptionsBound = true;
    var optionsBtn = document.getElementById('ws-llm-options-btn');
    if (optionsBtn) {
        optionsBtn.addEventListener('click', function(e) {
            e.preventDefault();
            A.toggleLlmOptionsPanel();
        });
    }
    var thinkingBtn = document.getElementById('ws-thinking-toggle');
    if (thinkingBtn) {
        thinkingBtn.addEventListener('click', function(e) {
            e.preventDefault();
            A.toggleWorkspaceThinking();
        });
    }
    if (typeof A.bindLlmOptRanges === 'function') A.bindLlmOptRanges();
    var formatPanel = document.querySelector('.llm-opt-format-chips');
    if (formatPanel) {
        formatPanel.addEventListener('change', function(e) {
            var t = e.target;
            if (!t || t.name !== 'ws-output-display-format') return;
            if (t.disabled || t.getAttribute('data-format-enabled') === '0') return;
            if (typeof A.setWorkspaceOutputDisplayFormat === 'function') {
                A.setWorkspaceOutputDisplayFormat(t.value);
            }
        });
    }
};

A.syncLlmOptionsUi();

})();
