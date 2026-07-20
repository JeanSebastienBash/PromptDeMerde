/**
 * PromptDeMerde.com — seo-meta.js
 * Synopsis : Stack meta SEO (OG, Twitter, keywords, canonical) synchronisée i18n + routes hash.
 * Objectif : Enrichir le head sans toucher au routage SPA ; try/catch obligatoire.
 */
(function(global) {
    'use strict';

    var SITE_URL = 'https://promptdemerde.com';
    var OG_IMAGE = SITE_URL + '/assets/homepage/demo-poster.jpg';
    var ROUTE_KEYS = {
        support: 'meta.routes.support',
        privacy: 'meta.routes.privacy',
        cgu: 'meta.routes.cgu',
        mentions: 'meta.routes.mentions',
        landing: 'meta.routes.landing',
        workspace: 'meta.routes.workspace',
        market: 'meta.routes.market'
    };

    function t(key) {
        if (!global.PDM || !global.PDM.I18n || typeof global.PDM.I18n.t !== 'function') return '';
        return global.PDM.I18n.t(key);
    }

    function upsertMeta(attr, name, content) {
        if (!content) return;
        var sel = attr === 'name' ? 'meta[name="' + name + '"]' : 'meta[property="' + name + '"]';
        var el = document.querySelector(sel);
        if (!el) {
            el = document.createElement('meta');
            if (attr === 'name') el.setAttribute('name', name);
            else el.setAttribute('property', name);
            document.head.appendChild(el);
        }
        el.setAttribute('content', content);
    }

    function upsertLink(rel, href, extra) {
        if (!href) return;
        var sel = 'link[rel="' + rel + '"]' + (extra ? '[hreflang="' + extra + '"]' : ':not([hreflang])');
        var el = document.querySelector(sel);
        if (!el) {
            el = document.createElement('link');
            el.setAttribute('rel', rel);
            if (extra) el.setAttribute('hreflang', extra);
            document.head.appendChild(el);
        }
        el.setAttribute('href', href);
    }

    function currentRoute() {
        var hash = (global.location.hash || '').replace(/^#/, '').trim().toLowerCase();
        if (!hash) return 'workspace';
        return hash;
    }

    function resolveMeta() {
        var route = currentRoute();
        var key = ROUTE_KEYS[route];
        if (key && t(key + '.title')) {
            return {
                title: t(key + '.title'),
                description: t(key + '.description'),
                keywords: t(key + '.keywords')
            };
        }
        return {
            title: t('meta.title'),
            description: t('meta.description'),
            keywords: t('meta.keywords')
        };
    }

    var SeoMeta = {
        apply: function() {
            try {
                var meta = resolveMeta();
                if (meta.title) document.title = meta.title;
                upsertMeta('name', 'description', meta.description);
                upsertMeta('name', 'keywords', meta.keywords);
                upsertMeta('name', 'robots', 'index, follow');
                upsertMeta('name', 'author', 'DreamProjectAI');

                var socialTitle = t('meta.titleSocial') || meta.title;
                upsertLink('canonical', SITE_URL + '/');
                upsertMeta('property', 'og:type', 'website');
                upsertMeta('property', 'og:title', socialTitle);
                upsertMeta('property', 'og:description', meta.description);
                upsertMeta('property', 'og:url', SITE_URL + '/');
                upsertMeta('property', 'og:image', OG_IMAGE);
                upsertMeta('property', 'og:site_name', 'PromptDeMerde.com');
                upsertMeta('name', 'twitter:card', 'summary_large_image');
                upsertMeta('name', 'twitter:title', socialTitle);
                upsertMeta('name', 'twitter:description', meta.description);
                upsertMeta('name', 'twitter:image', OG_IMAGE);
            } catch (e) {
                if (global.console && console.warn) console.warn('[SeoMeta]', e);
            }
        },
        bindHash: function() {
            if (SeoMeta._bound) return;
            SeoMeta._bound = true;
            global.addEventListener('hashchange', function() { SeoMeta.apply(); });
        }
    };

    global.PDM = global.PDM || {};
    global.PDM.SeoMeta = SeoMeta;
})(window);
