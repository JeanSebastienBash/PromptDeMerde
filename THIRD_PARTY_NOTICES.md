# Mentions tierces — PromptDeMerde.com

> Composants tiers embarqués ou téléchargés localement (sans CDN).  
> Ce fichier complète la [LICENSE](LICENSE) (MIT — code PromptDeMerde).

---

## JavaScript (navigateur)

| Composant | Emplacement | Licence | Remarque |
|-----------|-------------|---------|----------|
| **JSZip** | `assets/js/vendor/jszip.min.js` | MIT | Export/import archives profil |
| **ONNX Runtime Web** | `assets/js/vendor/onnxruntime-web/` | MIT | Inférence Whisper / Parakeet |
| **Hugging Face Transformers.js** (bundle) | `assets/js/vendor/transformers/` | Apache-2.0 | Pipeline Whisper worker |
| **Vosk browser** | `assets/js/vendor/vosk/vosk.js` | Apache-2.0 | API WASM Vosk |
| **Parakeet runtime** | `assets/js/vendor/parakeet/parakeet-lib.js` | Voir upstream NVIDIA NeMo / ONNX export | Bundle minifié — ne pas modifier |

Licences complètes upstream : consulter les dépôts respectifs ([ONNX Runtime](https://github.com/microsoft/onnxruntime), [Transformers.js](https://github.com/huggingface/transformers.js), [Vosk](https://github.com/alphacep/vosk-api), [JSZip](https://github.com/Stuk/jszip)).

---

## Modèles Speech-to-Text (`assets/stt/`)

| Moteur | Fichiers | Origine / licence (résumé) |
|--------|----------|----------------------------|
| **Vosk** | `vosk-*/model.tar.gz` | Modèles [alphacep/vosk-models](https://alphacephei.com/vosk/models) — Apache-2.0 |
| **Whisper** (ONNX) | `whisper-*/onnx/*.onnx`, tokenizer HF | Dérivés OpenAI Whisper ; configs Hugging Face — voir `config.json` / upstream |
| **Parakeet** | `parakeet/*.onnx`, `vocab.txt` | NVIDIA NeMo Parakeet TDT — usage local ; respecter [les conditions de licence NVIDIA](https://www.nvidia.com/en-us/agreements/enterprise-software/nvidia-software-license-agreement/) |

Les binaires > 40 Mo sont versionnés en **parts** (`*.partNNN`) ; restauration après clone :

```bash
cd install
bash restore-large-assets.sh
```

---

## Polices web

Chargées localement sous `assets/fonts/` (pas de CDN) — déclarations `@font-face` dans `assets/css/style-base.css`.

| Police | Emplacement | Usage | Licence |
|--------|-------------|-------|---------|
| **Fira Code** | `assets/fonts/firacode/` | Corps / code (`--font-body`) | SIL Open Font License 1.1 |
| **Inconsolata** | `assets/fonts/inconsolata/` | Chrome UI (`--font-ui`) | SIL Open Font License 1.1 |
| **Space Grotesk** | `assets/fonts/spacegrotesk/` | Titres APP / display (`--font-app-heading`, `--font-display`) | SIL Open Font License 1.1 |
| **Archivo Black** | `assets/fonts/archivoblack/` | Hero / logo marketing (`--font-hero`) | SIL Open Font License 1.1 |
| **Anton** | `assets/fonts/anton/` | Fallback condensée de `--font-hero` | SIL Open Font License 1.1 |

---

## Ollama

PromptDeMerde **ne redistribue pas** Ollama ni les poids LLM. L’utilisateur installe [Ollama](https://ollama.ai/) séparément et choisit ses modèles.

---

## Signaler une omission

Si une attribution manque, écrivez à **dreamproject-ai@proton.me** en indiquant le chemin du fichier et la licence upstream supposée. DreamProjectAI ne suit pas les issues GitHub comme canal de triage.
