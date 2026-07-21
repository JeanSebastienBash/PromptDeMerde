/**
 * PromptDeMerde.com — workspace-llm-options-bind.js
 *
 * Synopsis : Binding sliders Options LLM (strip Output).
 * Objectif : Sync ranges + listeners ; 0 = illimité où applicable.
 */
(function(){
"use strict";

var A = window.PDM && window.PDM.App;
if (!A) { console.warn('[workspace-llm-options-bind] PDM.App not found.'); return; }

var S = window.PDM.Storage;

function wuText(key, vars) {
    return window.PDM && window.PDM.WorkspaceUi ? window.PDM.WorkspaceUi.text(key, vars) : '';
}

function formatTemp(n) {
    var v = Number(n);
    if (!Number.isFinite(v) || v === 0) return '0';
    return v.toFixed(2);
}

function formatUnlimitedZero(n) {
    var v = parseInt(n, 10);
    if (!Number.isFinite(v) || v <= 0) return wuText('thinkingMaxUnlimited') || 'Illimit\u00e9 (0)';
    return String(v);
}

function formatTimeoutSec(n) {
    var v = parseInt(n, 10);
    if (!Number.isFinite(v) || v < 0) return '0';
    if (v === 0) return wuText('thinkingMaxUnlimited') || 'Illimit\u00e9 (0)';
    return String(v) + ' s';
}

A.syncLlmOptRangeRow = function(optId) {
    var row = document.querySelector('.llm-opt-row[data-llm-opt="' + optId + '"]');
    if (!row) return;
    var slider = row.querySelector('.llm-opt-slider');
    var valueEl = row.querySelector('.llm-opt-value');
    if (!slider || !valueEl) return;
    var stored;
    var display;
    if (optId === 'temperature') {
        stored = S.getLlmTemperature();
        if (document.activeElement !== slider) slider.value = String(stored);
        display = formatTemp(slider.value);
    } else if (optId === 'maxTokens') {
        stored = S.getLlmMaxTokens();
        if (document.activeElement !== slider) slider.value = String(stored);
        display = formatUnlimitedZero(stored);
    } else if (optId === 'timeout') {
        stored = S.getLlmTimeoutSec();
        if (document.activeElement !== slider) slider.value = String(stored);
        display = formatTimeoutSec(stored);
    } else if (optId === 'thinkingMaxChars') {
        stored = S.getLlmThinkingMaxChars();
        if (document.activeElement !== slider) slider.value = String(stored);
        display = formatUnlimitedZero(stored);
    } else if (optId === 'inputCharBudget') {
        stored = S.getLlmInputCharBudget();
        if (document.activeElement !== slider) slider.value = String(stored);
        display = formatUnlimitedZero(stored);
    } else {
        return;
    }
    slider.setAttribute('aria-valuenow', String(stored));
    valueEl.textContent = display;
};

A.bindLlmOptRanges = function() {
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
            A.syncLlmOptRangeRow(optId);
            A.restartInferenceIfActive && A.restartInferenceIfActive();
        });
    }
    bindRange('thinkingMaxChars', 'ws-llm-thinking-max-slider', function(v) {
        S.setLlmThinkingMaxChars(v);
    }, formatUnlimitedZero);
    bindRange('temperature', 'ws-llm-temperature-slider', function(v) {
        S.setLlmTemperature(v);
    }, formatTemp);
    bindRange('maxTokens', 'ws-llm-max-tokens-slider', function(v) {
        S.setLlmMaxTokens(v);
    }, formatUnlimitedZero);
    bindRange('timeout', 'ws-llm-timeout-slider', function(v) {
        S.setLlmTimeoutSec(v);
    }, formatTimeoutSec);
    bindRange('inputCharBudget', 'ws-llm-input-char-budget-slider', function(v) {
        S.setLlmInputCharBudget(v);
    }, formatUnlimitedZero);
};

})();
