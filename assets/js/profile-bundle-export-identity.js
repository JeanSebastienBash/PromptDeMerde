/**
 * PromptDeMerde.com — profile-bundle-export-identity.js
 *
 * Synopsis : Identité export ZIP (label, hostname) et mode archive propre.
 * Objectif : Graver le label dans config/manifest sans muter la session live ; neutraliser les valeurs perso.
 */
(function() {

window.PDM = window.PDM || {};
var PBE = window.PDM.ProfileBundleExport = window.PDM.ProfileBundleExport || {};

PBE.stampExportLabelOnConfig = function(config, label, exportId) {
    if (!config || !label) return config;
    var project = config.pdm_project
        ? JSON.parse(JSON.stringify(config.pdm_project))
        : {
            platform_url: 'https://promptdemerde.com',
            name: label,
            url: 'https://promptdemerde.com',
            vitrine_url: 'https://dreamproject.online'
        };
    project.name = String(label);
    config.pdm_project = project;
    if (exportId) config.pdm_active_profile = String(exportId);
    if (config.pdm_workspace_ui && config.pdm_workspace_ui.identity) {
        config.pdm_workspace_ui = JSON.parse(JSON.stringify(config.pdm_workspace_ui));
        config.pdm_workspace_ui.identity.hostname = String(label);
    }
    return config;
};

PBE.neutralizeCleanSession = function(session) {
    if (!session || typeof session !== 'object') return session;
    var out = JSON.parse(JSON.stringify(session));
    var CS = window.PDM && window.PDM.ConfigSchema;
    out.pdm_clean_history = [];
    out.pdm_history_count = 0;
    out.pdm_workspace = Object.assign(
        { input: '', output: '', thinking: '', savedAt: null, contextPanelOpen: false },
        CS && typeof CS.emptyAudioMeta === 'function' ? CS.emptyAudioMeta() : {}
    );
    out.pdm_audio_blobs = {};
    out.pdm_token_ollama = '';
    out.pdm_ollama_url = 'http://localhost:11434';
    return out;
};

})();
