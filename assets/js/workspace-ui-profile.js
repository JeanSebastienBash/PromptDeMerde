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

function wsCharCount(n) {
    var I = window.PDM && window.PDM.I18n;
    return I ? I.t('workspace.charCount', { count: n }) : (n + ' / 50000');
}

function interpolate(template, vars) {
    var out = String(template == null ? '' : template);
    if (!vars || typeof vars !== 'object') return out;
    for (var key in vars) {
        if (!Object.prototype.hasOwnProperty.call(vars, key)) continue;
        out = out.split('{{' + key + '}}').join(String(vars[key] == null ? '' : vars[key]));
    }
    return out.replace(/\{\{\w+\}\}/g, '');
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
    var I = window.PDM && window.PDM.I18n;
    if (I && typeof I.getWorkspaceUiTexts === 'function') {
        var lt = I.getWorkspaceUiTexts();
        if (lt && lt[key] != null) fallback = lt[key];
    }
    if (!fallback && CS && CS.DEFAULT_WORKSPACE_UI && CS.DEFAULT_WORKSPACE_UI.texts) {
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

function spanWithClass(text, className, colorHex) {
    var cls = String(className || '').trim();
    var color = String(colorHex || '').trim();
    var styleAttr = color ? ' style="color:' + escapeHtml(color) + '"' : '';
    if (!cls && !styleAttr) return escapeHtml(text);
    if (!cls) return '<span' + styleAttr + '>' + escapeHtml(text) + '</span>';
    return '<span class="' + escapeHtml(cls) + '"' + styleAttr + '>' + escapeHtml(text) + '</span>';
}

var NAV_LOGO_BRAND_FALLBACK = {
    firstWord: 'Prompt',
    secondWord: 'DeMerde',
    extension: '.com',
    showExtension: true,
    firstWordClass: 'logo-word1',
    secondWordClass: 'red',
    extensionClass: 'logo-dotcom',
    firstWordColor: '',
    secondWordColor: ''
};

WU.getNavBrandParts = function() {
    var cfg = WU.get();
    var brand = (cfg && cfg.brand) || {};
    var CS = schema();
    var def = (CS && CS.DEFAULT_WORKSPACE_UI && CS.DEFAULT_WORKSPACE_UI.brand)
        ? CS.DEFAULT_WORKSPACE_UI.brand
        : NAV_LOGO_BRAND_FALLBACK;
    var I = window.PDM && window.PDM.I18n;
    var hasSessionBrand = !!(cfg && cfg.brand && (
        brand.firstWord !== undefined || brand.secondWord !== undefined
    ));

    var firstWord = brand.firstWord != null && String(brand.firstWord).trim()
        ? String(brand.firstWord)
        : def.firstWord;
    var secondWord = brand.secondWord != null && String(brand.secondWord).trim()
        ? String(brand.secondWord)
        : def.secondWord;

    if (!hasSessionBrand && I && typeof I.t === 'function') {
        firstWord = I.t('nav.brandFirst') || firstWord;
        secondWord = I.t('nav.brandSecond') || secondWord;
    }

    var extension = brand.extension != null ? String(brand.extension) : def.extension;
    if (!hasSessionBrand && I && typeof I.t === 'function') {
        extension = I.t('nav.brandExtension') || extension;
    }

    var showExtension = CS && CS.isStrictBoolean && CS.isStrictBoolean(brand.showExtension)
        ? brand.showExtension
        : (def.showExtension === true);

    return {
        firstWord: firstWord,
        secondWord: secondWord,
        extension: extension,
        showExtension: showExtension,
        firstWordClass: brand.firstWordClass != null ? String(brand.firstWordClass) : def.firstWordClass,
        secondWordClass: brand.secondWordClass != null ? String(brand.secondWordClass) : def.secondWordClass,
        extensionClass: brand.extensionClass != null ? String(brand.extensionClass) : def.extensionClass,
        firstWordColor: brand.firstWordColor != null ? String(brand.firstWordColor).trim() : '',
        secondWordColor: brand.secondWordColor != null ? String(brand.secondWordColor).trim() : ''
    };
};

WU.renderNavLogoHtml = function() {
    var b = WU.getNavBrandParts();
    var word1Class = String(b.firstWordClass || '').trim() || 'logo-word1';
    var html = spanWithClass(b.firstWord, word1Class, b.firstWordColor);
    html += spanWithClass(b.secondWord, b.secondWordClass, b.secondWordColor);
    if (b.showExtension && b.extension) {
        html += spanWithClass(b.extension, b.extensionClass, '');
    }
    return html;
};

WU.applyBrand = function() {
    var logo = document.getElementById('nav-logo-link');
    if (!logo) return;
    var I = window.PDM && window.PDM.I18n;
    var gtText = (I && typeof I.t === 'function') ? (I.t('nav.logoGt') || '>_') : '>_';
    var gtHtml = '<span class="logo-gt">' + escapeHtml(gtText) + '</span>';
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
        suffixEl.textContent = '@' + hostname + ':~# ';
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

WU.applyOutputPendingPlaceholder = function() {
    var outputTa = document.getElementById('output-text');
    var inferActive = window.PDM && window.PDM.App && typeof window.PDM.App.isInferenceActive === 'function'
        && window.PDM.App.isInferenceActive();
    if (outputTa && !outputTa.value.trim() && !inferActive) {
        setPlaceholder('output-text', WU.text('outputPendingPlaceholder'));
    }
};

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
            if (cc) cc.textContent = wsCharCount(0);
        }
    }
    setPlaceholder('ws-input', inputPh);
    setAttr('ws-input', 'aria-label', WU.text('inputAriaLabel'));

    var outputTa = document.getElementById('output-text');
    if (outputTa && !outputTa.value.trim()) {
        var inferActive = window.PDM && window.PDM.App && typeof window.PDM.App.isInferenceActive === 'function'
            && window.PDM.App.isInferenceActive();
        if (!inferActive) {
            setPlaceholder('output-text', WU.text('outputPendingPlaceholder'));
        }
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

    var resetBtns = document.querySelectorAll('.ws-reset-btn');
    for (var ri = 0; ri < resetBtns.length; ri++) {
        resetBtns[ri].textContent = WU.text('resetLabel');
        if (!resetBtns[ri].disabled) resetBtns[ri].title = WU.text('resetTitle');
    }

    var guard = document.getElementById('ws-prompt-guard');
    if (guard) {
        var CS = schema();
        var cfg = WU.get();
        var hasSessionGuard = !!(cfg && cfg.texts && cfg.texts.promptGuardHtml != null);
        var guardHtml = WU.text('promptGuardHtml');
        var U = window.PDM && window.PDM.UI;
        var untrusted = U && typeof U.isUntrustedProfileDisplay === 'function' &&
            U.isUntrustedProfileDisplay();
        if (untrusted && hasSessionGuard) {
            if (typeof U.setSafeText === 'function') U.setSafeText(guard, guardHtml);
            else guard.textContent = guardHtml == null ? '' : String(guardHtml);
        } else {
            if (CS && typeof CS.sanitizeWorkspaceHtml === 'function') {
                guardHtml = CS.sanitizeWorkspaceHtml(guardHtml);
            }
            guard.innerHTML = guardHtml;
        }
    }

    setTextContent('ws-history-empty', WU.text('historyEmpty'));

    var purgeBtn = document.getElementById('ws-history-clear');
    if (purgeBtn) purgeBtn.title = WU.text('historyPurgeTitle');

    var optionsBtn = document.getElementById('ws-llm-options-btn');
    if (optionsBtn) {
        var open = optionsBtn.classList.contains('is-open');
        optionsBtn.title = open ? WU.text('llmOptionsBtnOpen') : WU.text('llmOptionsBtn');
    }

    if (window.PDM && window.PDM.App && typeof window.PDM.App.syncLlmOptionsUi === 'function') {
        window.PDM.App.syncLlmOptionsUi();
    }

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

window.PDM = window.PDM || {};
window.PDM.WorkspaceUi = WU;

})();
