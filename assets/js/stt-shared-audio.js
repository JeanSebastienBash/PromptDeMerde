/**
 * PromptDeMerde.com — stt-shared-audio.js
 *
 * Synopsis : Capture micro AudioWorklet/ScriptProcessor.
 * Objectif : setupMicCapture, teardown et URL worklet.
 */
(function() {
var Shared = window.PDM && window.PDM.STT && window.PDM.STT.Shared;
if (!Shared) { console.warn('[stt-shared-audio] PDM.STT.Shared not found.'); return; }

Shared.teardownAudioNodes = function(audio) {
    if (audio.processorNode) {
        if (audio.processorNode.port) {
            audio.processorNode.port.onmessage = null;
        }
        try { audio.processorNode.disconnect(); } catch (e) {}
        audio.processorNode.onaudioprocess = null;
        audio.processorNode = null;
    }
    if (audio.sourceNode) { try { audio.sourceNode.disconnect(); } catch (e) {} audio.sourceNode = null; }
    if (audio.audioContext) {
        try { audio.audioContext.close(); } catch (e) {}
        audio.audioContext = null;
    }
    if (audio.mediaStream) {
        var tracks = audio.mediaStream.getTracks ? audio.mediaStream.getTracks() : [];
        for (var i = 0; i < tracks.length; i++) tracks[i].stop();
        audio.mediaStream = null;
    }
};

Shared.releaseMediaStream = function(st) {
    if (!st) return;
    var seen = [];
    function stopOne(stream) {
        if (!stream || seen.indexOf(stream) >= 0) return;
        seen.push(stream);
        try {
            if (stream.getTracks) stream.getTracks().forEach(function(t) { t.stop(); });
        } catch (e) {  }
    }
    stopOne(st.pendingStream);
    st.pendingStream = null;
    if (st.audio && st.audio.mediaStream) {
        stopOne(st.audio.mediaStream);
        st.audio.mediaStream = null;
    }
};

Shared.modelAbsoluteUrl = function(path) {
    try {
        return new URL(path, document.baseURI || window.location.href).href;
    } catch (e) {
        return path;
    }
};

Shared.getSttWorkletUrl = function() {
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
        var src = scripts[i].src;
        if (src && /stt-shared-core.js/.test(src)) {
            return src.replace(/stt-shared-core.js(?:\?.*)?$/, 'stt-audio-processor.js');
        }
    }
    return Shared.modelAbsoluteUrl('assets/js/stt-audio-processor.js');
};

Shared._wireScriptProcessorCapture = function(st, stream, opts) {
    var onProcess = opts.onProcess;
    var bufferSize = opts.bufferSize || 4096;
    var ctx = st.audio.audioContext;
    st.audio.sourceNode = ctx.createMediaStreamSource(stream);
    st.audio.processorNode = ctx.createScriptProcessor(bufferSize, 1, 1);
    st.audio.processorNode.onaudioprocess = function(ev) {
        onProcess(ev);
    };
    st.audio.sourceNode.connect(st.audio.processorNode);
    st.audio.processorNode.connect(ctx.destination);
    return Promise.resolve();
};

Shared._wireWorkletCapture = function(st, stream, opts) {
    var onProcess = opts.onProcess;
    var ctx = st.audio.audioContext;
    return ctx.audioWorklet.addModule(Shared.getSttWorkletUrl()).then(function() {
        st.audio.sourceNode = ctx.createMediaStreamSource(stream);
        st.audio.processorNode = new AudioWorkletNode(ctx, 'stt-capture-processor');
        st.audio.processorNode.port.onmessage = function(msg) {
            var data = msg.data;
            if (!data || !data.samples) return;
            var buf = ctx.createBuffer(1, data.samples.length, ctx.sampleRate);
            buf.getChannelData(0).set(data.samples);
            onProcess({ inputBuffer: buf });
        };
        st.audio.sourceNode.connect(st.audio.processorNode);
    });
};

Shared.setupMicCapture = function(st, stream, opts) {
    opts = opts || {};
    if (!st || !st.audio || !stream || typeof opts.onProcess !== 'function') {
        return Promise.reject(new Error('setupMicCapture: arguments invalides'));
    }
    var preferredRate = opts.sampleRate;
    var Ctor = Shared.getAudioContextCtor();
    st.audio.mediaStream = stream;
    try {
        st.audio.audioContext = preferredRate ? new Ctor({ sampleRate: preferredRate }) : new Ctor();
    } catch (e) {
        st.audio.audioContext = new Ctor();
    }
    var ctx = st.audio.audioContext;
    if (ctx.state === 'suspended' && ctx.resume) {
        var resumed = ctx.resume();
        if (resumed && resumed.catch) resumed.catch(function() {});
    }
    if (ctx.audioWorklet && typeof ctx.audioWorklet.addModule === 'function') {
        return Shared._wireWorkletCapture(st, stream, opts).catch(function() {
            return Shared._wireScriptProcessorCapture(st, stream, opts);
        });
    }
    return Shared._wireScriptProcessorCapture(st, stream, opts);
};

})();
