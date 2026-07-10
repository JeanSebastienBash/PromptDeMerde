# Modèles STT (Speech-to-Text)

> **Synopsis** : Arborescence des moteurs de dictée vocale locaux (un dossier par engine_id).
>
> **Objectif** : Documenter où placer vos modèles Vosk, Whisper et Parakeet pour les moteurs STT.

Un répertoire par moteur, nommé comme l'`engine_id` du sélecteur (`stt-core.js` / `storage-core.js`).

| Répertoire | Moteur affiché | Contenu |
|---|---|---|
| `vosk-mini/` | Vosk Mini | `model.tar.gz` |
| `vosk-maxi/` | Vosk Maxi | `model.tar.gz` |
| `whisper-mini/` | Whisper Mini | tokenizer + ONNX q4 / q4f16 |
| `whisper-maxi/` | Whisper Maxi | tokenizer + ONNX hybride fp16+q4 / q4 (aussi utilisé par l'import audio Workspace) |
| `parakeet/` | Parakeet | encodeur int4, décodeur int8, `vocab.txt` |

Parakeet : si l'encodeur manque après un clone Git, `bash assets/stt/parakeet/restore-encoder.sh`.

## Artefacts non modifiables (pas d'en-tête fichier)

Les fichiers suivants sont des **binaires ou données tierces** — ne pas y ajouter de commentaire (casseraient parsers ONNX/HuggingFace) :

- `*.onnx`, `*.wasm`, `*.tar.gz`, `*.ttf`, `*.png`
- `whisper-*/tokenizer*.json`, `vocab.json`, `merges.txt`, configs HuggingFace
- `parakeet/vocab.txt`
- Bundles minifiés sous `assets/js/vendor/` (voir `assets/js/vendor/README.md`)
