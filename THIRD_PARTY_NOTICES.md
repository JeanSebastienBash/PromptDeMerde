# Third-party notices — PromptDeMerde.com

<p align="center">
  <a href="THIRD_PARTY_NOTICES.md"><img src="assets/images/flags/en.svg" alt="English" width="28" height="20"></a>
  &nbsp;
  <a href="THIRD_PARTY_NOTICES.fr.md"><img src="assets/images/flags/fr.svg" alt="Français" width="28" height="20"></a>
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

Full upstream licenses: see respective repositories ([ONNX Runtime](https://github.com/microsoft/onnxruntime), [Transformers.js](https://github.com/huggingface/transformers.js), [Vosk](https://github.com/alphacep/vosk-api), [JSZip](https://github.com/Stuk/jszip)).

---

## Speech-to-Text models (`assets/stt/`)

| Engine | Files | Origin / license (summary) |
|--------|-------|------------------------------|
| **Vosk** | `vosk-*/model.tar.gz` | Models from [alphacep/vosk-models](https://alphacephei.com/vosk/models) — Apache-2.0 |
| **Whisper** (ONNX) | `whisper-*/onnx/*.onnx`, HF tokenizer | Derived from OpenAI Whisper; Hugging Face configs — see `config.json` / upstream |
| **Parakeet** | `parakeet/*.onnx`, `vocab.txt` | NVIDIA NeMo Parakeet TDT — local use; respect [NVIDIA license terms](https://www.nvidia.com/en-us/agreements/enterprise-software/nvidia-software-license-agreement/) |

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

PromptDeMerde **does not redistribute** Ollama or LLM weights. The user installs [Ollama](https://ollama.ai/) separately and chooses models.

---

## Report a missing attribution

If an attribution is missing, write to **dreamproject-ai@proton.me** with the file path and presumed upstream license. DreamProjectAI does not use GitHub issues as a triage channel.

## Related documents

| Document | Role |
|----------|------|
| [`README.md`](README.md) | Product pitch (EN) |
| [`docs/Documentation.en.md`](docs/Documentation.en.md) | Technical documentation (EN) |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Contributing (EN) |
| [`SECURITY.md`](SECURITY.md) | Security (EN) |
| [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) | Third-party notices (EN) |
| [`docs/Stt.en.md`](docs/Stt.en.md) | STT zone (EN) |
| [`docs/Stt-vosk.en.md`](docs/Stt-vosk.en.md) | Vosk catalogue (EN) |
| [`docs/Profiles.en.md`](docs/Profiles.en.md) | Profiles zone (EN) |
| [`docs/Vendor.en.md`](docs/Vendor.en.md) | Vendor zone (EN) |
