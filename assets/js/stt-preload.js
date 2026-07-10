/**
 * PromptDeMerde.com — stt-preload.js
 */
(function() {
var STT = window.PDM.STT;
var S = STT.Shared;
var engines = STT._engines;

function getEngineId(){return window.PDM.Storage.getSttEngine();}
/** Moteur préchargé au boot : celui enregistré (défaut vosk-maxi, ou profil JSON importé). */
function getPreloadEngineId(){return window.PDM.Storage.getSttEngine();}
function engineDisplayName(id){var e=engines[id];return e&&(e.shortName||e.label)?(e.shortName||e.label.split(" \u2014 ")[0]):id;}

STT.preloadEngine = function(id, opts) {
    opts = opts || {};
    id = id || getEngineId();
    var eng = engines[id];
    if (!eng || !eng.preloadModel || !eng.isSupported || !eng.isSupported()) {
        return Promise.resolve(null);
    }
    if (S.needsLanBypass()) return Promise.resolve(null);
    if (eng.isModelReady && eng.isModelReady()) {
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
        STT.reportLoadProgress({ label: 'Chargement ' + engineDisplayName(id), percent: 0, detail: '' });
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
        var eng = engines[getEngineId()];
        if (eng && eng.isModelReady && eng.isModelReady()) {
            STT._state.appliedSttCompute = window.PDM.Storage.getSttCompute();
            STT._state.appliedSttEngine = getEngineId();
        }
        STT.updateDictationButton();
        STT.updatePreloadButton();
        if (!opts.silent) STT.renderUi();
    });
};

STT.preloadDefaultEngine = function() {
    return STT.preloadEngine(getPreloadEngineId(), { silent: true });
};

STT.ensureActiveEngineLoaded = function() {
    return STT.preloadEngine(getEngineId(), { silent: true });
};

function scheduleDefaultPreload() {
    var attempts = 0;
    function tryPreload() {
        var engineId = getPreloadEngineId();
        var eng = engines[engineId];
        if (eng && eng.preloadModel) {
            if (eng.isModelReady && eng.isModelReady()) return;
            if (eng.isModelLoading && eng.isModelLoading()) return;
            STT.preloadDefaultEngine();
            return;
        }
        attempts++;
        if (attempts < 30) setTimeout(tryPreload, 100);
    }
    var run = function() { tryPreload(); };
    if (window.requestIdleCallback) window.requestIdleCallback(run, { timeout: 3000 });
    else setTimeout(run, 80);
}

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
        STT._state.els.deviceSelect.innerHTML = '<option value="">Micro par d\u00e9faut</option>';
        if (!inputs.length) {
            STT._state.els.deviceSelect.disabled = true;
            if (requestPermission && STT._state.els.status && !STT.isActive()) S.setStatus(STT._state.els, 'Aucun micro d\u00e9tect\u00e9.', 'error');
            return;
        }
        var found = false;
        for (var j = 0; j < inputs.length; j++) {
            var d = inputs[j];
            var opt = document.createElement('option');
            opt.value = d.deviceId;
            opt.textContent = d.label || ('Micro ' + (j + 1));
            if (saved && d.deviceId === saved) { opt.selected = true; found = true; }
            STT._state.els.deviceSelect.appendChild(opt);
        }
        STT._state.els.deviceSelect.disabled = STT.isActive();
        if (!found) STT._state.els.deviceSelect.value = '';
        if (requestPermission && STT._state.els.status && !STT.isActive()) S.setStatus(STT._state.els, inputs.length + ' micro(s) disponible(s).', 'ok');
    }

    function afterPermission(stream) {
        if (stream && stream.getTracks) stream.getTracks().forEach(function(t) { t.stop(); });
        return navigator.mediaDevices.enumerateDevices();
    }

    if (requestPermission && navigator.mediaDevices.getUserMedia) {
        STT.ensureMicAccess().then(afterPermission).then(populate).catch(function(err) {
            if (S.isPermissionDeniedError(err)) {
                if (STT._state.els.status && !STT.isActive()) {
                    S.setStatus(STT._state.els, 'Permission micro refus\u00e9e \u2014 suis les instructions ci-dessous.', 'error');
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

STT.scheduleDefaultPreload=scheduleDefaultPreload;
})();
