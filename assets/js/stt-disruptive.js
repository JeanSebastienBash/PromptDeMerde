/**
 * PromptDeMerde.com — stt-disruptive.js
 * Synopsis : Garde dictée avant actions disruptives (reload, stop forcé).
 * Objectif : Modale oui/non sans couper le micro ; triple bip puis stop si confirmé ;
 *            offre de reprise après reload.
 */
(function() {
var STT = window.PDM && window.PDM.STT;
if (!STT) { console.warn('[stt-disruptive] PDM.STT not found.'); return; }
var S = STT.Shared;

STT.RESUME_OFFER_KEY = 'pdm_stt_resume_offer';

function T(key, vars) {
    if (S && S.sttT) return S.sttT(key, vars);
    var I = window.PDM && window.PDM.I18n;
    return I ? I.t('stt.' + key, vars) : key;
}

STT._disruptivePending = null;
STT._resumeOfferArmed = false;

STT.markResumeOfferPending = function() {
    try {
        sessionStorage.setItem(STT.RESUME_OFFER_KEY, '1');
        STT._resumeOfferArmed = true;
    } catch (e) {}
};

STT.consumeResumeOfferPending = function() {
    var on = false;
    try {
        on = sessionStorage.getItem(STT.RESUME_OFFER_KEY) === '1';
        sessionStorage.removeItem(STT.RESUME_OFFER_KEY);
    } catch (e) {}
    STT._resumeOfferArmed = false;
    return on;
};

STT._ensureDisruptiveModal = function() {
    var modal = document.getElementById('stt-disruptive-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'stt-disruptive-modal';
    modal.className = 'stt-disruptive-modal';
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'stt-disruptive-title');
    modal.innerHTML =
        '<div class="stt-disruptive-backdrop" data-stt-disruptive-cancel="1"></div>' +
        '<div class="stt-disruptive-shell" role="document">' +
            '<h2 id="stt-disruptive-title" class="stt-disruptive-title"></h2>' +
            '<p class="stt-disruptive-body"></p>' +
            '<div class="stt-disruptive-actions">' +
                '<button type="button" class="btn secondary stt-disruptive-no" data-stt-disruptive-cancel="1"></button>' +
                '<button type="button" class="btn stt-disruptive-yes" data-stt-disruptive-confirm="1"></button>' +
            '</div>' +
        '</div>';
    document.body.appendChild(modal);
    modal.addEventListener('click', function(e) {
        var t = e.target;
        if (!t || !t.getAttribute) return;
        if (t.getAttribute('data-stt-disruptive-cancel') === '1') {
            STT._finishDisruptive(false);
        } else if (t.getAttribute('data-stt-disruptive-confirm') === '1') {
            STT._finishDisruptive(true);
        }
    });
    return modal;
};

STT._closeDisruptiveModal = function() {
    var modal = document.getElementById('stt-disruptive-modal');
    if (!modal) return;
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('stt-disruptive-modal-open');
};

STT._finishDisruptive = function(confirmed) {
    var pending = STT._disruptivePending;
    STT._disruptivePending = null;
    STT._closeDisruptiveModal();
    if (!pending) return;
    if (!confirmed) {
        pending.resolve(false);
        return;
    }

    function afterWarn() {
        if (STT.isActive && STT.isActive()) {
            STT.stop({ silent: true });
            if (STT.clearEngageMsg) STT.clearEngageMsg();
            if (STT.updateDictationButton) STT.updateDictationButton();
            if (STT.refresh) STT.refresh();
            else if (STT.renderUi) STT.renderUi();
        }
        STT.markResumeOfferPending();
        if (window.PDM && window.PDM.UI && window.PDM.UI.notif) {
            window.PDM.UI.notif(T('disruptiveStoppedNotif'), 'info');
        }
        pending.resolve(true);
    }

    if (S && typeof S.waitDictationWarnBeep === 'function') {
        S.waitDictationWarnBeep().then(afterWarn).catch(afterWarn);
        return;
    }
    if (S && S.playDictationWarnBeep) S.playDictationWarnBeep();
    else if (S && S.playDictationBeep) S.playDictationBeep('warn');
    setTimeout(afterWarn, (S && S.DICTATION_WARN_BEEP_MS) || 1500);
};

STT.confirmDisruptiveAction = function(opts) {
    opts = opts || {};
    return new Promise(function(resolve) {
        if (!STT.isActive || !STT.isActive()) {
            resolve(true);
            return;
        }
        if (STT._disruptivePending) {
            resolve(false);
            return;
        }
        var modal = STT._ensureDisruptiveModal();
        var titleEl = modal.querySelector('.stt-disruptive-title');
        var bodyEl = modal.querySelector('.stt-disruptive-body');
        var yesEl = modal.querySelector('.stt-disruptive-yes');
        var noEl = modal.querySelector('.stt-disruptive-no');
        if (titleEl) titleEl.textContent = opts.title || T('disruptiveTitle');
        if (bodyEl) bodyEl.textContent = opts.message || T('disruptiveBody');
        if (yesEl) yesEl.textContent = opts.confirmLabel || T('disruptiveConfirm');
        if (noEl) noEl.textContent = opts.cancelLabel || T('disruptiveCancel');
        modal.setAttribute('aria-label', titleEl ? titleEl.textContent : T('disruptiveTitle'));
        STT._disruptivePending = { resolve: resolve };
        modal.classList.add('show');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('stt-disruptive-modal-open');
        if (yesEl && typeof yesEl.focus === 'function') {
            try { yesEl.focus(); } catch (e) {}
        }
    });
};

STT.safeReload = function(delayMs) {
    return STT.confirmDisruptiveAction({ reason: 'reload' }).then(function(ok) {
        if (!ok) return false;
        STT.markResumeOfferPending();
        var go = function() {
            STT.markResumeOfferPending();
            window.location.reload();
        };
        if (delayMs && delayMs > 0) setTimeout(go, delayMs);
        else go();
        return true;
    });
};

STT.warnAndStop = function(opts) {
    opts = opts || {};
    if (!STT.isActive || !STT.isActive()) return false;
    if (S && S.playDictationWarnBeep) S.playDictationWarnBeep();
    else if (S && S.playDictationBeep) S.playDictationBeep('warn');
    STT.stop({ silent: true });
    if (STT.updateDictationButton) STT.updateDictationButton();
    if (STT.clearEngageMsg) STT.clearEngageMsg();
    if (STT.refresh) STT.refresh();
    else if (STT.renderUi) STT.renderUi();
    if (STT.clearEngageMsg) STT.clearEngageMsg();
    if (opts.notify !== false && window.PDM && window.PDM.UI && window.PDM.UI.notif) {
        var msg = opts.notifyMessage || T('disruptiveStoppedNotif');
        if (msg) window.PDM.UI.notif(msg, opts.notifyType || 'info');
    }
    return true;
};

STT._ensureResumeOfferModal = function() {
    var modal = document.getElementById('stt-resume-offer-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'stt-resume-offer-modal';
    modal.className = 'stt-disruptive-modal stt-resume-offer-modal';
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'stt-resume-offer-title');
    modal.innerHTML =
        '<div class="stt-disruptive-backdrop" data-stt-resume-dismiss="1"></div>' +
        '<div class="stt-disruptive-shell" role="document">' +
            '<h2 id="stt-resume-offer-title" class="stt-disruptive-title"></h2>' +
            '<p class="stt-disruptive-body"></p>' +
            '<div class="stt-disruptive-actions">' +
                '<button type="button" class="btn secondary stt-resume-offer-no" data-stt-resume-dismiss="1"></button>' +
                '<button type="button" class="btn stt-resume-offer-yes" data-stt-resume-start="1"></button>' +
            '</div>' +
        '</div>';
    document.body.appendChild(modal);
    modal.addEventListener('click', function(e) {
        var t = e.target;
        if (!t || !t.getAttribute) return;
        if (t.getAttribute('data-stt-resume-dismiss') === '1') {
            STT._closeResumeOfferModal();
        } else if (t.getAttribute('data-stt-resume-start') === '1') {
            STT._acceptResumeOffer();
        }
    });
    return modal;
};

STT._closeResumeOfferModal = function() {
    var modal = document.getElementById('stt-resume-offer-modal');
    if (!modal) return;
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('stt-disruptive-modal-open');
};

STT._goWorkspaceThen = function(fn) {
    var hash = '';
    try {
        hash = String(window.location.hash || '').replace(/^#/, '').trim();
    } catch (e) {}
    if (hash === 'workspace') {
        fn();
        return;
    }
    window.location.hash = 'workspace';
    var done = false;
    var run = function() {
        if (done) return;
        done = true;
        window.removeEventListener('hashchange', onHash);
        fn();
    };
    var onHash = function() { setTimeout(run, 0); };
    window.addEventListener('hashchange', onHash);
    setTimeout(run, 200);
};

STT._acceptResumeOffer = function() {
    STT._closeResumeOfferModal();
    STT._goWorkspaceThen(function() {
        if (STT.isActive && STT.isActive()) return;
        if (typeof STT.toggle === 'function') STT.toggle();
    });
};

STT.maybeOfferResumeAfterReload = function() {
    if (!STT.consumeResumeOfferPending()) return;
    if (STT.isActive && STT.isActive()) return;
    var modal = STT._ensureResumeOfferModal();
    var titleEl = modal.querySelector('.stt-disruptive-title');
    var bodyEl = modal.querySelector('.stt-disruptive-body');
    var yesEl = modal.querySelector('[data-stt-resume-start="1"]');
    var noEl = modal.querySelector('.stt-resume-offer-no');
    if (titleEl) titleEl.textContent = T('resumeOfferTitle');
    if (bodyEl) bodyEl.textContent = T('resumeOfferBody');
    if (yesEl) yesEl.textContent = T('resumeOfferResume');
    if (noEl) noEl.textContent = T('resumeOfferDismiss');
    modal.setAttribute('aria-label', titleEl ? titleEl.textContent : T('resumeOfferTitle'));
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('stt-disruptive-modal-open');
    if (yesEl && typeof yesEl.focus === 'function') {
        try { yesEl.focus(); } catch (e) {}
    }
};

document.addEventListener('keydown', function(e) {
    if (e.key !== 'Escape') return;
    if (STT._disruptivePending) {
        e.preventDefault();
        STT._finishDisruptive(false);
        return;
    }
    var resume = document.getElementById('stt-resume-offer-modal');
    if (resume && resume.classList.contains('show')) {
        e.preventDefault();
        STT._closeResumeOfferModal();
    }
});

window.addEventListener('beforeunload', function() {
    if (STT._resumeOfferArmed) STT.markResumeOfferPending();
});
})();
