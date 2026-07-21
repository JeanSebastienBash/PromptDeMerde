/**
 * PromptDeMerde.com — storage-workspace-ui.js
 *
 * Synopsis : Persistance et sync des textes chrome Workspace UI.
 * Objectif : Étendre PDM.Storage pour workspace UI sans verrouiller la langue d’import.
 */
(function(){

var S = window.PDM && window.PDM.Storage;
if (!S) { console.warn('[storage-workspace-ui.js] PDM.Storage not found.'); return; }

function workspaceUiHasExplicitTexts(ui, CS) {
    if (!CS || typeof CS.isPlainObject !== 'function' || !CS.isPlainObject(ui)) return false;
    var rawTexts = ui.texts;
    if (!CS.isPlainObject(rawTexts)) return false;
    for (var rk in rawTexts) {
        if (!Object.prototype.hasOwnProperty.call(rawTexts, rk)) continue;
        if (rawTexts[rk] == null) continue;
        if (String(rawTexts[rk]).trim() === '') continue;
        return true;
    }
    return false;
}

function mergeBundleWorkspaceUiTexts(current, fromBundle) {
    var changed = false;
    current.texts = current.texts || {};
    for (var bk in fromBundle) {
        if (!Object.prototype.hasOwnProperty.call(fromBundle, bk)) continue;
        if (fromBundle[bk] == null) continue;
        var bv = String(fromBundle[bk]);
        if (current.texts[bk] !== bv) {
            current.texts[bk] = bv;
            changed = true;
        }
    }
    return changed;
}

function fillEmptyWorkspaceUiTexts(current, localized) {
    var changed = false;
    if (!localized || !localized.texts || !current.texts) return false;
    for (var k in localized.texts) {
        if (!Object.prototype.hasOwnProperty.call(localized.texts, k)) continue;
        if (localized.texts[k] == null) continue;
        var cur = current.texts[k];
        if (cur != null && String(cur).trim() !== '') continue;
        current.texts[k] = String(localized.texts[k]);
        changed = true;
    }
    return changed;
}

S.getWorkspaceUi = function() {
    var v = S.get(S.KEYS.WORKSPACE_UI);
    if (v && typeof v === 'object' && !Array.isArray(v)) return v;
    return null;
};
S.setWorkspaceUi = function(ui) {
    var CS = window.PDM && window.PDM.ConfigSchema;
    var normalized = CS && typeof CS.normalizeWorkspaceUi === 'function'
        ? CS.normalizeWorkspaceUi(ui)
        : ui;
    if (normalized && !workspaceUiHasExplicitTexts(ui, CS)) {
        normalized.texts = {};
    }
    return S.set(S.KEYS.WORKSPACE_UI, normalized);
};
S.getWorkspaceUiEffective = function() {
    var v = S.getWorkspaceUi();
    var CS = window.PDM && window.PDM.ConfigSchema;
    if (CS && typeof CS.hardenWorkspaceUi === 'function') {
        return CS.hardenWorkspaceUi(v);
    }
    if (CS && typeof CS.normalizeWorkspaceUi === 'function') {
        return CS.normalizeWorkspaceUi(v);
    }
    return v || {};
};

S.syncWorkspaceUiTextsForLocale = function() {
    var CS = window.PDM && window.PDM.ConfigSchema;
    if (!CS || typeof CS.buildDefaultWorkspaceUi !== 'function') return false;
    var I = window.PDM && window.PDM.I18n;
    var bundle = typeof S.getI18nBundle === 'function' ? S.getI18nBundle() : null;
    var current = typeof CS.normalizeWorkspaceUi === 'function'
        ? CS.normalizeWorkspaceUi(S.get(S.KEYS.WORKSPACE_UI))
        : { identity: {}, brand: {}, texts: {} };
    var changed = false;

    if (bundle && bundle.i18n && I && typeof I.getWorkspaceUiTexts === 'function') {
        changed = mergeBundleWorkspaceUiTexts(current, I.getWorkspaceUiTexts() || {});
        return changed ? S.setWorkspaceUi(current) : true;
    }

    changed = fillEmptyWorkspaceUiTexts(current, CS.buildDefaultWorkspaceUi());
    return changed ? S.setWorkspaceUi(current) : true;
};

})();
