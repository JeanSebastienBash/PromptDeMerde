# Sécurité — PromptDeMerde.com

> Modèle de menace, durcissement du proxy Ollama, import **archive ZIP profil** et bonnes pratiques de déploiement.

## Architecture et données sensibles

| Composant | Données | Persistance serveur |
|-----------|---------|---------------------|
| Navigateur | Prompts, historique, token Ollama (localStorage), token proxy (sessionStorage), blobs audio | Aucune côté serveur |
| Proxy PHP (`lib/proxy/ollama/olama.php`) | Corps POST vers Ollama (prompts, contextes, **images base64** vision) | **Transit mémoire uniquement** — pas d'écriture disque applicative |
| Ollama | Inférences LLM | Selon votre installation Ollama |
| API profils (`lib/api/*.php`) | Lecture Markdown → JSON | Lecture seule disque |

Le proxy **ne remplace pas** un pare-feu applicatif. CORS restreint en production (`PDM_ENV=prod`) aux origines officielles ; en pré-production officielle, auto-hébergement ou développement, CORS est ouvert (`*`) — **ne pas exposer une pré-prod ou un clone sur Internet sans protection réseau**.

L'**export / import de profil** est **100 % client** : l'archive ZIP (et le `pdm-config` qu'elle contient) n'est **jamais** envoyée au serveur PHP. L'import UI n'accepte que **`.zip`** — un fichier JSON seul est refusé. Les risques concernent **l'utilisateur qui importe** (XSS locale, vol de tokens en `localStorage`, DoS navigateur), pas une compromission serveur via l'archive.

## Proxy Ollama — risques

Sans durcissement, tout client HTTP peut :

- Relayer des requêtes vers Ollama local (`127.0.0.1:11434`) ou le LAN via `X-Ollama-Url`
- Consommer GPU/CPU (abus de ressources)
- Sonder le réseau privé (RFC 1918 autorisé par le filtre hôte)

Mesures implémentées dans `olama.php` :

| Mesure | Variable / comportement |
|--------|-------------------------|
| Authentification optionnelle | `PDM_PROXY_TOKEN` — header `Authorization: Bearer …` ou `X-PDM-Proxy-Token` |
| Rate limiting | 120 req/min/IP en prod, 300 en pré-prod / auto-hébergé (fichiers temporaires) |
| Limite corps POST | `PDM_PROXY_MAX_BODY` (défaut 10 Mo) |
| Pas de redirection HTTP | `follow_location` désactivé (anti-SSRF par redirect) |
| En-têtes sanitizés | Suppression CRLF dans `User-Agent` / `Accept` relayés |
| Erreurs génériques | Messages détaillés masqués lorsque `PDM_ENV=prod` |

### Configurer le token proxy

Le token proxy protège le **relais PHP opérateur** vers l'Ollama du serveur prod. Les **visiteurs** n'en ont pas besoin : ils utilisent **leur** Ollama local en connexion directe depuis le navigateur.

1. **Serveur** (Apache **ou** Nginx) — prod officielle (flux opérateur uniquement) :

   **Apache**

   ```bash
   # /etc/apache2/envvars
   export PDM_ENV=prod
   export PDM_PROXY_TOKEN="votre-secret-long-et-aleatoire"
   ```

   ```apache
   # /etc/apache2/conf-available/pdm-env.conf
   PassEnv PDM_ENV
   PassEnv PDM_PROXY_TOKEN
   ```

   Puis `sudo a2enconf pdm-env && sudo systemctl restart apache2`.

   **Nginx + PHP-FPM** (équivalent)

   Dans le pool FPM (ex. `/etc/php/8.x/fpm/pool.d/www.conf` ou pool dédié) :

   ```ini
   env[PDM_ENV] = prod
   env[PDM_PROXY_TOKEN] = votre-secret-long-et-aleatoire
   ```

   Puis `sudo systemctl reload php*-fpm`.  
   Alternative : `fastcgi_param` dans le `server` / `location ~ \.php$` :

   ```nginx
   fastcgi_param PDM_ENV prod;
   fastcgi_param PDM_PROXY_TOKEN "votre-secret-long-et-aleatoire";
   ```

   **Allowlist IP** obligatoire sur `/lib/proxy/` (vhost Apache, `location` Nginx, ou reverse proxy devant) — le token **ne remplace pas** ce filtrage.

   Exemple Nginx :

   ```nginx
   location /lib/proxy/ {
       allow 127.0.0.1;
       allow ::1;
       allow VOTRE.IP.OPERATEUR;
       deny all;
       # … include snippets/fastcgi-php.conf / proxy_pass selon stack
   }
   ```

   > Nginx : CSP, noindex `/lib/`, anti-listing, etc. doivent être repris dans la conf vhost Nginx (équivalents des en-têtes HTTP Apache).

2. **Opérateur** (IP autorisée) — décocher « Je n'ai pas de token », saisir le **Token proxy** pour la session :

   - **Options → LLM** : case + champ token sur une ligne.
   - Stockage : **`sessionStorage`** — `pdm_token_proxy` (secret) et `pdm_llm_direct_local` (flux A/B) — réinitialisés à chaque session navigateur.

3. **Visiteurs prod (flux A)** — laisser **« Je n'ai pas de token »** coché ; installer [Ollama](https://ollama.ai/download) localement ; URL par défaut `http://localhost:11434` dans *Options → LLM*. **CORS obligatoire** sur le poste :

   ```bash
   OLLAMA_ORIGINS=https://promptdemerde.com ollama serve
   ```

   Linux (systemd) : `Environment="OLLAMA_ORIGINS=https://promptdemerde.com"` dans `/etc/systemd/system/ollama.service.d/environment.conf`, puis `systemctl daemon-reload && systemctl restart ollama`.

   Sans cette variable : `Failed to fetch` au test LLM même si Ollama tourne. L'allowlist IP sur `/lib/proxy/` ne corrige pas ce cas (elle ne concerne que le flux B).

> **Recommandation prod Internet** : combinez `PDM_PROXY_TOKEN` avec une **allowlist IP** sur `/lib/proxy/` — ne pas ouvrir le relais aux visiteurs.

## Import archive ZIP profil — contenu non fiable (sécurité v2 — v1.14.0+)

### Promesse produit

| Affirmation | Vrai ? |
|-------------|--------|
| « Importer mon export ZIP complet validé restaure ma session » | **Oui** |
| « Importer n'importe quelle archive tierce sans danger » | **Non** — impossible sans supprimer toute richesse HTML workspace et toute confiance utilisateur |
| « Importer un `.json` seul depuis l'UI » | **Non** — refusé (`importJsonDeprecated`) ; conteneur **ZIP** obligatoire |

### Modèle de menace (archive malveillante)

```
Attaquant ──► distribue evil-profile.zip (pdm-config + prompts)
                    │
                    ▼
Victime importe sur https://promptdemerde.com
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
   XSS local   Vol tokens   DoS navigateur
   (guard)     localStorage  (gros JSON/blobs)
        │
        └─────► fetch proxy Ollama (depuis navigateur victime, si token présent)
```

| Menace | Atteint serveur PHP ? | Atteint autres users ? | Statut v1.14.0 |
|--------|----------------------|------------------------|----------------|
| RCE / écriture disque via import profil | Non | Non | Mitigé (import client-only) |
| Vol données cross-user | Non | Non | Mitigé (pas de multi-tenant) |
| XSS → vol `pdm_token_*` | Non direct | Non | **Mitigé** (sanitize + rejet) |
| DoS client (RAM, localStorage) | Non | Non | **Mitigé** (limites taille) |
| Abus proxy via session victime | Indirect | Non | Dépend `PDM_PROXY_TOKEN` + infra |
| Prompt injection LLM | Non | Non | By design (pas un bug) |

### Mesures techniques (code)

| # | Mesure | Fichier(s) |
|---|--------|------------|
| 1 | Allowlist HTML `promptGuardHtml` (`a[href^="#"]`, `strong`, `em`, `span.inject-*`) | `config-schema-sanitize.js` |
| 2 | Sanitization à l'import + au rendu (défense en profondeur) | `config-schema-build.js`, `workspace-ui-profile.js` |
| 3 | Rejet si `<script`, `onerror=`, `javascript:` avant normalisation | `containsDangerousWorkspaceHtml` |
| 4 | Plafond archive import **20 Mo** (ZIP) | `settings-ui.js`, `config-schema-security.js` |
| 5 | Plafonds longueur chaînes + estimation taille JSON | `config-schema-security.js` |
| 6 | Rejet clés `__proto__`, `constructor`, `prototype` (récursif) | `config-schema-security.js` |
| 7 | `pdm_audio_blobs` : format segments, max 50 refs, 50 Mo base64 total | validateur + `storage-config-audio.js` |
| 8 | `pdm_token_ollama` effacé par défaut à l'import (`stripTokens`) | `storage-config-import.js` |
| 9 | Dialog « fichier non signé / source inconnue » — **consentement UX**, pas crypto | `settings-ui.js` |
| 10 | **Checksum SHA-256** des octets ZIP : si `expectedChecksum` fourni et mismatch → **refus** | `profile-bundle-integrity.js`, `storage-config-import.js` |
| 11 | Fixtures tests manuels | `tests/fixtures/evil-*.json` |

### Intégrité ZIP (checksum) vs signature crypto

| Couche | État (v1.23.0) |
|--------|----------------|
| SHA-256 sur octets ZIP | **Oui** — export (`buildZipPackage`), creator (`profile-zip-checksum.mjs`) |
| Vérif à l’import | **Oui** si `options.expectedChecksum` / `checksum_sha256` (sinon dialog unsigned seulement) |
| `archive_trust.signed` | **Toujours false** tant qu’aucune signature asymétrique n’est vérifiée |
| Ed25519 / HMAC maintainer | **Hors scope** — ticket séparé ; futures clés **hors git** |

Checksums ZIP : vérifier l’intégrité côté client à l’import (modules profil bundle) — pas d’outil serveur dédié dans le clone public.

### Headers HTTP (conf serveur)

- `Content-Security-Policy` : `script-src 'self' 'unsafe-inline' 'unsafe-eval'` — inline pour le script `base href` ; `unsafe-eval` pour **Vosk** (Worker `new Function()`) ; `connect-src` inclut `'self' blob: data:` (WASM STT) et **Ollama local/LAN privé** (`localhost`, `127.0.0.1`, plages RFC1918) pour le flux A prod ; `img-src` / `frame-src` autorisent les vignettes et embeds YouTube du footer
- `Permissions-Policy` : `microphone=(self)` (dictée) ; caméra et géolocalisation refusées
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- Sous `assets/profiles/`, seul `speech2texte/`, `index.json` et `README.md` sont servis — le reste répond **403** (règle HTTP serveur)

### Risques résiduels (~5 %)

- Zero-day navigateur / sanitizer
- Prompt injection volontaire (`pdm_system_prompt`, contextes)
- Ingénierie sociale (« importez ce profil »)
- Compromission poste ou extension malveillante
- **Auto-hébergement tiers** : un admin **autre** que le porteur officiel qui activerait une journalisation des corps HTTP (access/error logs verbeux, reverse proxy debug) — hors promesse produit, hors stack officielle

**Hors scope « résiduel » pour la prod officielle** (`promptdemerde.com`) : le porteur / opérateur DreamProjectAI **ne journalise pas** les corps de requêtes applicatives (`olama.php` = transit RAM uniquement). Ce n’est pas un risque résiduel à ~5 % sur ce serveur — c’est une **politique d’exploitation** (risque pratique **~0 %** tant que cette politique tient).

## Export / import archive ZIP et tokens

L'export produit une **archive ZIP** (`{slug}-promptdemerde-profile-v{version}.zip`) contenant un objet `pdm-config` (**51** clés `pdm_*` + métadonnées), des prompts Markdown et — en preset **maximal** — des dictionnaires UI. Le schéma machine [`assets/config/pdm-config.schema.json`](assets/config/pdm-config.schema.json) déclare les **mêmes 51** clés que `CS.PDM_KEYS` (plus `i18n`/`langs` optionnels).

L'export inclut `pdm_token_ollama` **en clair** si présent. Une confirmation utilisateur est demandée avant export. Ne partagez jamais une archive contenant des tokens.

Le token proxy (`pdm_token_proxy`) et la préférence flux A (`pdm_llm_direct_local`) ne sont **pas** inclus dans l'export — ils vivent en **sessionStorage** uniquement.

À l'**import**, `pdm_token_ollama` est **vidé par défaut** lorsque l'archive ne provient pas clairement d'un export récent de l'application (protection contre archives tierces).

## CORS

| Environnement | `Access-Control-Allow-Origin` |
|---------------|--------------------------------|
| `PDM_ENV=prod` | `https://promptdemerde.com`, `https://www.promptdemerde.com` uniquement |
| `PDM_ENV=preprod` / absent / autre | `*` (pré-prod officielle, auto-hébergé, développement local) |

CORS protège la **lecture** des réponses par des sites tiers ; il n'empêche pas l'exécution côté serveur du proxy.

## Profils et rendu HTML

`pdm_workspace_ui.texts.promptGuardHtml` peut contenir du HTML intentionnel (liens ancres vers l'onglet Prompts). Seuls les profils et exports de **sources de confiance** doivent être importés.

Le rendu historique, les erreurs LLM et l'identité workspace passent par `textContent` ou `PDM.UI.escapeHtml`. `promptGuardHtml` est le seul champ HTML rendu via `innerHTML`, avec sanitization allowlist.

## Signaler une vulnérabilité

Contactez **dreamproject-ai@proton.me** par email (seul canal support).

**GitHub n’est pas un canal de suivi du projet pour DreamProjectAI** : pas de revue de code ni de triage d’issues de notre côté sur le dépôt public. Un rapport de sécurité par issue GitHub ne sera donc pas traité comme un ticket maintenu — préférez l’email.

DreamProjectAI **publie de temps en temps** des mises à jour versionnées sur ce dépôt via des **[tags git](https://github.com/JeanSebastienBash/PromptDeMerde/tags)** uniquement — **pas** de GitHub Releases. La ligne 1.x est pour l’instant en **RC** (pas encore stable). Pas d’engagement de calendrier public.

## Checklist déploiement public

### Pré-production (tests avant prod)

- [ ] `PDM_ENV=preprod` + vhost Apache/Nginx avec `Options -Indexes` et `SetEnv PDM_ENV preprod`
- [ ] Test : `GET /lib/` et `GET /assets/stt/` → **403** (pas de listing Apache)
- [ ] Test : `GET /README.md` → **403** (racine doc projet non exposée)
- [ ] Re-miroir type HTTrack : listings inaccessibles, prompts/assets toujours servis en GET direct

### Prod

- [ ] `PDM_ENV=prod` (badge footer **PROD**)
- [ ] `PDM_PROXY_TOKEN` défini côté serveur ; opérateur saisit le token **à chaque session** (modale ou Options → LLM)
- [ ] Reverse proxy avec auth ou IP allowlist
- [ ] Ollama non exposé directement sur Internet (127.0.0.1 ou socket Unix)
- [ ] HTTPS obligatoire
- [ ] CSP et headers sécurité actifs (conf Apache/Nginx / vhost)
- [ ] `.env` et secrets hors Git (voir `.gitignore`)
- [ ] Test : proxy Ollama retourne 401 sans token depuis Internet
- [ ] Test : import ZIP profil ne déclenche aucun POST serveur avec le contenu de l'archive
