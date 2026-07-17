# Tag notes v1.23.0 (RC)

> **Version courante** : `CS.VERSION` **1.23.0** — **release candidate** (pas encore stable).  
> Fichier = journal de **tag git** + checklist smoke. **Pas** une GitHub Release (`gh release create` interdit tant que le porteur n’a pas levé le verrou).

## Résumé

- **Documentation** : route SPA `#documentation` retirée ; footer → documentation technique GitHub (FR/EN selon langue IHM).
- **Import image → description** dans le Workspace : bouton file picker (PNG/JPEG/WebP/GIF), **pas** de glisser-déposer.
- Modèle vision Ollama (`pdm_image_model`, défaut `moondream`) + consigne éditable (`pdm_image_prompt`, défaut cartographie pour reproduire).
- Édition dans **Prompts** (modèle + prompt).
- Contrat : **51** clés `pdm_*` ; profil livré `speech2texte` aligné v1.23.0.
- Miroir public : [`README.md`](../README.md) (EN) · [`README.fr.md`](../README.fr.md) (FR) — Features 1–40.
- Doc technique bilingue : [`docs/Documentation.md`](../docs/Documentation.md) (FR) · [`docs/Documentation.en.md`](../docs/Documentation.en.md) (EN).

## Smoke

- [ ] Bouton Import image visible à côté de l’import audio ; file picker ouvre correctement
- [ ] Extensions refusées → message cause + action (format)
- [ ] Modèle absent → toast avec `ollama pull <modèle>` + renvoi Prompts → Prompts image
- [ ] Ollama down / proxy → toast injoignable + Options → LLM
- [ ] Timeout / réponse vide → toasts dédiés (pas le générique seul)
- [ ] Succès → texte dans Input ; édition possible ensuite
- [ ] Prompts : textarea + sélecteur curated
- [ ] Export / import ZIP 51 clés OK
- [ ] Profil `speech2texte` v1.23.0 charge sans erreur
- [ ] i18n-check-keys OK (12 locales)
- [ ] validate maintainer OK
