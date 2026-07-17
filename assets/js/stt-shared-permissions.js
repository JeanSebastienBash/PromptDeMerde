/**
 * PromptDeMerde.com — stt-shared-permissions.js
 *
 * Synopsis : Permissions micro et erreurs.
 * Objectif : Panneaux denied et labels d'erreur getUserMedia.
 */
(function() {
var Shared = window.PDM && window.PDM.STT && window.PDM.STT.Shared;
if (!Shared) { console.warn('[stt-shared-permissions] PDM.STT.Shared not found.'); return; }

function T(key, vars) { return Shared.sttT(key, vars); }

Shared.updateDeniedPanel = function(els, show) {
    if (!els.deniedPanel) return;
    els.deniedPanel.style.display = show ? 'block' : 'none';
};

/* Ancien bouton « Autoriser le micro » retiré : le rafraîchissement des micros
 * déclenche déjà getUserMedia. Conservé en no-op pour les appelants existants. */
Shared.updatePermButton = function() {};

Shared.clearStoredMicDevice = function(els) {
    window.PDM.Storage.setSttDeviceId('');
    if (els.deviceSelect) els.deviceSelect.value = '';
};

Shared.isPermissionDeniedError = function(err) {
    if (!err) return false;
    if (err._pdmPermDenied) return true;
    return err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
};

Shared.isMicError = function(err) {
    if (!err) return false;
    var names = ['NotAllowedError', 'PermissionDeniedError', 'NotFoundError', 'DevicesNotFoundError', 'NotReadableError', 'TrackStartError', 'OverconstrainedError', 'SecurityError', 'AbortError'];
    if (err.name && names.indexOf(err.name) !== -1) return true;
    if (err.message === 'insecure' || err.message === 'no-media') return true;
    return false;
};

Shared.deniedHint = function() {
    if (Shared.needsLanBypass()) {
        return T('micHttpBlocked');
    }
    return T('permDeniedReset');
};

Shared.getMicErrorLabel = function(err) {
    if (!err) return '';
    var name = err.name || '';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') return T('permDeniedShort');
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return T('micNoneFound');
    if (name === 'NotReadableError' || name === 'TrackStartError') return T('micInUse');
    if (name === 'SecurityError') return T('micInsecure');
    if (err.message === 'insecure') return T('micHttpsRequired');
    var names = ['NotAllowedError', 'PermissionDeniedError', 'NotFoundError', 'DevicesNotFoundError', 'NotReadableError', 'TrackStartError', 'OverconstrainedError', 'SecurityError', 'AbortError'];
    for (var i = 0; i < names.length; i++) {
        if (name === names[i]) return T('permDeniedShort');
    }
    return err.message || String(err);
};

})();
