/**
 * PromptDeMerde.com — stt-shared-permissions.js
 *
 * Synopsis : Permissions micro et erreurs.
 * Objectif : releaseMediaStream, panneaux denied et labels erreur.
 */
(function() {
var Shared = window.PDM && window.PDM.STT && window.PDM.STT.Shared;
if (!Shared) { console.warn('[stt-shared-permissions] PDM.STT.Shared not found.'); return; }

/** Arrête les flux micro ouverts pendant une dictée ou un démarrage annulé. */
Shared.releaseMediaStream = function(st) {
    if (!st) return;
    var seen = [];
    function stopOne(stream) {
        if (!stream || seen.indexOf(stream) >= 0) return;
        seen.push(stream);
        try {
            if (stream.getTracks) stream.getTracks().forEach(function(t) { t.stop(); });
        } catch (e) { /* ignore */ }
    }
    stopOne(st.pendingStream);
    st.pendingStream = null;
    if (st.audio && st.audio.mediaStream) {
        stopOne(st.audio.mediaStream);
        st.audio.mediaStream = null;
    }
};

Shared.updatePermButton = function(els, show, denied) {
    if (!els.permBtn) return;
    var bar = els.permBtn.closest('.stt-mic-status-bar');
    if (!show) {
        els.permBtn.hidden = true;
        els.permBtn.style.display = 'none';
        if (bar) bar.classList.remove('stt-mic-status-bar--perm');
        return;
    }
    els.permBtn.hidden = false;
    els.permBtn.style.display = 'inline-flex';
    els.permBtn.textContent = '\uD83D\uDD13';
    els.permBtn.title = denied
        ? 'R\u00e9autoriser le micro'
        : (Shared.needsLanBypass()
            ? 'Mode r\u00e9seau local (HTTP) \u2014 micro bloqu\u00e9'
            : 'Autoriser le micro');
    if (bar) bar.classList.add('stt-mic-status-bar--perm');
};

Shared.updateDeniedPanel = function(els, show) {
    if (!els.deniedPanel) return;
    els.deniedPanel.style.display = show ? 'block' : 'none';
};

Shared.clearStoredMicDevice = function(els) {
    window.PDM.Storage.setSttDeviceId('');
    if (els && els.deviceSelect) els.deviceSelect.value = '';
};

Shared.isPermissionDeniedError = function(err) {
    if (!err) return false;
    if (err._pdmPermDenied) return true;
    return err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
};

Shared.deniedHint = function() {
    if (!Shared.isSecureContext()) {
        return 'Micro bloqu\u00e9 en HTTP : essaie localhost ou HTTPS.';
    }
    return 'Permission micro bloqu\u00e9e : r\u00e9initialise l\u2019autorisation dans les r\u00e9glages du site.';
};

Shared.isMicError = function(err) {
    if (!err) return false;
    var names = ['NotAllowedError', 'PermissionDeniedError', 'NotFoundError', 'DevicesNotFoundError', 'NotReadableError', 'TrackStartError', 'OverconstrainedError', 'SecurityError', 'AbortError'];
    if (err.name && names.indexOf(err.name) !== -1) return true;
    if (err.message === 'insecure' || err.message === 'no-media') return true;
    return false;
};

Shared.getMicErrorLabel = function(err) {
    if (!err) return 'Micro indisponible.';
    var name = err.name || '';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') return 'Permission micro refus\u00e9e.';
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return 'Aucun micro d\u00e9tect\u00e9.';
    if (name === 'NotReadableError' || name === 'TrackStartError') return 'Micro occup\u00e9 par une autre application.';
    if (name === 'OverconstrainedError') return 'Micro s\u00e9lectionn\u00e9 indisponible.';
    if (name === 'SecurityError') return 'Contexte non s\u00e9curis\u00e9 (HTTPS ou localhost requis).';
    if (err.message === 'insecure') return 'HTTPS ou localhost requis pour le micro.';
    return 'Micro indisponible (' + (name || 'erreur') + ').';
};

Shared.clearTimers = function(timers) {
    if (timers.maxTimer) { clearTimeout(timers.maxTimer); timers.maxTimer = null; }
    if (timers.tickTimer) { clearInterval(timers.tickTimer); timers.tickTimer = null; }
};

Shared.startTickTimer = function(timers, getState, els, startTime) {
    if (timers.tickTimer) clearInterval(timers.tickTimer);
    timers.tickTimer = setInterval(function() {
        if (getState() !== Shared.STATE_LISTENING) return;
        var sec = Math.floor((Date.now() - startTime) / 1000);
        var m = Math.floor(sec / 60);
        var label = (m > 0 ? m + ' min ' : '') + (sec % 60) + ' s';
        Shared.setStatus(els, '\u00c9coute en cours\u2026 ' + label, 'listening');
    }, 1000);
};

})();
