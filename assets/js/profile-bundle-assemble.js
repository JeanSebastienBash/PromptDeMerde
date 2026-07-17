/**
 * PromptDeMerde.com — profile-bundle-assemble.js
 *
 * Synopsis : Assemblage fichiers → pdm-config.
 * Objectif : Étendre ProfileBundle avec read/collect/assemble.
 */
(function() {

var PB = window.PDM && window.PDM.ProfileBundle;
if (!PB) { console.warn('[profile-bundle-assemble.js] PDM.ProfileBundle not found.'); return; }
var CS = window.PDM && window.PDM.ConfigSchema;
var GPS = window.PDM && window.PDM.GenPromptSpecs;

PB.readFileFromMap = function(files, relPath) {
    if (!files || !relPath) return null;
    var key = PB.normalizeZipPath(relPath);
    if (Object.prototype.hasOwnProperty.call(files, key)) {
        return files[key];
    }
    return null;
};

PB.collectRequiredPaths = function(promptsIndex, genPromptsIndex, locale) {
    var paths = [];
    if (promptsIndex) {
        if (promptsIndex.system && promptsIndex.system.pathTemplate) {
            paths.push(PB.resolvePromptPath(promptsIndex.system.pathTemplate, locale));
        }
        if (Array.isArray(promptsIndex.contexts)) {
            for (var i = 0; i < promptsIndex.contexts.length; i++) {
                var ctx = promptsIndex.contexts[i];
                if (!ctx || !ctx.pathTemplate) continue;
                paths.push(PB.resolvePromptPath(ctx.pathTemplate, locale, ctx.tag));
            }
        }
    }
    if (genPromptsIndex && Array.isArray(genPromptsIndex.templates)) {
        for (var t = 0; t < genPromptsIndex.templates.length; t++) {
            var tpl = genPromptsIndex.templates[t];
            if (!tpl || !tpl.pathTemplate) continue;
            paths.push(PB.resolvePromptPath(tpl.pathTemplate, locale));
        }
    }
    return paths;
};

PB.collectGenPromptPaths = function(genPromptsIndex, locale) {
    return PB.collectRequiredPaths(null, genPromptsIndex, locale);
};

PB.readGenPromptsFromFiles = function(files, genPromptsIndex, locale) {
    var out = {};
    if (!genPromptsIndex || !Array.isArray(genPromptsIndex.templates)) return out;
    locale = locale || 'fr';
    for (var i = 0; i < genPromptsIndex.templates.length; i++) {
        var tpl = genPromptsIndex.templates[i];
        if (!tpl || !tpl.storageKey || !tpl.pathTemplate) continue;
        var rel = PB.resolvePromptPath(tpl.pathTemplate, locale);
        if (files && files[rel] != null) {
            out[tpl.storageKey] = String(files[rel]).trim();
        }
    }
    return out;
};

PB.loadTextsForLocale = function(baseUrl, promptsIndex, genPromptsIndex, locale, fileMap) {
    var paths = PB.collectRequiredPaths(promptsIndex, genPromptsIndex, locale);
    if (fileMap) {
        var out = {};
        for (var i = 0; i < paths.length; i++) {
            var p = paths[i];
            var txt = PB.readFileFromMap(fileMap, p);
            if (txt == null) {
                return Promise.reject(new Error('Fichier MD manquant dans l\'archive : ' + p));
            }
            out[p] = String(txt);
        }
        return Promise.resolve(out);
    }
    return Promise.all(paths.map(function(p) {
        var url = baseUrl + p.split('/').map(encodeURIComponent).join('/');
        return PB._fetchText(url).then(function(text) {
            return { path: p, text: text };
        });
    })).then(function(results) {
        var map = {};
        for (var j = 0; j < results.length; j++) {
            map[results[j].path] = results[j].text;
        }
        return map;
    });
};

PB.assembleToPdmConfig = function(bundle, locale) {
    if (!bundle || !bundle.config || !bundle.promptsIndex) {
        throw new Error('Bundle incomplet');
    }
    locale = locale || bundle.locale || (bundle.localesIndex && bundle.localesIndex.defaultLocale) || 'fr';
    var cfg = JSON.parse(JSON.stringify(bundle.config));
    var idx = bundle.promptsIndex;
    var files = bundle.files || {};

    if (idx.system && idx.system.pathTemplate) {
        var sysPath = PB.resolvePromptPath(idx.system.pathTemplate, locale);
        var sysText = files[sysPath];
        if (sysText == null) {
            throw new Error('Prompt système introuvable : ' + sysPath);
        }
        cfg.pdm_system_prompt = String(sysText).trim();
        cfg.pdm_system_prompt_enabled = idx.system.enabled !== false;
    }

    var profiles = [];
    if (Array.isArray(idx.contexts)) {
        for (var i = 0; i < idx.contexts.length; i++) {
            var ctx = idx.contexts[i];
            if (!ctx) continue;
            var ctxPath = PB.resolvePromptPath(ctx.pathTemplate, locale, ctx.tag);
            var body = files[ctxPath];
            if (body == null) {
                throw new Error('Contexte MD introuvable : ' + ctxPath);
            }
            profiles.push({
                id: String(ctx.id),
                tag: String(ctx.tag),
                prompt: String(body).trim(),
                active: !!ctx.active,
                origin: {
                    method: 'profile_bundle',
                    sourceFile: ctxPath
                }
            });
        }
    }
    cfg.pdm_profiles = profiles;

    var genTexts = PB.readGenPromptsFromFiles(files, bundle.genPromptsIndex, locale);
    for (var gk in genTexts) {
        if (Object.prototype.hasOwnProperty.call(genTexts, gk)) {
            cfg[gk] = genTexts[gk];
        }
    }

    if (bundle.session && typeof bundle.session === 'object') {
        for (var sk in bundle.session) {
            if (!Object.prototype.hasOwnProperty.call(bundle.session, sk)) continue;
            if (sk === 'type' || sk === 'version' || sk === 'exportedAt') continue;
            if (sk.indexOf('pdm_') === 0) {
                cfg[sk] = bundle.session[sk];
            }
        }
    }

    cfg.type = (CS && CS.CONFIG_TYPE) ? CS.CONFIG_TYPE : 'pdm-config';
    if (!cfg.version && bundle.config && bundle.config.version) {
        cfg.version = bundle.config.version;
    }

    if (bundle.manifest && bundle.manifest.id && !cfg.pdm_active_profile) {
        cfg.pdm_active_profile = String(bundle.manifest.id);
    }

    return cfg;
};


})();
