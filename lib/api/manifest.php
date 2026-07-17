<?php
/**
 * PromptDeMerde.com — manifest.php
 *
 * Synopsis : API GET liste des profils applicatifs disponibles.
 * Objectif : Retourner ids/labels du manifest.json pour le sélecteur header.
 */
require_once __DIR__ . '/lib.php';
if (!pdm_profiles_available()) {
    pdm_json_response(['profiles' => [], 'available' => false, 'runtimeOk' => false, 'defaultProfileId' => null]);
}
$manifest = pdm_load_manifest();
$lang = isset($_GET['lang']) ? trim((string) $_GET['lang']) : null;
$manifest = pdm_localize_manifest($manifest, $lang);
$manifest['available'] = count($manifest['profiles'] ?? []) > 0;
$manifest['runtimeOk'] = pdm_profiles_runtime_available();
$manifest['defaultProfileId'] = pdm_default_profile_id();
pdm_json_response($manifest);
