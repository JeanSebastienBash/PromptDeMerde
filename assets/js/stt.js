/**
 * PromptDeMerde.com — Façade dictée vocale : routage entre les 5 moteurs STT
 * (vosk-mini, vosk-maxi, whisper-mini, whisper-maxi, parakeet).
 */
(function() {
var STT = window.PDM.STT;
var S = STT.Shared;
var engines = STT._engines;
var els = {};
var micPermissionState = 'unknown';
var prevMicPermissionState = 'unknown';
var ENGINE_LABELS = {
    'vosk-mini': 'Vosk Mini',
    'vosk-maxi': 'Vosk Maxi',
    'whisper-mini': 'Whisper Mini',
    'whisper-maxi': 'Whisper Maxi',
    parakeet: 'Parakeet'
};
var ENGINE_ORDER = (window.PDM.Storage && window.PDM.Storage.STT_ENGINES) || ['vosk-mini', 'vosk-maxi', 'whisper-mini', 'whisper-maxi', 'parakeet'];
/** Moteur préchargé au démarrage : celui sélectionné par l'utilisateur. */
function getPreloadEngineId() {
    return window.PDM.Storage.getSttEngine();
}
var STT_LOAD_PROGRESS = null;

STT.debug = false;
STT._onSave = null;
STT._getLang = null;

function engineDisplayName(id) {
    var eng = engines[id];
    if (eng && eng.shortName) return eng.shortName;
    if (eng && eng.label) return eng.label.split(' \u2014 ')[0];
    return ENGINE_LABELS[id] || id;
}

function getEngineSelectEl() {
    return els.engineSelect || document.getElementById('stt-engine-select');
}

function syncEngineSelect() {
    var select = getEngineSelectEl();
    if (!select) return;
    els.engineSelect = select;
    var current = getEngineId();
    var opts = [];
    ENGINE_ORDER.forEach(function(id) {
        var eng = engines[id];
        if (!eng) return;
        opts.push({ id: id, label: engineDisplayName(id) });
    });
    if (!opts.length) return;
    select.innerHTML = '';
    opts.forEach(function(item) {
        var opt = document.createElement('option');
        opt.value = item.id;
        opt.textContent = item.label;
        select.appendChild(opt);
    });
    select.value = engines[current] ? current : 'vosk-maxi';
    if (select.value !== current && engines[select.value]) {
        window.PDM.Storage.setSttEngine(select.value);
    }
}

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
        micPermissionState = 'denied';
        S.updateDeniedPanel(els, true);
        S.updatePermButton(els, true, true);
        S.clearStoredMicDevice(els);
    }
    return Promise.reject(err);
}

function onMicAccessGranted(stream) {
    micPermissionState = 'granted';
    S.updateDeniedPanel(els, false);
    S.updatePermButton(els, false);
    return stream;
}

function makeCtx() {
    return {
        els: els,
        onSave: STT._onSave,
        getLang: STT._getLang,
        micPermissionState: micPermissionState,
        facade: STT
    };
}

function queryMicPermission() {
    if (!navigator.permissions || !navigator.permissions.query) return Promise.resolve('unknown');
    return navigator.permissions.query({ name: 'microphone' }).then(function(status) {
        if (!status._pdmBound) {
            status._pdmBound = true;
            status.onchange = function() {
                micPermissionState = status.state;
                STT.syncPermissionUI();
            };
        }
        micPermissionState = status.state;
        return status.state;
    }).catch(function() { return 'unknown'; });
}

STT.showLanSettings = function() {
    S.updateLanPanel(els, true);
    S.updateWorkspaceLanHint(true);
    STT.setState(S.STATE_ERROR);
    S.setStatus(els, 'Mode LAN : configure le micro dans Options.', 'error');
    if (window.location.hash.replace('#', '') !== 'settings') {
        window.PDM.UI.notif(S.isChromium()
            ? 'Chromium : le micro est bloqu\u00e9 en HTTP sur une IP. Ouvre Options \u2192 Dict\u00e9e vocale.'
            : 'Micro bloqu\u00e9 en HTTP : ouvre Options \u2192 Dict\u00e9e vocale.', 'info');
        window.location.hash = '#settings';
    }
    var sttCard = document.getElementById('stt-settings-card');
    if (sttCard) sttCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

STT.setState = function(next) {
    var eng = getEngine();
    if (eng && eng._setState) eng._setState(next);
    S.setState(els, next);
};

STT.syncPermissionUI = function() {
    var eng = getEngine();
    if (eng && !eng.isSupported()) return;

    if (S.needsLanBypass()) {
        S.updateLanPanel(els, true);
        S.updateWorkspaceLanHint(true);
        S.updateDeniedPanel(els, false);
        S.updatePermButton(els, true, false);
        if (els.permBtn) els.permBtn.textContent = '\uD83D\uDD13 MODE R\u00c9SEAU LOCAL (HTTP)';
        if (els.help && !els.help.hidden) {
            els.help.textContent = S.getLanHelpText();
        }
        STT.renderUi();
        return Promise.resolve('insecure');
    }

    S.updateLanPanel(els, false);
    S.updateWorkspaceLanHint(false);
    if (els.permBtn) els.permBtn.textContent = '\uD83D\uDD13 AUTORISER LE MICRO';

    return queryMicPermission().then(function(p) {
        if (prevMicPermissionState === 'denied' && p === 'granted' && !STT.isActive()) {
            window.PDM.UI.notif('Micro autoris\u00e9.', 'ok');
        }
        prevMicPermissionState = p;
        micPermissionState = p;

        if (STT.isActive()) return p;
        if (p === 'granted') {
            S.updatePermButton(els, false);
            S.updateDeniedPanel(els, false);
        } else if (p === 'denied') {
            S.updatePermButton(els, true, true);
            S.updateDeniedPanel(els, true);
        } else {
            S.updatePermButton(els, true, false);
            S.updateDeniedPanel(els, false);
        }
        STT.renderUi();
        return p;
    });
};

STT.requestMicrophonePermission = function(opts) {
    opts = opts || {};
    var deviceId = opts.forceDefault ? '' : window.PDM.Storage.getSttDeviceId();
    var constraints = { audio: { echoCancellation: true, noiseSuppression: true } };
    if (deviceId) constraints.audio.deviceId = { ideal: deviceId };
    return S.getUserMediaCompat(constraints).catch(function(err) {
        if (deviceId && !opts.forceDefault) {
            return S.getUserMediaCompat({ audio: { echoCancellation: true, noiseSuppression: true } });
        }
        throw err;
    });
};

STT.ensureMicAccess = function(opts) {
    opts = opts || {};
    if (S.needsLanBypass()) {
        STT.showLanSettings();
        return Promise.reject(makePermDeniedError());
    }
    if (micPermissionState === 'denied') {
        S.updateDeniedPanel(els, true);
        S.updatePermButton(els, true, true);
        if (els.status && !STT.isActive()) {
            S.setStatus(els, 'Permission micro refus\u00e9e \u2014 suis les instructions ci-dessous.', 'error');
        }
        return Promise.reject(makePermDeniedError());
    }
    if (micPermissionState === 'unknown') queryMicPermission();
    var forceDefault = micPermissionState !== 'granted';
    return STT.requestMicrophonePermission({ forceDefault: forceDefault })
        .then(onMicAccessGranted)
        .catch(handleMicAccessError);
};

STT.retryLanBypass = function() {
    if (S.isSecureContext() && S.canCaptureMic()) {
        S.updateLanPanel(els, false);
        S.updateWorkspaceLanHint(false);
        STT.syncPermissionUI();
        window.PDM.UI.notif('Micro disponible. Tu peux lancer la dict\u00e9e.', 'ok');
        return;
    }
    var msg = S.isChromium()
        ? 'Toujours bloqu\u00e9 : utilise localhost, HTTPS, ou le flag Chrome (Options \u2192 Dict\u00e9e vocale).'
        : 'Toujours bloqu\u00e9 : v\u00e9rifie about:config (Firefox) ou recharge la page.';
    window.PDM.UI.notif(msg, 'info');
    window.location.reload();
};

STT.retryPermission = function() {
    var eng = getEngine();
    if (!eng || !eng.isSupported()) {
        window.PDM.UI.notif('Dict\u00e9e vocale non support\u00e9e par ce navigateur.', 'err');
        return;
    }
    if (S.needsLanBypass()) {
        S.updateLanPanel(els, true);
        STT.retryLanBypass();
        return;
    }
    S.setStatus(els, 'Demande d\u2019autorisation micro\u2026', 'listening');
    if (els.permBtn) els.permBtn.disabled = true;

    queryMicPermission().then(function(state) {
        if (state === 'denied') {
            S.updateDeniedPanel(els, true);
            S.updatePermButton(els, true, true);
            S.setStatus(els, 'Permission micro refus\u00e9e \u2014 suis les instructions ci-dessous.', 'error');
            window.PDM.UI.notif(S.deniedHint(), 'err');
            return null;
        }
        return STT.requestMicrophonePermission({ forceDefault: state !== 'granted' });
    }).then(function(stream) {
        if (!stream) return;
        if (stream.getTracks) stream.getTracks().forEach(function(t) { t.stop(); });
        onMicAccessGranted(stream);
        S.setStatus(els, 'Micro autoris\u00e9.', 'ok');
        window.PDM.UI.notif('Micro autoris\u00e9. Clique sur Dict\u00e9e vocale pour commencer.', 'ok');
        STT.refreshMicrophones(true);
    }).catch(function(err) {
        if (S.isPermissionDeniedError(err)) {
            S.setState(els, S.STATE_ERROR);
            S.setStatus(els, 'Permission micro refus\u00e9e \u2014 suis les instructions ci-dessous.', 'error');
            if (!err._pdmPermDenied) window.PDM.UI.notif(S.deniedHint(), 'err');
            handleMicAccessError(err);
            return;
        }
        S.setState(els, S.STATE_IDLE);
        S.setStatus(els, S.getMicErrorLabel(err), 'error');
        S.updatePermButton(els, true, false);
    }).finally(function() {
        if (els.permBtn) els.permBtn.disabled = false;
    });
};

STT.isActive = function() {
    for (var k in engines) {
        if (engines.hasOwnProperty(k) && engines[k].isActive && engines[k].isActive()) return true;
    }
    return false;
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

STT.updateDictationButton = function() {
    if (!els.btn) return;
    var eng = getEngine();
    var supported = eng && eng.isSupported && eng.isSupported();
    var inferActive = window.PDM.App && window.PDM.App.isInferenceActive && window.PDM.App.isInferenceActive();

    if (STT.isActive()) {
        var state = STT.getState();
        els.btn.disabled = false;
        if (state === S.STATE_LOADING) {
            S.updateButton(els, true, 'loading');
            els.btn.title = 'Annuler le chargement en cours';
        } else {
            S.updateButton(els, true);
            els.btn.title = state === S.STATE_PERMISSION
                ? 'Annuler la demande de micro'
                : 'Arr\u00eater la dict\u00e9e vocale';
        }
        els.btn.classList.remove('stt-btn-waiting');
        return;
    }

    var loading = STT.isModelLoading();
    var ready = STT.isModelReady();
    var lanBlocked = S.needsLanBypass();
    var blocked = !supported || lanBlocked || inferActive || loading || !ready;

    els.btn.disabled = blocked;
    els.btn.classList.toggle('stt-btn-waiting', loading || (!ready && supported && !lanBlocked));
    S.updateButton(els, false);

    if (inferActive) {
        els.btn.title = 'Nettoyage en cours \u2014 arr\u00eate-le avant la dict\u00e9e.';
    } else if (loading) {
        els.btn.title = 'Chargement du mod\u00e8le vocal \u2014 patientez\u2026';
    } else if (!ready && supported && !lanBlocked) {
        els.btn.title = 'Mod\u00e8le vocal en pr\u00e9paration\u2026';
    } else if (lanBlocked) {
        els.btn.title = 'Micro indisponible en HTTP \u2014 voir Options \u2192 Dict\u00e9e vocale';
    } else {
        els.btn.title = '';
    }
};

STT.toggle = function() {
    var eng = getEngine();
    if (!eng) {
        window.PDM.UI.notif('Moteur vocal indisponible.', 'err');
        return;
    }
    if (window.PDM.App && window.PDM.App.isInferenceActive && window.PDM.App.isInferenceActive()) {
        window.PDM.UI.notif('Nettoyage en cours \u2014 arr\u00eate-le avant la dict\u00e9e.', 'err');
        return;
    }
    if (!eng.isActive || !eng.isActive()) {
        if (!STT.isModelReady()) {
            window.PDM.UI.notif(
                STT.isModelLoading()
                    ? 'Chargement du mod\u00e8le vocal en cours \u2014 patientez.'
                    : 'Mod\u00e8le vocal non pr\u00eat.',
                'info'
            );
            STT.updateDictationButton();
            return;
        }
        if (S.warmupBeepAudio) S.warmupBeepAudio();
        stopOtherEngines(eng.id);
    } else if (S.warmupBeepAudio) {
        S.warmupBeepAudio();
    }
    eng.toggle(makeCtx());
    STT.updateDictationButton();
};

STT.stop = function(opts) {
    for (var k in engines) {
        if (engines.hasOwnProperty(k) && engines[k].isActive && engines[k].isActive()) {
            engines[k].stop(makeCtx(), opts);
            S.hideLoadProgress(els);
            if (!opts || !opts.silent) {
                STT.ensureActiveEngineLoaded();
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
    S.hideLoadProgress(els);
    S.setState(els, S.isSupported() ? S.STATE_IDLE : S.STATE_UNSUPPORTED);
    S.updateButton(els, false);
    S.setBusy(els, false, false);
    STT.ensureActiveEngineLoaded();
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
    if (els.engineSelect) els.engineSelect.value = id;
    var eng = engines[id];
    if (eng && eng.onEngineSelected) eng.onEngineSelected();
    STT.refresh();
    STT.preloadEngine(id, { silent: true });
    if (!opts.silent && id === 'parakeet' && S.wantsGpuCompute() && !S.hasWebGPU()) {
        window.PDM.UI.notif('Parakeet : WebGPU indisponible, repli CPU (WASM).', 'info');
    }
};

STT.getEngine = function() { return getEngineId(); };

STT.syncEngineSelect = syncEngineSelect;

STT.getModel = function() { return window.PDM.Storage.getSttModel(); };

STT.setModel = function() {};

STT.reportLoadProgress = function(opts) {
    STT_LOAD_PROGRESS = opts || null;
    STT.renderModelUi();
};

STT.clearLoadProgress = function() {
    STT_LOAD_PROGRESS = null;
};

function getEngineLoadedBackend(eng) {
    if (!eng || !eng.getLoadedBackend) return null;
    return eng.getLoadedBackend();
}

function backendLoadedSuffix(eng) {
    var backend = getEngineLoadedBackend(eng);
    return backend ? ' \u2014 ' + S.formatBackendLoadedLabel(backend) : '';
}

function backendLoadingSuffix(id) {
    var wantsGpu = id.indexOf('vosk') !== 0 && S.wantsGpuCompute();
    return ' (' + S.formatBackendLoadingLabel(id, wantsGpu) + ')';
}

STT.getModelUiState = function() {
    var id = getEngineId();
    var eng = getEngine();
    var name = engineDisplayName(id);

    if (!eng || !eng.isSupported || !eng.isSupported()) {
        return { phase: 'unsupported', badge: 'Indispo', line: name + ' \u2014 navigateur incompatible' };
    }
    if (S.needsLanBypass()) {
        return { phase: 'lan', badge: 'HTTP', line: name + ' \u2014 micro bloqu\u00e9 (voir Options \u2192 Dict\u00e9e vocale)' };
    }
    if (STT.isActive() && eng.getState) {
        var es = eng.getState();
        if (es === S.STATE_LISTENING) {
            var activeBackend = S.formatBackendLoadedLabel(getEngineLoadedBackend(eng));
            return {
                phase: 'ready',
                badge: activeBackend || 'En cours',
                line: name + ' \u2014 dict\u00e9e active' + backendLoadedSuffix(eng)
            };
        }
        if (es === S.STATE_LOADING) {
            var lp = STT_LOAD_PROGRESS || {};
            var loadBackend = getEngineLoadedBackend(eng);
            return {
                phase: 'loading',
                badge: lp.percent != null && lp.percent >= 0 ? Math.round(lp.percent) + ' %' : 'Chargement',
                line: name + ' \u2014 chargement du mod\u00e8le' + (
                    loadBackend ? ' \u2014 ' + S.formatBackendLoadedLabel(loadBackend) : backendLoadingSuffix(id)
                ),
                showBar: true,
                percent: lp.percent,
                loadLabel: lp.label || ('Chargement ' + name),
                loadDetail: lp.detail || ''
            };
        }
        if (es === S.STATE_PERMISSION) {
            return {
                phase: 'ready',
                badge: 'Pr\u00eat',
                line: name + ' \u2014 en attente du micro' + backendLoadedSuffix(eng)
            };
        }
    }
    if (eng.isModelReady && eng.isModelReady()) {
        var readyBackend = S.formatBackendLoadedLabel(getEngineLoadedBackend(eng));
        return {
            phase: 'ready',
            badge: readyBackend || 'Pr\u00eat',
            line: name + ' \u2014 mod\u00e8le charg\u00e9' + backendLoadedSuffix(eng)
        };
    }
    if (eng.isModelLoading && eng.isModelLoading()) {
        var p = STT_LOAD_PROGRESS || {};
        var pct = p.percent;
        var line = name + ' \u2014 chargement' + backendLoadingSuffix(id);
        if (pct != null && pct >= 0) line += ' : ' + Math.round(pct) + ' %';
        else if (p.detail) line += ' \u2014 ' + p.detail;
        else line += '\u2026';
        var detail = p.detail || '';
        if (pct != null && pct >= 0) {
            detail = detail ? detail + ' (' + Math.round(pct) + ' %)' : Math.round(pct) + ' %';
        }
        return {
            phase: 'loading',
            badge: pct != null && pct >= 0 ? Math.round(pct) + ' %' : 'Chargement',
            line: line,
            showBar: true,
            percent: pct,
            loadLabel: p.label || ('Chargement ' + name),
            loadDetail: detail
        };
    }
    return { phase: 'pending', badge: 'En attente', line: name + ' \u2014 pr\u00e9paration du moteur' };
};

STT.getMicUiState = function() {
    if (S.needsLanBypass()) {
        return {
            phase: 'blocked',
            badge: 'HTTP',
            line: S.isChromium()
                ? 'Bloqu\u00e9 en HTTP \u2014 voir Options \u2192 Dict\u00e9e vocale'
                : 'Bloqu\u00e9 en HTTP \u2014 voir Options \u2192 Dict\u00e9e vocale'
        };
    }
    if (STT.isActive()) {
        var eng = getEngine();
        if (eng && eng.getState) {
            if (eng.getState() === S.STATE_LISTENING) {
                return { phase: 'listening', badge: 'Actif', line: 'En \u00e9coute' };
            }
            if (eng.getState() === S.STATE_PERMISSION) {
                return { phase: 'prompt', badge: 'Demande', line: 'Autorisation micro\u2026' };
            }
        }
    }
    if (micPermissionState === 'granted') {
        return { phase: 'ok', badge: 'OK', line: 'Autoris\u00e9' };
    }
    if (micPermissionState === 'denied') {
        return { phase: 'denied', badge: 'Bloqu\u00e9', line: 'Refus\u00e9 \u2014 r\u00e9initialiser dans le navigateur' };
    }
    if (micPermissionState === 'prompt') {
        return { phase: 'prompt', badge: '\u00c0 faire', line: '\u00c0 autoriser au premier usage' };
    }
    return { phase: 'unknown', badge: '\u2026', line: 'V\u00e9rification\u2026' };
};

STT.renderModelUi = function() {
    var state = STT.getModelUiState();
    var bars = document.querySelectorAll('.stt-model-status-bar');
    for (var i = 0; i < bars.length; i++) S.updateModelStatusBar(bars[i], state);

    var foregroundLoad = STT.isActive() && getEngine() && getEngine().getState && getEngine().getState() === S.STATE_LOADING;
    var panels = [els.loadPanel, els.settingsLoadPanel];
    for (var j = 0; j < panels.length; j++) {
        if (!panels[j]) continue;
        if (state.showBar) {
            S.applyLoadProgressToPanel(panels[j], {
                label: state.loadLabel,
                percent: state.percent,
                detail: state.loadDetail,
                visible: true
            });
        } else if (!foregroundLoad) {
            S.applyLoadProgressToPanel(panels[j], { visible: false });
        }
    }
};

STT.renderMicUi = function() {
    if (STT.isActive()) {
        var eng = getEngine();
        if (eng && eng.getState && eng.getState() === S.STATE_LISTENING) return;
    }
    var mic = STT.getMicUiState();
    var bars = document.querySelectorAll('.stt-mic-status-bar');
    for (var i = 0; i < bars.length; i++) S.updateMicStatusBar(bars[i], mic);
};

STT.renderUi = function() {
    STT.renderModelUi();
    STT.renderMicUi();
    STT.updateDictationButton();
    if (window.PDM.App && window.PDM.App.updateWorkspacePromptGuard) {
        window.PDM.App.updateWorkspacePromptGuard();
    }
};

function unloadAllEngines() {
    for (var k in engines) {
        if (engines.hasOwnProperty(k) && engines[k].unloadModel) engines[k].unloadModel();
    }
}

/** Whisper / Parakeet uniquement — Vosk ignore pdm_stt_compute et ne doit pas être rechargé. */
function unloadGpuAffectedEngines() {
    ['whisper-mini', 'whisper-maxi', 'parakeet'].forEach(function(id) {
        var eng = engines[id];
        if (eng && eng.unloadModel) eng.unloadModel();
    });
}

function isVoskEngineId(id) {
    return id && id.indexOf('vosk') === 0;
}

STT.getGpuCaps = function() {
    return S.getGpuCaps();
};

STT.renderComputeUi = function() {
    var caps = S.getGpuCaps();
    var row = document.getElementById('stt-compute-row');
    var sel = document.getElementById('stt-compute-select');
    var hint = document.getElementById('stt-compute-hint');
    var engineId = getEngineId();
    if (!sel) return;
    if (row) row.hidden = false;

    if (isVoskEngineId(engineId)) {
        sel.value = 'cpu';
        sel.disabled = true;
        if (hint) {
            hint.textContent = 'Vosk : CPU uniquement (WASM) \u2014 l\u2019acc\u00e9l\u00e9ration GPU s\u2019applique \u00e0 Whisper et Parakeet.';
        }
        return;
    }

    if (hint) hint.textContent = caps.label || '';
    if (caps.canUserChooseGpu) {
        sel.disabled = !!STT.isActive();
        sel.value = window.PDM.Storage.getSttCompute();
    } else {
        sel.value = 'cpu';
        sel.disabled = true;
    }
};

STT.setCompute = function(mode) {
    if (STT.isActive()) return;
    if (isVoskEngineId(getEngineId())) return;
    if (!S.getGpuCaps().canUserChooseGpu) mode = 'cpu';
    var prev = window.PDM.Storage.getSttCompute();
    window.PDM.Storage.setSttCompute(mode);
    if (prev === mode) return;
    unloadGpuAffectedEngines();
    STT.preloadEngine(getEngineId(), { silent: true });
    STT.renderComputeUi();
    STT.refresh();
    if (mode === 'gpu') {
        window.PDM.UI.notif('Mode GPU activ\u00e9 (Whisper / Parakeet) \u2014 repli automatique sur CPU si \u00e9chec.', 'info');
    } else {
        window.PDM.UI.notif('Mode CPU activ\u00e9 pour Whisper et Parakeet.', 'info');
    }
};

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
    return eng.preloadModel(els).then(function() {
        STT.clearLoadProgress();
        if (!opts.silent) STT.renderUi();
        return null;
    }).catch(function() {
        STT.clearLoadProgress();
        return null;
    }).finally(function() {
        if (tick) clearInterval(tick);
        STT.clearLoadProgress();
        STT.updateDictationButton();
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
            STT.preloadDefaultEngine();
            return;
        }
        attempts++;
        if (attempts < 50) setTimeout(tryPreload, 80);
    }
    tryPreload();
}

STT.refreshMicrophones = function(requestPermission) {
    if (!els.deviceSelect) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        els.deviceSelect.disabled = true;
        return;
    }

    function populate(devices) {
        var saved = window.PDM.Storage.getSttDeviceId();
        var inputs = [];
        for (var i = 0; i < devices.length; i++) {
            if (devices[i].kind === 'audioinput') inputs.push(devices[i]);
        }
        els.deviceSelect.innerHTML = '<option value="">Micro par d\u00e9faut</option>';
        if (!inputs.length) {
            els.deviceSelect.disabled = true;
            if (requestPermission && els.status && !STT.isActive()) S.setStatus(els, 'Aucun micro d\u00e9tect\u00e9.', 'error');
            return;
        }
        var found = false;
        for (var j = 0; j < inputs.length; j++) {
            var d = inputs[j];
            var opt = document.createElement('option');
            opt.value = d.deviceId;
            opt.textContent = d.label || ('Micro ' + (j + 1));
            if (saved && d.deviceId === saved) { opt.selected = true; found = true; }
            els.deviceSelect.appendChild(opt);
        }
        els.deviceSelect.disabled = STT.isActive();
        if (!found) els.deviceSelect.value = '';
        if (requestPermission && els.status && !STT.isActive()) S.setStatus(els, inputs.length + ' micro(s) disponible(s).', 'ok');
    }

    function afterPermission(stream) {
        if (stream && stream.getTracks) stream.getTracks().forEach(function(t) { t.stop(); });
        return navigator.mediaDevices.enumerateDevices();
    }

    if (requestPermission && navigator.mediaDevices.getUserMedia) {
        STT.ensureMicAccess().then(afterPermission).then(populate).catch(function(err) {
            if (S.isPermissionDeniedError(err)) {
                if (els.status && !STT.isActive()) {
                    S.setStatus(els, 'Permission micro refus\u00e9e \u2014 suis les instructions ci-dessous.', 'error');
                }
            } else if (els.status && !STT.isActive()) {
                S.setStatus(els, S.getMicErrorLabel(err), 'error');
            }
            if (!S.isPermissionDeniedError(err)) S.updatePermButton(els, true, false);
            navigator.mediaDevices.enumerateDevices().then(populate).catch(function() {});
            STT.syncPermissionUI();
        });
    } else {
        navigator.mediaDevices.enumerateDevices().then(populate).catch(function() {});
    }
};

STT.refresh = function() {
    var eng = getEngine();
    var ok = eng && eng.isSupported && eng.isSupported();
    if (!ok) {
        S.setState(els, S.STATE_UNSUPPORTED);
        if (els.btn) els.btn.style.display = 'inline-block';
    } else if (!STT.isActive()) {
        S.setState(els, S.STATE_IDLE);
        if (els.btn) els.btn.style.display = 'inline-block';
    } else if (els.btn) {
        els.btn.style.display = 'inline-block';
    }
    if (els.engineSelect) els.engineSelect.value = getEngineId();

    syncEngineSelect();

    if (els.help && !els.help.hidden && eng && eng.getHelpText) {
        els.help.textContent = eng.getHelpText();
    }

    S.updateLanPanel(els, S.needsLanBypass());

    if (!STT.isActive()) {
        S.updateButton(els, false);
    }

    STT.renderComputeUi();
    STT.renderUi();
    STT.refreshMicrophones(false);
    STT.syncPermissionUI();
};

STT.getEls = function() { return els; };

STT.init = function(opts) {
    opts = opts || {};
    STT._onSave = opts.onSave || function() {};
    STT._getLang = opts.getLang || function() { return 'fr'; };

    if (S.isSttDebugEnabled && S.isSttDebugEnabled()) {
        try {
            console.info('[PDM.STT] Mode debug actif — métriques RTF dans la console (Whisper / Parakeet).');
        } catch (e) { /* ignore */ }
    }

    els.btn = document.getElementById('stt-btn');
    els.permBtn = document.getElementById('stt-perm-btn');
    els.block = document.getElementById('stt-block');
    els.help = document.getElementById('stt-help');
    els.deviceSelect = document.getElementById('stt-device-select');
    els.engineSelect = document.getElementById('stt-engine-select');
    els.input = document.getElementById('ws-input');
    els.charCount = document.getElementById('char-count');
    els.lanPanel = document.getElementById('stt-lan-panel');
    els.deniedPanel = document.getElementById('stt-denied-panel');
    els.loadPanel = document.getElementById('stt-load-panel');
    els.settingsLoadPanel = document.getElementById('stt-settings-load-panel');
    els.loadLabel = els.loadPanel ? els.loadPanel.querySelector('[data-stt-load-label]') : null;
    els.loadBar = els.loadPanel ? els.loadPanel.querySelector('[data-stt-load-bar]') : null;
    els.loadFill = els.loadPanel ? els.loadPanel.querySelector('[data-stt-load-fill]') : null;
    els.loadDetail = els.loadPanel ? els.loadPanel.querySelector('[data-stt-load-detail]') : null;

    if (els.btn) {
        els.btn.setAttribute('aria-pressed', 'false');
        els.btn.addEventListener('click', STT.toggle);
    }
    if (els.permBtn) {
        els.permBtn.addEventListener('click', function() {
            if (S.needsLanBypass()) STT.retryLanBypass();
            else STT.retryPermission();
        });
    }
    var lanRetry = document.getElementById('stt-lan-retry');
    if (lanRetry) lanRetry.addEventListener('click', STT.retryLanBypass);
    var deniedRetry = document.getElementById('stt-denied-retry');
    if (deniedRetry) deniedRetry.addEventListener('click', function() {
        STT.syncPermissionUI().then(function() { STT.retryPermission(); });
    });
    var wsLanSettingsLink = document.querySelector('.stt-ws-lan-settings-link');
    if (wsLanSettingsLink) {
        wsLanSettingsLink.addEventListener('click', function() {
            setTimeout(function() {
                var card = document.getElementById('stt-settings-card');
                if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 50);
        });
    }
    var refreshBtn = document.getElementById('stt-refresh-devices');
    if (refreshBtn) refreshBtn.addEventListener('click', function() { STT.refreshMicrophones(true); });
    if (els.engineSelect) {
        syncEngineSelect();
        els.engineSelect.addEventListener('change', function() {
            STT.setEngine(els.engineSelect.value);
        });
    }
    var computeSelect = document.getElementById('stt-compute-select');
    if (computeSelect) {
        computeSelect.addEventListener('change', function() {
            STT.setCompute(computeSelect.value);
        });
    }
    if (els.deviceSelect) {
        els.deviceSelect.addEventListener('change', function() {
            window.PDM.Storage.setSttDeviceId(els.deviceSelect.value);
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
        syncEngineSelect();
        STT.refresh();
        if (!STT.isActive()) STT.ensureActiveEngineLoaded();
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
        scheduleDefaultPreload();
        STT.ensureActiveEngineLoaded();
    });
};

if (document.getElementById('stt-engine-select')) syncEngineSelect();
})();
