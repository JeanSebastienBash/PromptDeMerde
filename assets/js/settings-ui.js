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

function stgT(key, vars) {
    var I = window.PDM && window.PDM.I18n;
    return I ? I.t('settings.' + key, vars) : '';
}

A.reloadFreshAfterWipe = function() {
    var url;
    try {
        url = new URL(window.location.href);
        url.searchParams.set('pdm_fresh', String(Date.now()));
    } catch (e) {
        window.location.reload();
        return;
    }
    var target = url.pathname + url.search + url.hash;
    var bustHref = url.pathname + url.search;
    var go = function() {
        window.location.replace(target);
    };
    if (typeof fetch === 'function') {
        fetch(bustHref, { cache: 'reload', credentials: 'same-origin' }).then(go, go);
        return;
    }
    go();
};

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

    setStatus('<span class="dot wait"></span> ' + stgT('testInProgress'));

    window.PDM.LLM.test(provider, model, null, baseUrl).then(function(result){
        var ok = result && result.ok;
        if (ok) {
            var count = result.models ? result.models.length : 0;
            var routeKey = result.route === 'proxy' ? 'testRouteProxy'
                : (result.route === 'direct' ? 'testRouteDirect' : '');
            var routeLabel = routeKey ? stgT(routeKey) : '';
            if (count > 0) {
                var plural = count > 1 ? 's' : '';
                var msg = stgT('testOk', { count: count, plural: plural });
                if (routeLabel) msg += ' — ' + routeLabel;
                setStatus('<span class="dot ok"></span> ' + msg);
                scheduleSuccessClear();
                if (!fromWorkspace) {
                    A.populateLlmModels(result.models);
                }
            } else {
                var noModelsMsg = stgT('testOkNoModels');
                if (routeLabel) noModelsMsg += ' — ' + routeLabel;
                setStatus('<span class="dot ok"></span> ' + noModelsMsg);
                scheduleSuccessClear();
                if (!fromWorkspace) {
                    A.populateLlmModels([]);
                }
            }
        } else {
            var errMsg = (typeof result === 'object' && result && result.error) ? result.error : stgT('testFail');
            setStatus('<span class="dot fail"></span> \u274c ' + window.PDM.UI.escapeHtml(errMsg));
            if (!fromWorkspace) {
                A.populateLlmModels([]);
            }
        }
    }).catch(function(err){
        setStatus('<span class="dot fail"></span> \u274c ' + window.PDM.UI.escapeHtml(err.message || err));
        if (!fromWorkspace) {
            A.populateLlmModels([]);
        }
    });
};

A.populateLlmModels = function(models) {
    var CS = window.PDM && window.PDM.ConfigSchema;
    var modelsArr = models || [];
    if (CS && typeof CS.filterTextLlmModels === 'function') {
        modelsArr = CS.filterTextLlmModels(modelsArr);
    }
    var pid = A.getActiveProviderId();
    if (pid) window.PDM.Providers.setModels(pid, modelsArr);

    var storedModel = window.PDM.Storage.get(window.PDM.Storage.KEYS.MODEL);
    if (storedModel && CS && typeof CS.isVisionModelId === 'function' && CS.isVisionModelId(storedModel)) {
        window.PDM.Storage.set(window.PDM.Storage.KEYS.MODEL, '');
    }

    var sel = document.getElementById('ws-output-model-select');
    if (sel) {
        sel.innerHTML = '';
        if (modelsArr.length === 0) {
            window.PDM.Storage.set(window.PDM.Storage.KEYS.MODEL, '');
            var empty = document.createElement('option');
            empty.value = '';
            empty.textContent = stgT('noModels');
            empty.selected = true;
            sel.appendChild(empty);
            sel.disabled = true;
            sel.title = '';
        } else {
            sel.disabled = false;
            var current = window.PDM.Storage.get(window.PDM.Storage.KEYS.MODEL);
            var found = false;
            for (var i = 0; i < modelsArr.length; i++) {
                var o = document.createElement('option');
                o.value = modelsArr[i].id;
                o.textContent = window.PDM.Providers.formatModelOptionLabel(modelsArr[i], 'settings');
                o.title = modelsArr[i].id;
                if (modelsArr[i].id === current) { o.selected = true; found = true; }
                sel.appendChild(o);
            }
            if (!found) {
                sel.options[0].selected = true;
                window.PDM.Storage.set(window.PDM.Storage.KEYS.MODEL, sel.options[0].value);
            }
            var selectedOpt = sel.options[sel.selectedIndex];
            sel.title = selectedOpt ? (selectedOpt.title || selectedOpt.textContent) : '';
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
        window.PDM.UI.notif(stgT('modelSaved', { model: model }), 'ok');
    }
};

A.applyLanguageChange = function(next) {
    next = String(next || '').trim().toLowerCase();
    if (!next) return;
    var I = window.PDM && window.PDM.I18n;
    if (I && Array.isArray(I.LOCALES) && I.LOCALES.length) {
        if (I.LOCALES.indexOf(next) < 0) {
            if (window.PDM.UI && window.PDM.UI.notif) {
                window.PDM.UI.notif(stgT('langUnavailable', null,
                    'Cette langue n\u2019est pas disponible dans votre configuration import\u00e9e.'), 'err');
            }
            A.refreshSettings();
            return;
        }
    } else if (window.PDM.ConfigSchema && window.PDM.ConfigSchema.LANGUAGES &&
        window.PDM.ConfigSchema.LANGUAGES.indexOf(next) === -1) {
        next = 'fr';
    }
    var current = window.PDM.Storage.getLanguage ? window.PDM.Storage.getLanguage() : 'fr';
    if (next === current) return;

    var run = function() {
        A._applyLanguageChangeNow(next);
    };
    var STT = window.PDM && window.PDM.STT;
    if (STT && typeof STT.confirmDisruptiveAction === 'function' && STT.isActive && STT.isActive()) {
        STT.confirmDisruptiveAction({ reason: 'reload' }).then(function(ok) {
            if (ok) run();
            else A.refreshSettings();
        });
        return;
    }
    run();
};

A._applyLanguageChangeNow = function(next) {
    if (typeof A.flushPromptsFromDom === 'function') A.flushPromptsFromDom();
    if (typeof A.flushGenPromptsFromDom === 'function') A.flushGenPromptsFromDom();
    var PBun = window.PDM && window.PDM.PromptsBundle;
    var S = window.PDM && window.PDM.Storage;
    if (PBun && S && typeof PBun.captureFromSession === 'function') {
        var currentLang = S.getLanguage ? S.getLanguage() : 'fr';
        var profileId = S.getActiveProfile ? S.getActiveProfile() : '';
        PBun.captureFromSession(currentLang, profileId);
    }
    window.PDM.Storage.set(window.PDM.Storage.KEYS.LANGUAGE, next);
    var chain = Promise.resolve();
    if (window.PDM.I18n && typeof window.PDM.I18n.setLocale === 'function') {
        chain = window.PDM.I18n.setLocale(next, { silent: true });
    }
    chain.then(function() {
        if (typeof window.PDM.Storage.syncWorkspaceUiTextsForLocale === 'function') {
            window.PDM.Storage.syncWorkspaceUiTextsForLocale();
        }
        window.PDM.Storage.set('pdm_profile_synopsis', '');
        window.PDM.Storage.set('pdm_profile_synopsis_lang', '');
        window.location.reload();
    }).catch(function() {
        window.location.reload();
    });
};

A.bindSettings = function() {
    if (A._settingsBound) return;
    A._settingsBound = true;

    var lang = document.getElementById('settings-lang');
    if (lang) {
        lang.addEventListener('change', function(e){
            A.applyLanguageChange(e.target.value);
        });
    }

    var langFlags = document.getElementById('settings-lang-flags');
    if (langFlags) {
        langFlags.addEventListener('click', function(e) {
            var btn = e.target && e.target.closest ? e.target.closest('[data-lang]') : null;
            if (!btn) return;
            var code = btn.getAttribute('data-lang');
            if (!code) return;
            var current = window.PDM.Storage.getLanguage ? window.PDM.Storage.getLanguage() : 'fr';
            if (code === current) return;
            var sel = document.getElementById('settings-lang');
            if (sel) sel.value = code;
            A.applyLanguageChange(code);
        });
    }

    var clear = document.getElementById('clear-btn');
    if (clear) {
        clear.addEventListener('click', function(){
            if (!confirm(stgT('clearConfirm'))) return;
            var proceed = function() {
                var done = window.PDM.Storage.clearAll();
                if (!done || typeof done.then !== 'function') done = Promise.resolve(done);
                done.then(function() {
                    window.PDM.UI.notif(stgT('cleared'), 'info');
                    setTimeout(function() { A.reloadFreshAfterWipe(); }, 300);
                }).catch(function(err) {
                    console.warn('[settings clearAll]', err);
                    window.PDM.UI.notif(stgT('cleared'), 'info');
                    setTimeout(function() { A.reloadFreshAfterWipe(); }, 300);
                });
            };
            var STT = window.PDM && window.PDM.STT;
            if (STT && typeof STT.confirmDisruptiveAction === 'function' && STT.isActive && STT.isActive()) {
                STT.confirmDisruptiveAction({ reason: 'reload' }).then(function(ok) {
                    if (ok) proceed();
                });
                return;
            }
            proceed();
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
        var result = window.PDM.ProfileSelector.exportConfigFile();
        if (result && typeof result.then === 'function') {
            result.catch(function(err) {
                console.warn('[export]', err);
            });
        }
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
        if (!confirm(stgT('exportTokenConfirm'))) {
            return;
        }
    }
    var data = window.PDM.Storage.exportConfig();
    if (!data) {
        window.PDM.UI.notif(stgT('exportFail'), 'err');
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
    window.PDM.UI.notif(stgT('exported'), 'ok');
};

A.doImportConfig = function(file) {
    if (window.PDM.ProfileSelector && window.PDM.ProfileSelector.isReservedImportName(file.name)) {
        window.PDM.UI.notif(stgT('importReserved'), 'err');
        return;
    }

    var isJson = /\.json$/i.test(file.name) || file.type === 'application/json';
    if (isJson) {
        window.PDM.UI.notif(stgT('importJsonDeprecated', null,
            'Import JSON abandonné. Utilisez une archive ZIP profil (.zip).'), 'err');
        return;
    }

    var isZip = /\.zip$/i.test(file.name) || file.type === 'application/zip' || file.type === 'application/x-zip-compressed';
    if (!isZip) {
        window.PDM.UI.notif(stgT('importZipOnly', null,
            'Seules les archives ZIP profil sont acceptées.'), 'err');
        return;
    }

    var CS = window.PDM && window.PDM.ConfigSchema;
    var maxZipBytes = (CS && CS.MAX_IMPORT_ZIP_BYTES) ? CS.MAX_IMPORT_ZIP_BYTES : (20 * 1024 * 1024);
    if (file.size > maxZipBytes) {
        window.PDM.UI.notif(
            stgT('importZipTooLarge', { max: Math.round(maxZipBytes / 1024 / 1024) },
                'Archive trop volumineuse (max ' + Math.round(maxZipBytes / 1024 / 1024) + ' Mo).'),
            'err'
        );
        return;
    }

    if (!confirm(stgT('importUnsignedConfirm'))) return;

    var startImport = function() {
        var reader = new FileReader();
        reader.onload = function(e) {
            var importOptions = {
                filename: file.name,
                stripTokens: true,
                source: '',
                tier: 'free'
            };
            var finishImport = function(result) {
                if (!result || !result.ok) {
                    var failMsg = result && result.errors && result.errors.length
                        ? (result.errors.length === 1 ? result.errors[0] : result.errors.join('\n'))
                        : (result && result.error ? result.error : stgT('importFail'));
                    window.PDM.UI.notif(failMsg, 'err');
                    return;
                }
                window.PDM.UI.notif(stgT('importSuccess'), 'ok');
                setTimeout(function() { window.location.reload(); }, 800);
            };

            if (!window.PDM.Storage || typeof window.PDM.Storage.importConfigZip !== 'function') {
                window.PDM.UI.notif(stgT('importZipUnavailable', null, 'Import ZIP indisponible.'), 'err');
                return;
            }

            window.PDM.Storage.importConfigZip(e.target.result, importOptions).then(finishImport);
        };
        reader.onerror = function() {
            window.PDM.UI.notif(stgT('importFail'), 'err');
        };
        reader.readAsArrayBuffer(file);
    };

    var STT = window.PDM && window.PDM.STT;
    if (STT && typeof STT.confirmDisruptiveAction === 'function' && STT.isActive && STT.isActive()) {
        STT.confirmDisruptiveAction({ reason: 'reload' }).then(function(ok) {
            if (ok) startImport();
        });
        return;
    }
    startImport();
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
        if (window.PDM.OllamaMissingNudge) window.PDM.OllamaMissingNudge.maybeShow(result);
        return result;
    }).catch(function() {
        if (typeof A.refreshConfigModels === 'function') A.refreshConfigModels(pid);
        if (window.PDM.OllamaMissingNudge) window.PDM.OllamaMissingNudge.maybeShow(null);
        return null;
    });
};

A.refreshSettings = function() {
    window.PDM.UI.renderThemePicker();
    var lang = window.PDM.Storage.get(window.PDM.Storage.KEYS.LANGUAGE) || 'fr';
    var sel = document.getElementById('settings-lang');
    var I = window.PDM && window.PDM.I18n;
    if (sel && I && Array.isArray(I.LOCALE_LIST) && I.LOCALE_LIST.length) {
        sel.innerHTML = '';
        I.LOCALE_LIST.forEach(function(entry) {
            var opt = document.createElement('option');
            opt.value = entry.code;
            opt.textContent = I.getLocaleDisplayLabel(entry.code);
            sel.appendChild(opt);
        });
        if (I.LOCALES.indexOf(lang) >= 0) {
            sel.value = lang;
        } else if (I.LOCALES.length) {
            sel.value = I.LOCALES[0];
        }
    } else if (sel) {
        sel.value = lang;
    }
    if (I && typeof I.applyLangFlags === 'function') {
        I.applyLangFlags(document);
    }
    if (I && typeof I.applyLangSelect === 'function') {
        I.applyLangSelect(document);
    }

    A.refreshWorkspaceLlmConfig();
    A.updateConfigIOButtons();
    A.refreshSTT();
    if (window.PDM.ProfileSelector) {
        if (typeof window.PDM.ProfileSelector.populateSelector === 'function') {
            window.PDM.ProfileSelector.populateSelector();
        } else if (typeof window.PDM.ProfileSelector._syncSelectorToActive === 'function') {
            window.PDM.ProfileSelector._syncSelectorToActive();
        }
    }
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
