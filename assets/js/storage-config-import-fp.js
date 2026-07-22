/**
 * PromptDeMerde.com — storage-config-import-fp.js
 *
 * Synopsis : Fingerprint bundle profil (clé + compute / get / set).
 * Objectif : Détecter un changement de bundle importé sans rescanner tout le config.
 */
(function () {

var S = window.PDM && window.PDM.Storage;
if (!S) { console.warn('[storage-config-import-fp] PDM.Storage missing'); return; }

S.PROFILE_BUNDLE_FP_KEY = 'pdm_profile_bundle_fp';

S.computeProfileBundleFingerprint = function (config) {
    if (!config || typeof config !== 'object') return '';
    var parts = [String(config.pdm_active_profile || '')];
    parts.push(String(config.pdm_system_prompt || ''));
    var profs = config.pdm_profiles;
    if (Array.isArray(profs)) {
        for (var i = 0; i < profs.length; i++) {
            var p = profs[i];
            if (!p) continue;
            parts.push(String(p.id || '') + ':' + String(p.tag || ''));
        }
    }
    parts.push(String(config.pdm_theme || ''));
    parts.push(String(config.pdm_stt_engine || ''));
    parts.push(String(config.pdm_context_position || ''));
    return parts.join('\x1e');
};

S.getProfileBundleFingerprint = function () {
    var v = S.get(S.PROFILE_BUNDLE_FP_KEY);
    return v != null ? String(v) : '';
};

S.setProfileBundleFingerprint = function (fp) {
    return S.set(S.PROFILE_BUNDLE_FP_KEY, fp != null ? String(fp) : '');
};

})();
