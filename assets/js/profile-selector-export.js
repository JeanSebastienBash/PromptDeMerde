/**
 * PromptDeMerde.com — profile-selector-export.js
 *
 * Synopsis : Libellés, noms de fichiers et export de configuration (Profil JSON).
 * Objectif : Étendre PDM.ProfileSelector avec les helpers de libellé et exportConfigFile.
 */
(function() {

var PS = window.PDM && window.PDM.ProfileSelector;
if (!PS) { console.warn('[profile-selector-export] PDM.ProfileSelector not found.'); return; }

PS.sanitizeFileSlug = function(label) {
    var s = String(label || '').trim();
    if (!s) return 'Profil';
    s = s.replace(/[^\w\u00C0-\u024F.-]+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
    return s || 'Profil';
};

PS.labelToProfileId = function(label) {
    var s = String(label || '').trim().toLowerCase();
    s = s.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return s || 'custom-profile';
};

PS.getActiveLabel = function() {
    var sel = PS._getSelect();
    if (sel && sel.selectedIndex >= 0 && sel.options[sel.selectedIndex]) {
        return String(sel.options[sel.selectedIndex].textContent || '').trim();
    }
    return PS._getActiveId();
};

PS.buildExportFilename = function(profileLabel, version) {
    var slug = PS.sanitizeFileSlug(profileLabel);
    var ver = version || (window.PDM.Storage && window.PDM.Storage.VERSION) || '1';
    return slug + '-promptdemerde-config-v' + ver + '.json';
};

PS.isBundledProfileId = function(id) {
    var pid = String(id || '');
    for (var i = 0; i < PS._bundledProfiles.length; i++) {
        if (PS._bundledProfiles[i] && PS._bundledProfiles[i].id === pid) return true;
    }
    return false;
};

PS.isCustomProfileId = function(id) {
    return window.PDM.Storage && typeof window.PDM.Storage.isCustomProfileId === 'function' &&
        window.PDM.Storage.isCustomProfileId(id);
};

PS.promptExportLabel = function(defaultLabel) {
    var fallback = String(defaultLabel || '').trim() || 'MonProfil';
    var label = window.prompt(
        'Nom du profil pour le fichier export\u00e9 (libell\u00e9 Profil JSON) :',
        fallback
    );
    if (label === null) return null;
    label = String(label).trim();
    if (!label) {
        if (window.PDM.UI && window.PDM.UI.notif) {
            window.PDM.UI.notif('Export annul\u00e9 : nom vide.', 'err');
        }
        return null;
    }
    return label;
};

PS.promptNewProfileLabel = function() {
    var label = window.prompt('Nom du nouveau profil JSON :', '');
    if (label === null) return null;
    label = String(label).trim();
    if (!label) {
        if (window.PDM.UI && window.PDM.UI.notif) {
            window.PDM.UI.notif('Cr\u00e9ation annul\u00e9e : nom vide.', 'err');
        }
        return null;
    }
    if (PS.isReservedImportName(label + '.json')) {
        if (window.PDM.UI && window.PDM.UI.notif) {
            window.PDM.UI.notif('Ce nom est r\u00e9serv\u00e9 \u00e0 un profil officiel.', 'err');
        }
        return null;
    }
    return label;
};

PS.inferProfileLabel = function(config, filename) {
    if (config && config.pdm_project && config.pdm_project.name) {
        return String(config.pdm_project.name).trim();
    }
    var stem = PS._getFileStem(filename || '');
    stem = stem.replace(/-promptdemerde-config-v[\d.]+$/i, '').replace(/-+/g, ' ').trim();
    return stem || 'MonProfil';
};

PS.applyExportLabelToConfig = function(config, label, options) {
    options = options || {};
    if (!config || !label) return config;
    var id = options.customProfile
        ? window.PDM.Storage.ensureCustomProfileId(PS.labelToProfileId(label))
        : PS.labelToProfileId(label);
    config.pdm_active_profile = id;
    var CS = window.PDM && window.PDM.ConfigSchema;
    var project = CS && typeof CS.buildDefaultProject === 'function'
        ? CS.buildDefaultProject()
        : {
            platform_url: 'https://promptdemerde.com',
            name: label,
            url: 'https://promptdemerde.com',
            vitrine_url: 'https://dreamproject.online'
        };
    project.name = label;
    config.pdm_project = project;
    if (options.profileTemplate && config.pdm_workspace_ui && config.pdm_workspace_ui.identity) {
        config.pdm_workspace_ui.identity.hostname = label;
    }
    return config;
};

PS.downloadConfig = function(config, filename) {
    if (!config) return false;
    var json = JSON.stringify(config, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
};

PS.exportConfigFile = function(options) {
    options = options || {};
    if (!window.PDM.Storage || typeof window.PDM.Storage.exportConfig !== 'function') {
        return false;
    }

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

    var defaultLabel = PS.getActiveLabel();
    var label = options.label != null ? String(options.label).trim() : PS.promptExportLabel(defaultLabel);
    if (!label) return false;

    if (PS.isReservedImportName(label + '.json') && !options.skipReservedConfirm) {
        if (!confirm(
            'Le nom \u00ab ' + label + ' \u00bb est r\u00e9serv\u00e9 aux profils officiels. ' +
            'Continuer quand m\u00eame ? (l\u2019import pourra \u00eatre refus\u00e9 si le fichier garde ce nom.)'
        )) {
            return false;
        }
    }

    if (!options.profileTemplate) {
        var token = window.PDM.Storage.getToken('ollama');
        if (token && String(token).trim() && !options.skipTokenConfirm) {
            if (!confirm('L\u2019export inclut le token API Ollama en clair. Continuer ?')) {
                return false;
            }
        }
    }

    var data = window.PDM.Storage.exportConfig();
    if (!data) {
        if (window.PDM.UI && window.PDM.UI.notif) {
            window.PDM.UI.notif('Impossible d\u2019exporter la configuration.', 'err');
        }
        return false;
    }

    PS.applyExportLabelToConfig(data, label, options);
    var filename = PS.buildExportFilename(label, data.version);
    PS.downloadConfig(data, filename);

    if (window.PDM.UI && window.PDM.UI.notif) {
        window.PDM.UI.notif('Configuration export\u00e9e : ' + filename, 'ok');
    }
    return true;
};

})();
