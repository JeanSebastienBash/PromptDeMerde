/**
 * PromptDeMerde.com — stt-shared-progress.js
 *
 * Synopsis : Progression chargement et barres statut.
 * Objectif : Trackers, XHR progress, barres modèle/mic et setBusy.
 */
(function() {
var Shared = window.PDM && window.PDM.STT && window.PDM.STT.Shared;
if (!Shared) { console.warn('[stt-shared-progress] PDM.STT.Shared not found.'); return; }

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
    var line = state.line || '\u2014';
    if (badge) {
        if (state.phase === 'loading' && state.percent != null && state.percent >= 0) {
            badge.textContent = Math.round(state.percent) + ' %';
        } else {
            badge.textContent = state.badge || '\u2014';
        }
        badge.className = 'stt-model-badge stt-model-badge-' + (state.phase || 'pending');
        badge.title = line;
        badge.setAttribute('aria-label', line);
    }
    if (text) text.textContent = line;
    root.title = line;
    root.setAttribute('aria-label', line);
};

Shared.updateMicStatusBar = function(root, mic) {
    if (!root || !mic) return;
    var badge = root.querySelector('[data-stt-mic-badge]');
    var text = root.querySelector('[data-stt-mic-text]');
    var line = mic.line || '\u2014';
    if (badge) {
        badge.textContent = mic.badge || '\u2014';
        badge.className = 'stt-mic-badge stt-mic-badge-' + (mic.phase || 'unknown');
        badge.title = line;
        badge.setAttribute('aria-label', line);
    }
    if (text) text.textContent = line;
    root.title = line;
    root.setAttribute('aria-label', line);
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

})();
