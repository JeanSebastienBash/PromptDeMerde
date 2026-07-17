# Vendor JavaScript — PromptDeMerde

<p align="center">
  <a href="Vendor.en.md"><img src="../assets/images/flags/en.svg" alt="English" width="28" height="20"></a>
  &nbsp;
  <a href="Vendor.md"><img src="../assets/images/flags/fr.svg" alt="Français" width="28" height="20"></a>
</p>


<p align="center">
  <a href="README.md"><img src="../../images/flags/en.svg" alt="English" width="28" height="20"></a>
  &nbsp;
  <a href="README.fr.md"><img src="../../images/flags/fr.svg" alt="Français" width="28" height="20"></a>
</p>

> **Synopsis**: Third-party dependencies served locally (no CDN).
>
> **Purpose**: Document embedded libraries whose minified body must not be modified.

| Path | Role | Consumer module |
|--------|------|---------------------|
| `jszip.min.js` | Browser ZIP | `profile-bundle-export.js`, `storage-config-import.js` |
| `vosk/vosk.js` | Vosk WASM API | `stt-vosk-engine.js`, `stt-vosk-model.js` |
| `parakeet/parakeet-lib.js` | Parakeet ONNX | `stt-parakeet.js`, `stt-parakeet-engine.js` |
| `transformers/transformers-lib.js` | HuggingFace Transformers (minified) | `stt-whisper-worker.js` |
| `onnxruntime-web/*.mjs`, `*.wasm` | ONNX Runtime Web | Whisper, Parakeet |
| `transformers/ort-*.mjs`, `*.wasm` | ONNX Runtime (Transformers copy) | Whisper worker |

**Rule**: do not prepend headers in minified `.mjs` or `.wasm` files — that can break WASM loaders.

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
