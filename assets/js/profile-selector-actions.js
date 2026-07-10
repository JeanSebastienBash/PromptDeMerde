/**
 * PromptDeMerde.com — profile-selector-actions.js
 *
 * Synopsis : Actions Profil JSON — résolution, import, enregistrement et création.
 * Objectif : Étendre PDM.ProfileSelector avec resolveProfileConfig, importProfileConfig, registerImportedConfig et createNewProfileJson.
 */
(function() {

var PS = window.PDM && window.PDM.ProfileSelector;
if (!PS) { console.warn('[profile-selector-actions] PDM.ProfileSelector not found.'); return; }

PS.flushDomBeforeProfileOp = function() {
    if (!window.PDM.App) return;
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
};

PS.resolveProfileConfig = function(profileId) {
    if (PS.isCustomProfileId(profileId)) {
        var cp = window.PDM.Storage.getCustomProfile(profileId);
        if (!cp || !cp.config) {
            return Promise.reject(new Error('Profil personnel introuvable : ' + profileId));
        }
        return Promise.resolve(cp.config);
    }
    return fetch(
        PS._withQuery(PS._getEndpoint('profileAssemble', 'lib/api/assemble.php'), 'id=' + encodeURIComponent(profileId)),
        { cache: 'no-store' }
    )
        .then(function(res) { return PS._readJsonResponse(res, 'assemblage profil'); })
        .then(function(payload) {
            if (!payload || !payload.ok || !payload.config) {
                throw new Error((payload && payload.error) ? payload.error : 'Assembly \u00e9chou\u00e9');
            }
            return payload.config;
        });
};

PS.importProfileConfig = function(config, profileId) {
    return new Promise(function(resolve, reject) {
        setTimeout(function() {
            try {
                var result = window.PDM.Storage.importConfig(config, {
                    registerCustomProfile: false
                });
                if (!result || !result.ok) {
                    reject(new Error(result && result.error ? result.error : 'Import invalide'));
                    return;
                }
                PS._setActiveId(profileId);
                resolve(profileId);
            } catch (e) {
                reject(e);
            }
        }, 0);
    });
};

PS.registerImportedConfig = function(config, options) {
    options = options || {};
    if (!config || !window.PDM.Storage) return null;
    var label = PS.inferProfileLabel(config, options.filename || '');
    var id = window.PDM.Storage.ensureCustomProfileId(
        config.pdm_active_profile || PS.labelToProfileId(label)
    );
    if (PS.isBundledProfileId(id) || PS.isBundledProfileId(id.replace(/^custom-/, ''))) {
        id = window.PDM.Storage.ensureCustomProfileId(PS.labelToProfileId(label));
    }
    config.pdm_active_profile = id;
    var snapshot = window.PDM.Storage.snapshotConfigForCustomProfile(config);
    PS.applyExportLabelToConfig(snapshot, label, { customProfile: true, profileTemplate: true });
    window.PDM.Storage.saveCustomProfile(id, label, snapshot);
    window.PDM.Storage.setActiveProfile(id);
    return { id: id, label: label };
};

PS.createNewProfileJson = function() {
    if (!window.PDM.Storage || typeof window.PDM.Storage.exportConfigForNewProfile !== 'function') {
        return false;
    }

    PS.flushDomBeforeProfileOp();

    var label = PS.promptNewProfileLabel();
    if (!label) return false;

    var id = window.PDM.Storage.ensureCustomProfileId(PS.labelToProfileId(label));
    if (PS.isBundledProfileId(id.replace(/^custom-/, ''))) {
        if (window.PDM.UI && window.PDM.UI.notif) {
            window.PDM.UI.notif('Identifiant en conflit avec un profil officiel.', 'err');
        }
        return false;
    }

    if (!confirm(
        'Cr\u00e9er le profil \u00ab ' + label + ' \u00bb et l\u2019activer ?\n' +
        'La session actuelle sera remplac\u00e9e par cette configuration.'
    )) {
        return false;
    }

    var config = window.PDM.Storage.exportConfigForNewProfile();
    PS.applyExportLabelToConfig(config, label, { customProfile: true, profileTemplate: true });
    config.pdm_active_profile = id;

    var snapshot = window.PDM.Storage.snapshotConfigForCustomProfile(config);
    window.PDM.Storage.saveCustomProfile(id, label, snapshot);

    PS._busy = true;
    var sel = PS._getSelect();
    if (sel) sel.disabled = true;
    if (window.PDM.UI && window.PDM.UI.loader) window.PDM.UI.loader(true);

    return PS.importProfileConfig(config, id)
        .then(function() {
            if (window.PDM.UI && window.PDM.UI.notif) {
                window.PDM.UI.notif('Profil \u00ab ' + label + ' \u00bb cr\u00e9\u00e9 et activ\u00e9.', 'ok');
            }
            window.location.reload();
        })
        .catch(function(err) {
            PS._busy = false;
            if (sel) sel.disabled = false;
            var message = err && err.message ? err.message : 'Erreur lors de la cr\u00e9ation du profil.';
            if (window.PDM.UI && window.PDM.UI.notif) {
                window.PDM.UI.notif(message, 'err');
            }
        })
        .finally(function() {
            if (window.PDM.UI && window.PDM.UI.loader) window.PDM.UI.loader(false);
        });
};

})();
