#!/usr/bin/env bash
# PromptDeMerde.com — install/split-large-assets.sh — découpe binaires STT en parts ≤ 30 Mo
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ ! -d "$ROOT/assets/stt" ]]; then
    echo "[split] ÉCHEC — lance ce script depuis install/ (dépôt introuvable : $ROOT)."
    exit 1
fi
PART_MAX=$((30 * 1024 * 1024))

ASSETS=(
    assets/stt/parakeet/encoder-model.int4.onnx
    assets/stt/whisper-mini/onnx/decoder_model_merged_q4.onnx
    assets/stt/whisper-maxi/onnx/decoder_model_merged_q4.onnx
    assets/stt/whisper-mini/onnx/decoder_model_merged_q4f16.onnx
    assets/stt/vosk-mini/model.tar.gz
    assets/stt/vosk-maxi/model.tar.gz
    assets/stt/vosk-maxi/en-us/model.tar.gz
)

split_one() {
    local rel="$1"
    local target="$ROOT/$rel"

    if [[ ! -f "$target" ]]; then
        echo "[split] absent — ignoré : $rel"
        return 0
    fi

    echo "[split] $rel…"
    rm -f -- "${target}.part"[0-9][0-9][0-9]
    split -b "$PART_MAX" --numeric-suffixes=1 --suffix-length=3 "$target" "${target}.part"
    local -a created=()
    shopt -s nullglob
    created=("$target".part[0-9][0-9][0-9])
    shopt -u nullglob
    echo "[split] ${#created[@]} part(s)"
    sha256sum -- "$target"
}

FOUND=0
for rel in "${ASSETS[@]}"; do
    if [[ -f "$ROOT/$rel" ]]; then
        FOUND=1
        split_one "$rel"
    else
        echo "[split] absent — ignoré : $rel"
    fi
done

if [[ "$FOUND" -eq 0 ]]; then
    echo "[split] ÉCHEC — aucun binaire source trouvé."
    exit 1
fi

echo "[split] Terminé."
