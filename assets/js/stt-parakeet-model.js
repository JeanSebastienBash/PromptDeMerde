/**
 * PromptDeMerde.com — stt-parakeet-model.js
 */
import { fromUrls } from './vendor/parakeet/parakeet-lib.js';
import {
    cfgFor, PARAKEET_DOWNLOAD_PERCENT_MAX, PARAKEET_INIT_PERCENT_BASE,
    parakeetBackendLabel, wasmPathsUrl
} from './stt-parakeet-config.js';

var S = window.PDM.STT.Shared;

export var pools = {};
export var enginesById = {};

export function getPool(id) {
    if (!pools[id]) {
        pools[id] = {
            state: S.STATE_IDLE,
            parakeetModel: null,
            modelPromise: null,
            modelLoadGen: 0,
            streamer: null,
            audio: {},
            text: null,
            timers: { maxTimer: null, tickTimer: null },
            startTime: 0,
            stopping: false,
            startGen: 0,
            pendingSamples: new Float32Array(0),
            chunkProcessing: false,
            chunkQueue: Promise.resolve(),
            modelBlobUrls: [],
            loadedModelId: null,
            usedBackend: null,
            lang: 'fr',
            chunkErrorReported: false,
            gotAnyText: false,
            pendingStream: null
        };
    }
    return pools[id];
}

export function log() {
    return function() {};
}

function releaseSessions(model) {
    if (!model) return;
    try { if (model.encoderSession && model.encoderSession.release) model.encoderSession.release(); } catch (e) {}
    try { if (model.joinerSession && model.joinerSession.release) model.joinerSession.release(); } catch (e) {}
    try {
        if (model.preprocessor && model.preprocessor.session && model.preprocessor.session.release) {
            model.preprocessor.session.release();
        }
    } catch (e) {}
    try { if (model._onnxPreprocessor && model._onnxPreprocessor.session && model._onnxPreprocessor.session.release) model._onnxPreprocessor.session.release(); } catch (e) {}
}

export function unloadModel(id) {
    var st = getPool(id);
    st.modelLoadGen++;
    st.streamer = null;
    if (st.parakeetModel) releaseSessions(st.parakeetModel);
    st.parakeetModel = null;
    st.modelPromise = null;
    st.pendingSamples = new Float32Array(0);
    st.chunkQueue = Promise.resolve();
    st.chunkProcessing = false;
    st.loadedModelId = null;
    st.usedBackend = null;
    for (var i = 0; i < st.modelBlobUrls.length; i++) {
        try { URL.revokeObjectURL(st.modelBlobUrls[i]); } catch (e) {}
    }
    st.modelBlobUrls = [];
}

export function checkModelFiles(cfg) {
    return fetch(S.modelAbsoluteUrl(cfg.model.encoder), { method: 'HEAD', cache: 'no-store' }).then(function(r) {
        if (!r.ok) throw new Error('missing-model');
        return true;
    });
}

function initParakeetFromBlobs(id, urls, backend, tracker, myGen) {
    var st = getPool(id);
    var backendLabel = parakeetBackendLabel(backend);
    tracker.startIndeterminate('Initialisation ONNX (' + backendLabel + ')', PARAKEET_INIT_PERCENT_BASE, {
        backend: backend,
        hint: 'Compilation / chargement ONNX'
    });
    return S.promiseTimeout(fromUrls({
        encoderUrl: urls.encoder,
        decoderUrl: urls.decoder,
        tokenizerUrl: urls.vocab,
        backend: backend,
        preprocessorBackend: 'js',
        wasmPaths: wasmPathsUrl()
    }), 300000, 'onnx-init');
}

export function ensureModel(id, els, opts) {
    opts = opts || {};
    var st = getPool(id);
    var cfg = cfgFor(id);
    var background = !!opts.background;
    if (st.parakeetModel) return Promise.resolve(st.parakeetModel);
    if (st.modelPromise) return st.modelPromise;
    var myGen = st.modelLoadGen;
    var tracker = background
        ? S.createBackgroundLoadTracker(cfg.shortName, function(p) {
            if (window.PDM.STT && window.PDM.STT.reportLoadProgress) window.PDM.STT.reportLoadProgress(p);
        })
        : S.createLoadTracker(els, cfg.shortName);
    var loadStartedAt = Date.now();
    if (!background) {
        st.state = S.STATE_LOADING;
        S.setState(els, st.state);
        tracker.show();
        tracker.phase('V\u00e9rification des fichiers', 0, cfg.sizeHint);
    } else {
        tracker.phase('V\u00e9rification des fichiers', 0, cfg.sizeHint);
    }
    var dbg = log(id);

    st.modelPromise = checkModelFiles(cfg).then(function() {
        if (myGen !== st.modelLoadGen) throw new Error('cancelled');
        return tracker.fetchWeighted([
            {
                url: S.modelAbsoluteUrl(cfg.model.encoder),
                weight: 391,
                label: 'T\u00e9l\u00e9chargement encodeur (~391 Mo)'
            },
            {
                url: S.modelAbsoluteUrl(cfg.model.decoder),
                weight: 18,
                label: 'T\u00e9l\u00e9chargement d\u00e9codeur (~18 Mo)'
            },
            {
                url: S.modelAbsoluteUrl(cfg.model.vocab),
                weight: 1,
                label: 'Vocabulaire'
            }
        ], { maxPercent: PARAKEET_DOWNLOAD_PERCENT_MAX });
    }).then(function(blobs) {
        if (myGen !== st.modelLoadGen) throw new Error('cancelled');
        var urls = {
            encoder: URL.createObjectURL(blobs[0]),
            decoder: URL.createObjectURL(blobs[1]),
            vocab: URL.createObjectURL(blobs[2])
        };
        st.modelBlobUrls = [urls.encoder, urls.decoder, urls.vocab];
        return S.detectParakeetBackend().then(function(backend) {
            st.usedBackend = backend;
            return initParakeetFromBlobs(id, urls, backend, tracker, myGen).catch(function(err) {
                if (backend.indexOf('webgpu') !== 0) throw err;
                try { console.warn('[PDM.STT.' + id + '] WebGPU KO, repli WASM', err); } catch (e) {}
                tracker.startIndeterminate('Repli CPU (WASM)', PARAKEET_INIT_PERCENT_BASE, {
                    backend: 'wasm',
                    hint: 'WebGPU indisponible'
                });
                st.usedBackend = 'wasm';
                return initParakeetFromBlobs(id, urls, 'wasm', tracker, myGen);
            });
        });
    }).then(function(model) {
        if (myGen !== st.modelLoadGen) throw new Error('cancelled');
        st.parakeetModel = model;
        st.loadedModelId = cfg.loadedModelId;
        tracker.phase('Mod\u00e8le pr\u00eat', 100, 'Charg\u00e9 en ' + Math.round((Date.now() - loadStartedAt) / 1000) + ' s');
        dbg('mod\u00e8le charg\u00e9');
        return model;
    }).catch(function(err) {
        unloadModel(id);
        throw err;
    }).finally(function() {
        tracker.hide();
        if (window.PDM.STT) window.PDM.STT.renderUi();
    });
    return st.modelPromise;
}
