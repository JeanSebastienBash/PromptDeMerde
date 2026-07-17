# Contribuer à PromptDeMerde

## Principes

- **Pas d’étape de build** — modules JS vanilla IIFE sur `window.PDM.*` (ES modules uniquement pour les points d’entrée moteurs STT).
- **Fichiers courts** — modules préfixés par domaine (`workspace-*`, `stt-shared-*`, `storage-*`) : cible **≤ 100** lignes, **150** max ; fonctions **≤ 30** lignes.
- **Identifiants en anglais** dans le code ; français pour les chaînes UI et la documentation.
- **Zéro changement de comportement** lors d’un refactor — déplacer le code, ne pas réécrire la logique.

## Registre UI (bonne conduite)

Les messages **produit** (toasts `PDM.UI.notif`, status, tooltips d’erreur, Workspace / Options / Prompts / Market) s’adressent à l’utilisateur en **tournure impersonnelle** :

| Faire | Ne pas faire |
|-------|----------------|
| « Aucun texte dans Input. Coller un prompt avant de nettoyer. » | « Tu as oublié de coller ton prompt. » |
| « Dictée en cours — l’interrompre avant d’importer. » | « Arrête la dictée… » / « Vous devez arrêter… » |
| Cause + action (+ écran si besoin), 1–2 phrases | Message générique sans remède |

- **Tutoiement interdit** (tu / te / ton / tes / t’ / impératifs familiers).
- **Pas de je / nous** comme voix du produit dans un feedback.
- Toasts / status : préférer l’impersonnel au vouvoiement adressé.
- **i18n × 12** dès qu’une clé change (`assets/i18n/ui/*.json` + fallbacks `config-schema-core` si `workspaceUi`).
- Exception : **landing marketing** (`landing.*`) — ton de marque ; ne pas y calquer le registre produit, et **ne pas** importer le tutoiement landing dans les toasts.

## Hiérarchie documentaire

**Ce dépôt est la source de vérité publique** pour tout ce qui y est versionné (`README.md`, `docs/`, `CONTRIBUTING.md`, `SECURITY.md`, code). Le répertoire **`docs/`** est public : uniquement de la documentation clonable — pas d’audits ni d’outillage interne.

Quand le dépôt est modifié directement, il prime sur toute outline externe. Mettre à jour les notes d’ops hors miroir pour coller au dépôt — **ne jamais** réécrire la doc publique pour coller à une outline privée périmée.

**Pas d’historique documentaire** — remplacer sur place. Pas de `CHANGELOG.md`, pas de sections « obsolètes » conservées.

## Structure

**Export profil ZIP (1.23.0)** : **51** clés `pdm_*` dans l’objet `pdm-config` (contenu de l’archive). Canon : `CS.PDM_KEYS` **≡** `assets/config/pdm-config.schema.json` (mêmes noms, y compris `pdm_output_*`) ; racine optionnelle `i18n` + `langs`. Toute clé nouvelle → core + schéma + [`docs/DOCUMENTATION-TECHNIQUE.md`](docs/DOCUMENTATION-TECHNIQUE.md#13-les-51-clés-pdm) §13. **Thème par défaut** : `marron-day` (Marron clair) — `CS.DEFAULT_THEME_ID`. **Ne pas** énumérer les clés dans `README.md` — renvoyer vers la doc utilisateur et le schéma.

**Confidentialité** : aligner `SECURITY.md` sur le comportement runtime.

**README public** : [`README.md`](README.md) (anglais) + [`README.fr.md`](README.fr.md) (français) — grand public, ton accueillant. Détail technique → [`docs/DOCUMENTATION-TECHNIQUE.md`](docs/DOCUMENTATION-TECHNIQUE.md) (FR) · [`docs/DOCUMENTATION-TECHNIQUE.en.md`](docs/DOCUMENTATION-TECHNIQUE.en.md) (EN) — pas de listes de clés dans le README.

## Architecture (contributeurs)

SPA **sans build** (IIFE + `window.PDM.*`), proxy PHP Ollama, profils Markdown assemblés **côté navigateur**.  
Scripts listés dans `index.html` (statiques) et `lib/env/env.php` / `assets/js/env.js` (dynamiques, FALLBACK synchronisé).  
CSS responsive : `style-responsive.css`, `polish-responsive.css`, `style-workspace.css` (`.ws-grid`) ; Workspace et Prompts en 2 colonnes dès **1024px** ; Options en 2 colonnes dès **768px**.

**Prod LLM — deux flux** (détail [`docs/DOCUMENTATION-TECHNIQUE.md`](docs/DOCUMENTATION-TECHNIQUE.md) / [`SECURITY.md`](SECURITY.md)) : **flux A** = visiteur prod → connexion **directe** navigateur → Ollama local (`shouldUseDirectOllama()` dans `proxy-token-session.js`, branche dans `ollama.js`) ; **flux B** = opérateur → `olama.php` + token + allowlist IP. Visiteurs et auto-hébergeurs : flux A — pas de token proxy.

**`PDM_ENV`** (Apache, facultatif) : `prod` | `preprod` | absent → badge footer PROD / PRÉ-PROD / AUTO-HÉBERGÉ — voir [`docs/DOCUMENTATION-TECHNIQUE.md`](docs/DOCUMENTATION-TECHNIQUE.md#deploy-pdm-env-badges) · [`SECURITY.md`](SECURITY.md).

Ne pas réintroduire de monolithes (`storage.js`, `stt.js`, `workspace.js`, `i18n.js` monolithique).

### Namespace `window.PDM` (résumé)

| Module | Fichier(s) | Rôle |
|--------|------------|------|
| `PDM.ConfigSchema` | `config-schema-*.js` (11) | Validation `pdm-config` (**51** clés), sanitization, limites sécurité, index profil (`parts/*.json`) |
| `PDM.GenPromptSpecs` | `gen-prompt-specs.js` | Source unique des 9 specs gen-prompts (`id`, `storageKey`, `fileName`) + map getters session |
| `PDM.ProfileBundle` | `profile-bundle-loader.js` | Fetch bundle HTTP/ZIP, résolution MD par locale, assemblage `pdm-config` |
| `PDM.ProfileBundleExport` | `profile-bundle-export.js` | Export/import archive ZIP profil |
| `PDM.PromptsBundle` | `storage-prompts-bundle.js` | Prompts système/contextes/gen par locale en session (`pdm_prompts_bundle`) |
| `PDM.Storage` | `storage-*.js` (14 statiques) | localStorage ; export/import **archive ZIP profil** (JSON seul refusé à l’import) |
| `PDM.I18n` | `i18n-locales.js`, `i18n.js`, `i18n-apply-dom.js` | UI 12 langues : `t()`, boot profil, `apply()` DOM |
| `PDM.StorageAudioBlobs` | `storage-audio-blobs.js` | IndexedDB blobs audio |
| `PDM.Env` | `env.js` | Client `lib/env/env.php` |
| `PDM.Providers` / `PDM.LLM` | `providers.js`, `ollama.js`, `llm.js` | Registry et façade LLM |
| `PDM.ContextGeneration` | `context-generation.js` | Génération assistée `#Tag` |
| `PDM.App` | `app.js` + `workspace-*.js` + `*-ui.js` | SPA, nettoyage, thinking, dictée WebM |
| `PDM.STT` | `stt-core.js` … `stt-init.js`, `stt-dictation-recorder.js` | Dictée vocale + enregistrement WebM |
| `PDM.ProfileSelector` | `profile-selector*.js` | Profil JSON Options, export ZIP nommé |
| `PDM.WorkspaceUi` | `workspace-ui-profile.js` | `pdm_workspace_ui` par profil |
| `PDM.WorkspaceInputTools` | `workspace-input-tools.js` | État boutons zone saisie (grisé + tooltips) |
| `PDM.WorkspaceDictationAudio` | `workspace-dictation-audio*.js` | Export audio dictée WebM (moteur 1) |
| `PDM.WorkspaceTtsDownload` | `workspace-tts-download.js` | Export TTS GenericVoice (moteur 2, v2) |
| `PDM.UI` / `PDM.Themes` | `ui.js`, `themes.js`, `footer-projects.js` | DOM, **50** thèmes (25 familles), tokens `--role-*`, carrousel footer |

### Ordre de chargement

#### Statique (`index.html`) — avant `bootstrap.js`

1. `config-schema-*.js` (11) : core → helpers → security → sanitize → build → validate → validate-fields → validate-collections → **validate-locales** → **validate-prompts** → **validate-gen-prompts**
2. `vendor/jszip.min.js` → **`gen-prompt-specs.js`** → **`profile-bundle-loader.js`**
3. `storage-*.js` (14) : core → wipe → prompt-fields → profile-meta → llm-settings → settings → workspace-stt → audio-blobs → workspace-audio → history → config-io → config-audio → **prompts-bundle** → config-import
4. **`i18n-locales.js`** → **`i18n.js`** → **`i18n-apply-dom.js`**
5. `env.js` → `animation-inversion.js` → `animation-synopsis.js` → `bootstrap.js`

#### Dynamique (`lib/env/env.php`)

`providers.js` → `ollama.js` → `llm.js` → **`context-generation.js`** → **`profile-bundle-export.js`** → UI/profils (`profile-selector*.js`, `footer-projects.js`) → STT shared → moteurs → façade STT → dictée WebM → placeholder TTS AV2 → `workspace-ui-profile.js` → `app.js` → workspace modules → prompts/history UI splits → polish → homepage (optionnel).

**ES modules** : `stt-parakeet.js`, `stt-whisper.js`.

**Synchronisation obligatoire** : `lib/env/env.php` + `assets/js/env.js` ; script statique → balise `<script>` dans `index.html`.

### API PHP

| Path | Rôle |
|------|------|
| `lib/api/manifest.php` | Liste profils + `runtimeOk` (parts valides, UI projet) |
| `lib/api/lib.php` | Validation bundle profil, agrégation manifest depuis `index.json` |
| `lib/env/env.php` | Config + scripts autorisés |
| `lib/proxy/ollama/olama.php` | Relais Ollama CORS |

Assemblage runtime **`pdm-config`** : navigateur (`PDM.ProfileBundle.loadFromUrl`) — le PHP ne sert que la validation catalogue.

Profil officiel de référence : `assets/profiles/speech2texte/` (12 locales prompts). UI projet : `assets/i18n/ui/`.

### Typographie

Échelle stricte dans `style-base.css` (`:root`) — base `html` 18px : **Fira Code** (`--font-body`), **Inconsolata** (`--font-ui`), **Space Grotesk** (`--font-app-heading`), **Archivo Black** / **Anton** (`--font-hero`). Tokens `--text-*`, `--leading-*`. Voir aussi `THIRD_PARTY_NOTICES.md`.

### Ajouter un fichier JS

1. L’ajouter dans `lib/env/env.php` (`$coreScripts` ou `$providerScripts`) **et** dans `assets/js/env.js` (`FALLBACK.assets.scripts`), dans le bon ordre.
2. S’il est statique (avant bootstrap), ajouter aussi une balise `<script>` dans `index.html`.

## Validation

La base est structurée pour des tests unitaires et de non-régression à venir. Ne pas réintroduire de fichiers monolithiques.

**CI publique** (`.github/workflows/ci.yml`) — exécutée sur chaque push/PR :

- syntaxe shell `install/*.sh`
- `php -l` sur `lib/**/*.php`
- JSON valide (schema, configs, i18n manifest, 12 locales UI)
- parité des clés i18n vs `fr.json`
- version `CS.VERSION` alignée README / CONTRIBUTING
- présence LICENSE, SECURITY, CONTRIBUTING, THIRD_PARTY_NOTICES, `docs/DOCUMENTATION-TECHNIQUE.md` (+ `.en.md`)
- scan basique anti-secrets (token proxy en dur)

Contrôles manuels avant merge : workspace, prompts, options, **export/import ZIP profil**, dictée et panneau historique.

**Profils officiels** (`assets/profiles/` — bundle `speech2texte` versionné sur GitHub) : une clé → un fichier JSON (`parts/locales.json` pour les locales). Prompts en `prompts/{locale}/system.md` + `contexts/{locale}/{Tag}.md` + `gen-prompts/{locale}/*.md`.

Le dépôt public versionne le profil officiel `speech2texte` sous `assets/profiles/` (catalogue `index.json`).

**Responsive** — points de rupture : `assets/css/style-responsive.css` + `polish-responsive.css`. Layout Workspace : `assets/css/style-workspace.css` (`.ws-grid` — 2 colonnes dès 1024px, `minmax(0,1fr)`). Viewports de test **375, 390, 414, 768, 1024** px : pas de défilement horizontal involontaire ; nav burger ; Input/Output empilés sous 1024px ; Prompts en 2 colonnes dès 1024px ; Options en 2 colonnes dès 768px.

## Export / Import — archive ZIP profil (v1.23.0)

- **Conteneur portable** : archive **ZIP** (`{slug}-promptdemerde-profile-v{CS.VERSION}.zip`) — pas de `.json` seul à la racine.
- **Import UI** : **`.zip` uniquement** — rejet explicite si JSON (`importJsonDeprecated` dans `settings-ui.js`).
- **Format logique** : objet `pdm-config` (**51** clés `pdm_*` + métadonnées) assemblé depuis `parts/config.json`, `parts/session.json`, prompts Markdown — voir `profile-bundle-loader.js` / `profile-bundle-export.js`.
- **Presets** : `minimal` (prompts + parts) ; `maximal` (+ `i18n/ui/` pour les langues cochées).
- **Hors export** : `pdm_token_proxy`, `pdm_llm_direct_local` (sessionStorage) ; profils `(perso)` locaux.
- **Schéma machine** : `assets/config/pdm-config.schema.json` — détail des clés dans [`docs/DOCUMENTATION-TECHNIQUE.md`](docs/DOCUMENTATION-TECHNIQUE.md), pas dans README.

## Documentation in-app et pages légales

- **Clone / GitHub** : stubs `pages.*` dans `assets/i18n/ui/*.json` — liens vers [promptdemerde.com](https://promptdemerde.com), GitHub et la [fiche projet DreamProject](https://www.dreamproject.online/prj/promptdemerde/).
- **Site officiel** : pages légales complètes servies sur promptdemerde.com ; documentation = [`docs/DOCUMENTATION-TECHNIQUE.md`](docs/DOCUMENTATION-TECHNIQUE.md) (FR) / [`.en.md`](docs/DOCUMENTATION-TECHNIQUE.en.md) (EN).
- **Footer** : liens externes (documentation technique GitHub ; légal/support → site ou hash légal selon instance).

## Pull requests

- Un sujet par PR quand c’est possible.
- Vérifier manuellement workspace, prompts et options.
