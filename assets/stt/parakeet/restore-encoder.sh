#!/usr/bin/env bash
# Reconstitue encoder-model.int4.onnx à partir des parts archivées.
# Aucun fichier n'est supprimé : les conflits sont renommés en *_sauv*.
set -euo pipefail

cd "$(dirname "$0")"

SOURCE="encoder-model.int4.onnx"
MANIFEST="${SOURCE}.manifest"
PART_PREFIX="${SOURCE}.part"
TMP="${SOURCE}.tmp"

sauvegarder() {
    local fichier="$1"
    local cible="${fichier}_sauv"
    if [[ -e "$cible" ]]; then
        cible="${fichier}_sauv_$(date +%Y%m%d-%H%M%S)"
    fi
    mv -- "$fichier" "$cible"
    echo "  → sauvegardé : $cible"
}

taille_lisible() {
    local octets="$1"
    if command -v numfmt >/dev/null 2>&1; then
        numfmt --to=iec-i --suffix=B "$octets" 2>/dev/null || echo "${octets} octets"
    else
        echo "${octets} octets"
    fi
}

sha256_fichier() {
    sha256sum -- "$1" | awk '{print $1}'
}

if [[ ! -f "$MANIFEST" ]]; then
    echo "Erreur : manifeste introuvable ($MANIFEST)."
    echo "Sur la machine qui possède le modèle complet : bash archive-encoder.sh"
    echo "Sinon, récupère les parts via git pull."
    exit 1
fi

# shellcheck disable=SC1090
source "$MANIFEST"

if [[ -z "${FILE:-}" || -z "${SIZE:-}" || -z "${SHA256:-}" || -z "${PART_COUNT:-}" ]]; then
    echo "Erreur : manifeste incomplet ou illisible ($MANIFEST)."
    exit 1
fi

if [[ "$FILE" != "$SOURCE" ]]; then
    echo "Erreur : ce manifeste concerne $FILE, pas $SOURCE."
    exit 1
fi

MANQUANTES=()
PARTS=()
for ((i = 1; i <= PART_COUNT; i++)); do
    part=$(printf "%s%03d" "$PART_PREFIX" "$i")
    if [[ ! -f "$part" ]]; then
        MANQUANTES+=("$part")
    else
        PARTS+=("$part")
    fi
done

if [[ ${#MANQUANTES[@]} -gt 0 ]]; then
    echo "Erreur : parts manquantes (${#MANQUANTES[@]}/${PART_COUNT}) :"
    for p in "${MANQUANTES[@]}"; do
        echo "  - $p"
    done
    echo "Lance git pull ou bash archive-encoder.sh sur la machine source."
    exit 1
fi

if [[ -f "$SOURCE" ]]; then
    echo "Vérification du fichier existant…"
    ACTUEL_SIZE=$(stat -c%s -- "$SOURCE")
    ACTUEL_SHA=$(sha256_fichier "$SOURCE")
    if [[ "$ACTUEL_SIZE" -eq "$SIZE" && "$ACTUEL_SHA" == "$SHA256" ]]; then
        echo "Le fichier $SOURCE est déjà présent et valide ($(taille_lisible "$SIZE"), empreinte OK)."
        echo "Aucune action nécessaire."
        exit 0
    fi
    echo "Attention : $SOURCE est présent mais invalide (taille ou empreinte incorrecte)."
    echo "  Attendu : $SIZE octets, SHA256=$SHA256"
    echo "  Trouvé  : $ACTUEL_SIZE octets, SHA256=$ACTUEL_SHA"
    echo "Renommage de l'ancien fichier avant reconstruction…"
    sauvegarder "$SOURCE"
fi

if [[ -f "$TMP" ]]; then
    echo "Fichier temporaire existant — renommage avant reconstruction…"
    sauvegarder "$TMP"
fi

echo "Reconstitution depuis ${PART_COUNT} parts…"
cat "${PARTS[@]}" >"$TMP"

TMP_SIZE=$(stat -c%s -- "$TMP")
TMP_SHA=$(sha256_fichier "$TMP")

if [[ "$TMP_SIZE" -ne "$SIZE" || "$TMP_SHA" != "$SHA256" ]]; then
    echo "Erreur : les parts ne reconstituent pas un fichier valide."
    echo "  Attendu : $SIZE octets, SHA256=$SHA256"
    echo "  Obtenu  : $TMP_SIZE octets, SHA256=$TMP_SHA"
    echo "Le fichier temporaire est conservé sous un nom _sauv."
    sauvegarder "$TMP"
    exit 1
fi

mv -- "$TMP" "$SOURCE"
echo "Fichier $SOURCE reconstitué avec succès ($(taille_lisible "$SIZE"), empreinte OK)."
