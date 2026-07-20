# Tag notes v1.23.1 (RC)

> **Version courante** : `CS.VERSION` **1.23.1** — **release candidate** (pas encore stable).  
> Fichier = journal de **tag git** + checklist smoke. **Pas** une GitHub Release (`gh release create` interdit tant que le porteur n’a pas levé le verrou).

## Résumé

- **README** : table des matières hiérarchique (§5.1–5.7), blurbs features validés, captures / GIF par capacité (`assets/images/screenshots/readme-s*`).
- **Documentation technique** : [`docs/Documentation.md`](../docs/Documentation.md) + zones (Stt, Profiles, Vendor…) restructurées et alignées sur la carte features du README.
- **Copy produit** : libellé « dictée vocale » / *voice dictation* cohérent (12 locales + fallbacks schéma `DEFAULT_WORKSPACE_UI`).
- Contrat inchangé : **51** clés `pdm_*` ; profil livré `speech2texte` reste aligné v1.23.0 (pas de recompile).

## Smoke

- [ ] README : TOC §5.x.y, ancres `#feat-*`, captures visibles (GitHub + preview GFM)
- [ ] `docs/Documentation.md` : liens internes et badge version 1.23.1
- [ ] Footer app + badge README = **1.23.1-RC**
- [ ] Toasts dictée vocale (12 locales) — registre impersonnel
- [ ] Export / import ZIP 51 clés OK
- [ ] Profil `speech2texte` v1.23.0 charge sans erreur
- [ ] i18n-check-keys OK (12 locales)
- [ ] validate maintainer OK
