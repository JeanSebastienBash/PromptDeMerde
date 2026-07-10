/**
 * PromptDeMerde.com — stt-vosk-engine.js
 *
 * Synopsis : Factory moteurs Vosk Mini/Maxi.
 * Objectif : Enregistrer vosk-mini et vosk-maxi via registerEngine.
 */
(function() {
var Shared = window.PDM.STT.Shared;
var S = Shared;
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
                return 'Dict\u00e9e vocale non support\u00e9e : ce navigateur ne g\u00e8re pas WebAssembly.';
            }
            if (S.needsLanBypass()) {
                return S.getLanHelpText();
            }
            var quality = engineId === 'vosk-maxi'
                ? 'meilleure reconnaissance Vosk compatible navigateur'
                : 'l\u00e9ger sur CPU, peu performant';
            if (!S.isSecureContext()) {
                return cfg.shortName + ' (' + cfg.sizeHint + ') : ' + quality + ' \u2014 transcription mot \u00e0 mot, pas d\u2019autocorrection. Retouchez le texte dans le Workspace.';
            }
            return 'Dict\u00e9e ' + cfg.shortName + ' hors-ligne (' + cfg.sizeHint + ') : ' + quality + ' \u2014 articulation nette, pas d\u2019autocorrection. Pr\u00e9f\u00e9rez Whisper/Parakeet (GPU) pour l\u2019oral assist\u00e9.';
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
            return V.ensureModel(engineId, els, { background: true });
        },

        isActive: function() {
            var st = V.getPool(engineId);
            return st.state === S.STATE_LISTENING || st.state === S.STATE_PERMISSION || st.state === S.STATE_LOADING;
        },

        getState: function() { return V.getPool(engineId).state; },

        onEngineSelected: function() {},

        toggle: function(c) {
            var st = V.getPool(engineId);
            st.ctx = c;
            var els = c.els;
            if (engine.isActive()) { engine.stop(c); return; }
            if (!S.isSupported()) {
                S.notifyStt('Dict\u00e9e vocale non support\u00e9e par ce navigateur.', 'err');
                return;
            }
            if (S.needsLanBypass()) {
                c.facade.showLanSettings();
                return;
            }

            st.stopping = false;
            var startGen = V.bumpStartGen(st);
            st.state = S.STATE_PERMISSION;
            S.setState(els, st.state);
            S.setStatus(els, 'Pr\u00e9paration de la dict\u00e9e\u2026', 'listening');
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
                S.setStatus(els, 'Chargement de ' + cfg.shortName + '\u2026', 'listening');
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
                    var base = isDownloadTimeout
                        ? 'T\u00e9l\u00e9chargement ' + cfg.shortName + ' trop long.'
                        : (isExtractTimeout
                            ? 'Extraction WASM ' + cfg.shortName + ' trop longue (mod\u00e8le lourd).'
                            : '\u00c9chec de ' + cfg.shortName + '.');
                    S.setStatus(els, base + ' ' + (err && err.message ? err.message : ''), 'error');
                    var hint;
                    if (isExtractTimeout) {
                        hint = cfg.shortName + ' : l\u2019archive est en cache \u2014 r\u00e9essaie (plus de t\u00e9l\u00e9chargement).';
                    } else if (err && err.message && /^http-404$/.test(err.message)) {
                        hint = 'Mod\u00e8le absent : ' + cfg.modelFileHint;
                    } else if (err && err.message) {
                        hint = cfg.shortName + ' : ' + err.message + ' (' + cfg.modelFileHint + ')';
                    } else {
                        hint = 'Mod\u00e8le absent : ' + cfg.modelFileHint;
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
                if (!opts.silent) S.setStatus(c.els, 'Dict\u00e9e termin\u00e9e.', 'ok');
            } else if (!opts.silent) {
                S.setStatus(c.els, 'Annul\u00e9.', 'ok');
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
            if (st.loadedModelId) return cfg.shortName + ' \u2014 mod\u00e8le pr\u00eat (CPU WASM)';
            if (engine.isModelLoading()) return cfg.shortName + ' \u2014 chargement en arri\u00e8re-plan\u2026';
            return cfg.shortName + ' \u2014 pr\u00e9paration\u2026';
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
