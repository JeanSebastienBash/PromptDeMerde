/**
 * PromptDeMerde.com — storage-prompts-bundle.js
 *
 * Stockage local des prompts système + contextes par locale et par profil.
 */
(function() {

var S = window.PDM && window.PDM.Storage;
if (!S) { console.warn('[storage-prompts-bundle] PDM.Storage not found.'); return; }

var PBUNDLE = window.PDM.PromptsBundle = window.PDM.PromptsBundle || {};
var PB = window.PDM && window.PDM.ProfileBundle;

var KEY = 'pdm_prompts_bundle';
var META_LOCALES_KEY = 'pdm_profile_prompt_locales';
var META_RESOLVED_KEY = 'pdm_prompts_resolved_locale';
var META_REQUESTED_KEY = 'pdm_prompts_requested_locale';
var META_FALLBACK_KEY = 'pdm_prompts_locale_fallback';

function emptyBundle() {
    return { profileId: '', langs: [], prompts: {} };
}

function readGenFromSession() {
    var gen = {};
    if (!PB || !PB.GEN_PROMPT_SPECS) return gen;
    var S = window.PDM && window.PDM.Storage;
    if (!S) return gen;
    var GPS = window.PDM && window.PDM.GenPromptSpecs;
    var getters = GPS && GPS.STORAGE_GETTERS ? GPS.STORAGE_GETTERS : {};
    for (var i = 0; i < PB.GEN_PROMPT_SPECS.length; i++) {
        var key = PB.GEN_PROMPT_SPECS[i].storageKey;
        var fn = getters[key];
        gen[key] = fn && typeof S[fn] === 'function' ? String(S[fn]() || '') : '';
    }
    return gen;
}

function applyGenToConfig(out, gen) {
    if (!gen || typeof gen !== 'object') return out;
    for (var key in gen) {
        if (Object.prototype.hasOwnProperty.call(gen, key)) {
            out[key] = String(gen[key]);
        }
    }
    return out;
}

function cloneProfiles(list) {
    var out = [];
    var src = Array.isArray(list) ? list : [];
    for (var i = 0; i < src.length; i++) {
        var p = src[i];
        if (!p) continue;
        out.push({
            id: String(p.id || ''),
            tag: String(p.tag || ''),
            prompt: String(p.prompt || ''),
            active: !!p.active
        });
    }
    return out;
}

PBUNDLE.getRaw = function() {
    var raw = S.get(KEY);
    if (!raw || typeof raw !== 'object') return emptyBundle();
    return {
        profileId: String(raw.profileId || ''),
        langs: Array.isArray(raw.langs) ? raw.langs.slice() : [],
        prompts: raw.prompts && typeof raw.prompts === 'object' ? raw.prompts : {}
    };
};

PBUNDLE.setRaw = function(bundle) {
    return S.set(KEY, bundle || emptyBundle());
};

PBUNDLE.ensureLocaleSlot = function(bundle, locale) {
    locale = String(locale || 'fr');
    if (!bundle.prompts[locale]) {
        bundle.prompts[locale] = { system: '', systemEnabled: true, profiles: [], gen: {} };
    }
    if (bundle.langs.indexOf(locale) < 0) bundle.langs.push(locale);
    return bundle.prompts[locale];
};

PBUNDLE.captureFromSession = function(locale, profileId) {
    locale = String(locale || (S.getLanguage ? S.getLanguage() : 'fr'));
    profileId = String(profileId || (S.getActiveProfile ? S.getActiveProfile() : '') || '');

    var bundle = PBUNDLE.getRaw();
    if (profileId && bundle.profileId && bundle.profileId !== profileId) {
        bundle = emptyBundle();
    }
    if (profileId) bundle.profileId = profileId;

    var slot = PBUNDLE.ensureLocaleSlot(bundle, locale);
    slot.system = S.getSystemPrompt ? S.getSystemPrompt() : '';
    slot.systemEnabled = S.isSystemPromptEnabled ? S.isSystemPromptEnabled() : true;
    slot.profiles = cloneProfiles(S.getProfiles ? S.getProfiles() : []);
    slot.gen = readGenFromSession();

    PBUNDLE.setRaw(bundle);
    return bundle;
};

PBUNDLE.getLocaleData = function(profileId, locale) {
    profileId = String(profileId || '');
    locale = String(locale || 'fr');
    var bundle = PBUNDLE.getRaw();
    if (profileId && bundle.profileId !== profileId) return null;
    var slot = bundle.prompts[locale];
    if (!slot) return null;
    return {
        system: String(slot.system || ''),
        systemEnabled: slot.systemEnabled !== false,
        profiles: cloneProfiles(slot.profiles),
        gen: slot.gen && typeof slot.gen === 'object' ? JSON.parse(JSON.stringify(slot.gen)) : {}
    };
};

PBUNDLE.applyLocaleOverlay = function(config, locale, profileId) {
    if (!config || typeof config !== 'object') return config;
    var data = PBUNDLE.getLocaleData(profileId, locale);
    if (!data) return config;

    var out = JSON.parse(JSON.stringify(config));
    out.pdm_system_prompt = data.system;
    out.pdm_system_prompt_enabled = data.systemEnabled;
    out.pdm_profiles = data.profiles.map(function(p) {
        return {
            id: p.id,
            tag: p.tag,
            prompt: p.prompt,
            active: p.active
        };
    });
    applyGenToConfig(out, data.gen);
    return out;
};

PBUNDLE.listLocales = function(profileId) {
    var bundle = PBUNDLE.getRaw();
    profileId = String(profileId || '');
    if (profileId && bundle.profileId !== profileId) return [];
    return bundle.langs.slice();
};

PBUNDLE.getExportLocales = function(profileId, seedLocales) {
    var seen = {};
    var out = [];

    function add(loc) {
        loc = String(loc || '').trim();
        if (!loc || seen[loc]) return;
        seen[loc] = true;
        out.push(loc);
    }

    if (Array.isArray(seedLocales)) {
        for (var i = 0; i < seedLocales.length; i++) add(seedLocales[i]);
    }

    var bundle = PBUNDLE.getRaw();
    profileId = String(profileId || '');
    if (!profileId || bundle.profileId === profileId) {
        for (var j = 0; j < bundle.langs.length; j++) add(bundle.langs[j]);
    }

    var stored = S.get(META_LOCALES_KEY);
    if (Array.isArray(stored)) {
        for (var k = 0; k < stored.length; k++) add(stored[k]);
    }

    return out;
};

PBUNDLE.setProfilePromptLocales = function(locales) {
    if (!Array.isArray(locales) || !locales.length) {
        S.set(META_LOCALES_KEY, []);
        return;
    }
    var seen = {};
    var out = [];
    for (var i = 0; i < locales.length; i++) {
        var loc = String(locales[i] || '').trim();
        if (!loc || seen[loc]) continue;
        seen[loc] = true;
        out.push(loc);
    }
    S.set(META_LOCALES_KEY, out);
};

PBUNDLE.setLocaleMeta = function(requested, resolved, isFallback) {
    S.set(META_REQUESTED_KEY, requested != null ? String(requested) : '');
    S.set(META_RESOLVED_KEY, resolved != null ? String(resolved) : '');
    S.set(META_FALLBACK_KEY, !!isFallback);
};

PBUNDLE.getLocaleMeta = function() {
    return {
        requested: String(S.get(META_REQUESTED_KEY) || ''),
        resolved: String(S.get(META_RESOLVED_KEY) || ''),
        fallback: !!S.get(META_FALLBACK_KEY)
    };
};

PBUNDLE.importFromFileMap = function(fileMap, promptsIndex, profileId, genPromptsIndex, localesIndex) {
    if (!fileMap || !promptsIndex) return false;

    if (!genPromptsIndex && fileMap['parts/gen-prompts.json']) {
        try {
            genPromptsIndex = JSON.parse(fileMap['parts/gen-prompts.json']);
        } catch (e) {  }
    }
    if (!localesIndex && fileMap['parts/locales.json']) {
        try {
            localesIndex = JSON.parse(fileMap['parts/locales.json']);
        } catch (e) {  }
    }
    if (PB && typeof PB.resolveLocalesIndex === 'function') {
        localesIndex = PB.resolveLocalesIndex(localesIndex);
    }
    if (!localesIndex || !Array.isArray(localesIndex.locales) || !localesIndex.locales.length) {
        return false;
    }

    var locales = localesIndex.locales.slice();

    profileId = String(profileId || (promptsIndex && promptsIndex.profileId) || '');
    var bundle = PBUNDLE.getRaw();
    if (profileId) bundle.profileId = profileId;

    for (var li = 0; li < locales.length; li++) {
        var loc = locales[li];
        var slot = PBUNDLE.ensureLocaleSlot(bundle, loc);

        if (promptsIndex.system && promptsIndex.system.pathTemplate) {
            var sysPath = PB && PB.resolvePromptPath
                ? PB.resolvePromptPath(promptsIndex.system.pathTemplate, loc)
                : ('prompts/' + loc + '/system.md');
            if (fileMap[sysPath] != null) {
                slot.system = String(fileMap[sysPath]).trim();
            }
            slot.systemEnabled = promptsIndex.system.enabled !== false;
        }

        var profiles = [];
        if (Array.isArray(promptsIndex.contexts)) {
            var defLoc = String(localesIndex.defaultLocale || locales[0] || 'fr');
            for (var i = 0; i < promptsIndex.contexts.length; i++) {
                var ctx = promptsIndex.contexts[i];
                if (!ctx) continue;
                var ctxPath = PB && PB.resolvePromptPath
                    ? PB.resolvePromptPath(ctx.pathTemplate, loc, ctx.tag)
                    : ('contexts/' + loc + '/' + ctx.tag + '.md');
                var body = fileMap[ctxPath];
                if (body == null && defLoc !== loc) {
                    var defPath = PB && PB.resolvePromptPath
                        ? PB.resolvePromptPath(ctx.pathTemplate, defLoc, ctx.tag)
                        : ('contexts/' + defLoc + '/' + ctx.tag + '.md');
                    body = fileMap[defPath];
                }
                profiles.push({
                    id: String(ctx.id),
                    tag: String(ctx.tag),
                    prompt: body != null ? String(body).trim() : '',
                    active: !!ctx.active
                });
            }
        }
        slot.profiles = profiles;
        if (genPromptsIndex && PB && typeof PB.readGenPromptsFromFiles === 'function') {
            slot.gen = PB.readGenPromptsFromFiles(fileMap, genPromptsIndex, loc);
        }
    }

    PBUNDLE.setRaw(bundle);
    PBUNDLE.setProfilePromptLocales(locales);
    return true;
};

PBUNDLE.mergeLoadedConfig = function(config, bundleResult, profileId) {
    if (!config || typeof config !== 'object') return config;

    var requested = bundleResult && bundleResult.requestedLocale
        ? String(bundleResult.requestedLocale)
        : (S.getLanguage ? S.getLanguage() : 'fr');
    var resolved = bundleResult && bundleResult.resolvedLocale
        ? String(bundleResult.resolvedLocale)
        : requested;
    var fallback = !!(bundleResult && bundleResult.localeFallback);

    if (bundleResult && bundleResult.localesIndex && Array.isArray(bundleResult.localesIndex.locales)) {
        PBUNDLE.setProfilePromptLocales(bundleResult.localesIndex.locales);
    }

    PBUNDLE.setLocaleMeta(requested, resolved, fallback);
    return PBUNDLE.applyLocaleOverlay(config, resolved, profileId);
};

})();
