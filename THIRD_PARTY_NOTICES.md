# Third-party notices — PromptDeMerde.com

<p align="center">
  <img src="assets/images/flags/en.svg" alt="English" width="28" height="20">
</p>


> Third-party components bundled or downloaded locally (no CDN).  
> This file supplements the [LICENSE](LICENSE) (MIT — PromptDeMerde code).

---

## JavaScript (browser)

| Component | Location | License | Note |
|-----------|----------|---------|------|
| **JSZip** | `assets/js/vendor/jszip.min.js` | MIT | Profile archive export/import |
| **ONNX Runtime Web** | `assets/js/vendor/onnxruntime-web/` | MIT | Whisper / Parakeet inference |
| **Hugging Face Transformers.js** (bundle) | `assets/js/vendor/transformers/` | Apache-2.0 | Whisper worker pipeline |
| **Vosk browser** | `assets/js/vendor/vosk/vosk.js` | Apache-2.0 | Vosk WASM API |
| **Parakeet runtime** | `assets/js/vendor/parakeet/parakeet-lib.js` | See upstream NVIDIA NeMo / ONNX export | Minified bundle — do not modify |

Full upstream licenses: see respective repositories (<a href="https://github.com/microsoft/onnxruntime" target="_blank" rel="noopener noreferrer">ONNX Runtime</a>, <a href="https://github.com/huggingface/transformers.js" target="_blank" rel="noopener noreferrer">Transformers.js</a>, <a href="https://github.com/alphacep/vosk-api" target="_blank" rel="noopener noreferrer">Vosk</a>, <a href="https://github.com/Stuk/jszip" target="_blank" rel="noopener noreferrer">JSZip</a>).

---

## Speech-to-Text models (`assets/stt/`)

| Engine | Files | Origin / license (summary) |
|--------|-------|------------------------------|
| **Vosk** | `vosk-*/model.tar.gz` | Models from <a href="https://alphacephei.com/vosk/models" target="_blank" rel="noopener noreferrer">alphacep/vosk-models</a> — Apache-2.0 |
| **Whisper** (ONNX) | `whisper-*/onnx/*.onnx`, HF tokenizer | Derived from OpenAI Whisper; Hugging Face configs — see `config.json` / upstream |
| **Parakeet** | `parakeet/*.onnx`, `vocab.txt` | NVIDIA NeMo Parakeet TDT — local use; respect <a href="https://www.nvidia.com/en-us/agreements/enterprise-software/nvidia-software-license-agreement/" target="_blank" rel="noopener noreferrer">NVIDIA license terms</a> |

Binaries > 40 MB are versioned in **parts** (`*.partNNN`); restore after clone:

```bash
cd install
bash restore-large-assets.sh
```

---

## Web fonts

Loaded locally under `assets/fonts/` (no CDN) — `@font-face` declarations in `assets/css/style-base.css`.

| Font | Location | Usage | License |
|------|----------|-------|---------|
| **Fira Code** | `assets/fonts/firacode/` | Body / code (`--font-body`) | SIL Open Font License 1.1 |
| **Inconsolata** | `assets/fonts/inconsolata/` | UI chrome (`--font-ui`) | SIL Open Font License 1.1 |
| **Space Grotesk** | `assets/fonts/spacegrotesk/` | APP / display headings (`--font-app-heading`, `--font-display`) | SIL Open Font License 1.1 |
| **Archivo Black** | `assets/fonts/archivoblack/` | Hero / marketing logo (`--font-hero`) | SIL Open Font License 1.1 |
| **Anton** | `assets/fonts/anton/` | Condensed fallback for `--font-hero` | SIL Open Font License 1.1 |

---

## Ollama

PromptDeMerde **does not redistribute** the Ollama runtime or LLM weights. The user installs <a href="https://ollama.com" target="_blank" rel="noopener noreferrer">Ollama</a> separately and chooses models.

**README mark only:** `assets/images/third-party/ollama-mark.svg` / `.png` are the small official llama mark from the <a href="https://github.com/ollama/ollama/tree/main/docs" target="_blank" rel="noopener noreferrer">Ollama docs tree</a> (upstream project MIT). Used for attribution in `README.md`; not a redistribution of Ollama itself.

---

## Report a missing attribution

If an attribution is missing, write to **dreamproject-ai@proton.me** with the file path and presumed upstream license. DreamProjectAI does not use GitHub issues as a triage channel.

## Related documents

| Document | Role |
|----------|------|
| [`README.md`](README.md) | Product pitch (EN) |
| [`docs/Documentation.md`](docs/Documentation.md) | Technical documentation (EN) |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Contributing (EN) |
| [`SECURITY.md`](SECURITY.md) | Security (EN) |
| [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) | Third-party notices (EN) |
| [`docs/Stt.md`](docs/Stt.md) | STT zone (EN) |
| [`docs/Stt-vosk.md`](docs/Stt-vosk.md) | Vosk catalogue (EN) |
| [`docs/Profiles.md`](docs/Profiles.md) | Profiles zone (EN) |
| [`docs/Vendor.md`](docs/Vendor.md) | Vendor zone (EN) |
