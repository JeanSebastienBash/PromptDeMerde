/**
 * PromptDeMerde.com — Navigation par sections, notifications, sélecteurs provider/modèle et tags de contexte.
 */
(function(){

var U = {};

U.escapeHtml = function(s) {
    if (s == null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

U.show = function(id) {
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
    window.location.hash = id;
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
    }, 3000);
};

U.loader = function(on) {
    var el = document.getElementById('loader');
    if (on) { el.classList.add('on'); } else { el.classList.remove('on'); }
};

U.copy = function(text) {
    if (!text) return;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function(){
            U.notif('Copié dans le presse-papier !', 'ok');
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
    U.notif('Copié dans le presse-papier !', 'ok');
};

U.renderTags = function(profiles, container, onChange) {
    container.innerHTML = '';
    if (!profiles.length) {
        container.innerHTML = '<span class="context-action-hint">Aucune option pour l\u2019instant. Cr\u00e9e-en dans l\u2019onglet Prompts.</span>';
        return;
    }
    for (var i = 0; i < profiles.length; i++) {
        (function(p){
            var el = document.createElement('span');
            el.className = 'tag' + (p.active ? ' on' : '');
            el.textContent = '#' + p.tag;

            var tip = document.createElement('span');
            tip.className = 'tip';
            tip.textContent = p.prompt || 'INVITE : ' + p.tag;
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
    var current = window.PDM.Storage.get(window.PDM.Storage.KEYS.MODEL);
    var opts = [];
    var found = false;
    for (var i = 0; i < models.length; i++) {
        opts.push({ value: models[i].id, label: models[i].label + ' (' + models[i].ctx + ')' });
        if (models[i].id === current) found = true;
    }
    var selected = current;
    if (!found && models.length > 0) {
        selected = models[0].id;
        window.PDM.Storage.set(window.PDM.Storage.KEYS.MODEL, selected);
    }

    U.popSelect('config-model', opts, selected);

    if (document.getElementById('model-select')) {
        U.popSelect('model-select', opts, selected);
    }

    var wsSel = document.getElementById('model-select');
    if (wsSel) wsSel.disabled = false;

    var cfgSel = document.getElementById('config-model');
    if (cfgSel) cfgSel.disabled = false;

    var ep = document.getElementById('llm-endpoint-url');
    if (ep) ep.disabled = false;
};

U.showOutput = function(result, data) {
    var box = document.getElementById('output-box');
    var ta = document.getElementById('output-text');
    if (ta) ta.value = result || (data && data.response) || '';
    if (box) box.classList.add('show');

    var meta = document.getElementById('output-meta');
    if (!meta) return;
    meta.innerHTML = '';
    if (data && data.model) {
        meta.innerHTML += '<span>Modèle: <span class="val">' + U.escapeHtml(data.model) + '</span></span>';
    }
    if (data && data.usage) {
        meta.innerHTML += '<span>Tokens: <span class="val">' + U.escapeHtml(data.usage.total_tokens || data.usage.total || 0) + '</span></span>';
    }
    if (data && data.duration_ms) {
        meta.innerHTML += '<span>Temps: <span class="val">' + U.escapeHtml((data.duration_ms/1000).toFixed(1)) + 's</span></span>';
    }
};

U.hideOutput = function() {
    var box = document.getElementById('output-box');
    if (box) box.classList.remove('show');
};

U.renderThemePicker = function() {
    var box = document.getElementById('theme-picker');
    if (!box) return;
    box.innerHTML = '';
    var themes = window.PDM.Themes.list();
    var current = window.PDM.Themes.current();
    for (var i = 0; i < themes.length; i++) {
        (function(t){
            var el = document.createElement('div');
            el.className = 'theme-swatch' + (t.id === current ? ' active' : '');
            el.dataset.theme = t.id;

            var color = document.createElement('div');
            color.className = 'swatch-color';
            color.style.background = t.preview;

            var name = document.createElement('span');
            name.className = 'swatch-name';
            name.textContent = t.name;

            el.appendChild(color);
            el.appendChild(name);

            el.addEventListener('click', function(){
                window.PDM.Themes.apply(t.id);
            });

            box.appendChild(el);
        })(themes[i]);
    }
};

window.PDM = window.PDM || {};
window.PDM.UI = U;
})();
