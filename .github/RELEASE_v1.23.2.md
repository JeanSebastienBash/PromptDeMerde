# Tag notes v1.23.2 (RC)

> **Version courante** : `CS.VERSION` **1.23.2** — **release candidate** (pas encore stable).  
> Fichier = journal de **tag git** + checklist smoke. **Pas** une GitHub Release (`gh release create` interdit tant que le porteur n’a pas levé le verrou).

## Résumé

- **Workspace UI texts** : les chaînes pack non vides (ex. libellé bouton reformuler) ne sont plus écrasées par `syncWorkspaceUiTextsForLocale` ; i18n re-applique `WorkspaceUi.apply()` après changement de langue.
- **Compression tokens** : les 4 cases (`compressInclude*`) vivent dans `pdm_workspace`, sont hydratées au restore, exportées dans le ZIP complet, remises à `false` en archive propre ; **import** via `_importConfigKeys` (plus de drop des bools).
- **Header hostname** : `applyIdentity` utilise `identity.hostname` ; resync bundlé préserve le chrome session (`preserveSessionChrome`).
- Profil livré `speech2texte` aligné **v1.23.2** ; toujours **51** clés top-level `pdm_*`.

## Smoke

- [ ] Cocher les 4 cases compression → export ZIP **complet** → import → les 4 cases restent cochées
- [ ] Configurer → hostname `mychatbot` → header `@mychatbot:~#` immédiat ; F5 → hostname + header conservés (profil bundlé)
- [ ] Configurer le profil → renommer `submitLabel` → export ZIP → import → bouton conserve le libellé custom
- [ ] Cocher 1–4 cases compression → F5 → cases cochées
- [ ] Archive propre → cases compression à off dans le ZIP ; session navigateur inchangée
- [ ] Changer la langue UI → texts custom non vides conservés
- [ ] Footer app + badge README = **1.23.2-RC**
- [ ] `speech2texte` charge sans erreur ; `i18n-check-keys` + `validate.mjs` OK
