# PromptDeMerde

<p align="center">
  <a href="README.md"><img src="assets/images/flags/en.svg" alt="English" width="28" height="20"></a>
  &nbsp;
  <a href="README.fr.md"><img src="assets/images/flags/fr.svg" alt="Français" width="28" height="20"></a>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Licence : MIT"></a>
  <a href="https://github.com/JeanSebastienBash/promptdemerde/tags"><img src="https://img.shields.io/badge/version-1.23.0--RC-blue.svg" alt="Version 1.23.0 RC"></a>
  <a href="https://github.com/JeanSebastienBash/promptdemerde/actions/workflows/ci.yml"><img src="https://github.com/JeanSebastienBash/promptdemerde/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
</p>

<p align="center">
  <strong>Application navigateur qui reformule un brouillon en prompt clair via un modèle Ollama local.</strong>
</p>

<p align="justify">
<strong>PromptDeMerde</strong> est une application web (SPA) qui tourne dans le navigateur. Vous saisissez ou dictez un brouillon ; l’application le reformule en une consigne structurée grâce à <a href="https://ollama.com">Ollama</a>, installé sur votre machine. Le résultat apparaît dans le panneau Output : vous pouvez le copier vers ChatGPT, Claude, Midjourney, un autre modèle Ollama, ou l’outil de votre choix. Le site <a href="https://promptdemerde.com/">promptdemerde.com</a> sert le même code source qu’un clone auto-hébergé de ce dépôt. L’application est gratuite, open source (<a href="LICENSE">MIT</a>) et ne demande aucun compte.
</p>

<p align="center">
  <a href="https://promptdemerde.com/">Site officiel</a> ·
  <a href="docs/Documentation.md">Documentation avancée</a> ·
  <a href="SECURITY.fr.md">Sécurité</a> ·
  <a href="CONTRIBUTING.fr.md">Contribuer</a> ·
  <a href="README.md">English</a>
</p>

---

## 🎬 Vidéo (bientôt)

<p align="center">
  <img src="assets/images/screenshots/nav-app-full-nofooter.png" alt="Workspace PromptDeMerde : brouillon Input sur les chats, Output vide, historique LLM à 2 entrées, navigation Workspace active" width="70%" style="border:1px solid #d0d7de;border-radius:8px;box-shadow:0 1px 2px rgba(0,0,0,.08);">
  <br>
  <strong>Vue Workspace — brouillon Input, Output vide, 2 entrées d’historique</strong><br>
  <em>Vue Workspace complète (sans footer de page) : navigation sur Workspace, Input avec brouillon sur les chats pour un blog, Output encore vide avec placeholder, Historique LLM à 2 entrées.</em>
</p>

<!-- Vidéo démo paysage — URL à ajouter plus tard (YouTube / MP4 hébergé). -->

> **Vidéo démo paysage — emplacement réservé au format 16:9.**

---

<a id="menu-nouveautes"></a>

## 🆕 Nouveautés

### Version 1.23.0 (RC)

*Release candidate — pas encore stable.*

* **Import d’image vers description** dans le Workspace. Un sélecteur de fichier (PNG, JPEG, WebP, GIF) envoie l’image à un modèle vision Ollama local (par défaut `moondream`). La description obtenue est écrite dans Input.
* Le modèle vision et la consigne associée sont éditables sur l’écran **Prompts** (`pdm_image_model`, `pdm_image_prompt`).
* Le contrat de profil comporte désormais **51** clés `pdm_*`. Le profil livré `speech2texte` est aligné sur la version 1.23.0.
* Miroir GitHub public : **tags git uniquement** — pas de GitHub Releases ; aucune ligne stable déclarée pour l’instant.

[Documentation avancée — import image](docs/Documentation.md#6bis-import-image--description) · [Notes de tag](.github/RELEASE_v1.23.0.md)

### Version 1.22.x

* L’import accepte un fichier audio **ou** vidéo pour une retranscription locale. Après Whisper, la dictée reste disponible sans Reset.
* La **compression** de tokens passe par des cases optionnelles, appliquées au moment du **Nettoyer** (il n’y a plus de bouton Compresser séparé).
* Les cartes d’historique affichent les traces Original / Compressé pour Input, le prompt système, les prompts de contexte et Output.
* Les générateurs de prompts de contexte par **intention** proposent un sélecteur de modèle, le stream et Arrêter.
* Sur un clone sans catalogue local, le menu **Marketplace** ouvre [promptdemerde.com/#market](https://promptdemerde.com/#market).
* Les toasts et messages de statut du produit suivent un registre impersonnel, traduit dans les douze locales.

[Notes de tag v1.22.0](.github/RELEASE_v1.22.0.md)

---

## Menu

* [Nouveautés](#menu-nouveautes)
* [Ce qu’est PromptDeMerde](#menu-cest-quoi)
* [Pour qui](#menu-pour-qui)
* [Site officiel = copie auto-hébergée](#menu-site-officiel)
* [Zéro télémétrie](#menu-zero-telemetrie)
* [Fonctionnalités](#menu-fonctionnalites)
  * [1–18 — capacités principales](#1-nettoyer-reformuler-avec-ollama)
  * [19–40 — coque, UX, Options, Market, footer](#19-navigation-spa-par-hash)
* [Profil JSON](#menu-profil-json)
* [Prérequis](#menu-prerequis)
* [Essayer en trois étapes](#menu-essayer)
* [Auto-hébergement](#menu-auto-hebergement)
* [Crédits](#menu-credits)
* [Licence](#menu-licence)

---

<a id="menu-cest-quoi"></a>

## ✨ Ce qu’est PromptDeMerde

PromptDeMerde reformule un **brouillon** en **prompt**. Ce brouillon peut être saisi au clavier, dicté au micro, retranscrit depuis un fichier audio ou vidéo, ou obtenu par description d’une image. La reformulation s’appuie sur :

* un **prompt système** optionnel ;
* des **prompts de contexte (`#Tag`)** optionnels, activés dans le Workspace ;
* un modèle servi par **Ollama** sur la machine de l’utilisateur.

Les données de session (brouillon, historique, réglages, profils) sont stockées dans le **navigateur** (`localStorage` ; IndexedDB pour l’audio de dictée). L’usage se fait sans inscription. Les brouillons de l’utilisateur restent hors de toute base applicative serveur.

[Documentation avancée — présentation](docs/Documentation.md#1-présentation) · [Modèle de confidentialité](docs/Documentation.md#2-modèle-de-confidentialité)

---

<a id="menu-pour-qui"></a>

## 👥 Pour qui

* **Solo / auto-entrepreneur.** Un profil JSON peut être réutilisé pour un travail de prompt récurrent (mails, posts, briefs, prompts image, et autres usages du même ordre).
* **Power user.** Ollama local, prompt système et prompts de contexte éditables, dictée dans le navigateur, modèle vision, compression de tokens, Input en multi-passes.
* **Petite équipe.** Le même ZIP de profil JSON peut être partagé afin que chacun applique les mêmes règles de nettoyage (configuration partagée via fichier).
* **Utilisateur du site officiel ou d’une install privée.** Le code applicatif et le modèle de données côté client sont les mêmes (voir la section confidentialité ci-dessous).

---

<a id="menu-site-officiel"></a>

## 🏠 Site officiel = copie auto-hébergée

[promptdemerde.com](https://promptdemerde.com/) et un clone de ce dépôt exécutent la **même application** : même SPA, même Workspace, même format de profil ZIP.

Tant que le site officiel est en ligne, DreamProjectAI autorise son usage dans les mêmes conditions qu’une installation privée pour le comportement applicatif. Pour auto-héberger : cloner le dépôt, exécuter `install/restore-large-assets.sh`, servir le dossier avec Apache ou Nginx et PHP, puis ouvrir votre URL.

Dans les deux cas, le contenu du Workspace et les profils restent dans le navigateur.

---

<a id="menu-zero-telemetrie"></a>

## 🛡️ Zéro télémétrie

> Les prompts, l’historique, les médias importés, les retranscriptions et les données de profil sont traités et stockés dans le **navigateur**. L’application ne collecte **aucune télémétrie produit**. Il n’existe **pas** de base applicative du contenu utilisateur sur le serveur officiel.

Les journaux d’accès du serveur web peuvent enregistrer l’**adresse IP** et l’**URL de page** (journalisation HTTP standard). Ces journaux ne contiennent pas le texte du Workspace, les fichiers uploadés ni les résultats de transcription.

Le modèle côté client est le même sur le site officiel et sur une copie auto-hébergée.  
[`SECURITY.md`](SECURITY.fr.md) · [Documentation avancée — confidentialité](docs/Documentation.md#2-modèle-de-confidentialité)

---

<a id="menu-fonctionnalites"></a>

## 🚀 Fonctionnalités

Chaque sous-section décrit une capacité livrée et renvoie vers la section correspondante de la documentation avancée. Les captures d’écran se trouvent sous `assets/images/screenshots/`.

---

### 1. Nettoyer / reformuler avec Ollama

L’action **Nettoyer** envoie le contenu de Input à un modèle Ollama local, avec le prompt système actif et les prompts de contexte (`#Tag`) cochés. Le panneau Output reçoit le prompt reformulé, prêt à être copié.

Le modèle utilisé est celui configuré dans l’application (téléchargé au préalable avec `ollama pull`). Les erreurs de connexion remontent dans l’interface, avec un renvoi vers Options → LLM.

[Documentation avancée — Workspace](docs/Documentation.md#32-workspace) · [Flux Ollama](docs/Documentation.md#4-ollama--flux-a-et-flux-b)

---

### 2. Workspace Input → Output

Le Workspace est organisé ainsi :

* **Input** contient le brouillon (saisie, dictée, import de média, description d’image).
* **Output** contient le prompt nettoyé.
* Les actions principales sont Nettoyer, copier et Reset (ce dernier demande une confirmation).

<p align="center">
  <img src="assets/images/screenshots/ws-input-panel.gif" alt="Panneau Input du Workspace avec brouillon, bandeau Dictée vocale, Reset et deux prompts de contexte actifs" width="70%" style="border:1px solid #d0d7de;border-radius:8px;box-shadow:0 1px 2px rgba(0,0,0,.08);">
  <br>
  <strong>Workspace — panneau Input</strong><br>
  <em>Le brouillon est visible dans Input, avec le bandeau Dictée vocale et le bouton Reset en haut. En dessous, Prompts de contexte indique 2 actifs.</em>
</p>


[Documentation avancée — Workspace](docs/Documentation.md#32-workspace)

---

### 3. Prompt système et prompts de contexte (#Tag)

Le **prompt système** définit la personnalité du passage de nettoyage. Il peut être activé ou désactivé. S’il est vide, l’application utilise le défaut intégré.

Les **prompts de contexte (`#Tag`)** sont des blocs empilables. Vous les activez ou les désactivez pour chaque Nettoyer. L’ordre d’injection — **avant** ou **après** le prompt système — est configurable.

[Documentation avancée — prompts, système, prompts de contexte](docs/Documentation.md#5-prompts--système-prompts-de-contexte-générateurs)

---

### 4. Générateurs de prompts de contexte assistés par IA

Sur l’écran **Prompts**, les générateurs de prompts de contexte créent un nouveau `#Tag` à partir d’une **intention** ou d’un **titre**, via le modèle Ollama local. Sur cet écran, vous disposez du stream, du bouton Arrêter, du sélecteur de modèle et des options de base.

[Documentation avancée — génération assistée de `#Tag`](docs/Documentation.md#52-génération-assistée-de-tag)

<p align="center">
  <img src="assets/images/screenshots/prm-context-list-short.gif" alt="Écran Prompts : générateur de prompt de contexte par intention, avec sélecteur de modèle, Options et Générer le meilleur contexte" width="50%" style="border:1px solid #d0d7de;border-radius:8px;box-shadow:0 1px 2px rgba(0,0,0,.08);">
  <br>
  <strong>Générateur de prompt de contexte (#Tag) par intention</strong><br>
  <em>Sur Prompts, décrire une intention, choisir un modèle Ollama local, puis générer un nouveau prompt de contexte (#Tag).</em>
</p>


---

### 5. Dictée vocale illimitée avec Vosk, Parakeet ou Whisper

Le bandeau de dictée du Workspace permet une dictée vocale illimitée. Les moteurs disponibles sont **Vosk**, **Parakeet** et **Whisper**, selon celui que vous chargez. La reconnaissance tourne dans le navigateur : l’audio du micro reste sur l’appareil.

Côté langues, la dictée s’appuie sur **Vosk Mini** (plusieurs modèles embarqués) et **Vosk Maxi** pour le français. Ce périmètre est considéré comme livré : pas d’extension majeure de langues ni de refonte des moteurs Vosk prévue d’ici la maturité produit ; seuls des ajustements mineurs restent possibles.

La dictée continue lorsque vous ouvrez Options ou la documentation. L’arrêt se fait par un contrôle explicite.

<p align="center">
  <img src="assets/images/screenshots/ws-stt-engine.gif" alt="Options de dictée Workspace : moteur Vosk Maxi, langue français, micro par défaut, insertion en fin et suppression du dernier mot" width="70%" style="border:1px solid #d0d7de;border-radius:8px;box-shadow:0 1px 2px rgba(0,0,0,.08);">
  <br>
  <strong>Options moteur STT — Vosk Maxi</strong><br>
  <em>Panneau moteur de dictée : Vosk Maxi, français, micro par défaut, insertion en fin et raccourci de suppression du dernier mot.</em>
</p>

[Documentation avancée — dictée et audio](docs/Documentation.md#6-dictée-vocale-et-audio)

---

### 6. Import audio ou vidéo (retranscription audio)

L’import 🎵 accepte des fichiers audio et, lorsque le navigateur peut les décoder, des conteneurs vidéo. La retranscription audio passe par le chemin Whisper Maxi local ; le texte obtenu est écrit dans Input. Après cette opération, la dictée reste disponible sans Reset complet.

Le média est traité sur la machine qui a ouvert la page.

[Documentation avancée — dictée et audio](docs/Documentation.md#6-dictée-vocale-et-audio)

---

### 7. Export audio global de session

Vous pouvez télécharger un seul fichier audio qui fusionne les prises de dictée de la session courante. La fusion et le téléchargement s’effectuent dans le navigateur.

[Documentation avancée — enregistrement WebM](docs/Documentation.md#64-enregistrement-webm)

---

### 8. Décrire une image (Ollama vision)

Le sélecteur de fichier du Workspace envoie une image à un modèle Ollama capable de vision. La description texte est écrite dans Input. Le modèle et la consigne se règlent sur l’écran Prompts. Si le modèle est absent, un toast indique `ollama pull <modèle>` et renvoie vers Prompts → image.

[Documentation avancée — image → description](docs/Documentation.md#6bis-import-image--description)

---

### 9. Historique local avec traces

L’historique local des Nettoyer est plafonné. Chaque carte expose Input, le prompt système, les prompts de contexte et Output. Lorsque la compression est active, les paires Original / Compressé sont affichées. Vous pouvez copier un bloc, restaurer un Input ou purger l’historique. Cet historique peut être inclus dans un export de profil complet, selon le preset choisi.

<p align="center">
  <img src="assets/images/screenshots/ws-history-open.gif" alt="Panneau Historique du Workspace ouvert avec cartes des passages Nettoyer LLM exposant Input et Output" width="70%" style="border:1px solid #d0d7de;border-radius:8px;box-shadow:0 1px 2px rgba(0,0,0,.08);">
  <br>
  <strong>Historique local avec traces Input et Output</strong><br>
  <em>Historique LLM ouvert : cartes empilées avec aperçus IN/OUT, horodatage, modèle (ollama · llama3.2) et blocs de zones des passages Nettoyer.</em>
</p>

[Documentation avancée — Workspace](docs/Documentation.md#32-workspace)

---

### 10. Compression de tokens optionnelle

Des cases permettent de compresser le prompt système, les prompts de contexte, Input et Output. Elles s’appliquent au moment du **Nettoyer**. Par défaut, toutes les cases sont décochées.

[Documentation avancée — compresser les tokens](docs/Documentation.md#323-compresser-les-tokens)

---

### 11. Input long, multi-passes

Un Input très long est découpé en passes Ollama successives ; les résultats sont ensuite concaténés. Les limites et le comportement détaillé sont décrits dans la documentation avancée.

[Documentation avancée — INPUT long multipass](docs/Documentation.md#321-input-long-multi-pass-inférence)

---

### 12. Options LLM du Workspace

Le panneau LLM du Workspace permet d’ajuster le modèle, la température, le max tokens, le timeout et la réflexion (thinking) lorsque le modèle la prend en charge. L’URL Ollama et le test de connexion se trouvent sous Options → LLM. Pour le chemin public, laissez **« Je n’ai pas de token »** coché et utilisez Ollama en local.

[Documentation avancée — paramètres LLM](docs/Documentation.md#43-paramètres-llm-workspace-panel)

---

### 13. Formats d’affichage Output

Le contenu d’Output peut être affiché en texte brut, en JSON ou en HTML.

[Documentation avancée — format d’affichage OUTPUT](docs/Documentation.md#322-format-daffichage-output)

---

### 14. Import / export de profil JSON (ZIP)

L’unité portable de PromptDeMerde est une archive **ZIP** qui contient le profil JSON (et les assets associés le cas échéant). L’import n’accepte que le format **`.zip`**. Le traitement reste côté client ; un contrôle d’intégrité s’exécute à l’import. Les tokens proxy sont exclus du profil portable.

<p align="center">
  <img src="assets/images/screenshots/stg-profile-json.gif" alt="Panneau Options Profil JSON avec Speech2Texte sélectionné et boutons Créer, Importer, Exporter" width="70%" style="border:1px solid #d0d7de;border-radius:8px;box-shadow:0 1px 2px rgba(0,0,0,.08);">
  <br>
  <strong>Profil JSON — créer, importer, exporter</strong><br>
  <em>Options → Profil JSON : basculer de profil, importer un ZIP ou exporter l’archive portable.</em>
</p>

[Documentation avancée — export / import ZIP](docs/Documentation.md#7-export--import--archive-zip-profil)

---

### 15. Personnalisation de l’interface

Un profil peut inclure les couleurs du logo, les titres d’écrans, les libellés de boutons, le thème, ainsi que l’animation ou le synopsis d’en-tête. Ces clés sont documentées dans la section de personnalisation ZIP.

[Documentation avancée — clés UI et brand](docs/Documentation.md#75-personnalisation-par-édition-zip)

---

### 16. Douze langues d’interface & environ 50 thèmes

L’interface est disponible en douze locales. Les thèmes couvrent des familles clair et sombre. À la première visite, le thème par défaut est **Marron clair** (`marron-day`). La langue et le thème peuvent être exportés avec le profil.

[Documentation avancée — i18n](docs/Documentation.md#35-i18n)

---

### 17. Le même code partout

Le site officiel et une installation auto-hébergée partagent le même code applicatif. Le token proxy opérateur concerne uniquement le relai de production officiel. Les visiteurs qui utilisent Ollama en local laissent **« Je n’ai pas de token »** coché.

[Documentation avancée — installation](docs/Documentation.md#10-installation-auto-hébergée) · [`SECURITY.md`](SECURITY.fr.md)

---

### 18. Marketplace de profils JSON

Une marketplace de profils JSON prêts à importer est disponible sur le [site officiel](https://promptdemerde.com/#market) (bientôt).

Sur un clone public sans catalogue local, le menu Marketplace ouvre cette URL.

---

### 19. Navigation SPA par hash

L’interface bascule entre Workspace, Prompts, Options et Marketplace via le hash d’URL, sans rechargement complet. Sur un clone sans `site-pages/`, Mentions / CGU / Confidentialité / Support du footer ouvrent [promptdemerde.com](https://promptdemerde.com) (pastille verte, comme Marketplace). Le lien Documentation ouvre la doc technique GitHub (FR ou EN selon la langue IHM).

---

### 20. Menu burger, Escape et loader

Sur mobile et en viewport réduit, le menu burger ouvre et ferme la navigation. La touche Escape ferme le menu. Au démarrage, un loader plein écran s’affiche pendant l’initialisation.

---

### 21. Badge d’environnement et version GitHub

Le pied de page affiche un badge d’environnement (PROD, PRÉ-PROD ou AUTO-HÉBERGÉ) selon `PDM_ENV`. Le numéro de version renvoie vers le dépôt GitHub du projet (versionnement par **tags git** uniquement — pas de GitHub Releases).

---

### 22. Raccourci Ctrl/Cmd+Enter, toasts et feedback Copié

Le raccourci **Ctrl+Enter** (ou **Cmd+Enter** sur macOS) lance **Nettoyer**. Les notifications toast restent visibles environ 4,5 secondes. Les boutons de copie affichent un retour « Copié » après succès.

---

### 23. Accessibilité motion et RTL

L’application honore `prefers-reduced-motion` pour limiter les animations. Les locales à écriture de droite à gauche (par exemple l’arabe) basculent `lang` et `dir` sur le document.

---

### 24. Logo, animation shell et synopsis de profil

Le logo de navigation, l’animation de shell dans l’en-tête et le synopsis typewriter peuvent être portés par le profil (marque, couleurs, texte).

---

### 25. Toggle thème jour / nuit

Un bouton dans la barre de navigation bascule rapidement entre le mode clair et le mode sombre de la famille de thème active.

---

### 26. Compteur Input, Reset confirmé et corbeille

La zone Input affiche un compteur de caractères (plafond d’export 50 000). **Reset** demande une confirmation et efface Input et Output. Une corbeille permet de vider Input sans toucher Output. Ces actions restent bloquées pendant une dictée ou une inférence en cours.

---

### 27. Autosave du brouillon et garde de prompts

Le brouillon Workspace (Input, Output, réflexion, état du panneau de contextes) est sauvegardé automatiquement dans le navigateur. **Nettoyer** reste désactivé tant qu’aucun prompt système ni aucun prompt de contexte n’est actif ; une alerte guide l’activation.

---

### 28. Options avancées de dictée

Le bandeau de dictée propose un panneau d’options : préchargement du moteur, langue Vosk, accélération CPU ou GPU, choix du micro, insertion en fin de texte ou au curseur, et raccourci pour effacer un mot. Une barre de progression suit le chargement du modèle. Des hints rappellent les contraintes HTTPS / réseau local.

---

### 29. Dictée hors Workspace et reprise après interruption

La dictée peut continuer pendant la navigation vers Options ou la documentation. Avant un rechargement disruptif (changement de langue, wipe, import de profil), une modale propose de confirmer ; un signal sonore et une offre de reprise sont disponibles après reload.

---

### 30. Exclusion mutuelle des modes Input

Dictée, import audio/vidéo, import image et inférence se verrouillent mutuellement. Des status inline et des toasts indiquent la cause et l’action lorsque deux modes s’opposent.

---

### 31. Compression : panneau, overlay et Arrêter

La compression de tokens se configure dans un panneau repliable. Pendant la compression de Output, un overlay verrouille la zone et propose **Arrêter**. Des pastilles indiquent les cibles déjà compressées dans la session.

---

### 32. Panneau des prompts de contexte dans le Workspace

Le panneau des prompts de contexte est replié par défaut ; l’état ouvert/fermé est mémorisé. Un badge affiche le nombre de tags actifs. Les boutons **Tout** et **Aucun** gèrent la sélection en masse. Un lien **Gérer** ouvre l’écran Prompts.

---

### 33. Réflexion (thinking), Arrêter et métadonnées de stream

Lorsque le modèle le permet, la réflexion peut être activée avec un plafond de caractères (0 = illimité). Un panneau dédié affiche et copie la réflexion. **Arrêter** interrompt l’inférence ou la compression. Pendant le stream, l’interface affiche le temps, les tokens, le débit et le numéro de passe multi-pass.

---

### 34. Historique : restauration, modal et export JSON

L’historique local (environ 100 entrées) permet de restaurer Input, Output et la réflexion. Chaque entrée peut être ouverte en modal, copiée par bloc, exportée en JSON, ou liée à l’audio source en IndexedDB. La purge globale et la suppression d’une entrée demandent une confirmation.

---

### 35. Écran Prompts : ordre, DnD et compteur

Sur l’écran Prompts, le prompt système s’active ou se désactive avec autosave. L’ordre d’injection des prompts de contexte (avant ou après le système) s’accompagne d’un diagramme. La liste des tags se réordonne par glisser-déposer ou flèches. Un compteur indique le nombre de prompts de contexte.

---

### 36. Options LLM : Tester, token et thèmes

Sous Options → LLM, le bouton **Tester** vérifie l’URL Ollama et rafraîchit la liste des modèles. Le token proxy, s’il est utilisé, reste en session navigateur. Le sélecteur de thèmes propose vingt-cinq familles en clair et sombre.

---

### 37. Profils : créer, basculer, export modal

Options → Profil JSON permet de créer un profil, de basculer (avec confirmation et rechargement), d’importer un ZIP et d’exporter via une modale (nom de fichier, preset minimal ou maximal, langue de démarrage, drapeaux i18n inclus).

---

### 38. Zone danger Tout effacer

La zone danger **Tout effacer** demande une confirmation, puis purge localStorage, sessionStorage, IndexedDB audio et caches STT, avant un rechargement en état d’installation fraîche.

---

### 39. Marketplace : recherche, filtres et fiche

Lorsque le catalogue local est présent, la Marketplace offre recherche, filtres (prix, domaines, langues, éditeurs), tri, vues grille ou liste, et une modale de fiche avec téléchargement. Sur un clone sans catalogue, le menu ouvre le site officiel.

---

### 40. Pied de page : carrousel et ressources

Le pied de page regroupe un carrousel de projets DreamProjectAI, des badges de stack (LLM, Ollama, STT, JSON, OSS, etc.) et des liens vers la documentation, le support et les ressources externes.

---

<a id="menu-profil-json"></a>

## 💾 Profil JSON

<p align="center">
  <img src="assets/images/screenshots/stg-profile-json.gif" alt="Panneau Options Profil JSON avec Speech2Texte sélectionné et boutons Créer, Importer, Exporter" width="70%" style="border:1px solid #d0d7de;border-radius:8px;box-shadow:0 1px 2px rgba(0,0,0,.08);">
  <br>
  <strong>Profil JSON — créer, importer, exporter</strong><br>
  <em>Options → Profil JSON : basculer de profil, importer un ZIP ou exporter l’archive portable.</em>
</p>

Le profil JSON, exporté sous forme de ZIP, peut contenir le prompt système, les prompts de contexte (`#Tag`), les réglages LLM, le thème, la langue, le brouillon du Workspace, l’historique et les libellés d’interface.

**Avant de vider les données du site ou de changer de machine**, exportez le profil (*Options → Profil JSON → Exporter*). Pour l’import : *Options → Profil JSON → Importer* (fichier `.zip` uniquement).

[Documentation avancée — ZIP](docs/Documentation.md#7-export--import--archive-zip-profil)

---

<a id="menu-prerequis"></a>

## 📦 Prérequis

<p align="center">
  <img src="assets/images/screenshots/stg-test-llm.gif" alt="Carte Options LLM : fournisseur Ollama, URL localhost et bouton Tester" width="70%" style="border:1px solid #d0d7de;border-radius:8px;box-shadow:0 1px 2px rgba(0,0,0,.08);">
  <br>
  <strong>Options → LLM — tester la connexion Ollama</strong><br>
  <em>Avant Nettoyer / reformuler, renseigner le moteur sous Options → LLM (Ollama + URL) et utiliser Tester pour vérifier la connexion locale.</em>
</p>

### Site officiel

* Un navigateur desktop moderne (Chromium ou Firefox sont recommandés pour le STT et WebAudio).
* [Ollama](https://ollama.com/download) installé sur le **même ordinateur** que le navigateur.
* Au moins un modèle de chat téléchargé (exemple : `ollama pull llama3.2`).
* Pour la description d’image : un modèle vision (par défaut dans l’application : `moondream`).
* La permission micro si vous utilisez la dictée.
* Un accès réseau pour charger le site ; dans le setup visiteur habituel, Ollama écoute en `localhost`.

Pour **https://promptdemerde.com**, autorisez l’origine dans Ollama :

```bash
OLLAMA_ORIGINS=https://promptdemerde.com ollama serve
```

[Documentation avancée — Ollama](docs/Documentation.md#4-ollama--flux-a-et-flux-b)

### Auto-hébergement

* Un hôte capable de servir du PHP (Apache ou Nginx avec PHP).
* Git, pour cloner ce dépôt.
* De l’espace disque pour les parts de modèles STT ; après le clone :

```bash
cd install
bash restore-large-assets.sh
```

* Ollama joignable depuis le navigateur.
* En option : `PDM_ENV` pour le badge du footer ; le token proxy uniquement pour les opérateurs du relai officiel — voir [`SECURITY.md`](SECURITY.fr.md).

La qualité du Nettoyer dépend du modèle Ollama choisi. La dictée et la retranscription s’appuient sur ONNX / WASM dans le navigateur ; un GPU dédié reste optionnel.

[Documentation avancée — installation auto-hébergée](docs/Documentation.md#10-installation-auto-hébergée)

---

<a id="menu-essayer"></a>

## ▶️ Essayer en trois étapes

| Étape | Action |
|-------|--------|
| **1** | Installer [Ollama](https://ollama.com/download) sur le même PC que le navigateur, puis télécharger un modèle. |
| **2** | Ouvrir [promptdemerde.com](https://promptdemerde.com/) et laisser **« Je n’ai pas de token »** coché (*Options → LLM*). |
| **3** | Importer un profil JSON (*Options → Profil JSON*) ou configurer l’écran *Prompts*, puis écrire ou dicter, lancer **Nettoyer**, et copier le résultat. |

<p align="center">
  <a href="https://promptdemerde.com/"><strong>Ouvrir PromptDeMerde →</strong></a>
</p>

---

<a id="menu-auto-hebergement"></a>

## 🖥️ Auto-hébergement (optionnel)

```bash
git clone https://github.com/JeanSebastienBash/promptdemerde.git
cd promptdemerde/install
bash restore-large-assets.sh
```

Servez le dossier avec Apache ou Nginx et PHP, installez Ollama, puis ouvrez votre URL. Le script `restore-large-assets.sh` est obligatoire après un clone.

<details>
<summary><strong>Opérateurs — token proxy et PDM_ENV</strong></summary>

<br>

Les visiteurs et les auto-hébergeurs laissent **« Je n’ai pas de token »** coché. Le token proxy sert uniquement au relai opérateur de la production officielle. La variable `PDM_ENV`, optionnelle, pilote le badge du footer (PROD / PRÉ-PROD / AUTO-HÉBERGÉ).

[`SECURITY.md`](SECURITY.fr.md) · [Notes de déploiement](docs/Documentation.md#deploy-pdm-env-badges)

</details>

---

<a id="menu-credits"></a>

## 🙏 Crédits

PromptDeMerde est publié par **[DreamProjectAI](https://dreamproject.online)**.

Composants tiers (liste complète dans [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.fr.md)) :

* **[Ollama](https://ollama.com)** — runtime LLM local pour Nettoyer et pour la description vision (non redistribué dans ce dépôt).
* **JSZip** — création et lecture des archives ZIP de profil dans le navigateur.
* **ONNX Runtime Web**, **Transformers.js**, **Vosk**, **Parakeet** — pipelines de parole dans le navigateur.
* **Polices** embarquées localement (Fira Code, Inconsolata, Space Grotesk, Archivo Black, Anton) sous licence OFL.

Pour les signalements de sécurité, voir [`SECURITY.md`](SECURITY.fr.md).

---

## 📚 Pour aller plus loin

| Sujet | Document |
|-------|----------|
| Écrans, clés, ZIP, STT, architecture | [**Documentation utilisateur avancée**](docs/Documentation.md) |
| Contribuer | [`CONTRIBUTING.md`](CONTRIBUTING.fr.md) |
| Sécurité et déploiement | [`SECURITY.md`](SECURITY.fr.md) |
| Notices tierces | [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.fr.md) |
| Modèles STT (zone) | [`docs/Stt.md`](docs/Stt.md) |
| Catalogue Vosk | [`docs/Stt-vosk.md`](docs/Stt-vosk.md) |
| Profils (zone) | [`docs/Profiles.md`](docs/Profiles.md) |
| Vendor JS (zone) | [`docs/Vendor.md`](docs/Vendor.md) |
| English | [`README.md`](README.md) |

---

<a id="menu-licence"></a>

## Licence

MIT — [DreamProjectAI](https://dreamproject.online)
