/**
 * PromptDeMerde.com — workspace-thinking.js
 *
 * Synopsis : Capacités thinking LLM.
 * Objectif : Enrichissement modèles, panneau réflexion output et indisponibilité.
 */
(function(){
"use strict";

var A = window.PDM && window.PDM.App;
if (!A) { console.warn('[workspace-thinking] PDM.App not found.'); return; }

function wuText(key, vars) {
    return window.PDM && window.PDM.WorkspaceUi ? window.PDM.WorkspaceUi.text(key, vars) : '';
}

A.getActiveModelId = function() {
    var provider = A.getActiveProviderId();
    return window.PDM.Storage.get(window.PDM.Storage.KEYS.MODEL) ||
        window.PDM.Providers.defaultModel(provider);
};

A.modelSupportsThinking = function(modelId) {
    return window.PDM.Providers.modelSupportsThinking(A.getActiveProviderId(), modelId || A.getActiveModelId());
};

A.enrichLlmModelsCapabilities = function(models) {
    var activeModel = A.getActiveModelId();
    if (!activeModel || !A.refreshModelThinkingCapability) {
        return Promise.resolve(models || []);
    }
    return A.refreshModelThinkingCapability(activeModel).then(function() {
        return window.PDM.Providers.models(A.getActiveProviderId()) || models || [];
    });
};

A.refreshModelThinkingCapability = function(modelId) {
    var model = modelId || A.getActiveModelId();
    var adapter = A.getActiveProvider();
    if (!adapter || !adapter.fetchModelCapabilities || !model) {
        return Promise.resolve(A.modelSupportsThinking(model));
    }
    return adapter.fetchModelCapabilities(model).then(function(meta) {
        window.PDM.Providers.updateModelMeta(A.getActiveProviderId(), model, meta);
        return meta.thinkingSupported === true;
    });
};

A.syncWorkspaceThinkingMaxHint = function() {
};

A.restartInferenceIfActive = function() {
    if (!A.isInferenceActive()) return false;
    window.PDM._pendingInferenceRestart = true;
    window.PDM._inferenceModelSwitch = true;
    window.PDM._inferenceAbortReason = 'restart';
    if (window.PDM._activeAbort) window.PDM._activeAbort.abort();
    return true;
};

A.updateThinkingAvailabilityUi = function() {
    A.syncThinkingUnavailableWorkspace();
    if (typeof A.syncLlmOptionsUi === 'function') {
        A.syncLlmOptionsUi();
    }
};

A.syncThinkingUnavailableWorkspace = function() {
    var panel = document.getElementById('thinking-panel');
    var msgEl = document.getElementById('thinking-unavailable-msg');
    var ta = document.getElementById('thinking-text');
    var model = A.getActiveModelId();
    var wantsThinking = window.PDM.Storage.isLlmThinkingEnabled();
    var meta = window.PDM.Providers.modelMeta(A.getActiveProviderId(), model);
    var knownUnsupported = !!(meta && meta.thinkingSupported === false);
    var showUnavailable = !!(wantsThinking && model && knownUnsupported);

    if (msgEl) {
        msgEl.hidden = !showUnavailable;
        msgEl.textContent = showUnavailable ? wuText('thinkingUnavailableMsg') : '';
    }
    if (panel) {
        panel.classList.toggle('thinking-unavailable-active', showUnavailable);
        if (showUnavailable) {
            panel.classList.add('show');
            panel.open = true;
        } else {
            panel.classList.remove('thinking-unavailable-active');
            if (wantsThinking && !knownUnsupported) {
                panel.classList.add('show');
                panel.open = true;
            } else if (ta && !ta.value) {
                panel.classList.remove('show');
                panel.open = false;
            }
        }
    }
    if (ta && showUnavailable) {
        ta.value = '';
    }
};

A.saveLlmThinkingModeFromUi = function() {
};

A.syncLlmThinkingRadios = function() {
    if (typeof A.syncLlmOptionsUi === 'function') {
        A.syncLlmOptionsUi();
    }
};

})();
