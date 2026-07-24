# Contributing to PromptDeMerde

<p align="center">
  <img src="assets/images/flags/en.svg" alt="English" width="28" height="20">
</p>


## How to contribute

This line is a **release candidate considered production-ready** (see the [official note in README](README.md#menu-official-note)).

| Channel | Use for |
|---------|---------|
| **GitHub Issues** | Product bugs and concrete regressions |
| **Pull requests** | Fixes, documentation, small polish — one topic per PR; English title and description |
| **Email** `dreamproject-ai@proton.me` | General questions; **security** reports (preferred for vulnerabilities) |

The maintainer reviews proposed changes case by case and merges when the code fits. Response time is best-effort (solo maintainer). There is **no** public schedule for new V1 features — the line is feature-frozen; optional voice-dictation improvements may appear later without commitment.

## Principles

- **No build step** — vanilla JS IIFE modules on `window.PDM.*` (ES modules only for STT engine entry points).
- **Short files** — domain-prefixed modules (`workspace-*`, `stt-shared-*`, `storage-*`): target **≤ 100** lines, **150** max; functions **≤ 30** lines.
- **English identifiers** in code; UI strings are translated (twelve locales); public Markdown documentation is English.
- **Zero behavior change** during a refactor — move code, do not rewrite logic.

## UI register (good practice)

**Product** messages (toasts `PDM.UI.notif`, status, error tooltips, Workspace / Options / Prompts / Market) address the user in an **impersonal tone**:

| Do | Do not |
|----|--------|
| "No text in Input. Paste a prompt before cleaning." | "You forgot to paste your prompt." |
| "Dictation in progress — stop it before importing." | "Stop dictation…" / "You must stop…" |
| Cause + action (+ screen if needed), 1–2 sentences | Generic message with no remedy |

- **No informal *you*** (tu / te / ton / tes / t' / familiar imperatives in FR locales).
- **No I / we** as the product voice in feedback.
- Toasts / status: prefer impersonal tone over formal direct address.
- **i18n × 12** whenever a key changes (`assets/i18n/ui/*.json` + `config-schema-core` fallbacks if `workspaceUi`).
- Exception: **marketing landing** (`landing.*`) — brand tone; do not copy the product register there, and **do not** import landing informal *you* into toasts.

## Documentation hierarchy

**This repository is the public source of truth** for everything versioned here (`README.md`, `docs/`, `CONTRIBUTING.md`, `SECURITY.md`, code). The **`docs/`** directory is public: cloneable documentation only — no audits or internal tooling.

When the repository is changed directly, it takes precedence over any external outline. Update non-mirror ops notes to match the repository — **never** rewrite public docs to match an outdated private outline.

**No document history** — replace in place. No `CHANGELOG.md`, no retained "obsolete" sections.

## Structure

**Profile ZIP export (1.24.3)**: **52** `pdm_*` keys in the `pdm-config` object (archive content). Canon: `CS.PDM_KEYS` **≡** `assets/config/pdm-config.schema.json` (same names, including `pdm_output_*`); optional root `i18n` + `langs`. Any new key → core + schema + [`docs/Documentation.md`](docs/Documentation.md#13-the-52-pdm-keys) §13. **Default theme**: `marron-day` (Light Brown) — `CS.DEFAULT_THEME_ID`. **Do not** enumerate keys in `README.md` — point to user documentation and the schema.

**Privacy**: align `SECURITY.md` with runtime behavior.

**Public README**: [`README.md`](README.md) — general audience, welcoming tone. Technical detail → [`docs/Documentation.md`](docs/Documentation.md) — no key lists in the README.

## Architecture (contributors)

**No-build** SPA (IIFE + `window.PDM.*`), Ollama PHP proxy, Markdown profiles assembled **in the browser**.  
Scripts listed in `index.html` (static) and `lib/env/env.php` / `assets/js/env.js` (dynamic, synchronized FALLBACK).  
Responsive CSS: `style-responsive.css`, `polish-responsive.css`, `style-workspace.css` (`.ws-grid`); Workspace and Prompts in 2 columns from **1024px**; Options in 2 columns from **768px**.

**Prod LLM — two flows** (detail in [`docs/Documentation.md`](docs/Documentation.md) / [`SECURITY.md`](SECURITY.md)): **flow A** = prod visitor → **direct** browser connection → local Ollama (`shouldUseDirectOllama()` in `proxy-token-session.js`, branch in `ollama.js`); **flow B** = operator → `olama.php` + token + IP allowlist. Visitors and self-hosters: flow A — no proxy token.

**`PDM_ENV`** (Apache, optional): `prod` | `preprod` | absent → footer badge PROD / PRE-PROD / SELF-HOSTED — see [`docs/Documentation.md`](docs/Documentation.md#deploy-pdm-env-badges) · [`SECURITY.md`](SECURITY.md).

Do not reintroduce monoliths (`storage.js`, `stt.js`, `workspace.js`, monolithic `i18n.js`).

### `window.PDM` namespace (summary)

| Module | File(s) | Role |
|--------|---------|------|
| `PDM.ConfigSchema` | `config-schema-*.js` (11) | `pdm-config` validation (**52** keys), sanitization, security limits, profile index (`parts/*.json`) |
| `PDM.GenPromptSpecs` | `gen-prompt-specs.js` | Single source for 9 gen-prompt specs (`id`, `storageKey`, `fileName`) + session getter map |
| `PDM.ProfileBundle` | `profile-bundle-loader.js` | HTTP/ZIP bundle fetch, locale MD resolution, `pdm-config` assembly |
| `PDM.ProfileBundleExport` | `profile-bundle-export.js` | Profile ZIP archive export/import |
| `PDM.PromptsBundle` | `storage-prompts-bundle.js` | System/context/gen prompts per locale in session (`pdm_prompts_bundle`) |
| `PDM.Storage` | `storage-*.js` (14 static) | localStorage; profile **ZIP archive** export/import (JSON alone rejected on import) |
| `PDM.I18n` | `i18n-locales.js`, `i18n.js`, `i18n-apply-dom.js` | 12-language UI: `t()`, profile boot, DOM `apply()` |
| `PDM.StorageAudioBlobs` | `storage-audio-blobs.js` | IndexedDB audio blobs |
| `PDM.Env` | `env.js` | Client for `lib/env/env.php` |
| `PDM.Providers` / `PDM.LLM` | `providers.js`, `ollama.js`, `llm.js` | Registry and LLM façade |
| `PDM.ContextGeneration` | `context-generation.js` | Assisted `#Tag` generation |
| `PDM.App` | `app.js` + `workspace-*.js` + `*-ui.js` | SPA, cleaning, thinking, WebM dictation |
| `PDM.STT` | `stt-core.js` … `stt-init.js`, `stt-dictation-recorder.js` | Voice dictation + WebM recording |
| `PDM.ProfileSelector` | `profile-selector*.js` | Options JSON profile, named ZIP export |
| `PDM.WorkspaceUi` | `workspace-ui-profile.js` | `pdm_workspace_ui` per profile |
| `PDM.WorkspaceInputTools` | `workspace-input-tools.js` | Input zone button state (greyed + tooltips) |
| `PDM.WorkspaceDictationAudio` | `workspace-dictation-audio*.js` | WebM dictation audio export (engine 1) |
| `PDM.WorkspaceTtsDownload` | `workspace-tts-download.js` | GenericVoice TTS export (engine 2, v2) |
| `PDM.UI` / `PDM.Themes` | `ui.js`, `themes.js`, `footer-projects.js` | DOM, **50** themes (25 families), `--role-*` tokens, footer carousel |

### Load order

#### Static (`index.html`) — before `bootstrap.js`

1. `config-schema-*.js` (11): core → helpers → security → sanitize → build → validate → validate-fields → validate-collections → **validate-locales** → **validate-prompts** → **validate-gen-prompts**
2. `vendor/jszip.min.js` → **`gen-prompt-specs.js`** → **`profile-bundle-loader.js`**
3. `storage-*.js` (14): core → wipe → prompt-fields → profile-meta → llm-settings → settings → workspace-stt → audio-blobs → workspace-audio → history → config-io → config-audio → **prompts-bundle** → config-import
4. **`i18n-locales.js`** → **`i18n.js`** → **`i18n-apply-dom.js`**
5. `env.js` → `animation-inversion.js` → `animation-synopsis.js` → `bootstrap.js`

#### Dynamic (`lib/env/env.php`)

`providers.js` → `ollama.js` → `llm.js` → **`context-generation.js`** → **`profile-bundle-export.js`** → UI/profiles (`profile-selector*.js`, `footer-projects.js`) → STT shared → engines → STT façade → WebM dictation → TTS AV2 placeholder → `workspace-ui-profile.js` → `app.js` → workspace modules → prompts/history UI splits → polish → homepage (optional).

**ES modules**: `stt-parakeet.js`, `stt-whisper.js`.

**Mandatory synchronization**: `lib/env/env.php` + `assets/js/env.js`; static script → `<script>` tag in `index.html`.

### PHP API

| Path | Role |
|------|------|
| `lib/api/manifest.php` | Profile list + `runtimeOk` (valid parts, project UI) |
| `lib/api/lib.php` | Profile bundle validation, manifest aggregation from `index.json` |
| `lib/env/env.php` | Config + allowed scripts |
| `lib/proxy/ollama/olama.php` | Ollama CORS relay |

Runtime **`pdm-config`** assembly: browser (`PDM.ProfileBundle.loadFromUrl`) — PHP only serves catalogue validation.

Reference official profile: `assets/profiles/speech2texte/` (12 locale prompts). Project UI: `assets/i18n/ui/`.

### Typography

Strict scale in `style-base.css` (`:root`) — base `html` 18px: **Fira Code** (`--font-body`), **Inconsolata** (`--font-ui`), **Space Grotesk** (`--font-app-heading`), **Archivo Black** / **Anton** (`--font-hero`). Tokens `--text-*`, `--leading-*`. See also `THIRD_PARTY_NOTICES.md`.

### Adding a JS file

1. Add it in `lib/env/env.php` (`$coreScripts` or `$providerScripts`) **and** in `assets/js/env.js` (`FALLBACK.assets.scripts`), in the correct order.
2. If static (before bootstrap), also add a `<script>` tag in `index.html`.

## Validation

This repository does **not** ship an automated product unit / regression test suite (maintainer choice). Do not add a `tests/` product suite unless the maintainer explicitly asks for one. Do not reintroduce monolithic files.

**Public CI** (`.github/workflows/ci.yml`) — structural checks on every push/PR:

- shell syntax `install/*.sh`
- `php -l` on `lib/**/*.php`
- valid JSON (schema, configs, i18n manifest, 12 UI locales)
- i18n key parity vs `fr.json`
- `CS.VERSION` aligned with README / CONTRIBUTING
- presence of LICENSE, SECURITY, CONTRIBUTING, THIRD_PARTY_NOTICES, `docs/Documentation.md`
- basic anti-secret scan (hard-coded proxy token)

Manual checks before merge: workspace, prompts, options, **profile ZIP export/import**, dictation and history panel.

**Official profiles** (`assets/profiles/` — `speech2texte` bundle versioned on GitHub): one key → one JSON file (`parts/locales.json` for locales). Prompts in `prompts/{locale}/system.md` + `contexts/{locale}/{Tag}.md` + `gen-prompts/{locale}/*.md`.

The public repository versions the official `speech2texte` profile under `assets/profiles/` (catalogue `index.json`).

**Responsive** — breakpoints: `assets/css/style-responsive.css` + `polish-responsive.css`. Workspace layout: `assets/css/style-workspace.css` (`.ws-grid` — 2 columns from 1024px, `minmax(0,1fr)`). Test viewports **375, 390, 414, 768, 1024** px: no unintended horizontal scroll; burger nav; Input/Output stacked below 1024px; Prompts in 2 columns from 1024px; Options in 2 columns from 768px.

## Export / Import — profile ZIP archive (v1.24.3)

- **Portable container**: **ZIP** archive (`{slug}-promptdemerde-profile-v{CS.VERSION}.zip`) — no standalone `.json` at the root.
- **UI import**: **`.zip` only** — explicit rejection if JSON (`importJsonDeprecated` in `settings-ui.js`).
- **Logical format**: `pdm-config` object (**52** `pdm_*` keys + metadata) assembled from `parts/config.json`, `parts/session.json`, Markdown prompts — see `profile-bundle-loader.js` / `profile-bundle-export.js`.
- **Presets**: `minimal` (prompts + parts); `maximal` (+ `i18n/ui/` for checked languages).
- **Excluded from export**: `pdm_token_proxy`, `pdm_llm_direct_local` (sessionStorage); local `(perso)` profiles.
- **Machine schema**: `assets/config/pdm-config.schema.json` — key detail in [`docs/Documentation.md`](docs/Documentation.md), not in README.

## In-app documentation and legal pages

- **Clone / GitHub** (without `assets/i18n/site-pages/`): footer Mentions, Terms, Privacy and Support open <a href="https://promptdemerde.com" target="_blank" rel="noopener noreferrer">promptdemerde.com</a> (hash) with a green badge — same pattern as Marketplace. `pages.*` stubs in `assets/i18n/ui/*.json` are not shown in navigation.
- **Official site** (with `site-pages/`): full local legal pages; no green badge.
- **Documentation** footer: GitHub [`docs/Documentation.md`](docs/Documentation.md) (English, all UI locales).
- **Detection**: `features.sitePages` via `lib/env/env.php` (readable `assets/i18n/site-pages/fr.json`).

## Pull requests

- One topic per PR when possible.
- Manually verify Workspace, Prompts, and Options (and profile ZIP export/import when touched).
- Prefer English for title, description, and discussion on this repository.
- Do not expect an automated product test gate beyond the structural CI above.

## Related documents

| Document | Role |
|----------|------|
| [`README.md`](README.md) | Product pitch |
| [`docs/Documentation.md`](docs/Documentation.md) | Technical documentation |
| [`SECURITY.md`](SECURITY.md) | Security |
| [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) | Third-party notices |
| [`docs/Stt.md`](docs/Stt.md) | STT zone |
| [`docs/Stt-vosk.md`](docs/Stt-vosk.md) | Vosk catalogue |
| [`docs/Profiles.md`](docs/Profiles.md) | Profiles zone |
| [`docs/Vendor.md`](docs/Vendor.md) | Vendor zone |
