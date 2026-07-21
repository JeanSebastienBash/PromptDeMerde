/**
 * PromptDeMerde.com — profile-bundle-export-map.js
 *
 * Synopsis : buildFileMap sync/async après _buildFileMapCore.
 * Objectif : Garder profile-bundle-export-build.js sous le plafond de taille.
 */
(function() {

window.PDM = window.PDM || {};
var PBE = window.PDM.ProfileBundleExport = window.PDM.ProfileBundleExport || {};

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
