/**
 * PromptDeMerde.com — stt-vosk-engine.js
 *
 * Synopsis : Factory moteurs Vosk Mini/Maxi.
 * Objectif : Enregistrer vosk-mini et vosk-maxi via registerEngine.
 */
(function() {
var Shared = window.PDM.STT.Shared;
var S = Shared;
function T(key, vars) { return S.sttT(key, vars); }
var V = window.PDM.STT._vosk;

var enginesById = V.enginesById;

function createVoskEngine(engineId) {
    var cfg = V.ENGINE_CONFIGS[engineId];
    if (!cfg) return null;

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
            var quality = engineId === 'vosk-maxi' ? T('voskQualityMaxi') : T('voskQualityMini');
            if (!S.isSecureContext()) {
                return T('voskHelpInline', { name: cfg.shortName, size: cfg.sizeHint, quality: quality });
            }
            return T('helpVoskOffline', { name: cfg.shortName, size: cfg.sizeHint, quality: quality });
        },

        unloadModel: function() { V.unloadModel(engineId); },

        isModelReady: function() {
            return !!V.getPool(engineId).voskModel;
        },

        isModelLoading: function() {
            var st = V.getPool(engineId);
            return !!(st.voskModelPromise && !st.voskModel);
        },

        preloadModel: function(els) {
            if (!S.isSupported() || S.needsLanBypass()) return Promise.resolve(null);
            if (window.PDM.STT && window.PDM.STT.isPendingSttLoadBlocked && window.PDM.STT.isPendingSttLoadBlocked()) {
                return Promise.reject(new Error(
                    window.PDM.STT.getPendingSttLoadBlockReason
                        ? window.PDM.STT.getPendingSttLoadBlockReason()
                        : 'vosk-lang-unavailable'
                ));
            }
            return V.ensureModel(engineId, els, { background: true });
        },

        isActive: function() {
            var st = V.getPool(engineId);
            if (st.stopping) return false;
            return st.state === S.STATE_LISTENING || st.state === S.STATE_PERMISSION || st.state === S.STATE_LOADING;
        },

        getState: function() { return V.getPool(engineId).state; },

        getTextSession: function() { return V.getPool(engineId).text; },

        onEngineSelected: function() {},

        toggle: function(c) {
            var st = V.getPool(engineId);
            st.ctx = c;
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
            if (window.PDM.STT && window.PDM.STT.isPendingSttLoadBlocked && window.PDM.STT.isPendingSttLoadBlocked()) {
                if (window.PDM.STT.notifySttLoadBlocked) window.PDM.STT.notifySttLoadBlocked();
                return;
            }

            st.stopping = false;
            var startGen = V.bumpStartGen(st);
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
                if (V.isStartStale(st, startGen)) { s.getTracks().forEach(function(t){ t.stop(); }); st.pendingStream = null; throw new Error('cancelled'); }
                if (st.voskModel) return st.voskModel;
                st.state = S.STATE_LOADING;
                S.setState(els, st.state);
                S.setStatus(els, T('engineLoadGeneric', { name: cfg.shortName }), 'listening');
                return V.ensureModel(engineId, els);
            }).then(function(model) {
                if (V.isStartStale(st, startGen)) { if (stream) stream.getTracks().forEach(function(t){ t.stop(); }); throw new Error('cancelled'); }
                return V.startAudioPipeline(engineId, model, stream, els);
            }).catch(function(err) {
                if (stream && (V.isStartStale(st, startGen) || !st.recognizer)) {
                    try { stream.getTracks().forEach(function(t){ t.stop(); }); } catch (e) {}
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
                    V.log(engineId)('engine error', err);
                    var isDownloadTimeout = err && err.code === 'download-timeout';
                    var isExtractTimeout = err && err.code === 'extract-timeout';
                    var isLangUnavailable = err && err.message === 'vosk-lang-unavailable';
                    var isMaxiLangUnavailable = err && err.message === 'vosk-maxi-lang-unavailable';
                    var base = isDownloadTimeout
                        ? T('errorVoskDownloadTimeout', { name: cfg.shortName })
                        : (isExtractTimeout
                            ? T('errorVoskExtractTimeout', { name: cfg.shortName })
                            : T('errorVoskFailed', { name: cfg.shortName }));
                    S.setStatus(els, base + ' ' + (err && err.message ? err.message : ''), 'error');
                    var hint;
                    if (isMaxiLangUnavailable) {
                        hint = T('help.voskMaxiLangUnavailable', {
                            lang: window.PDM.STT && window.PDM.STT.formatVoskLangLabel
                                ? window.PDM.STT.formatVoskLangLabel(window.PDM.STT.getDesiredVoskLangId())
                                : ''
                        });
                    } else if (isLangUnavailable) {
                        hint = T('help.engineLangUnavailable', {
                            lang: window.PDM.STT && window.PDM.STT.formatVoskLangLabel
                                ? window.PDM.STT.formatVoskLangLabel(window.PDM.STT.getPendingVoskLang())
                                : ''
                        });
                    } else if (isExtractTimeout) {
                        hint = T('errorVoskCacheRetry', { name: cfg.shortName });
                    } else if (err && err.message && /^http-404$/.test(err.message)) {
                        hint = T('errorModelMissing', { path: cfg.modelFileHint });
                    } else if (err && err.message) {
                        hint = T('errorVoskDetail', { name: cfg.shortName, message: err.message, path: cfg.modelFileHint });
                    } else {
                        hint = T('errorModelMissing', { path: cfg.modelFileHint });
                    }
                    S.notifyStt(hint, 'err');
                }
                engine._reset(c);
                c.facade.syncPermissionUI();
            });
        },

        stop: function(c, opts) {
            opts = opts || {};
            var st = V.getPool(engineId);
            var state = st.state;
            var wasListening = state === S.STATE_LISTENING;
            var wasStarting = state === S.STATE_PERMISSION || state === S.STATE_LOADING;

            V.bumpStartGen(st);
            st.stopping = true;
            S.releaseMediaStream(st);

            if (wasStarting && !st.voskModel) {
                st.modelLoadGen++;
                st.voskModelPromise = null;
                st.voskModelLoading = null;
            }

            if (!engine.isActive() && !wasStarting) {
                engine._reset(c);
                return;
            }

            if (wasListening && st.text) {
                st.text.finalizeInterim();
                st.text.apply();
                st.text.triggerSave();
                if (!opts.silent) S.setStatus(c.els, T('dictationDone'), 'ok');
            } else if (!opts.silent) {
                S.setStatus(c.els, T('dictationCancelled'), 'ok');
            }
            if (wasListening) S.playDictationStopBeep(st, opts);
            S.clearDictationBeepSession(st);
            V.teardownAll(engineId, c.els);
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

        _reset: function(c) {
            var st = V.getPool(engineId);
            var wasStarting = st.state === S.STATE_PERMISSION || st.state === S.STATE_LOADING;
            V.bumpStartGen(st);
            S.releaseMediaStream(st);
            if (wasStarting && !st.voskModel) {
                st.modelLoadGen++;
                st.voskModelPromise = null;
                st.voskModelLoading = null;
            }
            V.teardownAll(engineId, c.els);
            S.clearDictationBeepSession(st);
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
            var st = V.getPool(engineId);
            if (st.loadedModelId) return T('statusModelReady', { name: cfg.shortName, backend: S.formatBackendLoadedLabel('wasm') });
            if (engine.isModelLoading()) return T('statusBackgroundLoading', { name: cfg.shortName, backend: S.formatBackendLoadingLabel(engineId, false) });
            return T('statusPreparing', { name: cfg.shortName });
        },

        getLoadedBackend: function() {
            return V.getPool(engineId).voskModel ? 'wasm' : null;
        },
    };

    enginesById[engineId] = engine;
    window.PDM.STT.registerEngine(engine);
    return engine;
}

createVoskEngine('vosk-mini');
createVoskEngine('vosk-maxi');

if (window.PDM.STT.syncEngineSelect) window.PDM.STT.syncEngineSelect();
if (window.PDM.STT.refresh) window.PDM.STT.refresh();

})();
