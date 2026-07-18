# Application profiles (`assets/profiles/`)

<p align="center">
  <img src="../assets/images/flags/en.svg" alt="English" width="28" height="20">
</p>

Each profile **bundled at boot** lives in its own folder. The **translated UI** (12 languages) is **shared**: [`assets/i18n/ui/`](../assets/i18n/ui/).

## GitHub repository policy (canon)

| Layer | Path | On public GitHub |
|--------|--------|-------------------|
| **Default profile** | `speech2texte/` + [`index.json`](../assets/profiles/index.json) | **Yes** — only profile served at boot |
| **Other profiles** | user ZIP import | **No** — never a second folder under `assets/profiles/` |

> **Rule**: `assets/profiles/index.json` lists **only** `speech2texte`. Extensions come from **ZIP import** (localStorage `pdm_custom_profiles`) — not as a versioned folder here.

The runtime default profile is `manifest.defaultProfileId` (API `lib/api/manifest.php`), computed from `"default": true` in `manifest.json` or the first valid profile.

## Tree per bundled profile

```
assets/profiles/<profile-id>/
  manifest.json              # id, label, synopsis, project, default (selector)
  prompts/{locale}/system.md
  contexts/{locale}/{Tag}.md
  gen-prompts/{locale}/*.md
  parts/
    locales.json               # defaultLocale + locales[]
    prompts.json               # system + contexts index
    gen-prompts.json
    config.json                # numeric / STT settings (no prose)
```

## Which key lives where (cross prohibitions)

| File | Role | Keys forbidden elsewhere |
|---------|------|--------------------------|
| `manifest.json` | id, label, **synopsis** (≤ 100 chars) | — |
| `parts/locales.json` | `defaultLocale`, `locales[]` | — |
| `parts/prompts.json` | system + contexts index | `availableLocales`, `defaultLocale` |
| `parts/gen-prompts.json` | gen templates index | `availableLocales`, `defaultLocale` |
| `parts/config.json` | settings | `pdm_system_prompt`, `pdm_profiles`, `pdm_context_gen_*` keys; **default `pdm_theme`: `marron-day`** |

## PHP vs browser roles

| Layer | Files | Role |
|--------|----------|------|
| Thin PHP | `lib/api/manifest.php`, `lib/api/lib.php` | `runtimeOk`, profile list **from index.json**, `defaultProfileId` |
| Browser | `profile-bundle-loader.js`, etc. | static fetch of `.md`, `pdm-config` assembly |

PHP **does not load** MD prompts; it validates that the deployment contains coherent bundles.

**HTTP**: in deployment, server config rejects any subdirectory under `assets/profiles/` other than `speech2texte/`.

## Prompt languages (12 locales)

Locales in `parts/locales.json` (`ar`, `de`, `en`, `eo`, `es`, `fr`, `it`, `ja`, `ko`, `pt`, `ru`, `zh`). UI language → prompt locale (1:1).

## User export / import

- **Session**: edited prompts remembered per locale (`pdm_prompts_bundle`).
- **ZIP export**: full profile archive.
- **ZIP import**: restores a profile into `pdm_custom_profiles` — **not** into `assets/profiles/`.

## Related documents

| Document | Role |
|----------|------|
| [`../README.md`](../README.md) | Product pitch |
| [`Documentation.md`](Documentation.md) | Technical documentation |
| [`../CONTRIBUTING.md`](../CONTRIBUTING.md) | Contributing |
| [`../SECURITY.md`](../SECURITY.md) | Security |
| [`../THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md) | Third-party notices |
| [`Stt.md`](Stt.md) | STT zone |
| [`Stt-vosk.md`](Stt-vosk.md) | Vosk catalogue |
| [`Vendor.md`](Vendor.md) | Vendor zone |
