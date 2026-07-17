<?php
/**
 * PromptDeMerde.com — proxy.php
 *
 * Synopsis : Point d'entrée shim du proxy LLM côté serveur.
 * Objectif : Déléguer immédiatement vers lib/proxy/ollama/olama.php en pré-prod.
 */
require __DIR__ . '/ollama/olama.php';
