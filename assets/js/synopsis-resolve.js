/**
 * PromptDeMerde.com — synopsis-resolve.js
 *
 * Synopsis : Résolution localisée du synopsis profil (i18n + manifest fallback).
 * Objectif : Source unique pour header typing, boot et sélecteur profil.
 */
(function () {
    'use strict';

    var SR = {};

    function maxSynopsisLen() {
        var CS = window.PDM && window.PDM.ConfigSchema;
        return CS && CS.MAX_PROFILE_SYNOPSIS_LEN ? CS.MAX_PROFILE_SYNOPSIS_LEN : 100;
    }

    function segmentGraphemes(text) {
        var s = String(text || '');
        if (!s) return [];
        if (typeof Intl !== 'undefined' && Intl.Segmenter) {
            try {
                var seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
                var out = [];
                var it = seg.segment(s);
                if (it && typeof it[Symbol.iterator] === 'function') {
                    for (var entry of it) out.push(entry.segment);
                    if (out.length) return out;
                }
            } catch (e) {  }
        }
        return Array.from(s);
    }

    SR.segmentGraphemes = segmentGraphemes;

    SR.clampSynopsis = function (text) {
        var graphemes = segmentGraphemes(String(text || '').trim());
        var max = maxSynopsisLen();
        if (graphemes.length > max) graphemes = graphemes.slice(0, max);
        return graphemes.join('');
    };

    function localeDefaultLooksMissing(fullKey, translated) {
        return !translated || translated === fullKey || translated.indexOf(fullKey) === 0;
    }

    function synopsisFromI18n(profileId, locale) {
        var I = window.PDM && window.PDM.I18n;
        if (!I || typeof I.t !== 'function' || !profileId) return '';
        var key = 'profiles.' + profileId + '.synopsis';
        var val = I.t(key);
        if (localeDefaultLooksMissing(key, val)) return '';
        return String(val);
    }

    function manifestSynopsisRaw(profileId) {
        profileId = String(profileId || '').trim();
        if (!profileId) return '';

        var PS = window.PDM && window.PDM.ProfileSelector;
        if (PS && typeof PS.getBundledSynopsisRaw === 'function') {
            var fromPs = PS.getBundledSynopsisRaw(profileId);
            if (fromPs) return fromPs;
        }

        var I = window.PDM && window.PDM.I18n;
        if (I && typeof I.getBootManifest === 'function') {
            var manifest = I.getBootManifest();
            if (manifest && Array.isArray(manifest.profiles)) {
                for (var i = 0; i < manifest.profiles.length; i++) {
                    var p = manifest.profiles[i];
                    if (p && p.id === profileId && p.synopsis) return String(p.synopsis);
                }
            }
        }

        return '';
    }

    SR.resolveBundledProfileSynopsis = function (profileId, locale) {
        profileId = String(profileId || '').trim();
        if (!profileId) return '';

        var fromI18n = synopsisFromI18n(profileId, locale);
        if (fromI18n) return SR.clampSynopsis(fromI18n);

        var fromManifest = manifestSynopsisRaw(profileId);
        if (fromManifest) return SR.clampSynopsis(fromManifest);

        return '';
    };

    SR.resolveDefaultProfileSynopsis = function () {
        var CS = window.PDM && window.PDM.ConfigSchema;
        if (CS && typeof CS.getLocaleDefault === 'function') {
            return SR.clampSynopsis(CS.getLocaleDefault('DEFAULT_PROFILE_SYNOPSIS'));
        }
        return CS && CS.DEFAULT_PROFILE_SYNOPSIS ? SR.clampSynopsis(CS.DEFAULT_PROFILE_SYNOPSIS) : '';
    };

    window.PDM = window.PDM || {};
    window.PDM.SynopsisResolve = SR;
})();
