/**
 * PromptDeMerde.com — Utilitaires partagés dictée vocale (micro, états, barre de progression).
 */
(function() {
var Shared = {};

Shared.MAX_CHARS = 50000;
Shared.BTN_START = '\uD83C\uDFA4 DICT\u00c9E VOCALE';
Shared.BTN_STOP = '\u23F9 ARR\u00caTER LA DICT\u00c9E';
Shared.BTN_CANCEL_LOAD = '\u23F9 ANNULER LE CHARGEMENT';

Shared.STATE_UNSUPPORTED = 'unsupported';
Shared.STATE_IDLE = 'idle';
Shared.STATE_LOADING = 'loading';
Shared.STATE_PERMISSION = 'permission';
Shared.STATE_LISTENING = 'listening';
Shared.STATE_ERROR = 'error';

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
    var hint = document.getElementById('stt-ws-lan-hint');
    if (!hint) return;
    hint.hidden = !show;
    if (!show) return;
    var localhostHref = Shared.getLocalhostHref();
    var row = document.getElementById('stt-ws-localhost-row');
    var link = document.getElementById('stt-ws-localhost-link');
    if (row && link && localhostHref) {
        row.hidden = false;
        link.href = localhostHref;
        link.textContent = localhostHref;
    } else if (row) {
        row.hidden = true;
    }
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

Shared.joinText = function(a, b) {
    var left = (a || '').replace(/\s+$/, '');
    var right = (b || '').replace(/^\s+/, '').replace(/\s+$/, '');
    if (!right) return left;
    if (!left) return right;
    return left + ' ' + right;
};

Shared.createTextSession = function(els, onSave) {
    var session = {
        committedBase: '',
        finalizedSession: '',
        currentInterim: ''
    };

    session.buildDisplayText = function() {
        var full = Shared.joinText(session.committedBase, session.finalizedSession);
        full = Shared.joinText(full, session.currentInterim);
        if (full.length > Shared.MAX_CHARS) full = full.slice(0, Shared.MAX_CHARS);
        return full;
    };

    session.apply = function() {
        if (!els.input) return 0;
        var text = session.buildDisplayText();
        els.input.value = text;
        if (els.charCount) els.charCount.textContent = text.length + ' / ' + Shared.MAX_CHARS;
        els.input.scrollTop = els.input.scrollHeight;
        return text.length;
    };

    session.triggerSave = function() {
        if (onSave) onSave();
    };

    session.reset = function() {
        session.committedBase = els.input ? els.input.value : '';
        session.finalizedSession = '';
        session.currentInterim = '';
    };

    session.finalizeInterim = function() {
        if (session.currentInterim) {
            session.finalizedSession = Shared.joinText(session.finalizedSession, session.currentInterim.trim());
            session.currentInterim = '';
        }
    };

    session.setInterim = function(text) {
        session.currentInterim = text || '';
        session.apply();
    };

    session.setFinalized = function(text) {
        session.finalizedSession = Shared.joinText(session.finalizedSession, (text || '').trim());
        session.currentInterim = '';
        session.apply();
        session.triggerSave();
    };

    return session;
};

Shared.setState = function(els, next) {
    if (!els.block) return;
    els.block.classList.remove('stt-listening', 'stt-permission', 'stt-error', 'stt-loading');
    if (next === Shared.STATE_LISTENING) els.block.classList.add('stt-listening');
    else if (next === Shared.STATE_PERMISSION) els.block.classList.add('stt-permission');
    else if (next === Shared.STATE_LOADING) els.block.classList.add('stt-loading');
    else if (next === Shared.STATE_ERROR) els.block.classList.add('stt-error');
};

Shared.setStatus = function(els, text, kind) {
    if (!els.status) {
        var micTexts = document.querySelectorAll('[data-stt-mic-text]');
        for (var i = 0; i < micTexts.length; i++) {
            if (text) micTexts[i].textContent = text;
        }
        var micBadges = document.querySelectorAll('[data-stt-mic-badge]');
        for (var j = 0; j < micBadges.length; j++) {
            micBadges[j].className = 'stt-mic-badge stt-mic-badge-' + (
                kind === 'listening' ? 'listening' : kind === 'error' ? 'denied' : 'ok'
            );
            if (kind === 'listening') micBadges[j].textContent = 'Actif';
        }
        return;
    }
    els.status.textContent = text || '';
    els.status.classList.remove('stt-status-listening', 'stt-status-error', 'stt-status-ok');
    if (kind === 'listening') els.status.classList.add('stt-status-listening');
    else if (kind === 'error') els.status.classList.add('stt-status-error');
    else if (kind === 'ok') els.status.classList.add('stt-status-ok');
};

Shared.updateButton = function(els, active, mode) {
    if (!els.btn) return;
    if (active && mode === 'loading') {
        els.btn.textContent = Shared.BTN_CANCEL_LOAD;
    } else {
        els.btn.textContent = active ? Shared.BTN_STOP : Shared.BTN_START;
    }
    els.btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    els.btn.classList.toggle('stt-btn-loading', !!(active && mode === 'loading'));
};

Shared.formatBytes = function(n) {
    if (!n || n < 0) return '0 o';
    if (n < 1024) return n + ' o';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' Ko';
    return (n / 1048576).toFixed(1) + ' Mo';
};

/** Progression lissée pendant les phases ONNX opaques (compilation GPU, warmup, etc.). */
Shared.computeCrawlPercent = function(base, elapsedSec) {
    var b = base != null ? base : 70;
    if (elapsedSec < 60) return Math.min(88, b + Math.floor(elapsedSec / 2));
    if (elapsedSec < 180) return Math.min(96, 88 + Math.floor((elapsedSec - 60) / 5));
    return Math.min(99, 96 + Math.floor((elapsedSec - 180) / 15));
};

Shared.makeIndeterminateController = function(onTick) {
    var timer = null;
    var start = 0;
    var base = 70;
    var label = '';
    var opts = {};

    function clear() {
        if (timer) { clearInterval(timer); timer = null; }
    }

    function tick() {
        var sec = Math.floor((Date.now() - start) / 1000);
        var pseudo = Shared.computeCrawlPercent(base, sec);
        var detail = (opts.hint || 'Compilation / initialisation ONNX') + ' \u2014 ' + sec + ' s';
        if (opts.backend) detail += ' (' + String(opts.backend).toUpperCase() + ')';
        onTick({ label: label, percent: pseudo, detail: detail });
    }

    return {
        clear: clear,
        start: function(phaseLabel, basePercent, phaseOpts) {
            clear();
            label = phaseLabel || '';
            base = basePercent != null ? basePercent : 70;
            opts = phaseOpts || {};
            start = Date.now();
            tick();
            timer = setInterval(tick, 1000);
        }
    };
};

Shared.fetchWithProgress = function(url, onProgress) {
    return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        xhr.responseType = 'blob';
        xhr.onprogress = function(ev) {
            if (onProgress) {
                onProgress({
                    loaded: ev.loaded || 0,
                    total: ev.lengthComputable ? ev.total : 0,
                    lengthComputable: ev.lengthComputable
                });
            }
        };
        xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.response);
            else reject(new Error('http-' + xhr.status));
        };
        xhr.onerror = function() { reject(new Error('network')); };
        xhr.onabort = function() { reject(new Error('cancelled')); };
        xhr.send();
    });
};

Shared.showLoadPanel = function(els, show) {
    if (els.loadPanel) els.loadPanel.hidden = !show;
    if (els.block) els.block.classList.toggle('stt-block-load-active', !!show);
};

Shared.setLoadProgress = function(els, opts) {
    opts = opts || {};
    var pct = opts.percent;
    var indeterminate = pct == null || pct < 0;
    if (opts.visible !== false) Shared.showLoadPanel(els, true);

    var label = opts.label || 'Chargement du mod\u00e8le\u2026';
    if (!indeterminate) label += ' \u2014 ' + Math.round(pct) + ' %';
    if (els.loadLabel) els.loadLabel.textContent = label;

    if (els.loadBar) {
        els.loadBar.classList.toggle('stt-load-bar-indeterminate', indeterminate);
        if (!indeterminate) {
            var clamped = Math.max(0, Math.min(100, Math.round(pct)));
            els.loadBar.setAttribute('aria-valuenow', String(clamped));
            if (els.loadFill) els.loadFill.style.width = clamped + '%';
        } else if (els.loadFill) {
            els.loadFill.style.width = '';
        }
    }

    var detail = opts.detail || '';
    if (!detail && opts.loaded != null) {
        detail = Shared.formatBytes(opts.loaded);
        if (opts.total > 0) detail += ' / ' + Shared.formatBytes(opts.total);
        if (!indeterminate) detail += ' (' + Math.round(pct) + ' %)';
    }
    if (els.loadDetail) els.loadDetail.textContent = detail;

    var statusShort = label;
    if (!indeterminate && pct != null) statusShort += ' \u2014 ' + Math.round(pct) + ' %';
    else if (detail) statusShort += ' \u2014 ' + detail;
    if (els.status) Shared.setStatus(els, statusShort, 'listening');

    if (window.PDM && window.PDM.STT && window.PDM.STT.reportLoadProgress && opts.syncReport !== false) {
        window.PDM.STT.reportLoadProgress({
            label: opts.label || 'Chargement du mod\u00e8le\u2026',
            percent: indeterminate ? null : pct,
            detail: detail
        });
    }
};

Shared.hideLoadProgress = function(els) {
    Shared.showLoadPanel(els, false);
    if (els.loadBar) {
        els.loadBar.classList.remove('stt-load-bar-indeterminate');
        els.loadBar.setAttribute('aria-valuenow', '0');
    }
    if (els.loadFill) els.loadFill.style.width = '0%';
    if (els.loadLabel) els.loadLabel.textContent = '';
    if (els.loadDetail) els.loadDetail.textContent = '';
    if (els.btn) els.btn.classList.remove('stt-btn-loading');
};

Shared.createSilentLoadTracker = function() {
    return Shared.createBackgroundLoadTracker('', null);
};

Shared.createBackgroundLoadTracker = function(engineLabel, onProgress) {
    var indet = Shared.makeIndeterminateController(function(payload) {
        emit({
            phaseLabel: payload.label,
            percent: payload.percent,
            detail: payload.detail
        });
    });

    function emit(opts) {
        if (!onProgress) return;
        opts = opts || {};
        var label = opts.label || opts.phaseLabel || '';
        if (engineLabel && label && label.indexOf(engineLabel) !== 0) {
            label = engineLabel + ' \u2014 ' + label;
        } else if (engineLabel && !label) {
            label = engineLabel;
        }
        onProgress({
            label: label,
            percent: opts.percent,
            detail: opts.detail,
            loaded: opts.loaded,
            total: opts.total
        });
    }
    return {
        show: function() {
            emit({ phaseLabel: 'Pr\u00e9paration', percent: 0, detail: '' });
        },
        hide: function() {
            indet.clear();
        },
        phase: function(label, percent, detail) {
            indet.clear();
            emit({ phaseLabel: label, percent: percent, detail: detail });
        },
        fileProgress: function(fileLabel, loaded, total, percent) {
            indet.clear();
            var detail = Shared.formatBytes(loaded);
            if (total > 0) detail += ' / ' + Shared.formatBytes(total);
            emit({ phaseLabel: fileLabel, percent: percent, loaded: loaded, total: total, detail: detail });
        },
        startIndeterminate: function(label, basePercent, phaseOpts) {
            var lbl = label || 'Initialisation';
            if (engineLabel && lbl.indexOf(engineLabel) !== 0) lbl = engineLabel + ' \u2014 ' + lbl;
            indet.start(lbl, basePercent, phaseOpts);
        },
        fetchWeighted: function(files, fetchOpts) {
            fetchOpts = fetchOpts || {};
            var maxPct = fetchOpts.maxPercent != null ? fetchOpts.maxPercent : 100;
            var totalWeight = 0;
            for (var i = 0; i < files.length; i++) totalWeight += files[i].weight;
            var doneWeight = 0;
            var chain = Promise.resolve();
            var blobs = [];
            files.forEach(function(file) {
                chain = chain.then(function() {
                    return Shared.fetchWithProgress(file.url, function(p) {
                        var frac = p.total > 0 ? p.loaded / p.total : 0;
                        var overall = ((doneWeight + frac * file.weight) / totalWeight) * maxPct;
                        emit({
                            phaseLabel: file.label,
                            percent: Math.round(overall),
                            loaded: p.loaded,
                            total: p.total,
                            detail: Shared.formatBytes(p.loaded) + (p.total > 0 ? ' / ' + Shared.formatBytes(p.total) : '')
                        });
                    }).then(function(blob) {
                        doneWeight += file.weight;
                        blobs.push(blob);
                        return blob;
                    });
                });
            });
            return chain.then(function() { return blobs; });
        }
    };
};

Shared.updateModelStatusBar = function(root, state) {
    if (!root || !state) return;
    var badge = root.querySelector('[data-stt-model-badge]');
    var text = root.querySelector('[data-stt-model-text]');
    if (badge) {
        if (state.phase === 'loading' && state.percent != null && state.percent >= 0) {
            badge.textContent = Math.round(state.percent) + ' %';
        } else {
            badge.textContent = state.badge || '\u2014';
        }
        badge.className = 'stt-model-badge stt-model-badge-' + (state.phase || 'pending');
    }
    if (text) text.textContent = state.line || '\u2014';
};

Shared.updateMicStatusBar = function(root, mic) {
    if (!root || !mic) return;
    var badge = root.querySelector('[data-stt-mic-badge]');
    var text = root.querySelector('[data-stt-mic-text]');
    if (badge) {
        badge.textContent = mic.badge || '\u2014';
        badge.className = 'stt-mic-badge stt-mic-badge-' + (mic.phase || 'unknown');
    }
    if (text) text.textContent = mic.line || '\u2014';
};

Shared.applyLoadProgressToPanel = function(panel, opts) {
    if (!panel) return;
    var pseudo = {
        loadPanel: panel,
        loadLabel: panel.querySelector('[data-stt-load-label]'),
        loadBar: panel.querySelector('[data-stt-load-bar]'),
        loadFill: panel.querySelector('[data-stt-load-fill]'),
        loadDetail: panel.querySelector('[data-stt-load-detail]')
    };
    if (opts && opts.visible !== false) {
        var panelOpts = opts;
        if (opts.syncReport === undefined) panelOpts = Object.assign({}, opts, { syncReport: false });
        Shared.setLoadProgress(pseudo, panelOpts);
    } else {
        Shared.showLoadPanel(pseudo, false);
    }
};

Shared.createLoadTracker = function(els, engineLabel) {
    var indet = Shared.makeIndeterminateController(function(payload) {
        Shared.setLoadProgress(els, {
            label: payload.label,
            percent: payload.percent,
            detail: payload.detail
        });
    });

    return {
        show: function() {
            Shared.showLoadPanel(els, true);
            Shared.updateButton(els, true, 'loading');
        },
        hide: function() {
            indet.clear();
            Shared.hideLoadProgress(els);
        },
        phase: function(label, percent, detail) {
            indet.clear();
            Shared.setLoadProgress(els, {
                label: engineLabel + ' \u2014 ' + label,
                percent: percent,
                detail: detail
            });
        },
        fileProgress: function(fileLabel, loaded, total, percent) {
            indet.clear();
            var pct = percent;
            if (pct == null && total > 0) pct = Math.round(loaded / total * 100);
            Shared.setLoadProgress(els, {
                label: engineLabel + ' \u2014 ' + fileLabel,
                percent: pct,
                loaded: loaded,
                total: total
            });
        },
        startIndeterminate: function(label, basePercent, phaseOpts) {
            var lbl = engineLabel + ' \u2014 ' + (label || 'Initialisation');
            indet.start(lbl, basePercent, phaseOpts);
        },
        fetchWeighted: function(files, fetchOpts) {
            fetchOpts = fetchOpts || {};
            var maxPct = fetchOpts.maxPercent != null ? fetchOpts.maxPercent : 100;
            var totalWeight = 0;
            for (var i = 0; i < files.length; i++) totalWeight += files[i].weight;
            var doneWeight = 0;
            var chain = Promise.resolve();
            var blobs = [];
            files.forEach(function(file) {
                chain = chain.then(function() {
                    return Shared.fetchWithProgress(file.url, function(p) {
                        var frac = p.total > 0 ? p.loaded / p.total : 0;
                        var overall = ((doneWeight + frac * file.weight) / totalWeight) * maxPct;
                        Shared.setLoadProgress(els, {
                            label: engineLabel + ' \u2014 ' + file.label,
                            percent: Math.round(overall),
                            loaded: p.loaded,
                            total: p.total
                        });
                    }).then(function(blob) {
                        doneWeight += file.weight;
                        blobs.push(blob);
                        return blob;
                    });
                });
            });
            return chain.then(function() { return blobs; });
        }
    };
};

Shared.setBusy = function(els, busy, isActive) {
    if (els.deviceSelect) els.deviceSelect.disabled = busy || isActive;
    if (els.engineSelect) els.engineSelect.disabled = busy || isActive;
    var refresh = document.getElementById('stt-refresh-devices');
    if (refresh) refresh.disabled = busy;
    if (els.input) {
        els.input.readOnly = busy;
        els.input.classList.toggle('stt-streaming', busy);
    }
    var clearBtn = document.getElementById('ws-input-clear');
    if (clearBtn) clearBtn.disabled = busy || isActive;
};

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
    if (!show) { els.permBtn.style.display = 'none'; return; }
    els.permBtn.style.display = 'inline-block';
    els.permBtn.textContent = denied ? '\uD83D\uDD13 R\u00c9AUTORISER LE MICRO' : '\uD83D\uDD13 AUTORISER LE MICRO';
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
        return 'Micro bloqu\u00e9 en HTTP : ouvre Options \u2192 Dict\u00e9e vocale et suis le panneau r\u00e9seau local.';
    }
    return 'Permission micro bloqu\u00e9e pour ce site : ouvre Options \u2192 Dict\u00e9e vocale et suis les instructions de r\u00e9initialisation.';
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
        if (src && /stt-shared\.js/.test(src)) {
            return src.replace(/stt-shared\.js(?:\?.*)?$/, 'stt-audio-processor.js');
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

/**
 * Pipeline micro partagé : AudioWorklet si disponible, sinon createScriptProcessor.
 * opts.onProcess(ev) reçoit { inputBuffer } comme ScriptProcessor.
 */
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

Shared.hasWebGPU = function() {
    return !!(navigator.gpu && navigator.gpu.requestAdapter);
};

/** Seuils VRAM pour le choix CPU/GPU (prod : MIN 4 Go, CHOICE 6 Go). */
Shared.GPU_VRAM_MIN_GB = 4;
Shared.GPU_VRAM_CHOICE_GB = 6;

Shared._gpuCaps = null;
Shared._gpuCapsPromise = null;

Shared.getGpuCaps = function() {
    return Shared._gpuCaps || {
        webgpuAvailable: false,
        vramGb: 0,
        canUserChooseGpu: false,
        adapterIsFallback: true,
        label: 'CPU uniquement'
    };
};

function estimateAdapterVramGb(adapter) {
    if (!adapter || adapter.isFallbackAdapter) return Promise.resolve(0);
    var limits = adapter.limits || {};
    var maxBuf = limits.maxBufferSize || 0;
    if (maxBuf > 0 && maxBuf < 512 * 1024 * 1024) {
        return Promise.resolve(Math.max(0.25, maxBuf / (1024 * 1024 * 1024)));
    }
    var storageUsage = (typeof GPUBufferUsage !== 'undefined' && GPUBufferUsage.STORAGE) ? GPUBufferUsage.STORAGE : 0x80;
    return adapter.requestDevice().then(function(device) {
        var ladderGb = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 24];
        var maxOk = 0;
        var chain = Promise.resolve();
        ladderGb.forEach(function(gb) {
            chain = chain.then(function() {
                var bytes = gb * 1024 * 1024 * 1024;
                if (maxBuf > 0 && bytes > maxBuf) return;
                try {
                    var buf = device.createBuffer({ size: bytes, usage: storageUsage });
                    buf.destroy();
                    maxOk = gb;
                } catch (e) { /* capacité atteinte */ }
            });
        });
        return chain.then(function() {
            try { device.destroy(); } catch (e2) { /* ignore */ }
            if (maxOk > 0) return maxOk;
            if (maxBuf > 0) return maxBuf / (1024 * 1024 * 1024);
            return 0;
        });
    }).catch(function() {
        if (maxBuf > 0) return maxBuf / (1024 * 1024 * 1024);
        return 0;
    });
}

Shared.probeGpuCapabilities = function() {
    if (Shared._gpuCapsPromise) return Shared._gpuCapsPromise;
    var base = {
        webgpuAvailable: false,
        vramGb: 0,
        canUserChooseGpu: false,
        adapterIsFallback: true,
        label: 'CPU uniquement'
    };
    if (!Shared.hasWebGPU()) {
        base.label = 'Pas de WebGPU — CPU uniquement';
        Shared._gpuCaps = base;
        Shared._gpuCapsPromise = Promise.resolve(base);
        return Shared._gpuCapsPromise;
    }
    Shared._gpuCapsPromise = Promise.resolve().then(function() {
        return navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    }).then(function(adapter) {
        if (!adapter) {
            base.label = 'Pas de WebGPU — CPU uniquement';
            Shared._gpuCaps = base;
            return base;
        }
        base.webgpuAvailable = true;
        base.adapterIsFallback = !!adapter.isFallbackAdapter;
        if (adapter.isFallbackAdapter) {
            base.label = 'GPU logiciel — mode CPU uniquement';
            Shared._gpuCaps = base;
            return base;
        }
        return estimateAdapterVramGb(adapter).then(function(gb) {
            base.vramGb = Math.round(gb * 10) / 10;
            if (gb < Shared.GPU_VRAM_CHOICE_GB) {
                base.canUserChooseGpu = false;
                base.label = 'GPU insuffisant (~' + base.vramGb + ' Go, minimum ' + Shared.GPU_VRAM_CHOICE_GB + ' Go) — CPU uniquement';
            } else {
                base.canUserChooseGpu = true;
                base.label = 'GPU ~' + base.vramGb + ' Go — CPU ou GPU au choix';
            }
            Shared._gpuCaps = base;
            return base;
        });
    }).catch(function() {
        Shared._gpuCaps = base;
        return base;
    });
    return Shared._gpuCapsPromise;
};

Shared.wantsGpuCompute = function() {
    if (!Shared.getGpuCaps().canUserChooseGpu) return false;
    try {
        return window.PDM && window.PDM.Storage && window.PDM.Storage.getSttCompute() === 'gpu';
    } catch (e) {
        return false;
    }
};

Shared._detectOnnxBackendAuto = function() {
    if (!Shared.hasWebGPU()) return Promise.resolve('wasm');
    var p;
    try { p = navigator.gpu.requestAdapter({ powerPreference: 'high-performance' }); } catch (e) { return Promise.resolve('wasm'); }
    return Promise.resolve(p).then(function(adapter) {
        return (adapter && !adapter.isFallbackAdapter) ? 'webgpu' : 'wasm';
    }).catch(function() { return 'wasm'; });
};

Shared.detectOnnxBackend = function() {
    if (!Shared.wantsGpuCompute()) return Promise.resolve('wasm');
    return Shared._detectOnnxBackendAuto();
};

/** Backend Parakeet : webgpu-hybrid configure les executionProviders ONNX (webgpu seul ne le fait pas). */
Shared.detectParakeetBackend = function() {
    if (!Shared.wantsGpuCompute()) return Promise.resolve('wasm');
    if (!Shared.hasWebGPU()) return Promise.resolve('wasm');
    var p;
    try { p = navigator.gpu.requestAdapter({ powerPreference: 'high-performance' }); } catch (e) { return Promise.resolve('wasm'); }
    return Promise.resolve(p).then(function(adapter) {
        return (adapter && !adapter.isFallbackAdapter) ? 'webgpu-hybrid' : 'wasm';
    }).catch(function() { return 'wasm'; });
};

Shared.getComputeBackendLabel = function(backend) {
    if (!backend || backend === 'wasm') return 'CPU';
    if (backend.indexOf('webgpu') === 0) return 'GPU';
    return String(backend).toUpperCase();
};

/** Libellé affiché une fois le modèle chargé (barres statut Workspace / Options). */
Shared.formatBackendLoadedLabel = function(backend) {
    if (!backend || backend === 'wasm') return 'CPU (WASM)';
    if (backend === 'webgpu') return 'GPU (WebGPU)';
    if (backend === 'webgpu-hybrid') return 'GPU hybride (WebGPU + WASM)';
    return Shared.getComputeBackendLabel(backend);
};

/** Libellé pendant le chargement (cible attendue). */
Shared.formatBackendLoadingLabel = function(engineId, wantsGpu) {
    if (engineId && engineId.indexOf('vosk') === 0) return 'CPU (WASM)';
    return wantsGpu ? 'GPU (WebGPU)' : 'CPU (WASM)';
};

/** Erreurs WebGPU ONNX (VRAM insuffisante, pipelines invalides, etc.). */
Shared.isWebGpuBrokenError = function(err) {
    var msg = '';
    if (typeof err === 'string') msg = err;
    else if (err && err.message) msg = err.message;
    else if (err) msg = String(err);
    return /webgpu|validation error|Invalid ComputePipeline|Invalid BindGroupLayout|Invalid CommandBuffer|device was lost|Device lost|Out of memory|OOM/i.test(msg);
};

Shared.markWhisperGpuBroken = function() {
    try { sessionStorage.setItem('pdm_whisper_gpu_broken', '1'); } catch (e) { /* ignore */ }
};

Shared.isWhisperGpuBroken = function() {
    try { return sessionStorage.getItem('pdm_whisper_gpu_broken') === '1'; } catch (e) { return false; }
};

Shared.isSttDebugEnabled = function() {
    try {
        if (localStorage.getItem('pdm_stt_debug') === '1') return true;
        return /(?:\?|&)pdm_debug_stt=1(?:&|$)/.test(String(location.search || ''));
    } catch (e) {
        return false;
    }
};

Shared.promiseTimeout = function(promise, ms, errCode) {
    return new Promise(function(resolve, reject) {
        var timer = setTimeout(function() {
            var err = new Error(errCode || 'timeout');
            err.code = 'timeout';
            reject(err);
        }, ms);
        Promise.resolve(promise).then(function(v) {
            clearTimeout(timer);
            resolve(v);
        }).catch(function(e) {
            clearTimeout(timer);
            reject(e);
        });
    });
};

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

window.PDM = window.PDM || {};
window.PDM.STT = window.PDM.STT || {};
window.PDM.STT.Shared = Shared;

// Registre persistant des moteurs : créé ici (1er script chargé) pour que
// stt-vosk.js / stt-parakeet.js puissent s'enregistrer même avant stt.js.
window.PDM.STT._engines = window.PDM.STT._engines || {};
window.PDM.STT.registerEngine = window.PDM.STT.registerEngine || function(engine) {
    if (!engine || !engine.id) return;
    window.PDM.STT._engines[engine.id] = engine;
};
})();
