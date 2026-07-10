/**
 * PromptDeMerde.com — stt-shared-beep.js
 *
 * Synopsis : Bips Web Audio dictée.
 * Objectif : Feedback audio start/stop sans fichier.
 */
(function() {
var Shared = window.PDM && window.PDM.STT && window.PDM.STT.Shared;
if (!Shared) { console.warn('[stt-shared-beep] PDM.STT.Shared not found.'); return; }

/* ── Bips dictée (Web Audio, sans fichier) ─────────────────────────────
   Départ : au 1er buffer micro capturé (pipeline réellement actif).
   Arrivée : à l'arrêt après une session d'écoute réelle. */
Shared._beepAudioCtx = null;

Shared._ensureBeepAudioContext = function() {
    var Ctor = Shared.getAudioContextCtor();
    if (!Ctor) return null;
    if (!Shared._beepAudioCtx || Shared._beepAudioCtx.state === 'closed') {
        try { Shared._beepAudioCtx = new Ctor(); } catch (e) { return null; }
    }
    var ctx = Shared._beepAudioCtx;
    if (ctx.state === 'suspended' && ctx.resume) {
        ctx.resume().catch(function() {});
    }
    return ctx;
};

Shared.warmupBeepAudio = function() {
    Shared._ensureBeepAudioContext();
};

Shared._playTone = function(ctx, freq, start, duration, peakGain) {
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peakGain, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.03);
};

Shared.playDictationBeep = function(kind) {
    var ctx = Shared._ensureBeepAudioContext();
    if (!ctx) return;
    function play() {
        var now = ctx.currentTime + 0.005;
        if (kind === 'start') {
            Shared._playTone(ctx, 988, now, 0.11, 0.32);
        } else if (kind === 'stop') {
            Shared._playTone(ctx, 523, now, 0.14, 0.38);
            Shared._playTone(ctx, 659, now + 0.18, 0.14, 0.38);
        }
    }
    if (ctx.state === 'suspended' && ctx.resume) {
        var resumed = ctx.resume();
        if (resumed && resumed.then) resumed.then(play).catch(play);
        else play();
    } else {
        play();
    }
};

Shared.armDictationStartBeep = function(session) {
    if (session) session.beepArmed = true;
};

Shared.disarmDictationStartBeep = function(session) {
    if (session) session.beepArmed = false;
};

Shared.tryDictationStartBeep = function(session) {
    if (!session || !session.beepArmed) return;
    session.beepArmed = false;
    session.beepHeard = true;
    Shared.playDictationBeep('start');
};

Shared.playDictationStopBeep = function(session, opts) {
    if (!session) return;
    opts = opts || {};
    if (opts.silent || !session.beepHeard) return;
    Shared.playDictationBeep('stop');
};

Shared.shouldPlayDictationStopBeep = function(session) {
    return !!(session && session.beepHeard);
};

Shared.clearDictationBeepSession = function(session) {
    if (!session) return;
    session.beepArmed = false;
    session.beepHeard = false;
};

})();
