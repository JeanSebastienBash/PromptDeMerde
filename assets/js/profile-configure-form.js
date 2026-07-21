/**
 * PromptDeMerde.com — profile-configure-form.js
 *
 * Synopsis : Hydratation / enregistrement Groupe A (brand, identity, texts, project, synopsis).
 * Objectif : Écrire Storage + apply live WorkspaceUi ; maj snapshot profil perso si actif.
 */
(function() {

var PS = window.PDM && window.PDM.ProfileSelector;
if (!PS) { console.warn('[profile-configure-form.js] PDM.ProfileSelector not found.'); return; }

function val(id) {
    var el = document.getElementById(id);
    return el ? String(el.value || '').trim() : '';
}

function setVal(id, v) {
    var el = document.getElementById(id);
    if (el) el.value = v != null ? String(v) : '';
}

PS._hydrateConfigureForm = function() {
    var S = window.PDM && window.PDM.Storage;
    if (!S) return;
    var ui = S.getWorkspaceUiEffective ? S.getWorkspaceUiEffective() : {};
    var brand = ui.brand || {};
    var identity = ui.identity || {};
    var project = S.getProjectEffective ? S.getProjectEffective() : {};
    setVal('cfg-brand-first', brand.firstWord);
    setVal('cfg-brand-second', brand.secondWord);
    setVal('cfg-brand-color1', brand.firstWordColor);
    setVal('cfg-brand-color2', brand.secondWordColor);
    var showExt = document.getElementById('cfg-brand-show-ext');
    if (showExt) showExt.checked = brand.showExtension !== false;
    setVal('cfg-id-user', identity.username);
    setVal('cfg-id-alt', identity.usernameAlt);
    setVal('cfg-id-host', identity.hostname);
    setVal('cfg-proj-name', project.name);
    setVal('cfg-proj-url', project.url);
    setVal('cfg-proj-platform', project.platform_url);
    setVal('cfg-proj-vitrine', project.vitrine_url);
    setVal('cfg-synopsis', S.getProfileSynopsis ? S.getProfileSynopsis() : '');
    PS._buildConfigureTextsList(ui.texts || {});
    PS._refreshConfigureBrandPreview();
    if (!PS._configurePreviewBound) {
        PS._configurePreviewBound = true;
        ['cfg-brand-first', 'cfg-brand-second', 'cfg-brand-color1', 'cfg-brand-color2'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.addEventListener('input', function() { PS._refreshConfigureBrandPreview(); });
        });
    }
};

PS._refreshConfigureBrandPreview = function() {
    var preview = document.getElementById('cfg-brand-preview');
    if (!preview) return;
    var a = val('cfg-brand-first') || 'Prompt';
    var b = val('cfg-brand-second') || 'DeMerde';
    var c1 = val('cfg-brand-color1');
    var c2 = val('cfg-brand-color2');
    var s1 = c1 ? ' style="color:' + c1 + '"' : '';
    var s2 = c2 ? ' style="color:' + c2 + '"' : ' class="red"';
    preview.innerHTML = '<span' + s1 + '>' + a + '</span><span' + s2 + '>' + b + '</span>';
};

PS._saveConfigureForm = function() {
    var S = window.PDM && window.PDM.Storage;
    if (!S || !S.setWorkspaceUi) return false;
    var first = val('cfg-brand-first');
    var second = val('cfg-brand-second');
    var user = val('cfg-id-user');
    var host = val('cfg-id-host');
    if (!first || !second || !user || !host) return false;
    var ui = S.getWorkspaceUiEffective ? JSON.parse(JSON.stringify(S.getWorkspaceUiEffective())) : {};
    ui.brand = ui.brand || {};
    ui.identity = ui.identity || {};
    ui.brand.firstWord = first;
    ui.brand.secondWord = second;
    ui.brand.firstWordColor = val('cfg-brand-color1');
    ui.brand.secondWordColor = val('cfg-brand-color2');
    var showExt = document.getElementById('cfg-brand-show-ext');
    ui.brand.showExtension = !!(showExt && showExt.checked);
    ui.identity.username = user;
    ui.identity.usernameAlt = val('cfg-id-alt') || user;
    ui.identity.hostname = host;
    ui.texts = Object.assign({}, ui.texts || {}, PS._collectConfigureTexts());
    if (!S.setWorkspaceUi(ui)) return false;
    var project = S.getProjectEffective ? JSON.parse(JSON.stringify(S.getProjectEffective())) : {};
    project.name = val('cfg-proj-name') || project.name || first + second;
    project.url = val('cfg-proj-url') || project.url;
    project.platform_url = val('cfg-proj-platform') || project.platform_url;
    project.vitrine_url = val('cfg-proj-vitrine') || project.vitrine_url;
    if (S.setProject) S.setProject(project);
    if (S.setProfileSynopsis) S.setProfileSynopsis(val('cfg-synopsis'));
    if (window.PDM.WorkspaceUi && typeof window.PDM.WorkspaceUi.apply === 'function') {
        window.PDM.WorkspaceUi.apply();
    }
    PS._syncActiveCustomSnapshot();
    return true;
};

PS._syncActiveCustomSnapshot = function() {
    var S = window.PDM && window.PDM.Storage;
    if (!S || !S.isCustomProfileId || !S.getActiveProfile) return;
    var id = S.getActiveProfile();
    if (!S.isCustomProfileId(id)) return;
    if (typeof S.exportConfig !== 'function' || typeof S.saveCustomProfile !== 'function') return;
    var config = S.exportConfig({ includeI18n: false });
    var label = PS.getActiveLabel ? PS.getActiveLabel() : id;
    var synopsis = S.getProfileSynopsis ? S.getProfileSynopsis() : '';
    S.saveCustomProfile(id, label, config, { synopsis: synopsis });
};

})();
