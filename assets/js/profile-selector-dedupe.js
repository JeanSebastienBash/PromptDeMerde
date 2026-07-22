/**
 * PromptDeMerde.com — profile-selector-dedupe.js
 *
 * Synopsis : Déduplication sélecteur (native > zip > custom).
 * Objectif : Pas de doublon Speech2Texte native + ZIP free du même pack.
 */
(function() {

var PS = window.PDM && window.PDM.ProfileSelector;
if (!PS) { console.warn('[profile-selector-dedupe] missing'); return; }

PS._profileLabelKey = function(raw) {
    var s = String(raw == null ? '' : raw).trim();
    if (!s) return '';
    s = s.replace(/\.zip$/i, '');
    s = s.replace(/-promptdemerde-profile-v[\d.]+$/i, '');
    s = s.replace(/-promptdemerde-config-v[\d.]+$/i, '');
    s = s.replace(/^custom-/i, '');
    var PN = window.PDM && window.PDM.ProfileName;
    if (PN && typeof PN.toPascalProfileName === 'function') {
        var p = PN.toPascalProfileName(s);
        if (p) s = p;
    }
    return s.toLowerCase();
};

PS._nativeCoversZipDrop = function(zp) {
    if (!zp || !PS._bundledProfiles || !PS._bundledProfiles.length) return false;
    var wantLabel = PS._profileLabelKey(zp.label || '');
    var wantFile = PS._profileLabelKey(zp.filename || '');
    for (var i = 0; i < PS._bundledProfiles.length; i++) {
        var bp = PS._bundledProfiles[i];
        if (!bp) continue;
        var bl = PS._profileLabelKey(bp.label || '');
        var bi = PS._profileLabelKey(bp.id || '');
        if (wantLabel && (wantLabel === bl || wantLabel === bi)) return true;
        if (wantFile && (wantFile === bl || wantFile === bi)) return true;
    }
    return false;
};

PS._customCoversZipDrop = function(zp) {
    if (!zp || !window.PDM.Storage || typeof window.PDM.Storage.getCustomProfiles !== 'function') {
        return false;
    }
    var list = window.PDM.Storage.getCustomProfiles();
    var wantFile = String(zp.filename || '').trim().toLowerCase();
    var wantLabel = PS._profileLabelKey(zp.label || zp.filename || '');
    for (var i = 0; i < list.length; i++) {
        var cp = list[i];
        if (!cp) continue;
        var src = PS._normalizeSource(cp.source);
        var fileHit = wantFile && String(cp.dropFilename || '').trim().toLowerCase() === wantFile;
        var labelHit = wantLabel && PS._profileLabelKey(cp.label || '') === wantLabel;
        if (src === 'zip' && (fileHit || labelHit)) return true;
        if (!src && labelHit) return true;
    }
    return false;
};

PS._inferCustomSource = function(cp) {
    var src = PS._normalizeSource(cp && cp.source);
    if (src) return src;
    if (!cp || !PS._zipFreeProfiles || !PS._zipFreeProfiles.length) return '';
    var label = PS._profileLabelKey(cp.label || '');
    var file = String(cp.dropFilename || '').trim().toLowerCase();
    for (var i = 0; i < PS._zipFreeProfiles.length; i++) {
        var zp = PS._zipFreeProfiles[i];
        if (!zp) continue;
        if (file && String(zp.filename || '').trim().toLowerCase() === file) return 'zip';
        if (label && PS._profileLabelKey(zp.label || zp.filename || '') === label) return 'zip';
    }
    return '';
};

PS._dedupeStoredCustomProfiles = function() {
    if (!window.PDM.Storage || typeof window.PDM.Storage.getCustomProfiles !== 'function') return;
    var list = window.PDM.Storage.getCustomProfiles();
    if (!list.length) return;
    var active = PS._getActiveId();
    var bestByLabel = {};
    var order = [];
    for (var i = 0; i < list.length; i++) {
        var p = list[i];
        if (!p || !p.id) continue;
        var key = PS._profileLabelKey(p.label || p.id);
        if (!key) key = String(p.id);
        if (!bestByLabel[key]) {
            bestByLabel[key] = p;
            order.push(key);
            continue;
        }
        var keep = bestByLabel[key];
        var replace = false;
        if (active && p.id === active && keep.id !== active) {
            replace = true;
        } else if (!active || (keep.id !== active && p.id !== active)) {
            var keepAt = keep.updatedAt ? Date.parse(keep.updatedAt) : 0;
            var candAt = p.updatedAt ? Date.parse(p.updatedAt) : 0;
            if (candAt > keepAt) replace = true;
        }
        if (replace) bestByLabel[key] = p;
    }
    var next = [];
    for (var j = 0; j < order.length; j++) {
        next.push(bestByLabel[order[j]]);
    }
    if (next.length === list.length) return;
    if (window.PDM.Storage.set) {
        window.PDM.Storage.set(window.PDM.Storage.KEYS.CUSTOM_PROFILES, next);
    }
};

})();
