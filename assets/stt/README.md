# Modèles STT (Speech-to-Text)

Un répertoire par moteur, nommé comme l’`engine_id` du sélecteur (`stt.js` / `storage.js`).

| Répertoire | Moteur affiché | Contenu |
|---|---|---|
| `vosk-mini/` | Vosk Mini | `model.tar.gz` |
| `vosk-maxi/` | Vosk Maxi | `model.tar.gz` |
| `whisper-mini/` | Whisper Mini | tokenizer + ONNX q4 / q4f16 |
| `whisper-maxi/` | Whisper Maxi | tokenizer + ONNX hybride fp16+q4 / q4 |
| `parakeet/` | Parakeet | encodeur int4, décodeur int8, `vocab.txt` |

Parakeet : si l’encodeur manque après un clone Git, `bash assets/stt/parakeet/restore-encoder.sh`.
