/**
 * PromptDeMerde.com — stt-permissions.js
 */
(function() {
var STT = window.PDM.STT;
var S = STT.Shared;
var engines = STT._engines;

function T(key, vars) { return S.sttT(key, vars); }

function getEngine(){var id=window.PDM.Storage.getSttEngine();return engines[id]||engines["vosk-maxi"]||null;}

STT.showLanSettings = function() {
    S.updateWorkspaceLanHint(true);
    STT.setState(S.STATE_ERROR);
    S.setStatus(STT._state.els, T('micBlockedOnAddress'), 'error');
    if (S.isWorkspaceView()) return;
    window.PDM.UI.notif(S.isChromium()
        ? T('notifLanChromium')
        : T('notifLanGeneric'), 'info');
    window.location.hash = '#workspace';
};

STT.setState = function(next) {
    var eng = getEngine();
    if (eng && eng._setState) eng._setState(next);
    S.setState(STT._state.els, next);
};

STT.syncPermissionUI = function() {
    var eng = getEngine();
    if (eng && !eng.isSupported()) return;

    if (S.needsLanBypass()) {
        S.updateWorkspaceLanHint(true);
        S.updateDeniedPanel(STT._state.els, false);
        if (STT._state.els.help && !STT._state.els.help.hidden) {
            STT._state.els.help.textContent = S.getLanHelpText();
        }
        STT.renderUi();
        return Promise.resolve('insecure');
    }

    S.updateWorkspaceLanHint(false);

    return STT.queryMicPermission().then(function(p) {
        if (STT._state.prevMicPermissionState === 'denied' && p === 'granted' && !STT.isActive()) {
            window.PDM.UI.notif(T('notif.micGranted'), 'ok');
        }
        STT._state.prevMicPermissionState = p;
        STT._state.micPermissionState = p;

        if (STT.isActive()) return p;
        if (p === 'granted') {
            S.clearStripHint();
            S.updateDeniedPanel(STT._state.els, false);
        } else if (p === 'denied') {
            S.updateDeniedPanel(STT._state.els, false);
        } else {
            S.updateDeniedPanel(STT._state.els, false);
            if (window.matchMedia && window.matchMedia('(max-width:1024px)').matches) {
                S.showStripHint(T('stripHintGrantMic'), 'warn');
            }
        }
        STT.renderUi();
        return p;
    });
};

STT.requestMicrophonePermission = function(opts) {
    opts = opts || {};
    var deviceId = opts.forceDefault ? '' : window.PDM.Storage.getSttDeviceId();
    var constraints = { audio: { echoCancellation: true, noiseSuppression: true } };
    if (deviceId) constraints.audio.deviceId = { ideal: deviceId };
    return S.getUserMediaCompat(constraints).catch(function(err) {
        if (deviceId && !opts.forceDefault) {
            return S.getUserMediaCompat({ audio: { echoCancellation: true, noiseSuppression: true } });
        }
        throw err;
    });
};

STT.ensureMicAccess = function(opts) {
    opts = opts || {};
    if (S.needsLanBypass()) {
        STT.showLanSettings();
        return Promise.reject(STT.makePermDeniedError());
    }

    /* Toujours appeler getUserMedia : seule façon d’afficher la fenêtre
     * d’autorisation du navigateur (clic dictée ou rafraîchir les micros).
     * Ne pas court-circuiter sur l’état Permissions API « denied » —
     * getUserMedia reste la source de vérité. */
    function request() {
        var forceDefault = STT._state.micPermissionState !== 'granted';
        return STT.requestMicrophonePermission({ forceDefault: forceDefault })
            .then(STT.onMicAccessGranted)
            .catch(STT.handleMicAccessError);
    }

    return STT.queryMicPermission().then(request, request);
};

STT.retryLanBypass = function() {
    if (S.isSecureContext() && S.canCaptureMic()) {
        S.updateWorkspaceLanHint(false);
        STT.syncPermissionUI();
        window.PDM.UI.notif(T('notif.micReady'), 'ok');
        return;
    }
    var msg = S.isChromium()
        ? T('retryLanChromium')
        : T('retryLanFirefox');
    S.notifyStt(msg, 'info');
    var STTref = window.PDM && window.PDM.STT;
    if (STTref && typeof STTref.safeReload === 'function') {
        STTref.safeReload();
        return;
    }
    window.location.reload();
};

})();
