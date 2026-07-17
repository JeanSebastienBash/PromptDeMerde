# Tag notes v1.22.0 (RC)

> Notes du **tag** **1.22.0** (historique). Version applicative courante : voir [`RELEASE_v1.23.0.md`](RELEASE_v1.23.0.md) (`CS.VERSION` **1.23.0**).  
> Pas une GitHub Release — tags seulement.

## Résumé

- Contrat schéma **49** clés `pdm_*` + export ZIP uniquement
- Checksum SHA-256 (honesty `signed: false`) + import vérifié
- Compress / history / header identity + caches *(Compress = cases au Nettoyer, plus de bouton dédié)*
- Découpe monolithes critiques (selector export, storage, profile-bundle)
- Rattrapage i18n : `settings.export*` / import ZIP + `meta.routes.*` traduits sur les 12 locales ; détecteur `i18n-check-untranslated.js` (copies FR)
- Menu **Marketplace** : sur un clone, l’entrée mène au catalogue officiel [promptdemerde.com](https://promptdemerde.com/#market) (pastille verte au-dessus du libellé)
- Import Workspace 🎵 : audio **ou** vidéo (piste locale via Web Audio) ; précheck Whisper Maxi aligné sur les ONNX `*_q4` / `*_fp16` ; après transcription, dictée à nouveau disponible sans Reset
- Fix import `pdm_workspace_ui.texts` : clés `audioModelMissing` / `audioUnsupportedMedia` whitelistées (alignement i18n)
- Speech-To-Text-Pro : archive recompilée `…-profile-v1.22.0.zip` via générateur (phases 10–12) ; anciennes `v1.20.0` / `---0N` **conservées**
- Générateur / publish : rotation `---0N` — **jamais** détruire une archive livrée
- Session Cursor : tour outillage marketplace + `lib/dev` obligatoire à chaque discussion (alignement auto vs `CS.VERSION`)
- Écran Prompts : hint édition/autosave du prompt système ; gen par intention avec sélecteur modèle, Options (tokens/temp/retries), stream et Arrêter (sans réflexion)
- Toasts (`PDM.UI.notif`) : affichage **4,5 s** (+1,5 s) ; zone et texte plus grands (`--text-ui`, max-width 420px)
- Registre UI produit : toasts / status / erreurs Workspace en **impersonnel** (plus de tutoiement type « Tu as oublié… ») ; règles CONTRIBUTING + Cursor renforcées

Hors scope (ligne **2.1+**) : Free LLM API, refonte bilingue FR+EN copy humaine.

## Après clone

```bash
git clone https://github.com/JeanSebastienBash/promptdemerde.git
cd promptdemerde
cd install && bash restore-large-assets.sh
```

## Smoke

- [ ] Export ZIP minimal + maximal → réimport
- [ ] Menu Marketplace → ouverture du catalogue officiel promptdemerde.com ; pastille verte visible sur le libellé (clone / sans catalogue local)
- [ ] Compress (Ollama up) — cases off par défaut ; au clic Nettoyer avant/après ; preload Output ; pas de bouton Compresser
- [ ] Historique : après Nettoyer, carte avec sections Input / system / contextes / Output ; si cases compress cochées → paires Original + Compressé ; sans compress → Original seul ; copie par bloc ; modal OK
- [ ] Header identity + synopsis + `prefers-reduced-motion`
- [ ] Pas de secret dans le diff
- [ ] Options LLM : changer l’URL Ollama → blur (ou Tester) → sélecteur modèle Workspace à jour ; URL invalide → plus les anciens modèles ; aucun modèle hors liste Ollama (ex. ancien `pdm_model`) ne reste affiché
- [ ] Workspace : panneau **Prompts de contexte** replié par défaut ; clic sur le titre → ouvre les tags ; état mémorisé dans `pdm_workspace.contextPanelOpen`
- [ ] Strip dictée : **Démarrer** charge micro (fenêtre auth si besoin) + moteur auto puis écoute ; refus définitif micro → réinit permission site ; **Stopper** ; Options → **Charger le moteur** (préchargement optionnel) + **Rafraîchir les micros**
- [ ] Dictée en cours → naviguer vers Options / doc : la dictée **continue** (pas de stop silencieux) ; retour Workspace → **Stopper** OK ; texte toujours dans Input
- [ ] Dictée en cours → Options → drapeau langue : **modale** (dictée continue pendant la fenêtre) ; Non → dictée intacte ; Oui → triple bip + stop + reload ; **après reload** → offre Reprendre / Fermer
- [ ] Première visite (sans `pdm_theme` en localStorage) : thème **Marron clair** (`marron-day`) ; reset / export défaut idem
- [ ] Workspace : Reset à droite des en-têtes **Input** et **Output** (même action : saisie + résultat) ; **confirm** obligatoire ; plus de Reset à côté de Nettoyer
- [ ] Logo nav : deux couleurs distinctes sur **tous** les thèmes (ex. Orange clair = Prompt sombre + DeMerde orange) ; `.com` affiché par défaut ; hex profil → override ; `showExtension: false` → masque l’extension
- [ ] Import 🎵 : `.mp3`/`.wav` → transcription dans Input ; `.mp4`/`.webm` si le navigateur décode ; pas de 404 sur `decoder_model_merged.onnx` nu (HEADs `*_q4.onnx` OK) ; **après** transcription → **Démarrer dictée** OK sans Reset
- [ ] Import profil Speech-To-Text-Pro `…-v1.22.0.zip` → OK (plus d’erreur `audioModelMissing` / `audioUnsupportedMedia`)
- [ ] Langue UI ≠ FR : Options → export profil (libellés traduits) ; titres d’onglet `meta.routes` localisés
- [ ] Options → zone danger **Tout effacer** : confirme → session / historique / tokens / profils perso / IndexedDB audio / cache Vosk `pdm-*` partis ; reload avec `pdm_fresh` puis URL propre ; état first-install (profils serveur toujours listés)
- [ ] Prompts : hint sous le titre système (modifiable / autosave) ; gen par intention → modèle + Options (tokens/temp/retries, sync panneau avancé) + stream + Arrêter ; pas de réflexion
- [ ] Toast : message lisible ~4,5 s ; zone et texte nettement plus grands (desktop + 375px)
