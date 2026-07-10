/**
 * PromptDeMerde.com — workspace-ui-profile.js
 *
 * Synopsis : Personnalisation UI Workspace depuis pdm_workspace_ui.
 * Objectif : Résoudre identité, marque et textes par profil ; appliquer au DOM.
 */
(function() {
'use strict';

var WU = {};

function schema() {
    return window.PDM && window.PDM.ConfigSchema;
}

function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function interpolate(template, vars) {
    var out = String(template == null ? '' : template);
    if (!vars || typeof vars !== 'object') return out;
    for (var key in vars) {
        if (!Object.prototype.hasOwnProperty.call(vars, key)) continue;
        out = out.split('{{' + key + '}}').join(String(vars[key]));
    }
    return out;
}

WU.get = function() {
    if (window.PDM && window.PDM.Storage && typeof window.PDM.Storage.getWorkspaceUiEffective === 'function') {
        return window.PDM.Storage.getWorkspaceUiEffective();
    }
    var CS = schema();
    if (CS && typeof CS.normalizeWorkspaceUi === 'function') {
        return CS.normalizeWorkspaceUi(null);
    }
    return { identity: {}, brand: {}, texts: {} };
};

WU.text = function(key, vars) {
    var cfg = WU.get();
    var texts = cfg.texts || {};
    var CS = schema();
    var fallback = '';
    if (CS && CS.DEFAULT_WORKSPACE_UI && CS.DEFAULT_WORKSPACE_UI.texts) {
        fallback = CS.DEFAULT_WORKSPACE_UI.texts[key] || '';
    }
    return interpolate(texts[key] != null ? texts[key] : fallback, vars);
};

WU.submitLabel = function() {
    return WU.text('submitLabel');
};

WU.submitLabelRunning = function() {
    return WU.text('submitLabelRunning');
};

function spanWithClass(text, className) {
    var cls = String(className || '').trim();
    if (!cls) return escapeHtml(text);
    return '<span class="' + escapeHtml(cls) + '">' + escapeHtml(text) + '</span>';
}

/** Logo nav plateforme — fixe, indépendant du profil et de pdm_workspace_ui.brand. */
var NAV_LOGO_BRAND = {
    firstWord: 'Prompt',
    secondWord: 'DeMerde',
    extension: '.com',
    firstWordClass: '',
    secondWordClass: 'red',
    extensionClass: 'logo-dotcom'
};

WU.renderNavLogoHtml = function() {
    var b = NAV_LOGO_BRAND;
    var html = spanWithClass(b.firstWord, b.firstWordClass);
    html += spanWithClass(b.secondWord, b.secondWordClass);
    html += spanWithClass(b.extension, b.extensionClass);
    return html;
};

WU.applyBrand = function() {
    var logo = document.getElementById('nav-logo-link');
    if (!logo) return;
    var gt = logo.querySelector('.logo-gt');
    var gtHtml = gt ? gt.outerHTML : '<span class="logo-gt">&gt;_</span> ';
    logo.innerHTML = gtHtml + ' ' + WU.renderNavLogoHtml();
};

WU.applyIdentity = function() {
    var identity = WU.get().identity || {};
    var username = identity.username || 'chnek';
    var hostname = identity.hostname || 'promptdemerde';
    var usernameAlt = identity.usernameAlt || 'sniper';

    var usernameEl = document.querySelector('.prompt-username-inverted');
    if (usernameEl) {
        usernameEl.setAttribute('data-from', username);
        usernameEl.setAttribute('data-to', usernameAlt);
        var textEl = usernameEl.querySelector('.prompt-username-text');
        if (textEl) textEl.textContent = username;
    }

    var suffixEl = document.querySelector('.prompt-suffix');
    if (suffixEl) {
        var cursor = suffixEl.querySelector('.cursor');
        var cursorHtml = cursor ? cursor.outerHTML : '<span class="cursor">&#9608;</span>';
        suffixEl.innerHTML = '@' + escapeHtml(hostname) + ':~# ' + cursorHtml;
    }

    if (window.PDM && window.PDM.AnimationInversion && typeof window.PDM.AnimationInversion.refreshIdentity === 'function') {
        window.PDM.AnimationInversion.refreshIdentity(username, usernameAlt);
    }
};

function setTextContent(id, value) {
    var el = document.getElementById(id);
    if (el && value != null) el.textContent = value;
}

function setPlaceholder(id, value) {
    var el = document.getElementById(id);
    if (el && value != null) el.setAttribute('placeholder', value);
}

function setAttr(id, attr, value) {
    var el = document.getElementById(id);
    if (el && value != null) el.setAttribute(attr, value);
}

WU.applyPlaceholders = function() {
    var inputPh = WU.text('inputPlaceholder');
    var inp = document.getElementById('ws-input');
    if (inp && inputPh) {
        var inpVal = inp.value.trim();
        var phVal = inputPh.trim();
        var phBody = phVal.replace(/^Ex\s*:\s*/i, '').trim();
        if (inpVal === phVal || (phBody && inpVal === phBody)) {
            inp.value = '';
            var cc = document.getElementById('char-count');
            if (cc) cc.textContent = '0 / 50000';
        }
    }
    setPlaceholder('ws-input', inputPh);
    setAttr('ws-input', 'aria-label', WU.text('inputAriaLabel'));

    var outputTa = document.getElementById('output-text');
    if (outputTa && !outputTa.value.trim()) {
        setPlaceholder('output-text', WU.text('outputPlaceholder'));
    }

    var thinkingTa = document.getElementById('thinking-text');
    if (thinkingTa && !thinkingTa.value.trim()) {
        setPlaceholder('thinking-text', WU.text('thinkingPlaceholder'));
    }
};

WU.applyWorkspaceTexts = function() {
    WU.applyPlaceholders();

    var submitBtn = document.getElementById('sniperise-btn');
    if (submitBtn && !submitBtn.disabled) {
        submitBtn.textContent = WU.submitLabel();
    }

    var cancelBtn = document.getElementById('cancel-btn');
    if (cancelBtn) cancelBtn.textContent = WU.text('cancelLabel');

    var resetBtn = document.getElementById('ws-reset-btn');
    if (resetBtn) {
        resetBtn.textContent = WU.text('resetLabel');
        if (!resetBtn.disabled) resetBtn.title = WU.text('resetTitle');
    }

    var guard = document.getElementById('ws-prompt-guard');
    if (guard) guard.innerHTML = WU.text('promptGuardHtml');

    setTextContent('ws-history-empty', WU.text('historyEmpty'));

    var purgeBtn = document.getElementById('ws-history-clear');
    if (purgeBtn) purgeBtn.title = WU.text('historyPurgeTitle');

    if (window.PDM && window.PDM.App) {
        window.PDM.App.SNIPERISE_BTN_LABEL = WU.submitLabel();
    }

    if (window.PDM && window.PDM.App && typeof window.PDM.App.rememberWorkspaceInputPlaceholder === 'function') {
        window.PDM.App.rememberWorkspaceInputPlaceholder(true);
    }
};

WU.apply = function() {
    WU.applyBrand();
    WU.applyIdentity();
    WU.applyWorkspaceTexts();
};

function getAssembleEndpoint() {
    if (window.PDM.Env && window.PDM.Env.getServerPath) {
        return window.PDM.Env.getServerPath('profileAssemble') || 'lib/api/assemble.php';
    }
    return 'lib/api/assemble.php';
}

function readJsonResponse(res) {
    return res.text().then(function(text) {
        var payload = null;
        if (text) {
            try { payload = JSON.parse(text); } catch (e) { payload = null; }
        }
        if (!res.ok) {
            throw new Error((payload && payload.error) ? payload.error : 'HTTP ' + res.status);
        }
        return payload;
    });
}

/**
 * Aligne la session sur le bundle profil actif (assemble.php) sans effacer workspace ni historique.
 * Corrige les sessions désynchronisées (ex. UI AdsGenerator + prompt système PromptDeMerde par défaut).
 */
WU.syncFromActiveProfile = function() {
    if (!window.PDM || !window.PDM.Storage || !window.PDM.Env ||
        typeof window.PDM.Env.hasProfileSelector !== 'function' ||
        !window.PDM.Env.hasProfileSelector()) {
        return Promise.resolve(false);
    }

    var activeId = window.PDM.Storage.getActiveProfile();
    if (!activeId) return Promise.resolve(false);

    if (window.PDM.Storage.isCustomProfileId(activeId)) {
        var cp = window.PDM.Storage.getCustomProfile(activeId);
        if (!cp || !cp.config) return Promise.resolve(false);
        var customConfig = cp.config;
        var cfp = window.PDM.Storage.computeProfileBundleFingerprint(customConfig);
        var storedFp = window.PDM.Storage.getProfileBundleFingerprint();
        var storedPrompt = window.PDM.Storage.getSystemPrompt();
        var needsCustomSync = storedFp !== cfp;
        if (!needsCustomSync && customConfig.pdm_system_prompt) {
            needsCustomSync = !String(storedPrompt || '').trim() ||
                String(storedPrompt) !== String(customConfig.pdm_system_prompt);
        }
        if (!needsCustomSync) return Promise.resolve(false);
        window.PDM.Storage.applyProfileBundle(customConfig);
        return Promise.resolve(true);
    }

    var url = getAssembleEndpoint() +
        (getAssembleEndpoint().indexOf('?') === -1 ? '?' : '&') +
        'id=' + encodeURIComponent(activeId);

    return fetch(url, { cache: 'no-store' })
        .then(readJsonResponse)
        .then(function(payload) {
            if (!payload || !payload.ok || !payload.config) {
                return false;
            }
            var config = payload.config;
            var fp = window.PDM.Storage.computeProfileBundleFingerprint(config);
            var storedFp = window.PDM.Storage.getProfileBundleFingerprint();
            var storedPrompt = window.PDM.Storage.getSystemPrompt();
            var needsSync = storedFp !== fp;
            if (!needsSync && config.pdm_system_prompt) {
                needsSync = !String(storedPrompt || '').trim() ||
                    String(storedPrompt) !== String(config.pdm_system_prompt);
            }
            if (!needsSync) {
                return false;
            }
            if (typeof window.PDM.Storage.applyProfileBundle !== 'function') {
                return false;
            }
            window.PDM.Storage.applyProfileBundle(config);
            return true;
        })
        .catch(function(err) {
            console.warn('[PDM.WorkspaceUi] syncFromActiveProfile', err && err.message ? err.message : err);
            return false;
        });
};

WU.boot = function() {
    return WU.syncFromActiveProfile().then(function() {
        WU.apply();
        return true;
    });
};

window.PDM = window.PDM || {};
window.PDM.WorkspaceUi = WU;

})();
