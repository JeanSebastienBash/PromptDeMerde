# Modèles STT (Speech-to-Text)

> **Synopsis** : Arborescence des moteurs de dictée vocale locaux (un dossier par engine_id).
>
> **Objectif** : Documenter où placer vos modèles Vosk, Whisper et Parakeet pour les moteurs STT.

Un répertoire par moteur, nommé comme l'`engine_id` du sélecteur (`stt-core.js` / `storage-core.js`).

| Répertoire | Moteur affiché | Contenu |
|---|---|---|
| `vosk-mini/` | Vosk Mini | `model.tar.gz` (FR legacy) ; `/{langId}/model.tar.gz` pour les autres langues |
| `vosk-maxi/` | Vosk Maxi | `model.tar.gz` |
| `whisper-mini/` | Whisper Mini | tokenizer + ONNX q4 / q4f16 |
| `whisper-maxi/` | Whisper Maxi | tokenizer + ONNX hybride fp16+q4 / q4 (import audio/vidéo Workspace) |
| `parakeet/` | Parakeet | encodeur int4, décodeur int8, `vocab.txt` |

**État open source (juillet 2026)** : sous **Linux**, seul **Vosk Maxi** est fiable dans tous les navigateurs testés. Whisper GPU (Mini/Maxi) et Parakeet GPU restent expérimentaux ; Whisper Maxi non validé. **Windows + GPU récent** : à valider.

### Clone GitHub — binaires > 40 Mo

Les fichiers lourds (`model.tar.gz`, decodeurs Whisper ONNX, encodeur Parakeet) sont livrés en **parts ≤ 30 Mo** (`*.partNNN`). Après clone : `cd install && bash restore-large-assets.sh`.

Après `git clone` :

```bash
cd install
bash restore-large-assets.sh
```

Le script reconstitue chaque fichier à son emplacement exact, vérifie l'empreinte SHA256, puis **supprime les parts**. À exécuter **depuis `install/`**.

Modèles Vosk mini i18n (hors FR legacy) : manifest [`install/vosk-assets.manifest`](../../install/vosk-assets.manifest).

Catalogue runtime : [`vosk/catalog.json`](vosk/catalog.json) — sélecteur **Langue du moteur** (Vosk Mini).

**Maintainer** (dépôt local avec binaires complets) :

```bash
cd install
bash split-large-assets.sh
```

Ne supprime jamais les originaux — régénère uniquement les parts `*.partNNN`.

## Artefacts non modifiables (pas d'en-tête fichier)

Les fichiers suivants sont des **binaires ou données tierces** — ne pas y ajouter de commentaire (casseraient parsers ONNX/HuggingFace) :

- `*.onnx`, `*.wasm`, `*.tar.gz`, `*.ttf`, `*.png`
- `whisper-*/tokenizer*.json`, `vocab.json`, `merges.txt`, configs HuggingFace
- `parakeet/vocab.txt`
- Bundles minifiés sous `assets/js/vendor/` (voir `assets/js/vendor/README.md`)
