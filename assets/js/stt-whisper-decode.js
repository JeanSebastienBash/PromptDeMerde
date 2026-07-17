/**
 * PromptDeMerde.com — stt-whisper-decode.js
 *
 * Synopsis : VAD, nettoyage transcript et pipeline live Whisper.
 */
import {
    SAMPLE_RATE, SEGMENT_SAMPLES, MIN_INTERIM_SAMPLES, MIN_VOICED_SAMPLES,
    MIN_RELAUNCH_SAMPLES, SILENCE_RMS, STREAM_INTERVAL_MS, SEGMENT_SECONDS
} from './stt-whisper-config.js';
import {
    getPool, enginesById, log, noteGpuEmptyResult, whisperRuntimeWasmFallback, setReplayLiveFn
} from './stt-whisper-model.js';
import { transcribeViaWorker } from './stt-whisper-worker-bridge.js';

var S = window.PDM.STT.Shared;
function T(key, vars) { return S.sttT(key, vars); }

function normalizeAudio(buf) {
    if (!buf || !buf.length) return buf;
    var peak = 0;
    for (var i = 0; i < buf.length; i++) {
        var a = Math.abs(buf[i]);
        if (a > peak) peak = a;
    }
    if (peak < 1e-7) return buf;
    var gain = Math.min(12, 0.9 / peak);
    if (gain <= 1.05) return buf;
    var out = new Float32Array(buf.length);
    for (var j = 0; j < buf.length; j++) {
        out[j] = Math.max(-1, Math.min(1, buf[j] * gain));
    }
    return out;
}

function rms(buf) {
    if (!buf.length) return 0;
    var sum = 0;
    for (var i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    return Math.sqrt(sum / buf.length);
}

function frameRms(buf, off, len) {
    var s = 0;
    for (var i = 0; i < len && off + i < buf.length; i++) { var v = buf[off + i] || 0; s += v * v; }
    return Math.sqrt(s / len);
}

function trimSilence(buf) {
    var win = Math.round(SAMPLE_RATE * 0.02);
    var thr = SILENCE_RMS;
    var start = -1, end = -1;
    for (var i = 0; i + win <= buf.length; i += win) {
        if (frameRms(buf, i, win) > thr) { start = i; break; }
    }
    if (start < 0) return new Float32Array(0);
    for (var j = buf.length - win; j >= 0; j -= win) {
        if (frameRms(buf, j, win) > thr) { end = j + win; break; }
    }
    if (end <= start) return new Float32Array(0);
    var pad = win * 4;
    start = Math.max(0, start - pad);
    end = Math.min(buf.length, end + pad);
    return buf.slice(start, end);
}

function stripAnnotations(s) {
    return s
        .replace(/\([^)]*\)/g, ' ')
        .replace(/\[[^\]]*\]/g, ' ')
        .replace(/\*[^*]*\*/g, ' ')
        .replace(/[\u266a\u266b\u2669\u266c\u2103]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

var HALLU_RE = [
    /sous[- ]?titr\w*/i,
    /amara\.?org/i,
    /merci d['\u2019 ]?avoir regard/i,
    /merci d['\u2019 ]?avoir suivi/i,
    /abonnez[- ]?vous/i,
    /n['\u2019 ]?oubliez pas (de vous )?(abonner|liker)/i,
    /je vous invite \u00e0 vous (faire|abonner|inscrire)/i,
    /(partagez|aimez|likez).{0,20}vid[\u00e9e]o/i,
    /\u00e0 (la )?(tr\u00e8s )?(bient\u00f4t|prochaine)/i,
    /g[\u00e9e]n[\u00e9e]rique/i,
    /^\s*musique\s*\.?\s*$/i,
    /^\s*applaudissements\s*\.?\s*$/i,
    /^\s*merci\s*\.?\s*$/i,
    /^\s*sous-titrage\b/i
];

function isHallucination(s) {
    for (var i = 0; i < HALLU_RE.length; i++) {
        if (HALLU_RE[i].test(s)) return true;
    }
    return false;
}

export function cleanTranscript(s, opts) {
    opts = opts || {};
    if (!s) return '';
    var c = stripAnnotations(s);
    if (!c) return '';
    if (!opts.strict && c.length > 1) return c;
    if (isHallucination(c)) return '';
    return c;
}

function prepareAudioForWhisper(buf, isFinal) {
    var normalized = normalizeAudio(buf);
    if (!isFinal) return normalized;
    var voiced = trimSilence(normalized);
    return voiced.length >= MIN_VOICED_SAMPLES ? voiced : normalized;
}

export function transcribeBuffer(id, buf, isFinal, opts) {
    opts = opts || {};
    var st = getPool(id);
    if (!st.workerReady || (st.stopping && !opts.force)) return Promise.resolve('');
    var voiced = prepareAudioForWhisper(buf, isFinal);
    var level = rms(voiced);
    if (voiced.length < MIN_VOICED_SAMPLES || level < SILENCE_RMS) {
        return Promise.resolve('');
    }
    var sendBuf = voiced;
    if (voiced.byteOffset !== 0 || voiced.byteLength !== voiced.buffer.byteLength) {
        sendBuf = voiced.slice(0);
    }
    var els = opts.els;
    return transcribeViaWorker(id, st, sendBuf, opts).then(function(raw) {
        if (st.stopping && !opts.force) return '';
        var clean = cleanTranscript(raw, { strict: isFinal });
        if (!clean && raw && raw.length > 1 && !isFinal) clean = raw.trim();
        if (clean) {
            st.gpuEmptyStreak = 0;
        } else if (st.usedBackend === 'webgpu' && els) {
            noteGpuEmptyResult(id, els, level, raw);
        }
        return clean;
    }).catch(function(e) {
        if (st.stopping) return '';
        if (e && e.code === 'transcribe-timeout') {
            if (st.usedBackend === 'webgpu' && els) {
                whisperRuntimeWasmFallback(id, els, 'timeout');
            }
            if (!st.chunkErrorReported) {
                st.chunkErrorReported = true;
                window.PDM.UI.notif(T('notif.whisperSlow'), 'info');
            }
            return '';
        }
        throw e;
    });
}

export function processLive(id, els) {
    var st = getPool(id);
    if (st.segProcessing || st.stopping || !st.workerReady || st.state !== S.STATE_LISTENING) return;
    if (st.pendingSamples.length < MIN_INTERIM_SAMPLES) return;
    var newSamples = st.pendingSamples.length - (st.lastTranscribedSamples || 0);
    if (newSamples < MIN_RELAUNCH_SAMPLES && st.pendingSamples.length < SEGMENT_SAMPLES) return;
    st.segProcessing = true;
    if (!st.gotAnyText) {
        S.setStatus(els, T('voiceAnalysis'), 'listening');
    }
    var snapshot = st.pendingSamples.slice(0);
    var isFinal = snapshot.length >= SEGMENT_SAMPLES;
    var inferStart = Date.now();
    var audioDur = snapshot.length / SAMPLE_RATE;
    transcribeBuffer(id, snapshot, isFinal, { els: els }).then(function(t) {
        if (st.stopping || st.state !== S.STATE_LISTENING || !st.text) return;
        var gpuEmptyFinal = isFinal && !t && st.usedBackend === 'webgpu';
        if (isFinal) {
            if (t) { st.gotAnyText = true; st.text.setFinalized(t); }
            if (!gpuEmptyFinal) {
                st.pendingSamples = snapshot.length <= st.pendingSamples.length
                    ? st.pendingSamples.slice(snapshot.length)
                    : new Float32Array(0);
                st.lastTranscribedSamples = 0;
                st.text.setInterim('');
            }
            S.setStatus(els, t ? T('listeningActive') : T('listeningSpeakNow'), 'listening');
        } else if (t) {
            st.gotAnyText = true;
            st.text.setInterim(t);
            st.lastTranscribedSamples = snapshot.length;
        }
    }).catch(function(e) {
        if (st.stopping) return;
        try { console.error('[PDM.STT.' + id + '] transcription error', e); } catch (ee) {}
        if (!st.chunkErrorReported && st.state === S.STATE_LISTENING) {
            st.chunkErrorReported = true;
            var errMsg = e && e.message ? e.message : String(e);
            var msg = T('errorWhisperTranscribe', { message: errMsg });
            S.setStatus(els, msg, 'error');
            window.PDM.UI.notif(msg + T('errorWhisperTryVosk'), 'err');
            if (st.usedBackend === 'webgpu') whisperRuntimeWasmFallback(id, els, 'error');
        }
    }).then(function() {
        st.segProcessing = false;
        if (!st.stopping && isFinal && st.pendingSamples.length >= SEGMENT_SAMPLES) processLive(id, els);
    });
}

export function flushRemaining(id, els) {
    var st = getPool(id);
    if (!st.workerReady) return Promise.resolve();
    var tail = st.pendingSamples.slice(0);
    st.pendingSamples = new Float32Array(0);
    if (tail.length < MIN_VOICED_SAMPLES) return Promise.resolve();
    return transcribeBuffer(id, tail, true, { force: true }).then(function(t) {
        if (st.text) {
            if (t) { st.gotAnyText = true; st.text.setFinalized(t); }
            st.text.setInterim('');
        }
    }).catch(function(e) {
        if (e && e.code !== 'flush-timeout') log(id, 'flush error', e);
    });
}

export function appendSamples(id, samples) {
    var st = getPool(id);
    if (!samples || !samples.length) return;
    var merged = new Float32Array(st.pendingSamples.length + samples.length);
    merged.set(st.pendingSamples, 0);
    merged.set(samples, st.pendingSamples.length);
    st.pendingSamples = merged;
}

export function resampleTo16k(input, fromRate) {
    if (fromRate === SAMPLE_RATE) return input;
    var ratio = fromRate / SAMPLE_RATE;
    var outLen = Math.round(input.length / ratio);
    var out = new Float32Array(outLen);
    for (var i = 0; i < outLen; i++) {
        var src = i * ratio;
        var idx = Math.floor(src);
        var frac = src - idx;
        var a = input[idx] || 0;
        var b = input[idx + 1] || a;
        out[i] = a + (b - a) * frac;
    }
    return out;
}

export function extractMono(ev, fromRate) {
    var buf = ev.inputBuffer;
    var ch0 = buf.getChannelData(0);
    var mono;
    if (buf.numberOfChannels === 1) {
        mono = new Float32Array(ch0);
    } else {
        mono = new Float32Array(buf.length);
        for (var i = 0; i < buf.length; i++) {
            var sum = 0;
            for (var c = 0; c < buf.numberOfChannels; c++) sum += buf.getChannelData(c)[i];
            mono[i] = sum / buf.numberOfChannels;
        }
    }
    return resampleTo16k(mono, fromRate);
}

export function startAudioPipeline(id, stream, els) {
    var st = getPool(id);
    st.pendingStream = null;

    st.pendingSamples = new Float32Array(0);
    st.segProcessing = false;
    st.gotAnyText = false;
    st.chunkErrorReported = false;
    st.lastTranscribedSamples = 0;

    return S.setupMicCapture(st, stream, {
        sampleRate: SAMPLE_RATE,
        onProcess: function(ev) {
            if (st.state !== S.STATE_LISTENING || !st.workerReady) return;
            S.tryDictationStartBeep(st);
            appendSamples(id, extractMono(ev, st.audio.audioContext.sampleRate));
        }
    }).then(function() {

        if (st.streamTimer) clearInterval(st.streamTimer);
        st.streamTimer = setInterval(function() { processLive(id, els); }, STREAM_INTERVAL_MS);

        st.state = S.STATE_LISTENING;
        S.setState(els, st.state);
        S.updateButton(els, true);
        st.startTime = Date.now();
        S.armDictationStartBeep(st);
        S.startTickTimer(st.timers, function() { return st.state; }, els, st.startTime);
        S.setStatus(els, T('listeningSpeakNow'), 'listening');

        var maxMs = window.PDM.Storage.getSTTMaxMs();
        if (maxMs > 0) {
            st.timers.maxTimer = setTimeout(function() {
                window.PDM.UI.notif(T('notif.dictationLimit'), 'info');
                window.PDM.STT.stop();
            }, maxMs);
        }
    });
}

export function teardownStream(id) {
    var st = getPool(id);
    if (st.streamTimer) { clearInterval(st.streamTimer); st.streamTimer = null; }
    st.pendingSamples = new Float32Array(0);
    st.segProcessing = false;
    st.chunkErrorReported = false;
}

export { SEGMENT_SECONDS };

setReplayLiveFn(function(id, els) {
    var st = getPool(id);
    if (st.state === S.STATE_LISTENING && !st.segProcessing && st.pendingSamples.length >= MIN_VOICED_SAMPLES) {
        processLive(id, els);
    }
});
