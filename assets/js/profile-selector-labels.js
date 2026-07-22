/**
 * PromptDeMerde.com — profile-selector-labels.js
 *
 * Synopsis : Libellés, slugs et téléchargements Profil JSON.
 * Objectif : Étendre PDM.ProfileSelector avec helpers de libellé et download.
 */
(function() {

var PS = window.PDM && window.PDM.ProfileSelector;
if (!PS) { console.warn('[profile-selector-labels.js] PDM.ProfileSelector not found.'); return; }

function psT(key, vars, fallback) {
    if (typeof PS.t === 'function') return PS.t(key, vars, fallback);
    return fallback != null ? fallback : '';
}

PS.sanitizeFileSlug = function(label) {
    var PN = window.PDM && window.PDM.ProfileName;
    var fallback = psT('profileDefaultSlug', null, 'Profil');
    if (PN && typeof PN.sanitizeFileSlug === 'function') {
        return PN.sanitizeFileSlug(label, fallback);
    }
    return fallback;
};

PS.toPascalProfileName = function(label) {
    var PN = window.PDM && window.PDM.ProfileName;
    if (PN && typeof PN.toPascalProfileName === 'function') {
        return PN.toPascalProfileName(label);
    }
    return String(label || '').trim();
};

PS.normalizeProfileLabel = function(label) {
    var PN = window.PDM && window.PDM.ProfileName;
    if (PN && typeof PN.normalizeOrEmpty === 'function') {
        return PN.normalizeOrEmpty(label);
    }
    return String(label || '').trim();
};

PS.labelToProfileId = function(label) {
    var pascal = PS.normalizeProfileLabel(label) || PS.toPascalProfileName(label);
    if (!pascal) return 'profile';
    return pascal.toLowerCase();
};

PS.resolveCustomProfileId = function(config, label) {
    var raw = config && config.pdm_active_profile != null
        ? String(config.pdm_active_profile).trim()
        : '';
    if (raw) {
        return window.PDM.Storage.ensureCustomProfileId(raw);
    }
    return window.PDM.Storage.ensureCustomProfileId(PS.labelToProfileId(label));
};

PS.getActiveLabel = function() {
    var sel = PS._getSelect();
    var raw = '';
    if (sel && sel.selectedIndex >= 0 && sel.options[sel.selectedIndex]) {
        raw = String(sel.options[sel.selectedIndex].textContent || '').trim();
    } else {
        raw = String(PS._getActiveId() || '').trim();
    }
    return PS.stripProfileOptionSuffixes(raw);
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
    var fallback = PS.normalizeProfileLabel(defaultLabel) ||
        psT('profileDefaultLabel', null, 'MonProfil');
    var label = window.prompt(
        psT('profileExportPrompt', null, 'Nom du profil (PascalCase, sans tiret ni espace) :'),
        fallback
    );
    if (label === null) return null;
    label = PS.normalizeProfileLabel(label);
    if (!label) {
        if (window.PDM.UI && window.PDM.UI.notif) {
            window.PDM.UI.notif(psT('profileNamePascalInvalid', null,
                'Nom de profil invalide. Utiliser PascalCase sans tiret ni espace (ex. PromptListStructurator).'), 'err');
        }
        return null;
    }
    return label;
};

PS.promptNewProfileLabel = function() {
    var label = window.prompt(
        psT('profileCreatePrompt', null, 'Nom du nouveau profil (PascalCase, sans tiret ni espace) :'),
        ''
    );
    if (label === null) return null;
    label = PS.normalizeProfileLabel(label);
    if (!label) {
        if (window.PDM.UI && window.PDM.UI.notif) {
            window.PDM.UI.notif(psT('profileNamePascalInvalid', null,
                'Nom de profil invalide. Utiliser PascalCase sans tiret ni espace (ex. PromptListStructurator).'), 'err');
        }
        return null;
    }
    if (PS.isReservedImportName(label + '.json') || PS.isReservedImportName(label + '.zip')) {
        if (window.PDM.UI && window.PDM.UI.notif) {
            window.PDM.UI.notif(psT('nameReservedOfficial', null, 'Ce nom est r\u00e9serv\u00e9 \u00e0 un profil officiel.'), 'err');
        }
        return null;
    }
    return label;
};

PS.inferProfileLabel = function(config, filename, options) {
    options = options || {};
    var exportLabel = options.exportLabel != null ? String(options.exportLabel).trim() : '';
    if (exportLabel) {
        return PS.normalizeProfileLabel(exportLabel) || PS.toPascalProfileName(exportLabel) || exportLabel;
    }
    if (config && config.pdm_project && config.pdm_project.name) {
        var projectName = String(config.pdm_project.name).trim();
        if (projectName) {
            return PS.normalizeProfileLabel(projectName) || PS.toPascalProfileName(projectName) || projectName;
        }
    }
    var stem = PS._getFileStem(filename || '');
    stem = stem
        .replace(/-(?:JsonProfile|promptdemerde-profile)-v[\d.]+$/i, '')
        .replace(/-promptdemerde-config-v[\d.]+$/i, '');
    var pascal = PS.normalizeProfileLabel(stem) || PS.toPascalProfileName(stem);
    return pascal || psT('profileDefaultLabel', null, 'MonProfil');
};

PS.applyExportLabelToConfig = function(config, label, options) {
    options = options || {};
    if (!config || !label) return config;
    label = PS.normalizeProfileLabel(label) || PS.toPascalProfileName(label) || label;
    var id = options.profileId
        ? window.PDM.Storage.ensureCustomProfileId(options.profileId)
        : (options.customProfile
            ? window.PDM.Storage.ensureCustomProfileId(PS.labelToProfileId(label))
            : PS.labelToProfileId(label));
    config.pdm_active_profile = id;
    var CS = window.PDM && window.PDM.ConfigSchema;
    var project = (window.PDM.Storage && typeof window.PDM.Storage.getProjectEffective === 'function')
        ? window.PDM.Storage.getProjectEffective()
        : (CS && typeof CS.buildDefaultProject === 'function' ? CS.buildDefaultProject() : {
            platform_url: 'https://promptdemerde.com',
            name: label,
            url: 'https://promptdemerde.com',
            vitrine_url: 'https://dreamproject.online'
        });
    project.name = label;
    config.pdm_project = JSON.parse(JSON.stringify(project));
    if (window.PDM.Storage && typeof window.PDM.Storage.setProject === 'function') {
        window.PDM.Storage.setProject(config.pdm_project);
    }
    if (options.profileTemplate && config.pdm_workspace_ui && config.pdm_workspace_ui.identity) {
        config.pdm_workspace_ui.identity.hostname = label;
    }
    return config;
};

PS.downloadBlob = function(blob, filename) {
    if (!blob) return false;
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

})();
