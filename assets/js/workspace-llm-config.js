/**
 * PromptDeMerde.com — workspace-llm-config.js
 *
 * Synopsis : Configuration LLM workspace.
 * Objectif : Select provider/modèle, endpoint et refresh config LLM.
 */
(function(){
"use strict";

var A = window.PDM && window.PDM.App;
if (!A) { console.warn('[workspace-llm-config] PDM.App not found.'); return; }

function wuText(key, vars) {
    return window.PDM && window.PDM.WorkspaceUi ? window.PDM.WorkspaceUi.text(key, vars) : '';
}

A.getWorkspaceModelSelect = function() {
    return document.getElementById('ws-output-model-select');
};

A.updateConfigModelInfo = function() {
};

A.syncWorkspaceOutputModelSelect = function() {
    var sel = A.getWorkspaceModelSelect();
    if (!sel) return;

    var pid = A.getActiveProviderId();
    var models = window.PDM.Providers.models(pid) || [];
    var CS = window.PDM && window.PDM.ConfigSchema;
    if (CS && typeof CS.filterTextLlmModels === 'function') {
        models = CS.filterTextLlmModels(models);
    }
    var curr = window.PDM.Storage.get(window.PDM.Storage.KEYS.MODEL);
    if (curr && CS && typeof CS.isVisionModelId === 'function' && CS.isVisionModelId(curr)) {
        curr = '';
        window.PDM.Storage.set(window.PDM.Storage.KEYS.MODEL, '');
    }
    sel.innerHTML = '';

    if (!models.length) {
        var empty = document.createElement('option');
        empty.value = '';
        empty.textContent = wuText('llmModelEmpty');
        empty.selected = true;
        sel.appendChild(empty);
        sel.disabled = true;
        sel.title = '';
        if (typeof A.syncContextGenModelSelect === 'function') {
            A.syncContextGenModelSelect();
        }
        return;
    }

    sel.disabled = false;
    var found = false;
    for (var i = 0; i < models.length; i++) {
        var o = document.createElement('option');
        o.value = models[i].id;
        o.textContent = window.PDM.Providers.formatModelOptionLabel(models[i]);
        o.title = models[i].id;
        if (models[i].id === curr) { o.selected = true; found = true; }
        sel.appendChild(o);
    }
    if (!found) {
        sel.options[0].selected = true;
        window.PDM.Storage.set(window.PDM.Storage.KEYS.MODEL, sel.options[0].value);
    }
    var selectedOpt = sel.options[sel.selectedIndex];
    sel.title = selectedOpt ? (selectedOpt.title || selectedOpt.textContent) : '';
    if (typeof A.syncContextGenModelSelect === 'function') {
        A.syncContextGenModelSelect();
    }
};

A.handleWorkspaceModelChange = function() {
    var outSel = A.getWorkspaceModelSelect();
    var model = outSel ? outSel.value : '';
    if (!model) return;

    var pid = A.getActiveProviderId();
    if (pid) window.PDM.Storage.set(window.PDM.Storage.KEYS.PROVIDER, pid);
    window.PDM.Storage.set(window.PDM.Storage.KEYS.MODEL, model);
    if (outSel && outSel.options[outSel.selectedIndex]) {
        outSel.title = outSel.options[outSel.selectedIndex].textContent;
    }
    if (typeof A.syncContextGenModelSelect === 'function') {
        A.syncContextGenModelSelect();
    }
    A.refreshModelThinkingCapability(model).then(function() {
        var meta = window.PDM.Providers.modelMeta(pid, model);
        if (meta && meta.thinkingSupported === false && window.PDM.Storage.isLlmThinkingEnabled()) {
            window.PDM.Storage.setLlmThinkingEnabled(false);
        }
        A.updateThinkingAvailabilityUi();
    });

    if (A.isInferenceActive()) {
        return A.restartInferenceIfActive();
    }
    window.PDM.UI.notif(wuText('llmModelSavedInfo', { model: model }), 'info');
};

A.bindWorkspaceLlmConfig = function() {
    if (A._wsLlmConfigBound) return;
    A._wsLlmConfigBound = true;

    var providerSelect = document.getElementById('llm-provider-select');
    if (providerSelect) {
        providerSelect.addEventListener('change', function() {
            if (!window.PDM.Providers.has(providerSelect.value)) {
                providerSelect.value = A.getActiveProviderId() || A.getDefaultProviderId();
                return;
            }
            window.PDM.Storage.set(window.PDM.Storage.KEYS.PROVIDER, providerSelect.value);
            A.refreshWorkspaceLlmConfig();
            window.PDM.Providers.applyActiveSettingsUi();
            A.doSaveProvider({ silent: true });
            A.updateWorkspaceConfigDisplay();
        });
    }

    var outMs = A.getWorkspaceModelSelect();
    if (outMs) {
        outMs.addEventListener('change', function() {
            A.handleWorkspaceModelChange();
        });
    }

    var epInput = document.getElementById('llm-endpoint-url');
    if (epInput) {
        var endpointSaveTimer = null;
        epInput.addEventListener('focus', function() {
            A._endpointUrlOnFocus = epInput.value.trim();
        });
        epInput.addEventListener('input', function() {
            clearTimeout(endpointSaveTimer);
            endpointSaveTimer = setTimeout(function() {
                A.doSaveProvider({ silent: true });
            }, 800);
        });
        epInput.addEventListener('blur', function() {
            clearTimeout(endpointSaveTimer);
            A.doSaveProvider({ silent: true });
            var nextUrl = epInput.value.trim();
            if (nextUrl && nextUrl !== A._endpointUrlOnFocus && typeof A.doTest === 'function') {
                A.doTest(false, 'llm-test-status');
            }
        });
    }

    var btnTestLlm = document.getElementById('btn-test-llm');
    if (btnTestLlm) btnTestLlm.addEventListener('click', function(){ A.doTest(false, 'llm-test-status'); });

    if (window.PDM.ProxyTokenSession) {
        if (typeof window.PDM.ProxyTokenSession.bindOptionsField === 'function') {
            window.PDM.ProxyTokenSession.bindOptionsField();
        }
        if (typeof window.PDM.ProxyTokenSession.syncOptionsField === 'function') {
            window.PDM.ProxyTokenSession.syncOptionsField();
        }
    }
};

A.syncLlmProviderSelect = function() {
    if (window.PDM.Providers.populateProviderSelect) {
        window.PDM.Providers.populateProviderSelect();
    }
};

A.refreshWorkspaceLlmConfig = function() {
    var cp = A.getActiveProviderId();
    if (cp) window.PDM.Storage.set(window.PDM.Storage.KEYS.PROVIDER, cp);
    var adapter = A.getActiveProvider();
    A.syncLlmProviderSelect();

    var ep = document.getElementById('llm-endpoint-url');
    if (ep && adapter && adapter.storage) {
        ep.disabled = false;
        ep.value = adapter.storage.getUrl() || '';
    }

    A.refreshConfigModels(cp);
    if (typeof A.syncLlmOptionsUi === 'function') {
        A.syncLlmOptionsUi();
    } else if (typeof A.syncLlmThinkingRadios === 'function') {
        A.syncLlmThinkingRadios();
    }
    if (window.PDM.ProxyTokenSession && typeof window.PDM.ProxyTokenSession.syncOptionsField === 'function') {
        window.PDM.ProxyTokenSession.syncOptionsField();
    }
    A.refreshModelThinkingCapability().then(function() {
        A.updateThinkingAvailabilityUi();
    });
};

A.refreshConfigModels = function(pid) {
    A.syncWorkspaceOutputModelSelect();
};

A.doSaveProvider = function(opts) {
    opts = opts || {};
    var adapter = A.getActiveProvider();
    var epInp = document.getElementById('llm-endpoint-url');
    var baseUrl = epInp ? epInp.value.trim() : '';
    if (adapter && adapter.storage && baseUrl) {
        adapter.storage.setUrl(baseUrl);
    }
    var pid = A.getActiveProviderId();
    if (pid) window.PDM.Storage.set(window.PDM.Storage.KEYS.PROVIDER, pid);
    if (!opts.silent) {
        window.PDM.UI.notif(wuText('providerSaved'), 'ok');
    }
};

})();
