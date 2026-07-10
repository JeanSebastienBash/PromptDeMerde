/**
 * PromptDeMerde.com — stt-core.js
 */
(function() {
var STT = window.PDM.STT;
var S = STT.Shared;
var engines = STT._engines;

STT._state = STT._state || { els:{}, micPermissionState:'unknown', prevMicPermissionState:'unknown', loadProgress:null };
var ENGINE_LABELS={'vosk-mini':'Vosk Mini','vosk-maxi':'Vosk Maxi','whisper-mini':'Whisper Mini','whisper-maxi':'Whisper Maxi',parakeet:'Parakeet'};
var ENGINE_ORDER=(window.PDM.Storage&&window.PDM.Storage.STT_ENGINES)||['vosk-mini','vosk-maxi','whisper-mini','whisper-maxi','parakeet'];
function getPreloadEngineId(){return window.PDM.Storage.getSttEngine();}

STT._getLang = null;

function engineDisplayName(id) {
    var eng = engines[id];
    if (eng && eng.shortName) return eng.shortName;
    if (eng && eng.label) return eng.label.split(' \u2014 ')[0];
    return ENGINE_LABELS[id] || id;
}

function getEngineSelectEls() {
    var list = document.querySelectorAll('#ws-stt-engine-select');
    if (list.length) return list;
    return [];
}

function syncEngineSelect() {
    var selects = getEngineSelectEls();
    if (!selects.length) return;
    STT._state.els.engineSelect = selects[0];
    var current = getEngineId();
    var opts = [];
    ENGINE_ORDER.forEach(function(id) {
        var eng = engines[id];
        if (!eng) return;
        opts.push({ id: id, label: engineDisplayName(id) });
    });
    if (!opts.length) return;
    var value = engines[current] ? current : 'vosk-maxi';
    for (var s = 0; s < selects.length; s++) {
        var select = selects[s];
        var preserved = select.value;
        if (preserved && engines[preserved]) value = preserved;
        select.innerHTML = '';
        opts.forEach(function(item) {
            var opt = document.createElement('option');
            opt.value = item.id;
            opt.textContent = item.label;
            select.appendChild(opt);
        });
        select.value = value;
        select.disabled = STT.isModelLoading() || STT.isDictating();
    }
}

STT.syncEngineSelect = syncEngineSelect;

function getEngineId() {
    return window.PDM.Storage.getSttEngine();
}

function getEngine() {
    return engines[getEngineId()] || engines['vosk-maxi'] || null;
}

function getOtherEngines(activeId) {
    var list = [];
    var seen = {};
    for (var k in engines) {
        if (!engines.hasOwnProperty(k)) continue;
        var eng = engines[k];
        if (!eng || !eng.id || eng.id === activeId || seen[eng.id]) continue;
        seen[eng.id] = true;
        list.push(eng);
    }
    return list;
}

function unloadOtherEngines(activeId) {
    getOtherEngines(activeId).forEach(function(eng) {
        if (eng.unloadModel) eng.unloadModel();
    });
}

function stopOtherEngines(activeId) {
    getOtherEngines(activeId).forEach(function(eng) {
        if (eng.isActive && eng.isActive() && eng.stop) {
            eng.stop(makeCtx(), { silent: true });
        }
        if (eng.unloadModel) eng.unloadModel();
    });
}

function makePermDeniedError() {
    var err = new Error('permission-denied');
    err.name = 'PermissionDeniedError';
    err._pdmPermDenied = true;
    return err;
}

function handleMicAccessError(err) {
    if (S.isPermissionDeniedError(err)) {
        STT._state.micPermissionState = 'denied';
        S.updateDeniedPanel(STT._state.els, true);
        S.updatePermButton(STT._state.els, true, true);
        S.clearStoredMicDevice(STT._state.els);
    }
    return Promise.reject(err);
}

function onMicAccessGranted(stream) {
    STT._state.micPermissionState = 'granted';
    S.clearStripHint();
    S.updateDeniedPanel(STT._state.els, false);
    S.updatePermButton(STT._state.els, false);
    return stream;
}

function makeCtx() {
    return {
        els: STT._state.els,
        onSave: STT._onSave,
        getLang: STT._getLang,
        get micPermissionState() { return STT._state.micPermissionState; },
        facade: STT
    };
}

function queryMicPermission() {
    if (!navigator.permissions || !navigator.permissions.query) return Promise.resolve('unknown');
    return navigator.permissions.query({ name: 'microphone' }).then(function(status) {
        if (!status._pdmBound) {
            status._pdmBound = true;
            status.onchange = function() {
                STT._state.micPermissionState = status.state;
                STT.syncPermissionUI();
            };
        }
        STT._state.micPermissionState = status.state;
        return status.state;
    }).catch(function() { return 'unknown'; });
}

STT.queryMicPermission = queryMicPermission;
STT.makePermDeniedError = makePermDeniedError;
STT.handleMicAccessError = handleMicAccessError;
STT.onMicAccessGranted = onMicAccessGranted;

STT.isActive = function() {
    for (var k in engines) {
        if (engines.hasOwnProperty(k) && engines[k].isActive && engines[k].isActive()) return true;
    }
    return false;
};

/** Dictée en cours (micro ou écoute) — exclut le chargement modèle seul. */
STT.isDictating = function() {
    var eng = getEngine();
    if (!eng || !eng.getState) return false;
    var state = eng.getState();
    return state === S.STATE_LISTENING || state === S.STATE_PERMISSION;
};

STT.getState = function() {
    var eng = getEngine();
    return eng && eng.getState ? eng.getState() : S.STATE_IDLE;
};

STT.isModelReady = function() {
    var eng = getEngine();
    return !!(eng && eng.isModelReady && eng.isModelReady());
};

STT.isModelLoading = function() {
    var eng = getEngine();
    return !!(eng && eng.isModelLoading && eng.isModelLoading());
};

STT.getPendingEngineId = function() {
    var sel = STT._state.els.engineSelect || document.getElementById('ws-stt-engine-select');
    if (sel && sel.value && engines[sel.value]) return sel.value;
    return getEngineId();
};

STT.getPendingCompute = function() {
    var sel = document.getElementById('stt-compute-select');
    if (sel && (sel.value === 'cpu' || sel.value === 'gpu')) return sel.value;
    return window.PDM.Storage.getSttCompute();
};

STT.needsSttModelLoad = function() {
    var pendingEngine = STT.getPendingEngineId();
    var activeEngine = getEngineId();
    if (pendingEngine !== activeEngine) return true;
    var eng = engines[pendingEngine] || getEngine();
    if (!eng || !eng.isModelReady || !eng.isModelReady()) return true;
    var pendingCompute = STT.getPendingCompute();
    if (STT._state.appliedSttCompute == null) {
        STT._state.appliedSttCompute = pendingCompute;
        STT._state.appliedSttEngine = activeEngine;
        return false;
    }
    if (pendingEngine.indexOf('vosk') === 0) return false;
    return pendingCompute !== STT._state.appliedSttCompute;
};

STT.onPendingSttOptionChange = function() {
    STT.renderComputeUi();
    STT.updatePreloadButton();
    STT.updateDictationButton();
};

STT.applyPendingSttConfig = function() {
    var pendingEngine = STT.getPendingEngineId();
    var pendingCompute = STT.getPendingCompute();
    if (pendingEngine.indexOf('vosk') === 0) pendingCompute = 'cpu';
    else {
        var caps = S.getGpuCaps();
        var gpuAvailable = !!(caps.canUserChooseGpu || (caps.webgpuAvailable && !caps.adapterIsFallback && caps.vramGb >= S.GPU_VRAM_CHOICE_GB));
        if (pendingCompute === 'gpu' && !gpuAvailable) pendingCompute = 'cpu';
    }
    window.PDM.Storage.setSttCompute(pendingCompute);
    var computeSel = document.getElementById('stt-compute-select');
    if (computeSel) computeSel.value = pendingCompute;

    if (pendingEngine !== getEngineId()) {
        STT.setEngine(pendingEngine, { silent: true });
        return;
    }
    var eng = getEngine();
    if (eng && eng.isModelReady && eng.isModelReady()) {
        if (STT._state.appliedSttCompute != null && pendingCompute !== STT._state.appliedSttCompute && eng.unloadModel) {
            eng.unloadModel();
        }
    }
};

STT.updatePreloadButton = function() {
    var btn = document.getElementById('stt-preload-btn');
    if (!btn) return;
    var eng = getEngine();
    var supported = !!(eng && eng.isSupported && eng.isSupported());
    var needsLoad = STT.needsSttModelLoad();
    var ready = !needsLoad;
    var loading = STT.isModelLoading();
    var lanBlocked = S.needsLanBypass();
    var inferActive = window.PDM.App && window.PDM.App.isInferenceActive && window.PDM.App.isInferenceActive();
    var micReady = STT._state.micPermissionState === 'granted';
    var fullyReady = ready && !loading && !lanBlocked && micReady;
    var readyLabel = ready && !loading
        ? (fullyReady ? '\u2713 Pr\u00eat' : 'Mod\u00e8le charg\u00e9')
        : null;

    btn.classList.toggle('stt-preload-btn-ready', fullyReady);
    var preloadTitle = loading
        ? 'Chargement du mod\u00e8le vocal\u2026'
        : (readyLabel || 'Charger le mod\u00e8le vocal');
    btn.title = preloadTitle;
    btn.setAttribute('aria-label', preloadTitle);
    if (!supported || lanBlocked || inferActive || STT.isDictating()) {
        btn.disabled = true;
        if (readyLabel) btn.textContent = fullyReady ? '\u2713' : '\u2713';
        else if (loading) btn.textContent = '\u23F3';
        else btn.textContent = '\uD83D\uDCE5';
        return;
    }
    if (ready && !loading) {
        btn.disabled = true;
        btn.textContent = fullyReady ? '\u2713' : '\u2713';
    } else if (loading) {
        btn.disabled = true;
        btn.textContent = '\u23F3';
    } else {
        btn.disabled = false;
        btn.textContent = '\uD83D\uDCE5';
    }
};

STT.loadModelManually = function() {
    if (STT.isModelLoading()) {
        window.PDM.UI.notif('Chargement du mod\u00e8le vocal en cours\u2026', 'info');
        return;
    }
    if (S.needsLanBypass()) {
        STT.showLanSettings();
        return;
    }
    if (STT.isModelReady()) {
        window.PDM.UI.notif('Mod\u00e8le vocal d\u00e9j\u00e0 charg\u00e9 pour cette configuration.', 'info');
        return;
    }
    STT.applyPendingSttConfig();
    STT.preloadEngine(getEngineId(), { silent: false }).then(function() {
        STT.updatePreloadButton();
        STT.updateDictationButton();
    });
};

STT.updateDictationButton = function() {
    if (!STT._state.els.btn) return;
    var eng = getEngine();
    var supported = eng && eng.isSupported && eng.isSupported();
    var inferActive = window.PDM.App && window.PDM.App.isInferenceActive && window.PDM.App.isInferenceActive();

    if (STT.isActive()) {
        var state = STT.getState();
        STT._state.els.btn.disabled = false;
        if (state === S.STATE_LOADING) {
            S.updateButton(STT._state.els, true, 'loading');
            STT._state.els.btn.title = 'Annuler le chargement en cours';
        } else {
            S.updateButton(STT._state.els, true);
            STT._state.els.btn.title = state === S.STATE_PERMISSION
                ? 'Annuler la demande de micro'
                : 'Arr\u00eater la dict\u00e9e vocale';
        }
        STT._state.els.btn.classList.remove('stt-btn-waiting');
        return;
    }

    var loading = STT.isModelLoading();
    var ready = !STT.needsSttModelLoad();
    var lanBlocked = S.needsLanBypass();
    var blocked = !supported || lanBlocked || inferActive || loading || !ready;

    STT._state.els.btn.disabled = blocked;
    STT._state.els.btn.classList.toggle('stt-btn-waiting', loading && !ready && supported && !lanBlocked);
    S.updateButton(STT._state.els, false);

    if (inferActive) {
        STT._state.els.btn.title = 'Nettoyage en cours \u2014 arr\u00eate-le avant la dict\u00e9e.';
    } else if (loading) {
        STT._state.els.btn.title = 'Chargement du mod\u00e8le vocal en cours\u2026';
    } else if (!ready && supported && !lanBlocked) {
        STT._state.els.btn.title = 'Clique sur \u00ab Charger \u00bb avant la dict\u00e9e.';
    } else if (lanBlocked) {
        STT._state.els.btn.title = 'Micro indisponible en HTTP \u2014 voir le d\u00e9pannage micro ci-dessous';
    } else {
        STT._state.els.btn.title = '';
    }
};

STT.toggle = function() {
    var eng = getEngine();
    if (!eng) {
        S.notifyStt('Moteur vocal indisponible.', 'err');
        return;
    }
    if (window.PDM.App && window.PDM.App.isInferenceActive && window.PDM.App.isInferenceActive()) {
        S.notifyStt('Nettoyage en cours \u2014 arr\u00eate-le avant la dict\u00e9e.', 'err');
        return;
    }
    if (!eng.isActive || !eng.isActive()) {
        if (STT.needsSttModelLoad()) {
            S.notifyStt(
                STT.isModelLoading()
                    ? 'Chargement du mod\u00e8le vocal en cours \u2014 patiente.'
                    : 'Clique sur l\u2019ic\u00f4ne Charger avant la dict\u00e9e.',
                'warn'
            );
            STT.updateDictationButton();
            STT.updatePreloadButton();
            return;
        }
        if (S.warmupBeepAudio) S.warmupBeepAudio();
        stopOtherEngines(eng.id);
    } else if (S.warmupBeepAudio) {
        S.warmupBeepAudio();
    }
    eng.toggle(makeCtx());
    STT.updateDictationButton();
    STT.updatePreloadButton();
};

STT.stop = function(opts) {
    for (var k in engines) {
        if (engines.hasOwnProperty(k) && engines[k].isActive && engines[k].isActive()) {
            engines[k].stop(makeCtx(), opts);
            S.hideLoadProgress(STT._state.els);
            if (!opts || !opts.silent) {
                STT.updateDictationButton();
                STT.refresh();
            }
            return;
        }
    }
    STT._reset();
};

STT._reset = function() {
    for (var k in engines) {
        if (engines.hasOwnProperty(k) && engines[k]._reset) engines[k]._reset(makeCtx());
    }
    S.hideLoadProgress(STT._state.els);
    S.setState(STT._state.els, S.isSupported() ? S.STATE_IDLE : S.STATE_UNSUPPORTED);
    S.updateButton(STT._state.els, false);
    S.setBusy(STT._state.els, false, false);
    STT.updateDictationButton();
    STT.refresh();
};

STT.setEngine = function(id, opts) {
    opts = opts || {};
    if (STT.isActive()) return;
    id = engines[id] ? id : window.PDM.Storage._normSttEngine(id);
    if (getEngineId() === id) return;
    unloadOtherEngines(id);
    window.PDM.Storage.setSttEngine(id);
    var selects = getEngineSelectEls();
    for (var i = 0; i < selects.length; i++) selects[i].value = id;
    var eng = engines[id];
    if (eng && eng.onEngineSelected) eng.onEngineSelected();
    STT.renderComputeUi();
    STT.refresh();
    STT.updatePreloadButton();
    if (!opts.silent && id === 'parakeet' && S.wantsGpuCompute() && !S.hasWebGPU()) {
        window.PDM.UI.notif('Parakeet : WebGPU indisponible, repli CPU (WASM).', 'info');
    }
};

STT.getEngine = function() { return getEngineId(); };
})();
