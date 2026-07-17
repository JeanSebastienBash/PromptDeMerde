#!/usr/bin/env bash
# PromptDeMerde.com — install/restore-large-assets.sh — reconstitue binaires STT depuis parts
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ ! -d "$ROOT/assets/stt" ]]; then
    echo "[restore] ÉCHEC — lance ce script depuis install/ (dépôt introuvable : $ROOT)."
    exit 1
fi

ASSETS=(
    "assets/stt/parakeet/encoder-model.int4.onnx|df4f1e5ff7a3af4e9d4b7078055164b11005e5d8a4c100e67f583c23975f7a31"
    "assets/stt/whisper-mini/onnx/decoder_model_merged_q4.onnx|462a65ea8459402cded5e6f22a378ac410ec7e0aad9367ebb08431906c237660"
    "assets/stt/whisper-maxi/onnx/decoder_model_merged_q4.onnx|462a65ea8459402cded5e6f22a378ac410ec7e0aad9367ebb08431906c237660"
    "assets/stt/whisper-mini/onnx/decoder_model_merged_q4f16.onnx|dc59a0cad1aa37442390f2b3cf9696868e38a570a23901c4efacde71b6690e98"
    "assets/stt/vosk-mini/model.tar.gz|286f3d1a29a40fed1fc211d0bfb3e87fdee611c980ff85b948691c71feae8dae"
    "assets/stt/vosk-maxi/model.tar.gz|32e62abbef6cabfcf0369f508d0496f02e986d77e638c4f45f09663a50773249"
)

sha256_fichier() {
    sha256sum -- "$1" | awk '{print $1}'
}

restore_one() {
    local rel="$1"
    local expected_sha="$2"
    local target="$ROOT/$rel"
    local dir tmp got_sha
    local -a parts=()

    dir="$(dirname "$target")"
    mkdir -p "$dir"

    if [[ -f "$target" ]] && [[ "$(sha256_fichier "$target")" == "$expected_sha" ]]; then
        echo "[restore] déjà valide — $rel"
        return 0
    fi

    shopt -s nullglob
    parts=("$target".part[0-9][0-9][0-9])
    shopt -u nullglob

    if [[ ${#parts[@]} -eq 0 ]]; then
        if [[ -f "$target" ]]; then
            echo "[restore] ÉCHEC — $rel invalide et aucune part trouvée."
            return 1
        fi
        echo "[restore] absent — ignoré : $rel"
        return 0
    fi

    IFS=$'\n' parts=($(printf '%s\n' "${parts[@]}" | sort))
    unset IFS

    tmp="${target}.tmp"
    rm -f -- "$tmp"
    cat "${parts[@]}" >"$tmp"

    got_sha=$(sha256_fichier "$tmp")
    if [[ "$got_sha" != "$expected_sha" ]]; then
        echo "[restore] ÉCHEC — empreinte incorrecte pour $rel"
        echo "  Attendu : $expected_sha"
        echo "  Obtenu  : $got_sha"
        rm -f -- "$tmp"
        return 1
    fi

    mv -- "$tmp" "$target"
    rm -f -- "${parts[@]}"
    echo "[restore] OK — $rel (${#parts[@]} part(s) supprimée(s))"
}

FAILED=0
for entry in "${ASSETS[@]}"; do
    rel="${entry%%|*}"
    sha="${entry#*|}"
    if ! restore_one "$rel" "$sha"; then
        FAILED=1
    fi
done

VOSK_MANIFEST="$ROOT/install/vosk-assets.manifest"
if [[ -f "$VOSK_MANIFEST" ]]; then
    while IFS='|' read -r rel sha _rest; do
        [[ -z "$rel" || "$rel" =~ ^[[:space:]]*# ]] && continue
        rel="${rel#"${rel%%[![:space:]]*}"}"
        rel="${rel%"${rel##*[![:space:]]}"}"
        sha="${sha#"${sha%%[![:space:]]*}"}"
        sha="${sha%"${sha##*[![:space:]]}"}"
        [[ -z "$rel" || -z "$sha" ]] && continue
        if ! restore_one "$rel" "$sha"; then
            FAILED=1
        fi
    done < "$VOSK_MANIFEST"
fi

if [[ "$FAILED" -ne 0 ]]; then
    echo "[restore] ÉCHEC — au moins un asset n'a pas pu être restauré."
    exit 1
fi

echo "[restore] Terminé."
