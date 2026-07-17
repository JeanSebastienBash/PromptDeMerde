/**
 * PromptDeMerde.com — profile-bundle-paths.js
 *
 * Synopsis : Chemins, locales et fetch helpers ProfileBundle.
 * Objectif : Initialiser PDM.ProfileBundle et utilitaires de résolution de chemins.
 */
(function() {

window.PDM = window.PDM || {};
var PB = window.PDM.ProfileBundle = window.PDM.ProfileBundle || {};
var CS = window.PDM && window.PDM.ConfigSchema;
var GPS = window.PDM && window.PDM.GenPromptSpecs;

PB.SYSTEM_PATH_TEMPLATE = 'prompts/{locale}/system.md';
PB.CONTEXT_PATH_TEMPLATE = 'contexts/{locale}/{tag}.md';
PB.GEN_PROMPT_DIR = GPS ? GPS.GEN_PROMPT_DIR : 'gen-prompts';
PB.GEN_PROMPT_SPECS = GPS ? GPS.SPECS.slice() : [];

PB.GEN_PROMPT_STORAGE_KEYS = PB.GEN_PROMPT_SPECS.map(function(spec) { return spec.storageKey; });

PB.buildDefaultGenPromptsIndex = function() {
    return {
        version: '1.0.0',
        type: 'pdm-profile-gen-prompts',
        templates: PB.GEN_PROMPT_SPECS.map(function(spec) {
            return {
                id: spec.id,
                storageKey: spec.storageKey,
                pathTemplate: PB.GEN_PROMPT_DIR + '/{locale}/' + spec.fileName
            };
        })
    };
};

PB.buildDefaultLocalesIndex = function(locales, defaultLocale) {
    var list = Array.isArray(locales) && locales.length ? locales.slice() : ['fr'];
    var def = String(defaultLocale || list[0] || 'fr');
    if (list.indexOf(def) < 0) def = list[0];
    return {
        version: '1.0.0',
        type: 'pdm-profile-locales',
        defaultLocale: def,
        locales: list
    };
};

PB.resolveLocalesIndex = function(localesIndex) {
    if (localesIndex && Array.isArray(localesIndex.locales) && localesIndex.locales.length) {
        return localesIndex;
    }
    return null;
};

PB.profileBaseUrl = function(profileId) {
    profileId = encodeURIComponent(String(profileId || '').trim());
    try {
        return new URL('assets/profiles/' + profileId + '/', document.baseURI).toString();
    } catch (e) {
        return 'assets/profiles/' + profileId + '/';
    }
};

PB.normalizeZipPath = function(entryPath) {
    var p = String(entryPath || '').replace(/\\/g, '/').replace(/^\/+/, '');
    var parts = p.split('/');
    var out = [];
    for (var i = 0; i < parts.length; i++) {
        var seg = parts[i];
        if (!seg || seg === '.') continue;
        if (seg === '..') {
            out.pop();
            continue;
        }
        out.push(seg);
    }
    return out.join('/');
};

PB.buildLocaleCandidates = function(requested, localesIndex, fileKeys) {
    var candidates = [];
    var seen = {};
    var def = localesIndex && localesIndex.defaultLocale ? String(localesIndex.defaultLocale) : 'fr';

    function push(loc) {
        loc = String(loc || '').trim();
        if (!loc || seen[loc]) return;
        seen[loc] = true;
        candidates.push(loc);
    }

    if (requested) push(requested);
    if (localesIndex && Array.isArray(localesIndex.locales)) {
        for (var a = 0; a < localesIndex.locales.length; a++) {
            push(localesIndex.locales[a]);
        }
    }
    push(def);
    push('fr');
    push('en');

    if (Array.isArray(fileKeys)) {
        var filtered = [];
        for (var c = 0; c < candidates.length; c++) {
            var loc = candidates[c];
            var sys = PB.resolvePromptPath(PB.SYSTEM_PATH_TEMPLATE, loc);
            if (fileKeys.indexOf(sys) >= 0) filtered.push(loc);
        }
        return filtered.length ? filtered : candidates;
    }
    return candidates;
};

PB.pickLocale = function(requested, localesIndex, fileKeys) {
    var candidates = PB.buildLocaleCandidates(requested, localesIndex, fileKeys);
    if (Array.isArray(fileKeys)) {
        for (var c = 0; c < candidates.length; c++) {
            var loc = candidates[c];
            var sys = PB.resolvePromptPath(PB.SYSTEM_PATH_TEMPLATE, loc);
            if (fileKeys.indexOf(sys) >= 0) return loc;
        }
    }
    return candidates.length ? candidates[0]
        : (localesIndex && localesIndex.defaultLocale ? String(localesIndex.defaultLocale) : 'fr');
};

PB.resolvePromptPath = function(template, locale, tag) {
    if (CS && typeof CS.resolvePromptPathTemplate === 'function') {
        return CS.resolvePromptPathTemplate(template, locale, tag);
    }
    return String(template || '')
        .replace(/\{locale\}/g, String(locale || ''))
        .replace(/\{tag\}/g, String(tag || ''));
};

PB._fetchText = function(url) {
    return fetch(url, { cache: 'no-store' }).then(function(res) {
        if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + url);
        return res.text();
    });
}

PB._fetchJson = function(url) {
    return fetch(url, { cache: 'no-store' }).then(function(res) {
        if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + url);
        return res.json();
    });
}

PB._validateBundleIndices = function(manifest, promptsIndex, localesIndex, genPromptsIndex) {
    if (!CS) return;
    var errors = [];
    if (typeof CS.validateProfilePromptsIndex === 'function') {
        var vp = CS.validateProfilePromptsIndex(promptsIndex);
        if (!vp.ok) errors = errors.concat(vp.errors);
    }
    if (typeof CS.validateProfileLocalesIndex === 'function') {
        var vl = CS.validateProfileLocalesIndex(localesIndex);
        if (!vl.ok) errors = errors.concat(vl.errors);
    }
    if (manifest && typeof CS.validateProfileManifestMeta === 'function') {
        var vm = CS.validateProfileManifestMeta(manifest);
        if (!vm.ok) errors = errors.concat(vm.errors);
    }
    if (genPromptsIndex && typeof CS.validateProfileGenPromptsIndex === 'function') {
        var vg = CS.validateProfileGenPromptsIndex(genPromptsIndex);
        if (!vg.ok) errors = errors.concat(vg.errors);
    } else if (!genPromptsIndex) {
        errors.push('parts/gen-prompts.json manquant.');
    }
    if (errors.length) {
        throw new Error(errors.join('\n'));
    }
}


})();
