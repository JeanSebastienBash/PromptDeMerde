/**
 * PromptDeMerde.com — stt-preload.js
 */
(function() {
var STT = window.PDM.STT;
var S = STT.Shared;
function T(key, vars) { return S.sttT(key, vars); }
var engines = STT._engines;

function getEngineId(){return window.PDM.Storage.getSttEngine();}
function getPreloadEngineId(){return window.PDM.Storage.getSttEngine();}
function engineDisplayName(id){var e=engines[id];return e&&(e.shortName||e.label)?(e.shortName||e.label.split(" \u2014 ")[0]):id;}

STT.preloadEngine = function(id, opts) {
    opts = opts || {};
    id = id || getEngineId();
    if (STT.getPendingSttLoadBlockReason && STT.getPendingSttLoadBlockReason()) {
        if (!opts.silent && STT.notifySttLoadBlocked) STT.notifySttLoadBlocked();
        return Promise.resolve(null);
    }
    var eng = engines[id];
    if (!eng || !eng.preloadModel || !eng.isSupported || !eng.isSupported()) {
        return Promise.resolve(null);
    }
    if (S.needsLanBypass()) return Promise.resolve(null);
    if (eng.isModelReady && eng.isModelReady()) {
        if (!STT.needsSttModelLoad()) {
            if (!opts.silent) STT.renderUi();
            return Promise.resolve(null);
        }
        var pendingEngine = STT.getPendingEngineId ? STT.getPendingEngineId() : id;
        var pendingCompute = STT.getPendingCompute ? STT.getPendingCompute() : window.PDM.Storage.getSttCompute();
        if (pendingEngine.indexOf('vosk') === 0 && id.indexOf('vosk') === 0) {
            if (eng.unloadModel) eng.unloadModel();
        } else {
            var dtypeMismatch = false;
            if (pendingEngine.indexOf('whisper') === 0 && eng.getLoadedDtypeKey && S.getExpectedWhisperDtypeKey) {
                dtypeMismatch = eng.getLoadedDtypeKey() !== S.getExpectedWhisperDtypeKey(pendingEngine);
            }
            if (pendingEngine === id && (
                !STT.loadedBackendMatchesCompute(eng, pendingCompute) || dtypeMismatch
            )) {
                if (eng.unloadModel) eng.unloadModel();
            }
        }
    }
    if (STT.needsSttModelLoad && STT.needsSttModelLoad() && STT.applyPendingSttConfig) {
        STT.applyPendingSttConfig();
    }
    if (eng.isModelReady && eng.isModelReady() && !STT.needsSttModelLoad()) {
        if (!opts.silent) STT.renderUi();
        return Promise.resolve(null);
    }
    if (eng.isModelLoading && eng.isModelLoading()) {
        if (!opts.silent) STT.renderUi();
        return Promise.resolve(null);
    }
    if (!opts.silent) STT.renderUi();
    var tick = setInterval(function() {
        if (eng.isModelReady && eng.isModelReady()) {
            clearInterval(tick);
            return;
        }
        STT.renderUi();
    }, 400);
    if (!eng.isModelLoading || !eng.isModelLoading()) {
        STT.reportLoadProgress({ label: T('engineLoadProgress', { name: engineDisplayName(id) }), percent: 0, detail: '' });
    }
    return eng.preloadModel(STT._state.els).then(function() {
        STT.clearLoadProgress();
        if (!opts.silent) STT.renderUi();
        return null;
    }).catch(function() {
        STT.clearLoadProgress();
        return null;
    }).finally(function() {
        if (tick) clearInterval(tick);
        STT.clearLoadProgress();
        if (!STT.needsSttModelLoad()) {
            STT._state.appliedSttCompute = STT.getPendingCompute ? STT.getPendingCompute() : window.PDM.Storage.getSttCompute();
            STT._state.appliedSttEngine = getEngineId();
            STT._state.sttModelWasLoaded = true;
            if (getEngineId() === 'vosk-mini' || getEngineId() === 'vosk-maxi') {
                if (STT.getAppliedVoskLang) STT._state.appliedSttVoskLang = STT.getAppliedVoskLang();
            }
        }
        STT.updateDictationButton();
        STT.updatePreloadButton();
        if (!opts.silent) STT.renderUi();
    });
};

STT.preloadDefaultEngine = function() {
    return Promise.resolve(null);
};

STT.ensureActiveEngineLoaded = function() {
    return Promise.resolve(null);
};

STT.scheduleDefaultPreload = function() {
    return Promise.resolve(null);
};

STT.refreshMicrophones = function(requestPermission) {
    if (!STT._state.els.deviceSelect) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        STT._state.els.deviceSelect.disabled = true;
        return;
    }

    function populate(devices) {
        var saved = window.PDM.Storage.getSttDeviceId();
        var inputs = [];
        for (var i = 0; i < devices.length; i++) {
            if (devices[i].kind === 'audioinput') inputs.push(devices[i]);
        }
        STT._state.els.deviceSelect.innerHTML = '<option value="">' + T('micDefault') + '</option>';
        if (!inputs.length) {
            STT._state.els.deviceSelect.disabled = true;
            if (requestPermission && STT._state.els.status && !STT.isActive()) S.setStatus(STT._state.els, T('micNoneDetected'), 'error');
            return;
        }
        var found = false;
        for (var j = 0; j < inputs.length; j++) {
            var d = inputs[j];
            var opt = document.createElement('option');
            opt.value = d.deviceId;
            opt.textContent = d.label || (T('micLabel') + ' ' + (j + 1));
            if (saved && d.deviceId === saved) { opt.selected = true; found = true; }
            STT._state.els.deviceSelect.appendChild(opt);
        }
        STT._state.els.deviceSelect.disabled = STT.isActive();
        if (!found) STT._state.els.deviceSelect.value = '';
        if (requestPermission && STT._state.els.status && !STT.isActive()) S.setStatus(STT._state.els, T('micCountAvailable', { count: inputs.length }), 'ok');
    }

    function afterPermission(stream) {
        if (stream && stream.getTracks) stream.getTracks().forEach(function(t) { t.stop(); });
        return navigator.mediaDevices.enumerateDevices();
    }

    if (requestPermission && navigator.mediaDevices.getUserMedia) {
        STT.ensureMicAccess().then(afterPermission).then(populate).catch(function(err) {
            if (S.isPermissionDeniedError(err)) {
                if (STT._state.els.status && !STT.isActive()) {
                    S.setStatus(STT._state.els, T('micDeniedInstructions'), 'error');
                }
            } else if (STT._state.els.status && !STT.isActive()) {
                S.setStatus(STT._state.els, S.getMicErrorLabel(err), 'error');
            }
            if (!S.isPermissionDeniedError(err)) S.updatePermButton(STT._state.els, true, false);
            navigator.mediaDevices.enumerateDevices().then(populate).catch(function() {});
            STT.syncPermissionUI();
        });
    } else {
        navigator.mediaDevices.enumerateDevices().then(populate).catch(function() {});
    }
};

})();
