/**
 * PromptDeMerde.com — profile-selector-option-label.js
 *
 * Synopsis : Libellé d’option du sélecteur Profil JSON (suffixes + version).
 * Objectif : Label PascalCase + (native|zip) + (Free|Premium) + (x.y.z).
 */
(function() {

var PS = window.PDM && window.PDM.ProfileSelector;
if (!PS) { console.warn('[profile-selector-option-label] missing'); return; }

function psT(key, vars, fallback) {
    if (typeof PS.t === 'function') return PS.t(key, vars, fallback);
    return fallback != null ? fallback : '';
}

PS._normalizeTier = function(tier) {
    var t = String(tier || '').trim().toLowerCase();
    return t === 'premium' ? 'premium' : 'free';
};

PS._normalizeSource = function(source) {
    var s = String(source || '').trim().toLowerCase();
    if (s === 'native' || s === 'zip') return s;
    return '';
};

PS.extractArchiveVersion = function(raw) {
    var s = String(raw || '').trim();
    if (!s) return '';
    var m = s.match(/-promptdemerde-profile-v([\d.]+)(?:\.zip)?$/i)
        || s.match(/-promptdemerde-config-v([\d.]+)(?:\.json)?$/i);
    if (m && m[1]) return String(m[1]).replace(/\.$/, '');
    if (/^\d+(?:\.\d+)*$/.test(s)) return s;
    return '';
};

PS.resolveAppContractVersion = function() {
    var S = window.PDM && window.PDM.Storage;
    if (S && S.VERSION) return String(S.VERSION);
    var CS = window.PDM && window.PDM.ConfigSchema;
    if (CS && CS.VERSION) return String(CS.VERSION);
    return '';
};

PS.resolveEntryVersion = function(entry) {
    if (!entry) return '';
    if (entry.version) {
        var direct = PS.extractArchiveVersion(String(entry.version))
            || String(entry.version).trim();
        if (/^\d+(?:\.\d+)*$/.test(direct)) return direct;
    }
    var fromFile = PS.extractArchiveVersion(entry.filename || entry.dropFilename || '');
    if (fromFile) return fromFile;
    var cfg = entry.config;
    if (cfg && cfg.version != null) {
        var cv = String(cfg.version).trim();
        if (/^\d+(?:\.\d+)*$/.test(cv)) return cv;
    }
    return '';
};

PS.formatProfileOptionLabel = function(entry) {
    var rawBase = String((entry && entry.label) || '').trim() || String((entry && entry.id) || '');
    rawBase = rawBase.replace(/^custom-/i, '');
    var base = PS.toPascalProfileName(rawBase) || rawBase;
    var source = PS._normalizeSource(entry && entry.source);
    var tier = PS._normalizeTier(entry && entry.tier);
    var out = base;
    if (source === 'native') {
        out += psT('profileSuffixNative', null, ' (native)');
    } else if (source === 'zip') {
        out += psT('profileSuffixZip', null, ' (zip)');
    }
    out += tier === 'premium'
        ? psT('profileSuffixPremium', null, ' (Premium)')
        : psT('profileSuffixFree', null, ' (Free)');
    var ver = PS.resolveEntryVersion(entry);
    if (ver) out += ' (' + ver + ')';
    return out;
};

PS.stripProfileOptionSuffixes = function(raw) {
    var s = String(raw || '').trim();
    s = s.replace(/\s*\(\d+(?:\.\d+)*\)\s*$/, '').trim();
    var tokens = [
        psT('profileSuffixPremium', null, ' (Premium)'),
        psT('profileSuffixFree', null, ' (Free)'),
        psT('profileSuffixZip', null, ' (zip)'),
        psT('profileSuffixNative', null, ' (native)'),
        psT('profilePersonalSuffix', null, ' (perso)'),
        psT('profileZipFreeSuffix', null, ' (libre)')
    ];
    var guard = 0;
    while (guard < 8) {
        var changed = false;
        for (var i = 0; i < tokens.length; i++) {
            var suf = tokens[i];
            if (!suf || s.length < suf.length) continue;
            if (s.slice(-suf.length) === suf) {
                s = s.slice(0, -suf.length).trim();
                changed = true;
            }
        }
        if (!changed) break;
        guard++;
    }
    return s;
};

})();
