/**
 * PromptDeMerde.com — stt-whisper-engine.js
 *
 * Synopsis : Factory moteurs Whisper Mini/Maxi (point d'entrée module).
 */
import { cfgFor, modelLoadErrorHint, MIN_VOICED_SAMPLES } from './stt-whisper-config.js';
import {
    getPool, enginesById, log, ensureModel, unloadModel
} from './stt-whisper-model.js';
import {
    startAudioPipeline, teardownStream, transcribeBuffer, SEGMENT_SECONDS
} from './stt-whisper-decode.js';

var S = window.PDM.STT.Shared;

function bumpStartGen(st) {
    st.startGen = (st.startGen || 0) + 1;
    return st.startGen;
}

function isStartStale(st, gen) {
    return gen !== st.startGen;
}

function teardownAll(id, els) {
    var st = getPool(id);
    if (st.streamTimer) { clearInterval(st.streamTimer); st.streamTimer = null; }
    S.teardownAudioNodes(st.audio);
    S.clearTimers(st.timers);
    S.hideLoadProgress(els);
}

function createWhisperEngine(engineId) {
    var cfg = cfgFor(engineId);

    var engine = {
        id: engineId,
        label: cfg.label,
        shortName: cfg.shortName,

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
            var gpu = S.hasWebGPU() ? 'WebGPU si dispo, sinon CPU' : 'CPU (WASM)';
            return 'Dict\u00e9e ' + cfg.shortName + ' (' + cfg.helpSize + ') : autocorrection \u00e0 l\u2019oral. ' + gpu + '. Segments ~' + SEGMENT_SECONDS + ' s.';
        },

        unloadModel: function() { unloadModel(engineId); },

        isModelReady: function() {
            return !!getPool(engineId).workerReady;
        },

        isModelLoading: function() {
            var st = getPool(engineId);
            return !!(st.modelPromise && !st.workerReady);
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

        toggle: function(c) {
            var st = getPool(engineId);
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

            if (c.getLang) {
                try { st.lang = c.getLang() || 'fr'; } catch (e) { st.lang = 'fr'; }
            }

            st.stopping = false;
            st.inferGen = 0;
            var startGen = bumpStartGen(st);
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
                if (isStartStale(st, startGen)) { s.getTracks().forEach(function(t) { t.stop(); }); st.pendingStream = null; throw new Error('cancelled'); }
                if (st.workerReady) return true;
                st.state = S.STATE_LOADING;
                S.setState(els, st.state);
                S.setStatus(els, 'Chargement de ' + cfg.shortName + '\u2026', 'listening');
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
                    log(engineId, 'engine error', err);
                    var missing = err && err.message === 'missing-model';
                    var libLoad = err && err.message === 'lib-load';
                    var oom = err && /memory|oom|alloc/i.test(String(err.message || err));
                    var base = libLoad ? 'Librairie Whisper (transformers.js) non charg\u00e9e.'
                        : (missing ? 'Mod\u00e8le Whisper introuvable.'
                        : (oom ? 'M\u00e9moire insuffisante pour Whisper.' : '\u00c9chec du moteur Whisper.'));
                    var detail = libLoad ? st.libLoadDetail : (err && err.message ? err.message : '');
                    S.setStatus(els, base + ' ' + detail, 'error');
                    var hint = libLoad ? ('Cause : ' + (st.libLoadDetail || 'inconnue') + ' \u2014 vide le cache (Ctrl+Shift+R).')
                        : (missing ? modelLoadErrorHint(engineId)
                        : (oom ? 'Ferme d\u2019autres onglets ou utilise Vosk (Petit).' : modelLoadErrorHint(engineId)));
                    S.notifyStt(hint, 'err');
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
            st.inferGen++;

            S.releaseMediaStream(st);
            if (st.streamTimer) { clearInterval(st.streamTimer); st.streamTimer = null; }
            S.teardownAudioNodes(st.audio);
            S.clearTimers(st.timers);
            S.hideLoadProgress(els);

            if (wasStarting && !st.workerReady) {
                unloadModel(engineId);
            }

            if (!wasListening && !wasStarting) {
                engine._reset(c);
                return;
            }

            if (wasListening) S.playDictationStopBeep(st, opts);
            S.clearDictationBeepSession(st);

            var producedText = st.gotAnyText;
            var tail = wasListening ? st.pendingSamples.slice(0) : new Float32Array(0);
            if (wasListening && st.text) {
                st.text.finalizeInterim();
                st.text.apply();
                st.text.triggerSave();
            }

            st.state = S.isSupported() ? S.STATE_IDLE : S.STATE_UNSUPPORTED;
            S.setState(els, st.state);
            S.updateButton(els, false);
            S.setBusy(els, false, false);
            st.stopping = false;

            if (!opts.silent) {
                S.setStatus(els, wasListening ? 'Dict\u00e9e termin\u00e9e.' : 'Annul\u00e9.', 'ok');
            }

            teardownStream(engineId);

            if (wasListening && !producedText && !st.gotAnyText && !st.chunkErrorReported && !opts.silent) {
                window.PDM.UI.notif(cfg.shortName + ' n\u2019a transcrit aucun texte. Ouvre la console (F12), ou essaie Vosk.', 'info');
            }

            if (c.facade) {
                if (c.facade.updateDictationButton) c.facade.updateDictationButton();
                else if (c.facade.renderUi) c.facade.renderUi();
            }

            if (wasListening && st.workerReady && tail.length >= MIN_VOICED_SAMPLES) {
                transcribeBuffer(engineId, tail, true, { force: true }).then(function(t) {
                    if (!t || !st.text) return;
                    st.text.setFinalized(t);
                    st.text.setInterim('');
                    st.text.apply();
                    st.text.triggerSave();
                }).catch(function() {});
            }
        },

        _reset: function(c) {
            var st = getPool(engineId);
            var wasStarting = st.state === S.STATE_PERMISSION || st.state === S.STATE_LOADING;
            bumpStartGen(st);
            S.releaseMediaStream(st);
            if (wasStarting && !st.workerReady) unloadModel(engineId);
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
                return cfg.shortName + ' \u2014 mod\u00e8le pr\u00eat (' + S.formatBackendLoadedLabel(st.usedBackend) + ')';
            }
            if (engine.isModelLoading()) return cfg.shortName + ' \u2014 chargement en arri\u00e8re-plan\u2026';
            return cfg.shortName + ' \u2014 pr\u00e9paration\u2026';
        },

        getLoadedBackend: function() {
            var st = getPool(engineId);
            return st.workerReady ? (st.usedBackend || 'wasm') : null;
        },
    };

    enginesById[engineId] = engine;
    window.PDM.STT.registerEngine(engine);
    return engine;
}

createWhisperEngine('whisper-mini');
createWhisperEngine('whisper-maxi');

if (window.PDM.STT.syncEngineSelect) window.PDM.STT.syncEngineSelect();
if (window.PDM.STT.refresh) window.PDM.STT.refresh();
