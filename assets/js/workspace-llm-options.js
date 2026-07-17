/**
 * PromptDeMerde.com — workspace-llm-options.js
 *
 * Synopsis : Panneau Options LLM extensible (strip Output).
 * Objectif : UI stricte — 0 = illimité (tokens / timeout / réflexion), N = N.
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

function formatTemp(n) {
    var v = Number(n);
    if (!Number.isFinite(v) || v === 0) return '0';
    return v.toFixed(2);
}

function formatTimeoutSec(n) {
    var v = parseInt(n, 10);
    if (!Number.isFinite(v) || v < 0) return '0';
    if (v === 0) return wuText('timeoutUnlimited') || 'Illimité (0)';
    return String(v) + ' s';
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

function syncRangeRow(optId) {
    var row = document.querySelector('.llm-opt-row[data-llm-opt="' + optId + '"]');
    if (!row) return;
    var slider = row.querySelector('.llm-opt-slider');
    var valueEl = row.querySelector('.llm-opt-value');
    if (!slider || !valueEl) return;

    var stored;
    var display;
    if (optId === 'temperature') {
        stored = S.getLlmTemperature();
        if (document.activeElement !== slider) {
            slider.value = String(stored);
        }
        display = formatTemp(slider.value);
        slider.setAttribute('aria-valuenow', String(stored));
    } else if (optId === 'maxTokens') {
        stored = S.getLlmMaxTokens();
        if (document.activeElement !== slider) {
            slider.value = String(stored);
        }
        display = stored === 0
            ? (wuText('maxTokensUnlimited') || 'Illimité (0)')
            : String(stored);
        slider.setAttribute('aria-valuenow', String(stored));
    } else if (optId === 'timeout') {
        stored = S.getLlmTimeoutSec();
        if (document.activeElement !== slider) {
            slider.value = String(stored);
        }
        display = formatTimeoutSec(stored);
        slider.setAttribute('aria-valuenow', String(stored));
    } else {
        return;
    }
    valueEl.textContent = display;
}

A.syncThinkingOptionRow = function() {
    var thinkingRow = document.querySelector('.llm-opt-row[data-llm-opt="thinking"]');
    var optHint = document.getElementById('ws-thinking-opt-hint');
    var toggle = document.getElementById('ws-thinking-toggle');
    var maxRow = document.getElementById('ws-thinking-max-row');
    var maxInput = document.getElementById('ws-thinking-max-chars');
    var unsupported = isThinkingKnownUnsupported();
    var enabled = S.isLlmThinkingEnabled();

    if (thinkingRow) {
        thinkingRow.hidden = unsupported;
    }
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
        toggle.textContent = enabled ? 'ON' : 'OFF';
    }
    if (maxRow) {
        maxRow.hidden = !(enabled && !unsupported);
    }
    if (maxInput && document.activeElement !== maxInput) {
        maxInput.value = String(S.getLlmThinkingMaxChars());
    }
    A.syncWorkspaceThinkingMaxHint && A.syncWorkspaceThinkingMaxHint();
};

A.syncLlmOptionsUi = function() {
    A.syncThinkingOptionRow();
    syncRangeRow('temperature');
    syncRangeRow('maxTokens');
    syncRangeRow('timeout');
    if (typeof A.syncOutputFormatOptionUi === 'function') {
        A.syncOutputFormatOptionUi();
    }
};

A.syncLlmThinkingRadios = function() {
    A.syncLlmOptionsUi();
};

A.toggleWorkspaceThinking = function() {
    if (isThinkingKnownUnsupported()) return;
    var enabled = S.isLlmThinkingEnabled();
    var next = !enabled;
    S.setLlmThinkingEnabled(next);
    A.syncLlmOptionsUi();
    if (typeof A.updateThinkingAvailabilityUi === 'function') {
        A.updateThinkingAvailabilityUi();
    }
    A.restartInferenceIfActive && A.restartInferenceIfActive();
    if (window.PDM.UI && window.PDM.UI.notif) {
        window.PDM.UI.notif(
            next ? wuText('thinkingEnabledNotif') : wuText('thinkingDisabledNotif'),
            'info'
        );
    }
};

A.saveWorkspaceThinkingMaxChars = function(value) {
    S.setLlmThinkingMaxChars(value);
    A.syncThinkingOptionRow();
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

    var maxInput = document.getElementById('ws-thinking-max-chars');
    if (maxInput) {
        maxInput.addEventListener('input', function() {
            if (typeof A.syncWorkspaceThinkingMaxHint === 'function') {
                A.syncWorkspaceThinkingMaxHint(maxInput.value);
            }
        });
        maxInput.addEventListener('change', function() {
            A.saveWorkspaceThinkingMaxChars(maxInput.value);
        });
    }

    function bindRange(optId, sliderId, setValueFn, formatDisplay) {
        var slider = document.getElementById(sliderId);
        if (!slider) return;
        var valueEl = document.querySelector('.llm-opt-row[data-llm-opt="' + optId + '"] .llm-opt-value');

        slider.addEventListener('input', function() {
            if (valueEl) valueEl.textContent = formatDisplay(slider.value);
            slider.setAttribute('aria-valuenow', slider.value);
        });
        slider.addEventListener('change', function() {
            setValueFn(slider.value);
            syncRangeRow(optId);
            A.restartInferenceIfActive && A.restartInferenceIfActive();
        });
    }

    bindRange('temperature', 'ws-llm-temperature-slider', function(v) {
        S.setLlmTemperature(v);
    }, formatTemp);

    bindRange('maxTokens', 'ws-llm-max-tokens-slider', function(v) {
        S.setLlmMaxTokens(v);
    }, function(v) {
        var n = parseInt(v, 10);
        if (!Number.isFinite(n) || n <= 0) return wuText('maxTokensUnlimited') || 'Illimité (0)';
        return String(n);
    });

    bindRange('timeout', 'ws-llm-timeout-slider', function(v) {
        S.setLlmTimeoutSec(v);
    }, formatTimeoutSec);

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
