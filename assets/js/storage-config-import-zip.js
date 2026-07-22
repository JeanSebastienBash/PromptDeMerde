/**
 * PromptDeMerde.com — storage-config-import-zip.js
 *
 * Synopsis : Entrée import ZIP profil (guards, checksum, loadFromZip).
 * Objectif : importConfigZip / importConfigZipAsync → applyValidatedZipBundle.
 */
(function () {

var S = window.PDM && window.PDM.Storage;
if (!S) { console.warn('[storage-config-import-zip] PDM.Storage missing'); return; }

S._zipImportGuards = function (arrayBuffer, options) {
    var PB = window.PDM && window.PDM.ProfileBundle;
    if (!PB || typeof PB.loadFromZip !== 'function') {
        return S._importFail('Module d\'import ZIP indisponible.');
    }
    if (options.filename &&
        window.PDM.ProfileSelector &&
        typeof window.PDM.ProfileSelector.isReservedImportName === 'function' &&
        window.PDM.ProfileSelector.isReservedImportName(options.filename)) {
        return S._importFail('Import refus\u00e9 : nom r\u00e9serv\u00e9 \u00e0 un profil officiel.');
    }
    var CS = window.PDM && window.PDM.ConfigSchema;
    var maxZip = (CS && CS.MAX_IMPORT_ZIP_BYTES)
        ? CS.MAX_IMPORT_ZIP_BYTES : (20 * 1024 * 1024);
    if (!arrayBuffer || arrayBuffer.byteLength > maxZip) {
        return S._importFail('Archive ZIP trop volumineuse.');
    }
    return { ok: true };
};

S._zipRunImport = function (arrayBuffer, options, locale) {
    var PB = window.PDM && window.PDM.ProfileBundle;
    var CS = window.PDM && window.PDM.ConfigSchema;
    return PB.loadFromZip(arrayBuffer, locale).then(function (bundle) {
        if (!bundle || !bundle.assembled) {
            return S._importFail('Archive profil invalide.');
        }
        if (!CS) return S._importFail('Module de validation indisponible.');
        return S.applyValidatedZipBundle(bundle, options, locale);
    }).catch(function (err) {
        var msg = err && err.message ? err.message : 'Import ZIP \u00e9chou\u00e9.';
        return S._importFail(msg);
    });
};

S.importConfigZip = function (arrayBuffer, options) {
    options = options || {};
    var guard = S._zipImportGuards(arrayBuffer, options);
    if (!guard.ok) return Promise.resolve(guard);
    var locale = S.getLanguage ? S.getLanguage() : 'fr';
    var PBI = window.PDM && window.PDM.ProfileBundleIntegrity;
    var expected = options.expectedChecksum || options.checksum_sha256 || null;
    if (expected && PBI && typeof PBI.verifyZipChecksum === 'function') {
        return PBI.verifyZipChecksum(arrayBuffer, expected).then(function (vr) {
            if (!vr.ok) {
                var msg = vr.error || 'Checksum SHA-256 mismatch.';
                return S._importFail(msg);
            }
            return S._zipRunImport(arrayBuffer, options, locale);
        });
    }
    return S._zipRunImport(arrayBuffer, options, locale);
};

S.importConfigZipAsync = S.importConfigZip;

})();
