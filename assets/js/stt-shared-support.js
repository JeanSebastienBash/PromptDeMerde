/**
 * PromptDeMerde.com — stt-shared-support.js
 *
 * Synopsis : Compatibilité navigateur et bypass LAN.
 * Objectif : Détection Chromium/Firefox, panneaux LAN et getUserMedia.
 */
(function() {
var Shared = window.PDM && window.PDM.STT && window.PDM.STT.Shared;
if (!Shared) { console.warn('[stt-shared-support] PDM.STT.Shared not found.'); return; }

Shared.getAudioContextCtor = function() {
    return window.AudioContext || window.webkitAudioContext || null;
};

Shared.isSupported = function() {
    return !!(Shared.getAudioContextCtor() && window.WebAssembly);
};

Shared.canCaptureMic = function() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
};

Shared.isSecureContext = function() {
    return typeof window.isSecureContext === 'boolean' ? window.isSecureContext : true;
};

Shared.needsLanBypass = function() {
    if (!Shared.isSupported()) return false;
    if (!Shared.isSecureContext()) return true;
    return !Shared.canCaptureMic();
};

Shared.getPageOrigin = function() {
    try { return window.location.origin; } catch (e) { return ''; }
};

Shared.getLocalhostHref = function() {
    try {
        var u = new URL(window.location.href);
        if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return '';
        u.hostname = 'localhost';
        return u.href;
    } catch (e) { return ''; }
};

Shared.isFirefox = function() {
    return /Firefox\//.test(navigator.userAgent || '');
};

Shared.isChromium = function() {
    if (Shared.isFirefox()) return false;
    return /Chrome|Chromium|Edg\//.test(navigator.userAgent || '');
};

Shared.getLanHelpText = function() {
    if (Shared.isChromium()) {
        return 'Chromium bloque le micro en HTTP sur une IP : le cadenas ne sert \u00e0 rien ici. Utilise localhost, HTTPS, ou le flag Chrome ci-dessous.';
    }
    if (Shared.isFirefox()) {
        return 'Firefox : passe media.devices.insecure.enabled ET media.getusermedia.insecure.enabled \u00e0 true dans about:config, puis recharge.';
    }
    return 'Micro bloqu\u00e9 en HTTP : passe en localhost, HTTPS, ou suis les instructions du panneau ci-dessous.';
};

Shared.getChromeLanFlag = function() {
    var origin = Shared.getPageOrigin();
    return origin ? '--unsafely-treat-insecure-origin-as-secure=' + origin : '--unsafely-treat-insecure-origin-as-secure=http://ton-ip/';
};

Shared._stripHints = { custom: '', customKind: 'error', compute: '', lan: false };

Shared.refreshStripHint = function() {
    var hint = document.getElementById('stt-strip-hint');
    if (!hint) return;
    var textEl = hint.querySelector('.stt-strip-hint-text');
    var msg = '';
    var kind = 'muted';
    if (Shared._stripHints.custom) {
        msg = Shared._stripHints.custom;
        kind = Shared._stripHints.customKind || 'error';
    } else if (Shared._stripHints.lan) {
        msg = Shared.isChromium()
            ? 'Micro bloqu\u00e9 en HTTP \u2014 essaie localhost ou HTTPS'
            : 'Micro bloqu\u00e9 en HTTP \u2014 essaie localhost ou HTTPS';
        kind = 'error';
    } else if (Shared._stripHints.compute) {
        msg = Shared._stripHints.compute;
        kind = 'muted';
    }
    hint.classList.remove('stt-strip-hint--error', 'stt-strip-hint--warn');
    if (kind === 'error') hint.classList.add('stt-strip-hint--error');
    else if (kind === 'warn') hint.classList.add('stt-strip-hint--warn');
    if (textEl) textEl.textContent = msg;
    hint.hidden = !msg;
};

Shared.setStripComputeHint = function(text) {
    Shared._stripHints.compute = text || '';
    var legacy = document.getElementById('stt-compute-hint');
    if (legacy) {
        legacy.textContent = text || '';
        legacy.hidden = !text;
    }
    Shared.refreshStripHint();
};

Shared.showStripHint = function(msg, kind) {
    Shared._stripHints.custom = msg || '';
    Shared._stripHints.customKind = kind || 'error';
    Shared.refreshStripHint();
};

Shared.clearStripHint = function() {
    Shared._stripHints.custom = '';
    Shared._stripHints.customKind = 'error';
    Shared.refreshStripHint();
};

Shared.isWorkspaceView = function() {
    try {
        return (window.location.hash || '#workspace').replace('#', '') === 'workspace';
    } catch (e) {
        return true;
    }
};

Shared.notifyStt = function(msg, type) {
    if (!msg) return;
    type = type || 'info';
    if (Shared.isWorkspaceView() && (type === 'err' || type === 'error' || type === 'warn' || type === 'info')) {
        var kind = (type === 'err' || type === 'error') ? 'error' : (type === 'warn' ? 'warn' : 'muted');
        if (type === 'info' && kind === 'muted') kind = 'warn';
        Shared.showStripHint(msg, kind);
        if (type === 'err' || type === 'error' || type === 'warn') return;
    }
    if (window.PDM && window.PDM.UI && window.PDM.UI.notif) {
        window.PDM.UI.notif(msg, type);
    }
};

Shared.updateLanPanel = function(els, show) {
    if (!els.lanPanel) return;
    els.lanPanel.style.display = show ? 'block' : 'none';
    if (!show) return;
    var origin = Shared.getPageOrigin() || 'http://ton-ip/';
    var originEl = document.getElementById('stt-lan-origin');
    if (originEl) originEl.textContent = origin;
    var flagEl = document.getElementById('stt-lan-chrome-flag');
    if (flagEl) flagEl.textContent = Shared.getChromeLanFlag();
    var chromiumNote = document.getElementById('stt-lan-chromium-note');
    if (chromiumNote) chromiumNote.style.display = Shared.isChromium() ? 'block' : 'none';
    var chromeDetails = document.getElementById('stt-lan-chrome-details');
    var firefoxDetails = document.getElementById('stt-lan-firefox-details');
    if (chromeDetails && firefoxDetails) {
        chromeDetails.open = Shared.isChromium();
        firefoxDetails.open = Shared.isFirefox();
    }
    var localhostHref = Shared.getLocalhostHref();
    var localhostRow = document.getElementById('stt-lan-localhost-row');
    var localhostLink = document.getElementById('stt-lan-localhost-link');
    if (localhostRow && localhostLink) {
        if (localhostHref) {
            localhostRow.style.display = 'block';
            localhostLink.href = localhostHref;
            localhostLink.textContent = localhostHref;
        } else {
            localhostRow.style.display = 'none';
        }
    }
    Shared.updateWorkspaceLanHint(show);
};

Shared.updateWorkspaceLanHint = function(show) {
    var legacy = document.getElementById('stt-ws-lan-hint');
    if (legacy) legacy.hidden = true;
    Shared._stripHints.lan = !!show;
    var localhostHref = Shared.getLocalhostHref();
    var row = document.getElementById('stt-ws-localhost-row');
    var link = document.getElementById('stt-ws-localhost-link');
    if (row && link && localhostHref) {
        row.hidden = !show;
        link.href = localhostHref;
        link.textContent = localhostHref;
    } else if (row) {
        row.hidden = true;
    }
    Shared.refreshStripHint();
};

Shared.getUserMediaCompat = function(constraints) {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        return navigator.mediaDevices.getUserMedia(constraints);
    }
    var legacy = navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.getUserMedia;
    if (!legacy) return Promise.reject(new Error('no-media'));
    return new Promise(function(resolve, reject) {
        legacy.call(navigator, constraints, resolve, reject);
    });
};

})();
