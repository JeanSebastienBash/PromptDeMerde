/**
 * PromptDeMerde.com — homepage.js
 *
 * Synopsis : Chargeur conditionnel du fragment landing marketing.
 * Objectif : Fetcher section-landing.html, activer #landing ou fallback #workspace.
 */
(function() {

var H = {};

H.FRAGMENT_URL = 'assets/homepage/section-landing.html';
H.WORKSPACE_ROUTE = 'workspace';
H.WORKSPACE_HASH = '#workspace';
H._available = false;

H.isEnabled = function() {
    try {
        return !!(window.PDM && window.PDM.Env && typeof window.PDM.Env.hasHomepage === 'function' && window.PDM.Env.hasHomepage());
    } catch (e) {
        return false;
    }
};

H.isActive = function() {
    return H._available === true;
};

H._setAvailable = function(on) {
    H._available = on === true;
    H._showNavLink(H._available);
    H.applyNavLinks();
};

H.resolveRoute = function(requested) {
    var route = String(requested || '').replace(/^#/, '').trim().toLowerCase();
    if (!route) return H.isActive() ? 'landing' : H.WORKSPACE_ROUTE;
    if (route === 'landing' && !H.isActive()) return H.WORKSPACE_ROUTE;
    return route;
};

H.getDefaultRoute = function() {
    return H.isActive() ? 'landing' : H.WORKSPACE_ROUTE;
};

H.getHomeHref = function() {
    return H.isActive() ? '#landing' : H.WORKSPACE_HASH;
};

H.applyNavLinks = function() {
    var href = H.getHomeHref();
    var logo = document.getElementById('nav-logo-link');
    if (logo) logo.setAttribute('href', href);
    H._rewriteLandingAnchors();
};

H._rewriteLandingAnchors = function() {
    if (H.isActive()) return;
    var anchors = document.querySelectorAll('a[href="#landing"]');
    for (var i = 0; i < anchors.length; i++) {
        if (anchors[i].id === 'nav-link-landing' || anchors[i].id === 'footer-home-link') continue;
        anchors[i].setAttribute('href', H.WORKSPACE_HASH);
    }
};

H.forceWorkspace = function(reason) {
    var onLanding = window.location.hash.replace(/^#/, '').trim().toLowerCase() === 'landing';
    H._setAvailable(false);
    if (onLanding) {
        if (reason) console.warn('[PDM.Homepage] Fallback workspace:', reason);
        window.location.replace(H.WORKSPACE_HASH);
    }
};

H._sanitizeLandingHtml = function(html) {
    try {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var blocked = doc.querySelectorAll('script, iframe, object, embed, link[rel="import"]');
        for (var b = 0; b < blocked.length; b++) {
            if (blocked[b].parentNode) blocked[b].parentNode.removeChild(blocked[b]);
        }
        var nodes = doc.body ? doc.body.querySelectorAll('*') : [];
        for (var i = 0; i < nodes.length; i++) {
            var attrs = nodes[i].attributes;
            for (var j = attrs.length - 1; j >= 0; j--) {
                var name = attrs[j].name;
                var val = attrs[j].value || '';
                if (/^on/i.test(name) || (name === 'href' && /^\s*javascript:/i.test(val))) {
                    nodes[i].removeAttribute(name);
                }
            }
        }
        return doc.body ? doc.body.innerHTML : '';
    } catch (e) {
        return '';
    }
};

H._initLandingWidgets = function() {
    if (window.PDM.Video && typeof window.PDM.Video.init === 'function') {
        window.PDM.Video.init();
    }
};

H.load = function() {
    if (!H.isEnabled()) {
        H.forceWorkspace('bundle absent (serveur)');
        return Promise.resolve(false);
    }

    var sec = document.getElementById('section-landing');
    if (!sec) {
        H.forceWorkspace('section-landing absente');
        return Promise.resolve(false);
    }

    var localeHtml = null;
    if (window.PDM && window.PDM.I18n && typeof window.PDM.I18n.getLandingHtml === 'function') {
        localeHtml = window.PDM.I18n.getLandingHtml();
    }
    if (localeHtml && String(localeHtml).trim()) {
        sec.innerHTML = H._sanitizeLandingHtml(localeHtml);
        H._setAvailable(true);
        H._initLandingWidgets();
        return Promise.resolve(true);
    }

    return fetch(H.FRAGMENT_URL, { cache: 'no-store' })
        .then(function(res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.text();
        })
        .then(function(html) {
            if (!html || !String(html).trim()) throw new Error('fragment vide');
            sec.innerHTML = H._sanitizeLandingHtml(html);
            H._setAvailable(true);
            H._initLandingWidgets();
            return true;
        })
        .catch(function(err) {
            H.forceWorkspace(err && err.message ? err.message : 'chargement fragment');
            return false;
        });
};

H._showNavLink = function(on) {
    var nav = document.getElementById('nav-link-landing');
    if (nav) nav.hidden = !on;
    var homeFooter = document.getElementById('footer-home-link');
    var appFooter = document.getElementById('footer-app-link');
    if (homeFooter) homeFooter.hidden = !on;
    if (appFooter) appFooter.hidden = !!on;
};

window.PDM = window.PDM || {};
window.PDM.Homepage = H;

})();
