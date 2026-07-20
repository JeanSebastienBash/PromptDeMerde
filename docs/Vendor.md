# Vendor JavaScript — PromptDeMerde

<p align="center">
  <img src="../assets/images/flags/en.svg" alt="English" width="28" height="20">
</p>
**Documentation navigation** · [Technical documentation](Documentation.md) · [STT models](Stt.md) · [Vosk catalogue](Stt-vosk.md) · [Profiles](Profiles.md) · [Vendor JS](Vendor.md) · [README](../README.md) · [Security](../SECURITY.md)

> **Synopsis**: Third-party dependencies served locally under `assets/js/vendor/` (no CDN).
>
> **Purpose**: Document embedded libraries whose minified body must not be modified.
>
> **Related product docs**: [Documentation.md — 5.3 STT](Documentation.md#feat-5-3) · [`Stt.md`](Stt.md) · [`Stt-vosk.md`](Stt-vosk.md) · [`Profiles.md`](Profiles.md) (ZIP via JSZip)

| Path under `assets/js/vendor/` | Role | Consumer module |
|--------|------|---------------------|
| `jszip.min.js` | Browser ZIP | `profile-bundle-export.js`, `storage-config-import.js` |
| `vosk/vosk.js` | Vosk WASM API | `stt-vosk-engine.js`, `stt-vosk-model.js` |
| `parakeet/parakeet-lib.js` | Parakeet ONNX | `stt-parakeet.js`, `stt-parakeet-engine.js` |
| `transformers/transformers-lib.js` | HuggingFace Transformers (minified) | `stt-whisper-worker.js` |
| `onnxruntime-web/*.mjs`, `*.wasm` | ONNX Runtime Web | Whisper, Parakeet |
| `transformers/ort-*.mjs`, `*.wasm` | ONNX Runtime (Transformers copy) | Whisper worker |

**Rule**: do not prepend headers in minified `.mjs` or `.wasm` files — that can break WASM loaders.

Notices and licenses: [`../THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md).

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


