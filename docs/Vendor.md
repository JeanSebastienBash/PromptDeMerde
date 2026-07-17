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

> **Synopsis** : Dépendances tierces servies localement (sans CDN).
>
> **Objectif** : Documenter les bibliothèques embarquées dont le corps minifié ne doit pas être modifié.

| Chemin | Rôle | Module consommateur |
|--------|------|---------------------|
| `jszip.min.js` | ZIP navigateur | `profile-bundle-export.js`, `storage-config-import.js` |
| `vosk/vosk.js` | API Vosk WASM | `stt-vosk-engine.js`, `stt-vosk-model.js` |
| `parakeet/parakeet-lib.js` | ONNX Parakeet | `stt-parakeet.js`, `stt-parakeet-engine.js` |
| `transformers/transformers-lib.js` | HuggingFace Transformers (minifié) | `stt-whisper-worker.js` |
| `onnxruntime-web/*.mjs`, `*.wasm` | ONNX Runtime Web | Whisper, Parakeet |
| `transformers/ort-*.mjs`, `*.wasm` | ONNX Runtime (copie Transformers) | Whisper worker |

**Règle** : ne pas préfixer d'en-tête dans les fichiers `.mjs` minifiés ou `.wasm` — risque de casser les loaders WASM.

## Documents liés

| Document | Rôle |
|----------|------|
| [`../README.fr.md`](../README.fr.md) | Accroche produit (FR) |
| [`Documentation.md`](Documentation.md) | Documentation technique (FR) |
| [`../CONTRIBUTING.fr.md`](../CONTRIBUTING.fr.md) | Contribuer (FR) |
| [`../SECURITY.fr.md`](../SECURITY.fr.md) | Sécurité (FR) |
| [`../THIRD_PARTY_NOTICES.fr.md`](../THIRD_PARTY_NOTICES.fr.md) | Mentions tierces (FR) |
| [`Stt.md`](Stt.md) | Zone STT (FR) |
| [`Stt-vosk.md`](Stt-vosk.md) | Catalogue Vosk (FR) |
| [`Profiles.md`](Profiles.md) | Zone profils (FR) |
| [`Vendor.md`](Vendor.md) | Zone vendor (FR) |
