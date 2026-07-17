/**
 * PromptDeMerde.com — profile-bundle-export.js
 *
 * Synopsis : Packaging ZIP export profil (blob, checksum package).
 * Objectif : Exposer listExportFiles, buildZipBlob/Package et filename.
 */
(function() {

var PBE = window.PDM && window.PDM.ProfileBundleExport;
if (!PBE) { console.warn('[profile-bundle-export.js] PDM.ProfileBundleExport not found.'); return; }
var PB = window.PDM && window.PDM.ProfileBundle;
var CS = window.PDM && window.PDM.ConfigSchema;

PBE.listExportFiles = function(options) {
    return Object.keys(PBE.buildFileMap(options).files).sort();
};

PBE.buildZipBlob = function(options) {
    return PBE.buildZipPackage(options).then(function(pkg) {
        return pkg.blob;
    });
};

PBE.buildZipPackage = function(options) {
    if (typeof JSZip === 'undefined') {
        return Promise.reject(new Error('JSZip indisponible'));
    }
    return PBE.buildFileMapAsync(options).then(function(built) {
        var zip = new JSZip();
        var paths = Object.keys(built.files);
        for (var i = 0; i < paths.length; i++) {
            zip.file(paths[i], built.files[paths[i]]);
        }
        return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    }).then(function(blob) {
        var PBI = window.PDM && window.PDM.ProfileBundleIntegrity;
        if (!PBI || typeof PBI.sha256Hex !== 'function') {
            return { blob: blob, checksum_sha256: null, size_bytes: blob.size };
        }
        return blob.arrayBuffer().then(function(buf) {
            return PBI.sha256Hex(buf).then(function(hex) {
                return { blob: blob, checksum_sha256: hex, size_bytes: blob.size };
            });
        });
    });
};

PBE.buildZipFilename = function(label, version) {
    var PS = window.PDM && window.PDM.ProfileSelector;
    var slug = PS && PS.sanitizeFileSlug ? PS.sanitizeFileSlug(label) : 'Profil';
    var ver = version || (window.PDM.Storage && window.PDM.Storage.VERSION) || '1';
    return slug + '-promptdemerde-profile-v' + ver + '.zip';
};


})();
