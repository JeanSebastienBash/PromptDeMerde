<?php
/**
 * PromptDeMerde.com — assemble.php
 *
 * Synopsis : API GET export pdm-config pour un profil applicatif.
 * Objectif : Répondre en JSON avec le config assemblé pour profile-selector.js.
 */
require_once __DIR__ . '/lib.php';
if (!pdm_profiles_available()) {
    pdm_json_response(['ok' => false, 'error' => 'Bundle profils indisponible.'], 404);
}
$id = isset($_GET['id']) ? trim((string) $_GET['id']) : '';
if ($id === '') {
    pdm_json_response(['ok' => false, 'error' => 'Paramètre id requis.'], 400);
}
try {
    $config = pdm_assemble_profile($id);
    pdm_json_response(['ok' => true, 'profileId' => $id, 'config' => $config]);
} catch (InvalidArgumentException $e) {
    $msg = $e->getMessage();
    $rawEnv = getenv('PDM_ENV');
    if ($rawEnv === false || $rawEnv === '') {
        $rawEnv = $_SERVER['PDM_ENV'] ?? $_SERVER['REDIRECT_PDM_ENV'] ?? '';
    }
    if (strtolower(trim((string) $rawEnv)) === 'prod') {
        $msg = 'Profil introuvable ou invalide.';
    }
    pdm_json_response(['ok' => false, 'error' => $msg], 404);
} catch (Throwable $e) {
    $msg = $e->getMessage();
    $rawEnv = getenv('PDM_ENV');
    if ($rawEnv === false || $rawEnv === '') {
        $rawEnv = $_SERVER['PDM_ENV'] ?? $_SERVER['REDIRECT_PDM_ENV'] ?? '';
    }
    if (strtolower(trim((string) $rawEnv)) === 'prod') {
        $msg = 'Erreur interne lors de l\'assemblage du profil.';
    }
    pdm_json_response(['ok' => false, 'error' => $msg], 500);
}
