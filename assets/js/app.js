/**
 * PromptDeMerde.com — app.js
 *
 * Synopsis : Point d'entrée SPA : routage hash, initialisation et navigation globale.
 * Objectif : Démarrer l'application, router les écrans et orchestrer le boot après bootstrap.js.
 */
(function(){

var A = {};
window.PDM = window.PDM || {};
window.PDM.App = A;

var SNIPERISE_BTN_LABEL = '';
A.SNIPERISE_BTN_LABEL = SNIPERISE_BTN_LABEL;

function syncWorkspaceUiLabels() {
    if (window.PDM.WorkspaceUi) {
        A.SNIPERISE_BTN_LABEL = window.PDM.WorkspaceUi.submitLabel();
    } else if (window.PDM.I18n) {
        A.SNIPERISE_BTN_LABEL = window.PDM.I18n.t('workspace.sniperise');
    }
}
A.syncWorkspaceUiLabels = syncWorkspaceUiLabels;

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
    try {
        var u = new URL(window.location.href);
        if (u.searchParams.has('pdm_fresh')) {
            u.searchParams.delete('pdm_fresh');
            var qs = u.searchParams.toString();
            var clean = u.pathname + (qs ? '?' + qs : '') + u.hash;
            window.history.replaceState(null, '', clean);
        }
    } catch (eFresh) {}
    window.PDM.Storage.onStorageError = function(msg) {
        window.PDM.UI.notif(msg, 'err');
    };
    window.PDM.Storage.migrateSessionToLocal();
    if (window.PDM.Storage.purgeProxyTokenLegacy) {
        window.PDM.Storage.purgeProxyTokenLegacy();
    }
    var activePid = A.getActiveProviderId();
    if (activePid) {
        window.PDM.Storage.set(window.PDM.Storage.KEYS.PROVIDER, activePid);
    }
    window.PDM.Storage.resetOldSystemPrompt();
    window.PDM.Storage.ensureConfigDefaults();
    window.PDM.Profiles.load();

    var start = function() {
        var bootUi = Promise.resolve();
        if (window.PDM.WorkspaceUi && typeof window.PDM.WorkspaceUi.boot === 'function') {
            bootUi = window.PDM.WorkspaceUi.boot();
        } else if (window.PDM.WorkspaceUi && typeof window.PDM.WorkspaceUi.apply === 'function') {
            window.PDM.WorkspaceUi.apply();
        }
        bootUi.then(function() {
            if (window.PDM.Themes && typeof window.PDM.Themes.init === 'function') {
                window.PDM.Themes.init();
            }
            if (typeof A.syncSystemPromptTextarea === 'function') {
                A.syncSystemPromptTextarea(true);
            }
            if (typeof A.rebuildProfileList === 'function') {
                A.rebuildProfileList();
            }
            if (typeof A.updateSystemPromptUI === 'function') {
                A.updateSystemPromptUI();
            }
            syncWorkspaceUiLabels();
            var bootChain = Promise.resolve();
            if (window.PDM.I18n && typeof window.PDM.I18n.finishBoot === 'function') {
                bootChain = window.PDM.I18n.finishBoot();
            } else if (window.PDM.I18n && typeof window.PDM.I18n.apply === 'function') {
                window.PDM.I18n.apply(document);
            }
            bootChain.then(function() {
            A.router();
            A.bindWorkspace();
            A.bindHistory();
            A.bindLlmOptions();
            A.bindWorkspaceLlmConfig();
            if (A.bindWorkspaceAudio) A.bindWorkspaceAudio();
            if (A.bindWorkspaceImage) A.bindWorkspaceImage();
            A.bindPrompts();
            A.bindSettings();
            if (typeof A.bindMarket === 'function') A.bindMarket();
            if (window.PDM.Env && typeof window.PDM.Env.applyOfficialNavLinks === 'function') {
                window.PDM.Env.applyOfficialNavLinks();
            } else if (window.PDM.Env && typeof window.PDM.Env.applyMarketplaceNavLinks === 'function') {
                window.PDM.Env.applyMarketplaceNavLinks();
            }
            A.bindNav();
            A.bindThemeToggle();
            if (A.restoreWorkspaceAudioMode) A.restoreWorkspaceAudioMode();
            if (A._homepageActive()) A.rotateDemo();
            window.addEventListener('hashchange', A.router);
            if (window.PDM.ProfileSelector && typeof window.PDM.ProfileSelector.init === 'function') {
                window.PDM.ProfileSelector.init();
            }
            window.PDM.STT.init({
                onSave: A.scheduleWorkspaceSave,
                getLang: function() {
                    return window.PDM.I18n && window.PDM.I18n.getLocale
                        ? window.PDM.I18n.getLocale()
                        : (window.PDM.Storage.get(window.PDM.Storage.KEYS.LANGUAGE) || 'fr');
                }
            });
            var vEl = document.getElementById('footer-version');
            if (vEl) {
                var appVer = (window.PDM.ConfigSchema && window.PDM.ConfigSchema.VERSION) ||
                    (window.PDM.Storage && window.PDM.Storage.VERSION) ||
                    '1.16.1';
                vEl.textContent = 'v' + appVer;
            }
            var envBadge = document.getElementById('footer-env-badge');
            if (window.PDM.ProxyTokenSession) {
                if (typeof window.PDM.ProxyTokenSession.syncOptionsField === 'function') {
                    window.PDM.ProxyTokenSession.syncOptionsField();
                }
                if (typeof window.PDM.ProxyTokenSession.bindOptionsField === 'function') {
                    window.PDM.ProxyTokenSession.bindOptionsField();
                }
            }
            var skipLlmBoot = window.PDM.ProxyTokenSession
                && typeof window.PDM.ProxyTokenSession.shouldSkipLlmBootstrapOnBoot === 'function'
                && window.PDM.ProxyTokenSession.shouldSkipLlmBootstrapOnBoot();
            if (typeof A.bootstrapLlmFromProvider === 'function' && !skipLlmBoot) {
                A.bootstrapLlmFromProvider({ thinkingOffOnAuto: true });
            }
            if (envBadge && window.PDM.Env) {
                var env = window.PDM.Env.getEnvironment();
                envBadge.hidden = false;
                envBadge.textContent = window.PDM.I18n
                    ? window.PDM.I18n.getEnvLabel(env)
                    : window.PDM.Env.getLabel();
                envBadge.className = 'footer-env-badge footer-env-badge--' + env;
            }
            document.addEventListener('pdm:localechange', function() {
                if (window.PDM.Storage && typeof window.PDM.Storage.syncWorkspaceUiTextsForLocale === 'function') {
                    window.PDM.Storage.syncWorkspaceUiTextsForLocale();
                }
                if (window.PDM.WorkspaceUi && typeof window.PDM.WorkspaceUi.apply === 'function') {
                    window.PDM.WorkspaceUi.apply();
                }
                if (window.PDM.I18n) window.PDM.I18n.apply(document);
                if (window.PDM.UI && window.PDM.UI.renderThemePicker) window.PDM.UI.renderThemePicker();
                if (window.PDM.Themes && typeof window.PDM.Themes.updateToggleIcon === 'function') {
                    window.PDM.Themes.updateToggleIcon(window.PDM.Themes.current());
                }
                var synopsisChain = Promise.resolve();
                if (window.PDM.Storage) {
                    window.PDM.Storage.set('pdm_profile_synopsis', '');
                    window.PDM.Storage.set('pdm_profile_synopsis_lang', '');
                }
                if (window.PDM.WorkspaceUi && typeof window.PDM.WorkspaceUi.ensureProfileSynopsis === 'function') {
                    synopsisChain = window.PDM.WorkspaceUi.ensureProfileSynopsis();
                }
                synopsisChain.then(function() {
                    if (window.PDM.AnimationSynopsis && typeof window.PDM.AnimationSynopsis.bootFromStorage === 'function') {
                        window.PDM.AnimationSynopsis.bootFromStorage();
                    }
                });
                if (window.PDM.FooterProjects && typeof window.PDM.FooterProjects.refresh === 'function') {
                    window.PDM.FooterProjects.refresh();
                }
                syncWorkspaceUiLabels();
                if (typeof A.refreshPrompts === 'function') A.refreshPrompts();
                if (typeof A.renderAllHistories === 'function') A.renderAllHistories();
                if (window.PDM.STT && typeof window.PDM.STT.refresh === 'function') {
                    window.PDM.STT.refresh();
                }
                if (window.PDM.ProfileSelector && typeof window.PDM.ProfileSelector.reloadBundledProfiles === 'function') {
                    window.PDM.ProfileSelector.reloadBundledProfiles();
                } else if (window.PDM.ProfileSelector && typeof window.PDM.ProfileSelector.populateSelector === 'function') {
                    window.PDM.ProfileSelector.populateSelector();
                }
                if (A._homepageActive()) {
                    if (window.PDM.Homepage && typeof window.PDM.Homepage.load === 'function') {
                        window.PDM.Homepage.load();
                    }
                    if (typeof A.rotateDemo === 'function') A.rotateDemo();
                }
            });
            });
        });
    };

    var loadHome = window.PDM.Homepage && typeof window.PDM.Homepage.load === 'function'
        ? window.PDM.Homepage.load()
        : Promise.resolve(false);
    loadHome.then(start);
};

A.stopDemoRotation = function() {
    if (_demoTimer) {
        clearInterval(_demoTimer);
        _demoTimer = null;
    }
};

A._parseHashRoute = function(raw) {
    var hash = A._resolveRoute(String(raw || '').replace(/^#/, '').trim());
    if (hash === 'config') hash = 'settings';
    if (window.PDM && window.PDM.Docs && typeof window.PDM.Docs.isLegacyDocHash === 'function'
        && window.PDM.Docs.isLegacyDocHash(hash)) {
        return { section: 'workspace', anchor: null, preserveHash: false, openTechDoc: true };
    }
    var valid = { landing:1, workspace:1, prompts:1, market:1, settings:1, mentions:1, cgu:1, privacy:1, support:1 };
    if (valid[hash]) {
        return { section: hash, anchor: null, preserveHash: false };
    }
    return { section: 'workspace', anchor: null, preserveHash: false };
};

A._redirectOfficialSection = function(section) {
    var Env = window.PDM && window.PDM.Env;
    if (!Env) return false;
    if (section === 'market' && !Env.hasMarketplace()) {
        var mUrl = (typeof Env.officialMarketplaceUrl === 'function')
            ? Env.officialMarketplaceUrl()
            : 'https://promptdemerde.com/#market';
        window.location.replace(mUrl);
        return true;
    }
    var legal = section === 'mentions' || section === 'cgu'
        || section === 'privacy' || section === 'support';
    if (legal && typeof Env.hasSitePages === 'function' && !Env.hasSitePages()) {
        var lUrl = (typeof Env.officialLegalUrl === 'function')
            ? Env.officialLegalUrl(section)
            : ('https://promptdemerde.com/#' + section);
        window.location.replace(lUrl);
        return true;
    }
    return false;
};

A.router = function() {
    var raw = window.location.hash.replace('#', '') || '';
    var parsed = A._parseHashRoute(raw);
    var section = parsed.section;
    if (parsed.openTechDoc && window.PDM && window.PDM.Docs
        && typeof window.PDM.Docs.handleLegacyHash === 'function') {
        window.PDM.Docs.handleLegacyHash(raw);
        section = 'workspace';
        parsed = { section: 'workspace', anchor: null, preserveHash: false };
    }
    if (section === 'landing' && !A._homepageActive()) section = 'workspace';
    if (A._redirectOfficialSection(section)) return;

    if (section !== 'landing') A.stopDemoRotation();
    window.PDM.UI.show(section, { preserveHash: parsed.preserveHash });
    if (section === 'workspace') A.refreshWorkspace();
    if (section === 'prompts') A.refreshPrompts();
    if (section === 'market' && typeof A.refreshMarket === 'function') A.refreshMarket();
    if (section === 'settings') A.refreshSettings();
    if (section === 'mentions' || section === 'cgu' || section === 'privacy' || section === 'support') {
        window.scrollTo(0, 0);
    }
    if (section === 'landing') {
        if (window.PDM.Video && typeof window.PDM.Video.init === 'function') {
            window.PDM.Video.init();
        }
        if (typeof A.rotateDemo === 'function') A.rotateDemo();
    }
};

A.rotateDemo = function() {
    var pairs = window.PDM.I18n && window.PDM.I18n.getLandingDemoPairs
        ? window.PDM.I18n.getLandingDemoPairs()
        : [];
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
    var pairs = window.PDM.I18n && window.PDM.I18n.getLandingDemoPairs
        ? window.PDM.I18n.getLandingDemoPairs()
        : [];
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

    function navigateHash(route) {
        route = String(route || '').replace(/^#/, '').trim();
        if (!route) return;
        var cur = (window.location.hash || '').replace(/^#/, '').trim();
        if (cur === route) {
            if (typeof A.router === 'function') A.router();
            else if (window.PDM_earlyRoute) window.PDM_earlyRoute();
            return;
        }
        window.location.hash = route;
    }

    burger.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        setOpen(!links.classList.contains('open'));
    });

    links.querySelectorAll('a[href^="#"], a[data-nav]').forEach(function(a) {
        a.addEventListener('click', function(e) {
            var href = a.getAttribute('href') || '';
            if (!href || href.charAt(0) !== '#') return;
            var route = href.replace(/^#/, '').trim();
            if (!route) return;
            e.preventDefault();
            setOpen(false);
            navigateHash(route);
        });
    });

    window.addEventListener('hashchange', function() {
        if (links.classList.contains('open')) setOpen(false);
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
            window.PDM.Themes.toggleNightMode();
        });
    }
    var btnMobile = document.getElementById('theme-toggle-mobile');
    if (btnMobile) {
        btnMobile.addEventListener('click', function(){
            window.PDM.Themes.toggleNightMode();
        });
    }
};

window.PDM.App = A;
})();
