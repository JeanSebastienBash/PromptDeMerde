# Technical documentation

<p align="center">
  <img src="../assets/images/flags/en.svg" alt="English" width="28" height="20">
</p>

<p align="center">
  <a href="../LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <a href="../README.md"><img src="https://img.shields.io/badge/version-1.23.2-blue.svg" alt="Version 1.23.2"></a>
</p>

> **Application version** : 1.23.2 (`CS.VERSION`)  
> **Audience** : developers, code auditors, self-hosting operators, power users  
> **Language** : English  
> **Related** : [`README.md`](../README.md) · [`CONTRIBUTING.md`](../CONTRIBUTING.md) · [`SECURITY.md`](../SECURITY.md)

This document is the **long-form technical counterpart** of [`README.md`](../README.md): **same section numbering and titles** as the README product table of contents. Each leaf expands screens, contracts, keys, and modules. It is not a marketing guide.

**Documentation navigation** · [STT models](Stt.md) · [Vosk catalogue](Stt-vosk.md) · [Profiles](Profiles.md) · [Vendor JS](Vendor.md) · [README](../README.md) · [Security](../SECURITY.md)

---

## Table of contents

- ✨ [1. What PromptDeMerde is](#menu-what-is)
- 👤 [2. Who it is for](#menu-who)
- 🌐 [3. Official site = self-hosted copy · privacy](#menu-official-site)
- 🔒 [4. Zero telemetry](#menu-zero-telemetry)
- 🧩 [5. Features](#menu-features)
  - ✦ [5.1. Reformulate & Workspace](#feat-5-1)
    - 🪄 [5.1.1. Reformulate with Ollama](#feat-5-1-1)
    - ↔️ [5.1.2. Workspace Input → Output](#feat-5-1-2)
    - 🎛 [5.1.3. Workspace LLM options](#feat-5-1-3)
    - 📄 [5.1.4. Output display formats](#feat-5-1-4)
    - 🔢 [5.1.5. Input counter, Reset and trash](#feat-5-1-5)
    - 💾 [5.1.6. Workspace session autosave](#feat-5-1-6)
    - ⛔ [5.1.7. One Input mode at a time](#feat-5-1-7)
    - ⏱ [5.1.8. Thinking, Stop and stream metadata](#feat-5-1-8)
  - ✧ [5.2. System prompt, `#Tag` contexts & generators](#feat-5-2)
    - #️⃣ [5.2.1. System prompt and context prompts (#Tag)](#feat-5-2-1)
    - 🧠 [5.2.2. Context prompt generators](#feat-5-2-2)
    - 🗂 [5.2.3. Workspace context-prompt panel](#feat-5-2-3)
    - ↕ [5.2.4. Prompts screen: order, drag-and-drop and counter](#feat-5-2-4)
  - ✶ [5.3. Voice, media & vision into Input](#feat-5-3)
    - 🎤 [5.3.1. Unlimited voice dictation with Vosk, Parakeet or Whisper](#feat-5-3-1)
    - 🎬 [5.3.2. Import audio or video (audio transcription)](#feat-5-3-2)
    - ⬇ [5.3.3. Export audio from the voice-dictation session](#feat-5-3-3)
    - 🖼 [5.3.4. Describe an image (Ollama vision)](#feat-5-3-4)
    - ⚙ [5.3.5. Advanced voice-dictation options](#feat-5-3-5)
    - ↻ [5.3.6. Voice dictation outside Workspace and resume after interrupt](#feat-5-3-6)
  - ✷ [5.4. History, compression & long Input](#feat-5-4)
    - 📜 [5.4.1. Local history with traces](#feat-5-4-1)
    - 🗜 [5.4.2. Optional token compression](#feat-5-4-2)
    - ∞ [5.4.3. Long Input, multi-pass](#feat-5-4-3)
    - ⏸ [5.4.4. Compression panel, overlay and Stop](#feat-5-4-4)
    - 📤 [5.4.5. History: restore, modal and JSON export](#feat-5-4-5)
  - ✸ [5.5. JSON profile ZIP & Marketplace](#feat-5-5)
    - 📦 [5.5.1. Import / export JSON profile (ZIP)](#feat-5-5-1)
    - 🎨 [5.5.2. UI personalization](#feat-5-5-2)
    - 🏪 [5.5.3. Marketplace of JSON profiles](#feat-5-5-3)
    - 🔀 [5.5.4. Profiles: create, switch, export modal](#feat-5-5-4)
    - 🔎 [5.5.5. Marketplace: search, filters and detail card](#feat-5-5-5)
  - ✹ [5.6. Languages, themes & same code everywhere](#feat-5-6)
    - 🗣 [5.6.1. Twelve UI languages & 25 themes](#feat-5-6-1)
    - ≡ [5.6.2. Same code everywhere](#feat-5-6-2)
    - 🌓 [5.6.3. Day / night theme toggle](#feat-5-6-3)
    - ♿ [5.6.4. Reduced motion and RTL](#feat-5-6-4)
  - ✺ [5.7. Shell, navigation, Options & footer](#feat-5-7)
    - 🧭 [5.7.1. In-app navigation (SPA)](#feat-5-7-1)
    - ☰ [5.7.2. Burger menu, Escape and loader](#feat-5-7-2)
    - 🏷 [5.7.3. Environment badge and GitHub version](#feat-5-7-3)
    - ⌨ [5.7.4. Keyboard shortcuts and on-screen feedback](#feat-5-7-4)
    - 💫 [5.7.5. Logo, labels, synopsis and shell animation](#feat-5-7-5)
    - 🔌 [5.7.6. LLM Options: Ollama connection test and proxy token](#feat-5-7-6)
    - ⚠ [5.7.7. Danger zone Wipe all](#feat-5-7-7)
    - 📎 [5.7.8. Footer: project carousel and resources](#feat-5-7-8)
- 🧳 [6. JSON profile](#menu-json-profile)
- 📋 [7. Prerequisites](#menu-prerequisites)
  - 🌍 [7.1. Official site](#prereq-7-1)
  - 🛠 [7.2. Self-host](#prereq-7-2)
- ▶ [8. Try it in three steps](#menu-try-it)
- 🖥 [9. Self-hosting (optional)](#menu-self-hosting)
- © [10. Credits](#menu-credits)
- 📚 [11. Further reading](#menu-further-reading)
- ⚖ [12. License](#menu-license)

---

<a id="menu-what-is"></a>
<a id="1-présentation"></a>
<a id="1-purpose-and-scope"></a>
<a id="2-contracts-and-versions"></a>
## ✨ 1. What PromptDeMerde is

PromptDeMerde reformulates a **raw prompt** (typed, voice-dictated, transcribed from audio/video, or described from an image) into a **reformulated prompt** using an optional system prompt, optional enabled `#Tag` context prompts, and a model served by **Ollama** on the machine that opens the browser.

Technically it is an HTML/CSS/JavaScript **SPA** (IIFE modules under `window.PDM`), served by a minimal PHP shell. Session data stays in the **browser** (`localStorage` / `sessionStorage` / IndexedDB for audio). Profile export/import is a client-assembled **ZIP**. No user account is required.

| Aspect | Implementation |
|--------|----------------|
| Workspace input | Text (typing, voice dictation, audio/video import, image → vision description) |
| LLM assembly | Optional system prompt + active `#Tag` contexts + user Input |
| Output | Output panel; formats `text` / `json` / `html` (`pdm_output_display_format`) |
| Persistence | `pdm_*` keys, clean history, optional audio blobs |
| Stack | `index.html` + `assets/js/*` + `assets/css/*`; PHP `lib/api`, `lib/env`, `lib/proxy` |

### Code scope (facts)

| Present in the repository | Absent from the shipped application runtime |
|---------------------------|---------------------------------------------|
| Reformulation via Ollama (raw-prompt clean-up / structuring) | Autonomous multi-turn chatbot |
| Browser STT (Vosk, Whisper, Parakeet) | Mandated cloud transcription service |
| Optional PHP proxy toward Ollama | Server database of user raw prompts / session state |
| Bundled `speech2texte` profile | Requirement for a user account |

### Contracts and versions

- **Version:** `CS.VERSION` = `1.23.2` ([`config-schema-core.js`](../assets/js/config-schema-core.js))
- **Default theme:** `CS.DEFAULT_THEME_ID` (`marron-day`)
- **Exportable prefs:** `CS.PDM_KEYS` — **51** `pdm_*` keys (full catalogue under [11. Further reading](#menu-further-reading)); schema [`pdm-config.schema.json`](../assets/config/pdm-config.schema.json)
- **Bump rule:** `CS.VERSION` changes when the `pdm_*` / session contract evolves; the shipped `assets/profiles/speech2texte/` pack is recompiled in the same pass
- **Script order:** fixed in `lib/env/env.php`, fallback `assets/js/env.js`; required static scripts also listed in `index.html`

### README vs this document

| Document | Role |
|----------|------|
| [`README.md`](../README.md) | Product pitch, Features tree, prerequisites |
| **This file** | Same TOC as the README product menu — long-form contracts, screens, modules, troubleshooting |

---

<a id="menu-who"></a>
## 👤 2. Who it is for

Audience is defined by **how** the product is used, not by a separate code path. The same SPA and the same `pdm_*` / ZIP contracts apply to every persona below.

| Audience | What the product exposes for them |
|----------|-----------------------------------|
| **Solo / freelancer** | One JSON profile reused for recurring reformulation work (mail, posts, briefs, image prompts, …). Export/import ZIP under Options (5.5.1 / 5.5.4); no account. |
| **Power user** | Local Ollama, editable system prompt and `#Tag` contexts, in-browser STT, vision describe, token compression, long-Input multipass, history traces, thinking/Stop stream controls (Features 5.1–5.4). |
| **Small team** | Share one profile ZIP so every machine applies the same system prompt, `#Tag` set, LLM prefs, and chrome/brand fields — a file-based configuration, not a multi-user server. |
| **Official site or private install** | Identical application code and the same client-side data model (see 3 and 4). Clone differences are deployment flags (`PDM_ENV`, optional `PDM_PROXY_TOKEN`) and whether Marketplace/legal pages are local. |

There is no separate “team mode” or “solo mode” in the codebase — personas differ only in which Options / Workspace capabilities they use.

---

<a id="menu-official-site"></a>
<a id="2-modèle-de-confidentialité"></a>
<a id="3-browser-data-model-and-privacy"></a>
## 🌐 3. Official site = self-hosted copy · privacy

<a href="https://promptdemerde.com/" target="_blank" rel="noopener noreferrer">promptdemerde.com</a> and a GitHub clone run the **same application** (same SPA, Workspace, profile ZIP format). Self-hosting: clone, reassemble STT assets (`install/restore-large-assets.sh`), serve with Apache/Nginx + PHP. In both cases, Workspace content and profiles stay in the browser.

### What is the same vs what can differ

| Same everywhere | May differ by deployment |
|-----------------|--------------------------|
| Front-end bundles, `pdm_*` contract, ZIP format | `PDM_ENV` badge (5.7.3) |
| Client-side history, STT, vision, Reformulate | Optional `PDM_PROXY_TOKEN` / flow B relay (5.1.1 / 5.7.6) |
| No application content DB on the PHP host | Marketplace / legal pages local vs redirect to official site (5.5.3, 5.6.2) |

### Data flows

```
[Browser]
  ├─ localStorage : 51 pdm_* keys + session
  ├─ sessionStorage : operator proxy token (excluded from ZIP export)
  ├─ IndexedDB : audio blobs (optional)
  ├─ STT : local WASM/ONNX (Vosk, Whisper, Parakeet)
  └─ LLM flow A : direct fetch → http://localhost:11434 (Ollama)

[PHP proxy olama.php] — flow B or same-origin self-hosting
  └─ In-memory POST transit → Ollama — no application disk writes
```

### What the PHP host does not persist

Here **server** means the VPS/vhost that serves `index.html` and assets (and optionally `olama.php`) — **not** Ollama on the browser machine and **not** `localStorage`.

- Profile ZIP import/export is **100% client-side**; the server does not read the archive
- Clean history and Workspace session text are not stored as application records on PHP
- STT / media stay in the browser (no cloud transcription mandated by the app)

Operator flow B: POST body transits in **RAM** via `olama.php` with no application disk write — detail in [`SECURITY.md`](../SECURITY.md). Zero-telemetry product promise: **4**.

---

<a id="menu-zero-telemetry"></a>
## 🔒 4. Zero telemetry

PromptDeMerde ships **no product telemetry** (no analytics SDK, no beacon of Workspace content to the application vendor).

| In the browser | Not an application content store on the PHP host |
|----------------|--------------------------------------------------|
| Session / prefs in `pdm_*` (`localStorage` / `sessionStorage`) | No DB of user prompts, history, or profiles |
| Audio blobs in IndexedDB when used | No mandated upload of dictation or media for transcription |
| Cache Storage entries prefixed for the app | No product telemetry events |

Web-server **access logs** may still record IP and URL (standard HTTP). Those logs do **not** contain Workspace text, uploaded files, or transcription results; official operations do not log application request bodies. Proxy, CSP, and malicious-import detail: [`SECURITY.md`](../SECURITY.md).

Same client-side model on the official site and on a clone — deployment differences only as in **3**.

---

<a id="menu-features"></a>
**Documentation navigation** · [STT models](Stt.md) · [Vosk catalogue](Stt-vosk.md) · [Profiles](Profiles.md) · [Vendor JS](Vendor.md) · [README](../README.md) · [Security](../SECURITY.md)

## 🧩 5. Features

Long-form technical tree matching the README Features menu (**5.1–5.7**). Every leaf below documents screens (DOM ids), `pdm_*` keys, `assets/js` modules, notifications, and failure modes **as implemented**.

| Group | Focus |
|-------|--------|
| 5.1 | Reformulate & Workspace |
| 5.2 | System prompt, `#Tag`, generators |
| 5.3 | Voice, media, vision → Input |
| 5.4 | History, compression, long Input |
| 5.5 | JSON profile ZIP & Marketplace |
| 5.6 | Languages, themes, same code |
| 5.7 | Shell, navigation, Options, footer |

---

<a id="feat-5-1"></a>
<a id="32-workspace"></a>
<a id="5-workspace"></a>
### ✦ 5.1. Reformulate & Workspace

Reformulate & Workspace: Ollama Reformulate, Input→Output workbench, LLM options, output formats, counter/Reset, session autosave, mutual exclusion of Input modes, thinking/Stop/stream metadata.

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

---

<a id="feat-5-1-1"></a>
<a id="4-ollama--flux-a-et-flux-b"></a>
<a id="11-ollama-flow-a-and-flow-b"></a>
<a id="43-paramètres-llm-workspace-panel"></a>
### 🪄 5.1.1. Reformulate with Ollama

In **flow A** (visitor in production), the browser calls Ollama **directly** on `localhost:11434`, with the “I don't have a token” checkbox checked. In **flow B** (operator), requests go through the PHP relay `olama.php`, with token and IP allowlist. In self-hosting, the path is often same-origin via the local proxy.

### 11.1 Flow A — implementation

Direct mode detection is handled by `shouldUseDirectOllama()` in [`assets/js/proxy-token-session.js`](../assets/js/proxy-token-session.js). The fetch branch is in [`assets/js/ollama.js`](../assets/js/ollama.js). Ollama must allow the site origin via `OLLAMA_ORIGINS=https://promptdemerde.com`. The CSP `connect-src` directive (server config) allows localhost and RFC1918 ranges.

#### Step by step — visitor (flow A, official site)

1. Install <a href="https://ollama.com" target="_blank" rel="noopener noreferrer">Ollama</a> on the local machine and pull a model (`ollama pull …`).
2. Allow the site origin: `OLLAMA_ORIGINS=https://promptdemerde.com`, then restart Ollama (Linux: env / systemd unit; macOS / Windows: env before starting the service).
3. Open <a href="https://promptdemerde.com/" target="_blank" rel="noopener noreferrer">promptdemerde.com</a> → **Options → LLM**: URL `http://localhost:11434`, “I don't have a token” checked.
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

---

<a id="feat-5-1-2"></a>
### ↔️ 5.1.2. Workspace Input → Output

| Area            | Behaviour                                                         |
| --------------- | -------------------------------------------------------------------- |
| **Input**       | Free text; voice dictation inserts at the cursor if `pdm_stt_insert_at_cursor`; **long text**: automatic multi-pass inference (see §5.1) |
| **Output**      | Ollama result; model selector; **text / JSON / HTML** format chips (see §5.2) |
| **Reset**       | Button to the right of the **Input** and **Output** headers: same action, clears input and result (**confirmation** required) |
| **Clean**       | Requires a system prompt **or** ≥1 active context prompt                     |
| **History**     | Side panel (100 entries max, `pdm_clean_history`) with a full Input / system / context prompts / Output trace (± compression) |
| **Active tags** | **Context prompts** panel (`#context-panel`), **collapsed by default**; a click on the title shows the `#Tag` entries |
| **Compress tokens** | **Token compression** panel (optional checkboxes, all off by default); on **Clean**, compresses system/context prompts/Input before inference, and Output after if checked — see §5.3 |


Layout uses `.ws-grid`: two columns from 1024 px width ([`assets/css/style-workspace.css`](../assets/css/style-workspace.css)).

<a id="321-input-long-multi-pass-inférence"></a>

---

<a id="feat-5-1-3"></a>
### 🎛 5.1.3. Workspace LLM options

### Workspace LLM panel keys

| Key | Role |
|-----|------|
| `pdm_llm_temperature` | Clean temperature (0 = default) |
| `pdm_llm_max_tokens` | Output cap |
| `pdm_llm_timeout_sec` | Inference timeout (default 1000 s) |
| `pdm_llm_thinking_enabled` | Show model thinking |
| `pdm_llm_thinking_max_chars` | Thinking character cap |
| `pdm_output_display_format` | OUTPUT display: `text` \| `json` \| `html` (default `text`) |

### Options → LLM connection (overlap with 5.7.6)

URL field, **Test** (`A.doTest` / `PDM.LLM.test`), optional Ollama token, “I don’t have a token” (flow A), operator proxy token in **sessionStorage**. Blur or Test refreshes `#ws-output-model-select` from the instance; ghost saved models outside the returned list are cleared on failure. Alias `#43-paramètres-llm-workspace-panel` / `#7-1-llm-connection`.

---

<a id="7-export--import--archive-zip-profil"></a>
<a id="12-export-import-profile-zip-archive"></a>

Under **Options → LLM**:

- **Ollama URL** — points at the instance used for Reformulate (typically `http://localhost:11434` on the machine that opens the browser). Accepts loopback (`127.0.0.1`) or a **LAN IP** when Ollama runs on another host on the local network.
- **Optional Ollama token** and **“I don’t have a token”** checkbox — flow A on the official site; see [§11 Ollama — flow A and flow B](#11-ollama-flow-a-and-flow-b).
- **Operator proxy token** — stored in **sessionStorage** when the web server sets a relay secret (`PDM_PROXY_TOKEN`); never included in a portable ZIP export.

**Connection test.** The **Test** button checks reachability to the configured URL and refreshes the Workspace model list (`#ws-output-model-select`) from Ollama. **Blur** on the URL field can trigger the same refresh. Only models actually returned by the instance appear (no ghost “saved model” outside the list). On success, status text reports how many models were found; on failure, the list and stored model are invalidated. When inference goes through a locked relay, a wrong proxy token fails the check.

<a id="7-2-voice-dictation-options-panel"></a>

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

---

<a id="feat-5-1-4"></a>
<a id="322-format-daffichage-output"></a>
### 📄 5.1.4. Output display formats

### Contract

- **Key:** `pdm_output_display_format` — values `text` | `json` | `html` (default `text`)
- **Alias:** `#322-format-daffichage-output`
- **UI:** Workspace Output format chips / controls switch how the reformulated result is shown after streaming completes
- **Related:** listed with other LLM panel keys under 5.1.3; thinking stream still lands in `#thinking-text` regardless of Output format

### Behaviour notes (code)

Format applies to the Output pane rendering helpers after inference. Changing format does not re-run Ollama by itself — it changes how the stored/streamed Output string is presented. If the UI shows a “Coming soon” marker on a chip, that chip is chrome-only until wired; the three stored values above remain the schema contract.

---

<a id="feat-5-1-5"></a>
### 🔢 5.1.5. Input counter, Reset and trash

### Character counter

- **File:** `polish.js` `initCharCounter`
- **DOM:** `#ws-input` (fallback `#landing-prompt`), `#char-count`, injected `.char-counter-wrap` / `.char-counter-bar` / `.char-counter-fill`
- **Format:** `len / maxlength` (default max **50000**); visual warn &gt;70%, danger &gt;90%

### Reset

- **Control:** `.ws-reset-btn` in `workspace-bind.js`
- **Blocked when:** inference running (`inferenceRunningReset`) or STT active (`dictationRunningReset`)
- **Confirm:** `confirm(resetConfirm)` then clears `#ws-input`, `#char-count`, `A.clearWorkspaceOutput()`, dispatches `pdm:workspace-reset`

### Trash / New input

- **Control:** `#ws-input-clear` gated by `workspace-input-tools.js` `WIT.sync`
- **Blocked when:** dictation active or Input empty (titles `clearImpossibleDictation` / `clearImpossibleNothing`); audio mode uses `audioClear*` titles
- **Click:** `workspace-bind.js` (`dictationRunningClear` guard)

---

<a id="feat-5-1-6"></a>
### 💾 5.1.6. Workspace session autosave

Workspace session state (Input, Output, thinking panel, layout) persists in browser storage under `pdm_*` session keys so a reload restores the workbench.

| Key                 | Role                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------- |
| `pdm_workspace`     | Session state `{ input, output, thinking, contextPanelOpen, inputSource, audioFileName }` (Input = raw prompt)     |
| `pdm_workspace_ui`  | Profile UI: `identity`, `texts`, and `brand` (two-word nav logo + optional hex colors) |
| `pdm_history_count` | Clean counter                                                                         |
| `pdm_clean_history` | Journal max 100 entries — legacy fields + `trace` (before/after compression matrix)   |

---

<a id="feat-5-1-7"></a>
### ⛔ 5.1.7. One Input mode at a time

### Reformulate gate (`workspace-inference.js` `doSniperise`)

- Early return if `PDM._compressActive`
- If STT is active → `STT.warnAndStop({ notifyMessage: dictationStoppedForClean, notifyType: 'info' })` before Clean/Reformulate proceeds

### Button mutex (`workspace-input-tools.js`)

Flags: `inferActive`, `dictationActive`, `audioMode`, `audioProcessing`, `imageProcessing`. While a mode owns Input, conflicting controls are disabled:

`#ws-audio-file-btn`, `#ws-image-file-btn`, `#ws-tts-download-btn`, `#ws-dictation-audio-btn`, clear/new as applicable.

### Mode owners

| Mode | Modules |
|------|---------|
| Audio / video import | `workspace-audio-mode.js`, `workspace-audio-bind.js` |
| Image import | `workspace-image-bind.js` (refuses when audio mode) |
| Dictation | STT + Workspace dictation binders |
| Reformulate | `workspace-inference.js` |

---

<a id="5-prompts--système-prompts-de-contexte-générateurs"></a>
<a id="6-prompts-system-context-prompts-context-prompt-generators"></a>

---

<a id="feat-5-1-8"></a>
### ⏱ 5.1.8. Thinking, Stop and stream metadata

### Streaming orchestration

- **Files:** `workspace-inference.js`, `workspace-stream.js`; cancel wiring in `workspace-bind.js`
- **Keys:** `pdm_llm_thinking_enabled`, `pdm_llm_thinking_max_chars` (`Storage.getLlmThinkingMaxChars`)
- **DOM:** `#thinking-panel`, `#thinking-text`, `#thinking-badge`, `#thinking-unavailable-msg`; stream meta `#output-meta` via `A.renderStreamMeta`; Output box may get `.streaming`; Stop `#cancel-btn`
- **Model support:** `workspace-llm-config.js` turns thinking off when `thinkingSupported === false`

### Stop

- If compression active → `PromptCompress.cancel`
- Else `PDM._activeAbort.abort()`, set `_inferenceUserCancel`, notif `inferenceCancelNotif` (`err`)
- Partial streamed Output is kept

### Metadata / limits (i18n `workspace.*`)

`streamTime`, `streamTokens`, `streamThinking*`, `streamSpeed*`, multipass `pass: i/n`, thinking-limit notifs (`inferenceThinkingLimitDone`), meta-drift warnings (`inferenceMetaDriftWarn` / `inferenceMetaRetry`).

---

<a id="feat-5-2"></a>
<a id="5-prompts--système-prompts-de-contexte-générateurs"></a>
<a id="6-prompts-system-context-prompts-context-prompt-generators"></a>
### ✧ 5.2. System prompt, `#Tag` contexts & generators

### Scope

| Leaf | Topic |
|------|--------|
| 5.2.1 | System prompt + `#Tag` contexts + LLM message assembly |
| 5.2.2 | Assisted `#Tag` / context-prompt generators |
| 5.2.3 | Workspace context-prompt panel (All/None/Manage) |
| 5.2.4 | Prompts screen order, drag-and-drop, counters |

### Storage groups

System prompt keys, context prompt lists, and generation settings are under the `pdm_*` catalogue (11. Further reading) and the leaf-level tables in 5.2.1–5.2.2. Aliases: `#6-prompts-system-…`, `#5-prompts--système-…`.

---

<a id="feat-5-2-1"></a>
### #️⃣ 5.2.1. System prompt and context prompts (#Tag)

The **system prompt** is optional session text. When **enabled** and non-empty, it is sent as the model `system` message (with active `#Tag` contexts stacked before or after it). When **disabled**, it is omitted. When **enabled but empty**, nothing is substituted — there is **no** built-in Nettoyeur / reformulator fallback. Personality (reformulation, chatbot, code, HTML, …) comes from the profile ZIP or from text stored in `pdm_system_prompt`. Empty system is valid in session and in ZIP round-trip (`prompts/{locale}/system.md` may be blank). The Workspace Input is sent as the **user** message without a hard-coded `clean_only` task envelope.

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

| Key                         | Role                               |
| --------------------------- | ---------------------------------- |
| `pdm_system_prompt`         | Global instruction markdown text (may be empty) |
| `pdm_system_prompt_enabled` | Enabled or not                     |

| Key                                 | Role                                         |
| ----------------------------------- | -------------------------------------------- |
| `pdm_profiles`                      | Array `{ tag, text, active, synopsis, … }`   |
| `pdm_context_position`              | `after_system` or `before_system`            |
| `pdm_context_inject_header`         | Context injection header                     |
| `pdm_context_profile_line_template` | Profile line template in injection           |

---

<a id="feat-5-2-2"></a>
<a id="52-génération-assistée-de-tag"></a>
### 🧠 5.2.2. Context prompt generators

The module involved is [`assets/js/context-generation.js`](../assets/js/context-generation.js).

Two entries on the Prompts screen:

- **By title**: a tag is entered, then the associated **context prompt** is generated.
- **By intent**: the need is described in free text (the **tag / title is chosen by the AI**, and is not typed in the title field). The **model** is the same as the Workspace model. The **Options** panel exposes max tokens, temperature, retry temperature, and max retries (`pdm_context_gen_*`, synced with the advanced “Prompts LLM…” panel). Generation runs as a **stream** with a **Stop** button. This generation does not use thinking mode (JSON output).

Associated keys are `pdm_context_gen_*` (see [11. Further reading — `pdm_*` catalogue](#menu-further-reading)).

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

---

<a id="feat-5-2-3"></a>
### 🗂 5.2.3. Workspace context-prompt panel

### Panel DOM

- `#context-panel` — `<details>` element
- Open state persisted: `pdm_workspace.contextPanelOpen` (`workspace-persistence.js`)
- Tags: `PDM.UI.renderTags` → `.tag` / `.tag.on` showing `#Tag` labels (`ui.js`)
- `#context-select-all-btn`, `#context-clear-all-btn`
- Manage: `.context-toolbar-link` with i18n `workspace.contextManage` → Prompts screen

### Binders

`workspace-bind.js` wires toggles; profile context enablement goes through storage helpers (`toggleProfile` / related in `storage-history.js` and prompt stores).

### Inference

Only tags with `.on` / enabled state are included in the message assembly for Reformulate (5.2.1). Reorder on the Prompts screen (5.2.4) affects injection order.

---

<a id="feat-5-2-4"></a>
### ↕ 5.2.4. Prompts screen: order, drag-and-drop and counter

On the Prompts screen, context prompts can be reordered (drag-and-drop), enabled/disabled, and counted. Order affects injection order.

### 6.3 Application profiles

- **Official**: the `speech2texte` profile handles post–voice-dictation correction. It is **bundled** under `assets/profiles/speech2texte/` and listed in the `index.json` catalogue.
- **Personal**: `(perso)` profiles are created locally and exportable as ZIP.
- A profile change triggers a local wipe then loads the bundle, after a single confirmation.

Contexts shipped with `speech2texte` (bundle active state):

| `#Tag` | Active | Role |
|--------|--------|------|
| `#SansPonctuationDAbord` | yes | Misplaced STT punctuation |
| `#DerniereFormulation` | yes | Last version after rephrasing |
| `#MotsParasites` | yes | Phonetic intruders |
| `#HesitationsOral` | yes | Uh, um, well… |
| `#FrancaisNaturel` | yes | Fluency after reformulation |
| `#Conservateur` | no | Strict mode |

---

<a id="7-options-profiles-export-and-danger-zone"></a>

---

<a id="feat-5-3"></a>
<a id="6-dictée-vocale-et-audio"></a>
<a id="8-voice-dictation-and-audio-stt"></a>
### ✶ 5.3. Voice, media & vision into Input

Zone docs: [`Stt.md`](Stt.md) (model layout) · [`Stt-vosk.md`](Stt-vosk.md) (catalogue) · [`Vendor.md`](Vendor.md) (WASM / ONNX).

Five STT engines run **in the browser**; audio is **never** sent to the server. The **Vosk** family is the everyday baseline (no dedicated GPU): **Vosk Mini** covers the shipped multilingual catalogue; **Vosk Maxi** centres on French. **Whisper** and **Parakeet** work best with a proper GPU / WebGPU — treat them as optional rather than the default. Importing an audio or video file (🎵) runs a local **transcription** with **Whisper Maxi**. For **video**, the browser first **decodes the audio track**, then the same Whisper Maxi **transcription** runs. After **transcription**, the model currently **stays loaded** until the STT engine is switched or local data is wiped; **automatic unload right after file transcription** is on the product roadmap. While the file is being analyzed, voice dictation is paused. **As soon as text appears in Input**, editing, a new voice dictation, or clearing (trash / New input) are possible, without going through Reset. After a GitHub clone, `cd install && bash restore-large-assets.sh` restores the models. Zone layout: [`Stt.md`](Stt.md).

The Workspace shows **Start voice dictation**, **Stop voice dictation**, then **Options**. There are no engine or microphone badges at the top: a discreet red message appears next to the button according to the phase (**Starting voice dictation…**, **Microphone authorization…**, **Loading voice engine…**, **Voice dictation in progress**).

**Start voice dictation** (single click):
1. requests microphone permission from the browser if needed;
2. automatically loads the selected voice engine (equivalent to **Load engine**);
3. starts **voice dictation**.

In Options, **Load engine** remains available to preload without speaking. The Microphone row combines a selector and **Refresh microphones**.

**Continuity during navigation**: a **voice dictation** started on the Workspace **does not stop** when switching screens (Market, Options, legal pages, etc.). Text continues to be inserted into the Input area. To stop: return to the Workspace then **Stop voice dictation** (or close / reload the page).

**Audio cues** (`stt-shared-beep.js`): a **start beep** when recognition begins; a **stop beep** when voice dictation ends normally; a **triple warning beep** (stop pattern × 3, ~1.5 s) on confirmed disruptive stop / reload.

**Actions that reload the page** (language change, profile import, local wipe, profile change, etc.): if **voice dictation** is in progress, a **modal** asks for confirmation. While the modal is open, **voice dictation continues** (speaking remains possible). On confirmation: the **triple warning beep** plays (reload **waits** for the beeps to finish), voice dictation stops, a visual notification appears, then the action proceeds. On cancel: voice dictation remains active. **Right after reload**, a dialog offers to **resume voice dictation** (one click) or to close.

---

<a id="feat-5-3-1"></a>
<a id="83-secure-context-and-microphone-permission"></a>
<a id="85-stt-troubleshooting"></a>
### 🎤 5.3.1. Unlimited voice dictation with Vosk, Parakeet or Whisper

| ID `pdm_stt_engine`             | Files                              | Notes                    |
| ------------------------------- | ---------------------------------- | ------------------------ |
| `vosk-mini`                     | `vosk-mini/model.tar.gz` (FR); `vosk-mini/{langId}/` | CPU; **multilingual path** (catalogue) |
| `vosk-maxi`                     | `vosk-maxi/model.tar.gz` (FR)      | CPU, reliable on Linux; product FR |
| `whisper-mini` / `whisper-maxi` | `assets/stt/whisper-*/onnx/*.onnx` | WebGPU recommended       |
| `parakeet`                      | `assets/stt/parakeet/*.onnx`       | Best quality, GPU        |

Vosk multilingual = **Mini** (shipped languages). **Maxi** = French. Detail: [`Stt-vosk.md`](Stt-vosk.md).

The canonical engine list is `CS.STT_ENGINES` in `config-schema-core.js`.

### 8.2 STT keys (Speech To Text)


| Key                            | Role                              |
| ------------------------------ | --------------------------------- |
| `pdm_stt_device_id`            | Preferred microphone ID           |
| `pdm_stt_engine`               | Active engine                     |
| `pdm_stt_compute`              | `cpu` or `gpu`                    |
| `pdm_stt_insert_at_cursor`     | Insert voice dictation at cursor        |
| `pdm_stt_delete_word_enabled`  | Shortcut to delete last word      |
| `pdm_stt_delete_word_shortcut` | e.g. `ctrl+backspace`             |
| `pdm_stt_delete_word_target`   | `end` or `cursor`                 |

### 8.3 Secure context and microphone permission

The microphone and WebGPU require **HTTPS** or `http://localhost`. On a LAN IP over HTTP, the microphone is blocked by browser policy.

| Situation | Behavior |
| --------- | -------- |
| Microphone not yet authorized | **Start voice dictation** opens the browser permission prompt, then continues |
| Microphone accepted | Voice dictation starts (and loads the engine if needed) |
| Microphone **permanently denied** (site settings) | The browser **no longer shows** the prompt. Reset the site permission (padlock / site info → Microphone → Allow), then retry **Start voice dictation** or **Refresh microphones** |

<a id="64-enregistrement-webm"></a>

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

---

<a id="feat-5-3-2"></a>
### 🎬 5.3.2. Import audio or video (audio transcription)

Import audio or video (🎵) runs an in-browser **Whisper Maxi** transcription. For video, the browser decodes the audio track first, then transcribes. Audio is never uploaded to the PHP server.

### 8.5 STT troubleshooting

| Symptom | Hint |
|---------|------|
| Microphone blocked on LAN IP over HTTP | Serve over `https://` or open the app via `http://localhost` |
| Whisper / Parakeet slow or on CPU | Check WebGPU (`about:support` → WebGPU, or `navigator.gpu` in the console). A physical GPU does not guarantee WebGPU |
| Acceleration badge orange | Requested acceleration ≠ engine in memory → reload the engine (📥) |
| Low quality | Prefer **Vosk Mini** (multilingual) or **Vosk Maxi** (FR) on Linux/CPU; Whisper / Parakeet when WebGPU is reliable |

Strip messages (phases): **Starting…**, **Microphone permission…**, **Loading engine…**, **Voice dictation in progress** — i18n keys `stt.help.*` / `stt.status.*`.

---

<a id="6bis-import-image--description"></a>
<a id="9-import-image--description-vision"></a>
<a id="9-image-import-description-vision"></a>

---

<a id="feat-5-3-3"></a>
<a id="64-enregistrement-webm"></a>
### ⬇ 5.3.3. Export audio from the voice-dictation session

### Purpose

Export audio that was **recorded during voice dictation** in the browser — not file-import transcription (5.3.2) and not profile ZIP (5.5.1).

### Modules

- `stt-dictation-recorder.js` — capture pipeline for dictation takes
- `workspace-dictation-audio.js` — Workspace session binding
- `workspace-dictation-audio-export.js` — export / merge download path

### Storage

Takes live in browser storage (IndexedDB `pdm-audio` and related `pdm_*` audio keys). Nothing is uploaded to PHP for this export path.

### UI

Workspace exposes download / export controls for the dictation session (including `#ws-tts-download-btn` mutex with other Input modes — 5.1.7). Merge may produce a single downloadable blob (e.g. WebM/WAV depending on the export helper).

### Alias

`#64-enregistrement-webm`

---

<a id="feat-5-3-4"></a>
<a id="6bis-import-image--description"></a>
<a id="9-import-image--description-vision"></a>
<a id="9-image-import-description-vision"></a>
### 🖼 5.3.4. Describe an image (Ollama vision)

Vision is a first-class Workspace Input path: still images become editable description text next to voice dictation and audio/video import. The **Import an image** button opens a file picker (**no** drag-and-drop). Accepted formats are PNG, JPEG, WebP, and GIF. The image is resized in the browser then sent to Ollama (model `pdm_image_model`, instruction `pdm_image_prompt`) via the existing proxy, in **memory transit**, with no server-side storage of the image. The resulting description lands in Input as a **raw prompt** ready for Reformulate.

- The image model and instruction are edited on the **Prompts** screen, Image prompts block.
- Vision models **do not appear** in the text LLM selectors (Workspace and context prompt generation): they appear only in the Image prompts block selector.
- The default instruction aims for a full mapping to **reproduce** the image.
- Image import is mutually exclusive with active voice dictation or audio-file mode on the Input strip.
- **On failure**, the toast states the cause and the action (for example missing model → `ollama pull <model>` then Prompts → Image prompts; Ollama unreachable → Options → LLM). No generic “failed” message is shown without a follow-up.
- The application **does not install** models: the `ollama pull <model>` command must still be run outside the UI (example: `moondream`).

---

<a id="10-marketplace-clone-vs-official-site"></a>

---

<a id="feat-5-3-5"></a>
### ⚙ 5.3.5. Advanced voice-dictation options

### Keys (`storage-core.js`)

`pdm_stt_engine`, `pdm_stt_compute`, `pdm_stt_device_id`, `pdm_stt_insert_at_cursor`, `pdm_stt_delete_word_enabled`, `pdm_stt_delete_word_shortcut`, `pdm_stt_delete_word_target`, `pdm_stt_vosk_lang`

### Options / Workspace DOM (`stt-init.js`)

`#ws-stt-engine-select`, `#stt-compute-select`, `#stt-device-select`, `#stt-preload-btn`, `#stt-insert-at-cursor`, `#stt-delete-word-enabled`, `#stt-delete-word-shortcut`, `#stt-delete-word-target`

### Delete-word shortcut values

`ctrl+backspace` | `ctrl+delete` | `alt+backspace` | `ctrl+shift+backspace` (i18n `stt.shortcut*`)

### Notes

Changing engine may unload the previous model. Secure context (HTTPS or localhost) and microphone permission are required before Start (5.3.1). Options entry also summarized under former Options voice panel (alias `7-2-voice-dictation-options-panel`).

---

<a id="feat-5-3-6"></a>
### ↻ 5.3.6. Voice dictation outside Workspace and resume after interrupt

### `STT.warnAndStop` (`stt-disruptive.js`)

Stops the microphone session and may show a notif (`disruptiveStoppedNotif` or a caller-supplied message such as `dictationStoppedForClean` from Reformulate).

### Resume offer

- **Key:** `sessionStorage` `pdm_stt_resume_offer`
- **Modal:** `#stt-resume-offer-modal` (`.show` while open)
- **i18n:** `resumeOfferTitle`, `resumeOfferBody`, `resumeOfferResume`, `resumeOfferDismiss`
- **Lifecycle:** `hashchange` listeners; Workspace detection in `stt-shared-support.js` (hash === `workspace`)
- **Escape:** cancels pending disruptive action or closes the resume modal (5.7.2)

### Disruptive reloads

UI language change, profile switch, and Danger zone wipe confirm when dictation is active, then reload. Wipe boots with `pdm_fresh` (5.7.7).

### Truth limit

Leaving Workspace via SPA hash does **not** always tear down an active mic session — resume/offer logic exists precisely because the session can outlive the Workspace view.

---

<a id="feat-5-4"></a>
### ✷ 5.4. History, compression & long Input

### Scope

| Leaf | Topic |
|------|--------|
| 5.4.1 | Local history traces (`history-trace.js`, `storage-history.js`) |
| 5.4.2 | Optional token compression checkboxes / kinds |
| 5.4.3 | Long Input multi-pass inference |
| 5.4.4 | Compression overlay, Output lock, Stop (`prompt-compress.js`, `PDM._compressActive`) |
| 5.4.5 | Restore, history modal, JSON copy/export (`history-ui*.js`) |

### Shared lock

While `_compressActive` is true, Reformulate is refused and Output is locked (5.4.4 / 5.1.7). History entries can store both original and compressed sides of system / contexts / input / output in `entry.trace`.

---

<a id="feat-5-4-1"></a>
### 📜 5.4.1. Local history with traces

### Trace lifecycle (`history-trace.js`)

- `A.beginCleanTrace()` — capture originals for system / contexts / input
- `A.sealCleanTraceAfterPreCompress()` — after pre-inference compression
- `A.sealCleanTraceOutput(plainBefore, plainAfter, thinking)` — seal output side
- `A.takeCleanTrace()` / `A.ensureHistoryTrace(entry)` / `A.historyHadCompress(entry)`

### Trace shape

`trace.{system,input,output}.{original,compressed}` plus `trace.contexts[]` as `{ id, tag, original, compressed }`, including which compress targets were checked (`#ws-compress-include-*`).

### Persist

`storage-history.js` `normalizeCleanEntry` keeps `entry.trace` and legacy flat fields: `input`, `output`, `thinking`, `systemPrompt`, `activeContexts`, `usage`, `duration_ms`, audio refs. Cap and list UI: see 5.4.5.

---

<a id="feat-5-4-2"></a>
<a id="323-compresser-les-tokens"></a>
### 🗜 5.4.2. Optional token compression

The **Token compression** dropdown sits just above “Context prompts”:

- **Active checkboxes** (multi-select): system prompt, active context prompts, Input area, and Output area. All are **unchecked by default**.
- **On Clean**, checked targets among system prompt, context prompts, and Input are compressed **before** inference, which frees the context window.
- **After Clean**, if Output is checked, the displayed text is shortened (display only).
- There is **no** Compress button and no confirmation dialog: selecting the checkboxes is enough.
- **Thinking**: it is **not** configured in this panel; it is produced *during* Clean. To ease GPU load, the thinking ceiling is set in Options (or thinking is disabled).
- The internal rate aims to keep about **55%** of the text (`rate: 0.55`). That rate is not exposed in the UI. Checkbox on/off state is persisted in `pdm_workspace` (`compressIncludeSystem`, `compressIncludeContexts`, `compressIncludeInput`, `compressIncludeOutput`) and exported in a full profile ZIP (clean archive resets them to off). README §5.4.2 documents the same facts with a short GIF (`readme-s542-token-compression.gif`) of the Input-side panel and Output result.
- **During compression**, an **Output** overlay shows an indeterminate preload, the step label, and **Stop**; the menu keeps only the checkboxes and Output is locked.
- **After compression**, a visual mark (bar and green chip) appears on the relevant chips and persists in session until the content changes.
- On the UI side, compression calls Ollama in local extractive mode (`think: false`) via `prompt-compress.js`, with placeholder shielding and anti-LaTeX; if sentinels are lost, the original text is kept.
- **Creator / archives**: the same target rate applies outside the UI (private maintainer tooling). Any engine gap is **intentional**.
- **History**: each Clean writes a `pdm_clean_history` entry with a `trace` field (Input, system prompt, active context prompts, Output — **original** and **compressed** versions if the box was checked). Without compression, only original blocks are kept. The UI offers a responsive accordion (Input · system · `#Tag` contexts · Output · thinking), per-block copy, side tools (fullscreen modal · JSON · restore · delete), and **Purge** on the panel.
- **Output area**: compression shortens the displayed result and does **not** free the context window for the next Clean (unlike the system prompt and context prompts).
- **Integrity**: compression must neither introduce LaTeX (`$\rightarrow$`), nor leak or eat `{{…}}` placeholders, nor alter `output_*` keys.

---

---

<a id="feat-5-4-3"></a>
<a id="321-input-long-multi-pass-inférence"></a>
### ∞ 5.4.3. Long Input, multi-pass

> [!NOTE]
> Applies to text **already in the Input area** (pasted or from voice dictation). This is **not** a change to the STT engine (Whisper, Vosk, Parakeet).

There is **no hard limit** on the inference side: a very long text is split into several passes. For **ZIP export**, `pdm_workspace.input` is capped at **50,000** characters. There is **no session preference** to disable automatic multi-pass when Input is long — the thresholds below always apply when **Reformulate** runs.

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
2. Single-pass user message = Input as-is; multi-pass adds a neutral `Partie i/n` label (no hard-coded clean task).
3. Final OUTPUT is the **concatenation** of all passes (`\n\n` between chunks) — oriented toward reformulation of long text.
4. During the stream, the indicator shows `pass: i/n`.
5. Narrow meta-drift warn (sniper / “ambitious request” signatures) — **no** automatic strict retry.


The modules involved are `workspace-input-chunk.js` and `workspace-inference.js`.

<a id="322-format-daffichage-output"></a>

---

<a id="feat-5-4-4"></a>
### ⏸ 5.4.4. Compression panel, overlay and Stop

### Compression busy UI

- **File:** `assets/js/prompt-compress.js` (`PDM.PromptCompress`)
- **Flag:** `window.PDM._compressActive` set in `setCompressUiBusy(busy)`; abort channel `PDM._compressAbort`; user cancel `PDM._compressUserCancel`
- **DOM:**
  - Panel `#ws-prompt-compress` (+ `.is-compressing` while busy)
  - Kind chips `.ws-compress-chip[data-compress-kind]`
  - Include checks `#ws-compress-include-{system,contexts,input,output}`
  - Status `#ws-compress-status`
  - Output lock overlay `#ws-output-compress-lock` on `.ws-panel.ws-output` (`.ws-compress-locked`, `aria-busy`)
  - Stop `#ws-compress-cancel-btn-lock` → `PC.cancel` / `cancelCompress()`
  - `#cancel-btn` also shown while busy; `#sniperise-btn` disabled with title `workspace.compressLockOutput`
- **Session marks:** `sessionStorage` key `pdm_ws_compress_marks`; chips can show `is-compressed` / `data-compressed`
- **Inference gate:** `PC.maybeRunBeforeInference` / `maybeRunAfterInference`; while busy, Reformulate is refused (`compressBusyInference` / early return in `workspace-inference.js` when `_compressActive`)
- **Notifs (i18n `workspace.*`):** `compressCancelled`, `compressDoneNotif`, `compressError`, `compressNoActiveContexts`, …

---

<a id="feat-5-4-5"></a>
### 📤 5.4.5. History: restore, modal and JSON export

### Modules

`history-ui.js`, `history-ui-list.js`, `history-ui-modal.js`, `storage-history.js`, `history-trace.js`

### Storage

- Key `pdm_clean_history` (`S.KEYS.CLEAN_HISTORY`), cap `S.MAX_CLEAN_HISTORY = 100`
- Counter companion `pdm_history_count`

### List actions (`#ws-history-list`)

| Control | Behaviour |
|--------|-----------|
| Eye | `A.openHistoryModal` |
| JSON | `PDM.UI.copy(A._historyJsonPayload(entry))` |
| Restore | `A.doRestoreHistoryToWorkspace` |
| Delete | `A.doDeleteHistoryEntry` |

### Modal

- DOM `#history-view-modal` (created if missing), body class `history-modal-open`
- Escape closes via `A.closeHistoryModal`

### JSON payload shape

Pretty-printed object: `{ input, thinking, output, systemPrompt, activeContexts, trace }`

### Restore

Writes `#ws-input`, Output (`#output-text` / format helpers), `#thinking-text` via `syncThinkingPanel`; refreshes `#char-count`. Audio-sourced entries set workspace `inputSource: 'audio-file'`. History is browser-local only (no PHP persistence).

---

<a id="feat-5-5"></a>
### ✸ 5.5. JSON profile ZIP & Marketplace

Zone detail: [`Profiles.md`](Profiles.md) · vendor ZIP I/O: [`Vendor.md`](Vendor.md).

### Scope

| Leaf | Topic |
|------|--------|
| 5.5.1 | ZIP import/export contract, presets, security limits |
| 5.5.2 | UI personalization by editing pack / brand fields |
| 5.5.3 | Marketplace existence + clone → official redirect |
| 5.5.4 | Options profile create / switch / export modal |
| 5.5.5 | Catalogue search, filters, detail card (flag on) |

### Hard rules from code

- Import accepts **`.zip` only** (never lone `.json`)
- Proxy / Ollama tokens stripped from portable archives
- Marketplace factory paths are **out of public docs** (boundary)

---

<a id="feat-5-5-1"></a>
<a id="7-export--import--archive-zip-profil"></a>
<a id="12-export-import-profile-zip-archive"></a>
<a id="19-import-security-and-limits"></a>
### 📦 5.5.1. Import / export JSON profile (ZIP)

See also [`Profiles.md`](Profiles.md) (tree layout) · [5.5.4 Options entry](Documentation.md#feat-5-5-4).

The **Export** action downloads a **ZIP archive**; a standalone JSON file is not produced. The **Import** action accepts **only** the `.zip` extension — a lone `.json` / raw JSON file is **never** accepted. The archive contains JSON under `parts/`, Markdown files (system prompt and context prompts), and a manifest. The assembled logical object is `pdm-config` (51 keys). Available presets are **minimal** and **maximal**. Proxy tokens and flow A/B preferences stay in sessionStorage and are **excluded from export**.

### 12.1 Filename

```
{slug}-promptdemerde-profile-v{CS.VERSION}.zip
```

Example filename: `speech2texte-promptdemerde-profile-v1.23.2.zip`

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

Export fills each `pdm_*` key through Storage getters (`Storage._exportValueForKey`), not raw `localStorage` nulls. On import, `ConfigSchema.normalizeLegacyConfig` coerces a non-boolean `pdm_output_json_enabled` to `false` and an invalid `pdm_output_display_format` to `text` before `validatePdmConfig` (strict boolean / enum). The key set and schema types stay unchanged.

Context Markdown in the ZIP must match `parts/prompts.json` for every listed locale. Export aligns each locale’s context files to the session tag set (reuse translated copy when the same tag exists; otherwise copy the session prompt). Import falls back to another locale’s Markdown when a path is missing (UI language ≠ complete prompt set).

<a id="75-personnalisation-par-édition-zip"></a>
### 12.5 Customization by ZIP editing

**When this path is required.** In-app **Configure profile** only covers the **current UI language**. For every other locale in the pack (prompts, embedded UI dictionaries on a maximal export, …), use ZIP hand-edit — that is the supported limit of the base product today.

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

---

<a id="feat-5-5-2"></a>
<a id="75-personnalisation-par-édition-zip"></a>
### 🎨 5.5.2. UI personalization

**Primary path:** Options → **Configure profile** — tabbed editor for `pdm_workspace_ui.brand` / `identity` / `texts`, `pdm_project`, and synopsis. Saves to the live session (and the active personal pack snapshot). Theme, LLM, STT, and Prompts remain live UI settings before export; an info panel documents that.

**Scope — one UI language.** Configure profile only edits chrome for the **current UI display language**. The product does not provide an in-app multi-locale pack editor. Other languages in the ZIP (prompt Markdown per locale, maximal `i18n/ui/` dictionaries, …) are maintained by unzipping the archive, editing files, re-zipping, and importing again. A Marketplace **extension** may cover richer multi-locale editing later; until then this ZIP hand-edit path is the supported limit.

**Power-user path (ZIP hand-edit):**

1. Export the profile with the **maximal** preset (recommended when embedding several UI dictionaries).
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

---

<a id="feat-5-5-3"></a>
<a id="10-marketplace-clone-vs-official-site"></a>
### 🏪 5.5.3. Marketplace of JSON profiles

### Gate

- `env.js`: `features.marketplace` → `Env.hasMarketplace()` — **false by default on clones**

### Official site

Marketplace is an in-app hash section (`#market`) with local catalogue when the feature flag is on (detail UI: 5.5.5).

### Clone without catalogue

- `app.js` `_redirectOfficialSection('market')` → `Env.officialMarketplaceUrl()` → `https://promptdemerde.com/#market`
- Nav/footer: `env-official-nav.js` updates `#nav-link-market`, `#footer-link-market` with external title `nav.marketExternalTitle`

### Alias

`#10-marketplace-clone-vs-official-site`

### Boundary

No Marketplace factory / `assets/market/**` documentation in this public mirror.

---

<a id="4-ollama--flux-a-et-flux-b"></a>
<a id="11-ollama-flow-a-and-flow-b"></a>

---

<a id="feat-5-5-4"></a>
<a id="7-options-profiles-export-and-danger-zone"></a>
<a id="7-4-json-profile-create-switch-export-import"></a>
<a id="7-6-related-modules"></a>
### 🔀 5.5.4. Profiles: create, switch, export modal

Under **Options → JSON profile**, the screen supports:

- **Profile selector** — choose which pack is active (bundled or personal).
- **+ Create profile** — snapshot the current session into a new personal pack, activate it, reload.
- **Import** — accepts **`.zip` only** (never a lone `.json`); integrity check, session overwrite, then UI refresh.
- **Export** — opens a guided modal (filename, minimal vs maximal preset, startup language, optional embedded UI translations) before download.

Export before a Danger-zone wipe or a machine change. ZIP structure, presets, security limits, and hand-editing brand fields are in [§12 Export / import — profile ZIP archive](#12-export-import-profile-zip-archive) and [§12.5 Customization by ZIP editing](#75-personnalisation-par-édition-zip).

<a id="7-5-danger-zone-wipe-all"></a>

| Key                  | Role                                           |
| -------------------- | ---------------------------------------------- |
| `pdm_active_profile` | Active profile ID e.g. `speech2texte`          |
| `pdm_project`        | Project metadata (synopsis, export branding)   |

### 7.6 Related modules

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

---

<a id="feat-5-5-5"></a>
### 🔎 5.5.5. Marketplace: search, filters and detail card

### Feature flag

Requires `features.marketplace` / `Env.hasMarketplace()` true (official site builds). Clones default to false and redirect (5.5.3).

### Catalogue UI modules

| Concern | Module / DOM |
|---------|----------------|
| Load, filter, sort | `market-catalog.js` |
| Search | `#mkt-search` (`market-ui-search.js`) — Escape clears query/publisher filter or blurs |
| Filters | publisher type, price, domains, languages, … |
| Sort | `featured` \| `label` \| `published` \| `price_*` |
| Layout | grid or list |
| Detail modal | `market-modal.js` — `#market-modal`, class `show`; download from `acquisition.download_url` / archive filename; Escape closes |

### Public boundary

Document runtime catalogue UI only. Do **not** describe `assets/market/**` factory, market packaging scripts, or unpublished catalogue pipelines in this public technical document.

---

<a id="feat-5-6"></a>
### ✹ 5.6. Languages, themes & same code everywhere

### Scope

| Leaf | Topic |
|------|--------|
| 5.6.1 | Twelve UI languages + 25 theme families (keys, Options, i18n/theme modules) |
| 5.6.2 | Same code on official site and clone (PHP/proxy surface) |
| 5.6.3 | Day/night header toggle + Options theme picker |
| 5.6.4 | `prefers-reduced-motion`, Arabic RTL, notif a11y |

### Primary keys

`pdm_language`, `pdm_theme` (default `marron-day`). Shell SPA routing that hosts these Options: 5.7.1.

---

<a id="feat-5-6-1"></a>
<a id="35-i18n"></a>
<a id="4-spa-shell-navigation-themes-i18n-feedback"></a>
### 🗣 5.6.1. Twelve UI languages & 25 themes

The [`themes.js`](../assets/js/themes.js) module exposes **50** themes (25 families in light and dark variants). The active id is stored in `pdm_theme`. The default value is `marron-day`. Under Options → Theme, each family card offers Light / Dark controls; the nav day/night toggle flips the active family.

<a id="35-i18n"></a>

### 4.3 i18n

[`assets/i18n/manifest.json`](../assets/i18n/manifest.json) declares the twelve locales `fr`, `en`, `ar`, `zh`, `eo`, `es`, `de`, `pt`, `it`, `ru`, `ja`, and `ko`. Modules `i18n.js`, `i18n-apply-dom.js`, and `i18n-locales.js` apply labels and metadata (including RTL). Under Options → Language, the flag row or the language selector changes the session language and reloads so every screen updates together. Language and theme can travel in a JSON profile export.

| Key            | Role                                          |
| -------------- | --------------------------------------------- |
| `pdm_language` | UI locale `fr`, `en`, …                       |
| `pdm_theme`    | Theme ID e.g. `marron-day` (default Light brown) |


The fifty theme identifiers are in `CS.THEME_IDS` (`config-schema-core.js`).

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

---

<a id="feat-5-6-2"></a>
### ≡ 5.6.2. Same code everywhere

Official site and clone share the same front-end bundles and contracts. Differences are deployment (`PDM_ENV`, optional `PDM_PROXY_TOKEN`) and which legal/Marketplace surfaces are local.

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

---

<a id="feat-5-6-3"></a>
<a id="7-3-language-and-theme"></a>
### 🌓 5.6.3. Day / night theme toggle

### Storage and default

- **Key:** `pdm_theme`
- **Default:** `CS.DEFAULT_THEME_ID = 'marron-day'` (`config-schema`)
- **Catalogue:** twenty-five theme families, each with light and dark variants (fifty selectable entries in Options)

### Header toggle

- **Files:** `themes.js`, `app.js` `bindThemeToggle`
- **DOM:** `#theme-toggle` (desktop header), `#theme-toggle-mobile` (inside mobile nav)
- **Action:** `PDM.Themes.toggleNightMode()` flips the current family between its dayId and nightId without changing family

### Options picker

- **DOM:** `#theme-picker` / `#stg-theme-current` (and related Options theme UI in `ui.js` / settings)
- **Apply:** writes CSS variables on `document.documentElement`; sets `colorScheme` from `theme.mode` (`light` | `dark`)

### Alias

Former Options language/theme panel alias: `#7-3-language-and-theme` (language half documented under 5.6.1 / 5.6.4).

---

<a id="feat-5-6-4"></a>
### ♿ 5.6.4. Reduced motion and RTL

### RTL

- **File:** `i18n.js` sets `document.documentElement.lang` and `.dir` from locale metadata
- **Locale meta:** `i18n-locales.js` — Arabic `ar.dir = 'rtl'`
- **Key:** `pdm_language`

### Reduced motion

- `matchMedia('(prefers-reduced-motion: reduce)')` consulted by `animation-synopsis.js`, `animation-inversion.js`, `footer-projects.js`, `footer-radar-portrait.js` (skip or disable autoplay)

### Feedback / a11y

- Toasts via `PDM.UI.notif` (impersonal copy ×12 locales)
- Escape-to-close map: 5.7.2; loader during disruptive profile transitions: 5.7.2

---

<a id="feat-5-7"></a>
### ✺ 5.7. Shell, navigation, Options & footer

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

### 4.5 Header and footer

Header animations are carried by `animation-inversion.js` and `animation-synopsis.js`. The footer relies on `footer-projects.js` and `footer-radar-portrait.js`. The environment badge reflects the server variable `PDM_ENV`. The DreamProjectAI projects carousel is present today on the official layout; **clone / self-host builds will drop that carousel from the footer in a later release** (official site may keep it). Stack badges and resource links are unaffected by that plan. README §5.7.8 shows two low-quality GIFs: with the ad carousel, and without it.

---

<a id="32-workspace"></a>
<a id="5-workspace"></a>

---

<a id="feat-5-7-1"></a>
### 🧭 5.7.1. In-app navigation (SPA)

### Hash router

- **File:** `assets/js/app.js` — `A.router` on boot + `hashchange`; display via `PDM.UI.show(section)`
- **Valid hashes:** `landing` | `workspace` | `prompts` | `market` | `settings` | `mentions` | `cgu` | `privacy` | `support`
- **Aliases / fallbacks:** `#config` → `settings`; empty or unknown → `workspace`; `#landing` without Homepage feature → `workspace`
- **Legacy documentation hashes:** `Docs.isLegacyDocHash` → open GitHub technical documentation, then land on Workspace
- **Clone redirects:** Marketplace / legal pages without local features → official site URLs (`env-official-nav.js` / `_redirectOfficialSection`)
- **Side effects on route change:** refresh Workspace / Prompts / Market / Settings as needed; stop landing demo rotation when leaving landing

---

<a id="feat-5-7-2"></a>
### ☰ 5.7.2. Burger menu, Escape and loader

### Burger (mobile nav)

- **Files:** `assets/js/app.js` (`A.bindNav` → `setOpen`), layout in `style-responsive.css`
- **Breakpoint:** burger visible at **`max-width: 1024px`**. Above that, `#nav-burger` is hidden and `#nav-links` stay in the header row.
- **DOM:** `#nav-burger.nav-burger`, `#nav-links.nav-links` (+ class `open`), `#main-nav`
- **Toggle:** click `#nav-burger` flips `open` on `#nav-links`; open glyph `✕`, closed `☰`; `aria-expanded` true/false. Label from i18n `nav.menu` (`i18n-apply-dom.js`).
- **Also closes when:** in-nav hash click (`navigateHash`), `hashchange` while open, document click outside burger/`#nav-links`, or **Escape** (handled in `polish.js`, not inside `setOpen`).

### Escape

Independent `keydown` listeners (no shared stack). Escape can close:

1. Mobile nav drawer (`#nav-links.open`) — `polish.js`
2. Options language custom select (`.stg-lang-select-wrap`) — `i18n-apply-dom.js`
3. Marketplace detail modal (`#market-modal` / `.show`) — `market-modal.js`
4. History entry modal — `history-ui-modal.js` (`A.closeHistoryModal`)
5. STT disruptive confirm / resume-offer (`#stt-resume-offer-modal`) — `stt-disruptive.js`
6. Market search focus (`#mkt-search`) — clear or blur — `market-ui-search.js`
7. Workspace audio processing on `#ws-input` — silent exit — `workspace-audio-bind.js`

**Not** Escape-closed: export-config modal, LLM/STT options panels, full-screen `#loader`.

### Full-screen loader

- **DOM:** `#loader` with `.spin` + `.loader-msg` (`index.html`). Visible only with class **`on`** (`PDM.UI.loader(on)` in `ui.js`).
- **Boot:** `bootstrap.js` `hideBootLoader()` removes `on` / sets `hidden` after init. HTML ships **without** `class="on"`, so the cold-start overlay is **not** shown by current markup/CSS unless something else adds `on` (boot does not).
- **Runtime show:** `PDM.UI.loader(true)` during profile **switch** (`profile-selector.js`) and profile **create** (`profile-selector-actions.js`), then `loader(false)` in `.finally()` (often just before `location.reload()`).
- **Maintenance:** `I18n.enterMaintenance()` forces loader `hidden`.
- **CSS note:** `polish-loader.css` styles `.spinner` while HTML uses `.spin` — polish spinner rules may never apply to the current markup.

### Known gaps (code)

- Multiple Escape handlers can fire on one keypress.
- Burger close on Escape duplicates glyph/`aria` updates outside `setOpen`.
- `UI.loader` does not null-check `#loader`.

---

<a id="feat-5-7-3"></a>
<a id="deploy-pdm-env-badges"></a>
### 🏷 5.7.3. Environment badge and GitHub version

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

---

<a id="feat-5-7-4"></a>
### ⌨ 5.7.4. Keyboard shortcuts and on-screen feedback

### Reformulate shortcut

- **File:** `polish.js` `initShortcuts`
- **Binding:** `keydown` where `(ctrlKey || metaKey) && key === 'Enter'` → programmatic click on `#sniperise-btn` if present and not `disabled`
- **Escape (nav):** also in `initShortcuts` — closes `#nav-links.open` and resets burger glyph/`aria-expanded` (see 5.7.2 for the full Escape map)

### On-screen feedback

- **API:** `PDM.UI.notif(msg, type)` in `ui.js` — `type` default `'info'`; also `'ok'` / `'err'`
- **DOM:** `#notif-box` receives a child `.notif.{ok|err|info}`; visible ~`U.NOTIF_VISIBLE_MS` (4500 ms), then fade and `remove()`
- **Copy path:** clipboard success uses i18n key `copied`
- **Inline status:** Options LLM Test writes HTML status under its status node (`settings-ui.js` `A.doTest`) — separate from toasts
- **Contract:** product toasts/status use impersonal i18n copy (twelve locales), not hard-coded French alone

---

<a id="feat-5-7-5"></a>
### 💫 5.7.5. Logo, labels, synopsis and shell animation

### Brand / nav logo

- **File:** `workspace-ui-profile.js`
- **Storage:** `pdm_workspace_ui.brand` — `firstWord`, `secondWord`, `extension`, `showExtension`, colour/class fields
- **Apply:** `WU.applyBrand()` → `#nav-logo-link` (`.logo-gt`, `.logo-word1` / `.logo-word2`, …)
- **Identity:** `.prompt-username-inverted` / `.prompt-suffix` from `pdm_workspace_ui.identity` (`applyIdentity` — hostname live, not `nav.promptSuffix`)
- **Feature flag:** `features.brandNavExtension` (`env.js` / `data-pdm-brand-nav-ext`) — when rebranded away from default, trailing `.com` can be hidden

### Synopsis

- Keys `pdm_profile_synopsis`, `pdm_profile_synopsis_lang`
- `WU.ensureProfileSynopsis`; typing animation in `animation-synopsis.js` → `#nav-synopsis`, `#nav-synopsis-text`, `#nav-synopsis-viewport`, `#nav-prompt`
- Companion motion: `animation-inversion.js` (honours reduced motion — 5.6.4)

### How to change pack-driven chrome

Export with the **maximal** ZIP preset, edit brand/synopsis fields, re-import (5.5.2).

---

<a id="feat-5-7-6"></a>
<a id="7-1-llm-connection"></a>
### 🔌 5.7.6. LLM Options: Ollama connection test and proxy token

Under **Options → LLM**:

- **Ollama URL** — points at the instance used for Reformulate (typically `http://localhost:11434` on the machine that opens the browser). Accepts loopback (`127.0.0.1`) or a **LAN IP** when Ollama runs on another host on the local network.
- **Optional Ollama token** and **“I don’t have a token”** checkbox — flow A on the official site; see [§11 Ollama — flow A and flow B](#11-ollama-flow-a-and-flow-b).
- **Operator proxy token** — stored in **sessionStorage** when the web server sets a relay secret (`PDM_PROXY_TOKEN`); never included in a portable ZIP export.

**Connection test.** The **Test** button checks reachability to the configured URL and refreshes the Workspace model list (`#ws-output-model-select`) from Ollama. **Blur** on the URL field can trigger the same refresh. Only models actually returned by the instance appear (no ghost “saved model” outside the list). On success, status text reports how many models were found; on failure, the list and stored model are invalidated. When inference goes through a locked relay, a wrong proxy token fails the check.

On every deploy (prod, preprod, and self-hosted), if the boot connection probe does not detect Ollama, a non-blocking corner reminder appears once per browser session (disclaimer + install links; dismiss with × or Escape).

<a id="7-2-voice-dictation-options-panel"></a>

Flow A/B detail: see 5.1.1.

---

<a id="feat-5-7-7"></a>
<a id="7-5-danger-zone-wipe-all"></a>
### ⚠ 5.7.7. Danger zone Wipe all

**Erase everything** (Danger zone) purges PromptDeMerde data in the browser:

- **Profiles**, active profile choice, workspace text, LLM / STT / proxy settings, UI preferences (theme, language, layout, and the rest of the personalization stack)
- **Provider tokens** and other `pdm_*` keys in **localStorage** and **sessionStorage**
- **Audio IndexedDB** (`pdm-audio`), known STT databases (including Parakeet cache when present)
- **Cache Storage** entries prefixed for PromptDeMerde, plus in-memory STT / market / export caches invalidated before reload

The app then reloads as a **fresh install** (`pdm_fresh` boot flag, removed at boot). Export a profile ZIP **before** this action if anything must survive.

**Caveat — not the same as Ctrl+F5.** Wipe all clears **PromptDeMerde data for this site origin**. It does **not** empty the whole browser (every other site’s cookies, history, or global Chromium/Firefox “clear browsing data”), and it is **not** a hard refresh (Ctrl+F5 / Shift+F5) that only busts page cache. For a blank-browser test outside this origin, use the browser’s own wipe tools.

<a id="7-6-related-modules"></a>

---

<a id="feat-5-7-8"></a>
### 📎 5.7.8. Footer: project carousel and resources

### Footer surface

Resource links, stack badges, documentation / support entry points. Technical documentation links target this document on GitHub. Version node `#footer-version`; environment badge `#footer-env-badge` (see 5.7.3).

### Projects carousel (official site)

- **File:** `footer-projects.js` (`PDM.FooterProjects`)
- **Behaviour:** autoplay `AUTOPLAY_MS = 2800`; pause on hover/focus; prev/next/dots; keyboard on root; **skips autoplay** when `prefers-reduced-motion`
- **Content:** hardcoded DreamProjectAI project set, overridable via `I18n.getFooterProjects()`
- **Related:** `footer-radar-portrait.js`

### Clone expectation

Clone builds keep badges and resource links. The DreamProjectAI advertising carousel is an official-site surface; self-host builds are not required to ship that strip.

---

<a id="menu-json-profile"></a>
## 🧳 6. JSON profile

Zone detail: [`Profiles.md`](Profiles.md) · product overview [5.5 JSON profile ZIP](Documentation.md#feat-5-5)

A JSON profile is a portable ZIP: prompts, LLM settings, UI/brand, language, theme, and optional embedded UI translations. Archive contract: 5.5.1 · personalization: 5.5.2 · Options entry: 5.5.4.

| Key          | Type         | Role                      |
| ------------ | ------------ | ------------------------- |
| `version`    | string       | app semver e.g. `1.23.2`  |
| `type`       | const        | always `pdm-config`       |
| `exportedAt` | ISO datetime | export timestamp          |

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

---

<a id="menu-prerequisites"></a>
<a id="10-installation-auto-hébergée"></a>
<a id="18-self-hosted-install-and-deployment"></a>
## 📋 7. Prerequisites

After clone, STT binaries: [`Stt.md`](Stt.md) · `install/restore-large-assets.sh`. Self-host detail: [9. Self-hosting](Documentation.md#menu-self-hosting).

Self-hosting rests on a GitHub clone, a PHP server, and Ollama. Restoring STT models with `install/restore-large-assets.sh` is **mandatory** after clone (concatenates `*.partNNN` into full Vosk / Whisper / Parakeet binaries under `assets/stt/`). Ollama runs on the browser machine or on the local network; on the official site, visitors must set `OLLAMA_ORIGINS=https://promptdemerde.com` and launch Ollama either with a one-shot `OLLAMA_ORIGINS=… ollama serve` or via a persistent OS service that carries the same environment. The footer badge shows SELF-HOSTED, PRE-PROD, or PROD according to `PDM_ENV`.

### 18.1 Prerequisites


| Component  | Version                                 |
| ---------- | --------------------------------------- |
| PHP        | 7.4+                                    |
| Server     | Apache or Nginx + PHP-FPM               |
| Ollama     | <a href="https://ollama.ai/download" target="_blank" rel="noopener noreferrer">ollama.ai</a> |
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

---

<a id="prereq-7-1"></a>
### 🌍 7.1. Official site

### Official site visitor checklist

1. Install <a href="https://ollama.com" target="_blank" rel="noopener noreferrer">Ollama</a> on the machine that opens the browser; `ollama pull` at least one text model.
2. Allow the site origin in Ollama CORS: set `OLLAMA_ORIGINS` to the official site origin, then restart Ollama (one-shot `OLLAMA_ORIGINS=… ollama serve`, or a persistent systemd / launchctl / Windows service with the same env).
3. Open the official site → **Options → LLM**: URL `http://localhost:11434` (or `127.0.0.1` / LAN IP), leave **“I don’t have a token”** checked for flow A.
4. Click **Test** (`settings-ui.js` `A.doTest` → `PDM.LLM.test`): on success, Workspace model list refreshes from the instance; on failure, list/stored model are invalidated.

Quick check: `curl -i http://localhost:11434/api/tags` should respond; browser console should not show CORS errors to `localhost:11434`.

Flow A / flow B and LLM panel keys: **5.1.1** and **5.7.6**. Install prerequisite tables from the former self-host chapter remain under **7** / **9** as migrated.

---

<a id="prereq-7-2"></a>
### 🛠 7.2. Self-host

### Self-host / clone checklist

1. Serve the app with a PHP-capable web server (Apache/Nginx + PHP) from the repository root.
2. Reassemble large STT assets after clone: `cd install && bash restore-large-assets.sh` (rebuilds Vosk / Whisper / Parakeet payloads from `*.partNNN`).
3. Configure Ollama as in **7.1** (`OLLAMA_ORIGINS` must include the clone origin).
4. Optional operator settings: `PDM_ENV` (environment badge — 5.7.3), `PDM_PROXY_TOKEN` (flow B relay — 5.1.1 / 5.7.6).
5. First launch may activate the bundled `speech2texte` profile when present under `assets/profiles/speech2texte/`.

Full deployment notes (badges, token): **5.7.3** and **9. Self-hosting**.

---

<a id="menu-try-it"></a>
<a id="22-quick-troubleshooting"></a>
## ▶ 8. Try it in three steps

1. Install Ollama and pull a model.
2. Open the official site or a clone; Options → LLM URL; **Test**.
3. Paste a raw prompt (or dictate), enable `#Tag` contexts, **Reformulate**.

| Problem | Hint |
|---------|------|
| Cleanup stuck / empty output | System prompt or active `#Tag` too restrictive; retry with fewer contexts |
| Ollama not responding | `ollama list`; URL under Options → LLM; **Test** button |
| `Failed to fetch` / CORS (prod) | Set `OLLAMA_ORIGINS=https://promptdemerde.com` then restart Ollama — [5.1.1](#feat-5-1-1) |
| Token missing | Flow B only: uncheck “I don't have a token”, enter the token under Options → LLM |
| Poor voice dictation | Vosk Mini / Maxi (CPU) or Whisper / Parakeet if WebGPU is OK — [5.3.1](#feat-5-3-1) |
| Microphone blocked | HTTPS or `http://localhost` — [5.3.1](#feat-5-3-1) |
| Data lost after wipe / profile change | Export the profile ZIP first; history lives in `pdm_clean_history` (exportable) |

---

<a id="license"></a>

---

<a id="menu-self-hosting"></a>
<a id="10-installation-auto-hébergée"></a>
<a id="18-self-hosted-install-and-deployment"></a>
<a id="deploy-pdm-env-badges"></a>
## 🖥 9. Self-hosting (optional)

Profiles at boot: [`Profiles.md`](Profiles.md). STT restore: [`Stt.md`](Stt.md).

Self-hosting rests on a GitHub clone, a PHP server, and Ollama. Restoring STT models with `install/restore-large-assets.sh` is **mandatory** after clone (concatenates `*.partNNN` into full Vosk / Whisper / Parakeet binaries under `assets/stt/`). Ollama runs on the browser machine or on the local network; on the official site, visitors must set `OLLAMA_ORIGINS=https://promptdemerde.com` and launch Ollama either with a one-shot `OLLAMA_ORIGINS=… ollama serve` or via a persistent OS service that carries the same environment. The footer badge shows SELF-HOSTED, PRE-PROD, or PROD according to `PDM_ENV`.

### 18.1 Prerequisites


| Component  | Version                                 |
| ---------- | --------------------------------------- |
| PHP        | 7.4+                                    |
| Server     | Apache or Nginx + PHP-FPM               |
| Ollama     | <a href="https://ollama.ai/download" target="_blank" rel="noopener noreferrer">ollama.ai</a> |
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

---

<a id="menu-credits"></a>
<a id="20-profile-stt-and-vendor-assets"></a>
## © 10. Credits

DreamProjectAI, Ollama, in-browser STT engines (Vosk, Parakeet, Whisper), fonts and third-party notices.

**Zone docs hub:** [`Profiles.md`](Profiles.md) · [`Stt.md`](Stt.md) · [`Stt-vosk.md`](Stt-vosk.md) · [`Vendor.md`](Vendor.md)

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

---

<a id="menu-further-reading"></a>
<a id="21-glossary-and-cross-references"></a>
<a id="14-pdm-namespaces"></a>
<a id="15-javascript-inventory"></a>
<a id="16-css-inventory"></a>
<a id="13-the-51-pdm-keys"></a>

**Documentation navigation** · [STT models](Stt.md) · [Vosk catalogue](Stt-vosk.md) · [Profiles](Profiles.md) · [Vendor JS](Vendor.md) · [README](../README.md) · [Security](../SECURITY.md)

## 📚 11. Further reading

| Term | Meaning |
|-------|------|
| System prompt | Global instruction (`pdm_system_prompt`) |
| Context prompt (`#Tag`) | Entry in `pdm_profiles[]` |
| Context prompt generator | Spec + UI that builds `#Tag` entries |
| Flow A | Browser → Ollama localhost |
| Flow B | Browser → `olama.php` → Ollama |
| `pdm-config` | Object of the 51 keys + export metadata |

### Related documents (full set)

| Document | Role |
|----------|------|
| [`README.md`](../README.md) | Product pitch |
| [`Stt.md`](Stt.md) | STT zone — models under `assets/stt/` |
| [`Stt-vosk.md`](Stt-vosk.md) | Vosk catalogue (`catalog.json`) |
| [`Profiles.md`](Profiles.md) | Profiles zone — bundled + ZIP |
| [`Vendor.md`](Vendor.md) | Vendor JS / ONNX |
| [`SECURITY.md`](../SECURITY.md) | Proxy, CSP, import |
| [`CONTRIBUTING.md`](../CONTRIBUTING.md) | Contributing |
| [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md) | Vendor licenses |

All zone documents link back to this file and to each other via the **Documentation navigation** line at the top.

---

<a id="22-quick-troubleshooting"></a>

### `PDM.*` namespaces

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

### JavaScript inventory

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
| [`workspace-dictation-audio-export.js`](../assets/js/workspace-dictation-audio-export.js) | Exports voice-dictation WebM blobs from history / profile. |
| [`workspace-dictation-audio.js`](../assets/js/workspace-dictation-audio.js) | Voice-dictation audio integration with Workspace Input. |
| [`workspace-image-bind.js`](../assets/js/workspace-image-bind.js) | Image import → vision description (file picker, Ollama). |
| [`workspace-image-encode.js`](../assets/js/workspace-image-encode.js) | Client-side image resize/encode before vision request. |
| [`workspace-inference.js`](../assets/js/workspace-inference.js) | Clean orchestration: assemble prompts, multi-pass, stream. |
| [`workspace-input-chunk.js`](../assets/js/workspace-input-chunk.js) | Long Input multi-pass chunking for inference. |
| [`workspace-input-tools.js`](../assets/js/workspace-input-tools.js) | Mutual exclusion of Input tools (voice dictation / audio / image). |
| [`workspace-llm-config.js`](../assets/js/workspace-llm-config.js) | Reads Workspace LLM options from Storage / DOM. |
| [`workspace-llm-options.js`](../assets/js/workspace-llm-options.js) | Workspace LLM Options panel (temperature, tokens, thinking…). |
| [`workspace-output-format.js`](../assets/js/workspace-output-format.js) | Output display format chips (text / json / html). |
| [`workspace-persistence.js`](../assets/js/workspace-persistence.js) | Persists Workspace session state (input/output/thinking) to Storage. |
| [`workspace-refresh.js`](../assets/js/workspace-refresh.js) | Refreshes Workspace UI after profile / settings changes. |
| [`workspace-stream.js`](../assets/js/workspace-stream.js) | Ollama stream consumer + thinking panel. |
| [`workspace-thinking.js`](../assets/js/workspace-thinking.js) | Thinking (réflexion) panel UI during Clean. |
| [`workspace-tts-download.js`](../assets/js/workspace-tts-download.js) | TTS export placeholder (download hook). |
| [`workspace-ui-profile.js`](../assets/js/workspace-ui-profile.js) | Applies pdm_workspace_ui brand/texts to Workspace chrome. |

### 15.4 storage

| File | Role |
|---|---|
| [`storage-audio-blobs.js`](../assets/js/storage-audio-blobs.js) | Local storage of imported audio files (IndexedDB). |
| [`storage-config-audio.js`](../assets/js/storage-config-audio.js) | Async export/import of voice-dictation audio blobs into pdm-config. |
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
| [`storage-workspace-audio.js`](../assets/js/storage-workspace-audio.js) | Workspace session extension for audio import (metadata + audioRef). |
| [`storage-workspace-stt.js`](../assets/js/storage-workspace-stt.js) | Persists workspace session state and voice-dictation settings. |

### 15.5 stt

| File | Role |
|---|---|
| [`stt-audio-processor.js`](../assets/js/stt-audio-processor.js) | AudioWorklet microphone capture for STT voice dictation. |
| [`stt-core.js`](../assets/js/stt-core.js) | STT core: engine state, engine order, language helpers, and load progress. |
| [`stt-dictation-recorder.js`](../assets/js/stt-dictation-recorder.js) | Parallel WebM recording during STT voice dictation. |
| [`stt-disruptive.js`](../assets/js/stt-disruptive.js) | Voice-dictation guard before disruptive actions (reload, forced stop). |
| [`stt-init.js`](../assets/js/stt-init.js) | STT init/refresh: engine support detection and UI states (unsupported, idle…). |
| [`stt-options-panel.js`](../assets/js/stt-options-panel.js) | Expandable voice-dictation Options panel (Workspace Input). |
| [`stt-parakeet-config.js`](../assets/js/stt-parakeet-config.js) | Parakeet constants (sample rate, WASM paths, model configs, special-token regexes). |
| [`stt-parakeet-decode.js`](../assets/js/stt-parakeet-decode.js) | Parakeet decode: audio pipeline, timed-word joining, text sanitization. |
| [`stt-parakeet-engine.js`](../assets/js/stt-parakeet-engine.js) | Parakeet engine: start/stop stream, anti-stale generations, model+decode orchestration. |
| [`stt-parakeet-model.js`](../assets/js/stt-parakeet-model.js) | Parakeet model load/pool (ONNX), download progress, and unload. |
| [`stt-parakeet.js`](../assets/js/stt-parakeet.js) | Bootstrap entry point — re-exports the engine module. |
| [`stt-permissions.js`](../assets/js/stt-permissions.js) | STT mic permissions: LAN HTTP block, Chromium hints, authorization toasts. |
| [`stt-preload.js`](../assets/js/stt-preload.js) | Preloads the selected STT engine (Options → Load engine) without starting voice dictation. |
| [`stt-shared-audio.js`](../assets/js/stt-shared-audio.js) | Microphone capture via AudioWorklet/ScriptProcessor. |
| [`stt-shared-beep.js`](../assets/js/stt-shared-beep.js) | Voice-dictation Web Audio beeps. |
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

### CSS inventory

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

### Full `pdm_*` key catalogue

### At a glance

All exportable preferences live in the `pdm-config` object. This object has **51** mandatory `pdm_*` keys, plus `version`, `type`, and `exportedAt` metadata. In the maximal preset, the root may also carry `i18n` and `langs` together. Keys are grouped below by domain. The machine schema [`pdm-config.schema.json`](../assets/config/pdm-config.schema.json) declares the **same list** as `CS.PDM_KEYS` in `config-schema-core.js`.

### 13.1 Export metadata


| Key          | Type         | Role                      |
| ------------ | ------------ | ------------------------- |
| `version`    | string       | app semver e.g. `1.23.2`  |
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
| `pdm_workspace`     | Session state `{ input, output, thinking, contextPanelOpen, inputSource, audioFileName }` (Input = raw prompt)     |
| `pdm_workspace_ui`  | Profile UI: `identity`, `texts`, and `brand` (two-word nav logo + optional hex colors) |
| `pdm_history_count` | Clean counter                                                                         |
| `pdm_clean_history` | Journal max 100 entries — legacy fields + `trace` (before/after compression matrix)   |


### 13.8 Interface


| Key            | Role                                          |
| -------------- | --------------------------------------------- |
| `pdm_language` | UI locale `fr`, `en`, …                       |
| `pdm_theme`    | Theme ID e.g. `marron-day` (default Light brown) |


The fifty theme identifiers are in `CS.THEME_IDS` (`config-schema-core.js`).

### 13.9 STT voice dictation


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

---

<a id="menu-license"></a>
<a id="license"></a>
## ⚖ 12. License

**License:** MIT — full text in [`LICENSE`](../LICENSE) at the repository root.

**Attribution:** DreamProjectAI. Engine and font notices: [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md).

**Related:** 10. Credits (STT/profile/vendor asset pointers); 11. Further reading (zone docs `Stt`, `Profiles`, `Vendor`).

---

*Technical documentation — application version 1.23.2.*

---
