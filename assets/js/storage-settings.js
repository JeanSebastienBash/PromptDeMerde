/**
 * PromptDeMerde.com — storage-settings.js
 *
 * Synopsis : Point d’entrée réglages Storage (modules wipe/prompts/meta/llm).
 * Objectif : Garder l’ordre de charge et l’alias historique ensureContextGenDefaults.
 */
(function(){

var S = window.PDM && window.PDM.Storage;
if (!S) { console.warn('[storage-settings.js] PDM.Storage not found.'); return; }

if (typeof S.ensureConfigDefaults === 'function') {
    S.ensureContextGenDefaults = S.ensureConfigDefaults;
}

})();
