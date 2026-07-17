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
    var s = String(label || '').trim();
    var fallback = psT('profileDefaultSlug', null, 'Profil');
    if (!s) return fallback;
    s = s.replace(/[^\w\u00C0-\u024F.-]+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
    return s || fallback;
};

PS.labelToProfileId = function(label) {
    var s = String(label || '').trim();
    if (!s) return 'custom-profile';
    s = s
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
        .toLowerCase();
    s = s.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return s || 'custom-profile';
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
    var fallback = String(defaultLabel || '').trim() || psT('profileDefaultLabel', null, 'MonProfil');
    var label = window.prompt(
        psT('profileExportPrompt', null, 'Nom du profil pour le fichier export\u00e9 (libell\u00e9 Profil JSON) :'),
        fallback
    );
    if (label === null) return null;
    label = String(label).trim();
    if (!label) {
        if (window.PDM.UI && window.PDM.UI.notif) {
            window.PDM.UI.notif(psT('exportCancelledEmpty', null, 'Export annul\u00e9 : nom vide.'), 'err');
        }
        return null;
    }
    return label;
};

PS.promptNewProfileLabel = function() {
    var label = window.prompt(psT('profileCreatePrompt', null, 'Nom du nouveau profil JSON :'), '');
    if (label === null) return null;
    label = String(label).trim();
    if (!label) {
        if (window.PDM.UI && window.PDM.UI.notif) {
            window.PDM.UI.notif(psT('createCancelledEmpty', null, 'Cr\u00e9ation annul\u00e9e : nom vide.'), 'err');
        }
        return null;
    }
    if (PS.isReservedImportName(label + '.json')) {
        if (window.PDM.UI && window.PDM.UI.notif) {
            window.PDM.UI.notif(psT('nameReservedOfficial', null, 'Ce nom est r\u00e9serv\u00e9 \u00e0 un profil officiel.'), 'err');
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
    return stem || psT('profileDefaultLabel', null, 'MonProfil');
};

PS.applyExportLabelToConfig = function(config, label, options) {
    options = options || {};
    if (!config || !label) return config;
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
