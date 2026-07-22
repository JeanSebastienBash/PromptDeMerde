/**
 * PromptDeMerde.com — profile-selector-actions.js
 *
 * Synopsis : Actions Profil JSON — résolution, import, enregistrement et création.
 * Objectif : Étendre PDM.ProfileSelector avec resolveProfileConfig, importProfileConfig, registerImportedConfig et createNewProfileJson.
 */
(function() {

var PS = window.PDM && window.PDM.ProfileSelector;
if (!PS) { console.warn('[profile-selector-actions] PDM.ProfileSelector not found.'); return; }

function psT(key, vars, fallback) {
    if (typeof PS.t === 'function') return PS.t(key, vars, fallback);
    return fallback != null ? fallback : '';
}

function profileSynopsis(key, label) {
    var I = window.PDM && window.PDM.I18n;
    if (I) {
        var i18nKey = key === 'imported' ? 'settings.profileImportedSynopsis' : 'workspaceUi.customProfileSynopsis';
        var val = I.t(i18nKey, { label: label });
        if (val && val.indexOf(i18nKey) !== 0) return val.slice(0, 100);
    }
    var fallback = key === 'imported'
        ? ('Profil ' + label + ' — configuration importée PromptDeMerde.')
        : ('Profil ' + label + ' — configuration personnalisée PromptDeMerde.');
    return fallback.slice(0, 100);
}

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
            return Promise.reject(new Error(psT('profileCustomNotFound', { id: profileId },
                'Profil personnel introuvable : ' + profileId)));
        }
        return Promise.resolve(cp.config);
    }
    var PB = window.PDM && window.PDM.ProfileBundle;
    var locale = 'fr';
    if (window.PDM.Storage && typeof window.PDM.Storage.getLanguage === 'function') {
        locale = window.PDM.Storage.getLanguage() || locale;
    }
    if (PB && typeof PB.loadFromUrl === 'function') {
        return PB.loadFromUrl(profileId, locale).then(function(bundle) {
            if (!bundle || !bundle.assembled) {
                throw new Error(psT('profileAssembleFailed', null, 'Assembly \u00e9chou\u00e9'));
            }
            var synopsis = PS.getBundledSynopsis(profileId);
            if (synopsis && window.PDM.Storage && typeof window.PDM.Storage.setProfileSynopsis === 'function') {
                window.PDM.Storage.setProfileSynopsis(synopsis);
            }
            var cfg = bundle.assembled;
            var PBun = window.PDM && window.PDM.PromptsBundle;
            if (PBun && typeof PBun.mergeLoadedConfig === 'function') {
                cfg = PBun.mergeLoadedConfig(cfg, bundle, profileId);
            }
            return cfg;
        });
    }
    return fetch(PS.profileJsonUrl(profileId), { cache: 'no-store' })
        .then(function(res) {
            return PS._readJsonResponse(res, psT('profileAssembleLabel', null, 'profil JSON'));
        })
        .then(function(config) {
            if (!config || typeof config !== 'object') {
                throw new Error(psT('profileAssembleFailed', null, 'Assembly \u00e9chou\u00e9'));
            }
            return config;
        });
};

PS.importProfileConfig = function(config, profileId) {
    return new Promise(function(resolve, reject) {
        setTimeout(function() {
            try {
                PS.flushDomBeforeProfileOp();
                if (!config || typeof config !== 'object') {
                    reject(new Error(psT('importFail', null, 'Import invalide')));
                    return;
                }
                var cfg = JSON.parse(JSON.stringify(config));
                cfg.pdm_active_profile = profileId;

                if (PS.isCustomProfileId(profileId)) {
                    var cp = window.PDM.Storage.getCustomProfile(profileId);
                    if (cp && cp.synopsis && typeof window.PDM.Storage.setProfileSynopsis === 'function') {
                        window.PDM.Storage.setProfileSynopsis(cp.synopsis);
                    }
                } else {
                    var bundledSyn = PS.getBundledSynopsis(profileId);
                    if (bundledSyn && typeof window.PDM.Storage.setProfileSynopsis === 'function') {
                        window.PDM.Storage.setProfileSynopsis(bundledSyn);
                    }
                }

                var result = window.PDM.Storage.importConfig(cfg, {
                    registerCustomProfile: false
                });
                if (!result || !result.ok) {
                    reject(new Error(result && result.error ? result.error : psT('importFail', null, 'Import invalide')));
                    return;
                }
                PS._setActiveId(profileId);
                PS._selectorAppliedId = profileId;
                resolve(profileId);
            } catch (e) {
                reject(e);
            }
        }, 0);
    });
};

PS._pruneDuplicateCustomProfiles = function(keepId, label) {
    if (!window.PDM.Storage || typeof window.PDM.Storage.getCustomProfiles !== 'function') return;
    var keep = window.PDM.Storage.ensureCustomProfileId(keepId);
    var normLabel = String(label || '').trim().toLowerCase();
    if (!normLabel) return;
    var list = window.PDM.Storage.getCustomProfiles();
    var next = [];
    var changed = false;
    for (var i = 0; i < list.length; i++) {
        var p = list[i];
        if (!p || !p.id) continue;
        if (p.id === keep) {
            next.push(p);
            continue;
        }
        if (String(p.label || '').trim().toLowerCase() === normLabel) {
            changed = true;
            continue;
        }
        next.push(p);
    }
    if (changed && window.PDM.Storage.set) {
        window.PDM.Storage.set(window.PDM.Storage.KEYS.CUSTOM_PROFILES, next);
    }
};

PS.registerImportedConfig = function(config, options) {
    options = options || {};
    if (!config || !window.PDM.Storage) return null;
    var label = PS.inferProfileLabel(config, options.filename || '', options);
    var id = PS.resolveCustomProfileId(config, label);
    if (PS.isBundledProfileId(id) || PS.isBundledProfileId(id.replace(/^custom-/, ''))) {
        id = window.PDM.Storage.ensureCustomProfileId(PS.labelToProfileId(label));
    }
    config.pdm_active_profile = id;
    PS._pruneDuplicateCustomProfiles(id, label);
    var snapshot = window.PDM.Storage.snapshotConfigForCustomProfile(config);
    PS.applyExportLabelToConfig(snapshot, label, {
        customProfile: true,
        profileTemplate: true,
        profileId: id
    });
    var synopsis = options.synopsis
        ? String(options.synopsis).trim()
        : profileSynopsis('imported', label);
    window.PDM.Storage.saveCustomProfile(id, label, snapshot, {
        synopsis: synopsis,
        source: options.source || '',
        tier: options.tier || 'free',
        dropFilename: options.dropFilename || ''
    });
    if (typeof window.PDM.Storage.setProfileSynopsis === 'function') {
        window.PDM.Storage.setProfileSynopsis(synopsis);
        var synLang = String(
            (config && config.pdm_language) ||
            (typeof window.PDM.Storage.getLanguage === 'function'
                ? window.PDM.Storage.getLanguage()
                : null) ||
            'fr'
        ).trim() || 'fr';
        window.PDM.Storage.set('pdm_profile_synopsis_lang', synLang);
    }
    window.PDM.Storage.setActiveProfile(id);
    PS._selectorAppliedId = id;
    if (typeof PS.populateSelector === 'function') {
        PS.populateSelector();
    }
    var sel = PS._getSelect();
    if (sel && PS._selectHasOption(sel, id)) {
        sel.value = id;
    }
    return { id: id, label: label, synopsis: synopsis };
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
            window.PDM.UI.notif(psT('profileConflict', null, 'Identifiant en conflit avec un profil officiel.'), 'err');
        }
        return false;
    }

    if (!confirm(psT('profileCreateConfirm', { label: label },
        'Cr\u00e9er le profil \u00ab ' + label + ' \u00bb et l\u2019activer ?\n' +
        'La session actuelle sera remplac\u00e9e par cette configuration.'
    ))) {
        return false;
    }

    var runCreate = function() {
        var config = window.PDM.Storage.exportConfigForNewProfile();
        PS.applyExportLabelToConfig(config, label, { customProfile: true, profileTemplate: true });
        config.pdm_active_profile = id;

        var snapshot = window.PDM.Storage.snapshotConfigForCustomProfile(config);
        window.PDM.Storage.saveCustomProfile(id, label, snapshot, {
            synopsis: profileSynopsis('custom', label),
            source: '',
            tier: 'free'
        });

        PS._busy = true;
        var sel = PS._getSelect();
        if (sel) sel.disabled = true;
        if (window.PDM.UI && window.PDM.UI.loader) window.PDM.UI.loader(true);

        return PS.importProfileConfig(config, id)
            .then(function() {
                if (window.PDM.UI && window.PDM.UI.notif) {
                    window.PDM.UI.notif(
                        psT('profileCreated', { label: label }, 'Profil \u00ab ' + label + ' \u00bb cr\u00e9\u00e9 et activ\u00e9.'),
                        'ok'
                    );
                }
                window.location.reload();
            })
            .catch(function(err) {
                PS._busy = false;
                if (sel) sel.disabled = false;
                var message = err && err.message ? err.message : psT('profileCreateError', null, 'Erreur lors de la cr\u00e9ation du profil.');
                if (window.PDM.UI && window.PDM.UI.notif) {
                    window.PDM.UI.notif(message, 'err');
                }
            })
            .finally(function() {
                if (window.PDM.UI && window.PDM.UI.loader) window.PDM.UI.loader(false);
            });
    };

    var STT = window.PDM && window.PDM.STT;
    if (STT && typeof STT.confirmDisruptiveAction === 'function' && STT.isActive && STT.isActive()) {
        STT.confirmDisruptiveAction({ reason: 'reload' }).then(function(ok) {
            if (ok) runCreate();
        });
        return false;
    }
    return runCreate();
};

})();
