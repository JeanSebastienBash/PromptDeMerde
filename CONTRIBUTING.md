# Contributing to PromptDeMerde

## Principles

- **No build step** — vanilla JS IIFE modules extending `window.PDM.*` (ES modules only for STT engine entrypoints).
- **Small files** — prefer domain-prefixed modules (`workspace-*`, `stt-shared-*`, `storage-*`) under ~350 lines.
- **English identifiers** in code; French for user-facing strings and docs.
- **Zero behavior change** in refactors — move code, do not rewrite logic.

## Structure

See [README § Architecture (contributeurs)](README.md#architecture-contributeurs) for the module map and load order.  
Maintainers with Bible access: canonical docs are `00-meta/00-architecture.md` and `00-meta/00-confidentialite.md` in the private maintainer Bible (kept outside this repo) — keep README and Bible in sync (DEC-032). No `docs/` folder in the repo.

**Export JSON (1.11.0)** : 36 clés `pdm_*` (dont `pdm_project`, `pdm_audio_blobs`, `pdm_workspace_ui`) — mettre à jour `assets/config/pdm-config.schema.json` et la Bible `RFC.md` §08 lors d'un ajout de clé.

**Confidentialité (DEC-029)** : align README, `#privacy` (`index.html`) and `privacy.*` keys (`ollama.js`) with Bible `00-meta/00-confidentialite.md`.

When adding a JS file:

1. Add it to `lib/env/env.php` (`$coreScripts`) **and** `assets/js/env.js` (`FALLBACK.assets.scripts`) in the correct order.
2. If static (before bootstrap), add a `<script>` tag in `index.html`.

## Tests (planned)

The codebase is structured for upcoming unit and regression tests. Do not reintroduce monolithic files.

## Pull requests

- One concern per PR when possible.
- Verify workspace, prompts, and settings routes manually.
- Update the maintainer Bible if architecture or paths change.
