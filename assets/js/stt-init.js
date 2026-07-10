/**
 * PromptDeMerde.com — stt-init.js
 */
(function() {
var STT = window.PDM.STT;
var S = STT.Shared;
var engines = STT._engines;

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
    STT._getLang = opts.getLang || function() { return 'fr'; };

    STT._state.els.btn = document.getElementById('stt-btn');
    STT._state.els.permBtn = document.getElementById('stt-perm-btn');
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
        return;
    }
    STT._uiBound = true;

    if (STT._state.els.btn) {
        STT._state.els.btn.setAttribute('aria-pressed', 'false');
        STT._state.els.btn.addEventListener('click', STT.toggle);
    }
    if (STT._state.els.permBtn) {
        STT._state.els.permBtn.addEventListener('click', function() {
            if (S.needsLanBypass()) STT.retryLanBypass();
            else STT.retryPermission(true);
        });
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

    window.addEventListener('beforeunload', function() {
        if (STT.isActive()) STT.stop({ silent: true });
        else {
            for (var k in engines) {
                if (engines.hasOwnProperty(k) && engines[k].unloadModel) engines[k].unloadModel();
            }
        }
    });
    window.addEventListener('hashchange', function() {
        var hash = window.location.hash.replace('#', '') || (
            (window.PDM.Homepage && window.PDM.Homepage.resolveRoute)
                ? window.PDM.Homepage.resolveRoute('')
                : 'workspace'
        );
        // Quitter le workspace arrête la dictée (flux audio) mais conserve le
        // modèle en cache : il n'est libéré qu'au changement de moteur.
        if (hash !== 'workspace' && STT.isActive()) STT.stop({ silent: true });
        if (STT.syncEngineSelect) STT.syncEngineSelect();
        STT.refresh();
        if (!STT.isActive() && STT.ensureActiveEngineLoaded) STT.ensureActiveEngineLoaded();
    });
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
            STT.syncPermissionUI().then(function() { STT.renderUi(); });
        }
    });
    window.addEventListener('focus', function() {
        STT.syncPermissionUI().then(function() { STT.renderUi(); });
    });

    STT.refresh();
    S.probeGpuCapabilities().then(function() {
        STT.renderComputeUi();
        STT.updatePreloadButton();
        if (STT.scheduleDefaultPreload) STT.scheduleDefaultPreload();
    });
};

if (document.getElementById('ws-stt-engine-select') && STT.syncEngineSelect) STT.syncEngineSelect();
})();
