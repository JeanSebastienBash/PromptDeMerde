/**
 * PromptDeMerde.com — profile-bundle-io.js
 *
 * Synopsis : Chargement ProfileBundle depuis URL ou ZIP.
 * Objectif : Étendre ProfileBundle avec loadFromParts/Url/Zip et extractors.
 */
(function() {

var PB = window.PDM && window.PDM.ProfileBundle;
if (!PB) { console.warn('[profile-bundle-io.js] PDM.ProfileBundle not found.'); return; }
var CS = window.PDM && window.PDM.ConfigSchema;
var GPS = window.PDM && window.PDM.GenPromptSpecs;

PB.loadFromParts = function(baseUrl, manifest, config, promptsIndex, localesIndex, genPromptsIndex, locale, fileMap) {
    localesIndex = PB.resolveLocalesIndex(localesIndex);
    if (!localesIndex) {
        return Promise.reject(new Error('parts/locales.json requis (locales[] non vide).'));
    }
    var requestedLocale = locale != null ? String(locale) : '';
    var candidates = PB.buildLocaleCandidates(
        locale,
        localesIndex,
        fileMap ? Object.keys(fileMap) : null
    );
    if (!candidates.length) {
        candidates = [PB.pickLocale(locale, localesIndex, fileMap ? Object.keys(fileMap) : null)];
    }

    var tryIndex = 0;
    function attemptNext() {
        if (tryIndex >= candidates.length) {
            return Promise.reject(new Error('Aucune locale de prompts disponible pour ce profil.'));
        }
        var resolvedLocale = candidates[tryIndex++];
        return PB.loadTextsForLocale(baseUrl, promptsIndex, genPromptsIndex, resolvedLocale, fileMap).then(function(texts) {
            var bundle = {
                manifest: manifest || null,
                config: config,
                promptsIndex: promptsIndex,
                localesIndex: localesIndex,
                genPromptsIndex: genPromptsIndex || null,
                session: null,
                files: texts,
                locale: resolvedLocale,
                requestedLocale: requestedLocale || resolvedLocale,
                resolvedLocale: resolvedLocale,
                localeFallback: requestedLocale && resolvedLocale !== requestedLocale,
                baseUrl: baseUrl || ''
            };
            var assembled = PB.assembleToPdmConfig(bundle, resolvedLocale);
            bundle.assembled = assembled;
            return bundle;
        }).catch(function(err) {
            if (fileMap) throw err;
            return attemptNext();
        });
    }

    return attemptNext();
};

PB.loadFromUrl = function(profileId, locale) {
    profileId = String(profileId || '').trim();
    if (!profileId) {
        return Promise.reject(new Error('profil bundle : id manquant'));
    }
    var base = PB.profileBaseUrl(profileId);
    return Promise.all([
        PB._fetchJson(base + 'manifest.json').catch(function() { return { id: profileId }; }),
        PB._fetchJson(base + 'parts/config.json'),
        PB._fetchJson(base + 'parts/prompts.json'),
        PB._fetchJson(base + 'parts/locales.json'),
        PB._fetchJson(base + 'parts/gen-prompts.json')
    ]).then(function(parts) {
        PB._validateBundleIndices(parts[0], parts[2], parts[3], parts[4]);
        return PB.loadFromParts(base, parts[0], parts[1], parts[2], parts[3], parts[4], locale, null);
    });
};

PB.parseZipEntries = function(zip) {
    var files = {};
    zip.forEach(function(relativePath, file) {
        if (file.dir) return;
        var norm = PB.normalizeZipPath(relativePath);
        if (!norm) return;
        files[norm] = file;
    });
    return files;
};

PB.readZipTextEntries = function(zipFiles) {
    var paths = Object.keys(zipFiles);
    return Promise.all(paths.map(function(p) {
        return zipFiles[p].async('string').then(function(text) {
            return { path: p, text: text };
        });
    })).then(function(rows) {
        var map = {};
        for (var i = 0; i < rows.length; i++) {
            map[rows[i].path] = rows[i].text;
        }
        return map;
    });
};

PB.loadFromZip = function(arrayBuffer, locale) {
    if (typeof JSZip === 'undefined') {
        return Promise.reject(new Error('JSZip indisponible'));
    }
    return JSZip.loadAsync(arrayBuffer).then(function(zip) {
        var zipFiles = PB.parseZipEntries(zip);
        var textPaths = Object.keys(zipFiles).filter(function(p) {
            return /\.(json|md)$/i.test(p);
        });
        return Promise.all(textPaths.map(function(p) {
            return zipFiles[p].async('string').then(function(text) {
                return { path: p, text: text };
            });
        })).then(function(rows) {
            var fileMap = {};
            for (var i = 0; i < rows.length; i++) {
                fileMap[rows[i].path] = rows[i].text;
            }
            var manifest = null;
            var config = null;
            var promptsIndex = null;
            var localesIndex = null;
            var genPromptsIndex = null;
            var session = null;
            if (fileMap['manifest.json']) {
                manifest = JSON.parse(fileMap['manifest.json']);
            }
            if (fileMap['parts/config.json']) {
                config = JSON.parse(fileMap['parts/config.json']);
            }
            if (fileMap['parts/prompts.json']) {
                promptsIndex = JSON.parse(fileMap['parts/prompts.json']);
            }
            if (fileMap['parts/locales.json']) {
                localesIndex = JSON.parse(fileMap['parts/locales.json']);
            }
            if (fileMap['parts/gen-prompts.json']) {
                genPromptsIndex = JSON.parse(fileMap['parts/gen-prompts.json']);
            }
            if (fileMap['parts/session.json']) {
                session = JSON.parse(fileMap['parts/session.json']);
            }
            if (!config || !promptsIndex) {
                throw new Error('Archive invalide : manifest/parts/config.json/parts/prompts.json requis');
            }
            localesIndex = PB.resolveLocalesIndex(localesIndex);
            if (!localesIndex) {
                throw new Error('parts/locales.json requis (locales[] non vide).');
            }
            PB._validateBundleIndices(manifest, promptsIndex, localesIndex, genPromptsIndex);
            locale = PB.pickLocale(locale, localesIndex, Object.keys(fileMap));
            return PB.loadFromParts('', manifest, config, promptsIndex, localesIndex, genPromptsIndex, locale, fileMap).then(function(bundle) {
                bundle.session = session;
                bundle.rawFileMap = fileMap;
                if (session) {
                    bundle.assembled = PB.assembleToPdmConfig({
                        manifest: manifest,
                        config: config,
                        promptsIndex: promptsIndex,
                        localesIndex: localesIndex,
                        genPromptsIndex: genPromptsIndex,
                        session: session,
                        files: bundle.files,
                        locale: locale
                    }, locale);
                }
                return bundle;
            });
        });
    });
};

PB.extractI18nFromFileMap = function(fileMap) {
    if (!fileMap) return null;
    var langs = [];
    var i18n = {};
    var manifestText = fileMap['i18n/manifest.json'];
    if (manifestText) {
        try {
            var man = JSON.parse(manifestText);
            if (man && Array.isArray(man.langs)) langs = man.langs.slice();
        } catch (e) {  }
    }
    for (var path in fileMap) {
        if (!Object.prototype.hasOwnProperty.call(fileMap, path)) continue;
        var m = path.match(/^i18n\/ui\/([a-z]{2})\.json$/);
        if (!m) continue;
        try {
            i18n[m[1]] = JSON.parse(fileMap[path]);
            if (langs.indexOf(m[1]) < 0) langs.push(m[1]);
        } catch (e) {  }
    }
    if (!langs.length) return null;
    return { langs: langs, i18n: i18n };
};

PB.extractMarketplaceFromFileMap = function(fileMap) {
    if (!fileMap || !fileMap['parts/marketplace.json']) return null;
    try {
        var raw = JSON.parse(fileMap['parts/marketplace.json']);
        if (!raw || typeof raw !== 'object') return null;
        var short = raw.synopsis_short != null ? String(raw.synopsis_short).trim() : '';
        var long = raw.synopsis_long != null ? String(raw.synopsis_long).trim() : '';
        if (!short && !long) return null;
        return { synopsis_short: short, synopsis_long: long };
    } catch (e) {
        return null;
    }
};

PB.computeBundleFingerprint = function(bundle) {
    if (!bundle || !bundle.promptsIndex) return '';
    var parts = [];
    parts.push(String((bundle.manifest && bundle.manifest.id) || bundle.config && bundle.config.pdm_active_profile || ''));
    parts.push(String(bundle.locale || ''));
    parts.push(JSON.stringify(bundle.promptsIndex));
    var paths = Object.keys(bundle.files || {}).sort();
    for (var i = 0; i < paths.length; i++) {
        parts.push(paths[i] + ':' + String(bundle.files[paths[i]]).length);
    }
    if (bundle.config) {
        parts.push(String(bundle.config.pdm_theme || ''));
        parts.push(String(bundle.config.pdm_stt_engine || ''));
    }
    return parts.join('\x1e');
};


})();
