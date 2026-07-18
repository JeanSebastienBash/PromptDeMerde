# Technical documentation

<p align="center">
  <img src="../assets/images/flags/en.svg" alt="English" width="28" height="20">
</p>

<p align="center">
  <a href="../LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <a href="../README.md"><img src="https://img.shields.io/badge/version-1.23.0-blue.svg" alt="Version 1.23.0"></a>
</p>

> **Application version** : 1.23.0 (`CS.VERSION`)  
> **Audience** : developers, code auditors, self-hosting operators  
> **Language** : English  
> **Related** : [`README.md`](../README.md) · [`CONTRIBUTING.md`](../CONTRIBUTING.md) · [`SECURITY.md`](../SECURITY.md)

This document describes behaviour that is **verifiable in the repository**: files, contracts, flows, and inventories. It is not a marketing guide.

---

## Table of contents

1. [Purpose and scope](#1-purpose-and-scope)
2. [Contracts and versions](#2-contracts-and-versions)
3. [Browser data model and privacy](#3-browser-data-model-and-privacy)
4. [SPA shell — navigation, themes, i18n, feedback](#4-spa-shell-navigation-themes-i18n-feedback)
5. [Workspace](#5-workspace)
6. [Prompts — system, context prompts, context prompt generators](#6-prompts-system-context-prompts-context-prompt-generators)
7. [Options, profiles, export, and danger zone](#7-options-profiles-export-and-danger-zone)
8. [Voice dictation and audio (STT)](#8-voice-dictation-and-audio-stt)
9. [Image import → description (vision)](#9-image-import-description-vision)
10. [Marketplace and legal pages (clone vs official site)](#10-marketplace-clone-vs-official-site)
11. [Ollama — flow A and flow B](#11-ollama-flow-a-and-flow-b)
12. [Export / import — profile ZIP archive](#12-export-import-profile-zip-archive)
13. [The 51 `pdm_*` keys](#13-the-51-pdm-keys)
14. [`PDM.*` namespaces](#14-pdm-namespaces)
15. [JavaScript inventory](#15-javascript-inventory)
16. [CSS inventory](#16-css-inventory)
17. [PHP, proxy, and API](#17-php-proxy-and-api)
18. [Self-hosted install and deployment](#18-self-hosted-install-and-deployment)
19. [Import security and limits](#19-import-security-and-limits)
20. [Profile, STT, and vendor assets](#20-profile-stt-and-vendor-assets)
21. [Glossary and cross-references](#21-glossary-and-cross-references)
22. [Quick troubleshooting](#22-quick-troubleshooting)
23. [License](#license)


---

<a id="1-présentation"></a>
<a id="1-purpose-and-scope"></a>
## 1. Purpose and scope

### 1.1 Technical role

PromptDeMerde is an HTML/CSS/JavaScript **SPA** (IIFE, `window.PDM` namespace), served with a minimal PHP shell. LLM processing goes through **Ollama**. Dictation and audio transcription run in the **browser** (WASM / ONNX). Application persistence uses `localStorage`, `sessionStorage`, and IndexedDB. Profile export/import produces a client-assembled **ZIP** archive.

| Aspect | Implementation |
|--------|----------------|
| Workspace input | Text (typing, dictation, audio/video import, image import → vision description) |
| LLM assembly | Optional system prompt + active context prompts (`#Tag`) + user message (Input) |
| Output | Output panel; display formats `text` / `json` / `html` |
| Persistence | `pdm_*` keys; history; audio blobs |
| Stack | `index.html` + `assets/js/*` modules; `assets/css/*` CSS; PHP `lib/api`, `lib/env`, `lib/proxy` |

### 1.2 Code scope (facts)

| Present in the repository | Absent from the shipped application runtime |
|----------------------|-------------------------------------|
| Reformulation via Ollama (draft clean-up / structuring) | Autonomous multi-turn chatbot |
| Browser STT (Vosk, Whisper, Parakeet) | Mandated cloud transcription service |
| Optional PHP proxy toward Ollama | Server database of user drafts |
| Bundled `speech2texte` profile | Requirement for a user account |

Sources of truth: [`assets/js/config-schema-core.js`](../assets/js/config-schema-core.js) (`CS.VERSION`) · [`assets/config/pdm-config.schema.json`](../assets/config/pdm-config.schema.json).

### 1.3 README vs this document

| Document | Role |
|----------|------|
| `README.md` | Product pitch, Features 1–40, prerequisites |
| **Technical documentation** (this file) | Implementation inventory, contracts, and troubleshooting — single doc channel |

---

<a id="2-contracts-and-versions"></a>
## 2. Contracts and versions

The current application version is defined by `CS.VERSION` and equals `1.23.0`. The default theme is `CS.DEFAULT_THEME_ID` (`marron-day`). Exportable preferences are listed in `CS.PDM_KEYS`: **51** `pdm_*` keys (detail in [§13](#13-the-51-pdm-keys)). The matching machine schema lives in `assets/config/pdm-config.schema.json`.

A `CS.VERSION` bump occurs when the `pdm_*` contract or the session evolves in source code; the shipped profile `assets/profiles/speech2texte/` is then recompiled in the same pass. JavaScript load order is fixed in `lib/env/env.php`, with a fallback in `assets/js/env.js`; required static scripts also appear in `index.html`.

---

<a id="2-modèle-de-confidentialité"></a>
<a id="3-browser-data-model-and-privacy"></a>
## 3. Browser data model and privacy

### At a glance

The **same promise** applies on [promptdemerde.com](https://promptdemerde.com/) and in self-hosting: no telemetry, no server database, and usage data stays in the browser. On the official site, Ollama runs on the browser machine (flow A): the VPS does not receive LLM inference. Dictation and audio or video import stay in the browser. Profile ZIP export and import are handled **100% client-side**: the server does not read the archive.

### 3.1 Data flows

```
[Browser]
  ├─ localStorage : 51 pdm_* keys + session
  ├─ sessionStorage : operator proxy token (excluded from export)
  ├─ IndexedDB : audio blobs (optional)
  ├─ STT : local WASM/ONNX (Vosk, Whisper, Parakeet)
  └─ LLM flow A : direct fetch → http://localhost:11434 (Ollama)

[PHP proxy olama.php] — flow B or same-origin self-hosting
  └─ In-memory POST transit → Ollama — no application disk writes
```

### 3.2 What the PHP web server does not persist

Here **server** means the **VPS or PHP vhost** that serves `index.html`, assets, and optionally `olama.php` — whether [promptdemerde.com](https://promptdemerde.com/) or a self-hosted install. It is **not** Ollama (on the browser machine) and not the browser (`localStorage`).

- The server does not log profile ZIP imports (**100% client** processing).
- It does not store clean history or user drafts.
- It does not send audio to the cloud for transcription (STT stays in the browser).

**Operator flow B**: the POST body transits in **RAM** via `olama.php` with no application disk write — see [`SECURITY.md`](../SECURITY.md).

### 3.3 Audit

The code is published under the MIT license on GitHub and is the same base as the official deployment. Proxy, CSP, and malicious-import detail is in [`SECURITY.md`](../SECURITY.md).

---

<a id="4-spa-shell-navigation-themes-i18n-feedback"></a>
## 4. SPA shell — navigation, themes, i18n, feedback

### 4.1 Hash routing

Hash routing is handled by [`assets/js/app.js`](../assets/js/app.js) (`PDM.App`). Navigation does not reload the page.

| Hash / id | Behaviour |
|-----------|----------------|
| `#landing` | Landing if `PDM.Homepage` is active; otherwise workspace |
| `#workspace` | Workspace (default) |
| `#prompts` | Prompts |
| `#market` | Marketplace entry (on a public clone: link to the official site) |
| `#settings` | Options |
| `#config` | Alias of `#settings` |
| `#mentions`, `#cgu`, `#privacy`, `#support` | Legal / support pages |
| `#documentation`, `#doc-*` | Legacy — opens GitHub technical docs (FR/EN by UI language) then Workspace |
| *(empty / unknown)* | Resolves to `workspace` |

### 4.2 Themes

The [`themes.js`](../assets/js/themes.js) module exposes **50** themes (25 families in light and dark variants). The active id is stored in `pdm_theme`. The default value is `marron-day`.

<a id="35-i18n"></a>
### 4.3 i18n

[`assets/i18n/manifest.json`](../assets/i18n/manifest.json) declares the twelve locales `fr`, `en`, `ar`, `zh`, `eo`, `es`, `de`, `pt`, `it`, `ru`, `ja`, and `ko`. Modules `i18n.js`, `i18n-apply-dom.js`, and `i18n-locales.js` apply labels and metadata (including RTL).

### 4.4 Feedback and accessibility

Notifications go through `PDM.UI.notif`. The shell handles the loader, burger menu, and Escape. The `polish-a11y.css` stylesheet honours `prefers-reduced-motion`. Ctrl/Cmd+Enter triggers Clean when focus allows it.

### 4.5 Header and footer

Header animations are carried by `animation-inversion.js` and `animation-synopsis.js`. The footer relies on `footer-projects.js` and `footer-radar-portrait.js`. The environment badge reflects the server variable `PDM_ENV`.

---

<a id="32-workspace"></a>
<a id="5-workspace"></a>
## 5. Workspace


| Area            | Behaviour                                                         |
| --------------- | -------------------------------------------------------------------- |
| **Input**       | Free text; dictation inserts at the cursor if `pdm_stt_insert_at_cursor`; **long text**: automatic multi-pass inference (see §5.1) |
| **Output**      | Ollama result; model selector; **text / JSON / HTML** format chips (see §5.2) |
| **Reset**       | Button to the right of the **Input** and **Output** headers: same action, clears input and result (**confirmation** required) |
| **Clean**       | Requires a system prompt **or** ≥1 active context prompt                     |
| **History**     | Side panel (100 entries max, `pdm_clean_history`) with a full Input / system / context prompts / Output trace (± compression) |
| **Active tags** | **Context prompts** panel (`#context-panel`), **collapsed by default**; a click on the title shows the `#Tag` entries |
| **Compress tokens** | **Token compression** panel (optional checkboxes, all off by default); on **Clean**, compresses system/context prompts/Input before inference, and Output after if checked — see §5.3 |


Layout uses `.ws-grid`: two columns from 1024 px width ([`assets/css/style-workspace.css`](../assets/css/style-workspace.css)).

<a id="321-input-long-multi-pass-inférence"></a>
### 5.1 Long INPUT (multi-pass inference)

> [!NOTE]
> Applies to text **already in the Input area** (pasted or from dictation). This is **not** a change to the STT engine (Whisper, Vosk, Parakeet).

There is **no hard limit** on the inference side: a very long text is split into several passes. For **ZIP export**, `pdm_workspace.input` is capped at **50,000** characters.

The following constants are expressed in characters (not tokens):

| Threshold | Value | Effect |
|-------|--------|-------|
| `CHUNK_FORCE_CHARS` | **2,800** | Beyond this → multi-pass required |
| `PROMPT_CHAR_BUDGET` | **10,000** | If system+contexts+Input exceeds → multi-pass |
| `CHUNK_MAX_CHARS` | **3,200** | Max chunk size |
| `CHUNK_MIN_CHARS` | **1,200** | Min chunk size (large overhead) |

Chunk size follows `min(3200, max(1200, 10000 − overhead − 600))`, where `overhead = system + active contexts + 200`.

Chunking and inference behaviour:

1. Split on paragraphs, lines, sentence endings, then spaces.
2. Each chunk is cleaned separately; the final OUTPUT is the **concatenation** of all passes (`\n\n` between chunks).
3. During the stream, the indicator shows `pass: i/n`.
4. Meta drift (agent, “ambitious request”) → **1 strict retry** per chunk.


The modules involved are `workspace-input-chunk.js` and `workspace-inference.js`.

<a id="322-format-daffichage-output"></a>
### 5.2 OUTPUT display format

The `pdm_output_display_format` key (default `text`) drives the chips in the Workspace LLM Options panel:

| Value | Effect |
|--------|-------|
| `text` | Plain text (canonical — history storage) |
| `json` | JSON wrapping for display only |
| `html` | HTML wrapping for display only |

JSON profiles (`output_xx`) may still ask the model for an envelope; the UI always **extracts** the useful text before display. Quotes, accents, and special characters must **not** be forbidden in INPUT or OUTPUT.

The modules involved are `workspace-output-format.js` and `profile-output-json.js`.

<a id="323-compresser-les-tokens"></a>
### 5.3 Compress tokens

The **Token compression** dropdown sits just above “Context prompts”:

- **Active checkboxes** (multi-select): system prompt, active context prompts, Input area, and Output area. All are **unchecked by default**.
- **On Clean**, checked targets among system prompt, context prompts, and Input are compressed **before** inference, which frees the context window.
- **After Clean**, if Output is checked, the displayed text is shortened (display only).
- There is **no** Compress button and no confirmation dialog: selecting the checkboxes is enough.
- **Thinking**: it is **not** configured in this panel; it is produced *during* Clean. To ease GPU load, the thinking ceiling is set in Options (or thinking is disabled).
- The internal rate aims to keep about **55%** of the text (`rate: 0.55`). That rate is not exposed in the UI and is not persisted (no `pdm_*` key).
- **During compression**, an **Output** overlay shows an indeterminate preload, the step label, and **Stop**; the menu keeps only the checkboxes and Output is locked.
- **After compression**, a visual mark (bar and green chip) appears on the relevant chips and persists in session until the content changes.
- On the UI side, compression calls Ollama in local extractive mode (`think: false`) via `prompt-compress.js`, with placeholder shielding and anti-LaTeX; if sentinels are lost, the original text is kept.
- **Creator / archives**: the same target rate applies outside the UI (private maintainer tooling). Any engine gap is **intentional**.
- **History**: each Clean writes a `pdm_clean_history` entry with a `trace` field (Input, system prompt, active context prompts, Output — **original** and **compressed** versions if the box was checked). Without compression, only original blocks are kept. The UI offers a responsive accordion, per-block copy, and a full-screen modal.
- **Output area**: compression shortens the displayed result and does **not** free the context window for the next Clean (unlike the system prompt and context prompts).
- **Integrity**: compression must neither introduce LaTeX (`$\rightarrow$`), nor leak or eat `{{…}}` placeholders, nor alter `output_*` keys.

---

### 5.4 Workspace modules

| Module | Role |
|--------|------|
| `workspace-inference.js` | Clean orchestration |
| `workspace-stream.js` | Stream + thinking panel |
| `workspace-input-chunk.js` | Long Input multi-pass |
| `workspace-output-format.js` | Output display format |
| `prompt-compress.js` | Token compression |
| `history-ui.js` / `history-ui-list.js` / `history-ui-modal.js` / `history-trace.js` | History |
| `workspace-audio-bind.js` / `workspace-audio-mode.js` | Audio/video import |
| `workspace-image-bind.js` / `workspace-image-encode.js` | Vision image import |
| `workspace-tts-download.js` | TTS export placeholder |

### 5.5 Mutual exclusion of Input modes

Dictation, audio/video import, and image import modes are mutually exclusive (`workspace-input-tools.js`, `workspace-audio-mode.js`, `workspace-image-bind.js`).

The full inventory is in [§15.3](#153-workspace).

---

<a id="5-prompts--système-prompts-de-contexte-générateurs"></a>
<a id="6-prompts-system-context-prompts-context-prompt-generators"></a>
## 6. Prompts — system, context prompts, context prompt generators

### At a glance

Assembly rests on three levels. The **system prompt** (unique) sets the global personality. **Context prompts**, also called **`#Tag`**, add multiple instructions. **Context prompt generators** are internal templates that produce those `#Tag` entries. Injection order is driven by `pdm_context_position` (`after_system` or `before_system`). The **Workspace** text (Input area) is **always** sent last as the user message.

The system prompt is **editable directly** in its area; changes are **saved automatically** when another element receives focus (or the field is left).

### 6.1 LLM message assembly (simplified)

```
after_system:
  [system] system prompt
  [system] active context prompts (#Tag1, #Tag2…)
  [user]   Workspace text

before_system:
  [system] active context prompts
  [system] system prompt
  [user]   Workspace text
```

<a id="52-génération-assistée-de-tag"></a>
### 6.2 Assisted `#Tag` generation

The module involved is [`assets/js/context-generation.js`](../assets/js/context-generation.js).

Two entries on the Prompts screen:

- **By title**: a tag is entered, then the associated **context prompt** is generated.
- **By intent**: the need is described in free text (the **tag / title is chosen by the AI**, and is not typed in the title field). The **model** is the same as the Workspace model. The **Options** panel exposes max tokens, temperature, retry temperature, and max retries (`pdm_context_gen_*`, synced with the advanced “Prompts LLM…” panel). Generation runs as a **stream** with a **Stop** button. This generation does not use thinking mode (JSON output).

Associated keys are `pdm_context_gen_*` (see [§13](#13-the-51-pdm-keys)).

### 6.3 Application profiles

- **Official**: the `speech2texte` profile handles post-dictation correction. It is **bundled** under `assets/profiles/speech2texte/` and listed in the `index.json` catalogue.
- **Personal**: `(perso)` profiles are created locally and exportable as ZIP.
- A profile change triggers a local wipe then loads the bundle, after a single confirmation.

Contexts shipped with `speech2texte` (bundle active state):

| `#Tag` | Active | Role |
|--------|--------|------|
| `#SansPonctuationDAbord` | yes | Misplaced STT punctuation |
| `#DerniereFormulation` | yes | Last version after rephrasing |
| `#MotsParasites` | yes | Phonetic intruders |
| `#HesitationsOral` | yes | Uh, um, well… |
| `#FrancaisNaturel` | yes | Fluency after cleanup |
| `#Conservateur` | no | Strict mode |

---

<a id="7-options-profiles-export-and-danger-zone"></a>
## 7. Options, profiles, export, and danger zone

Typical Options screen sections:

- **LLM**: Ollama URL, optional Ollama token, “I don’t have a token” checkbox (flow A), operator proxy token (sessionStorage). After changing the URL, **blur** or the **Test** button refreshes the Workspace model list (`#ws-output-model-select`) from Ollama; only models actually returned by the instance appear (no ghost “saved model” option outside the list); on failure, the list and stored model are invalidated.
- **Dictation**: the panel groups the STT engine, CPU/GPU choice, microphone, and last-word delete shortcut.
- **Language**: the twelve locales are available; the i18n switch is immediate.
- **Theme**: fifty themes are offered (twenty-five families in light and dark); the default is `marron-day` (Light brown).
- **JSON profile**: the screen supports ZIP export, ZIP import, profile selector, and creation of a `(perso)` profile.
- **Danger zone — Erase everything**: purges PromptDeMerde data in the browser (`localStorage` / `sessionStorage` `pdm_*`, IndexedDB `pdm-audio`, Cache Storage `pdm-*`, Parakeet cache if any), invalidates in-memory application caches, then reloads the app with a `pdm_fresh` parameter (removed at boot). It does **not** replace wiping all Chromium/Firefox browsing data for every site, nor an absolute Shift+F5; for a “blank browser” test outside the PDM origin, the manual process remains safest.


### 7.1 Related modules

| Module | Role |
|--------|------|
| `settings-ui.js` | Options UI |
| `profile-selector.js` and `profile-selector-*.js` | Selector / export modal |
| `profile-bundle-*.js` | ZIP bundle / integrity |
| `storage-wipe.js` | Erase everything |
| `proxy-token-session.js` | Proxy token sessionStorage |

---

<a id="6-dictée-vocale-et-audio"></a>
<a id="8-voice-dictation-and-audio-stt"></a>
## 8. Voice dictation and audio (STT)

### At a glance

Five STT engines run **in the browser**; audio is **never** sent to the server. Vosk is recommended on Linux (CPU). Whisper and Parakeet rely on WebGPU when available. Importing an audio or video file (🎵) uses Whisper Maxi for local transcription; for video, the audio track is extracted in the browser. While the file is being analyzed, dictation is paused. **As soon as text appears in Input**, editing, a new dictation, or clearing (trash / New input) are possible, without going through Reset. After a GitHub clone, the command `cd install && bash restore-large-assets.sh` restores the models.

The Workspace strip shows **Start voice dictation**, **Stop voice dictation**, then **Options**. There are no engine or microphone badges at the top: a discreet red message appears next to the button according to the phase (**Starting voice dictation…**, **Microphone authorization…**, **Loading voice engine…**, **Voice dictation in progress**).

**Start voice dictation** (single click):
1. requests microphone permission from the browser if needed;
2. automatically loads the selected voice engine (equivalent to **Load engine**);
3. starts dictation.

In Options, **Load engine** remains available to preload without dictating. The Microphone row combines a selector and **Refresh microphones**.

**Continuity during navigation**: a dictation started on the Workspace **does not stop** when switching screens (Market, Options, legal pages, etc.). Text continues to be inserted into the Input area. To stop: return to the Workspace then **Stop voice dictation** (or close / reload the page).

**Actions that reload the page** (language change, profile import, local wipe, profile change, etc.): if a dictation is in progress, a **modal** asks for confirmation. While the modal is open, **dictation continues** (speaking remains possible). On confirmation: a **triple warning beep** (stop pattern × 3, ~1.5 s — reload **waits** for the beeps to finish), dictation stops, a visual notification appears, then the action proceeds. On cancel: dictation remains active. **Right after reload**, a dialog offers to **resume dictation** (one click) or to close.

### 8.1 Engines


| ID `pdm_stt_engine`             | Files                              | Notes                    |
| ------------------------------- | ---------------------------------- | ------------------------ |
| `vosk-mini`                     | `vosk-mini/model.tar.gz` (FR); `vosk-mini/{langId}/` | CPU; **multilingual path** (catalogue) |
| `vosk-maxi`                     | `vosk-maxi/model.tar.gz` (FR)      | CPU, reliable on Linux; product FR |
| `whisper-mini` / `whisper-maxi` | `assets/stt/whisper-*/onnx/*.onnx` | WebGPU recommended       |
| `parakeet`                      | `assets/stt/parakeet/*.onnx`       | Best quality, GPU        |

Vosk multilingual = **Mini** (shipped languages). **Maxi** = French. The STT / Vosk language effort is **closed** for open source (minor fixes only — no Vosk redesign). Detail: [`Stt-vosk.md`](Stt-vosk.md).

The canonical engine list is `CS.STT_ENGINES` in `config-schema-core.js`.

### 8.2 STT keys (Speech To Text)


| Key                            | Role                              |
| ------------------------------ | --------------------------------- |
| `pdm_stt_device_id`            | Preferred microphone ID           |
| `pdm_stt_engine`               | Active engine                     |
| `pdm_stt_compute`              | `cpu` or `gpu`                    |
| `pdm_stt_insert_at_cursor`     | Insert dictation at cursor        |
| `pdm_stt_delete_word_enabled`  | Shortcut to delete last word      |
| `pdm_stt_delete_word_shortcut` | e.g. `ctrl+backspace`             |
| `pdm_stt_delete_word_target`   | `end` or `cursor`                 |


### 8.3 Secure context and microphone permission

The microphone and WebGPU require **HTTPS** or `http://localhost`. On a LAN IP over HTTP, the microphone is blocked by browser policy.

| Situation | Behavior |
| --------- | -------- |
| Microphone not yet authorized | **Start voice dictation** opens the browser permission prompt, then continues |
| Microphone accepted | Dictation starts (and loads the engine if needed) |
| Microphone **permanently denied** (site settings) | The browser **no longer shows** the prompt. Reset the site permission (padlock / site info → Microphone → Allow), then retry **Start voice dictation** or **Refresh microphones** |

<a id="64-enregistrement-webm"></a>
### 8.4 WebM recording

Dictation can record an audio stream in WebM format in parallel with recognition. References to these recordings are stored via `pdm_audio_blobs`: blobs live in IndexedDB on the browser side, with a base64 export option when the profile ZIP includes audio.

### 8.5 STT troubleshooting

| Symptom | Hint |
|---------|------|
| Microphone blocked on LAN IP over HTTP | Serve over `https://` or open the app via `http://localhost` |
| Whisper / Parakeet slow or on CPU | Check WebGPU (`about:support` → WebGPU, or `navigator.gpu` in the console). A physical GPU does not guarantee WebGPU |
| Acceleration badge orange | Requested acceleration ≠ engine in memory → reload the engine (📥) |
| Low quality | Prefer Vosk Maxi on Linux; Whisper Maxi / Parakeet when WebGPU is reliable |

Strip messages (phases): **Starting…**, **Microphone permission…**, **Loading engine…**, **Dictation in progress** — i18n keys `stt.help.*` / `stt.status.*`.

---

<a id="6bis-import-image--description"></a>
<a id="9-import-image--description-vision"></a>
<a id="9-image-import-description-vision"></a>
## 9. Image import → description (vision)

The **Import an image** button in the Input area opens a file picker (**no** drag-and-drop). Accepted formats are PNG, JPEG, WebP, and GIF. The image is resized in the browser then sent to Ollama (model `pdm_image_model`, instruction `pdm_image_prompt`) via the existing proxy, in **memory transit**, with no server-side storage of the image.

- The image model and instruction are edited on the **Prompts** screen, Image prompts block.
- Vision models **do not appear** in the text LLM selectors (Workspace and context prompt generation): they appear only in the Image prompts block selector.
- The default instruction aims for a full mapping to **reproduce** the image.
- **On failure**, the toast states the cause and the action (for example missing model → `ollama pull <model>` then Prompts → Image prompts; Ollama unreachable → Options → LLM). No generic “failed” message is shown without a follow-up.
- The application **does not install** models: the `ollama pull <model>` command must still be run outside the UI (example: `moondream`).

---

<a id="10-marketplace-clone-vs-official-site"></a>
## 10. Marketplace and legal pages (clone vs official site)

On a public clone:

- **Marketplace** opens the online catalogue at [promptdemerde.com/#market](https://promptdemerde.com/#market) (green badge).
- **Legal notice / Terms / Privacy / Support** open the matching pages on [promptdemerde.com](https://promptdemerde.com) (same badge). Detection: presence of `assets/i18n/site-pages/fr.json` (`features.sitePages`).

Marketplace implementation detail is not part of this repository’s public mirror.


---

<a id="4-ollama--flux-a-et-flux-b"></a>
<a id="11-ollama-flow-a-and-flow-b"></a>
## 11. Ollama — flow A and flow B

### At a glance

In **flow A** (visitor in production), the browser calls Ollama **directly** on `localhost:11434`, with the “I don't have a token” checkbox checked. In **flow B** (operator), requests go through the PHP relay `olama.php`, with token and IP allowlist. In self-hosting, the path is often same-origin via the local proxy.

### 11.1 Flow A — implementation

Direct mode detection is handled by `shouldUseDirectOllama()` in [`assets/js/proxy-token-session.js`](../assets/js/proxy-token-session.js). The fetch branch is in [`assets/js/ollama.js`](../assets/js/ollama.js). Ollama must allow the site origin via `OLLAMA_ORIGINS=https://promptdemerde.com`. The CSP `connect-src` directive (server config) allows localhost and RFC1918 ranges.

#### Step by step — visitor (flow A, official site)

1. Install [Ollama](https://ollama.com) on the local machine and pull a model (`ollama pull …`).
2. Allow the site origin: `OLLAMA_ORIGINS=https://promptdemerde.com`, then restart Ollama (Linux: env / systemd unit; macOS / Windows: env before starting the service).
3. Open [promptdemerde.com](https://promptdemerde.com/) → **Options → LLM**: URL `http://localhost:11434`, “I don't have a token” checked.
4. Click **Test**: the model list should appear. On CORS failure (`Failed to fetch`), re-check `OLLAMA_ORIGINS` and the restart.

Quick check: `curl -i http://localhost:11434/api/tags` should respond; in the browser, the console should no longer show CORS errors to `localhost:11434`.

### 11.2 Flow B — operator

The server reads the `PDM_PROXY_TOKEN` secret. On the client, `pdm_token_proxy` is stored in **sessionStorage** and is not included in the ZIP export. The relay is [`lib/proxy/ollama/olama.php`](../lib/proxy/ollama/olama.php): rate limiting, request body cap, no redirect.

<a id="43-paramètres-llm-workspace-panel"></a>
### 11.3 LLM parameters (Workspace panel)


| Key                          | Role                                    |
| ---------------------------- | --------------------------------------- |
| `pdm_llm_temperature`        | Clean temperature (0 = default)         |
| `pdm_llm_max_tokens`         | Output cap                              |
| `pdm_llm_timeout_sec`        | Inference timeout (default 1000 s)      |
| `pdm_llm_thinking_enabled`   | Show model thinking                     |
| `pdm_llm_thinking_max_chars` | Thinking character cap                  |
| `pdm_output_display_format`  | OUTPUT display format: `text`, `json`, `html` (default `text`) |


---

<a id="7-export--import--archive-zip-profil"></a>
<a id="12-export-import-profile-zip-archive"></a>
## 12. Export / import — profile ZIP archive

### At a glance

The **Export** action downloads a **ZIP archive**; a standalone JSON file is not produced. The **Import** action accepts only the `.zip` extension. The archive contains JSON under `parts/`, Markdown files (system prompt and context prompts), and a manifest. The assembled logical object is `pdm-config` (51 keys). Available presets are **minimal** and **maximal**. Proxy tokens and flow A/B preferences stay in sessionStorage and are **excluded from export**.

### 12.1 Filename

```
{slug}-promptdemerde-profile-v{CS.VERSION}.zip
```

Example filename: `speech2texte-promptdemerde-profile-v1.23.0.zip`

The filename is built by `buildZipFilename()` in [`assets/js/profile-bundle-export.js`](../assets/js/profile-bundle-export.js).

### 12.2 ZIP structure

```
manifest.json
parts/
  config.json       # “config” keys (STT, theme, gen numerics, workspace_ui…)
  session.json      # type pdm-session (LLM session, history, workspace)
  locales.json
  prompts.json      # Markdown index
  gen-prompts.json
prompts/{locale}/system.md
contexts/{locale}/{Tag}.md
gen-prompts/{locale}/*.md
i18n/               # MAXIMAL preset only
  manifest.json
  ui/{lang}.json
```

### 12.3 Presets


| Preset      | Contents                                                          |
| ----------- | ----------------------------------------------------------------- |
| **minimal** | MD prompts and parts; UI reuses server i18n at boot               |
| **maximal** | Adds `i18n/ui/` folders for checked languages (full UI clone)     |


### 12.4 Import pipeline

1. `ProfileBundle.loadFromZip()` (JSZip).
2. Markdown resolution by locale.
3. Assembly of a complete `pdm-config` object.
4. Call to `validatePdmConfig()` (four validation and security levels v2).
5. Unknown source dialog; strip `pdm_token_ollama` if third-party.
6. `wipeAllUserData()` then apply.

The files involved are `profile-bundle-loader.js`, `storage-config-import.js`, and `settings-ui.js`.

<a id="75-personnalisation-par-édition-zip"></a>
### 12.5 Customization by ZIP editing

Power-user workflow:

1. Export the profile with the **maximal** preset.
2. Unzip the archive, then edit the Markdown and JSON (an LLM is recommended for consistency).
3. Re-zip the archive, then import it: validation runs on the client.

The server does not see the archive contents.

#### Nav logo (`pdm_workspace_ui.brand`)

Under `parts/config.json` → `pdm_workspace_ui.brand`:

| Field | Default | Role |
| ----- | ------- | ---- |
| `firstWord` / `secondWord` | `Prompt` / `DeMerde` | The two joined words of the logo |
| `firstWordColor` / `secondWordColor` | `""` | Hex `#RGB` / `#RRGGBB`; empty = theme colors (word 1 neutral, word 2 accent) |
| `showExtension` | `true` | If `true`, shows the extension (e.g. `.com`); platform default = shown |

Without hex colors in the profile, the theme sets `--nav-logo-word1` (text) and `--nav-logo-word2` (accent) so the two words remain **always distinct** across the 50 themes. The JSON profile **takes precedence** if it provides hex values.

### 12.6 Limits (security)


| Limit              | Value                     |
| ------------------ | ------------------------- |
| Import ZIP archive | ~5 MB UI / ~20 MB schema  |
| Total JSON payload | ~8 MB estimated           |
| `pdm_audio_blobs`  | max 50 refs, 50 MB base64 |


### 12.7 Profile archives produced outside the UI

Any ZIP archive that conforms to the schema (§7.2, **51** `pdm_*` keys) can be imported via Options. Any research materials used to **build** an archive stay outside the user archive.

Successive deliveries of the same profile listing **keep** earlier versions (distinct files / numbered iterations): a new archive **does not overwrite** previous ones. The filename carries the application version (`…-profile-vX.Y.Z.zip`). After an app version bump, re-import an up-to-date archive if the old one refuses import (schema contract).

---

<a id="13-the-51-pdm-keys"></a>
## 13. The 51 `pdm_*` keys

### At a glance

All exportable preferences live in the `pdm-config` object. This object has **51** mandatory `pdm_*` keys, plus `version`, `type`, and `exportedAt` metadata. In the maximal preset, the root may also carry `i18n` and `langs` together. Keys are grouped below by domain. The machine schema [`pdm-config.schema.json`](../assets/config/pdm-config.schema.json) declares the **same list** as `CS.PDM_KEYS` in `config-schema-core.js`.

### 13.1 Export metadata


| Key          | Type         | Role                      |
| ------------ | ------------ | ------------------------- |
| `version`    | string       | app semver e.g. `1.23.0`  |
| `type`       | const        | always `pdm-config`       |
| `exportedAt` | ISO datetime | export timestamp          |


### 13.2 LLM and Ollama


| Key                          | Role                              | Example / note                        |
| ---------------------------- | --------------------------------- | ------------------------------------- |
| `pdm_provider`               | Provider identifier               | `ollama`                              |
| `pdm_model`                  | Active Workspace model            | `llama3.2`                            |
| `pdm_image_model`            | Ollama vision model (curated list) | `moondream`                          |
| `pdm_image_prompt`           | Image description / mapping instruction | (product default)               |
| `pdm_ollama_url`             | Engine URL                        | `http://127.0.0.1:11434`              |
| `pdm_token_ollama`           | Ollama Bearer if configured       | exported in clear — UI confirmation   |
| `pdm_llm_temperature`        | Temperature                       | `0` = default                         |
| `pdm_llm_max_tokens`         | Output token cap                  | `0` = default                         |
| `pdm_llm_timeout_sec`        | Timeout in seconds                | default 1000                          |
| `pdm_llm_thinking_enabled`   | Show thinking                     | bool                                  |
| `pdm_llm_thinking_max_chars` | Thinking cap                      | `0` = unlimited                       |
| `pdm_output_display_format`  | OUTPUT display format             | `text`, `json`, `html` (default `text`) |


**Outside export** (sessionStorage): `pdm_token_proxy` and `pdm_llm_direct_local` are not included in the archive.

### 13.3 System prompt


| Key                         | Role                               |
| --------------------------- | ---------------------------------- |
| `pdm_system_prompt`         | Global instruction markdown text   |
| `pdm_system_prompt_enabled` | Enabled or not                     |


### 13.4 Context prompts `#Tag`


| Key                                 | Role                                         |
| ----------------------------------- | -------------------------------------------- |
| `pdm_profiles`                      | Array `{ tag, text, active, synopsis, … }`   |
| `pdm_context_position`              | `after_system` or `before_system`            |
| `pdm_context_inject_header`         | Context injection header                     |
| `pdm_context_profile_line_template` | Profile line template in injection           |


### 13.5 Assisted `#Tag` generation


| Key                                        | Role                            |
| ------------------------------------------ | ------------------------------- |
| `pdm_context_gen_system`                   | Generation system prompt        |
| `pdm_context_gen_user_intent`              | User intent template            |
| `pdm_context_gen_user_title`               | User title template             |
| `pdm_context_gen_tag_intent_suffix`        | Tag suffix                      |
| `pdm_context_gen_forced_tag_system_suffix` | Forced tag suffix               |
| `pdm_context_gen_retry_system_suffix`      | Retry system                    |
| `pdm_context_gen_retry_user_suffix`        | Retry user                      |
| `pdm_context_gen_max_tokens`               | Max gen tokens                  |
| `pdm_context_gen_temperature`              | Gen temperature                 |
| `pdm_context_gen_retry_temperature`        | Retry temperature               |
| `pdm_context_gen_max_retries`              | Retry count                     |
| `pdm_context_gen_json_schema`              | Constrained gen JSON schema     |


Generation specifications are defined in [`gen-prompt-specs.js`](../assets/js/gen-prompt-specs.js) (nine entries).

### 13.6 Profile and project


| Key                  | Role                                           |
| -------------------- | ---------------------------------------------- |
| `pdm_active_profile` | Active profile ID e.g. `speech2texte`          |
| `pdm_project`        | Project metadata (synopsis, export branding)   |


### 13.7 Workspace session


| Key                 | Role                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------- |
| `pdm_workspace`     | Draft `{ input, output, thinking, contextPanelOpen, inputSource, audioFileName }`     |
| `pdm_workspace_ui`  | Profile UI: `identity`, `texts`, and `brand` (two-word nav logo + optional hex colors) |
| `pdm_history_count` | Clean counter                                                                         |
| `pdm_clean_history` | Journal max 100 entries — legacy fields + `trace` (before/after compression matrix)   |


### 13.8 Interface


| Key            | Role                                          |
| -------------- | --------------------------------------------- |
| `pdm_language` | UI locale `fr`, `en`, …                       |
| `pdm_theme`    | Theme ID e.g. `marron-day` (default Light brown) |


The fifty theme identifiers are in `CS.THEME_IDS` (`config-schema-core.js`).

### 13.9 STT dictation


| Key                            | Role                        |
| ------------------------------ | --------------------------- |
| `pdm_stt_device_id`            | Microphone                  |
| `pdm_stt_engine`               | Engine                      |
| `pdm_stt_compute`              | `cpu` / `gpu`               |
| `pdm_stt_insert_at_cursor`     | bool                        |
| `pdm_stt_delete_word_enabled`  | bool                        |
| `pdm_stt_delete_word_shortcut` | combination                 |
| `pdm_stt_delete_word_target`   | `end` / `cursor`            |
| `pdm_stt_vosk_lang`            | Vosk model locale (e.g. `fr`, `en-us`) |


### 13.10 Audio


| Key               | Role                                              |
| ----------------- | ------------------------------------------------- |
| `pdm_audio_blobs` | References to WebM recordings (base64 segments)   |


### 13.11 Profile JSON output (protocol v2)

| Key | Role |
|-----|------|
| `pdm_output_json_enabled` | Enables Ollama JSON envelope (`format=schema`) |
| `pdm_output_json_schema` | Root schema (`output_{lang}`) |
| `pdm_output_json_key_pattern` | Dynamic key pattern (default `output_{lang}`) |
| `pdm_output_json_value_schema` | String value schema (without `minLength`/`maxLength`) |

These keys are generated by `json-profile-creator.sh` (phase 10) when `parts/output-schema.json` is present. At runtime, extraction and freeform STT apply (see §3.2.2).


---

### 13.0 Index of the 51 keys (`CS.PDM_KEYS`)


| # | Key |
|---:|---|
| 1 | `pdm_provider` |
| 2 | `pdm_model` |
| 3 | `pdm_image_model` |
| 4 | `pdm_image_prompt` |
| 5 | `pdm_system_prompt` |
| 6 | `pdm_system_prompt_enabled` |
| 7 | `pdm_profiles` |
| 8 | `pdm_language` |
| 9 | `pdm_theme` |
| 10 | `pdm_history_count` |
| 11 | `pdm_clean_history` |
| 12 | `pdm_workspace` |
| 13 | `pdm_stt_device_id` |
| 14 | `pdm_stt_engine` |
| 15 | `pdm_stt_compute` |
| 16 | `pdm_stt_insert_at_cursor` |
| 17 | `pdm_stt_delete_word_enabled` |
| 18 | `pdm_stt_delete_word_shortcut` |
| 19 | `pdm_stt_delete_word_target` |
| 20 | `pdm_stt_vosk_lang` |
| 21 | `pdm_context_position` |
| 22 | `pdm_ollama_url` |
| 23 | `pdm_llm_thinking_enabled` |
| 24 | `pdm_llm_thinking_max_chars` |
| 25 | `pdm_llm_temperature` |
| 26 | `pdm_llm_max_tokens` |
| 27 | `pdm_llm_timeout_sec` |
| 28 | `pdm_token_ollama` |
| 29 | `pdm_context_gen_system` |
| 30 | `pdm_context_gen_user_intent` |
| 31 | `pdm_context_gen_user_title` |
| 32 | `pdm_context_inject_header` |
| 33 | `pdm_context_gen_tag_intent_suffix` |
| 34 | `pdm_context_gen_forced_tag_system_suffix` |
| 35 | `pdm_context_gen_retry_system_suffix` |
| 36 | `pdm_context_gen_retry_user_suffix` |
| 37 | `pdm_active_profile` |
| 38 | `pdm_project` |
| 39 | `pdm_context_profile_line_template` |
| 40 | `pdm_context_gen_max_tokens` |
| 41 | `pdm_context_gen_temperature` |
| 42 | `pdm_context_gen_retry_temperature` |
| 43 | `pdm_context_gen_max_retries` |
| 44 | `pdm_context_gen_json_schema` |
| 45 | `pdm_output_json_enabled` |
| 46 | `pdm_output_json_schema` |
| 47 | `pdm_output_json_key_pattern` |
| 48 | `pdm_output_json_value_schema` |
| 49 | `pdm_output_display_format` |
| 50 | `pdm_audio_blobs` |
| 51 | `pdm_workspace_ui` |

---

<a id="14-pdm-namespaces"></a>
## 14. `PDM.*` namespaces

| Namespace | Modules |
|-----------|---------|
| `PDM.App` | `app.js` |
| `PDM.Env` | `env.js` |
| `PDM.UI` | `ui.js` |
| `PDM.Storage` | `storage-*.js` |
| `PDM.ConfigSchema` | `config-schema-*.js` |
| `PDM.I18n` / `PDM.I18nLocales` | `i18n*.js` |
| `PDM.Themes` | `themes.js` |
| `PDM.LLM` / `PDM.Providers` | `llm.js`, `providers.js`, `ollama.js` |
| `PDM.ProxyTokenSession` | `proxy-token-session.js` |
| `PDM.Profiles` / `PDM.ProfileSelector` / `PDM.ProfileBundle*` | `profiles.js`, `profile-*.js` |
| `PDM.ContextGeneration` / `PDM.GenPromptSpecs` / `PDM.PromptCompress` | `context-generation.js`, `gen-prompt-specs.js`, `prompt-compress.js` |
| `PDM.Workspace*` / `PDM.InputChunk` | `workspace-*.js` |
| `PDM.STT` | `stt-*.js` |
| `PDM.Homepage` / `PDM.SeoMeta` / `PDM.Docs` | `homepage.js`, `seo-meta.js`, `docs-links.js` |
| `PDM.FooterProjects` | `footer-projects.js` |
| `PDM.AnimationInversion` / `PDM.AnimationSynopsis` | `animation-*.js` |

---

<a id="15-javascript-inventory"></a>
## 15. JavaScript inventory

The total is **131** versioned `assets/js/*.js` files (excluding vendor). Roles below reuse each module’s source synopsis (not the filename alone).

<details>
<summary><strong>JavaScript inventory (131 files)</strong> — click to expand</summary>

### 15.1 Shell / bootstrap

| File | Role |
|---|---|
| [`app.js`](../assets/js/app.js) | SPA entry point: hash routing, initialization, and global navigation. |
| [`bootstrap.js`](../assets/js/bootstrap.js) | Dynamic loader for scripts listed by lib/env/env.php. |
| [`env.js`](../assets/js/env.js) | Server configuration client (GET lib/env/env.php). |
| [`env-official-nav.js`](../assets/js/env-official-nav.js) | Market / legal / support links to the official site when the local artefact is missing (green badge). |

### 15.2 config-schema

| File | Role |
|---|---|
| [`config-schema-build.js`](../assets/js/config-schema-build.js) | Import normalization and default pdm-config construction. |
| [`config-schema-core.js`](../assets/js/config-schema-core.js) | pdm-config schema constants, keys, and defaults. |
| [`config-schema-helpers.js`](../assets/js/config-schema-helpers.js) | Type helpers, validation, and atomic normalization (project, audio, workspace UI). |
| [`config-schema-sanitize.js`](../assets/js/config-schema-sanitize.js) | HTML sanitization for pdm_workspace_ui fields (JSON security v2). |
| [`config-schema-security.js`](../assets/js/config-schema-security.js) | Size limits, prototype-pollution guards, and JSON import checks v2. |
| [`config-schema-validate-collections.js`](../assets/js/config-schema-validate-collections.js) | Validation of pdm-config collections (profiles, workspace, history). |
| [`config-schema-validate-fields.js`](../assets/js/config-schema-validate-fields.js) | Validation of pdm-config scalar fields and workspace UI. |
| [`config-schema-validate-gen-prompts.js`](../assets/js/config-schema-validate-gen-prompts.js) | Validates parts/gen-prompts.json (LLM context-prompt generation index). |
| [`config-schema-validate-locales.js`](../assets/js/config-schema-validate-locales.js) | Validates parts/locales.json (single source of prompt locales). |
| [`config-schema-validate-prompts.js`](../assets/js/config-schema-validate-prompts.js) | Validates parts/prompts.json (Markdown prompt index per locale). |
| [`config-schema-validate.js`](../assets/js/config-schema-validate.js) | Strict full pdm-config validator — orchestrator. |

### 15.3 workspace

| File | Role |
|---|---|
| [`workspace-audio-bind.js`](../assets/js/workspace-audio-bind.js) | Binds audio/video import button and file picker on Workspace Input. |
| [`workspace-audio-mode.js`](../assets/js/workspace-audio-mode.js) | Mutually exclusive Input mode for audio/video import. |
| [`workspace-bind.js`](../assets/js/workspace-bind.js) | Binds Workspace controls (Clean, Reset, model, panels). |
| [`workspace-dictation-audio-export.js`](../assets/js/workspace-dictation-audio-export.js) | Exports dictation WebM blobs from history / profile. |
| [`workspace-dictation-audio.js`](../assets/js/workspace-dictation-audio.js) | Dictation audio integration with Workspace Input. |
| [`workspace-image-bind.js`](../assets/js/workspace-image-bind.js) | Image import → vision description (file picker, Ollama). |
| [`workspace-image-encode.js`](../assets/js/workspace-image-encode.js) | Client-side image resize/encode before vision request. |
| [`workspace-inference.js`](../assets/js/workspace-inference.js) | Clean orchestration: assemble prompts, multi-pass, stream. |
| [`workspace-input-chunk.js`](../assets/js/workspace-input-chunk.js) | Long Input multi-pass chunking for inference. |
| [`workspace-input-tools.js`](../assets/js/workspace-input-tools.js) | Mutual exclusion of Input tools (dictation / audio / image). |
| [`workspace-llm-config.js`](../assets/js/workspace-llm-config.js) | Reads Workspace LLM options from Storage / DOM. |
| [`workspace-llm-options.js`](../assets/js/workspace-llm-options.js) | Workspace LLM Options panel (temperature, tokens, thinking…). |
| [`workspace-output-format.js`](../assets/js/workspace-output-format.js) | Output display format chips (text / json / html). |
| [`workspace-persistence.js`](../assets/js/workspace-persistence.js) | Persists Workspace draft (input/output/thinking) to Storage. |
| [`workspace-refresh.js`](../assets/js/workspace-refresh.js) | Refreshes Workspace UI after profile / settings changes. |
| [`workspace-stream.js`](../assets/js/workspace-stream.js) | Ollama stream consumer + thinking panel. |
| [`workspace-thinking.js`](../assets/js/workspace-thinking.js) | Thinking (réflexion) panel UI during Clean. |
| [`workspace-tts-download.js`](../assets/js/workspace-tts-download.js) | TTS export placeholder (download hook). |
| [`workspace-ui-profile.js`](../assets/js/workspace-ui-profile.js) | Applies pdm_workspace_ui brand/texts to Workspace chrome. |

### 15.4 storage

| File | Role |
|---|---|
| [`storage-audio-blobs.js`](../assets/js/storage-audio-blobs.js) | Local storage of imported audio files (IndexedDB). |
| [`storage-config-audio.js`](../assets/js/storage-config-audio.js) | Async export/import of dictation audio blobs into pdm-config. |
| [`storage-config-import.js`](../assets/js/storage-config-import.js) | pdm-config import (validation, wipe, apply) and profile bundle. |
| [`storage-config-io.js`](../assets/js/storage-config-io.js) | pdm-config JSON export/import (core) and personal profiles. |
| [`storage-core.js`](../assets/js/storage-core.js) | localStorage primitives and pdm_ key constants. |
| [`storage-history.js`](../assets/js/storage-history.js) | Clean history, session migration, and data purge. |
| [`storage-llm-settings.js`](../assets/js/storage-llm-settings.js) | Ollama settings: thinking, temperature, tokens, timeout. |
| [`storage-profile-meta.js`](../assets/js/storage-profile-meta.js) | Active profile, project, synopsis, workspace UI, language, theme. |
| [`storage-prompt-fields.js`](../assets/js/storage-prompt-fields.js) | Context-gen prompt fields and JSON output fields. |
| [`storage-prompts-bundle.js`](../assets/js/storage-prompts-bundle.js) | Local storage of system prompts + context prompts per locale and profile. |
| [`storage-settings.js`](../assets/js/storage-settings.js) | Storage settings entry point (wipe/prompts/meta/llm modules). |
| [`storage-wipe.js`](../assets/js/storage-wipe.js) | Wipes user data, provider tokens, and PDM browser caches. |
| [`storage-workspace-audio.js`](../assets/js/storage-workspace-audio.js) | Workspace draft extension for audio import (metadata + audioRef). |
| [`storage-workspace-stt.js`](../assets/js/storage-workspace-stt.js) | Persists workspace draft and voice-dictation settings. |

### 15.5 stt

| File | Role |
|---|---|
| [`stt-audio-processor.js`](../assets/js/stt-audio-processor.js) | AudioWorklet microphone capture for STT dictation. |
| [`stt-core.js`](../assets/js/stt-core.js) | STT core: engine state, engine order, language helpers, and load progress. |
| [`stt-dictation-recorder.js`](../assets/js/stt-dictation-recorder.js) | Parallel WebM recording during STT dictation. |
| [`stt-disruptive.js`](../assets/js/stt-disruptive.js) | Dictation guard before disruptive actions (reload, forced stop). |
| [`stt-init.js`](../assets/js/stt-init.js) | STT init/refresh: engine support detection and UI states (unsupported, idle…). |
| [`stt-options-panel.js`](../assets/js/stt-options-panel.js) | Expandable dictation Options panel (Input strip). |
| [`stt-parakeet-config.js`](../assets/js/stt-parakeet-config.js) | Parakeet constants (sample rate, WASM paths, model configs, special-token regexes). |
| [`stt-parakeet-decode.js`](../assets/js/stt-parakeet-decode.js) | Parakeet decode: audio pipeline, timed-word joining, text sanitization. |
| [`stt-parakeet-engine.js`](../assets/js/stt-parakeet-engine.js) | Parakeet engine: start/stop stream, anti-stale generations, model+decode orchestration. |
| [`stt-parakeet-model.js`](../assets/js/stt-parakeet-model.js) | Parakeet model load/pool (ONNX), download progress, and unload. |
| [`stt-parakeet.js`](../assets/js/stt-parakeet.js) | Bootstrap entry point — re-exports the engine module. |
| [`stt-permissions.js`](../assets/js/stt-permissions.js) | STT mic permissions: LAN HTTP block, Chromium hints, authorization toasts. |
| [`stt-preload.js`](../assets/js/stt-preload.js) | Preloads the selected STT engine (Options → Load engine) without starting dictation. |
| [`stt-shared-audio.js`](../assets/js/stt-shared-audio.js) | Microphone capture via AudioWorklet/ScriptProcessor. |
| [`stt-shared-beep.js`](../assets/js/stt-shared-beep.js) | Dictation Web Audio beeps. |
| [`stt-shared-core.js`](../assets/js/stt-shared-core.js) | Shared STT helpers: states, i18n keys, engine labels. |
| [`stt-shared-gpu.js`](../assets/js/stt-shared-gpu.js) | WebGPU / compute-device detection for STT engines. |
| [`stt-shared-permissions.js`](../assets/js/stt-shared-permissions.js) | Shared mic-permission helpers and LAN HTTP detection. |
| [`stt-shared-progress.js`](../assets/js/stt-shared-progress.js) | STT load/download progress UI helpers. |
| [`stt-shared-support.js`](../assets/js/stt-shared-support.js) | Browser STT capability checks (WASM, WebGPU, AudioWorklet). |
| [`stt-shared-text.js`](../assets/js/stt-shared-text.js) | STT text insertion helpers (cursor, last-word delete). |
| [`stt-ui.js`](../assets/js/stt-ui.js) | STT UI: badges, engine labels, Storage model/device binding. |
| [`stt-vosk-catalog.js`](../assets/js/stt-vosk-catalog.js) | Vosk language/model catalogue and paths. |
| [`stt-vosk-engine.js`](../assets/js/stt-vosk-engine.js) | Vosk recognition engine (start/stop, partial/final results). |
| [`stt-vosk-model.js`](../assets/js/stt-vosk-model.js) | Vosk model download, cache, and load. |
| [`stt-whisper-config.js`](../assets/js/stt-whisper-config.js) | Whisper ONNX engine constants and model paths. |
| [`stt-whisper-decode.js`](../assets/js/stt-whisper-decode.js) | Whisper live decode pipeline. |
| [`stt-whisper-engine.js`](../assets/js/stt-whisper-engine.js) | Whisper live recognition engine orchestration. |
| [`stt-whisper-file-chunk.js`](../assets/js/stt-whisper-file-chunk.js) | Whisper file-mode audio chunking. |
| [`stt-whisper-file-decode.js`](../assets/js/stt-whisper-file-decode.js) | Whisper file-mode decode of audio/video imports. |
| [`stt-whisper-file-run.js`](../assets/js/stt-whisper-file-run.js) | Whisper file-mode run orchestration. |
| [`stt-whisper-file.js`](../assets/js/stt-whisper-file.js) | Whisper file import entry (audio/video → Input text). |
| [`stt-whisper-model.js`](../assets/js/stt-whisper-model.js) | Whisper ONNX model load and cache. |
| [`stt-whisper-worker-bridge.js`](../assets/js/stt-whisper-worker-bridge.js) | Bridge between main thread and Whisper worker. |
| [`stt-whisper-worker.js`](../assets/js/stt-whisper-worker.js) | Whisper Web Worker (off-main-thread inference). |
| [`stt-whisper.js`](../assets/js/stt-whisper.js) | Whisper bootstrap entry — re-exports the engine module. |

### 15.6 profile

| File | Role |
|---|---|
| [`profile-bundle-assemble.js`](../assets/js/profile-bundle-assemble.js) | Assembles files → pdm-config. |
| [`profile-bundle-export-build.js`](../assets/js/profile-bundle-export-build.js) | Builds export filemap sync/async. |
| [`profile-bundle-export-keys.js`](../assets/js/profile-bundle-export-keys.js) | Session/config keys and Markdown indexes for ZIP export. |
| [`profile-bundle-export-parts.js`](../assets/js/profile-bundle-export-parts.js) | Cached bundled parts for multi-locale export. |
| [`profile-bundle-export.js`](../assets/js/profile-bundle-export.js) | Profile ZIP export packaging (blob, package checksum). |
| [`profile-bundle-integrity.js`](../assets/js/profile-bundle-integrity.js) | SHA-256 integrity of profile ZIP archives (bytes). |
| [`profile-bundle-io.js`](../assets/js/profile-bundle-io.js) | Loads ProfileBundle from URL or ZIP. |
| [`profile-bundle-loader.js`](../assets/js/profile-bundle-loader.js) | ProfileBundle entry point (paths / assemble / io). |
| [`profile-bundle-paths.js`](../assets/js/profile-bundle-paths.js) | ProfileBundle paths, locales, and fetch helpers. |
| [`profile-output-json.js`](../assets/js/profile-output-json.js) | Parses and renders profile JSON outputs (protocol v2 — dynamic key output_{lang}). |
| [`profile-selector-actions.js`](../assets/js/profile-selector-actions.js) | JSON Profile actions — resolve, import, save, and create. |
| [`profile-selector-export-modal-flags.js`](../assets/js/profile-selector-export-modal-flags.js) | Locales, flags, and export size estimate. |
| [`profile-selector-export-modal-state.js`](../assets/js/profile-selector-export-modal-state.js) | Export modal summary and presets. |
| [`profile-selector-export-modal.js`](../assets/js/profile-selector-export-modal.js) | Opens / binds events for the ZIP export modal. |
| [`profile-selector-export.js`](../assets/js/profile-selector-export.js) | JSON Profile ZIP export orchestration. |
| [`profile-selector-labels.js`](../assets/js/profile-selector-labels.js) | JSON Profile labels, slugs, and downloads. |
| [`profile-selector.js`](../assets/js/profile-selector.js) | Options JSON Profile selector (assets/profiles/ bundle) — core. |
| [`profiles.js`](../assets/js/profiles.js) | CRUD for context prompts (#PascalCase). |


### 15.7 Prompts UI, generation, and compression

| File | Role |
|---|---|
| [`context-generation.js`](../assets/js/context-generation.js) | LLM prompts that build context prompts (#Tag). |
| [`gen-prompt-specs.js`](../assets/js/gen-prompt-specs.js) | Canonical list of the 9 context-prompt generation specs (id, session keys, MD files). |
| [`prompt-compress.js`](../assets/js/prompt-compress.js) | Token compression (system, contexts, Input, Output) on Clean click. |
| [`prompts-ui-generate.js`](../assets/js/prompts-ui-generate.js) | Creates/generates context prompts (Prompts tab). |
| [`prompts-ui-list.js`](../assets/js/prompts-ui-list.js) | Context-prompt list (Prompts tab) — render, reorder, drag-and-drop. |
| [`prompts-ui.js`](../assets/js/prompts-ui.js) | Prompts tab UI — core (system prompt, context prompts, bindings). |

### 15.8 history

| File | Role |
|---|---|
| [`history-trace.js`](../assets/js/history-trace.js) | Inference trace (before/after compression) for pdm_clean_history. |
| [`history-ui-list.js`](../assets/js/history-ui-list.js) | Renders the Workspace history card list. |
| [`history-ui-modal.js`](../assets/js/history-ui-modal.js) | Full-screen modal for one LLM history entry. |
| [`history-ui.js`](../assets/js/history-ui.js) | Clean-history UI (Workspace and Prompts) — core. |

### 15.9 i18n

| File | Role |
|---|---|
| [`i18n-apply-dom.js`](../assets/js/i18n-apply-dom.js) | Applies translations to the DOM (data-i18n, static IDs, STT panel). |
| [`i18n-locales.js`](../assets/js/i18n-locales.js) | UI language metadata (flags, RTL, prompt locale). |
| [`i18n.js`](../assets/js/i18n.js) | i18n module fed by assets/i18n/ui/ (project) or an imported user bundle. |

### 15.10 themes

| File | Role |
|---|---|
| [`themes.js`](../assets/js/themes.js) | Theme catalogue (50 ids) and applies pdm_theme to the DOM. |

### 15.11 footer

| File | Role |
|---|---|
| [`footer-projects.js`](../assets/js/footer-projects.js) | Auto carousel of DreamProjectAI projects in the footer. |
| [`footer-radar-portrait.js`](../assets/js/footer-radar-portrait.js) | Random footer portrait reveals (radar sync, paused off-viewport). |

### 15.12 polish

| File | Role |
|---|---|
| [`polish-textarea-resize.js`](../assets/js/polish-textarea-resize.js) | Custom resize handle for textareas. |
| [`polish.js`](../assets/js/polish.js) | UI micro-interactions (scroll reveal, light animations). |

### 15.13 other

| File | Role |
|---|---|
| [`animation-inversion.js`](../assets/js/animation-inversion.js) | Header “Inverted universe” loop — chnek ↔ sniper, random A–E effects. |
| [`animation-synopsis.js`](../assets/js/animation-synopsis.js) | Simulated keyboard typing of the profile synopsis in the terminal header. |
| [`docs-links.js`](../assets/js/docs-links.js) | GitHub technical documentation URL by UI language (footer + legacy redirects). |
| [`homepage.js`](../assets/js/homepage.js) | Conditional loader for the marketing landing fragment. |
| [`llm.js`](../assets/js/llm.js) | Generic PDM.LLM façade independent of the provider. |
| [`ollama.js`](../assets/js/ollama.js) | Ollama provider adapter (HTTP, streaming, UI). |
| [`providers.js`](../assets/js/providers.js) | LLM adapter registry (Ollama, future providers). |
| [`proxy-token-session.js`](../assets/js/proxy-token-session.js) | Proxy token in sessionStorage (LLM Options only, no boot modal). |
| [`seo-meta.js`](../assets/js/seo-meta.js) | SEO meta stack (OG, Twitter, keywords, canonical) synced with i18n + hash routes. |
| [`settings-ui.js`](../assets/js/settings-ui.js) | Options tab UI (LLM, STT, theme, save). |
| [`synopsis-resolve.js`](../assets/js/synopsis-resolve.js) | Resolves profile synopsis text for header animation. |
| [`ui.js`](../assets/js/ui.js) | Shared UI helpers: toasts (PDM.UI.notif), loader, Escape, burger. |

</details>


---

<a id="16-css-inventory"></a>
## 16. CSS inventory

<details>
<summary><strong>CSS inventory (38 stylesheets)</strong> — click to expand</summary>

| File | Role |
|---|---|
| [`polish-a11y.css`](../assets/css/polish-a11y.css) | Motion accessibility: honours prefers-reduced-motion. |
| [`polish-animation-inversion.css`](../assets/css/polish-animation-inversion.css) | Header “Inverted universe” animation (chnek ↔ sniper, effects A–E). |
| [`polish-animation-synopsis.css`](../assets/css/polish-animation-synopsis.css) | Header animation: simulated typing of the profile synopsis. |
| [`polish-buttons.css`](../assets/css/polish-buttons.css) | Button polish: lift and glow on hover. |
| [`polish-cards.css`](../assets/css/polish-cards.css) | Card hover effects. |
| [`polish-copy.css`](../assets/css/polish-copy.css) | Clipboard copy visual feedback. |
| [`polish-cursor.css`](../assets/css/polish-cursor.css) | Typing / caret cursor polish. |
| [`polish-footer-donation.css`](../assets/css/polish-footer-donation.css) | Footer: DreamProjectAI projects carousel styles. |
| [`polish-footer-meta.css`](../assets/css/polish-footer-meta.css) | Footer: product commitment badges. |
| [`polish-footer.css`](../assets/css/polish-footer.css) | Footer: open navigation and open-source callout. |
| [`polish-hero.css`](../assets/css/polish-hero.css) | Landing hero / demo box polish. |
| [`polish-history-audio.css`](../assets/css/polish-history-audio.css) | History: audio trace and player. |
| [`polish-legal.css`](../assets/css/polish-legal.css) | Legal pages (notices, ToS, privacy, support). |
| [`polish-loader.css`](../assets/css/polish-loader.css) | Loader overlay (pulsing spinner). |
| [`polish-notifications.css`](../assets/css/polish-notifications.css) | Toasts / notifications (slide-in). |
| [`polish-performance.css`](../assets/css/polish-performance.css) | Disables expensive transitions on static elements. |
| [`polish-pricing-badge.css`](../assets/css/polish-pricing-badge.css) | Pricing badge polish. |
| [`polish-print.css`](../assets/css/polish-print.css) | Print styles. |
| [`polish-responsive.css`](../assets/css/polish-responsive.css) | Responsive tweaks for polish layers. |
| [`polish-reveal.css`](../assets/css/polish-reveal.css) | Scroll-reveal animations. |
| [`polish-scrollbar.css`](../assets/css/polish-scrollbar.css) | Custom scrollbar. |
| [`polish-skeleton.css`](../assets/css/polish-skeleton.css) | Skeleton loaders (keyframes). |
| [`polish-tags.css`](../assets/css/polish-tags.css) | Guaranteed contrast for `#Tag` chips across themes. |
| [`polish-textarea-resize.css`](../assets/css/polish-textarea-resize.css) | Custom textarea resize handle (with JS). |
| [`polish-theme-swatch.css`](../assets/css/polish-theme-swatch.css) | Theme selector swatches. |
| [`polish-transitions.css`](../assets/css/polish-transitions.css) | Section transitions (fade) without breaking display block/none. |
| [`seo-static.css`](../assets/css/seo-static.css) | Static SEO pages under `/seo/` and `sitemap.html`. |
| [`style-base.css`](../assets/css/style-base.css) | Global tokens (colors, type, layout) and SPA reset. |
| [`style-components.css`](../assets/css/style-components.css) | Shared components (base notifications, controls). |
| [`style-config.css`](../assets/css/style-config.css) | Legacy configuration panels. |
| [`style-landing.css`](../assets/css/style-landing.css) | Marketing landing (`#landing`). |
| [`style-layout.css`](../assets/css/style-layout.css) | Shell layout: generic sections, grid, navigation. |
| [`style-pricing.css`](../assets/css/style-pricing.css) | Pricing page / block. |
| [`style-prompts.css`](../assets/css/style-prompts.css) | Prompts screen (system, `#Tag`, generators). |
| [`style-responsive.css`](../assets/css/style-responsive.css) | Shell responsive breakpoints and adaptations. |
| [`style-settings.css`](../assets/css/style-settings.css) | Options screen (`#settings`). |
| [`style-themes.css`](../assets/css/style-themes.css) | Theme toggles and theme-related variables. |
| [`style-workspace.css`](../assets/css/style-workspace.css) | Workspace: Input/Output grid, panels, tools. |

`style-*` stylesheets structure the screens. `polish-*` stylesheets carry micro-interactions and motion accessibility.
</details>

---

<a id="17-php-proxy-and-api"></a>
## 17. PHP, proxy, and API

### At a glance

PHP volume stays small: there is **no** LLM business logic on the server. PHP handles the CORS relay, the profile list, and script environment configuration. Assembly of `pdm-config` remains entirely in the **browser**.

### 17.1 Files


| Path                         | Role                               |
| ---------------------------- | ---------------------------------- |
| `lib/proxy/ollama/olama.php` | Ollama POST relay                  |
| `lib/api/manifest.php`       | Profile list + runtimeOk           |
| `lib/api/lib.php`            | Catalogue profile bundle validation |
| `lib/env/env.php`            | Config + JS script whitelist       |


### 17.2 What PHP does not do

- PHP does not parse user ZIP imports.
- PHP does not store clean history.
- PHP does not run speech recognition (STT).

---


### 17.3 PHP runtime files

| Path | Role |
|--------|------|
| [`lib/api/lib.php`](../lib/api/lib.php) | Profile library / helpers |
| [`lib/api/manifest.php`](../lib/api/manifest.php) | Profile list API |
| [`lib/env/env.php`](../lib/env/env.php) | Deployment config + scripts |
| [`lib/proxy/proxy.php`](../lib/proxy/proxy.php) | Proxy shim |
| [`lib/proxy/ollama/olama.php`](../lib/proxy/ollama/olama.php) | Ollama CORS relay |

---

<a id="10-installation-auto-hébergée"></a>
<a id="18-self-hosted-install-and-deployment"></a>
## 18. Self-hosted install and deployment

### At a glance

Self-hosting rests on a GitHub clone, a PHP server, and Ollama. Restoring STT models is **mandatory** after clone. Ollama runs on the browser machine or on the local network. The footer badge shows SELF-HOSTED, PRE-PROD, or PROD according to `PDM_ENV`.

### 18.1 Prerequisites


| Component  | Version                                 |
| ---------- | --------------------------------------- |
| PHP        | 7.4+                                    |
| Server     | Apache or Nginx + PHP-FPM               |
| Ollama     | [ollama.ai](https://ollama.ai/download) |
| Browser    | Chrome/Edge recommended for GPU STT     |


### 18.2 Steps

```bash
git clone https://github.com/JeanSebastienBash/promptdemerde.git
cd promptdemerde/install
bash restore-large-assets.sh
ollama pull llama3.2
```

The repository root is deployed on the vhost, then the application is opened via `http://localhost/.../`.

### 18.3 Profile on first launch

On first launch, the official **Speech2Texte** profile (`speech2texte`) is loaded from the versioned bundle `assets/profiles/speech2texte/`. Other profiles are added via ZIP import (personal export or a profile obtained outside the clone).

<a id="deploy-pdm-env-badges"></a>

### 18.4 Deployment — `PDM_ENV`, badges, token

**At a glance.** Neither `PDM_ENV` nor the proxy token is **required** to run a clone. They **name** the environment (footer badge) and **harden** the PHP relay in official production. Visitors to promptdemerde.com use **flow A** (direct Ollama, no token).

#### `PDM_ENV` (Apache, optional)

The value is read by `pdm_resolve_deployment()` in [`lib/api/lib.php`](../lib/api/lib.php):


| Value                  | `#footer-env-badge` badge | Typical use                            |
| ---------------------- | ------------------------- | -------------------------------------- |
| `prod`                 | **PROD**                  | promptdemerde.com VPS                  |
| `preprod` / `pre-prod` | **PRE-PROD**               | Maintainer pre-production              |
| *(absent)*             | **SELF-HOSTED**            | GitHub clone, localhost, personal domain |


**Why declare it?** It affects proxy CORS, rate-limit, error messages, and pre-prod anti-listing — see [`SECURITY.md`](../SECURITY.md). It is **not required** for development or self-hosting.

Apache example (`/etc/apache2/envvars` + `PassEnv`):

```bash
export PDM_ENV=prod
export PDM_PROXY_TOKEN="random-secret"
```

```apache
# /etc/apache2/conf-available/pdm-env.conf
PassEnv PDM_ENV
PassEnv PDM_PROXY_TOKEN
```

Without `PDM_ENV` on a test vhost, **SELF-HOSTED** behaviour is the expected behaviour.

#### Proxy token (`PDM_PROXY_TOKEN`)


| Flow                  | Token?                  | Who                             |
| --------------------- | ----------------------- | ------------------------------- |
| **A** — direct Ollama | No                      | Prod visitors, self-hosters     |
| **B** — `olama.php`   | Yes (operator session)  | Prod maintainer, allowlisted IP |


- In the UI, the **“I don’t have a token”** checkbox enables flow A (`shouldUseDirectOllama()`).
- Proxy token storage uses `sessionStorage` (`pdm_token_proxy`) and stays **out of ZIP export**.
- For a production visitor, Ollama must declare `OLLAMA_ORIGINS=https://promptdemerde.com`; the Apache token is not required in this flow.

---

<a id="19-import-security-and-limits"></a>
## 19. Import security and limits

### At a glance

> [!WARNING]
> ZIP import is a local XSS surface (workspace HTML under allowlist), a client DoS risk via a large JSON payload, and a risk of Ollama token theft if the archive is third-party.

Mitigations include sanitization, size limits, token stripping, and a confirmation dialog. Detail is in [`SECURITY.md`](../SECURITY.md).

### 19.1 Key measures

- The `promptGuardHtml` allowlist is defined in `config-schema-sanitize.js`.
- Patterns `<script`, `javascript:`, and prototype-pollution keys are rejected.
- UI import accepts only `.zip`: a lone JSON file is refused (`importJsonDeprecated`).

---

<a id="20-profile-stt-and-vendor-assets"></a>
## 20. Profile, STT, and vendor assets

### 20.1 Profiles

| Item | Path |
|---------|--------|
| Catalogue | [`assets/profiles/index.json`](../assets/profiles/index.json) |
| Bundled profile | [`assets/profiles/speech2texte/`](../assets/profiles/speech2texte/) |
| Docs | [`Profiles.md`](Profiles.md) |

### 20.2 STT

STT models live under `assets/stt/vosk/`, `vosk-mini/`, `vosk-maxi/`, `whisper-mini/`, `whisper-maxi/`, and `parakeet/`. Zone documentation is [`Stt.md`](Stt.md) · catalogue [`Stt-vosk.md`](Stt-vosk.md). Heavy binaries are restored with `install/restore-large-assets.sh`.

### 20.3 Vendor and notices

Embedded dependencies are described in [`Vendor.md`](Vendor.md) and [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md).

### 20.4 Fonts

Local fonts (Fira Code, Inconsolata, Space Grotesk, Archivo Black, Anton, OFL licenses) live under `assets/fonts/`.

---

<a id="21-glossary-and-cross-references"></a>
## 21. Glossary and cross-references

| Term | Meaning |
|-------|------|
| System prompt | Global instruction (`pdm_system_prompt`) |
| Context prompt (`#Tag`) | Entry in `pdm_profiles[]` |
| Context prompt generator | Spec + UI that builds `#Tag` entries |
| Flow A | Browser → Ollama localhost |
| Flow B | Browser → `olama.php` → Ollama |
| `pdm-config` | Object of the 51 keys + export metadata |

### Related documents

| Document | Role |
|----------|------|
| [`README.md`](../README.md) | Product pitch |
| [`SECURITY.md`](../SECURITY.md) | Proxy, CSP, import |
| [`CONTRIBUTING.md`](../CONTRIBUTING.md) | Contributing |
| [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md) | Vendor licenses |
| [`Stt.md`](Stt.md) | STT zone |
| [`Stt-vosk.md`](Stt-vosk.md) | Vosk catalogue |
| [`Profiles.md`](Profiles.md) | Profiles zone |
| [`Vendor.md`](Vendor.md) | Vendor zone |

---

<a id="22-quick-troubleshooting"></a>
## 22. Quick troubleshooting

| Problem | Hint |
|---------|------|
| Cleanup stuck / empty output | System prompt or active `#Tag` too restrictive; retry with fewer contexts |
| Ollama not responding | `ollama list`; URL under Options → LLM; **Test** button |
| `Failed to fetch` / CORS (prod) | Set `OLLAMA_ORIGINS=https://promptdemerde.com` then restart Ollama — [§11.1](#11-ollama-flow-a-and-flow-b) |
| Token missing | Flow B only: uncheck “I don't have a token”, enter the token under Options → LLM |
| Poor dictation | Vosk Maxi (Linux) or Whisper / Parakeet if WebGPU is OK — [§8.5](#85-stt-troubleshooting) |
| Microphone blocked | HTTPS or `http://localhost` — [§8.3](#83-secure-context-and-microphone-permission) |
| Data lost after wipe / profile change | Export the profile ZIP first; history lives in `pdm_clean_history` (exportable) |

---

<a id="license"></a>
## License

MIT — see [`LICENSE`](../LICENSE).

---

*Technical documentation — application version 1.23.0.*
