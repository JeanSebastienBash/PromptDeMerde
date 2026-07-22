/**
 * PromptDeMerde.com — storage-config-validate-zip.js
 *
 * Synopsis : Validation ZIP profil sans wipe / sans import session.
 * Objectif : Contrôle loadFromZip + validatePdmConfig pour le scan free-profile.
 */
(function() {

var S = window.PDM && window.PDM.Storage;
if (!S) { console.warn('[storage-config-validate-zip] PDM.Storage missing'); return; }

S.validateConfigZip = function(arrayBuffer, options) {
    options = options || {};
    var PB = window.PDM && window.PDM.ProfileBundle;
    var CS = window.PDM && window.PDM.ConfigSchema;
    if (!PB || typeof PB.loadFromZip !== 'function') {
        return Promise.resolve({
            ok: false,
            error: 'Module d\u2019import ZIP indisponible.',
            errors: ['Module d\u2019import ZIP indisponible.']
        });
    }
    var maxZip = (CS && CS.MAX_IMPORT_ZIP_BYTES) ? CS.MAX_IMPORT_ZIP_BYTES : (20 * 1024 * 1024);
    if (!arrayBuffer || arrayBuffer.byteLength < 1 || arrayBuffer.byteLength > maxZip) {
        return Promise.resolve({
            ok: false,
            error: 'Archive ZIP trop volumineuse ou vide.',
            errors: ['Archive ZIP trop volumineuse ou vide.']
        });
    }
    var locale = S.getLanguage ? S.getLanguage() : 'fr';
    return PB.loadFromZip(arrayBuffer, locale).then(function(bundle) {
        if (!bundle || !bundle.assembled) {
            return { ok: false, error: 'Archive profil invalide.', errors: ['Archive profil invalide.'] };
        }
        if (!CS) {
            return {
                ok: false,
                error: 'Module de validation indisponible.',
                errors: ['Module de validation indisponible.']
            };
        }
        var normalized = CS.normalizeLegacyConfig(JSON.parse(JSON.stringify(bundle.assembled)));
        var secRaw = CS.runImportSecurityChecks
            ? CS.runImportSecurityChecks(normalized)
            : { ok: true, errors: [] };
        if (!secRaw.ok) {
            return {
                ok: false,
                error: secRaw.errors.length === 1 ? secRaw.errors[0] : secRaw.errors.join('\n'),
                errors: secRaw.errors
            };
        }
        var validation = CS.validatePdmConfig(normalized);
        if (!validation.ok) {
            return {
                ok: false,
                error: validation.errors.length === 1
                    ? validation.errors[0]
                    : validation.errors.length + ' erreurs de validation',
                errors: validation.errors
            };
        }
        var ver = normalized && normalized.version != null
            ? String(normalized.version).trim()
            : '';
        var label = '';
        if (bundle.manifest && bundle.manifest.label) {
            label = String(bundle.manifest.label).trim();
        }
        if (!label && normalized && normalized.pdm_project && normalized.pdm_project.name) {
            label = String(normalized.pdm_project.name).trim();
        }
        return {
            ok: true,
            format: 'pdm-profile-zip',
            version: /^\d+(?:\.\d+)*$/.test(ver) ? ver : '',
            label: label
        };
    }).catch(function(err) {
        var msg = err && err.message ? err.message : 'Validation ZIP \u00e9chou\u00e9e.';
        return { ok: false, error: msg, errors: [msg] };
    });
};

})();
