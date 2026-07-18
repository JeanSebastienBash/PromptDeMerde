# STT models (Speech-to-Text)

<p align="center">
  <a href="Stt.en.md"><img src="../assets/images/flags/en.svg" alt="English" width="28" height="20"></a>
  &nbsp;
  <a href="Stt.md"><img src="../assets/images/flags/fr.svg" alt="Français" width="28" height="20"></a>
</p>

> **Synopsis**: Layout of local speech-to-text engines (one folder per `engine_id`).
>
> **Purpose**: Document where to place Vosk, Whisper, and Parakeet models for the STT engines.

One directory per engine, named like the selector `engine_id` (`stt-core.js` / `storage-core.js`).

| Directory | Displayed engine | Contents |
|---|---|---|
| `vosk-mini/` | Vosk Mini | `model.tar.gz` (FR legacy); `/{langId}/model.tar.gz` for other languages |
| `vosk-maxi/` | Vosk Maxi | `model.tar.gz` (FR legacy) — no product multilingual Maxi |
| `whisper-mini/` | Whisper Mini | tokenizer + ONNX q4 / q4f16 |
| `whisper-maxi/` | Whisper Maxi | tokenizer + hybrid ONNX fp16+q4 / q4 (Workspace audio/video import) |
| `parakeet/` | Parakeet | int4 encoder, int8 decoder, `vocab.txt` |

**Open-source status (July 2026)**: on **Linux**, only **Vosk Maxi** is reliable across tested browsers. Whisper GPU (Mini/Maxi) and Parakeet GPU remain experimental; Whisper Maxi is not validated. **Windows + recent GPU**: still to validate.

### GitHub clone — binaries > 40 MB

Heavy files (`model.tar.gz`, Whisper ONNX decoders, Parakeet encoder) ship as **parts ≤ 30 MB** (`*.partNNN`). After clone: `cd install && bash restore-large-assets.sh`.

After `git clone`:

```bash
cd install
bash restore-large-assets.sh
```

The script rebuilds each file at its exact path, verifies the SHA256 fingerprint, then **deletes the parts**. Run it **from `install/`**.

Vosk mini i18n models (outside FR legacy): manifest [`install/vosk-assets.manifest`](../install/vosk-assets.manifest).

Runtime catalogue: [`vosk/catalog.json`](../assets/stt/vosk/catalog.json) — **Engine language** selector (**Vosk Mini** = product multilingual path). Zone docs: [`Stt-vosk.en.md`](Stt-vosk.en.md).

**Scope**: STT / Vosk language coverage is **frozen** for the open-source product (shipped catalogue). No Vosk redesign and no major language expansion — minor fixes only.

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
- Minified bundles under `assets/js/vendor/` (see [`Vendor.en.md`](Vendor.en.md))

## Related documents

| Document | Role |
|----------|------|
| [`../README.md`](../README.md) | Product pitch (EN) |
| [`Documentation.en.md`](Documentation.en.md) | Technical documentation (EN) |
| [`../CONTRIBUTING.md`](../CONTRIBUTING.md) | Contributing (EN) |
| [`../SECURITY.md`](../SECURITY.md) | Security (EN) |
| [`../THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md) | Third-party notices (EN) |
| [`Stt.en.md`](Stt.en.md) | STT zone (EN) |
| [`Stt-vosk.en.md`](Stt-vosk.en.md) | Vosk catalogue (EN) |
| [`Profiles.en.md`](Profiles.en.md) | Profiles zone (EN) |
| [`Vendor.en.md`](Vendor.en.md) | Vendor zone (EN) |
