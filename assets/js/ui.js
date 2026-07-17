/**
 * PromptDeMerde.com — ui.js
 *
 * Synopsis : Helpers DOM, notifications, modales et widgets communs.
 * Objectif : Centraliser show/hide sections, toasts, escape HTML et composants réutilisables.
 */
(function(){

var U = {};

function jsT(key, vars) {
    var I = window.PDM && window.PDM.I18n;
    return I ? I.t('js.' + key, vars) : '';
}

function wsT(key, vars) {
    var I = window.PDM && window.PDM.I18n;
    return I ? I.t('workspace.' + key, vars) : '';
}

U.escapeHtml = function(s) {
    if (s == null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

U.debounce = function(fn, ms) {
    var timer = null;
    return function() {
        var self = this;
        var args = arguments;
        clearTimeout(timer);
        timer = setTimeout(function() {
            timer = null;
            fn.apply(self, args);
        }, ms);
    };
};

U.show = function(id, opts) {
    opts = opts || {};
    if (id === 'landing') {
        if (window.PDM && window.PDM.Homepage && typeof window.PDM.Homepage.isActive === 'function' && !window.PDM.Homepage.isActive()) {
            id = 'workspace';
        } else if (!window.PDM || !window.PDM.Homepage) {
            id = 'workspace';
        }
    }
    var all = document.querySelectorAll('.section');
    for (var i = 0; i < all.length; i++) all[i].classList.remove('active');
    var sec = document.getElementById('section-' + id);
    if (sec) sec.classList.add('active');
    if (!opts.preserveHash) {
        window.location.hash = id;
    }
    U.highlightNav(id);
};

U.highlightNav = function(id) {
    var navLinks = document.querySelectorAll('.nav-links a, .footer-nav a');
    for (var i = 0; i < navLinks.length; i++) {
        var navId = navLinks[i].getAttribute('data-nav') || navLinks[i].getAttribute('href').replace('#','');
        if (navId === id) {
            navLinks[i].classList.add('active');
        } else {
            navLinks[i].classList.remove('active');
        }
    }
};

U.current = function() {
    var a = document.querySelector('.section.active');
    if (!a) return 'workspace';
    var id = a.id.replace('section-', '');
    if (id === 'landing' && window.PDM && window.PDM.Homepage && !window.PDM.Homepage.isActive()) {
        return 'workspace';
    }
    return id || 'workspace';
};

U.NOTIF_VISIBLE_MS = 4500;

U.notif = function(msg, type) {
    type = type || 'info';
    var box = document.getElementById('notif-box');
    var el = document.createElement('div');
    el.className = 'notif ' + type;
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(function(){
        el.style.opacity = '0';
        el.style.transition = 'opacity .3s';
        setTimeout(function(){ el.remove(); }, 300);
    }, U.NOTIF_VISIBLE_MS);
};

U.loader = function(on) {
    var el = document.getElementById('loader');
    if (on) { el.classList.add('on'); } else { el.classList.remove('on'); }
};

U.copy = function(text) {
    if (!text) return;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function(){
            U.notif(jsT('copied'), 'ok');
        }).catch(function(){ U.fallbackCopy(text); });
    } else { U.fallbackCopy(text); }
};

U.fallbackCopy = function(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    U.notif(jsT('copied'), 'ok');
};

U.renderTags = function(profiles, container, onChange) {
    container.innerHTML = '';
    if (!profiles.length) {
        var hint = (window.PDM && window.PDM.WorkspaceUi)
            ? window.PDM.WorkspaceUi.text('contextNoProfilesHint')
            : (window.PDM && window.PDM.I18n ? window.PDM.I18n.t('workspaceUi.contextNoProfilesHint') : '');
        container.innerHTML = '<span class="context-action-hint">' + U.escapeHtml(hint) + '</span>';
        return;
    }
    for (var i = 0; i < profiles.length; i++) {
        (function(p){
            var el = document.createElement('span');
            el.className = 'tag' + (p.active ? ' on' : '');
            el.textContent = '#' + p.tag;

            var tip = document.createElement('span');
            tip.className = 'tip';
            tip.textContent = p.prompt || (wsT('tagInvitePrefix') + p.tag);
            el.appendChild(tip);

            el.addEventListener('click', function(){
                window.PDM.Storage.toggleProfile(p.id);
                el.classList.toggle('on');
                if (onChange) onChange();
            });

            container.appendChild(el);
        })(profiles[i]);
    }
};

U.popSelect = function(selId, options, current) {
    var sel = document.getElementById(selId);
    if (!sel) return;
    sel.innerHTML = '';
    for (var i = 0; i < options.length; i++) {
        var o = document.createElement('option');
        o.value = options[i].value;
        o.textContent = options[i].label;
        if (options[i].title) o.title = options[i].title;
        if (options[i].value === current) o.selected = true;
        sel.appendChild(o);
    }
};

U.popProviderSelect = function() {
    if (window.PDM.Providers.populateProviderSelect) {
        window.PDM.Providers.populateProviderSelect();
    }
};

U.popModelSelect = function(providerId) {
    var models = window.PDM.Providers.models(providerId);
    var CS = window.PDM && window.PDM.ConfigSchema;
    if (CS && typeof CS.filterTextLlmModels === 'function') {
        models = CS.filterTextLlmModels(models);
    }
    var current = window.PDM.Storage.get(window.PDM.Storage.KEYS.MODEL);
    if (current && CS && typeof CS.isVisionModelId === 'function' && CS.isVisionModelId(current)) {
        current = '';
        window.PDM.Storage.set(window.PDM.Storage.KEYS.MODEL, '');
    }
    var opts = [];
    var found = false;
    for (var i = 0; i < models.length; i++) {
        opts.push({
            value: models[i].id,
            label: window.PDM.Providers.formatModelOptionLabel(models[i]),
            title: models[i].id
        });
        if (models[i].id === current) found = true;
    }
    var selected = current;
    if (!found && models.length > 0) {
        selected = models[0].id;
        window.PDM.Storage.set(window.PDM.Storage.KEYS.MODEL, selected);
    }

    U.popSelect('ws-output-model-select', opts, selected);

    if (document.getElementById('model-select')) {
        U.popSelect('model-select', opts, selected);
    }

    var wsSel = document.getElementById('model-select');
    if (wsSel) wsSel.disabled = false;

    var outSel = document.getElementById('ws-output-model-select');
    if (outSel) {
        outSel.disabled = false;
        var selOpt = outSel.options[outSel.selectedIndex];
        outSel.title = selOpt ? (selOpt.title || selOpt.textContent) : '';
    }

    var ep = document.getElementById('llm-endpoint-url');
    if (ep) ep.disabled = false;
};

U.syncOutputEmptyState = function() {
    var box = document.getElementById('output-box');
    var ta = document.getElementById('output-text');
    if (!box || !ta) return;
    box.classList.toggle('output-box--empty', !ta.value.trim());
};

U.showOutput = function(result, data) {
    var ta = document.getElementById('output-text');
    if (ta) {
        ta.value = result || (data && data.response) || '';
        if (ta.value.trim()) ta.placeholder = '';
    }
    U.syncOutputEmptyState();

    if (window.PDM && window.PDM.WorkspaceInputTools) window.PDM.WorkspaceInputTools.sync();
    var meta = document.getElementById('output-meta');
    if (!meta) return;
    meta.innerHTML = '';
    if (data && data.model) {
        meta.innerHTML += '<span>' + U.escapeHtml(wsT('outputMetaModel')) + ' <span class="val">' + U.escapeHtml(data.model) + '</span></span>';
    }
    if (data && data.usage) {
        meta.innerHTML += '<span>' + U.escapeHtml(wsT('outputMetaTokens')) + ' <span class="val">' + U.escapeHtml(data.usage.total_tokens || data.usage.total || 0) + '</span></span>';
    }
    if (data && data.duration_ms) {
        meta.innerHTML += '<span>' + U.escapeHtml(wsT('outputMetaTime')) + ' <span class="val">' + U.escapeHtml((data.duration_ms/1000).toFixed(1)) + 's</span></span>';
    }
};

U.hideOutput = function() {
    var ta = document.getElementById('output-text');
    var meta = document.getElementById('output-meta');
    if (ta) {
        ta.value = '';
        if (window.PDM && window.PDM.WorkspaceUi && typeof window.PDM.WorkspaceUi.applyOutputPendingPlaceholder === 'function') {
            window.PDM.WorkspaceUi.applyOutputPendingPlaceholder();
        } else if (window.PDM && window.PDM.WorkspaceUi) {
            ta.placeholder = window.PDM.WorkspaceUi.text('outputPendingPlaceholder') || '';
        }
    }
    if (meta) meta.innerHTML = '';
    U.syncOutputEmptyState();
    if (window.PDM && window.PDM.WorkspaceInputTools) window.PDM.WorkspaceInputTools.sync();
};

U.updateThemeCurrentLabel = function(themeId) {
    var el = document.getElementById('stg-theme-current');
    if (!el || !window.PDM.Themes) return;
    var T = window.PDM.Themes;
    var I = window.PDM.I18n;
    var t = T.get(themeId || T.current());
    var family = T.getFamily(t.id);
    var famLabel = family.name;
    if (I) {
        var localized = I.t('themes.families.' + family.id);
        if (localized && localized.indexOf('themes.families.') !== 0) famLabel = localized;
    }
    var modeLabel = T.isDayMode(t.id)
        ? (I ? I.t('themes.modeLight') : 'clair')
        : (I ? I.t('themes.modeDark') : 'sombre');
    var currentLabel = I ? I.t('themes.currentLabel') : 'Thème actif';
    el.innerHTML =
        '<span class="stg-theme-current-label">' + U.escapeHtml(currentLabel) + '</span> ' +
        '<strong class="stg-theme-current-value">' + U.escapeHtml(t.icon + ' ' + famLabel + ' \u2014 ' + modeLabel) + '</strong>';
};

U.renderThemePicker = function() {
    var box = document.getElementById('theme-picker');
    if (!box) return;
    box.innerHTML = '';
    var T = window.PDM.Themes;
    var families = T.listFamilies();
    var current = T.current();
    var activeTheme = T.get(current);
    U.updateThemeCurrentLabel(current);

    for (var i = 0; i < families.length; i++) {
        (function(fam) {
            var dayTheme = T.get(fam.dayId);
            var nightTheme = T.get(fam.nightId);
            var isActive = activeTheme.family === fam.id;

            var card = document.createElement('div');
            card.className = 'theme-swatch theme-swatch-card' + (isActive ? ' active' : '');
            card.dataset.family = fam.id;
            card.setAttribute('role', 'group');
            var I = window.PDM.I18n;
            var famLabel = fam.name;
            if (I) {
                var loc = I.t('themes.families.' + fam.id);
                if (loc && loc.indexOf('themes.families.') !== 0) famLabel = loc;
            }
            card.setAttribute('aria-label', famLabel);
            card.setAttribute('aria-selected', isActive ? 'true' : 'false');

            /* Bande preview : fond jour / surface jour / accent */
            var preview = document.createElement('div');
            preview.className = 'theme-swatch-preview';
            preview.setAttribute('aria-hidden', 'true');
            var stripes = [
                { cls: 'theme-swatch-stripe-bg', color: dayTheme.vars['--bg-black'] },
                { cls: 'theme-swatch-stripe-surface', color: dayTheme.vars['--surface'] },
                { cls: 'theme-swatch-stripe-accent', color: dayTheme.vars['--accent-red'] }
            ];
            for (var s = 0; s < stripes.length; s++) {
                var sp = document.createElement('span');
                sp.className = 'theme-swatch-stripe ' + stripes[s].cls;
                sp.style.background = stripes[s].color;
                preview.appendChild(sp);
            }

            /* Meta : icône + nom + coche */
            var meta = document.createElement('div');
            meta.className = 'theme-swatch-meta';
            var icon = document.createElement('span');
            icon.className = 'theme-swatch-icon';
            icon.setAttribute('aria-hidden', 'true');
            icon.textContent = fam.icon;
            var name = document.createElement('span');
            name.className = 'theme-swatch-name';
            name.textContent = famLabel;
            var check = document.createElement('span');
            check.className = 'theme-swatch-check';
            check.setAttribute('aria-hidden', 'true');
            check.textContent = '\u2713';
            meta.appendChild(icon);
            meta.appendChild(name);
            meta.appendChild(check);

            /* Boutons mode clair / sombre */
            var modes = document.createElement('div');
            modes.className = 'theme-swatch-modes';

            var dayBtn = document.createElement('button');
            dayBtn.type = 'button';
            dayBtn.className = 'theme-swatch-mode-btn' + (isActive && activeTheme.mode === 'day' ? ' is-active-mode' : '');
            dayBtn.setAttribute('data-theme-mode', 'day');
            dayBtn.setAttribute('aria-label', I ? I.t('settings.themeModeLightAria', { family: famLabel }) : (fam.name + ' clair'));
            dayBtn.title = dayTheme.name;
            dayBtn.textContent = I ? I.t('settings.themeModeLight') : '\u2600\uFE0F Clair';
            dayBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                T.apply(fam.dayId);
            });

            var nightBtn = document.createElement('button');
            nightBtn.type = 'button';
            nightBtn.className = 'theme-swatch-mode-btn' + (isActive && activeTheme.mode === 'night' ? ' is-active-mode' : '');
            nightBtn.setAttribute('data-theme-mode', 'night');
            nightBtn.setAttribute('aria-label', I ? I.t('settings.themeModeDarkAria', { family: famLabel }) : (fam.name + ' sombre'));
            nightBtn.title = nightTheme.name;
            nightBtn.textContent = I ? I.t('settings.themeModeDark') : '\uD83C\uDF19 Sombre';
            nightBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                T.apply(fam.nightId);
            });

            modes.appendChild(dayBtn);
            modes.appendChild(nightBtn);

            card.appendChild(preview);
            card.appendChild(meta);
            card.appendChild(modes);

            /* Clic carte = basculer dans la famille (mode courant si même famille, sinon jour) */
            card.addEventListener('click', function() {
                if (T.getFamily(T.current()).id === fam.id) {
                    T.toggleNightMode();
                } else {
                    T.apply(fam.dayId);
                }
            });

            box.appendChild(card);
        })(families[i]);
    }
};

window.PDM = window.PDM || {};
window.PDM.UI = U;
})();
