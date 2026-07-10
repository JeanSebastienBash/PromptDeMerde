/**
 * PromptDeMerde.com — stt-ui.js
 */
(function() {
var STT = window.PDM.STT;
var S = STT.Shared;
var engines = STT._engines;

function getEngineId(){return window.PDM.Storage.getSttEngine();}
function getEngine(){return engines[getEngineId()]||engines["vosk-maxi"]||null;}
function engineDisplayName(id){var e=engines[id];return e&&(e.shortName||e.label)?(e.shortName||e.label.split(" \u2014 ")[0]):id;}

STT.getModel = function() { return window.PDM.Storage.getSttModel(); };

STT.setModel = function() {};

STT.reportLoadProgress = function(opts) {
    STT._state.loadProgress = opts || null;
    STT.renderModelUi();
};

STT.clearLoadProgress = function() {
    STT._state.loadProgress = null;
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

function compactBackendLabel(backend) {
    if (!backend || backend === 'wasm') return 'CPU';
    if (backend === 'webgpu') return 'GPU';
    if (backend === 'webgpu-hybrid') return 'GPU';
    return backend;
}

function engineBadgeLabel(eng, name) {
    var backend = compactBackendLabel(getEngineLoadedBackend(eng));
    return name + ' (' + backend + ')';
}

STT.getModelUiState = function() {
    var id = getEngineId();
    var pendingId = STT.getPendingEngineId ? STT.getPendingEngineId() : id;
    var eng = getEngine();
    var name = engineDisplayName(pendingId !== id ? pendingId : id);

    if (!eng || !eng.isSupported || !eng.isSupported()) {
        return { phase: 'unsupported', badge: 'Indispo', line: name + ' \u2014 navigateur incompatible' };
    }
    if (pendingId !== id) {
        return { phase: 'pending', badge: 'En attente', line: '' };
    }
    if (S.needsLanBypass()) {
        return { phase: 'lan', badge: 'HTTP', line: name + ' \u2014 micro bloqu\u00e9 (voir d\u00e9pannage ci-dessous)' };
    }
    if (STT.isActive() && eng.getState) {
        var es = eng.getState();
        if (es === S.STATE_LISTENING) {
            var activeBackend = S.formatBackendLoadedLabel(getEngineLoadedBackend(eng));
            return {
                phase: 'ready',
                badge: engineBadgeLabel(eng, name),
                line: name + ' \u2014 dict\u00e9e active' + backendLoadedSuffix(eng)
            };
        }
        if (es === S.STATE_LOADING) {
            var lp = STT._state.loadProgress || {};
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
                badge: engineBadgeLabel(eng, name),
                line: name + ' \u2014 en attente du micro' + backendLoadedSuffix(eng)
            };
        }
    }
    if (eng.isModelReady && eng.isModelReady()) {
        var readyBackend = S.formatBackendLoadedLabel(getEngineLoadedBackend(eng));
        return {
            phase: 'ready',
            badge: engineBadgeLabel(eng, name),
            line: name + ' \u2014 mod\u00e8le charg\u00e9' + backendLoadedSuffix(eng)
        };
    }
    if (eng.isModelLoading && eng.isModelLoading()) {
        var p = STT._state.loadProgress || {};
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
    return { phase: 'pending', badge: 'En attente', line: '' };
};

STT.getMicUiState = function() {
    if (S.needsLanBypass()) {
        return {
            phase: 'blocked',
            badge: 'HTTP',
            line: S.isChromium()
                ? 'Bloqu\u00e9 en HTTP \u2014 d\u00e9pannage micro ci-dessous'
                : 'Bloqu\u00e9 en HTTP \u2014 d\u00e9pannage micro ci-dessous'
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
    if (STT._state.micPermissionState === 'granted') {
        return { phase: 'ok', badge: 'OK', line: 'Autoris\u00e9' };
    }
    if (STT._state.micPermissionState === 'denied') {
        return { phase: 'denied', badge: 'Bloqu\u00e9', line: 'Refus\u00e9 \u2014 r\u00e9initialiser dans le navigateur' };
    }
    if (STT._state.micPermissionState === 'prompt') {
        return { phase: 'prompt', badge: '\u2014', line: '' };
    }
    return { phase: 'unknown', badge: '\u2026', line: 'V\u00e9rification\u2026' };
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
    STT.renderComputeUi();
    STT.updateDictationButton();
    STT.updatePreloadButton();
    if (!S._stripHints.custom && !S._stripHints.lan && !S.needsLanBypass()) {
        S.refreshStripHint();
    }
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
    var engineId = STT.getPendingEngineId ? STT.getPendingEngineId() : getEngineId();
    if (!sel) return;
    if (row) row.hidden = false;

    var gpuOpt = sel.querySelector('option[value="gpu"]');
    var gpuAvailable = !!(caps.canUserChooseGpu || (caps.webgpuAvailable && !caps.adapterIsFallback && caps.vramGb >= S.GPU_VRAM_CHOICE_GB));
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
    if (gpuAvailable && caps.vramGb > 0 && caps.vramGb < S.GPU_VRAM_CHOICE_GB) {
        computeHint = 'GPU ~' + caps.vramGb + ' Go (minimum ' + S.GPU_VRAM_CHOICE_GB + ' Go) \u2014 repli CPU si \u00e9chec.';
    } else if (!gpuAvailable) {
        computeHint = caps.label || 'Pas de WebGPU \u2014 CPU uniquement.';
    }
    S.setStripComputeHint(computeHint);
    if (hint) {
        hint.textContent = computeHint;
        hint.hidden = !computeHint;
    }
    if (sel) {
        var computeTitle = computeHint || 'CPU (WASM) ou GPU (WebGPU) pour Whisper et Parakeet';
        sel.title = computeTitle;
    }

    if (curCompute === 'gpu' && !gpuAvailable) curCompute = 'cpu';
    sel.value = curCompute;
    sel.disabled = locked;
};

STT.setCompute = function(mode) {
    if (STT.isModelLoading() || STT.isDictating()) return;
    if (isVoskEngineId(STT.getPendingEngineId ? STT.getPendingEngineId() : getEngineId())) return;
    var caps = S.getGpuCaps();
    var gpuAvailable = !!(caps.canUserChooseGpu || (caps.webgpuAvailable && !caps.adapterIsFallback && caps.vramGb >= S.GPU_VRAM_CHOICE_GB));
    if (mode === 'gpu' && !gpuAvailable) mode = 'cpu';
    var computeSel = document.getElementById('stt-compute-select');
    if (computeSel) computeSel.value = mode;
    window.PDM.Storage.setSttCompute(mode);
    unloadGpuAffectedEngines();
    if (STT.isModelReady() || STT.isModelLoading()) {
        STT.preloadEngine(getEngineId(), { silent: true });
    }
    STT.renderComputeUi();
    STT.updatePreloadButton();
    STT.refresh();
};
})();
