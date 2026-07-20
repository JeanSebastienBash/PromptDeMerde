/**
 * PromptDeMerde.com — profile-bundle-export-build.js
 *
 * Synopsis : Assemblage filemap export sync/async.
 * Objectif : Étendre ProfileBundleExport avec buildFileMap et i18n append.
 */
(function() {

window.PDM = window.PDM || {};
var PBE = window.PDM.ProfileBundleExport = window.PDM.ProfileBundleExport || {};
var PB = window.PDM && window.PDM.ProfileBundle;
var CS = window.PDM && window.PDM.ConfigSchema;

PBE._buildFileMapCore = function(options) {
    options = options || {};
    var S = window.PDM && window.PDM.Storage;
    if (!S) return { files: {}, manifest: null };

    var label = String(options.label || 'MonProfil').trim();
    var profileId = options.profileId || S.getActiveProfile() || 'custom-profile';
    var language = options.language || (S.getLanguage ? S.getLanguage() : 'fr');
    var promptLocales = Array.isArray(options.promptLocales) && options.promptLocales.length
        ? options.promptLocales.slice()
        : [language];
    if (promptLocales.indexOf(language) < 0) promptLocales.unshift(language);

    var PBun = window.PDM && window.PDM.PromptsBundle;
    if (PBun && typeof PBun.captureFromSession === 'function') {
        PBun.captureFromSession(language, profileId);
    }
    if (PBun && typeof PBun.getExportLocales === 'function') {
        promptLocales = PBun.getExportLocales(profileId, promptLocales);
    }

    var systemPrompt = S.getSystemPrompt ? S.getSystemPrompt() : '';
    var systemEnabled = S.getSystemPromptEnabled ? S.getSystemPromptEnabled() : true;
    var profiles = S.getProfiles ? S.getProfiles() : [];

    var exported = S.exportConfig ? S.exportConfig({ language: language, includeI18n: false }) : {};
    var config = { version: exported.version, type: 'pdm-config', exportedAt: new Date().toISOString() };
    var session = { version: exported.version, type: 'pdm-session', exportedAt: config.exportedAt };
    var i;

    for (i = 0; i < PBE.CONFIG_KEYS.length; i++) {
        var ck = PBE.CONFIG_KEYS[i];
        if (exported[ck] !== undefined) config[ck] = exported[ck];
    }
    for (i = 0; i < PBE.SESSION_KEYS.length; i++) {
        var sk = PBE.SESSION_KEYS[i];
        if (exported[sk] !== undefined) session[sk] = exported[sk];
    }
    config.pdm_language = language;
    session.pdm_language = language;
    delete config.pdm_system_prompt;
    delete config.pdm_profiles;
    for (i = 0; i < PBE.GEN_PROMPT_CONFIG_KEYS.length; i++) {
        delete config[PBE.GEN_PROMPT_CONFIG_KEYS[i]];
    }

    var promptsIndex = PBE.buildPromptsIndex(profiles, systemEnabled);
    var localesIndex = PBE.buildLocalesIndex(promptLocales, promptLocales[0] || language);
    var genPromptsIndex = PBE.buildGenPromptsIndex();

    var manifest = PBE.buildManifest(label, profileId);
    manifest.id = options.customProfile ? profileId : manifest.id;

    var files = {};
    files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
    files['parts/config.json'] = JSON.stringify(config, null, 2) + '\n';
    files['parts/locales.json'] = JSON.stringify(localesIndex, null, 2) + '\n';
    files['parts/prompts.json'] = JSON.stringify(promptsIndex, null, 2) + '\n';
    files['parts/gen-prompts.json'] = JSON.stringify(genPromptsIndex, null, 2) + '\n';
    files['parts/session.json'] = JSON.stringify(session, null, 2) + '\n';

    return {
        files: files,
        manifest: manifest,
        config: config,
        localesIndex: localesIndex,
        promptsIndex: promptsIndex,
        genPromptsIndex: genPromptsIndex,
        session: session,
        profileId: profileId,
        language: language,
        promptLocales: promptLocales,
        systemPrompt: systemPrompt,
        profiles: profiles,
        PBun: PBun,
        S: S
    };
};

PBE._appendI18nFiles = function(files, options) {
    if (options.includeI18n && window.PDM.I18n && window.PDM.I18n.getExportBundle) {
        var i18nLangs = Array.isArray(options.i18nLangs) ? options.i18nLangs.slice() : [];
        if (i18nLangs.length) {
            var bundle = window.PDM.I18n.getExportBundle(i18nLangs);
            if (bundle && bundle.i18n) {
                files['i18n/manifest.json'] = JSON.stringify({ langs: bundle.langs }, null, 2) + '\n';
                for (var lang in bundle.i18n) {
                    if (Object.prototype.hasOwnProperty.call(bundle.i18n, lang)) {
                        files['i18n/ui/' + lang + '.json'] = JSON.stringify(bundle.i18n[lang], null, 2) + '\n';
                    }
                }
            }
        }
    }
};

PBE._writeLocaleExport = function(core, loc, bundled) {
    var locData = core.PBun && typeof core.PBun.getLocaleData === 'function'
        ? core.PBun.getLocaleData(core.profileId, loc)
        : null;
    var profiles = PBE.profilesAlignedToIndex(
        core.profiles,
        locData && locData.profiles
    );
    if (locData) {
        PBE.writePromptMdFiles(core.files, loc, locData.system || core.systemPrompt, profiles);
        if (locData.gen && typeof locData.gen === 'object') {
            PBE.writeGenPromptMdFiles(core.files, loc, locData.gen);
        } else if (loc === core.language) {
            PBE.writeGenPromptMdFiles(core.files, loc, PBE.collectGenPromptValues(core.S, null));
        }
        return Promise.resolve();
    }
    if (bundled) {
        return PBE.fetchBundledLocaleTexts(core.profileId, loc).then(function(depot) {
            var depotProfiles = PBE.profilesAlignedToIndex(core.profiles, depot.profiles);
            PBE.writePromptMdFiles(core.files, loc, depot.system, depotProfiles);
            PBE.writeGenPromptMdFiles(core.files, loc, depot.gen);
        });
    }
    if (loc === core.language) {
        PBE.writePromptMdFiles(core.files, loc, core.systemPrompt, profiles);
        PBE.writeGenPromptMdFiles(core.files, loc, PBE.collectGenPromptValues(core.S, null));
    } else {
        PBE.writePromptMdFiles(core.files, loc, core.systemPrompt, profiles);
    }
    return Promise.resolve();
};

PBE.buildFileMapAsync = function(options) {
    options = options || {};
    var core = PBE._buildFileMapCore(options);
    if (!core.S) return Promise.resolve({ files: {}, manifest: null });
    var bundled = PBE.isBundledOfficialProfile(core.profileId);
    var chain = Promise.resolve();
    for (var i = 0; i < core.promptLocales.length; i++) {
        (function(loc) {
            chain = chain.then(function() {
                return PBE._writeLocaleExport(core, loc, bundled);
            });
        })(core.promptLocales[i]);
    }
    return chain.then(function() {
        PBE._appendI18nFiles(core.files, options);
        return {
            files: core.files,
            manifest: core.manifest,
            config: core.config,
            localesIndex: core.localesIndex,
            promptsIndex: core.promptsIndex,
            genPromptsIndex: core.genPromptsIndex,
            session: core.session
        };
    });
};

PBE.buildFileMap = function(options) {
    options = options || {};
    var core = PBE._buildFileMapCore(options);
    if (!core.S) return { files: {}, manifest: null };
    var bundled = PBE.isBundledOfficialProfile(core.profileId);
    for (var i = 0; i < core.promptLocales.length; i++) {
        var loc = core.promptLocales[i];
        var locData = core.PBun && typeof core.PBun.getLocaleData === 'function'
            ? core.PBun.getLocaleData(core.profileId, loc)
            : null;
        var profiles = PBE.profilesAlignedToIndex(
            core.profiles,
            locData && locData.profiles
        );
        if (locData) {
            PBE.writePromptMdFiles(core.files, loc, locData.system || core.systemPrompt, profiles);
            if (locData.gen && typeof locData.gen === 'object') {
                PBE.writeGenPromptMdFiles(core.files, loc, locData.gen);
            }
        } else if (loc === core.language) {
            PBE.writePromptMdFiles(core.files, loc, core.systemPrompt, profiles);
            PBE.writeGenPromptMdFiles(core.files, loc, PBE.collectGenPromptValues(core.S, null));
        } else if (!bundled) {
            PBE.writePromptMdFiles(core.files, loc, core.systemPrompt, profiles);
        }
    }
    PBE._appendI18nFiles(core.files, options);
    return {
        files: core.files,
        manifest: core.manifest,
        config: core.config,
        localesIndex: core.localesIndex,
        promptsIndex: core.promptsIndex,
        genPromptsIndex: core.genPromptsIndex,
        session: core.session
    };
};


})();
