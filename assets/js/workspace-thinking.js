/**
 * PromptDeMerde.com — workspace-thinking.js
 *
 * Synopsis : Capacités thinking LLM.
 * Objectif : Toggle réflexion workspace, enrichissement modèles et UI indisponibilité.
 */
(function(){
"use strict";

var A = window.PDM && window.PDM.App;
if (!A) { console.warn('[workspace-thinking] PDM.App not found.'); return; }

function wuText(key) {
    return window.PDM && window.PDM.WorkspaceUi ? window.PDM.WorkspaceUi.text(key) : '';
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

A.syncLlmThinkingRadios = function() {
    A.syncWorkspaceThinkingToggle();
    A.syncWorkspaceThinkingMaxChars();
};

A.syncWorkspaceThinkingToggle = function() {
    var btn = document.getElementById('ws-thinking-toggle');
    if (!btn) return;
    var enabled = window.PDM.Storage.isLlmThinkingEnabled();
    btn.classList.toggle('is-on', enabled);
    btn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    btn.title = enabled
        ? wuText('thinkingToggleOn')
        : wuText('thinkingToggleOff');
};

A.syncWorkspaceThinkingMaxChars = function() {
    var wsInput = document.getElementById('ws-thinking-max-chars');
    var val = window.PDM.Storage.getLlmThinkingMaxChars();
    if (wsInput && document.activeElement !== wsInput) wsInput.value = String(val);
    A.syncWorkspaceThinkingMaxHint(val);
};

A.syncWorkspaceThinkingMaxHint = function(value) {
    var hint = document.getElementById('ws-thinking-max-hint');
    if (!hint) return;
    var val = value;
    if (val === undefined || val === null) {
        val = window.PDM.Storage.getLlmThinkingMaxChars();
    }
    hint.textContent = val === 0
        ? 'Illimit\u00e9 (0)'
        : (String(val) + ' car. autoris\u00e9s \u00b7 0 = illimit\u00e9');
};

A.restartInferenceIfActive = function() {
    if (!A.isInferenceActive()) return false;
    window.PDM._pendingInferenceRestart = true;
    window.PDM._inferenceModelSwitch = true;
    if (window.PDM._activeAbort) window.PDM._activeAbort.abort();
    return true;
};

A.toggleWorkspaceThinking = function() {
    var enabled = window.PDM.Storage.isLlmThinkingEnabled();
    var next = !enabled;
    window.PDM.Storage.setLlmThinkingEnabled(next);
    A.syncLlmThinkingRadios();
    A.updateThinkingAvailabilityUi();
    A.restartInferenceIfActive();
    if (window.PDM.UI && window.PDM.UI.notif) {
        window.PDM.UI.notif(
            next ? wuText('thinkingEnabledNotif') : wuText('thinkingDisabledNotif'),
            'info'
        );
    }
};

A.saveWorkspaceThinkingMaxChars = function(value) {
    window.PDM.Storage.setLlmThinkingMaxChars(value);
    A.syncWorkspaceThinkingMaxChars();
    A.restartInferenceIfActive();
};

A.bindWorkspaceThinking = function() {
    if (A._wsThinkingBound) return;
    A._wsThinkingBound = true;

    var btn = document.getElementById('ws-thinking-toggle');
    if (btn) {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            A.toggleWorkspaceThinking();
        });
    }

    var maxInput = document.getElementById('ws-thinking-max-chars');
    if (maxInput) {
        var onMaxInput = function() {
            A.syncWorkspaceThinkingMaxHint(maxInput.value);
        };
        maxInput.addEventListener('input', onMaxInput);
        maxInput.addEventListener('change', function() {
            A.saveWorkspaceThinkingMaxChars(maxInput.value);
        });
    }
};

A.updateThinkingAvailabilityUi = function() {
    var model = A.getActiveModelId();
    var wantsThinking = window.PDM.Storage.isLlmThinkingEnabled();
    var meta = window.PDM.Providers.modelMeta(A.getActiveProviderId(), model);
    var knownUnsupported = !!(meta && meta.thinkingSupported === false);

    var wsHint = document.getElementById('ws-thinking-ws-hint');
    var wsSettings = document.getElementById('ws-thinking-settings');
    var thinkingToggle = document.getElementById('ws-thinking-toggle');
    if (wsHint) {
        if (wantsThinking && model && knownUnsupported) {
            wsHint.hidden = false;
            wsHint.textContent = wuText('thinkingUnavailableHint');
        } else {
            wsHint.hidden = true;
            wsHint.textContent = '';
        }
    }
    if (wsSettings) {
        wsSettings.hidden = !(wantsThinking && !knownUnsupported);
    }
    if (thinkingToggle) {
        thinkingToggle.disabled = false;
    }

    A.syncThinkingUnavailableWorkspace();
    A.syncWorkspaceThinkingToggle();
    A.syncWorkspaceThinkingMaxChars();
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
            }
        }
    }
    if (ta && showUnavailable) {
        ta.value = '';
    }
};

A.saveLlmThinkingModeFromUi = function() {
    /* Conservé pour compat — la réflexion est pilotée par le toggle Workspace. */
};

A.syncWorkspaceThinkingToggle();
A.syncWorkspaceThinkingMaxChars();

})();
