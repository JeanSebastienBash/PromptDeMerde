# Catalogue Vosk (runtime)

<p align="center">
  <a href="Stt-vosk.en.md"><img src="../assets/images/flags/en.svg" alt="English" width="28" height="20"></a>
  &nbsp;
  <a href="Stt-vosk.md"><img src="../assets/images/flags/fr.svg" alt="Français" width="28" height="20"></a>
</p>

- **`catalog.json`** — manifest runtime (langues, chemins, SHA, `available`, blocs `maxi` optionnels).
- **FR legacy mini** : `../vosk-mini/model.tar.gz` (intouchable).
- **FR legacy maxi** : `../vosk-maxi/model.tar.gz` (intouchable).
- **Autres langues (produit)** : **Vosk Mini uniquement** — `../vosk-mini/{langId}/model.tar.gz` + parts GitHub (`install/vosk-assets.manifest`).

**Politique** : le multilingue produit passe par **Vosk Mini** (langues embarquées dans le catalogue — déjà livré). **Vosk Maxi** reste centré FR (chemin legacy) — pas d’extension Maxi aux autres langues open source. Ne pas régénérer les tarballs FR legacy.

**Périmètre** : le chantier langues STT / Vosk est **clos** pour le produit open source. Pas de refonte de la logique Vosk ; pas d’élargissement majeur du catalogue. Seuls des correctifs mineurs restent envisageables.

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
