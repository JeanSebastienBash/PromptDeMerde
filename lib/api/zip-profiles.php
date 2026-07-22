<?php
/**
 * PromptDeMerde.com — zip-profiles.php
 *
 * Synopsis : Liste légère des archives ZIP free-profile pour le sélecteur Options.
 * Objectif : Scanner uniquement zip/free-profile/*.zip (ETag / 304) — jamais d’autre arborescence.
 */
require_once __DIR__ . '/lib.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    pdm_json_response(['error' => 'method_not_allowed'], 405);
}

$payload = pdm_list_free_zip_profiles();
$etag = '"' . $payload['etag'] . '"';

$inm = isset($_SERVER['HTTP_IF_NONE_MATCH']) ? trim((string) $_SERVER['HTTP_IF_NONE_MATCH']) : '';
if ($inm !== '' && $inm === $etag) {
    http_response_code(304);
    header('ETag: ' . $etag);
    header('Cache-Control: no-cache, must-revalidate');
    exit;
}

header('ETag: ' . $etag);
pdm_json_response($payload);
