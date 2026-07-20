# STT models (Speech-to-Text)

<p align="center">
  <img src="../assets/images/flags/en.svg" alt="English" width="28" height="20">
</p>
**Documentation navigation** · [Technical documentation](Documentation.md) · [STT models](Stt.md) · [Vosk catalogue](Stt-vosk.md) · [Profiles](Profiles.md) · [Vendor JS](Vendor.md) · [README](../README.md) · [Security](../SECURITY.md)

> **Synopsis**: Layout of local speech-to-text engines (one folder per `engine_id` under `assets/stt/`).
>
> **Purpose**: Document where Vosk, Whisper, and Parakeet models live for the in-browser STT engines.
>
> **Long-form product behaviour**: [Documentation.md — 5.3 Voice, media & vision](Documentation.md#feat-5-3) · [5.3.1 engines](Documentation.md#feat-5-3-1)

One directory per engine, named like the selector `engine_id` (`stt-core.js` / `storage-core.js`). Engine order: `vosk-mini`, `vosk-maxi`, `whisper-mini`, `whisper-maxi`, `parakeet`.

| Directory under `assets/stt/` | Displayed engine | Contents |
|---|---|---|
| `vosk-mini/` | Vosk Mini | `model.tar.gz` (FR legacy); `/{langId}/model.tar.gz` for other catalogue languages |
| `vosk-maxi/` | Vosk Maxi | `model.tar.gz` (FR legacy) — no product multilingual Maxi |
| `whisper-mini/` | Whisper Mini | tokenizer + ONNX q4 / q4f16 |
| `whisper-maxi/` | Whisper Maxi | tokenizer + hybrid ONNX fp16+q4 / q4 (Workspace audio/video import 🎵) |
| `parakeet/` | Parakeet | int4 encoder, int8 decoder, `vocab.txt` |

**Product maturity (aligned with README / code)**: the **Vosk** family is the everyday baseline (no dedicated GPU required). **Vosk Mini** covers the shipped multilingual catalogue; **Vosk Maxi** centres on French (legacy path). **Whisper** (Mini/Maxi) and **Parakeet** remain optional / best with a capable GPU (WebGPU). **Windows + recent GPU**: still early. File import transcription uses **Whisper Maxi** in the browser (see Documentation 5.3.2).

### GitHub clone — binaries > 40 MB

Heavy files (`model.tar.gz`, Whisper ONNX decoders, Parakeet encoder) ship as **parts ≤ 30 MB** (`*.partNNN`). After clone:

```bash
cd install
bash restore-large-assets.sh
```

The script rebuilds each file at its exact path, verifies the SHA256 fingerprint, then **deletes the parts**. Run it **from `install/`**.

Vosk mini i18n models (outside FR legacy): manifest [`install/vosk-assets.manifest`](../install/vosk-assets.manifest).

Runtime catalogue: [`assets/stt/vosk/catalog.json`](../assets/stt/vosk/catalog.json) — **Engine language** selector (**Vosk Mini** = product multilingual path). Zone detail: [`Stt-vosk.md`](Stt-vosk.md).

**Maintainer** (local repo with full binaries):

```bash
cd install
bash split-large-assets.sh
```

Never delete the originals — only regenerate `*.partNNN` parts.

## Immutable artefacts (no file headers)

The following are **binaries or third-party data** — do not add comments (they would break ONNX/HuggingFace parsers):

- `*.onnx`, `*.wasm`, `*.tar.gz`, `*.ttf`, `*.png`
- `whisper-*/tokenizer*.json`, `vocab.json`, `merges.txt`, HuggingFace configs
- `parakeet/vocab.txt`
- Minified bundles under `assets/js/vendor/` (see [`Vendor.md`](Vendor.md))

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


