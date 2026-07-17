/**
 * PromptDeMerde.com — stt-parakeet-decode.js
 */
import {
    SAMPLE_RATE, CHUNK_SAMPLES, SPECIAL_TOKEN_RE, PUNCT_ONLY_RE
} from './stt-parakeet-config.js';
import { getPool, enginesById, log } from './stt-parakeet-model.js';

var S = window.PDM.STT.Shared;
function T(key, vars) { return S.sttT(key, vars); }

function joinTimedWords(words) {
    var text = '';
    for (var i = 0; i < (words || []).length; i++) {
        var part = words[i] && words[i].text != null ? String(words[i].text) : '';
        if (!part) continue;
        if (!text) text = part;
        else if (/^[,.;:!?)}\]]+$/.test(part)) text += part;
        else text += ' ' + part;
    }
    return text;
}

function stripSpecialTokens(s) {
    return String(s || '').replace(SPECIAL_TOKEN_RE, '').replace(/\s+/g, ' ').trim();
}

export function sanitizeParakeetText(text, words) {
    var joined = words && words.length ? joinTimedWords(words) : stripSpecialTokens(text);
    joined = stripSpecialTokens(joined);
    if (!joined || PUNCT_ONLY_RE.test(joined)) return '';
    return joined;
}

function commonWordPrefixLen(a, b) {
    if (!a) return 0;
    var aWords = a.split(' ');
    var bWords = b.split(' ');
    var max = Math.min(aWords.length, bWords.length);
    var i = 0;
    while (i < max && aWords[i] === bWords[i]) i++;
    if (i === 0) return 0;
    if (i === bWords.length) return b.length;
    return bWords.slice(0, i).join(' ').length + 1;
}

export function commitParakeetFinalized(id, cumulativeText) {
    var st = getPool(id);
    if (!cumulativeText || !st.text) return;
    var prev = st.parakeetLastFinalized || '';
    if (cumulativeText === prev) return;
    var common = commonWordPrefixLen(prev, cumulativeText);
    var delta = cumulativeText.slice(common).trim();
    st.parakeetLastFinalized = cumulativeText;
    if (delta) st.text.setFinalized(delta);
}

export function applyChunkResult(id, els, result) {
    var st = getPool(id);
    if (!result || !st.text) return;
    var finalized = sanitizeParakeetText(null, result.words);
    var chunkText = sanitizeParakeetText(result.chunkText, result.chunkWords);
    if (!finalized && !chunkText) return;
    st.gotAnyText = true;
    if (finalized) {
        commitParakeetFinalized(id, finalized);
        st.text.setInterim('');
    } else if (chunkText) {
        st.text.setInterim(chunkText);
    }
    if (st.state === S.STATE_LISTENING) {
        S.setStatus(els, T('listeningActive'), 'listening');
    }
}

function appendSamples(id, samples) {
    var st = getPool(id);
    if (!samples || !samples.length) return;
    var merged = new Float32Array(st.pendingSamples.length + samples.length);
    merged.set(st.pendingSamples, 0);
    merged.set(samples, st.pendingSamples.length);
    st.pendingSamples = merged;
}

export function drainChunks(id, els) {
    var st = getPool(id);
    if (st.chunkProcessing || !st.streamer) return;
    if (st.pendingSamples.length < CHUNK_SAMPLES) return;
    st.chunkProcessing = true;
    var chunkStart = Date.now();
    var chunk = st.pendingSamples.slice(0, CHUNK_SAMPLES);
    st.pendingSamples = st.pendingSamples.slice(CHUNK_SAMPLES);
    st.chunkQueue = st.chunkQueue.then(function() {
        if (!st.streamer || st.state !== S.STATE_LISTENING) return;
        return st.streamer.processChunk(chunk);
    }).then(function(result) {
        applyChunkResult(id, els, result);
    }).catch(function(e) {
        try { console.error('[PDM.STT.' + id + '] processChunk error', e); } catch (ee) {}
        if (!st.chunkErrorReported && st.state === S.STATE_LISTENING) {
            st.chunkErrorReported = true;
            var errMsg = e && e.message ? e.message : String(e);
            var msg = T('errorParakeetTranscribe', { message: errMsg });
            S.setStatus(els, msg, 'error');
            window.PDM.UI.notif(msg + T('errorParakeetTryVosk'), 'err');
        }
    }).then(function() {
        st.chunkProcessing = false;
        if (st.pendingSamples.length >= CHUNK_SAMPLES) drainChunks(id, els);
    });
}

function resampleTo16k(input, fromRate) {
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

function extractMono(ev, fromRate) {
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

    st.streamer = st.parakeetModel.createStreamingTranscriber({
        returnTimestamps: true,
        sampleRate: SAMPLE_RATE
    });
    st.gotAnyText = false;
    st.chunkErrorReported = false;
    st.parakeetLastFinalized = '';

    return S.setupMicCapture(st, stream, {
        sampleRate: SAMPLE_RATE,
        onProcess: function(ev) {
            if (st.state !== S.STATE_LISTENING || !st.streamer) return;
            S.tryDictationStartBeep(st);
            appendSamples(id, extractMono(ev, st.audio.audioContext.sampleRate));
            drainChunks(id, els);
        }
    }).then(function() {
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

export function flushRemaining(id, els) {
    var st = getPool(id);
    if (!st.streamer || st.pendingSamples.length === 0) return Promise.resolve();
    var tail = st.pendingSamples;
    st.pendingSamples = new Float32Array(0);
    return st.streamer.processChunk(tail).then(function(result) {
        applyChunkResult(id, els, result);
    }).catch(function(e) { log(id)('flush error', e); });
}

export function teardownAll(id, els) {
    var st = getPool(id);
    S.teardownAudioNodes(st.audio);
    S.clearTimers(st.timers);
    S.hideLoadProgress(els);
}

export function teardownStream(id) {
    var st = getPool(id);
    st.streamer = null;
    st.pendingSamples = new Float32Array(0);
    st.chunkQueue = Promise.resolve();
    st.chunkProcessing = false;
    st.chunkErrorReported = false;
}
