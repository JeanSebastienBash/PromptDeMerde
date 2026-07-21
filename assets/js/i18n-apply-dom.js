/**
 * PromptDeMerde.com — i18n-apply-dom.js
 *
 * Application DOM des traductions (data-i18n, IDs statiques, panneau STT).
 * Charge après i18n.js (utilise PDM.I18n et PDM._I18nPriv).
 */
(function() {

var I18n = window.PDM && window.PDM.I18n;
var P = window.PDM && window.PDM._I18nPriv;
if (!I18n || !P) {
    console.warn('[i18n-apply-dom] PDM.I18n ou _I18nPriv manquant.');
    return;
}

var IL = window.PDM && window.PDM.I18nLocales;
var KNOWN_LOCALES = IL ? IL.KNOWN_LOCALES : {};
var GLOBE_FLAG = IL ? IL.GLOBE_FLAG : 'assets/images/flags/globe.svg';

function setText(el, text) {
    if (!el || text == null) return;
    el.textContent = text;
}

function setHtml(el, html) {
    if (!el || html == null) return;
    el.innerHTML = html;
}

function applyAttrs(el, spec) {
    if (!el || !spec) return;
    spec.split(',').forEach(function(pair) {
        var idx = pair.indexOf(':');
        if (idx === -1) return;
        var attr = pair.slice(0, idx).trim();
        var key = pair.slice(idx + 1).trim();
        if (!attr || !key) return;
        var val = I18n.t(key);
        if (val === key) return;
        el.setAttribute(attr, val);
    });
}

var STATIC_ID_MAP = {
    'nav-link-landing': 'nav.home',
    'loader-msg': 'loader.message',
    'ws-input-title': null,
    'footer-projects-label': 'footer.projectsLabel',
    'footer-projects-prev': null,
    'footer-projects-next': null
};

I18n.PRIMARY_FLAG_LOCALES = ['fr', 'en', 'ar', 'zh', 'es', 'de'];

I18n.getFlagUrl = function(code) {
    if (!code) return '';
    for (var i = 0; i < I18n.LOCALE_LIST.length; i++) {
        if (I18n.LOCALE_LIST[i].code === code && I18n.LOCALE_LIST[i].flag) {
            return I18n.LOCALE_LIST[i].flag;
        }
    }
    return KNOWN_LOCALES[code] ? KNOWN_LOCALES[code].flag : GLOBE_FLAG;
};

function applyLangFlags(root) {
    root = root || document;
    var wrap = root.getElementById('settings-lang-flags');
    if (!wrap || !I18n.LOCALE_LIST.length) return;
    var current = I18n.getLocale();
    wrap.innerHTML = '';
    wrap.setAttribute('aria-label', I18n.t('settings.langTitle'));
    I18n.LOCALES.forEach(function(code) {
        var entry = I18n.getLocaleMeta(code);
        if (!entry) return;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'stg-lang-flag' + (code === current ? ' is-active' : '');
        btn.setAttribute('data-lang', code);
        btn.setAttribute('aria-label', I18n.getLocaleDisplayLabel(code));
        btn.setAttribute('aria-pressed', code === current ? 'true' : 'false');
        btn.setAttribute('title', I18n.getLocaleDisplayLabel(code));
        var img = document.createElement('img');
        img.src = entry.flag || I18n.getFlagUrl(code);
        img.alt = '';
        img.width = 64;
        img.height = 42;
        img.loading = 'lazy';
        img.decoding = 'async';
        btn.appendChild(img);
        wrap.appendChild(btn);
    });
}

I18n.applyLangFlags = applyLangFlags;

function syncLangSelectTrigger(wrap, code) {
    if (!wrap) return;
    var trigger = wrap.querySelector('.stg-lang-select-trigger');
    if (!trigger) return;
    var entry = I18n.getLocaleMeta(code);
    var flagEl = trigger.querySelector('.stg-lang-select-trigger-flag');
    var labelEl = trigger.querySelector('.stg-lang-select-trigger-label');
    if (flagEl && entry) {
        flagEl.src = entry.flag || I18n.getFlagUrl(code);
        flagEl.alt = '';
    }
    if (labelEl) labelEl.textContent = I18n.getLocaleDisplayLabel(code);
    trigger.setAttribute('aria-label', I18n.getLocaleDisplayLabel(code));
    var menu = wrap.querySelector('.stg-lang-select-menu');
    if (menu) {
        var opts = menu.querySelectorAll('.stg-lang-select-option');
        for (var i = 0; i < opts.length; i++) {
            var on = opts[i].getAttribute('data-lang') === code;
            opts[i].classList.toggle('is-selected', on);
            opts[i].setAttribute('aria-selected', on ? 'true' : 'false');
        }
    }
}

function closeLangSelectMenu(wrap) {
    if (!wrap) return;
    var trigger = wrap.querySelector('.stg-lang-select-trigger');
    var menu = wrap.querySelector('.stg-lang-select-menu');
    if (menu) menu.hidden = true;
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
    wrap.classList.remove('is-open');
}

function bindLangSelectWrap(wrap, sel) {
    if (!wrap || wrap.dataset.langSelectBound === '1') return;
    wrap.dataset.langSelectBound = '1';
    wrap.addEventListener('click', function(e) {
        var trigger = wrap.querySelector('.stg-lang-select-trigger');
        var menu = wrap.querySelector('.stg-lang-select-menu');
        if (!trigger || !menu) return;
        if (e.target === trigger || trigger.contains(e.target)) {
            var open = menu.hidden;
            closeLangSelectMenu(wrap);
            if (open) {
                menu.hidden = false;
                trigger.setAttribute('aria-expanded', 'true');
                wrap.classList.add('is-open');
            }
            return;
        }
        var opt = e.target.closest ? e.target.closest('.stg-lang-select-option') : null;
        if (!opt || !menu.contains(opt)) return;
        var code = opt.getAttribute('data-lang');
        if (!code || !sel) return;
        sel.value = code;
        syncLangSelectTrigger(wrap, code);
        closeLangSelectMenu(wrap);
        sel.dispatchEvent(new Event('change', { bubbles: true }));
    });
    document.addEventListener('click', function(e) {
        if (!wrap.contains(e.target)) closeLangSelectMenu(wrap);
    });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeLangSelectMenu(wrap);
    });
}

function applyLangSelect(root) {
    root = root || document;
    var sel = root.getElementById('settings-lang');
    var wrap = sel && sel.closest('.stg-lang-select-wrap');
    if (!sel || !wrap || !I18n.LOCALE_LIST.length) return;

    sel.classList.add('stg-lang-select-native');
    var trigger = wrap.querySelector('.stg-lang-select-trigger');
    var menu = wrap.querySelector('.stg-lang-select-menu');
    if (!trigger) {
        trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'stg-lang-select-trigger';
        trigger.setAttribute('aria-haspopup', 'listbox');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.innerHTML = '<img class="stg-lang-select-trigger-flag" alt="" width="32" height="21">' +
            '<span class="stg-lang-select-trigger-label"></span>' +
            '<span class="stg-lang-select-chevron" aria-hidden="true">&#9662;</span>';
        wrap.insertBefore(trigger, sel);
    }
    if (!menu) {
        menu = document.createElement('ul');
        menu.className = 'stg-lang-select-menu';
        menu.setAttribute('role', 'listbox');
        menu.hidden = true;
        wrap.appendChild(menu);
    }
    bindLangSelectWrap(wrap, sel);

    menu.innerHTML = '';
    I18n.LOCALES.forEach(function(code) {
        var entry = I18n.getLocaleMeta(code);
        if (!entry) return;
        var li = document.createElement('li');
        li.className = 'stg-lang-select-option';
        li.setAttribute('role', 'option');
        li.setAttribute('data-lang', code);
        li.setAttribute('tabindex', '-1');
        var img = document.createElement('img');
        img.className = 'stg-lang-select-option-flag';
        img.src = entry.flag || I18n.getFlagUrl(code);
        img.alt = '';
        img.width = 32;
        img.height = 21;
        img.loading = 'lazy';
        img.decoding = 'async';
        var span = document.createElement('span');
        span.className = 'stg-lang-select-option-label';
        span.textContent = I18n.getLocaleDisplayLabel(code);
        li.appendChild(img);
        li.appendChild(span);
        menu.appendChild(li);
    });

    var current = sel.value || I18n.getLocale();
    syncLangSelectTrigger(wrap, current);
    closeLangSelectMenu(wrap);
}

I18n.applyLangSelect = applyLangSelect;

function applySttPanelLabels(root) {
    root = root || document;

    var preloadBtn = root.getElementById('stt-preload-btn');
    if (preloadBtn) {
        var preloadTitle = I18n.t('stt.preloadLoadTitle');
        if (preloadTitle !== 'stt.preloadLoadTitle') preloadBtn.setAttribute('title', preloadTitle);
        var preloadLabel = preloadBtn.querySelector('[data-stt-preload-label]');
        var preloadBtnText = I18n.t('stt.preloadBtnLoad');
        if (preloadLabel && preloadBtnText !== 'stt.preloadBtnLoad') {
            preloadLabel.textContent = preloadBtnText;
        }
    }

    var modelBar = root.querySelector('.stt-model-status-bar');
    if (modelBar) modelBar.setAttribute('title', I18n.t('stt.engineTitle'));
    var modelBadge = root.querySelector('[data-stt-model-badge]');
    if (modelBadge) modelBadge.setAttribute('aria-label', I18n.t('stt.engineBadgeAria'));
    var modelText = root.querySelector('[data-stt-model-text]');
    if (modelText && !modelText.hidden) setText(modelText, I18n.t('stt.engineStatusPending'));

    var micBar = root.querySelector('.stt-mic-status-bar');
    if (micBar) micBar.setAttribute('title', I18n.t('stt.micTitle'));
    var micBadge = root.querySelector('[data-stt-mic-badge]');
    if (micBadge) micBadge.setAttribute('aria-label', I18n.t('stt.micBadgeAria'));
    var micText = root.querySelector('[data-stt-mic-text]');
    if (micText && !micText.hidden) setText(micText, I18n.t('stt.micChecking'));

    var engineLabel = root.querySelector('label[for="ws-stt-engine-select"]');
    if (engineLabel) setText(engineLabel, I18n.t('stt.engineLabel'));
    var engineSel = root.getElementById('ws-stt-engine-select');
    if (engineSel) {
        engineSel.setAttribute('title', I18n.t('stt.engineTitle'));
        engineSel.setAttribute('aria-label', I18n.t('stt.engineTitle'));
    }

    var voskLangLabel = root.querySelector('label[for="stt-vosk-lang-select"]');
    var engineLangLabel = I18n.t('stt.engineLangLabel');
    if (voskLangLabel && engineLangLabel !== 'stt.engineLangLabel') {
        setText(voskLangLabel, engineLangLabel);
    }
    var voskLangSel = root.getElementById('stt-vosk-lang-select');
    if (voskLangSel) {
        var engineLangTitle = I18n.t('stt.engineLangTitle');
        var engineLangAria = I18n.t('stt.engineLangAria');
        if (engineLangTitle !== 'stt.engineLangTitle') voskLangSel.setAttribute('title', engineLangTitle);
        if (engineLangAria !== 'stt.engineLangAria') voskLangSel.setAttribute('aria-label', engineLangAria);
    }
    if (voskLangSel && voskLangSel.dataset.voskBound === '1' && window.PDM.STT && window.PDM.STT.populateVoskLangSelect) {
        window.PDM.STT.populateVoskLangSelect();
    }

    var computeLabel = root.querySelector('label[for="stt-compute-select"]');
    if (computeLabel) setText(computeLabel, I18n.t('stt.computeLabel'));
    var computeSel = root.getElementById('stt-compute-select');
    if (computeSel) {
        computeSel.setAttribute('title', I18n.t('stt.computeTitle'));
        computeSel.setAttribute('aria-label', I18n.t('stt.computeLabel'));
        if (computeSel.options[0]) computeSel.options[0].textContent = I18n.t('stt.computeCpu');
        if (computeSel.options[1]) computeSel.options[1].textContent = I18n.t('stt.computeGpu');
    }

    var micLabel = root.querySelector('label[for="stt-device-select"]');
    if (micLabel) setText(micLabel, I18n.t('stt.micLabel'));
    var deviceSel = root.getElementById('stt-device-select');
    if (deviceSel) {
        deviceSel.setAttribute('title', I18n.t('stt.micTitle'));
        deviceSel.setAttribute('aria-label', I18n.t('stt.micTitle'));
        if (deviceSel.options[0]) deviceSel.options[0].textContent = I18n.t('stt.micDefault');
    }
    var refreshMic = root.getElementById('stt-refresh-devices');
    if (refreshMic) {
        refreshMic.setAttribute('title', I18n.t('stt.refreshMicTitle'));
        refreshMic.setAttribute('aria-label', I18n.t('stt.refreshMicAria'));
    }

    var insertWrap = root.getElementById('stt-insert-mode-toggle-wrap');
    if (insertWrap) insertWrap.setAttribute('title', I18n.t('stt.insertTitle'));
    var insertRow = insertWrap && insertWrap.closest('.stt-opt-row');
    if (insertRow) {
        var insertLbl = insertRow.querySelector('.stt-opt-label');
        if (insertLbl) setText(insertLbl, I18n.t('stt.insertLabel'));
    }
    var insertModeLabel = root.getElementById('stt-insert-mode-label');
    if (insertModeLabel) {
        var insertToggle = root.getElementById('stt-insert-at-cursor');
        setText(insertModeLabel, I18n.t(insertToggle && insertToggle.checked ? 'stt.insertCursor' : 'stt.insertEnd'));
    }

    var deleteWordWrap = root.getElementById('stt-delete-word-enabled-wrap');
    if (deleteWordWrap) deleteWordWrap.setAttribute('title', I18n.t('stt.deleteWordTitle'));
    var deleteRow = deleteWordWrap && deleteWordWrap.closest('.stt-opt-row');
    if (deleteRow) {
        var deleteLbl = deleteRow.querySelector('.stt-opt-label');
        if (deleteLbl) setText(deleteLbl, I18n.t('stt.deleteWordLabel'));
    }
    var deleteEnabledLabel = root.getElementById('stt-delete-word-enabled-label');
    if (deleteEnabledLabel) {
        var deleteEnabled = root.getElementById('stt-delete-word-enabled');
        setText(deleteEnabledLabel, I18n.t(deleteEnabled && deleteEnabled.checked ? 'stt.deleteWordEnabled' : 'stt.deleteWordDisabled'));
    }

    var shortcutLabel = root.querySelector('label[for="stt-delete-word-shortcut"]');
    if (shortcutLabel) setText(shortcutLabel, I18n.t('stt.shortcutLabel'));
    var shortcutSel = root.getElementById('stt-delete-word-shortcut');
    if (shortcutSel) {
        shortcutSel.setAttribute('title', I18n.t('stt.shortcutTitle'));
        shortcutSel.setAttribute('aria-label', I18n.t('stt.shortcutAria'));
        [
            ['ctrl+backspace', 'stt.shortcutCtrlBackspace'],
            ['ctrl+delete', 'stt.shortcutCtrlDelete'],
            ['alt+backspace', 'stt.shortcutAltBackspace'],
            ['ctrl+shift+backspace', 'stt.shortcutCtrlShiftBackspace']
        ].forEach(function(pair) {
            var opt = shortcutSel.querySelector('option[value="' + pair[0] + '"]');
            if (opt) opt.textContent = I18n.t(pair[1]);
        });
    }

    var targetLabel = root.querySelector('label[for="stt-delete-word-target"]');
    if (targetLabel) setText(targetLabel, I18n.t('stt.targetLabel'));
    var targetSel = root.getElementById('stt-delete-word-target');
    if (targetSel) {
        targetSel.setAttribute('title', I18n.t('stt.targetTitle'));
        targetSel.setAttribute('aria-label', I18n.t('stt.targetAria'));
        var endOpt = targetSel.querySelector('option[value="end"]');
        if (endOpt) endOpt.textContent = I18n.t('stt.targetEnd');
        var cursorOpt = targetSel.querySelector('option[value="cursor"]');
        if (cursorOpt) cursorOpt.textContent = I18n.t('stt.targetCursor');
    }

    var loadLabel = root.querySelector('[data-stt-load-label]');
    if (loadLabel) setText(loadLabel, I18n.t('stt.loadLabel'));

    var sttOpt = root.getElementById('stt-options-btn');
    if (sttOpt) {
        sttOpt.setAttribute('title', I18n.t(
            sttOpt.getAttribute('aria-expanded') === 'true' ? 'stt.optionsOpenTitle' : 'stt.optionsTitle'
        ));
    }
}

function applyStaticIds(root) {
    root = root || document;
    if (root !== document) return;
    var navLinks = root.querySelectorAll('#nav-links a[data-nav]');
    navLinks.forEach(function(a) {
        var nav = a.getAttribute('data-nav');
        if (nav === 'landing') setText(a, I18n.t('nav.home'));
        else if (nav === 'workspace') setText(a, I18n.t('nav.workspace'));
        else if (nav === 'prompts') setText(a, I18n.t('nav.prompts'));
        else if (nav === 'settings') setText(a, I18n.t('nav.settings'));
    });

    var landing = root.getElementById('nav-link-landing');
    if (landing) setText(landing, I18n.t('nav.home'));

    var burger = root.getElementById('nav-burger');
    if (burger) burger.setAttribute('aria-label', I18n.t('nav.menu'));

    var themeBtn = root.getElementById('theme-toggle');
    if (themeBtn) themeBtn.setAttribute('title', I18n.t('nav.themeTitle'));
    var themeMobile = root.getElementById('theme-toggle-mobile');
    if (themeMobile) {
        themeMobile.setAttribute('title', I18n.t('nav.themeTitle'));
        var themeSpan = themeMobile.querySelector('[data-i18n="nav.theme"]');
        if (themeSpan) {
            setText(themeSpan, I18n.t('nav.theme'));
        } else {
            setText(themeMobile, '\uD83C\uDF19 ' + I18n.t('nav.theme'));
        }
    }

    if (window.PDM && window.PDM.Env && typeof window.PDM.Env.applyOfficialNavLinks === 'function') {
        window.PDM.Env.applyOfficialNavLinks();
    } else if (window.PDM && window.PDM.Env && typeof window.PDM.Env.applyMarketplaceNavLinks === 'function') {
        window.PDM.Env.applyMarketplaceNavLinks();
        if (typeof window.PDM.Env.applyLegalNavLinks === 'function') {
            window.PDM.Env.applyLegalNavLinks();
        }
    }

    var loaderMsg = root.querySelector('.loader-msg');
    if (loaderMsg) setText(loaderMsg, I18n.t('loader.message'));

    var wsTitles = root.querySelectorAll('.ws-panel-title');
    if (wsTitles[0]) setText(wsTitles[0], I18n.t('workspace.input'));
    if (wsTitles[1]) setText(wsTitles[1], I18n.t('workspace.output'));

    var sttBtn = root.getElementById('stt-btn');
    if (sttBtn) {
        setText(sttBtn, I18n.t('stt.dictate'));
        sttBtn.setAttribute('title', I18n.t('stt.dictateTitle'));
    }
    var sttBlock = root.getElementById('stt-block');
    if (sttBlock) sttBlock.setAttribute('aria-label', I18n.t('stt.blockAria'));

    var sttOpt = root.getElementById('stt-options-btn');
    if (sttOpt) {
        setText(sttOpt, I18n.t('stt.options'));
        sttOpt.setAttribute('title', I18n.t('stt.optionsTitle'));
    }

    var sniperBtn = root.getElementById('sniperise-btn');
    if (sniperBtn) setText(sniperBtn, I18n.t('workspace.sniperise'));

    var histTitle = root.querySelector('.ws-history-summary-title');
    if (histTitle) setText(histTitle, I18n.t('workspace.historyTitle'));

    var histPurge = root.getElementById('ws-history-clear');
    if (histPurge) {
        setText(histPurge, I18n.t('workspace.historyPurge'));
        histPurge.setAttribute('title', I18n.t('workspaceUi.historyPurgeTitle'));
    }

    var histEmpty = root.getElementById('ws-history-empty');
    if (histEmpty) setText(histEmpty, I18n.t('workspace.historyEmpty'));

    var thinkingTitle = root.querySelector('.thinking-panel summary span, .thinking-panel-title');
    if (!thinkingTitle) thinkingTitle = root.querySelector('.thinking-panel summary');
    if (thinkingTitle) setText(thinkingTitle, I18n.t('workspace.thinkingTitle'));

    var modelLabel = root.querySelector('.llm-strip-label');
    if (modelLabel) setText(modelLabel, I18n.t('workspace.modelLabel'));

    var llmOptBtn = root.getElementById('ws-llm-options-btn');
    if (llmOptBtn) {
        setText(llmOptBtn, I18n.t('workspace.llmOptions'));
        llmOptBtn.setAttribute('title', I18n.t('workspace.llmOptionsTitle'));
    }

    var cancelBtn = root.getElementById('cancel-btn');
    if (cancelBtn) setText(cancelBtn, I18n.t('workspace.cancel'));

    var resetBtns = root.querySelectorAll('.ws-reset-btn');
    for (var ri = 0; ri < resetBtns.length; ri++) {
        setText(resetBtns[ri], I18n.t('workspace.reset'));
        resetBtns[ri].setAttribute('title', I18n.t('workspaceUi.resetTitle'));
    }

    var settingsLangLabel = root.querySelector('label[for="settings-lang"]');
    if (settingsLangLabel) setText(settingsLangLabel, I18n.t('settings.langAria'));

    var stgTitles = root.querySelectorAll('.stg-title');
    var stgKeys = ['settings.llmTitle', 'settings.langTitle', 'settings.profileTitle', 'settings.dangerTitle', 'settings.themeTitle'];
    stgTitles.forEach(function(el, i) {
        if (stgKeys[i]) setText(el, I18n.t(stgKeys[i]));
    });

    var langSel = root.getElementById('settings-lang');
    if (langSel && I18n.LOCALE_LIST.length) {
        var selected = langSel.value;
        langSel.innerHTML = '';
        I18n.LOCALE_LIST.forEach(function(entry) {
            var opt = document.createElement('option');
            opt.value = entry.code;
            opt.textContent = I18n.getLocaleDisplayLabel(entry.code);
            langSel.appendChild(opt);
        });
        if (selected && I18n.LOCALES.indexOf(selected) >= 0) {
            langSel.value = selected;
        }
    } else if (langSel && langSel.options.length >= 2) {
        langSel.options[0].textContent = I18n.t('settings.langFr');
        langSel.options[1].textContent = I18n.t('settings.langEn');
    }
    if (langSel && window.PDM && window.PDM.Storage && typeof window.PDM.Storage.getLanguage === 'function') {
        langSel.value = window.PDM.Storage.getLanguage();
    }
    applyLangFlags(root);
    applyLangSelect(root);

    var importBtn = root.getElementById('config-import-btn');
    if (importBtn) setText(importBtn, I18n.t('settings.import'));
    var exportBtn = root.getElementById('config-export-btn');
    if (exportBtn) setText(exportBtn, I18n.t('settings.export'));
    var clearBtn = root.getElementById('clear-btn');
    if (clearBtn) setText(clearBtn, I18n.t('settings.clearAll'));
    var createProf = root.getElementById('profile-create-btn');
    if (createProf) setText(createProf, I18n.t('settings.profileCreate'));
    var configureProf = root.getElementById('profile-configure-btn');
    if (configureProf) setText(configureProf, I18n.t('settings.profileConfigure'));

    var footerHeadings = root.querySelectorAll('.footer-menus-primary .footer-nav-heading');
    var fhKeys = ['footer.brandHeading', 'footer.resourcesHeading', 'footer.legalHeading'];
    footerHeadings.forEach(function(el, i) {
        if (fhKeys[i]) setText(el, I18n.t(fhKeys[i]));
    });

    var brandPhoto = root.querySelector('.footer-brand-photo');
    if (brandPhoto) brandPhoto.setAttribute('alt', I18n.t('footer.brandPhotoAlt'));
    var resInfoH = root.querySelector('.footer-nav-resources [data-i18n="footer.resourcesInfoHeading"]');
    if (resInfoH) setText(resInfoH, I18n.t('footer.resourcesInfoHeading'));
    var resWebH = root.querySelector('.footer-nav-resources [data-i18n="footer.resourcesWebHeading"]');
    if (resWebH) setText(resWebH, I18n.t('footer.resourcesWebHeading'));
    var ytRes = root.querySelector('.footer-nav-resources a[href*="youtube.com/@DreamprojectAI"] span[data-i18n]');
    if (ytRes) setText(ytRes, I18n.t('footer.youtubeChannel'));
    var ollamaRes = root.querySelector('.footer-nav-resources a[href="https://ollama.com"] span[data-i18n]');
    if (ollamaRes) setText(ollamaRes, I18n.t('footer.ollama'));
    var llmRes = root.querySelector('.footer-nav-resources a[href*="ollama.com/library"] span[data-i18n]');
    if (llmRes) setText(llmRes, I18n.t('footer.llm'));
    var parakeetRes = root.querySelector('.footer-nav-resources a[href*="parakeet"] span[data-i18n]');
    if (parakeetRes) setText(parakeetRes, I18n.t('footer.parakeet'));
    var voskRes = root.querySelector('.footer-nav-resources a[href*="vosk"] span[data-i18n]');
    if (voskRes) setText(voskRes, I18n.t('footer.vosk'));
    var whisperRes = root.querySelector('.footer-nav-resources a[href*="whisper"] span[data-i18n]');
    if (whisperRes) setText(whisperRes, I18n.t('footer.whisper'));

    var footerNavMap = {
        workspace: 'nav.workspace',
        prompts: 'nav.prompts',
        settings: 'nav.settings',
        support: 'footer.support',
        mentions: 'footer.mentions',
        cgu: 'footer.cgu',
        privacy: 'footer.privacy'
    };
    root.querySelectorAll('.footer-nav a[data-nav]').forEach(function(a) {
        var nav = a.getAttribute('data-nav');
        var key = footerNavMap[nav];
        if (key) {
            var label = a.querySelector('span[data-i18n]');
            if (label) setText(label, I18n.t(key));
            else setText(a, I18n.t(key));
        }
    });

    var projLabel = root.querySelector('.dp-projects-label');
    if (projLabel) setText(projLabel, I18n.t('footer.projectsLabel'));

    var prevBtn = root.getElementById('footer-projects-prev');
    if (prevBtn) prevBtn.setAttribute('aria-label', I18n.t('footer.projectPrev'));
    var nextBtn = root.getElementById('footer-projects-next');
    if (nextBtn) nextBtn.setAttribute('aria-label', I18n.t('footer.projectNext'));
    var dots = root.getElementById('footer-projects-dots');
    if (dots) dots.setAttribute('aria-label', I18n.t('footer.projectsDotsAria'));

    var sysTitle = root.querySelector('.prm-col-system .prm-title span:last-child');
    if (sysTitle) setText(sysTitle, I18n.t('prompts.systemTitle'));
    var sysToggle = root.getElementById('system-prompt-toggle-wrap');
    if (sysToggle) sysToggle.setAttribute('title', I18n.t('prompts.systemToggleTitle'));
    var sysTa = root.getElementById('prompts-system');
    if (sysTa && I18n.t('prompts.systemProfilePlaceholder')) {
        sysTa.placeholder = I18n.t('prompts.systemProfilePlaceholder');
    }
    var ctxTitle = root.querySelector('.prm-col-context > .prm-card > .prm-title span:last-child');
    if (ctxTitle) setText(ctxTitle, I18n.t('prompts.contextTitle'));
    var cfgSec = root.querySelector('.prm-context-options');
    if (cfgSec) cfgSec.setAttribute('aria-label', I18n.t('prompts.configSectionAria'));
    var cfgTitle = root.querySelector('.prm-context-options .prm-context-section-title span:last-child');
    if (cfgTitle) setText(cfgTitle, I18n.t('prompts.configSection'));
    var injectTitle = root.querySelector('.context-inject-title');
    if (injectTitle) setText(injectTitle, I18n.t('prompts.injectTitle'));
    var afterLbl = root.querySelector('#context-inject-after') &&
        root.querySelector('#context-inject-after').closest('label');
    if (afterLbl) {
        var afterSpan = afterLbl.querySelector('[data-i18n-html="prompts.injectAfter"]');
        if (afterSpan) setHtml(afterSpan, I18n.tHtml('prompts.injectAfter'));
        else afterLbl.innerHTML = I18n.tHtml('prompts.injectAfter');
    }
    var beforeLbl = root.querySelector('#context-inject-before') &&
        root.querySelector('#context-inject-before').closest('label');
    if (beforeLbl) {
        var beforeSpan = beforeLbl.querySelector('[data-i18n-html="prompts.injectBefore"]');
        if (beforeSpan) setHtml(beforeSpan, I18n.tHtml('prompts.injectBefore'));
        else beforeLbl.innerHTML = I18n.tHtml('prompts.injectBefore');
    }
    var orderHint = root.querySelector('.profile-order-hint');
    if (orderHint) {
        if (orderHint.hasAttribute('data-i18n-html')) {
            setHtml(orderHint, I18n.tHtml('prompts.orderHint'));
        } else {
            orderHint.innerHTML = I18n.tHtml('prompts.orderHint');
        }
    }
    var savedTitle = root.querySelector('.prm-context-list .prm-context-section-title span:last-child');
    if (savedTitle) setText(savedTitle, I18n.t('prompts.savedSection'));
    var savedSec = root.querySelector('.prm-context-list');
    if (savedSec) savedSec.setAttribute('aria-label', I18n.t('prompts.savedSectionAria'));
    var addBtn = root.getElementById('context-add-btn');
    if (addBtn) setText(addBtn, I18n.t('prompts.quickAddBtn'));
    var titleGenBtn = root.getElementById('context-title-gen-btn');
    if (titleGenBtn) setText(titleGenBtn, I18n.t('prompts.genTitleBtn'));
    var intentGenBtn = root.getElementById('context-generate-btn');
    if (intentGenBtn) setText(intentGenBtn, I18n.t('prompts.genIntentBtn'));

    var pageTitle = root.querySelector('.stg-page-title');
    if (pageTitle) setText(pageTitle, I18n.t('settings.pageTitle'));
    var pageDesc = root.querySelector('.stg-page-desc');
    if (pageDesc) setText(pageDesc, I18n.t('settings.pageDesc'));
    var llmDesc = root.querySelector('#llm-settings-card .stg-card-desc');
    if (llmDesc) setText(llmDesc, I18n.t('settings.llmDesc'));
    var providerLbl = root.querySelector('label[for="llm-provider-select"]');
    if (providerLbl) setText(providerLbl, I18n.t('settings.provider'));
    var endpointLbl = root.querySelector('label[for="llm-endpoint-url"]');
    if (endpointLbl) setText(endpointLbl, I18n.t('settings.endpointLabel'));
    var testBtn = root.getElementById('btn-test-llm');
    if (testBtn) setText(testBtn, I18n.t('settings.test'));
    var dangerDesc = root.querySelector('.stg-danger .danger-desc');
    if (dangerDesc) setText(dangerDesc, I18n.t('settings.dangerDesc'));
    var themePicker = root.getElementById('theme-picker');
    if (themePicker) themePicker.setAttribute('aria-label', I18n.t('settings.themePickerAria'));
    var profileSel = root.getElementById('profile-selector');
    if (profileSel) profileSel.setAttribute('aria-label', I18n.t('settings.profileAria'));
    if (createProf) {
        createProf.setAttribute('title', I18n.t('settings.profileCreateTitle'));
        createProf.setAttribute('aria-label', I18n.t('settings.profileCreateAria'));
    }
    var configureProf2 = root.getElementById('profile-configure-btn');
    if (configureProf2) {
        configureProf2.setAttribute('title', I18n.t('settings.profileConfigureTitle'));
        configureProf2.setAttribute('aria-label', I18n.t('settings.profileConfigureAria'));
    }

    var ctxTitleWs = root.querySelector('#context-panel .context-title');
    if (ctxTitleWs) setText(ctxTitleWs, I18n.t('workspace.contextTitle'));
    var compressTitleWs = root.querySelector('#ws-prompt-compress .context-title, #ws-prompt-compress .ws-compress-title');
    if (compressTitleWs) {
        var compressTitle = I18n.t('workspace.compressPanelTitle');
        // Ne jamais afficher la clé brute (ex. workspace.compressPanelTitle) à la place du libellé.
        if (!compressTitle || compressTitle === 'workspace.compressPanelTitle'
            || /PanelTitle/i.test(compressTitle) || /^workspace\./i.test(compressTitle)) {
            compressTitle = 'Compression des tokens';
        }
        setText(compressTitleWs, compressTitle);
    }
    var selAll = root.getElementById('context-select-all-btn');
    if (selAll) {
        setText(selAll, I18n.t('workspace.contextSelectAll'));
        selAll.setAttribute('title', I18n.t('workspace.contextSelectAllTitle'));
    }
    var clrAll = root.getElementById('context-clear-all-btn');
    if (clrAll) {
        setText(clrAll, I18n.t('workspace.contextClearAll'));
        clrAll.setAttribute('title', I18n.t('workspace.contextClearAllTitle'));
    }
    var ctxManage = root.querySelector('.context-toolbar-link');
    if (ctxManage) {
        setText(ctxManage, I18n.t('workspace.contextManage'));
        ctxManage.setAttribute('title', I18n.t('workspace.contextManageTitle'));
    }

    var llmBlock = root.getElementById('llm-block');
    if (llmBlock) llmBlock.setAttribute('aria-label', I18n.t('workspace.llmBlockAria'));
    var modelFieldLbl = root.querySelector('label[for="ws-output-model-select"]');
    if (modelFieldLbl) setText(modelFieldLbl, I18n.t('workspace.modelLabel'));
    var modelSel = root.getElementById('ws-output-model-select');
    if (modelSel) {
        modelSel.setAttribute('title', I18n.t('workspace.modelTitle'));
        modelSel.setAttribute('aria-label', I18n.t('workspace.modelAria'));
    }

    var thinkTitle = root.querySelector('.thinking-title');
    if (thinkTitle) setText(thinkTitle, I18n.t('workspace.thinkingTitle'));
    var thinkToggle = root.getElementById('ws-thinking-toggle');
    if (thinkToggle) thinkToggle.setAttribute('title', I18n.t('workspace.thinkingToggleTitle'));
    var thinkMaxLbl = root.querySelector('label[for="ws-thinking-max-chars"]');
    if (thinkMaxLbl) setText(thinkMaxLbl, I18n.t('workspace.thinkingMaxLabel'));
    var thinkMaxInp = root.getElementById('ws-thinking-max-chars');
    if (thinkMaxInp) thinkMaxInp.setAttribute('title', I18n.t('workspace.thinkingMaxTitle'));
    var thinkMaxHint = root.getElementById('ws-thinking-max-hint');
    if (thinkMaxHint) setText(thinkMaxHint, I18n.t('workspace.thinkingMaxHint'));

    root.querySelectorAll('.llm-opt-row[data-llm-opt="thinking"] .llm-opt-label').forEach(function(el) {
        setText(el, I18n.t('workspace.thinkingLabel'));
    });
    root.querySelectorAll('.llm-opt-row[data-llm-opt="temperature"] .llm-opt-label').forEach(function(el) {
        setText(el, I18n.t('workspace.temperature'));
    });
    root.querySelectorAll('.llm-opt-row[data-llm-opt="maxTokens"] .llm-opt-label').forEach(function(el) {
        setText(el, I18n.t('workspace.maxTokens'));
    });
    root.querySelectorAll('.llm-opt-row[data-llm-opt="timeout"] .llm-opt-label').forEach(function(el) {
        setText(el, I18n.t('workspace.timeout'));
    });
    var tempSlider = root.getElementById('ws-llm-temperature-slider');
    if (tempSlider) tempSlider.setAttribute('aria-label', I18n.t('workspace.temperatureAria'));
    var tokSlider = root.getElementById('ws-llm-max-tokens-slider');
    if (tokSlider) tokSlider.setAttribute('aria-label', I18n.t('workspace.maxTokensAria'));
    var timeoutSlider = root.getElementById('ws-llm-timeout-slider');
    if (timeoutSlider) timeoutSlider.setAttribute('aria-label', I18n.t('workspace.timeoutAria'));

    var audioBtn = root.getElementById('ws-audio-file-btn');
    if (audioBtn) {
        audioBtn.setAttribute('title', I18n.t('workspaceUi.audioImportTitle'));
        audioBtn.setAttribute('aria-label', I18n.t('workspaceUi.audioImportAriaLabel'));
    }
    var imageBtn = root.getElementById('ws-image-file-btn');
    if (imageBtn) {
        imageBtn.setAttribute('title', I18n.t('workspaceUi.imageImportTitle'));
        imageBtn.setAttribute('aria-label', I18n.t('workspaceUi.imageImportAriaLabel'));
    }
    var inputClear = root.getElementById('ws-input-clear');
    if (inputClear) {
        inputClear.setAttribute('title', I18n.t('workspaceUi.audioClearTitle'));
        inputClear.setAttribute('aria-label', I18n.t('workspaceUi.audioClearTitle'));
    }

    var genCfgSummary = root.querySelector('.context-gen-config-summary');
    if (genCfgSummary) setText(genCfgSummary, I18n.t('prompts.genConfigSummary'));
    var genCfgDesc = root.querySelector('.context-gen-config-desc');
    if (genCfgDesc) {
        if (genCfgDesc.hasAttribute('data-i18n-html')) {
            setHtml(genCfgDesc, I18n.tHtml('prompts.genConfigDesc'));
        } else {
            setText(genCfgDesc, I18n.t('prompts.genConfigDesc'));
        }
    }
    var quickAddSummary = root.querySelector('.context-quick-add-summary');
    if (quickAddSummary) setText(quickAddSummary, I18n.t('prompts.quickAddSummary'));
    var quickAddTagLbl = root.querySelector('label[for="context-new-tag"]');
    if (quickAddTagLbl) setText(quickAddTagLbl, I18n.t('prompts.quickAddTag'));
    var quickAddPromptLbl = root.querySelector('label[for="context-new-prompt"]');
    if (quickAddPromptLbl) setText(quickAddPromptLbl, I18n.t('prompts.quickAddPrompt'));
    var quickTag = root.getElementById('context-new-tag');
    if (quickTag) quickTag.placeholder = I18n.t('prompts.quickAddTagPlaceholder');
    var quickPrompt = root.getElementById('context-new-prompt');
    if (quickPrompt) quickPrompt.placeholder = I18n.t('prompts.quickAddPromptPlaceholder');
    var genSummaries = root.querySelectorAll('.context-generate-summary');
    if (genSummaries[0]) setText(genSummaries[0], I18n.t('prompts.genTitleSummary'));
    if (genSummaries[1]) setText(genSummaries[1], I18n.t('prompts.genIntentSummary'));
    var genTitleLbl = root.querySelector('label[for="context-title-input"]');
    if (genTitleLbl) setText(genTitleLbl, I18n.t('prompts.genTitleLabel'));
    var genTitleInp = root.getElementById('context-title-input');
    if (genTitleInp) genTitleInp.placeholder = I18n.t('prompts.genTitlePlaceholder');
    var genIntentInp = root.getElementById('context-generate-intent');
    if (genIntentInp) genIntentInp.placeholder = I18n.t('prompts.genIntentPlaceholder');

    applySttPanelLabels(root);

    if (window.PDM && window.PDM.WorkspaceUi) {
        if (typeof window.PDM.WorkspaceUi.apply === 'function') {
            window.PDM.WorkspaceUi.apply();
        } else {
            if (typeof window.PDM.WorkspaceUi.applyBrand === 'function') {
                window.PDM.WorkspaceUi.applyBrand();
            }
            if (typeof window.PDM.WorkspaceUi.applyIdentity === 'function') {
                window.PDM.WorkspaceUi.applyIdentity();
            }
            if (typeof window.PDM.WorkspaceUi.applyWorkspaceTexts === 'function') {
                window.PDM.WorkspaceUi.applyWorkspaceTexts();
            }
        }
    }
}

function resolveHtmlKey(key) {
    var html = I18n.t(key);
    if (typeof html !== 'string' || html === key || html.indexOf('<') === -1) {
        html = '';
    }
    if (key.indexOf('pages.') !== 0) {
        return html;
    }
    var frHtml = P.getFrDict() ? P.getNested(P.getFrDict(), key) : null;
    var enHtml = P.getEnDict() ? P.getNested(P.getEnDict(), key) : null;
    if (P.getLocale() === 'fr' && typeof frHtml === 'string') {
        return frHtml;
    }
    if (P.getLocale() === 'en' && typeof enHtml === 'string') {
        return enHtml;
    }
    if (typeof html === 'string' && html.length >= 8000) {
        return html;
    }
    if (typeof enHtml === 'string' && enHtml.length) {
        return enHtml;
    }
    if (typeof frHtml === 'string' && frHtml.length) {
        return frHtml;
    }
    return html;
}

I18n.apply = function(root) {
    root = root || document;

    root.querySelectorAll('[data-i18n]').forEach(function(el) {
        var key = el.getAttribute('data-i18n');
        var val = I18n.t(key);
        if (val === key) return;
        if (el.getAttribute('data-i18n-html') === '1' || el.hasAttribute('data-i18n-allow-html')) {
            el.innerHTML = val;
        } else {
            el.textContent = val;
        }
    });

    root.querySelectorAll('[data-i18n-html]').forEach(function(el) {
        if (el.hasAttribute('data-i18n')) return;
        var key = el.getAttribute('data-i18n-html');
        var html = resolveHtmlKey(key);
        if (html) setHtml(el, html);
    });

    root.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
        el.placeholder = I18n.t(el.getAttribute('data-i18n-placeholder'));
    });

    root.querySelectorAll('[data-i18n-attr]').forEach(function(el) {
        applyAttrs(el, el.getAttribute('data-i18n-attr'));
    });

    applyStaticIds(root);

    if (window.PDM && window.PDM.Providers && window.PDM.Providers.applyMarketingCopy) {
        window.PDM.Providers.applyMarketingCopy(root);
    }
    if (window.PDM && window.PDM.Docs && typeof window.PDM.Docs.syncFooterLink === 'function') {
        window.PDM.Docs.syncFooterLink();
    }
};

})();
