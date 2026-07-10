# Vendor JavaScript — PromptDeMerde

> **Synopsis** : Dépendances tierces servies localement (sans CDN).
>
> **Objectif** : Documenter les bibliothèques embarquées dont le corps minifié ne doit pas être modifié.

| Chemin | Rôle | Module consommateur |
|--------|------|---------------------|
| `vosk/vosk.js` | API Vosk WASM | `stt-vosk-engine.js`, `stt-vosk-model.js` |
| `parakeet/parakeet-lib.js` | ONNX Parakeet | `stt-parakeet.js`, `stt-parakeet-engine.js` |
| `transformers/transformers-lib.js` | HuggingFace Transformers (minifié) | `stt-whisper-worker.js` |
| `onnxruntime-web/*.mjs`, `*.wasm` | ONNX Runtime Web | Whisper, Parakeet |
| `transformers/ort-*.mjs`, `*.wasm` | ONNX Runtime (copie Transformers) | Whisper worker |

**Règle** : ne pas préfixer d'en-tête dans les fichiers `.mjs` minifiés ou `.wasm` — risque de casser les loaders WASM.
