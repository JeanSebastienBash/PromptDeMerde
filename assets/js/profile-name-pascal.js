/**
 * PromptDeMerde.com — profile-name-pascal.js
 *
 * Synopsis : Nomenclature profil / ZIP / marketplace — PascalCase sans séparateur.
 * Objectif : toPascalProfileName, isValidPascalProfileName, sanitize slug fichier.
 */
(function() {

var PDM = window.PDM = window.PDM || {};
var PN = PDM.ProfileName = PDM.ProfileName || {};

/** Max length for profile display / ZIP stem (alphanumeric PascalCase). */
PN.MAX_LEN = 64;

/**
 * Convert arbitrary user text to PascalCase (no spaces, hyphens, underscores).
 * Ex. "speech 2 texte" / "speech-to-texte" / "speech2texte" → "Speech2Texte"
 *     "Prompt List Structurator" → "PromptListStructurator"
 */
PN.toPascalProfileName = function(raw) {
    var s = String(raw == null ? '' : raw).trim();
    if (!s) return '';
    s = s.replace(/[\u00C0-\u024F]/g, function(ch) {
        try {
            return ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        } catch (e) {
            return ch;
        }
    });
    s = s
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
        .replace(/([A-Za-z])([0-9])/g, '$1 $2')
        .replace(/([0-9])([A-Za-z])/g, '$1 $2');
    var chunks = s.match(/[0-9]+|[A-Za-z]+/g);
    if (!chunks || !chunks.length) return '';
    var out = '';
    for (var i = 0; i < chunks.length; i++) {
        var c = chunks[i];
        if (/^[0-9]+$/.test(c)) {
            out += c;
            continue;
        }
        out += c.charAt(0).toUpperCase() + c.slice(1).toLowerCase();
    }
    if (out.length > PN.MAX_LEN) out = out.slice(0, PN.MAX_LEN);
    return out;
};

PN.isValidPascalProfileName = function(name) {
    var s = String(name == null ? '' : name);
    if (!s || s.length > PN.MAX_LEN) return false;
    return /^[A-Z][A-Za-z0-9]*$/.test(s);
};

/** ZIP / export stem — same as display name (PascalCase). */
PN.sanitizeFileSlug = function(label, fallback) {
    var pascal = PN.toPascalProfileName(label);
    if (PN.isValidPascalProfileName(pascal)) return pascal;
    var fb = PN.toPascalProfileName(fallback || 'Profil');
    return PN.isValidPascalProfileName(fb) ? fb : 'Profil';
};

/** Normalize user input; returns '' if impossible. */
PN.normalizeOrEmpty = function(raw) {
    var p = PN.toPascalProfileName(raw);
    return PN.isValidPascalProfileName(p) ? p : '';
};

})();
