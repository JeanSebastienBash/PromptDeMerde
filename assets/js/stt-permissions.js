/**
 * PromptDeMerde.com — stt-permissions.js
 */
(function() {
var STT = window.PDM.STT;
var S = STT.Shared;
var engines = STT._engines;

function getEngine(){var id=window.PDM.Storage.getSttEngine();return engines[id]||engines["vosk-maxi"]||null;}

STT.showLanSettings = function() {
    S.updateWorkspaceLanHint(true);
    STT.setState(S.STATE_ERROR);
    S.setStatus(STT._state.els, 'Micro bloqu\u00e9 en HTTP sur cette adresse.', 'error');
    if (S.isWorkspaceView()) return;
    window.PDM.UI.notif(S.isChromium()
        ? 'Chromium : micro bloqu\u00e9 en HTTP sur une IP \u2014 essaie localhost ou HTTPS.'
        : 'Micro bloqu\u00e9 en HTTP \u2014 essaie localhost, HTTPS ou about:config (Firefox).', 'info');
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
        S.updatePermButton(STT._state.els, true, false);
        if (STT._state.els.permBtn) {
            STT._state.els.permBtn.textContent = '\uD83D\uDD13';
            STT._state.els.permBtn.title = 'Mode r\u00e9seau local (HTTP) \u2014 micro bloqu\u00e9';
        }
        if (STT._state.els.help && !STT._state.els.help.hidden) {
            STT._state.els.help.textContent = S.getLanHelpText();
        }
        STT.renderUi();
        return Promise.resolve('insecure');
    }

    S.updateWorkspaceLanHint(false);
    if (STT._state.els.permBtn) {
        STT._state.els.permBtn.textContent = '\uD83D\uDD13';
        STT._state.els.permBtn.title = 'Autoriser le micro';
    }

    return STT.queryMicPermission().then(function(p) {
        if (STT._state.prevMicPermissionState === 'denied' && p === 'granted' && !STT.isActive()) {
            window.PDM.UI.notif('Micro autoris\u00e9.', 'ok');
        }
        STT._state.prevMicPermissionState = p;
        STT._state.micPermissionState = p;

        if (STT.isActive()) return p;
        if (p === 'granted') {
            S.clearStripHint();
            S.updatePermButton(STT._state.els, false);
            S.updateDeniedPanel(STT._state.els, false);
        } else if (p === 'denied') {
            S.updatePermButton(STT._state.els, true, true);
            S.updateDeniedPanel(STT._state.els, false);
        } else {
            S.updatePermButton(STT._state.els, true, false);
            S.updateDeniedPanel(STT._state.els, false);
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
    var els = STT._state.els;
    if (S.needsLanBypass()) {
        STT.showLanSettings();
        return Promise.reject(STT.makePermDeniedError());
    }
    if (STT._state.micPermissionState === 'denied') {
        S.updateDeniedPanel(els, false);
        S.updatePermButton(els, true, true);
        S.showStripHint('Permission micro refus\u00e9e \u2014 r\u00e9initialise dans les r\u00e9glages du site.', 'error');
        return Promise.reject(STT.makePermDeniedError());
    }
    if (STT._state.micPermissionState === 'unknown') STT.queryMicPermission();
    var forceDefault = STT._state.micPermissionState !== 'granted';
    return STT.requestMicrophonePermission({ forceDefault: forceDefault })
        .then(STT.onMicAccessGranted)
        .catch(STT.handleMicAccessError);
};

STT.retryLanBypass = function() {
    var els = STT._state.els;
    if (S.isSecureContext() && S.canCaptureMic()) {
        S.updateWorkspaceLanHint(false);
        STT.syncPermissionUI();
        window.PDM.UI.notif('Micro disponible. Tu peux lancer la dict\u00e9e.', 'ok');
        return;
    }
    var msg = S.isChromium()
        ? 'Toujours bloqu\u00e9 : utilise localhost, HTTPS, ou le flag Chrome.'
        : 'Toujours bloqu\u00e9 : v\u00e9rifie about:config (Firefox) ou recharge la page.';
    S.notifyStt(msg, 'info');
    window.location.reload();
};

STT.retryPermission = function() {
    var els = STT._state.els;
    var eng = getEngine();
    if (!eng || !eng.isSupported()) {
        S.notifyStt('Dict\u00e9e vocale non support\u00e9e par ce navigateur.', 'err');
        return;
    }
    if (S.needsLanBypass()) {
        STT.retryLanBypass();
        return;
    }
    S.setStatus(els, 'Demande d\u2019autorisation micro\u2026', 'listening');
    if (els.permBtn) els.permBtn.disabled = true;

    STT.queryMicPermission().then(function(state) {
        if (state === 'denied') {
            S.updateDeniedPanel(els, false);
            S.updatePermButton(els, true, true);
            S.setStatus(els, 'Permission micro refus\u00e9e \u2014 r\u00e9initialise dans les r\u00e9glages du site.', 'error');
            S.showStripHint(S.deniedHint(), 'error');
            return null;
        }
        return STT.requestMicrophonePermission({ forceDefault: state !== 'granted' });
    }).then(function(stream) {
        if (!stream) return;
        if (stream.getTracks) stream.getTracks().forEach(function(t) { t.stop(); });
        STT.onMicAccessGranted(stream);
        S.setStatus(els, 'Micro autoris\u00e9.', 'ok');
        window.PDM.UI.notif('Micro autoris\u00e9. Clique sur Dict\u00e9e vocale pour commencer.', 'ok');
        STT.refreshMicrophones(true);
    }).catch(function(err) {
        if (S.isPermissionDeniedError(err)) {
            S.setState(els, S.STATE_ERROR);
            S.setStatus(els, 'Permission micro refus\u00e9e \u2014 r\u00e9initialise dans les r\u00e9glages du site.', 'error');
            if (!err._pdmPermDenied) S.showStripHint(S.deniedHint(), 'error');
            STT.handleMicAccessError(err);
            return;
        }
        S.setState(els, S.STATE_IDLE);
        S.setStatus(els, S.getMicErrorLabel(err), 'error');
        S.updatePermButton(els, true, false);
    }).finally(function() {
        if (els.permBtn) els.permBtn.disabled = false;
    });
};

})();
