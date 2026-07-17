/**
 * PromptDeMerde.com — profile-bundle-export-parts.js
 *
 * Synopsis : Cache parts bundlés pour export multi-locale.
 * Objectif : Étendre ProfileBundleExport avec loadBundledParts et fetch locale.
 */
(function() {

window.PDM = window.PDM || {};
var PBE = window.PDM.ProfileBundleExport = window.PDM.ProfileBundleExport || {};
var PB = window.PDM && window.PDM.ProfileBundle;
var CS = window.PDM && window.PDM.ConfigSchema;

PBE._bundledPartsCache = null;

PBE.clearBundledPartsCache = function() {
    PBE._bundledPartsCache = null;
};

PBE.loadBundledParts = function(profileId) {
    profileId = String(profileId || '').trim();
    if (PBE._bundledPartsCache && PBE._bundledPartsCache.profileId === profileId) {
        return Promise.resolve(PBE._bundledPartsCache);
    }
    if (!PB || typeof PB.profileBaseUrl !== 'function') {
        return Promise.reject(new Error('ProfileBundle indisponible'));
    }
    var base = PB.profileBaseUrl(profileId);
    function fetchJson(url) {
        return fetch(url, { cache: 'no-store' }).then(function(res) {
            if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + url);
            return res.json();
        });
    }
    return Promise.all([
        fetchJson(base + 'manifest.json').catch(function() { return { id: profileId }; }),
        fetchJson(base + 'parts/config.json'),
        fetchJson(base + 'parts/prompts.json'),
        fetchJson(base + 'parts/locales.json'),
        fetchJson(base + 'parts/gen-prompts.json')
    ]).then(function(parts) {
        PBE._bundledPartsCache = {
            profileId: profileId,
            base: base,
            manifest: parts[0],
            config: parts[1],
            promptsIndex: parts[2],
            localesIndex: parts[3],
            genPromptsIndex: parts[4]
        };
        return PBE._bundledPartsCache;
    });
};

PBE.fetchBundledLocaleTexts = function(profileId, locale) {
    if (!PB || typeof PB.loadTextsForLocale !== 'function') {
        return Promise.reject(new Error('ProfileBundle.loadTextsForLocale indisponible'));
    }
    return PBE.loadBundledParts(profileId).then(function(parts) {
        return PB.loadTextsForLocale(
            parts.base, parts.promptsIndex, parts.genPromptsIndex, locale, null
        ).then(function(fileMap) {
            var system = '';
            var profiles = [];
            if (parts.promptsIndex.system && parts.promptsIndex.system.pathTemplate) {
                var sysPath = PB.resolvePromptPath(parts.promptsIndex.system.pathTemplate, locale);
                system = String(fileMap[sysPath] || '').trim();
            }
            if (Array.isArray(parts.promptsIndex.contexts)) {
                for (var i = 0; i < parts.promptsIndex.contexts.length; i++) {
                    var ctx = parts.promptsIndex.contexts[i];
                    if (!ctx) continue;
                    var ctxPath = PB.resolvePromptPath(ctx.pathTemplate, locale, ctx.tag);
                    profiles.push({
                        id: String(ctx.id),
                        tag: String(ctx.tag),
                        prompt: String(fileMap[ctxPath] || '').trim(),
                        active: !!ctx.active
                    });
                }
            }
            var gen = PB.readGenPromptsFromFiles
                ? PB.readGenPromptsFromFiles(fileMap, parts.genPromptsIndex, locale)
                : {};
            return { system: system, profiles: profiles, gen: gen };
        });
    });
};

PBE.isBundledOfficialProfile = function(profileId) {
    var I18n = window.PDM && window.PDM.I18n;
    if (I18n && typeof I18n.isBundledProfileId === 'function') {
        return I18n.isBundledProfileId(profileId);
    }
    return String(profileId || '') === 'speech2texte';
};


})();
