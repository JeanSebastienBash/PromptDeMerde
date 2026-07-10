/**
 * PromptDeMerde.com — settings-ui.js
 *
 * Synopsis : UI onglet Options (LLM, STT, thème, sauvegarde).
 * Objectif : Configurer provider/modèle, dictée, export/import JSON et zone danger.
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
        var outSel = document.getElementById('ws-output-model-select');
        model = (outSel && outSel.value) || window.PDM.Storage.get(window.PDM.Storage.KEYS.MODEL) || '';
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
    var modelsArr = models || [];
    var pid = A.getActiveProviderId();
    if (pid) window.PDM.Providers.setModels(pid, modelsArr);

    var sel = document.getElementById('ws-output-model-select');
    if (sel) {
        sel.innerHTML = '';
        if (modelsArr.length === 0) {
            var curr = window.PDM.Storage.get(window.PDM.Storage.KEYS.MODEL);
            var empty = document.createElement('option');
            empty.value = curr || '';
            empty.textContent = curr ? (curr + ' (sauvegard\u00e9)') : '-- Aucun mod\u00e8le install\u00e9 --';
            empty.selected = true;
            sel.appendChild(empty);
            sel.disabled = !curr;
        } else {
            sel.disabled = false;
            var current = window.PDM.Storage.get(window.PDM.Storage.KEYS.MODEL);
            var found = false;
            for (var i = 0; i < modelsArr.length; i++) {
                var o = document.createElement('option');
                o.value = modelsArr[i].id;
                o.textContent = modelsArr[i].label + ' ' + modelsArr[i].ctx;
                if (modelsArr[i].id === current) { o.selected = true; found = true; }
                sel.appendChild(o);
            }
            if (!found && current) {
                var saved = document.createElement('option');
                saved.value = current;
                saved.textContent = current + ' (sauvegard\u00e9)';
                saved.selected = true;
                sel.appendChild(saved);
                found = true;
            }
            if (!found && modelsArr.length > 0) {
                sel.options[0].selected = true;
                window.PDM.Storage.set(window.PDM.Storage.KEYS.MODEL, sel.options[0].value);
            }
        }
    }

    A.updateWorkspaceConfigDisplay();
    A.enrichLlmModelsCapabilities(modelsArr).then(function() {
        A.updateThinkingAvailabilityUi();
    });
};

A.doSaveModel = function(opts) {
    opts = opts || {};
    var outSel = document.getElementById('ws-output-model-select');
    var model = opts.model || (outSel && outSel.value) || window.PDM.Storage.get(window.PDM.Storage.KEYS.MODEL) || '';

    if (!model) return;

    var pid = A.getActiveProviderId();
    if (pid) window.PDM.Storage.set(window.PDM.Storage.KEYS.PROVIDER, pid);
    window.PDM.Storage.set(window.PDM.Storage.KEYS.MODEL, model);
    if (outSel && outSel.value !== model) outSel.value = model;
    A.updateWorkspaceConfigDisplay();
    A.updateThinkingAvailabilityUi();
    if (!opts.silent) {
        window.PDM.UI.notif('Mod\u00e8le sauvegard\u00e9 : ' + model, 'ok');
    }
};

A.bindSettings = function() {
    if (A._settingsBound) return;
    A._settingsBound = true;

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
    if (window.PDM.ProfileSelector && typeof window.PDM.ProfileSelector.exportConfigFile === 'function') {
        window.PDM.ProfileSelector.exportConfigFile();
        return;
    }
    if (A._wsSaveTimer) {
        clearTimeout(A._wsSaveTimer);
        A._wsSaveTimer = null;
    }
    A.saveWorkspaceFromDom();
    if (typeof A.flushPromptsFromDom === 'function') A.flushPromptsFromDom();
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
    if (window.PDM.ProfileSelector && window.PDM.ProfileSelector.isReservedImportName(file.name)) {
        window.PDM.UI.notif(
            'Import refus\u00e9 : ce nom de fichier est r\u00e9serv\u00e9 \u00e0 un profil JSON officiel (Profil JSON). Renomme ton export.',
            'err'
        );
        return;
    }

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

            var result = window.PDM.Storage.importConfig(normalized, { filename: file.name });
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

A.bootstrapLlmFromProvider = function(opts) {
    opts = opts || {};
    var pid = A.getActiveProviderId();
    var adapter = A.getActiveProvider();
    if (!adapter || !adapter.storage) return Promise.resolve(null);
    return window.PDM.LLM.test(pid, null, null, adapter.storage.getUrl()).then(function(result) {
        if (result && result.ok && result.models) {
            A.populateLlmModels(result.models);
        } else if (typeof A.refreshConfigModels === 'function') {
            A.refreshConfigModels(pid);
        }
        if (opts.thinkingOffOnAuto && typeof A.updateThinkingAvailabilityUi === 'function') {
            A.updateThinkingAvailabilityUi();
        }
        return result;
    }).catch(function() {
        if (typeof A.refreshConfigModels === 'function') A.refreshConfigModels(pid);
        return null;
    });
};

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
