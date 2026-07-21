/**
 * PromptDeMerde.com — stt-core.js
 */
(function() {
var STT = window.PDM.STT;
var S = STT.Shared;
var engines = STT._engines;

function T(key, vars) { return S.sttT(key, vars); }

STT._state = STT._state || { els:{}, micPermissionState:'unknown', prevMicPermissionState:'unknown', loadProgress:null };
var ENGINE_ORDER=(window.PDM.Storage&&window.PDM.Storage.STT_ENGINES)||['vosk-mini','vosk-maxi','whisper-mini','whisper-maxi','parakeet'];
function getPreloadEngineId(){return window.PDM.Storage.getSttEngine();}

STT._getLang = null;

function engineDisplayName(id) {
    var eng = engines[id];
    if (eng && eng.shortName) return eng.shortName;
    if (eng && eng.label) return eng.label.split(' \u2014 ')[0];
    return S.engineLabel(id);
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

STT.getActiveTextSession = function() {
    for (var k in engines) {
        if (engines.hasOwnProperty(k) && engines[k].isActive && engines[k].isActive() && engines[k].getTextSession) {
            var session = engines[k].getTextSession();
            if (session) return session;
        }
    }
    return null;
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

STT.getAppliedVoskLang = function() {
    return window.PDM.Storage.getSttVoskLang();
};

STT.getPendingVoskLang = function() {
    var sel = document.getElementById('stt-vosk-lang-select');
    if (sel) return sel.value ? window.PDM.Storage._normSttVoskLang(sel.value) : '';
    return STT.getAppliedVoskLang();
};

STT.getLoadVoskLangId = function() {
    var sel = document.getElementById('stt-vosk-lang-select');
    if (sel && sel.value) return window.PDM.Storage._normSttVoskLang(sel.value);
    return STT.getAppliedVoskLang();
};

STT.formatVoskLangLabel = function(langId) {
    var Cat = STT.VoskCatalog;
    if (!langId) return '';
    if (Cat && Cat.getLangEntry) {
        var entry = Cat.getLangEntry(langId);
        if (entry && Cat.formatLangLabel) return Cat.formatLangLabel(entry);
    }
    return String(langId);
};

STT.getDesiredVoskLangId = function() {
    var engine = STT.getPendingEngineId();
    if (engine === 'vosk-mini' || engine === 'vosk-maxi') {
        return STT.getLoadVoskLangId() || STT.getPendingVoskLang();
    }
    return null;
};

STT.isVoskMaxiLangBlocked = function() {
    if (STT.getPendingEngineId() !== 'vosk-maxi') return false;
    var lang = STT.getLoadVoskLangId();
    if (!lang) return false;
    var Cat = STT.VoskCatalog;
    if (!Cat || !Cat.isMaxiLangAvailable) return lang !== 'fr' && lang !== 'en-us';
    return !Cat.isMaxiLangAvailable(lang);
};

STT.isPendingVoskModelAvailable = function() {
    var engine = STT.getPendingEngineId();
    if (engine !== 'vosk-mini' && engine !== 'vosk-maxi') return true;
    var lang = STT.getLoadVoskLangId();
    if (!lang) return false;
    var Cat = STT.VoskCatalog;
    if (!Cat) return false;
    if (engine === 'vosk-maxi') {
        return Cat.isMaxiLangAvailable ? Cat.isMaxiLangAvailable(lang) : false;
    }
    return Cat.isLangAvailable ? Cat.isLangAvailable(lang) : false;
};

STT.isPendingMiniModelAvailable = function() {
    return STT.isPendingVoskModelAvailable();
};

STT.getPendingSttLoadBlockReason = function() {
    var pendingEngine = STT.getPendingEngineId();
    var sel = document.getElementById('stt-vosk-lang-select');
    if ((pendingEngine === 'vosk-mini' || pendingEngine === 'vosk-maxi') && sel && !sel.value) {
        return 'vosk-lang-unselected';
    }
    if (STT.isVoskMaxiLangBlocked()) return 'vosk-maxi-lang-unavailable';
    if (!STT.isPendingVoskModelAvailable()) return 'vosk-lang-unavailable';
    return null;
};

STT.isPendingSttLoadBlocked = function() {
    return !!STT.getPendingSttLoadBlockReason();
};

STT.notifySttLoadBlocked = function(reason) {
    reason = reason || STT.getPendingSttLoadBlockReason();
    var lang = STT.formatVoskLangLabel(STT.getDesiredVoskLangId());
    if (reason === 'vosk-maxi-lang-unavailable') {
        S.notifyStt(T('notif.voskMaxiLangBlocked', { lang: lang }), 'err');
    } else if (reason === 'vosk-lang-unselected') {
        S.notifyStt(T('notif.engineLangUnselected'), 'warn');
    } else {
        S.notifyStt(T('notif.engineLangUnavailable', { lang: lang }), 'err');
    }
};

STT.onVoskModelLoaded = function(engineId, cfg) {
    if ((engineId !== 'vosk-mini' && engineId !== 'vosk-maxi') || !cfg || !cfg.voskLangId) return;
    window.PDM.Storage.setSttVoskLang(cfg.voskLangId);
    STT._state.appliedSttVoskLang = cfg.voskLangId;
};

STT.syncVoskLangSelect = function() {
    var sel = document.getElementById('stt-vosk-lang-select');
    if (!sel || sel.dataset.voskBound !== '1') return;
    var applied = STT.getAppliedVoskLang();
    var hasOpt = false;
    for (var i = 0; i < sel.options.length; i++) {
        if (sel.options[i].value === applied && !sel.options[i].disabled) { hasOpt = true; break; }
    }
    if (hasOpt) sel.value = applied;
};

STT.prepositionVoskLangFromUi = function(uiLocale) {
    var sel = document.getElementById('stt-vosk-lang-select');
    var Cat = window.PDM.STT.VoskCatalog;
    if (!sel || !Cat || !Cat.uiLocaleToVoskLang) return;
    var mapped = Cat.uiLocaleToVoskLang(uiLocale);
    var found = false;
    for (var i = 0; i < sel.options.length; i++) {
        if (sel.options[i].value === mapped && !sel.options[i].disabled) { found = true; break; }
    }
    if (found) sel.value = mapped;
};

STT.populateVoskLangSelect = function() {
    var sel = document.getElementById('stt-vosk-lang-select');
    var Cat = window.PDM.STT.VoskCatalog;
    if (!sel || !Cat) return Promise.resolve();
    return Cat.load().then(function() {
        var list = Cat.listAllLangs ? Cat.listAllLangs() : Cat.listAvailable();
        var engineId = STT.getPendingEngineId ? STT.getPendingEngineId() : getEngineId();
        var tier = engineId === 'vosk-maxi' ? 'maxi' : 'mini';
        var applied = STT.getAppliedVoskLang();
        var preserve = sel.value;
        sel.innerHTML = '';

        function tierAvailable(langId) {
            return Cat.isLangAvailableForTier
                ? Cat.isLangAvailableForTier(langId, tier)
                : (tier === 'maxi'
                    ? (Cat.isMaxiLangAvailable && Cat.isMaxiLangAvailable(langId))
                    : Cat.isLangAvailable(langId));
        }

        list.forEach(function(entry) {
            var opt = document.createElement('option');
            opt.value = entry.id;
            opt.textContent = Cat.formatLangLabel(entry);
            if (!tierAvailable(entry.id)) opt.disabled = true;
            sel.appendChild(opt);
        });

        var pick = applied;
        if (preserve && tierAvailable(preserve)) pick = preserve;
        var matched = false;
        for (var k = 0; k < list.length; k++) {
            if (list[k].id === pick && tierAvailable(pick)) {
                sel.value = pick;
                matched = true;
                break;
            }
        }
        if (!matched) {
            for (var m = 0; m < list.length; m++) {
                if (tierAvailable(list[m].id)) {
                    sel.value = list[m].id;
                    matched = true;
                    break;
                }
            }
        }
        if (!matched) {
            var ph = document.createElement('option');
            ph.value = '';
            ph.textContent = T('engineLangChoose');
            sel.appendChild(ph);
            sel.value = '';
        }
    });
};

STT.unloadVoskIfLangMismatch = function() {
    var pendingEngine = STT.getPendingEngineId();
    if (pendingEngine !== 'vosk-mini' && pendingEngine !== 'vosk-maxi') return;
    var pendingLang = STT.getLoadVoskLangId();
    if (!pendingLang) return;
    var eng = engines[pendingEngine];
    if (!eng || !eng.isModelReady || !eng.isModelReady()) return;
    var V = window.PDM.STT._vosk;
    var loadedLang = V && V.getLoadedVoskLangId ? V.getLoadedVoskLangId(pendingEngine) : null;
    if (loadedLang && loadedLang !== pendingLang) {
        if (eng.unloadModel) eng.unloadModel();
        STT._state.appliedSttVoskLang = null;
    }
};

STT.loadedBackendMatchesCompute = function(eng, compute) {
    if (!eng || !eng.getLoadedBackend) return true;
    var backend = eng.getLoadedBackend();
    if (!backend) return false;
    if (compute === 'gpu') return backend === 'webgpu' || backend === 'webgpu-hybrid';
    return backend === 'wasm' || backend === 'cpu';
};

STT.needsSttModelLoad = function() {
    if (STT.isPendingSttLoadBlocked()) return true;
    var pendingEngine = STT.getPendingEngineId();
    var activeEngine = getEngineId();
    if (pendingEngine !== activeEngine) return true;
    var eng = engines[pendingEngine] || getEngine();
    if (!eng || !eng.isModelReady || !eng.isModelReady()) return true;
    var pendingCompute = STT.getPendingCompute();
    if (pendingEngine.indexOf('vosk') === 0) {
        if (pendingEngine === 'vosk-mini' || pendingEngine === 'vosk-maxi') {
            var pendingLang = STT.getLoadVoskLangId();
            var appliedLang = STT.getAppliedVoskLang();
            if (!pendingLang || pendingLang !== appliedLang) return true;
            var V = window.PDM.STT._vosk;
            if (V && V.getLoadedVoskLangId) {
                var loadedLang = V.getLoadedVoskLangId(pendingEngine);
                if (loadedLang !== appliedLang) return true;
            }
        }
        STT._state.appliedSttCompute = pendingCompute;
        STT._state.appliedSttEngine = activeEngine;
        STT._state.appliedSttVoskLang = STT.getAppliedVoskLang();
        return false;
    }
    if (!STT.loadedBackendMatchesCompute(eng, pendingCompute)) return true;
    if (pendingEngine.indexOf('whisper') === 0 && eng.getLoadedDtypeKey && S.getExpectedWhisperDtypeKey) {
        var expectedDtype = S.getExpectedWhisperDtypeKey(pendingEngine);
        if (eng.getLoadedDtypeKey() !== expectedDtype) return true;
    }
    STT._state.appliedSttCompute = pendingCompute;
    STT._state.appliedSttEngine = activeEngine;
    return false;
};

STT.onPendingSttOptionChange = function() {
    var engineId = STT.getPendingEngineId();
    var tier = engineId === 'vosk-maxi' ? 'maxi' : (engineId === 'vosk-mini' ? 'mini' : null);
    if (tier && tier !== STT._state._voskSelectTier && STT.populateVoskLangSelect) {
        STT._state._voskSelectTier = tier;
        return STT.populateVoskLangSelect().then(function() {
            STT.unloadVoskIfLangMismatch();
            STT.renderVoskLangUi();
            STT.renderComputeUi();
            STT.renderModelUi();
            STT.updatePreloadButton();
            STT.updateDictationButton();
        });
    }
    STT.unloadVoskIfLangMismatch();
    STT.renderVoskLangUi();
    STT.renderComputeUi();
    STT.renderModelUi();
    STT.updatePreloadButton();
    STT.updateDictationButton();
};

STT.applyPendingSttConfig = function() {
    var pendingEngine = STT.getPendingEngineId();
    var pendingCompute = STT.getPendingCompute();
    var pendingLang = STT.getPendingVoskLang();
    if (pendingEngine.indexOf('vosk') === 0) pendingCompute = 'cpu';
    else {
        var caps = S.getGpuCaps();
        var gpuAvailable = !!caps.canUserChooseGpu;
        if (pendingCompute === 'gpu' && !gpuAvailable) pendingCompute = 'cpu';
    }
    window.PDM.Storage.setSttCompute(pendingCompute);
    var computeSel = document.getElementById('stt-compute-select');
    if (computeSel) computeSel.value = pendingCompute;

    if (pendingEngine !== getEngineId()) {
        if ((pendingEngine === 'vosk-mini' || pendingEngine === 'vosk-maxi') && pendingLang) {
            window.PDM.Storage.setSttVoskLang(pendingLang);
        }
        STT.setEngine(pendingEngine, { silent: true });
        return;
    }
    var eng = getEngine();
    var voskLangChanged = (pendingEngine === 'vosk-mini' || pendingEngine === 'vosk-maxi')
        && pendingLang && pendingLang !== STT.getAppliedVoskLang();
    if (voskLangChanged) {
        window.PDM.Storage.setSttVoskLang(pendingLang);
        STT._state.appliedSttVoskLang = null;
        var voskEng = engines[pendingEngine];
        if (voskEng && voskEng.unloadModel) voskEng.unloadModel();
    }
    if (eng && eng.isModelReady && eng.isModelReady() && eng.unloadModel) {
        var computeChanged = STT._state.appliedSttCompute != null
            && pendingCompute !== STT._state.appliedSttCompute;
        var backendMismatch = !STT.loadedBackendMatchesCompute(eng, pendingCompute);
        if (computeChanged || backendMismatch) {
            eng.unloadModel();
            STT._state.appliedSttCompute = null;
            STT._state.appliedSttEngine = null;
        }
    }
};

STT.isSttModelReloadPending = function() {
    if (!STT.needsSttModelLoad()) return false;
    if (STT._state.sttModelWasLoaded) return true;
    var eng = getEngine();
    return !!(eng && eng.isModelReady && eng.isModelReady());
};

STT.setPreloadButtonLabel = function(btn, label) {
    if (!btn || label == null || label === '') return;
    if (typeof label === 'string' && label.indexOf('stt.') === 0) return;
    var span = btn.querySelector('[data-stt-preload-label]');
    if (span) span.textContent = label;
    else btn.textContent = label;
};

STT.updatePreloadButton = function() {
    var btn = document.getElementById('stt-preload-btn');
    if (!btn) return;
    var eng = getEngine();
    var supported = !!(eng && eng.isSupported && eng.isSupported());
    var needsLoad = STT.needsSttModelLoad();
    var reloadPending = needsLoad && STT.isSttModelReloadPending();
    var ready = !needsLoad;
    var loading = STT.isModelLoading();
    var lanBlocked = S.needsLanBypass();
    var loadBlocked = STT.isPendingSttLoadBlocked();
    var inferActive = window.PDM.App && window.PDM.App.isInferenceActive && window.PDM.App.isInferenceActive();
    var micReady = STT._state.micPermissionState === 'granted';
    var fullyReady = ready && !loading && !lanBlocked && micReady && !loadBlocked;
    var readyLabel = ready && !loading
        ? (fullyReady ? T('preloadReady') : T('preloadModelLoaded'))
        : null;

    btn.classList.toggle('stt-preload-btn-ready', fullyReady);
    var preloadTitle = loading
        ? T('notif.modelLoading')
        : (readyLabel
            || (reloadPending ? T('preloadReloadTitle') : T('preloadLoadTitle')));
    btn.title = preloadTitle;
    btn.setAttribute('aria-label', preloadTitle);
    if (!supported || lanBlocked || inferActive || STT.isDictating() || loadBlocked) {
        btn.disabled = true;
        if (readyLabel) STT.setPreloadButtonLabel(btn, readyLabel);
        else if (loading) STT.setPreloadButtonLabel(btn, T('preloadBtnLoading'));
        else STT.setPreloadButtonLabel(btn, reloadPending ? T('preloadBtnReload') : T('preloadBtnLoad'));
        return;
    }
    if (ready && !loading) {
        btn.disabled = true;
        STT.setPreloadButtonLabel(btn, readyLabel || T('preloadReady'));
    } else if (loading) {
        btn.disabled = true;
        STT.setPreloadButtonLabel(btn, T('preloadBtnLoading'));
    } else {
        btn.disabled = false;
        STT.setPreloadButtonLabel(btn, reloadPending ? T('preloadBtnReload') : T('preloadBtnLoad'));
    }
};

STT.loadModelManually = function() {
    if (S.needsLanBypass()) {
        STT.showLanSettings();
        return;
    }
    var blockReason = STT.getPendingSttLoadBlockReason();
    if (blockReason) {
        STT.notifySttLoadBlocked(blockReason);
        STT.updatePreloadButton();
        STT.updateDictationButton();
        return;
    }
    STT.applyPendingSttConfig();
    if (STT.isModelLoading()) {
        window.PDM.UI.notif(T('notif.modelLoading'), 'info');
        return;
    }
    if (!STT.needsSttModelLoad()) {
        window.PDM.UI.notif(T('notif.modelAlreadyLoaded'), 'info');
        return;
    }
    STT.preloadEngine(getEngineId(), { silent: false }).then(function() {
        STT.updatePreloadButton();
        STT.updateDictationButton();
    });
};

STT.setEngageMsg = function(msg) {
    var el = document.getElementById('stt-engage-msg');
    if (!el) return;
    var text = (msg && String(msg).trim()) || '';
    el.textContent = text;
    el.hidden = !text;
};

STT.clearEngageMsg = function() {
    STT.setEngageMsg('');
};

STT.syncEngageMsgFromState = function() {
    if (!STT.isActive()) {
        STT.clearEngageMsg();
        return;
    }
    var state = STT.getState();
    if (state !== S.STATE_LOADING && state !== S.STATE_PERMISSION && state !== S.STATE_LISTENING) {
        for (var k in engines) {
            if (!engines.hasOwnProperty(k) || !engines[k].isActive || !engines[k].isActive()) continue;
            if (engines[k].getState) {
                state = engines[k].getState();
                break;
            }
        }
    }
    if (state === S.STATE_LOADING) {
        STT.setEngageMsg(T('engageLoadingEngine'));
    } else if (state === S.STATE_PERMISSION) {
        STT.setEngageMsg(T('engageWaitingMic'));
    } else if (state === S.STATE_LISTENING) {
        STT.setEngageMsg(T('engageRunning'));
    } else if (state === S.STATE_ERROR) {
        /* message déjà posé par notifyStt */
    }
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
            STT._state.els.btn.title = T('btnTitleCancelLoad');
        } else {
            S.updateButton(STT._state.els, true);
            STT._state.els.btn.title = state === S.STATE_PERMISSION
                ? T('btnTitleCancelMic')
                : T('btnTitleStopDictation');
        }
        STT._state.els.btn.classList.remove('stt-btn-waiting');
        STT.syncEngageMsgFromState();
        return;
    }

    var loading = STT.isModelLoading();
    var loadBlocked = STT.isPendingSttLoadBlocked();
    var ready = !STT.needsSttModelLoad() && !loadBlocked;
    var lanBlocked = S.needsLanBypass();

    /* Toujours cliquable : le message rouge explique pourquoi ça ne démarre pas. */
    STT._state.els.btn.disabled = false;
    STT._state.els.btn.classList.toggle('stt-btn-waiting', loading && !ready && supported && !lanBlocked);
    S.updateButton(STT._state.els, false);

    if (inferActive) {
        STT._state.els.btn.title = T('btnTitleInferenceBlock');
    } else if (loading) {
        STT._state.els.btn.title = T('btnTitleModelLoading');
    } else if (loadBlocked) {
        STT._state.els.btn.title = T('btnTitleLoadBlocked');
    } else if (lanBlocked) {
        STT._state.els.btn.title = T('btnTitleMicHttp');
    } else {
        STT._state.els.btn.title = '';
    }
};

STT.toggle = function() {
    var eng = getEngine();
    if (!eng) {
        STT.setEngageMsg(T('toggleErrorEngineUnavailable'));
        return;
    }
    if (window.PDM.App && window.PDM.App.isInferenceActive && window.PDM.App.isInferenceActive()) {
        STT.setEngageMsg(T('toggleErrorInference'));
        return;
    }
    if (!eng.isActive || !eng.isActive()) {
        if (S.needsLanBypass && S.needsLanBypass()) {
            STT.setEngageMsg(T('btnTitleMicHttp'));
            if (STT.showLanSettings) STT.showLanSettings();
            return;
        }
        if (STT.isPendingSttLoadBlocked && STT.isPendingSttLoadBlocked()) {
            var blockReason = STT.getPendingSttLoadBlockReason();
            var lang = STT.formatVoskLangLabel(STT.getDesiredVoskLangId());
            if (blockReason === 'vosk-maxi-lang-unavailable') {
                STT.setEngageMsg(T('notif.voskMaxiLangBlocked', { lang: lang }));
            } else if (blockReason === 'vosk-lang-unselected') {
                STT.setEngageMsg(T('notif.engineLangUnselected'));
            } else if (blockReason === 'vosk-lang-unavailable') {
                STT.setEngageMsg(T('notif.engineLangUnavailable', { lang: lang }));
            } else {
                STT.setEngageMsg(T('toggleErrorClickPreload'));
            }
            STT.updateDictationButton();
            STT.updatePreloadButton();
            return;
        }
        /* Appliquer les options en attente puis laisser le moteur charger
         * le modèle pendant le démarrage (plus besoin de « Charger le moteur »). */
        if (STT.needsSttModelLoad && STT.needsSttModelLoad()) {
            if (STT.applyPendingSttConfig) STT.applyPendingSttConfig();
            eng = getEngine();
            if (!eng) {
                STT.setEngageMsg(T('toggleErrorEngineUnavailable'));
                return;
            }
        }
        STT.setEngageMsg(T('engageStarting'));
        if (STT._state.micPermissionState !== 'granted') {
            STT.setEngageMsg(T('engageWaitingMic'));
        }
        if (S.warmupBeepAudio) S.warmupBeepAudio();
        stopOtherEngines(eng.id);
    } else if (S.warmupBeepAudio) {
        S.warmupBeepAudio();
        STT.clearEngageMsg();
    }
    eng.toggle(makeCtx());
    STT.updateDictationButton();
    STT.updatePreloadButton();
};

STT.stop = function(opts) {
    opts = opts || {};
    var stopped = false;
    for (var k in engines) {
        if (engines.hasOwnProperty(k) && engines[k].isActive && engines[k].isActive()) {
            engines[k].stop(makeCtx(), opts);
            stopped = true;
        }
    }
    if (!stopped) {
        STT._reset();
        return;
    }
    S.hideLoadProgress(STT._state.els);
    STT.clearEngageMsg();
    if (!opts.silent) {
        STT.updateDictationButton();
        if (STT.refresh) STT.refresh();
        else if (STT.renderUi) STT.renderUi();
    }
};

STT._reset = function() {
    for (var k in engines) {
        if (engines.hasOwnProperty(k) && engines[k]._reset) engines[k]._reset(makeCtx());
    }
    S.hideLoadProgress(STT._state.els);
    S.setState(STT._state.els, S.isSupported() ? S.STATE_IDLE : S.STATE_UNSUPPORTED);
    S.updateButton(STT._state.els, false);
    S.setBusy(STT._state.els, false, false);
    STT.clearEngageMsg();
    STT.updateDictationButton();
    STT.refresh();
};

STT.setEngine = function(id, opts) {
    opts = opts || {};
    if (STT.isActive()) return;
    id = engines[id] ? id : window.PDM.Storage._normSttEngine(id);
    if (getEngineId() === id) return;
    STT._state.appliedSttCompute = null;
    STT._state.appliedSttEngine = null;
    STT._state.appliedSttVoskLang = null;
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
        window.PDM.UI.notif(T('notif.parakeetCpuFallback'), 'info');
    }
};

STT.getEngine = function() { return getEngineId(); };
})();
