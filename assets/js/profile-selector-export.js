/**
 * PromptDeMerde.com — profile-selector-export.js
 *
 * Synopsis : Orchestration export ZIP Profil JSON.
 * Objectif : Exposer exportConfigFile et l’export direct sans modale.
 */
(function() {

var PS = window.PDM && window.PDM.ProfileSelector;
if (!PS) { console.warn('[profile-selector-export.js] PDM.ProfileSelector not found.'); return; }

function psT(key, vars, fallback) {
    if (typeof PS.t === 'function') return PS.t(key, vars, fallback);
    return fallback != null ? fallback : '';
}

PS._exportConfigDirect = function(options, exportState) {
    options = options || {};
    exportState = exportState || {};
    var PBE = window.PDM && window.PDM.ProfileBundleExport;

    if (!options.profileTemplate) {
        var token = window.PDM.Storage.getToken('ollama');
        if (token && String(token).trim() && !options.skipTokenConfirm) {
            if (!confirm(psT('exportTokenConfirm', null, 'L\u2019export inclut le token API Ollama en clair. Continuer ?'))) {
                return Promise.resolve(false);
            }
        }
    }

    var defaultLabel = PS.getActiveLabel();
    var label = options.label != null ? String(options.label).trim()
        : (exportState.label || defaultLabel);
    if (!label) {
        if (window.PDM.UI && window.PDM.UI.notif) {
            window.PDM.UI.notif(psT('exportCancelledEmpty', null, 'Export annul\u00e9 : nom vide.'), 'err');
        }
        return Promise.resolve(false);
    }

    if (!PBE || typeof PBE.buildZipBlob !== 'function') {
        if (window.PDM.UI && window.PDM.UI.notif) {
            window.PDM.UI.notif(psT('exportFail', null, 'Export ZIP indisponible.'), 'err');
        }
        return Promise.resolve(false);
    }

    var promptLocales = PS._exportPromptLocales(exportState);
    var zipOpts = {
        label: label,
        language: exportState.language,
        includeI18n: exportState.includeI18n,
        i18nLangs: exportState.i18nLangs,
        promptLocales: promptLocales,
        customProfile: true,
        cleanArchive: !!exportState.cleanArchive,
        profileId: window.PDM.Storage.getActiveProfile ? window.PDM.Storage.getActiveProfile() : 'custom-profile'
    };

    var estBytes = PS._estimateExportBytes(exportState);
    if (estBytes > PS._EXPORT_SIZE_WARN_BYTES && !options.skipSizeConfirm) {
        var kb = Math.round(estBytes / 1024);
        if (!confirm(PS._exportModalT('settings.exportSizeConfirm', { size: kb },
            'Le fichier fait environ ' + kb + ' Ko. Continuer le téléchargement ?'))) {
            return Promise.resolve(false);
        }
    }

    return PBE.buildZipBlob(zipOpts).then(function(blob) {
        var ver = window.PDM.Storage && window.PDM.Storage.VERSION;
        var filename = PBE.buildZipFilename(label, ver);
        PS.downloadBlob(blob, filename);
        if (window.PDM.UI && window.PDM.UI.notif) {
            window.PDM.UI.notif(
                psT('exportedNamed', { filename: filename }, 'Archive export\u00e9e : ' + filename),
                'ok'
            );
        }
        return true;
    }).catch(function(err) {
        if (window.PDM.UI && window.PDM.UI.notif) {
            window.PDM.UI.notif(psT('exportFail', null, 'Impossible d\u2019exporter l\u2019archive.'), 'err');
        }
        console.warn('[export zip]', err);
        return false;
    });
};

PS.exportConfigFile = function(options) {
    options = options || {};
    if (!window.PDM.Storage || typeof window.PDM.Storage.exportConfig !== 'function') {
        return false;
    }

    PS._bindExportModalOnce();

    if (window.PDM.App) {
        if (window.PDM.App._wsSaveTimer) {
            clearTimeout(window.PDM.App._wsSaveTimer);
            window.PDM.App._wsSaveTimer = null;
        }
        if (typeof window.PDM.App.saveWorkspaceFromDom === 'function') {
            window.PDM.App.saveWorkspaceFromDom();
        }
        if (typeof window.PDM.App.flushPromptsFromDom === 'function') {
            window.PDM.App.flushPromptsFromDom();
        }
    }

    if (options.skipModal) {
        return PS._exportConfigDirect(options, {
            language: window.PDM.Storage.getLanguage ? window.PDM.Storage.getLanguage() : 'fr',
            includeI18n: !!options.includeI18n,
            i18nLangs: options.i18nLangs || [],
            label: options.label || PS.getActiveLabel()
        });
    }

    return PS._openExportModal(options).then(function(exportState) {
        if (!exportState) return false;
        return PS._exportConfigDirect(options, exportState);
    });
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { PS._bindExportModalOnce(); });
} else {
    PS._bindExportModalOnce();
}

})();
