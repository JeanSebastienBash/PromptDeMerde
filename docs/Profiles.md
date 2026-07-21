# Application profiles (`assets/profiles/`)

<p align="center">
  <img src="../assets/images/flags/en.svg" alt="English" width="28" height="20">
</p>
**Documentation navigation** · [Technical documentation](Documentation.md) · [STT models](Stt.md) · [Vosk catalogue](Stt-vosk.md) · [Profiles](Profiles.md) · [Vendor JS](Vendor.md) · [README](../README.md) · [Security](../SECURITY.md)

> **Long-form**: [Documentation.md — 5.5 JSON profile ZIP](Documentation.md#feat-5-5) · [5.5.1 import/export](Documentation.md#feat-5-5-1) · [§6 JSON profile](Documentation.md#menu-json-profile)

Each profile **bundled at boot** lives in its own folder. The **translated UI** (12 languages) is **shared**: [`assets/i18n/ui/`](../assets/i18n/ui/).

**Authoring limit (product):** Options → **Configure profile** edits pack chrome for the **current UI language** only. Other locales in a portable ZIP are maintained by unzip → edit JSON/Markdown → re-zip → import ([Documentation 5.5.2](Documentation.md#feat-5-5-2)).

## GitHub repository policy (canon)

| Layer | Path | On public GitHub |
|--------|--------|-------------------|
| **Default profile** | `speech2texte/` + [`index.json`](../assets/profiles/index.json) | **Yes** — only profile served at boot |
| **Other profiles** | user ZIP import | **No** — never a second folder under `assets/profiles/` |

> **Rule**: `assets/profiles/index.json` lists **only** `speech2texte`. Extensions come from **ZIP import** (localStorage `pdm_custom_profiles`) — not as a versioned folder here.

The runtime default profile is `manifest.defaultProfileId` (API `lib/api/manifest.php`), computed from `"default": true` in `manifest.json` or the first valid profile. Current index: platform URL + profile id `speech2texte` only.

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
- **ZIP export**: full profile archive (`.zip` only — never a lone `.json`).
- **ZIP import**: restores a profile into `pdm_custom_profiles` — **not** into `assets/profiles/`.
- Options UI: create / switch / export modal — Documentation [5.5.4](Documentation.md#feat-5-5-4).
- ZIP I/O uses [`Vendor.md`](Vendor.md) (`jszip.min.js`).

**Documentation navigation** · [Technical documentation](Documentation.md) · [STT models](Stt.md) · [Vosk catalogue](Stt-vosk.md) · [Profiles](Profiles.md) · [Vendor JS](Vendor.md) · [README](../README.md) · [Security](../SECURITY.md)

## Related documents

| Document | Role |
|----------|------|
| [`Documentation.md`](Documentation.md) | Technical documentation — long-form README mirror |
| [`Stt.md`](Stt.md) | STT models — layout under `assets/stt/` |
| [`Stt-vosk.md`](Stt-vosk.md) | Vosk runtime catalogue |
| [`Profiles.md`](Profiles.md) | Bundled profiles & ZIP contract |
| [`Vendor.md`](Vendor.md) | Embedded JS / ONNX vendor |
| [`../README.md`](../README.md) | Product pitch |
| [`../SECURITY.md`](../SECURITY.md) | Security |
| [`../CONTRIBUTING.md`](../CONTRIBUTING.md) | Contributing |
| [`../THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md) | Third-party notices |


