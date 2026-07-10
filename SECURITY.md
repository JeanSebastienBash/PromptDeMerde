# Security — PromptDeMerde.com

> Modèle de menace, durcissement du proxy Ollama et bonnes pratiques de déploiement.

## Architecture et données sensibles

| Composant | Données | Persistance serveur |
|-----------|---------|---------------------|
| Navigateur | Prompts, historique, token proxy/Ollama, blobs audio | Aucune (localStorage + IndexedDB) |
| Proxy PHP (`lib/proxy/ollama/olama.php`) | Corps POST vers Ollama (prompts, contextes) | **Transit mémoire uniquement** — pas d'écriture disque applicative |
| Ollama | Inférences LLM | Selon votre installation Ollama |
| API profils (`lib/api/*.php`) | Lecture Markdown → JSON | Lecture seule disque |

Le proxy **ne remplace pas** un pare-feu applicatif. CORS restreint en production (`PDM_ENV=prod`) aux origines officielles ; en pré-production, CORS est ouvert (`*`) — **ne pas exposer une pré-prod sur Internet sans protection réseau**.

## Proxy Ollama — risques

Sans durcissement, tout client HTTP peut :

- Relayer des requêtes vers Ollama local (`127.0.0.1:11434`) ou le LAN via `X-Ollama-Url`
- Consommer GPU/CPU (abus de ressources)
- Sonder le réseau privé (RFC 1918 autorisé par le filtre hôte)

Mesures implémentées dans `olama.php` :

| Mesure | Variable / comportement |
|--------|-------------------------|
| Authentification optionnelle | `PDM_PROXY_TOKEN` — header `Authorization: Bearer …` ou `X-PDM-Proxy-Token` |
| Rate limiting | 120 req/min/IP en prod, 300 en pré-prod (fichiers temporaires) |
| Limite corps POST | `PDM_PROXY_MAX_BODY` (défaut 10 Mo) |
| Pas de redirection HTTP | `follow_location` désactivé (anti-SSRF par redirect) |
| En-têtes sanitizés | Suppression CRLF dans `User-Agent` / `Accept` relayés |
| Erreurs génériques | Messages détaillés masqués lorsque `PDM_ENV=prod` |

### Configurer le token proxy

1. **Serveur** (Apache/Nginx) :

   ```apache
   SetEnv PDM_PROXY_TOKEN "votre-secret-long-et-aleatoire"
   SetEnv PDM_ENV prod
   ```

2. **Navigateur** — stocker le même secret localement (clé `pdm_token_proxy`) :

   ```javascript
   localStorage.setItem('pdm_token_proxy', 'votre-secret-long-et-aleatoire');
   ```

   Le client l'envoie automatiquement via `X-PDM-Proxy-Token` (`ollama.js`).

   `lib/env/env.php` expose `security.proxyAuthRequired: true` lorsque le token serveur est défini.

> **Recommandation prod Internet** : combinez `PDM_PROXY_TOKEN` avec un reverse proxy (Basic Auth, IP allowlist, fail2ban) devant Apache.

## Export JSON et token Ollama

L'export `pdm-config` inclut `pdm_token_ollama` **en clair** si présent. Une confirmation utilisateur est demandée avant export. Ne partagez jamais un fichier export contenant des tokens.

Le token proxy (`pdm_token_proxy`) n'est **pas** inclus dans l'export par défaut — il reste local au navigateur.

## CORS

| Environnement | `Access-Control-Allow-Origin` |
|---------------|--------------------------------|
| `PDM_ENV=prod` | `https://promptdemerde.com`, `https://www.promptdemerde.com` uniquement |
| Autre (pré-prod, dev) | `*` |

CORS protège la **lecture** des réponses par des sites tiers ; il n'empêche pas l'exécution côté serveur du proxy.

## Profils et XSS

Les profils JSON (`pdm_workspace_ui.promptGuardHtml`) peuvent contenir du HTML intentionnel. N'importez que des profils de sources de confiance. Le rendu historique et les erreurs LLM passent par `PDM.UI.escapeHtml`.

## Signaler une vulnérabilité

Ouvrez une issue privée ou contactez les mainteneurs via le dépôt GitHub officiel. Ne publiez pas de PoC exploitant un proxy Ollama ouvert sans accord préalable.

## Checklist déploiement public

- [ ] `PDM_ENV=prod`
- [ ] `PDM_PROXY_TOKEN` défini et configuré côté client (`pdm_token_proxy`)
- [ ] Reverse proxy avec auth ou IP allowlist
- [ ] Ollama non exposé directement sur Internet (127.0.0.1 ou socket Unix)
- [ ] HTTPS obligatoire
- [ ] `.env` et secrets hors Git (voir `.gitignore`)
