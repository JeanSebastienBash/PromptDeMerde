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

A.getWorkspaceModelSelect = function() {
    return document.getElementById('ws-output-model-select');
};

A.updateConfigModelInfo = function() {
    /* Réservé compat — info modèle affichée via output-meta / notifs. */
};

A.syncWorkspaceOutputModelSelect = function() {
    var sel = A.getWorkspaceModelSelect();
    if (!sel) return;

    var pid = A.getActiveProviderId();
    var models = window.PDM.Providers.models(pid) || [];
    var curr = window.PDM.Storage.get(window.PDM.Storage.KEYS.MODEL);
    sel.innerHTML = '';

    if (!models.length) {
        var empty = document.createElement('option');
        empty.value = curr || '';
        empty.textContent = curr ? (curr + ' (sauvegard\u00e9)') : '-- Aucun mod\u00e8le --';
        empty.selected = true;
        sel.appendChild(empty);
        sel.disabled = !curr;
        return;
    }

    sel.disabled = false;
    var found = false;
    for (var i = 0; i < models.length; i++) {
        var o = document.createElement('option');
        o.value = models[i].id;
        o.textContent = models[i].label + ' (' + models[i].ctx + ')';
        if (models[i].id === curr) { o.selected = true; found = true; }
        sel.appendChild(o);
    }
    if (!found && curr) {
        var saved = document.createElement('option');
        saved.value = curr;
        saved.textContent = curr + ' (sauvegard\u00e9)';
        saved.selected = true;
        sel.appendChild(saved);
        found = true;
    }
    if (!found && models.length > 0) {
        sel.options[0].selected = true;
        window.PDM.Storage.set(window.PDM.Storage.KEYS.MODEL, sel.options[0].value);
    }
};

A.handleWorkspaceModelChange = function() {
    var outSel = A.getWorkspaceModelSelect();
    var model = outSel ? outSel.value : '';
    if (!model) return;

    var pid = A.getActiveProviderId();
    if (pid) window.PDM.Storage.set(window.PDM.Storage.KEYS.PROVIDER, pid);
    window.PDM.Storage.set(window.PDM.Storage.KEYS.MODEL, model);
    A.refreshModelThinkingCapability(model).then(function() {
        A.updateThinkingAvailabilityUi();
    });

    if (A.isInferenceActive()) {
        return A.restartInferenceIfActive();
    }
    window.PDM.UI.notif('Mod\u00e8le LLM : ' + model, 'info');
};

A.bindWorkspaceLlmConfig = function() {
    if (A._wsLlmConfigBound) return;
    A._wsLlmConfigBound = true;

    var providerSelect = document.getElementById('llm-provider-select');
    if (providerSelect) {
        providerSelect.addEventListener('change', function() {
            if (!window.PDM.Providers.has(providerSelect.value)) {
                providerSelect.value = A.getActiveProviderId() || A.getDefaultProviderId();
                window.PDM.UI.notif('Ce provider sera disponible plus tard.', 'info');
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
        epInput.addEventListener('input', function() {
            clearTimeout(endpointSaveTimer);
            endpointSaveTimer = setTimeout(function() {
                A.doSaveProvider({ silent: true });
            }, 800);
        });
        epInput.addEventListener('blur', function() {
            clearTimeout(endpointSaveTimer);
            A.doSaveProvider({ silent: true });
        });
    }

    var btnTestLlm = document.getElementById('btn-test-llm');
    if (btnTestLlm) btnTestLlm.addEventListener('click', function(){ A.doTest(false, 'llm-test-status'); });
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
    A.syncLlmThinkingRadios();
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
        window.PDM.UI.notif('Provider sauvegard\u00e9.', 'ok');
    }
};

})();
