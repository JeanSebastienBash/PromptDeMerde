/**
 * PromptDeMerde.com — env-official-nav.js
 *
 * Synopsis : Liens Market / légal / support vers le site officiel si artefact local absent.
 * Objectif : Pastille verte data-pdm-official-external ; miroir hasMarketplace / hasSitePages.
 */
(function () {

var E = window.PDM && window.PDM.Env;
if (!E) return;

var LEGAL_LINKS = [
    { id: 'footer-link-mentions', hash: 'mentions' },
    { id: 'footer-link-cgu', hash: 'cgu' },
    { id: 'footer-link-privacy', hash: 'privacy' },
    { id: 'footer-link-support', hash: 'support' }
];

function platformBase() {
    var base = (window.PDM.ConfigSchema && window.PDM.ConfigSchema.DEFAULT_PLATFORM_URL)
        || 'https://promptdemerde.com';
    return String(base).replace(/\/$/, '');
}

function i18nTitle(key) {
    if (!window.PDM || !window.PDM.I18n || typeof window.PDM.I18n.t !== 'function') return '';
    return window.PDM.I18n.t(key) || '';
}

function setExternal(el, href, title) {
    el.setAttribute('href', href);
    el.removeAttribute('data-nav');
    el.removeAttribute('target');
    el.removeAttribute('rel');
    el.setAttribute('data-pdm-official-external', '1');
    el.removeAttribute('data-pdm-market-external');
    if (title) el.setAttribute('title', title);
    else el.removeAttribute('title');
}

function setLocal(el, hash) {
    el.setAttribute('href', '#' + hash);
    el.setAttribute('data-nav', hash);
    el.removeAttribute('target');
    el.removeAttribute('rel');
    el.removeAttribute('data-pdm-official-external');
    el.removeAttribute('data-pdm-market-external');
    el.removeAttribute('title');
}

E.officialPlatformBaseUrl = function () {
    return platformBase();
};

E.officialMarketplaceUrl = function () {
    return platformBase() + '/#market';
};

E.officialLegalUrl = function (hash) {
    var h = String(hash || '').replace(/^#/, '').trim();
    return platformBase() + '/#' + h;
};

E.hasSitePages = function () {
    var features = E.get().features;
    return !!(features && features.sitePages === true);
};

E.applyMarketplaceNavLinks = function () {
    var local = E.hasMarketplace();
    var official = E.officialMarketplaceUrl();
    var nodes = [
        document.getElementById('nav-link-market'),
        document.getElementById('footer-link-market')
    ];
    var extTitle = local ? '' : i18nTitle('nav.marketExternalTitle');
    var i;
    var el;
    for (i = 0; i < nodes.length; i++) {
        el = nodes[i];
        if (!el) continue;
        el.hidden = false;
        if (local) setLocal(el, 'market');
        else setExternal(el, official, extTitle);
    }
    return local;
};

E.applyLegalNavLinks = function () {
    var local = E.hasSitePages();
    var extTitle = local ? '' : i18nTitle('nav.legalExternalTitle');
    var i;
    var item;
    var el;
    for (i = 0; i < LEGAL_LINKS.length; i++) {
        item = LEGAL_LINKS[i];
        el = document.getElementById(item.id);
        if (!el) continue;
        if (local) setLocal(el, item.hash);
        else setExternal(el, E.officialLegalUrl(item.hash), extTitle);
    }
    return local;
};

E.applyOfficialNavLinks = function () {
    E.applyMarketplaceNavLinks();
    E.applyLegalNavLinks();
};

})();
