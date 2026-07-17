/**
 * PromptDeMerde.com — stt-ui.js
 */
(function() {
var STT = window.PDM.STT;
var S = STT.Shared;
var engines = STT._engines;

function T(key, vars) { return S.sttT(key, vars); }
function badge(key) { return T('badge.' + key); }

function getEngineId(){return window.PDM.Storage.getSttEngine();}
function getEngine(){return engines[getEngineId()]||engines["vosk-maxi"]||null;}
function engineDisplayName(id){var e=engines[id];return e&&(e.shortName||e.label)?(e.shortName||e.label.split(" \u2014 ")[0]):S.engineLabel(id);}

STT.getModel = function() { return window.PDM.Storage.getSttModel(); };

STT.setModel = function() {};

STT.reportLoadProgress = function(opts) {
    STT._state.loadProgress = opts || null;
    STT.renderModelUi();
};

STT.clearLoadProgress = function() {
    STT._state.loadProgress = null;
};

function getUiEngine() {
    if (STT.isActive()) {
        for (var k in engines) {
            if (!engines.hasOwnProperty(k)) continue;
            var active = engines[k];
            if (active && active.isActive && active.isActive()) return active;
        }
    }
    var id = getEngineId();
    var pendingId = STT.getPendingEngineId ? STT.getPendingEngineId() : id;
    return engines[pendingId] || engines[id] || getEngine();
}

function getEngineLoadedBackend(eng) {
    if (!eng || !eng.getLoadedBackend) return null;
    return eng.getLoadedBackend();
}

function getEngineLoadedDtypeKey(eng) {
    if (!eng || !eng.getLoadedDtypeKey) return null;
    return eng.getLoadedDtypeKey();
}

function backendLoadedSuffix(eng) {
    var backend = getEngineLoadedBackend(eng);
    var dtypeKey = getEngineLoadedDtypeKey(eng);
    return backend ? ' \u2014 ' + S.formatBackendLoadedLabel(backend, dtypeKey) : '';
}

function backendLoadingSuffix(id) {
    var wantsGpu = id.indexOf('vosk') !== 0 && S.wantsGpuCompute();
    return ' (' + S.formatBackendLoadingLabel(id, wantsGpu) + ')';
}

function compactBackendLabel(backend) {
    if (!backend || backend === 'wasm') return 'CPU';
    if (backend === 'webgpu') return 'GPU';
    if (backend === 'webgpu-hybrid') return 'GPU';
    return backend;
}

function getPendingComputeForEngine(engineId) {
    if (!engineId || engineId.indexOf('vosk') === 0) return 'cpu';
    if (STT.getPendingCompute) return STT.getPendingCompute();
    try {
        return window.PDM.Storage.getSttCompute();
    } catch (e) {
        return 'cpu';
    }
}

function targetCompactBackend(engineId) {
    return getPendingComputeForEngine(engineId) === 'gpu' ? 'GPU' : 'CPU';
}

function resolveEngineBackendDisplay(eng, engineId) {
    var ready = !!(eng && eng.isModelReady && eng.isModelReady());
    var needsLoad = !!(STT.needsSttModelLoad && STT.needsSttModelLoad());
    var loaded = getEngineLoadedBackend(eng);
    var dtypeKey = getEngineLoadedDtypeKey(eng);
    var target = targetCompactBackend(engineId);
    var loadedCompact = compactBackendLabel(loaded);

    if (!ready) {
        return {
            compact: target,
            phase: 'pending',
            lineSuffix: backendLoadingSuffix(engineId),
            mismatch: false
        };
    }
    if (needsLoad) {
        return {
            compact: target,
            phase: 'stale',
            lineSuffix: backendLoadedSuffix(eng),
            mismatch: loadedCompact !== target,
            loadedCompact: loadedCompact
        };
    }
    return {
        compact: loadedCompact,
        phase: 'ready',
        lineSuffix: backendLoadedSuffix(eng),
        mismatch: false,
        loaded: loaded,
        dtypeKey: dtypeKey
    };
}

function engineBadgeLabel(eng, name, engineId) {
    var display = resolveEngineBackendDisplay(eng, engineId);
    return name + ' (' + display.compact + ')';
}

function modelStatusLine(eng, name, engineId, baseKey) {
    var display = resolveEngineBackendDisplay(eng, engineId);
    var line = T(baseKey, { name: name }) + display.lineSuffix;
    if (engineId === 'vosk-mini' && STT.getLoadVoskLangId && STT.getAppliedVoskLang) {
        var pendingLang = STT.getLoadVoskLangId();
        var appliedLang = STT.getAppliedVoskLang();
        var V = window.PDM.STT._vosk;
        var loadedLang = V && V.getLoadedVoskLangId ? V.getLoadedVoskLangId('vosk-mini') : null;
        if (display.phase === 'ready' && loadedLang) {
            line += ' — ' + T('status.engineLangLoaded', {
                lang: STT.formatVoskLangLabel(loadedLang)
            });
        } else if (display.phase === 'stale' && loadedLang && pendingLang && loadedLang !== pendingLang) {
            line += ' — ' + T('status.engineLangMismatch', {
                target: STT.formatVoskLangLabel(pendingLang),
                loaded: STT.formatVoskLangLabel(loadedLang)
            });
            return line;
        } else if (display.phase === 'stale' && pendingLang && pendingLang !== appliedLang) {
            var Cat = STT.VoskCatalog;
            var pendingLabel = pendingLang;
            var appliedLabel = appliedLang;
            if (Cat && Cat.getLangEntry) {
                var pe = Cat.getLangEntry(pendingLang);
                var ae = Cat.getLangEntry(appliedLang);
                if (pe) pendingLabel = Cat.formatLangLabel(pe);
                if (ae) appliedLabel = Cat.formatLangLabel(ae);
            }
            line += ' — ' + T('status.engineLangMismatch', {
                target: pendingLabel,
                loaded: appliedLabel
            });
            return line;
        }
    }
    if (engineId === 'vosk-maxi' && STT.getLoadVoskLangId && STT.getAppliedVoskLang) {
        var pendingMaxiLang = STT.getLoadVoskLangId();
        var appliedMaxiLang = STT.getAppliedVoskLang();
        var VMaxi = window.PDM.STT._vosk;
        var loadedMaxiLang = VMaxi && VMaxi.getLoadedVoskLangId ? VMaxi.getLoadedVoskLangId('vosk-maxi') : null;
        if (display.phase === 'ready' && loadedMaxiLang) {
            line += ' — ' + T('status.engineLangLoaded', {
                lang: STT.formatVoskLangLabel(loadedMaxiLang)
            });
        } else if (display.phase === 'stale' && loadedMaxiLang && pendingMaxiLang && loadedMaxiLang !== pendingMaxiLang) {
            line += ' — ' + T('status.engineLangMismatch', {
                target: STT.formatVoskLangLabel(pendingMaxiLang),
                loaded: STT.formatVoskLangLabel(loadedMaxiLang)
            });
            return line;
        } else if (display.phase === 'stale' && pendingMaxiLang && pendingMaxiLang !== appliedMaxiLang) {
            line += ' — ' + T('status.engineLangMismatch', {
                target: STT.formatVoskLangLabel(pendingMaxiLang),
                loaded: STT.formatVoskLangLabel(appliedMaxiLang)
            });
            return line;
        }
    }
    if (display.phase === 'stale' && display.mismatch) {
        line += ' — ' + T('status.computeMismatch', {
            target: targetCompactBackend(engineId),
            loaded: display.loadedCompact || 'CPU'
        });
    } else if (display.phase === 'stale') {
        line += ' — ' + ((engineId === 'vosk-mini' || engineId === 'vosk-maxi')
            ? T('status.engineLangReloadNeeded')
            : T('status.computeReloadNeeded'));
    }
    return line;
}

STT.getModelUiState = function() {
    var id = getEngineId();
    var pendingId = STT.getPendingEngineId ? STT.getPendingEngineId() : id;
    var eng = getUiEngine();
    var name = engineDisplayName(pendingId !== id ? pendingId : id);

    if (!eng || !eng.isSupported || !eng.isSupported()) {
        return { phase: 'unsupported', badge: badge('unavailable'), line: T('status.browserUnsupported', { name: name }) };
    }
    if (pendingId !== id) {
        return { phase: 'pending', badge: badge('pending'), line: T('engineStatusPending') };
    }
    if (S.needsLanBypass()) {
        return { phase: 'lan', badge: badge('http'), line: T('status.micBlockedHttp', { name: name }) };
    }
    if (STT.isPendingSttLoadBlocked && STT.isPendingSttLoadBlocked()) {
        var blockReason = STT.getPendingSttLoadBlockReason();
        var blockLang = blockReason === 'vosk-maxi-lang-unavailable'
            ? STT.formatVoskLangLabel(STT.getDesiredVoskLangId())
            : STT.formatVoskLangLabel(STT.getPendingVoskLang());
        var blockLine = blockReason === 'vosk-maxi-lang-unavailable'
            ? T('help.voskMaxiLangUnavailable', { lang: blockLang })
            : (blockReason === 'vosk-lang-unselected'
                ? T('help.engineLangUnselected')
                : T('help.engineLangUnavailable', { lang: blockLang }));
        return { phase: 'blocked', badge: badge('unavailable'), line: blockLine };
    }
    if (STT.isActive() && eng.getState) {
        var es = eng.getState();
        if (es === S.STATE_LISTENING) {
            return {
                phase: 'ready',
                badge: engineBadgeLabel(eng, name, id),
                line: modelStatusLine(eng, name, id, 'status.dictationActive')
            };
        }
        if (es === S.STATE_LOADING) {
            var lp = STT._state.loadProgress || {};
            var loadBackend = getEngineLoadedBackend(eng);
            var loadDtype = getEngineLoadedDtypeKey(eng);
            return {
                phase: 'loading',
                badge: lp.percent != null && lp.percent >= 0 ? Math.round(lp.percent) + ' %' : badge('loading'),
                line: T('status.modelLoading', { name: name }) + (
                    loadBackend ? ' \u2014 ' + S.formatBackendLoadedLabel(loadBackend, loadDtype) : backendLoadingSuffix(id)
                ),
                showBar: true,
                percent: lp.percent,
                loadLabel: lp.label || T('engineLoadProgress', { name: name }),
                loadDetail: lp.detail || ''
            };
        }
        if (es === S.STATE_PERMISSION) {
            return {
                phase: 'ready',
                badge: engineBadgeLabel(eng, name, id),
                line: modelStatusLine(eng, name, id, 'status.waitingMic')
            };
        }
    }
    if (eng.isModelReady && eng.isModelReady()) {
        var display = resolveEngineBackendDisplay(eng, id);
        return {
            phase: display.phase,
            badge: engineBadgeLabel(eng, name, id),
            line: modelStatusLine(eng, name, id, 'status.modelLoaded')
        };
    }
    if (eng.isModelLoading && eng.isModelLoading()) {
        var p = STT._state.loadProgress || {};
        var pct = p.percent;
        var line = T('statusLoadingModel', { name: name }) + backendLoadingSuffix(id);
        if (pct != null && pct >= 0) line += T('statusLoadingPercent', { percent: Math.round(pct) });
        else if (p.detail) line += T('statusLoadingDetailSep') + p.detail;
        else line += '\u2026';
        var detail = p.detail || '';
        if (pct != null && pct >= 0) {
            detail = detail ? detail + ' (' + Math.round(pct) + ' %)' : Math.round(pct) + ' %';
        }
        return {
            phase: 'loading',
            badge: pct != null && pct >= 0 ? Math.round(pct) + ' %' : badge('loading'),
            line: line,
            showBar: true,
            percent: pct,
            loadLabel: p.label || T('engineLoadProgress', { name: name }),
            loadDetail: detail
        };
    }
    return { phase: 'pending', badge: badge('pending'), line: T('engineStatusPending') };
};

STT.getMicUiState = function() {
    if (S.needsLanBypass()) {
        return {
            phase: 'blocked',
            badge: badge('http'),
            line: T('status.micBlockedStrip')
        };
    }
    if (STT.isActive()) {
        var eng = getEngine();
        if (eng && eng.getState) {
            if (eng.getState() === S.STATE_LISTENING) {
                return { phase: 'listening', badge: badge('active'), line: T('status.listening') };
            }
            if (eng.getState() === S.STATE_PERMISSION) {
                return { phase: 'prompt', badge: badge('prompt'), line: T('status.micPrompt') };
            }
        }
    }
    if (STT._state.micPermissionState === 'granted') {
        return { phase: 'ok', badge: badge('ok'), line: T('status.micGranted') };
    }
    if (STT._state.micPermissionState === 'denied') {
        return { phase: 'denied', badge: badge('denied'), line: T('status.micDenied') };
    }
    if (STT._state.micPermissionState === 'prompt') {
        return { phase: 'prompt', badge: badge('prompt'), line: T('status.micPrompt') };
    }
    return { phase: 'unknown', badge: '\u2026', line: T('micChecking') };
};

STT.renderModelUi = function() {
    var state = STT.getModelUiState();
    var bars = document.querySelectorAll('.stt-model-status-bar');
    for (var i = 0; i < bars.length; i++) S.updateModelStatusBar(bars[i], state);

    var foregroundLoad = STT.isActive() && getEngine() && getEngine().getState && getEngine().getState() === S.STATE_LOADING;
    var panels = [STT._state.els.loadPanel];
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
    STT.renderVoskLangUi();
    STT.renderComputeUi();
    STT.updateDictationButton();
    STT.updatePreloadButton();
    if (!S._stripHints.custom && !S._stripHints.lan && !S.needsLanBypass()) {
        S.refreshStripHint();
    }
    if (window.PDM.App && window.PDM.App.updateWorkspacePromptGuard) {
        window.PDM.App.updateWorkspacePromptGuard();
    }
    if (window.PDM.WorkspaceInputTools) window.PDM.WorkspaceInputTools.sync();
};

function unloadAllEngines() {
    for (var k in engines) {
        if (engines.hasOwnProperty(k) && engines[k].unloadModel) engines[k].unloadModel();
    }
}

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

function computeHintFromCaps(caps) {
    if (!caps.probeDone) return T('help.computeProbing');
    switch (caps.reason) {
        case 'ok':
            return T('help.computeGpuReady', { vram: caps.vramGb });
        case 'unknown_vram':
            return T('help.computeGpuUnknownVram');
        case 'vram_low':
            return T('help.computeGpuLow', {
                vram: caps.vramGb,
                min: S.GPU_VRAM_WHISPER_MINI_GB
            });
        case 'insecure':
            return T('help.computeNoWebgpuInsecure');
        case 'firefox_no_api':
            return T('help.computeNoWebgpuFirefox');
        case 'no_api':
            return T('help.computeNoWebgpuBrowser');
        case 'firefox_no_adapter':
            return T('help.computeNoWebgpuFirefoxAdapter');
        case 'chrome_linux_no_adapter':
            return T('help.computeNoWebgpuChromeLinux');
        case 'chrome_no_adapter':
            return T('help.computeNoWebgpuChrome');
        case 'no_adapter':
            return T('help.computeNoWebgpuAdapter');
        case 'fallback':
            return T('help.computeGpuSoftware');
        case 'gpu_compat':
            return T('help.computeGpuCompat');
        case 'no_shader_f16':
            return T('help.computeGpuCompat');
        default:
            return T('help.computeNoGpu');
    }
}

function isGpuComputeAvailable(caps) {
    return !!caps.canUserChooseGpu;
}

function engineVramHint(engineId, caps) {
    if (!S.getGpuVramHintForEngine) return '';
    var hintKey = S.getGpuVramHintForEngine(engineId);
    if (!hintKey) return '';
    var vars = S.getGpuVramHintVars ? S.getGpuVramHintVars(engineId) : { vram: caps.vramGb };
    return T('help.' + hintKey, vars);
}

function mergeComputeHints(baseHint, engineHint) {
    if (!engineHint) return baseHint;
    if (!baseHint) return engineHint;
    return baseHint + ' ' + engineHint;
}

STT.renderVoskLangUi = function() {
    var row = document.getElementById('stt-vosk-lang-row');
    var maxiHint = document.getElementById('stt-vosk-maxi-hint');
    var miniHint = document.getElementById('stt-vosk-mini-hint');
    var sel = document.getElementById('stt-vosk-lang-select');
    var engineId = STT.getPendingEngineId ? STT.getPendingEngineId() : getEngineId();
    var isMini = engineId === 'vosk-mini';
    var isMaxi = engineId === 'vosk-maxi';
    var isVosk = isMini || isMaxi;
    if (row) row.hidden = !isVosk;
    if (miniHint) {
        var miniBlocked = isMini && STT.isPendingSttLoadBlocked && STT.isPendingSttLoadBlocked();
        miniHint.hidden = !miniBlocked;
        if (miniBlocked) {
            miniHint.textContent = T('help.engineLangUnavailable', {
                lang: STT.formatVoskLangLabel(STT.getPendingVoskLang())
            });
        }
    }
    if (maxiHint) {
        var maxiBlocked = isMaxi && STT.isVoskMaxiLangBlocked && STT.isVoskMaxiLangBlocked();
        maxiHint.hidden = !maxiBlocked;
        if (maxiBlocked) {
            maxiHint.textContent = T('help.voskMaxiLangUnavailable', {
                lang: STT.formatVoskLangLabel(STT.getDesiredVoskLangId())
            });
        }
    }
    if (sel) sel.disabled = STT.isModelLoading() || STT.isDictating();
};

STT.renderComputeUi = function() {
    var caps = S.getGpuCaps();
    var row = document.getElementById('stt-compute-row');
    var sel = document.getElementById('stt-compute-select');
    var hint = document.getElementById('stt-compute-hint');
    var engineId = STT.getPendingEngineId ? STT.getPendingEngineId() : getEngineId();
    if (!sel) return;
    if (row) row.hidden = false;

    var gpuOpt = sel.querySelector('option[value="gpu"]');
    var gpuAvailable = isGpuComputeAvailable(caps);
    if (gpuOpt) gpuOpt.disabled = !gpuAvailable;

    var locked = STT.isModelLoading() || STT.isDictating();
    var curCompute = sel.value;
    if (curCompute !== 'cpu' && curCompute !== 'gpu') {
        curCompute = window.PDM.Storage.getSttCompute();
    }

    if (isVoskEngineId(engineId)) {
        sel.value = 'cpu';
        sel.disabled = true;
        S.setStripComputeHint('');
        return;
    }

    var computeHint = '';
    if (!caps.probeDone) {
        computeHint = T('help.computeProbing');
    } else if (!gpuAvailable) {
        computeHint = computeHintFromCaps(caps);
    } else if (caps.reason === 'gpu_compat') {
        computeHint = mergeComputeHints(
            T('help.computeGpuCompat'),
            engineVramHint(engineId, caps)
        );
    } else {
        computeHint = computeHintFromCaps(caps);
        computeHint = mergeComputeHints(computeHint, engineVramHint(engineId, caps));
    }
    S.setStripComputeHint(computeHint);
    if (hint) {
        hint.textContent = computeHint;
        hint.hidden = !computeHint;
    }
    if (sel) {
        sel.title = computeHint || T('help.computeTitle');
    }

    if (curCompute === 'gpu' && !gpuAvailable) curCompute = 'cpu';
    sel.value = curCompute;
    sel.disabled = locked;
};

STT.setCompute = function(mode) {
    if (STT.isModelLoading() || STT.isDictating()) return;
    if (isVoskEngineId(STT.getPendingEngineId ? STT.getPendingEngineId() : getEngineId())) return;
    var caps = S.getGpuCaps();
    var gpuAvailable = isGpuComputeAvailable(caps);
    if (mode === 'gpu' && !gpuAvailable) mode = 'cpu';
    var computeSel = document.getElementById('stt-compute-select');
    if (computeSel) computeSel.value = mode;
    window.PDM.Storage.setSttCompute(mode);
    STT._state.appliedSttCompute = null;
    STT._state.appliedSttEngine = null;
    unloadGpuAffectedEngines();
    if (STT.isModelReady() || STT.isModelLoading()) {
        STT.preloadEngine(getEngineId(), { silent: true });
    }
    STT.renderComputeUi();
    STT.updatePreloadButton();
    STT.refresh();
};
})();
