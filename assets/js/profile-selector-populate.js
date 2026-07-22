/**
 * PromptDeMerde.com — profile-selector-populate.js
 * Remplissage sélecteur Profil JSON — ordre native → free → premium, puis A–Z.
 */
(function() {

var PS = window.PDM && window.PDM.ProfileSelector;
if (!PS) { console.warn('[profile-selector-populate] missing'); return; }

function sortLocale() {
    var I = window.PDM && window.PDM.I18n;
    return I && typeof I.getLocale === 'function' ? I.getLocale() : 'fr';
}

function verOf(extra) {
    if (typeof PS.resolveEntryVersion !== 'function') return '';
    return PS.resolveEntryVersion(extra || {});
}

/** 0 = native, 1 = free, 2 = premium */
PS._selectorGroupRank = function(entry) {
    var src = typeof PS._normalizeSource === 'function'
        ? PS._normalizeSource(entry && entry.source)
        : String((entry && entry.source) || '').trim().toLowerCase();
    if (src === 'native') return 0;
    var tier = typeof PS._normalizeTier === 'function'
        ? PS._normalizeTier(entry && entry.tier)
        : String((entry && entry.tier) || 'free').trim().toLowerCase();
    return tier === 'premium' ? 2 : 1;
};

PS._compareSelectorEntries = function(a, b) {
    var ra = PS._selectorGroupRank(a);
    var rb = PS._selectorGroupRank(b);
    if (ra !== rb) return ra - rb;
    var la = String((a && a.label) || (a && a.id) || '').toLowerCase();
    var lb = String((b && b.label) || (b && b.id) || '').toLowerCase();
    return la.localeCompare(lb, sortLocale(), { sensitivity: 'base' });
};

PS._entryExists = function(entries, id) {
    for (var i = 0; i < entries.length; i++) {
        if (entries[i] && entries[i].id === id) return true;
    }
    return false;
};

PS._pushZipFreeEntries = function(entries) {
    if (!PS._zipFreeProfiles || !PS._zipFreeProfiles.length) return;
    for (var i = 0; i < PS._zipFreeProfiles.length; i++) {
        var zp = PS._zipFreeProfiles[i];
        if (!zp || !zp.id || PS._entryExists(entries, zp.id)) continue;
        if (typeof PS._nativeCoversZipDrop === 'function' && PS._nativeCoversZipDrop(zp)) continue;
        if (typeof PS._customCoversZipDrop === 'function' && PS._customCoversZipDrop(zp)) continue;
        entries.push({
            id: zp.id,
            label: zp.label || zp.filename || zp.id,
            source: 'zip',
            tier: PS._normalizeTier(zp.tier || 'free'),
            filename: zp.filename || '',
            version: verOf(zp)
        });
    }
};

PS.populateSelector = function() {
    if (typeof PS._dedupeStoredCustomProfiles === 'function') {
        PS._dedupeStoredCustomProfiles();
    }
    var sel = PS._getSelect();
    if (!sel) return;
    var entries = [];
    var i;
    var appVer = typeof PS.resolveAppContractVersion === 'function'
        ? PS.resolveAppContractVersion()
        : '';
    for (i = 0; i < PS._bundledProfiles.length; i++) {
        var bp = PS._bundledProfiles[i];
        if (!bp || !bp.id) continue;
        entries.push({
            id: bp.id,
            label: bp.label || bp.id,
            source: 'native',
            tier: PS._normalizeTier(bp.tier || 'free'),
            version: verOf(bp) || appVer
        });
    }
    if (window.PDM.Storage && typeof window.PDM.Storage.getCustomProfiles === 'function') {
        var custom = window.PDM.Storage.getCustomProfiles();
        var seenCustom = {};
        for (i = 0; i < custom.length; i++) {
            var cp = custom[i];
            if (!cp || !cp.id || seenCustom[cp.id]) continue;
            seenCustom[cp.id] = true;
            entries.push({
                id: cp.id,
                label: cp.label || cp.id,
                source: typeof PS._inferCustomSource === 'function'
                    ? PS._inferCustomSource(cp)
                    : PS._normalizeSource(cp.source),
                tier: PS._normalizeTier(cp.tier),
                filename: cp.dropFilename || '',
                dropFilename: cp.dropFilename || '',
                config: cp.config || null,
                version: verOf(cp)
            });
        }
    }
    PS._pushZipFreeEntries(entries);

    var active = PS._getActiveId();
    if (active && !PS._entryExists(entries, active)) {
        var orphan = { id: active, label: active, source: '', tier: 'free', version: '' };
        if (typeof PS.isZipFreeProfileId === 'function' && PS.isZipFreeProfileId(active)) {
            orphan.source = 'zip';
            var ze = typeof PS.getZipFreeEntry === 'function' ? PS.getZipFreeEntry(active) : null;
            if (ze) {
                if (ze.label) orphan.label = ze.label;
                if (ze.tier) orphan.tier = ze.tier;
                orphan.version = verOf(ze);
            }
        } else if (window.PDM.Storage && typeof window.PDM.Storage.getCustomProfile === 'function') {
            var ocp = window.PDM.Storage.getCustomProfile(active);
            if (ocp) {
                if (ocp.label) orphan.label = ocp.label;
                orphan.source = PS._normalizeSource(ocp.source);
                orphan.tier = PS._normalizeTier(ocp.tier);
                orphan.version = verOf(ocp);
            }
        }
        entries.push(orphan);
    }

    entries.sort(PS._compareSelectorEntries);

    sel.innerHTML = '';
    for (i = 0; i < entries.length; i++) {
        var e = entries[i];
        var opt = document.createElement('option');
        opt.value = e.id;
        opt.textContent = PS.formatProfileOptionLabel(e);
        sel.appendChild(opt);
    }

    PS._selectorAppliedId = active;
    if (PS._selectHasOption(sel, active)) sel.value = active;
    else if (sel.options.length) sel.selectedIndex = 0;
};

})();
