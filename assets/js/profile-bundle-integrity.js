/**
 * PromptDeMerde.com — profile-bundle-integrity.js
 *
 * Synopsis : Intégrité SHA-256 des archives ZIP profil (octets).
 * Objectif : Calculer / vérifier checksum ; pas de signature asymétrique.
 */
(function() {

window.PDM = window.PDM || {};
var PBI = window.PDM.ProfileBundleIntegrity = window.PDM.ProfileBundleIntegrity || {};

function bytesToHex(buffer) {
    var bytes = new Uint8Array(buffer);
    var out = '';
    for (var i = 0; i < bytes.length; i++) {
        var h = bytes[i].toString(16);
        out += h.length === 1 ? '0' + h : h;
    }
    return out;
}

function normalizeHex(hex) {
    if (hex == null || hex === '') return '';
    return String(hex).trim().toLowerCase().replace(/^sha256:/, '');
}

PBI.sha256Hex = function(arrayBuffer) {
    if (!arrayBuffer) {
        return Promise.reject(new Error('Buffer ZIP manquant.'));
    }
    if (!window.crypto || !window.crypto.subtle || typeof window.crypto.subtle.digest !== 'function') {
        return Promise.reject(new Error('WebCrypto SHA-256 indisponible.'));
    }
    return window.crypto.subtle.digest('SHA-256', arrayBuffer).then(function(digest) {
        return bytesToHex(digest);
    });
};

PBI.verifyZipChecksum = function(arrayBuffer, expectedHex) {
    var expected = normalizeHex(expectedHex);
    if (!expected) {
        return Promise.resolve({ ok: true, skipped: true, checksum: null });
    }
    if (!/^[0-9a-f]{64}$/.test(expected)) {
        return Promise.resolve({
            ok: false,
            skipped: false,
            checksum: null,
            error: 'Checksum SHA-256 attendu invalide (64 hex).'
        });
    }
    return PBI.sha256Hex(arrayBuffer).then(function(actual) {
        if (actual === expected) {
            return { ok: true, skipped: false, checksum: actual };
        }
        return {
            ok: false,
            skipped: false,
            checksum: actual,
            error: 'Checksum SHA-256 mismatch (archive altérée ou listing obsolète).'
        };
    });
};

PBI.normalizeHex = normalizeHex;

})();
