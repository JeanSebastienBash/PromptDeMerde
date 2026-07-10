<?php
/**
 * PromptDeMerde.com — manifest.php
 *
 * Synopsis : API GET liste des profils applicatifs disponibles.
 * Objectif : Retourner ids/labels du manifest.json pour le sélecteur header.
 */
require_once __DIR__ . '/lib.php';
if (!pdm_profiles_available()) {
    pdm_json_response(['profiles' => [], 'available' => false]);
}
$manifest = pdm_load_manifest();
$manifest['available'] = true;
pdm_json_response($manifest);
