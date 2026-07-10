#!/usr/bin/env bash
# PromptDeMerde.com — archive-encoder.sh
# Synopsis : Script de découpage de l'encodeur Parakeet pour GitHub.
# Objectif : Splitter encoder-model.int4.onnx en parts ≤30 Mo sans supprimer l'original.
set -euo pipefail

cd "$(dirname "$0")"

SOURCE="encoder-model.int4.onnx"
MANIFEST="${SOURCE}.manifest"
PART_PREFIX="${SOURCE}.part"
PART_BYTES=$((30 * 1024 * 1024))
SAUVEGARDES=()

sauvegarder() {
    local fichier="$1"
    local cible="${fichier}_sauv"
    if [[ -e "$cible" ]]; then
        cible="${fichier}_sauv_$(date +%Y%m%d-%H%M%S)"
    fi
    mv -- "$fichier" "$cible"
    SAUVEGARDES+=("$cible")
    echo "  → sauvegardé : $cible"
}

if [[ ! -f "$SOURCE" ]]; then
    echo "Erreur : $SOURCE est introuvable dans ce répertoire."
    echo "Place le modèle ici ou récupère les parts via git pull."
    exit 1
fi

echo "Calcul de l'empreinte SHA256 (peut prendre une minute)…"
SIZE=$(stat -c%s -- "$SOURCE")
SHA256=$(sha256sum -- "$SOURCE" | awk '{print $1}')

PARTS_EXISTANTES=()
while IFS= read -r -d '' f; do
    PARTS_EXISTANTES+=("$f")
done < <(find . -maxdepth 1 -type f -name "${PART_PREFIX}[0-9][0-9][0-9]" -print0 | sort -z)

if [[ -f "$MANIFEST" ]] || [[ ${#PARTS_EXISTANTES[@]} -gt 0 ]]; then
    echo "Anciennes archives détectées — renommage en sauvegarde (_sauv) :"
    for f in "${PARTS_EXISTANTES[@]}"; do
        sauvegarder "$(basename "$f")"
    done
    if [[ -f "$MANIFEST" ]]; then
        sauvegarder "$MANIFEST"
    fi
fi

echo "Découpage en parts de 30 Mo…"
split -b "$PART_BYTES" -d -a 3 --numeric-suffixes=1 -- "$SOURCE" "$PART_PREFIX"

PART_COUNT=$(find . -maxdepth 1 -type f -name "${PART_PREFIX}[0-9][0-9][0-9]" | wc -l)
PART_COUNT=${PART_COUNT// /}

cat >"$MANIFEST" <<EOF
FILE=$SOURCE
SIZE=$SIZE
SHA256=$SHA256
PART_BYTES=$PART_BYTES
PART_COUNT=$PART_COUNT
EOF

echo ""
echo "Archivage terminé."
echo "  Fichier source : $SOURCE ($SIZE octets)"
echo "  Empreinte      : $SHA256"
echo "  Parts créées   : $PART_COUNT (préfixe ${PART_PREFIX}NNN)"
echo "  Manifeste      : $MANIFEST"
echo "  Répertoire     : $(pwd)"
if [[ ${#SAUVEGARDES[@]} -gt 0 ]]; then
    echo "  Sauvegardes    : ${#SAUVEGARDES[@]} fichier(s) renommé(s) en *_sauv*"
fi
echo ""
echo "Pour versionner sur GitHub :"
echo "  git add ${PART_PREFIX}* $MANIFEST"
