/**
 * PromptDeMerde.com — Options, test connexion LLM et export/import.
 */
(function(){
"use strict";

var A = window.PDM && window.PDM.App;
if (!A) { console.warn('[settings-ui] PDM.App not found.'); return; }

A.doTest = function(fromWorkspace, statusId) {
    statusId = statusId || 'llm-test-status';
    var statusEl = document.getElementById(statusId);

    if (A._llmTestStatusTimer) {
        clearTimeout(A._llmTestStatusTimer);
        A._llmTestStatusTimer = null;
    }

    var provider = A.getActiveProviderId();
    var adapter = A.getActiveProvider();
    var model, baseUrl;
    if (fromWorkspace) {
        model = window.PDM.Storage.get(window.PDM.Storage.KEYS.MODEL) || window.PDM.Providers.defaultModel(provider);
        baseUrl = adapter && adapter.storage ? adapter.storage.getUrl() : '';
    } else {
        var sel = document.getElementById('config-model');
        model = sel ? sel.value : '';
        var epInp = document.getElementById('llm-endpoint-url');
        baseUrl = epInp ? epInp.value.trim() : '';
    }

    if (baseUrl && !fromWorkspace && adapter && adapter.storage) {
        adapter.storage.setUrl(baseUrl);
    }

    var setStatus = function(html, className) {
        if (!statusEl) return;
        if (className === undefined) {
            statusEl.innerHTML = html;
        } else {
            statusEl.textContent = html;
            statusEl.className = 'conn-status ' + className;
        }
    };

    var scheduleSuccessClear = function() {
        if (A._llmTestStatusTimer) clearTimeout(A._llmTestStatusTimer);
        A._llmTestStatusTimer = setTimeout(function() {
            A._llmTestStatusTimer = null;
            if (!statusEl) return;
            statusEl.innerHTML = '';
            statusEl.className = 'conn-status';
        }, 2000);
    };

    setStatus('<span class="dot wait"></span> Test...');

    window.PDM.LLM.test(provider, model, null, baseUrl).then(function(result){
        var ok = result && result.ok;
        if (ok) {
            var count = result.models ? result.models.length : 0;
            if (count > 0) {
                setStatus('<span class="dot ok"></span> ✅ TEST OK — ' + count + ' modèle' + (count > 1 ? 's' : '') + ' trouvé' + (count > 1 ? 's' : ''));
                scheduleSuccessClear();
                if (!fromWorkspace) {
                    A.populateLlmModels(result.models);
                }
            } else {
                setStatus('<span class="dot ok"></span> Connexion OK — aucun modèle installé');
                scheduleSuccessClear();
                if (!fromWorkspace) {
                    A.populateLlmModels([]);
                }
            }
        } else {
            var errMsg = (typeof result === 'object' && result && result.error) ? result.error : '\u00c9chec de connexion';
            setStatus('<span class="dot fail"></span> \u274c ' + window.PDM.UI.escapeHtml(errMsg));
        }
    }).catch(function(err){
        setStatus('<span class="dot fail"></span> \u274c ' + window.PDM.UI.escapeHtml(err.message || err));
    });
};

/**
 * Peuple le select des modèles du provider actif.
 */
A.populateLlmModels = function(models) {
    var adapter = A.getActiveProvider();
    function fillSelect(selId, isConfig) {
        if (!selId) return;
        var sel = document.getElementById(selId);
        if (!sel) return;

        sel.innerHTML = '';
        var modelsArr = models || [];

        if (modelsArr.length === 0) {
            var empty = document.createElement('option');
            empty.value = '';
            empty.textContent = '-- Aucun modèle installé --';
            sel.appendChild(empty);
            sel.disabled = true;
            if (isConfig) {
                var info = document.getElementById('config-model-info');
                if (info) info.textContent = adapter ? adapter.getEmptyModelsHint() : 'Aucun modèle détecté.';
            }
            return;
        }

        sel.disabled = false;
        var curr = window.PDM.Storage.get(window.PDM.Storage.KEYS.MODEL);
        var found = false;
        for (var i = 0; i < modelsArr.length; i++) {
            var o = document.createElement('option');
            o.value = modelsArr[i].id;
            o.textContent = modelsArr[i].label + ' ' + modelsArr[i].ctx;
            if (modelsArr[i].id === curr) { o.selected = true; found = true; }
            sel.appendChild(o);
        }
        if (!found && modelsArr.length > 0) {
            sel.options[0].selected = true;
            window.PDM.Storage.set(window.PDM.Storage.KEYS.MODEL, sel.options[0].value);
        }

        if (isConfig) {
            var info = document.getElementById('config-model-info');
            if (info) info.textContent = adapter ? adapter.getModelsCountHint(modelsArr.length) : (modelsArr.length + ' modèle(s)');
        }
    }

    var pid = A.getActiveProviderId();
    if (pid) window.PDM.Providers.setModels(pid, models || []);
    fillSelect('config-model', true);
    A.updateWorkspaceConfigDisplay();
    A.enrichLlmModelsCapabilities(models || []).then(function() {
        A.updateThinkingAvailabilityUi();
    });
};

A.doSaveModel = function(opts) {
    opts = opts || {};
    var sel = document.getElementById('config-model');
    var model = sel ? sel.value : '';

    if (!model) return;

    var pid = A.getActiveProviderId();
    if (pid) window.PDM.Storage.set(window.PDM.Storage.KEYS.PROVIDER, pid);
    window.PDM.Storage.set(window.PDM.Storage.KEYS.MODEL, model);
    A.updateWorkspaceConfigDisplay();
    A.updateThinkingAvailabilityUi();
    if (!opts.silent) {
        window.PDM.UI.notif('Mod\u00e8le sauvegard\u00e9 : ' + model, 'ok');
    }
};

A.bindSettings = function() {
    var lang = document.getElementById('settings-lang');
    if (lang) {
        lang.addEventListener('change', function(e){
            window.PDM.Storage.set(window.PDM.Storage.KEYS.LANGUAGE, e.target.value);
            window.PDM.UI.notif('Langue sauvegard\u00e9e.', 'ok');
        });
    }

    var clear = document.getElementById('clear-btn');
    if (clear) {
        clear.addEventListener('click', function(){
            if (confirm('Tout effacer ? Profils, tokens et configuration seront perdus.')) {
                window.PDM.Storage.clearAll();
                window.PDM.UI.notif('Tout effac\u00e9.', 'info');
                setTimeout(function(){ window.location.hash = A._defaultRoute(); }, 1000);
            }
        });
    }

    var configExportBtn = document.getElementById('config-export-btn');
    if (configExportBtn) {
        configExportBtn.addEventListener('click', function(){ A.doExportConfig(); });
    }

    var configImportBtn = document.getElementById('config-import-btn');
    var configImportFile = document.getElementById('config-import-file');
    if (configImportBtn && configImportFile) {
        configImportBtn.addEventListener('click', function(){ configImportFile.click(); });
        configImportFile.addEventListener('change', function(e){
            if (e.target.files && e.target.files[0]) {
                A.doImportConfig(e.target.files[0]);
            }
            e.target.value = '';
        });
    }
};

A.doExportConfig = function() {
    if (A._wsSaveTimer) {
        clearTimeout(A._wsSaveTimer);
        A._wsSaveTimer = null;
    }
    A.saveWorkspaceFromDom();
    var token = window.PDM.Storage.getToken('ollama');
    if (token && String(token).trim()) {
        if (!confirm('L\u2019export inclut le token API Ollama en clair. Continuer ?')) {
            return;
        }
    }
    var data = window.PDM.Storage.exportConfig();
    if (!data) {
        window.PDM.UI.notif('Impossible d\u2019exporter la configuration.', 'err');
        return;
    }
    var json = JSON.stringify(data, null, 2);
    var blob = new Blob([json], {type: 'application/json'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'promptdemerde-config-v' + data.version + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    window.PDM.UI.notif('Configuration export\u00e9e.', 'ok');
};

A.doImportConfig = function(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
        try {
            var data = JSON.parse(e.target.result);
            var CS = window.PDM.ConfigSchema;
            var normalized = CS ? CS.normalizeLegacyConfig(data) : data;
            var validation = CS ? CS.validatePdmConfig(normalized) : { ok: false, errors: ['Module de validation indisponible.'] };
            if (!validation.ok) {
                var errMsg = validation.errors.length === 1
                    ? validation.errors[0]
                    : validation.errors.length + ' erreurs :\n' + validation.errors.join('\n');
                window.PDM.UI.notif(errMsg, 'err');
                return;
            }

            var msg = 'Importer cette configuration remplacera toutes tes donn\u00e9es actuelles. Continuer ?';
            if (!confirm(msg)) return;

            var result = window.PDM.Storage.importConfig(normalized);
            if (!result.ok) {
                var failMsg = result.errors && result.errors.length
                    ? (result.errors.length === 1 ? result.errors[0] : result.errors.join('\n'))
                    : (result.error || 'Erreur lors de l\u2019import.');
                window.PDM.UI.notif(failMsg, 'err');
                return;
            }
            window.PDM.UI.notif('Configuration import\u00e9e. Rechargement...', 'ok');
            setTimeout(function(){ window.location.reload(); }, 800);
        } catch(err) {
            window.PDM.UI.notif('Fichier JSON invalide.', 'err');
        }
    };
    reader.readAsText(file);
};

A.updateConfigIOButtons = function() {
    var exportBtn = document.getElementById('config-export-btn');
    var importBtn = document.getElementById('config-import-btn');
    if (exportBtn) {
        exportBtn.disabled = false;
        exportBtn.style.opacity = '1';
        exportBtn.title = '';
    }
    if (importBtn) {
        importBtn.disabled = false;
        importBtn.style.opacity = '1';
        importBtn.title = '';
    }
};

A.doExport = A.doExportConfig;
A.doImport = A.doImportConfig;

A.refreshSettings = function() {
    window.PDM.UI.renderThemePicker();
    var lang = window.PDM.Storage.get(window.PDM.Storage.KEYS.LANGUAGE) || 'fr';
    var sel = document.getElementById('settings-lang');
    if (sel) sel.value = lang;

    A.refreshWorkspaceLlmConfig();
    A.updateConfigIOButtons();
    A.refreshSTT();
};

A.refreshSTT = function() {
    if (window.PDM.STT) window.PDM.STT.refresh();
};

A.refreshMicrophones = function(requestPermission) {
    if (window.PDM.STT) window.PDM.STT.refreshMicrophones(requestPermission);
};

A.toggleSTT = function() {
    if (window.PDM.STT) window.PDM.STT.toggle();
};

})();
