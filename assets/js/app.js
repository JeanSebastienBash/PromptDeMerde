/**
 * PromptDeMerde.com — Point d'entrée applicatif : routage, démarrage et navigation.
 */
(function(){

var A = {};
window.PDM = window.PDM || {};
window.PDM.App = A;

var SNIPERISE_BTN_LABEL = 'NETTOYER CE TAS DE MERDE \u2192';
A.SNIPERISE_BTN_LABEL = SNIPERISE_BTN_LABEL;

var SHIT_PROMPTS = [
    "\u00c9cris-moi un article sur les chiens",
    "Fais un site web pour mon restaurant",
    "R\u00e9sume-moi le livre 1984",
    "Donne-moi un r\u00e9gime pour perdre du poids",
    "\u00c9cris un mail pour dire que je d\u00e9missionne",
    "Fais un plan de cours sur la R\u00e9volution fran\u00e7aise",
    "Explique-moi les imp\u00f4ts en France",
    "R\u00e9dige une annonce pour vendre ma voiture",
    "Fais-moi un programme sportif pour d\u00e9buter",
    "\u00c9cris un discours pour le mariage de ma s\u0153ur",
    "Donne-moi des id\u00e9es de contenu pour Instagram",
    "Fais un r\u00e9sum\u00e9 du film Interstellar",
    "\u00c9cris une lettre de motivation pour un poste de d\u00e9veloppeur",
    "Aide-moi \u00e0 r\u00e9diger un CV pour le marketing",
    "Propose-moi un menu de No\u00ebl pour 10 personnes"
];

var _demoIdx = 0;
var _demoTimer = null;
A._wsSaveTimer = null;

A.init = function() {
    A._boot();
};

A.getActiveProvider = function() {
    return window.PDM.Providers.getActive();
};

A.getActiveProviderId = function() {
    return window.PDM.Providers.getActiveId();
};

A._resolveRoute = function(requested) {
    if (window.PDM.Homepage && typeof window.PDM.Homepage.resolveRoute === 'function') {
        return window.PDM.Homepage.resolveRoute(requested);
    }
    var route = String(requested || '').replace(/^#/, '').trim().toLowerCase();
    if (!route) return 'workspace';
    if (route === 'landing') return 'workspace';
    return route;
};

A._homepageActive = function() {
    return window.PDM.Homepage && typeof window.PDM.Homepage.isActive === 'function' && window.PDM.Homepage.isActive();
};

A._defaultRoute = function() {
    if (window.PDM.Homepage && typeof window.PDM.Homepage.getDefaultRoute === 'function') {
        return window.PDM.Homepage.getDefaultRoute();
    }
    return 'workspace';
};

A._boot = function() {
    window.PDM.Storage.onStorageError = function(msg) {
        window.PDM.UI.notif(msg, 'err');
    };
    window.PDM.Storage.migrateSessionToLocal();
    var activePid = A.getActiveProviderId();
    if (activePid) {
        window.PDM.Storage.set(window.PDM.Storage.KEYS.PROVIDER, activePid);
    }
    window.PDM.Storage.resetOldSystemPrompt();
    window.PDM.Themes.init();
    window.PDM.Profiles.load();

    var start = function() {
        A.router();
        A.bindWorkspace();
        A.bindHistory();
        A.bindWorkspaceLlmConfig();
        A.bindPrompts();
        A.bindSettings();
        A.bindNav();
        A.bindThemeToggle();
        if (A._homepageActive()) A.rotateDemo();
        window.PDM.STT.init({
            onSave: A.scheduleWorkspaceSave,
            getLang: function() {
                return window.PDM.Storage.get(window.PDM.Storage.KEYS.LANGUAGE) || 'fr';
            }
        });
        var vEl = document.getElementById('footer-version');
        if (vEl) vEl.textContent = 'v' + window.PDM.Storage.VERSION;
        var envBadge = document.getElementById('footer-env-badge');
        if (envBadge && window.PDM.Env.isPreprod()) {
            envBadge.hidden = false;
            envBadge.textContent = 'PR\u00c9-PROD';
        }
        window.addEventListener('hashchange', A.router);
    };

    var loadHome = window.PDM.Homepage && typeof window.PDM.Homepage.load === 'function'
        ? window.PDM.Homepage.load()
        : Promise.resolve(false);
    loadHome.then(start);
};

A.router = function() {
    var hash = A._resolveRoute(window.location.hash.replace('#', '') || '');
    if (hash === 'config') hash = 'settings';
    var valid = { landing:1, workspace:1, prompts:1, settings:1, mentions:1, cgu:1, privacy:1, support:1, documentation:1 };
    var section = valid[hash] ? hash : 'workspace';
    if (section === 'landing' && !A._homepageActive()) section = 'workspace';

    window.PDM.UI.show(section);
    if (section === 'workspace') A.refreshWorkspace();
    if (section === 'prompts') A.refreshPrompts();
    if (section === 'settings') A.refreshSettings();
    if (section === 'mentions' || section === 'cgu' || section === 'privacy' || section === 'support') {
        window.scrollTo(0, 0);
    }
};

A.rotateDemo = function() {
    var pairs = window.PDM.LANDING_DEMO_PAIRS;
    if (!pairs || !pairs.length || !document.getElementById('demo-before')) return;
    _demoIdx = Math.floor(Math.random() * pairs.length);
    A.showDemoPair(_demoIdx);
    if (_demoTimer) clearInterval(_demoTimer);
    _demoTimer = setInterval(function(){
        _demoIdx = (_demoIdx + 1) % pairs.length;
        A.showDemoPair(_demoIdx);
    }, 4500);
};

A.showDemoPair = function(idx) {
    var pairs = window.PDM.LANDING_DEMO_PAIRS;
    if (!pairs || !pairs.length) return;
    var pair = pairs[idx];
    var beforeEl = document.querySelector('#demo-before .demo-text');
    var afterEl = document.querySelector('#demo-after .demo-text');
    if (beforeEl) beforeEl.textContent = '\u00ab ' + pair.before + ' \u00bb';
    if (afterEl) afterEl.textContent = '\u00ab ' + pair.after + ' \u00bb';
    var ta = document.getElementById('landing-prompt');
    if (ta && !ta.value.trim()) ta.placeholder = pair.before;
};

A.bindNav = function() {
    var burger = document.getElementById('nav-burger');
    var links = document.getElementById('nav-links');
    if (!burger || !links) return;

    function setOpen(open) {
        links.classList.toggle('open', open);
        burger.textContent = open ? '\u2715' : '\u2630';
        burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    burger.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        setOpen(!links.classList.contains('open'));
    });

    links.querySelectorAll('a').forEach(function(a) {
        a.addEventListener('click', function() {
            setOpen(false);
        });
    });

    document.addEventListener('click', function(e) {
        if (!links.classList.contains('open')) return;
        if (burger.contains(e.target) || links.contains(e.target)) return;
        setOpen(false);
    });
};

A.bindThemeToggle = function() {
    var btn = document.getElementById('theme-toggle');
    if (btn) {
        btn.addEventListener('click', function(){
            window.PDM.Themes.toggleLightDark();
        });
    }
    var btnMobile = document.getElementById('theme-toggle-mobile');
    if (btnMobile) {
        btnMobile.addEventListener('click', function(){
            window.PDM.Themes.toggleLightDark();
        });
    }
};

window.PDM.App = A;
})();
