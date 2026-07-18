# Vendor JavaScript — PromptDeMerde

<p align="center">
  <img src="../assets/images/flags/en.svg" alt="English" width="28" height="20">
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
| [`../README.md`](../README.md) | Product pitch |
| [`Documentation.md`](Documentation.md) | Technical documentation |
| [`../CONTRIBUTING.md`](../CONTRIBUTING.md) | Contributing |
| [`../SECURITY.md`](../SECURITY.md) | Security |
| [`../THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md) | Third-party notices |
| [`Stt.md`](Stt.md) | STT zone |
| [`Stt-vosk.md`](Stt-vosk.md) | Vosk catalogue |
| [`Profiles.md`](Profiles.md) | Profiles zone |
