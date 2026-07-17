/**
 * PromptDeMerde.com — stt-init.js
 */
(function() {
var STT = window.PDM.STT;
var S = STT.Shared;
var engines = STT._engines;

function T(key, vars) { return S.sttT(key, vars); }

function getEngineId(){return window.PDM.Storage.getSttEngine();}
function getEngine(){return engines[getEngineId()]||engines["vosk-maxi"]||null;}

STT.refresh = function() {
    var eng = getEngine();
    var ok = eng && eng.isSupported && eng.isSupported();
    if (!ok) {
        S.setState(STT._state.els, S.STATE_UNSUPPORTED);
        if (STT._state.els.btn) STT._state.els.btn.style.display = 'inline-block';
    } else if (!STT.isActive()) {
        S.setState(STT._state.els, S.STATE_IDLE);
        if (STT._state.els.btn) STT._state.els.btn.style.display = 'inline-block';
    } else if (STT._state.els.btn) {
        STT._state.els.btn.style.display = 'inline-block';
    }
    if (STT._state.els.engineSelect && !STT.isModelLoading() && !STT.isDictating()) {
        var pending = STT._state.els.engineSelect.value;
        if (!pending || !engines[pending]) STT._state.els.engineSelect.value = getEngineId();
    }

    if (STT.syncEngineSelect) STT.syncEngineSelect();

    if (STT._state.els.help && !STT._state.els.help.hidden && eng && eng.getHelpText) {
        STT._state.els.help.textContent = eng.getHelpText();
    }

    S.updateWorkspaceLanHint(S.needsLanBypass());

    if (!STT.isActive()) {
        S.updateButton(STT._state.els, false);
    }

    STT.renderComputeUi();
    STT.renderUi();
    STT.updatePreloadButton();
    STT.refreshMicrophones(false);
    STT.syncPermissionUI();
};

STT.getEls = function() { return STT._state.els; };

STT.init = function(opts) {
    opts = opts || {};
    STT._onSave = opts.onSave || function() {};
    STT._getLang = opts.getLang || function() { return S.getSttLocale(); };

    STT._state.els.btn = document.getElementById('stt-btn');
    STT._state.els.permBtn = null;
    STT._state.els.block = document.getElementById('stt-block');
    STT._state.els.help = document.getElementById('stt-help');
    STT._state.els.deviceSelect = document.getElementById('stt-device-select');
    STT._state.els.engineSelect = document.getElementById('ws-stt-engine-select');
    STT._state.els.input = document.getElementById('ws-input');
    STT._state.els.charCount = document.getElementById('char-count');
    STT._state.els.loadPanel = document.getElementById('stt-load-panel');
    STT._state.els.loadLabel = STT._state.els.loadPanel ? STT._state.els.loadPanel.querySelector('[data-stt-load-label]') : null;
    STT._state.els.loadBar = STT._state.els.loadPanel ? STT._state.els.loadPanel.querySelector('[data-stt-load-bar]') : null;
    STT._state.els.loadFill = STT._state.els.loadPanel ? STT._state.els.loadPanel.querySelector('[data-stt-load-fill]') : null;
    STT._state.els.loadDetail = STT._state.els.loadPanel ? STT._state.els.loadPanel.querySelector('[data-stt-load-detail]') : null;

    if (STT._uiBound) {
        STT.refresh();
        if (STT.bindSttOptionsPanel) STT.bindSttOptionsPanel();
        return;
    }
    STT._uiBound = true;

    if (STT._state.els.btn) {
        STT._state.els.btn.setAttribute('aria-pressed', 'false');
        STT._state.els.btn.addEventListener('click', STT.toggle);
    }
    var refreshBtn = document.getElementById('stt-refresh-devices');
    if (refreshBtn) refreshBtn.addEventListener('click', function() { STT.refreshMicrophones(true); });
    if (STT._state.els.engineSelect) {
        if (STT.syncEngineSelect) STT.syncEngineSelect();
        STT._state.els.engineSelect.addEventListener('change', function() {
            STT.onPendingSttOptionChange();
        });
    }
    var computeSelect = document.getElementById('stt-compute-select');
    if (computeSelect) {
        computeSelect.addEventListener('change', function() {
            STT.onPendingSttOptionChange();
        });
    }
    var voskLangSelect = document.getElementById('stt-vosk-lang-select');
    if (voskLangSelect && voskLangSelect.dataset.voskBound !== '1') {
        voskLangSelect.dataset.voskBound = '1';
        voskLangSelect.addEventListener('change', function() {
            STT.onPendingSttOptionChange();
        });
    }
    if (window.PDM.STT.VoskCatalog && STT.populateVoskLangSelect) {
        STT.populateVoskLangSelect().then(function() {
            var engineId = STT.getPendingEngineId ? STT.getPendingEngineId() : getEngineId();
            STT._state._voskSelectTier = engineId === 'vosk-maxi' ? 'maxi' : (engineId === 'vosk-mini' ? 'mini' : null);
            if (window.PDM.I18n && window.PDM.I18n.getLocale) {
                STT.prepositionVoskLangFromUi(window.PDM.I18n.getLocale());
            }
            STT.syncVoskLangSelect();
            STT.renderVoskLangUi();
        });
    }
    document.addEventListener('pdm:localechange', function(ev) {
        var locale = ev && ev.detail ? ev.detail.locale : null;
        if (!locale && window.PDM.I18n && window.PDM.I18n.getLocale) {
            locale = window.PDM.I18n.getLocale();
        }
        if (STT.prepositionVoskLangFromUi) STT.prepositionVoskLangFromUi(locale);
        if (STT.onPendingSttOptionChange) STT.onPendingSttOptionChange();
    });
    var preloadBtn = document.getElementById('stt-preload-btn');
    if (preloadBtn) {
        preloadBtn.addEventListener('click', function() {
            STT.loadModelManually();
        });
    }
    if (STT._state.els.deviceSelect) {
        STT._state.els.deviceSelect.addEventListener('change', function() {
            window.PDM.Storage.setSttDeviceId(STT._state.els.deviceSelect.value);
        });
    }

    var insertToggle = document.getElementById('stt-insert-at-cursor');
    if (insertToggle) {
        var syncInsertToggleLabel = function() {
            var label = document.getElementById('stt-insert-mode-label');
            if (label) label.textContent = insertToggle.checked ? T('insertCursor') : T('insertEnd');
        };
        insertToggle.checked = window.PDM.Storage.getSttInsertAtCursor();
        syncInsertToggleLabel();
        insertToggle.addEventListener('change', function() {
            window.PDM.Storage.setSttInsertAtCursor(insertToggle.checked);
            syncInsertToggleLabel();
        });
    }

    var deleteWordEnabled = document.getElementById('stt-delete-word-enabled');
    var deleteWordShortcut = document.getElementById('stt-delete-word-shortcut');
    var deleteWordTarget = document.getElementById('stt-delete-word-target');
    if (deleteWordEnabled || deleteWordShortcut || deleteWordTarget) {
        var syncDeleteWordUi = function() {
            var on = window.PDM.Storage.getSttDeleteWordEnabled();
            if (deleteWordEnabled) deleteWordEnabled.checked = on;
            var enabledLabel = document.getElementById('stt-delete-word-enabled-label');
            if (enabledLabel) enabledLabel.textContent = on ? T('deleteWordEnabled') : T('deleteWordDisabled');
            if (deleteWordShortcut) {
                deleteWordShortcut.value = window.PDM.Storage.getSttDeleteWordShortcut();
                deleteWordShortcut.disabled = !on;
            }
            if (deleteWordTarget) {
                deleteWordTarget.value = window.PDM.Storage.getSttDeleteWordTarget();
                deleteWordTarget.disabled = !on;
            }
        };
        syncDeleteWordUi();
        if (deleteWordEnabled) {
            deleteWordEnabled.addEventListener('change', function() {
                window.PDM.Storage.setSttDeleteWordEnabled(deleteWordEnabled.checked);
                syncDeleteWordUi();
            });
        }
        if (deleteWordShortcut) {
            deleteWordShortcut.addEventListener('change', function() {
                window.PDM.Storage.setSttDeleteWordShortcut(deleteWordShortcut.value);
            });
        }
        if (deleteWordTarget) {
            deleteWordTarget.addEventListener('change', function() {
                window.PDM.Storage.setSttDeleteWordTarget(deleteWordTarget.value);
            });
        }
    }

    window.addEventListener('beforeunload', function() {
        if (STT.isActive()) STT.stop({ silent: true });
        else {
            for (var k in engines) {
                if (engines.hasOwnProperty(k) && engines[k].unloadModel) engines[k].unloadModel();
            }
        }
    });
    window.addEventListener('hashchange', function() {
        // Continuité dictée : ne pas stopper au changement d'écran SPA.
        // Arrêt explicite uniquement via Stopper / beforeunload / actions dédiées.
        if (STT.syncEngineSelect) STT.syncEngineSelect();
        STT.refresh();
    });
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
            STT.syncPermissionUI().then(function() { STT.renderUi(); });
        }
    });
    window.addEventListener('focus', function() {
        STT.syncPermissionUI().then(function() { STT.renderUi(); });
    });
    var gpuProbeUiTimer = null;

    function onGpuProbeSettled() {
        STT.renderComputeUi();
        var eng = getEngine();
        if (eng && eng.isModelReady && eng.isModelReady() && STT.needsSttModelLoad && STT.needsSttModelLoad()) {
            var pendingCompute = STT.getPendingCompute ? STT.getPendingCompute() : window.PDM.Storage.getSttCompute();
            if (STT.loadedBackendMatchesCompute && !STT.loadedBackendMatchesCompute(eng, pendingCompute)) {
                if (eng.unloadModel) eng.unloadModel();
                STT._state.appliedSttCompute = null;
                STT._state.appliedSttEngine = null;
            }
        }
        STT.updatePreloadButton();
        STT.updateDictationButton();
    }
    function startGpuProbeWatchdog() {
        if (gpuProbeUiTimer) clearTimeout(gpuProbeUiTimer);
        var started = Date.now();
        function tick() {
            var caps = S.getGpuCaps();
            if (caps.probeDone) {
                gpuProbeUiTimer = null;
                return;
            }
            STT.renderComputeUi();
            if (Date.now() - started > 11000) {
                gpuProbeUiTimer = null;
                S.probeGpuCapabilities({ force: true }).then(onGpuProbeSettled);
                return;
            }
            gpuProbeUiTimer = setTimeout(tick, 500);
        }
        gpuProbeUiTimer = setTimeout(tick, 500);
    }

    function startDeferredGpuProbe() {
        startGpuProbeWatchdog();
        S.probeGpuCapabilities().then(onGpuProbeSettled).catch(onGpuProbeSettled);
    }

    function deferAfterFirstPaint(fn) {
        var run = function() {
            if (window.requestIdleCallback) {
                window.requestIdleCallback(fn, { timeout: 8000 });
            } else {
                setTimeout(fn, 100);
            }
        };
        if (document.readyState === 'complete') run();
        else window.addEventListener('load', run, { once: true });
    }

    STT.refresh();
    if (STT.bindSttOptionsPanel) STT.bindSttOptionsPanel();
    deferAfterFirstPaint(startDeferredGpuProbe);
    if (typeof STT.maybeOfferResumeAfterReload === 'function') {
        setTimeout(function() { STT.maybeOfferResumeAfterReload(); }, 0);
    }
};

if (document.getElementById('ws-stt-engine-select') && STT.syncEngineSelect) STT.syncEngineSelect();
})();
