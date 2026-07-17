/**
 * PromptDeMerde.com — stt-parakeet-engine.js
 */
import { cfgFor, modelLoadErrorHint } from './stt-parakeet-config.js';
import {
    getPool, enginesById, log, ensureModel, unloadModel
} from './stt-parakeet-model.js';
import {
    startAudioPipeline, flushRemaining, teardownAll, teardownStream, sanitizeParakeetText,
    commitParakeetFinalized
} from './stt-parakeet-decode.js';

var S = window.PDM.STT.Shared;
function T(key, vars) { return S.sttT(key, vars); }

function bumpStartGen(st) {
    st.startGen = (st.startGen || 0) + 1;
    return st.startGen;
}

function isStartStale(st, gen) {
    return gen !== st.startGen;
}

function createParakeetEngine(engineId) {
    var cfg = cfgFor(engineId);

    var engine = {
        id: engineId,
        shortName: cfg.shortName,
        label: cfg.label,

        isSupported: function() {
            return S.isSupported();
        },

        getHelpText: function() {
            if (!S.isSupported()) {
                return T('help.wasmUnsupported');
            }
            if (S.needsLanBypass()) {
                return S.getLanHelpText();
            }
            var gpu = S.hasWebGPU() ? T('helpParakeetGpu') : T('helpParakeetWasmOnly');
            return T('help.parakeet', { backend: gpu });
        },

        unloadModel: function() { unloadModel(engineId); },
        onEngineSelected: function() {},

        isModelReady: function() {
            return !!getPool(engineId).parakeetModel;
        },

        isModelLoading: function() {
            var st = getPool(engineId);
            return !!(st.modelPromise && !st.parakeetModel);
        },

        preloadModel: function(els) {
            if (!S.isSupported() || S.needsLanBypass()) return Promise.resolve(null);
            return ensureModel(engineId, els, { background: true });
        },

        isActive: function() {
            var st = getPool(engineId);
            return st.state === S.STATE_LISTENING || st.state === S.STATE_PERMISSION || st.state === S.STATE_LOADING;
        },

        getState: function() { return getPool(engineId).state; },

        getTextSession: function() { return getPool(engineId).text; },

        toggle: function(c) {
            var st = getPool(engineId);
            var els = c.els;
            if (engine.isActive()) { engine.stop(c); return; }
            if (!S.isSupported()) {
                S.notifyStt(T('notif.unsupportedBrowser'), 'err');
                return;
            }
            if (S.needsLanBypass()) {
                c.facade.showLanSettings();
                return;
            }

            st.stopping = false;
            var startGen = bumpStartGen(st);
            if (c.getLang) {
                try { st.lang = c.getLang() || 'fr'; } catch (e) { st.lang = 'fr'; }
            }
            st.state = S.STATE_PERMISSION;
            S.setState(els, st.state);
            S.setStatus(els, T('preparingDictation'), 'listening');
            S.updateButton(els, true);
            S.setBusy(els, true, true);
            S.updatePermButton(els, false);
            st.text = S.createTextSession(els, c.onSave);
            st.text.reset();

            var stream = null;
            c.facade.ensureMicAccess({ fromToggle: true }).then(function(s) {
                stream = s;
                st.pendingStream = s;
                if (isStartStale(st, startGen)) { s.getTracks().forEach(function(t) { t.stop(); }); st.pendingStream = null; throw new Error('cancelled'); }
                if (st.parakeetModel) return st.parakeetModel;
                st.state = S.STATE_LOADING;
                S.setState(els, st.state);
                S.setStatus(els, T('engineLoadParakeet', { name: cfg.shortName }), 'listening');
                return ensureModel(engineId, els);
            }).then(function() {
                if (isStartStale(st, startGen)) { if (stream) stream.getTracks().forEach(function(t) { t.stop(); }); throw new Error('cancelled'); }
                return startAudioPipeline(engineId, stream, els);
            }).catch(function(err) {
                if (stream && (isStartStale(st, startGen) || st.state !== S.STATE_LISTENING)) {
                    try { stream.getTracks().forEach(function(t) { t.stop(); }); } catch (e) {}
                }
                if (err && err.message === 'cancelled') { engine._reset(c); return; }
                var denied = S.isPermissionDeniedError(err);
                var micErr = S.isMicError(err);
                st.state = S.STATE_ERROR;
                S.setState(els, st.state);
                if (micErr) {
                    S.setStatus(els, S.getMicErrorLabel(err), 'error');
                    S.updatePermButton(els, true, denied || c.micPermissionState === 'denied');
                    if (denied && !err._pdmPermDenied) S.notifyStt(S.deniedHint(), 'err');
                    else S.notifyStt(S.getMicErrorLabel(err), 'err');
                } else {
                    log(engineId)('engine error', err);
                    var missing = err && err.message === 'missing-model';
                    var oom = err && /memory|oom|alloc/i.test(String(err.message || err));
                    var base = missing ? T('errorParakeetMissing') : (oom ? T('errorParakeetOom') : T('errorParakeetFailed'));
                    S.setStatus(els, base + ' ' + (err && err.message ? err.message : ''), 'error');
                    S.notifyStt(missing ? modelLoadErrorHint() : (oom ? T('errorCloseTabsVosk') : modelLoadErrorHint()), 'err');
                }
                engine._reset(c);
                c.facade.syncPermissionUI();
            });
        },

        stop: function(c, opts) {
            opts = opts || {};
            var st = getPool(engineId);
            var els = c.els;
            var state = st.state;
            var wasListening = state === S.STATE_LISTENING;
            var wasStarting = state === S.STATE_PERMISSION || state === S.STATE_LOADING;

            bumpStartGen(st);
            st.stopping = true;
            S.releaseMediaStream(st);
            S.hideLoadProgress(els);

            if (wasStarting && !st.parakeetModel) {
                unloadModel(engineId);
            }

            if (!wasListening) {
                teardownAll(engineId, els);
                teardownStream(engineId);
                st.state = S.isSupported() ? S.STATE_IDLE : S.STATE_UNSUPPORTED;
                S.setState(els, st.state);
                S.updateButton(els, false);
                S.setBusy(els, false, false);
                st.stopping = false;
                if (!opts.silent) S.setStatus(els, T('dictationCancelled'), 'ok');
                if (c.facade) {
                    if (c.facade.updateDictationButton) c.facade.updateDictationButton();
                    else if (c.facade.renderUi) c.facade.renderUi();
                }
                return;
            }

            if (wasListening) S.playDictationStopBeep(st, opts);
            S.clearDictationBeepSession(st);
            var producedText = st.gotAnyText;
            flushRemaining(engineId, els).then(function() {
                if (st.streamer && st.streamer.finalize) {
                    var fin = st.streamer.finalize();
                    if (fin && st.text) {
                        var finText = sanitizeParakeetText(fin.text, fin.words);
                        if (finText) {
                            commitParakeetFinalized(engineId, finText);
                            st.text.setInterim('');
                        }
                    }
                }
                if (st.text) {
                    st.text.finalizeInterim();
                    st.text.apply();
                    st.text.triggerSave();
                }
            }).finally(function() {
                if (!opts.silent && wasListening && !producedText && !st.chunkErrorReported) {
                    window.PDM.UI.notif(T('notifNoTranscriptParakeet', { name: cfg.shortName, engineId: engineId }), 'info');
                }
                if (!opts.silent) S.setStatus(els, T('dictationDone'), 'ok');
                teardownAll(engineId, els);
                teardownStream(engineId);
                st.state = S.isSupported() ? S.STATE_IDLE : S.STATE_UNSUPPORTED;
                S.setState(els, st.state);
                S.updateButton(els, false);
                S.setBusy(els, false, false);
                st.stopping = false;
                if (c.facade && c.facade.updateDictationButton) c.facade.updateDictationButton();
                else if (c.facade && c.facade.renderUi) c.facade.renderUi();
            });
        },

        _reset: function(c) {
            var st = getPool(engineId);
            var wasStarting = st.state === S.STATE_PERMISSION || st.state === S.STATE_LOADING;
            bumpStartGen(st);
            S.releaseMediaStream(st);
            if (wasStarting && !st.parakeetModel) unloadModel(engineId);
            S.clearDictationBeepSession(st);
            teardownAll(engineId, c.els);
            st.state = S.isSupported() ? S.STATE_IDLE : S.STATE_UNSUPPORTED;
            S.setState(c.els, st.state);
            S.updateButton(c.els, false);
            S.setBusy(c.els, false, false);
            st.stopping = false;
            if (c.facade) {
                if (c.facade.updateDictationButton) c.facade.updateDictationButton();
                else if (c.facade.renderUi) c.facade.renderUi();
            }
        },

        getStatusLabel: function() {
            var st = getPool(engineId);
            if (st.loadedModelId) {
                return T('statusModelReady', { name: cfg.shortName, backend: S.formatBackendLoadedLabel(st.usedBackend) });
            }
            if (engine.isModelLoading()) {
                return T('statusBackgroundLoading', { name: cfg.shortName, backend: S.formatBackendLoadingLabel(engineId, S.wantsGpuCompute()) });
            }
            return T('statusPreparing', { name: cfg.shortName });
        },

        getLoadedBackend: function() {
            var st = getPool(engineId);
            return st.parakeetModel ? (st.usedBackend || 'wasm') : null;
        },
    };

    enginesById[engineId] = engine;
    window.PDM.STT.registerEngine(engine);
    return engine;
}

createParakeetEngine('parakeet');
