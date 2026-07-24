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
| **Other profiles** | user ZIP import **or** shared free ZIP drop | **No** second folder under `assets/profiles/` |

> **Rule**: `assets/profiles/index.json` lists **only** `speech2texte`. Extensions come from **ZIP import** (localStorage `pdm_custom_profiles`) or from operator drop [`zip/free-profile/`](../zip/free-profile/) — not as a second versioned tree under `assets/profiles/`.

The runtime default profile is `manifest.defaultProfileId` (API `lib/api/manifest.php`), computed from `"default": true` in `manifest.json` or the first valid profile. Current index: platform URL + profile id `speech2texte` only.

## Shared free ZIP drop (`zip/free-profile/`)

**Public distribution for free packs.** Free JSON profile archives published for the marketplace are versioned under [`zip/free-profile/`](../zip/free-profile/) on the public GitHub mirror. For **v1.24.1** the drop includes **AdsGeneratorPro**, **ContractClauseCleaner**, **MeetingMinutesPro**, **NoConformistLandpage**, and **SeoMetaPack** (`*-JsonProfile-v1.24.1.zip`) with embedded `market/` metadata. **Speech2Texte** is the native boot pack under `assets/profiles/` only (not mirrored as a free ZIP). That folder is a first-class download channel: clones and users may grab one or many ZIPs from GitHub **without** opening the Marketplace UI. Marketplace lists packs whose ZIP embeds a valid `market/` folder. **`zip/free-profile/`** remains the direct download channel for free packs (including those without `market/`, which stay importable under Options). **Premium** archives are **not** shipped in the free drop — they are obtained from the Marketplace (or Support).

**On a clone or self-host.** Copy free ZIPs into that install’s `zip/free-profile/` (or use **Options → Import**). Do **not** add second profile trees under `assets/profiles/` — only the boot pack (`speech2texte`) lives there. Renaming free ZIPs is allowed; the Options selector reads **label and version from inside the archive** after validation. Recommended factory names (`{Pascal}-JsonProfile-v…`) remain useful for humans, not a listing gate. The app lists candidates via `lib/api/zip-profiles.php` and shows **validated** packs in **Options → JSON profile**.

### Selector order (canon)

Options → JSON profile lists packs in this order:

1. **Native** (`(native)`) — alphabetical by label  
2. **Free** (zip drop + imports free) — alphabetical by label  
3. **Premium** — alphabetical by label  

Within each group, sorting uses the UI locale (`localeCompare`, base sensitivity).

### Selector badges (canon)

| Origin | Badges |
|--------|--------|
| Bundled pack under `assets/profiles/` (folder listed in `index.json`, e.g. Speech2Texte) | `(native) (Free) (x.y.z)` — or `(Premium)` if the pack tier is premium |
| Shared drop under `zip/free-profile/` | `(zip) (Free) (x.y.z)` / `(zip) (Premium) (x.y.z)` |
| Manual ZIP import or in-app create | `(Free) (x.y.z)` / `(Premium) (x.y.z)` — **no** `(zip)`, **no** `(perso)` |

The **last** parenthesis is always the archive / contract version (`config.version` from inside the ZIP; filename stem is a fallback only).

**(native)** means the pack is part of the application tree in the repository (`assets/profiles/…`). It is the first-boot default when marked as such. Options does **not** remove that folder from disk: switching or importing another pack changes the active session, but the native entry stays available in the selector because it ships with the install.

### Selector dedupe (no double Speech2Texte)

When the same pack exists both as a **native** bundle and as a ZIP under `zip/free-profile/` (same PascalCase label / stem, e.g. Speech2Texte), the selector keeps **only the native** option. The ZIP file remains in the tree for HTTP download and for **Options → Import** if a clean archive is needed after local edits; it is not listed a second time next to `(native)`.

After a drop ZIP is imported into a personal pack, the matching `(zip)` row is also hidden (same rule as before). Rescan is event-driven (boot idle, Options hash, tab focus / visibility) — not a permanent poll.

During scan, the Options selector is disabled while each free-profile archive is checked in order (server metadata first, then client validation without importing). Invalid archives are skipped and never appear in the selector. A permanent status line under the control reports either that all archives are valid, or how many were rejected, with **Show more** / **Show less** to list rejected filenames.

| Layer | Role |
|--------|------|
| `zip/free-profile/*.zip` | **Versioned** free packs for clones + operator drop (GET + list API) |
| `lib/api/zip-profiles.php` | Bounded list for the selector |
| `profile-zip-drop.js` | Fetch list + activate via `Storage.importConfigZip` |

This is complementary to the Marketplace UI (`#market`): drop = instance sharing; market = catalogue vitrine when the feature flag is on.

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
| Thin PHP | `lib/api/manifest.php`, `lib/api/zip-profiles.php`, `lib/api/lib.php` | `runtimeOk`, bundled list from `index.json`, free ZIP drop list |
| Browser | `profile-bundle-*.js`, `profile-zip-drop.js`, etc. | static fetch of `.md` / ZIP, `pdm-config` assembly |

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


