# Documentation technique

<p align="center">
  <a href="DOCUMENTATION-TECHNIQUE.en.md"><img src="../assets/images/flags/en.svg" alt="English" width="28" height="20"></a>
  &nbsp;
  <a href="DOCUMENTATION-TECHNIQUE.md"><img src="../assets/images/flags/fr.svg" alt="Français" width="28" height="20"></a>
</p>

<p align="center">
  <a href="../LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <a href="../README.md"><img src="https://img.shields.io/badge/version-1.23.0-blue.svg" alt="Version 1.23.0"></a>
</p>

> **Version applicative** : 1.23.0 (`CS.VERSION`)  
> **Public** : développeurs, auditeurs du code, opérateurs d’auto-hébergement  
> **Langue** : français · [English](DOCUMENTATION-TECHNIQUE.en.md)  
> **Compléments** : [`README.md`](../README.md) (EN) · [`README.fr.md`](../README.fr.md) (FR) · [`CONTRIBUTING.md`](../CONTRIBUTING.md) · [`SECURITY.md`](../SECURITY.md)

Ce document décrit le fonctionnement **vérifiable dans le dépôt** : fichiers, contrats, flux, inventaires. Il ne constitue pas un guide marketing.

---

## Table des matières

1. [Objet et périmètre](#1-objet-et-périmètre)
2. [Contrats et versions](#2-contrats-et-versions)
3. [Modèle de données navigateur et confidentialité](#3-modèle-de-données-navigateur-et-confidentialité)
4. [Coque SPA — navigation, thèmes, i18n, feedback](#4-coque-spa-navigation-thèmes-i18n-feedback)
5. [Workspace](#5-workspace)
6. [Prompts — système, prompts de contexte, générateurs de prompts de contexte](#6-prompts-système-prompts-de-contexte-générateurs-de-prompts-de-contexte)
7. [Options, profils, export et zone danger](#7-options-profils-export-et-zone-danger)
8. [Dictée vocale et audio (STT)](#8-dictée-vocale-et-audio-stt)
9. [Import image → description (vision)](#9-import-image-description-vision)
10. [Marketplace (clone vs site officiel)](#10-marketplace-clone-vs-site-officiel)
11. [Ollama — flux A et flux B](#11-ollama-flux-a-et-flux-b)
12. [Export / import — archive ZIP profil](#12-export-import-archive-zip-profil)
13. [Les 51 clés `pdm_*`](#13-les-51-clés-pdm)
14. [Namespaces `PDM.*`](#14-namespaces-pdm)
15. [Inventaire JavaScript](#15-inventaire-javascript)
16. [Inventaire CSS](#16-inventaire-css)
17. [PHP, proxy et API](#17-php-proxy-et-api)
18. [Installation auto-hébergée et déploiement](#18-installation-auto-hébergée-et-déploiement)
19. [Sécurité import et limites](#19-sécurité-import-et-limites)
20. [Assets profils, STT et vendor](#20-assets-profils-stt-et-vendor)
21. [Glossaire et références croisées](#21-glossaire-et-références-croisées)
22. [Dépannage rapide](#22-dépannage-rapide)
23. [Licence](#licence)


---

<a id="1-présentation"></a>
<a id="1-objet-et-périmètre"></a>
## 1. Objet et périmètre

### 1.1 Rôle technique

PromptDeMerde est une **SPA** HTML/CSS/JavaScript (IIFE, namespace `window.PDM`), servie avec un socle PHP minimal. Le traitement LLM passe par **Ollama**. La dictée et la transcription audio s’exécutent dans le **navigateur** (WASM / ONNX). La persistance applicative utilise `localStorage`, `sessionStorage` et IndexedDB. L’export/import de profil produit une archive **ZIP** assemblée côté client.

| Aspect | Implémentation |
|--------|----------------|
| Entrée Workspace | Texte (saisie, dictée, import audio/vidéo, import image → description vision) |
| Assemblage LLM | Prompt système optionnel + prompts de contexte (`#Tag`) actifs + message utilisateur (Input) |
| Sortie | Zone Output ; formats d’affichage `text` / `json` / `html` |
| Persistance | Clés `pdm_*` ; historique ; blobs audio |
| Stack | `index.html` + modules `assets/js/*` ; CSS `assets/css/*` ; PHP `lib/api`, `lib/env`, `lib/proxy` |

### 1.2 Périmètre code (faits)

| Présent dans le dépôt | Absent du runtime applicatif livré |
|----------------------|-------------------------------------|
| Reformulation via Ollama (nettoyage / structuration de brouillon) | Chatbot multi-tours autonome |
| STT navigateur (Vosk, Whisper, Parakeet) | Service de transcription cloud imposé |
| Proxy PHP optionnel vers Ollama | Base de données serveur des brouillons utilisateur |
| Profil bundlé `speech2texte` | Obligation d’un compte utilisateur |

Sources de vérité : [`assets/js/config-schema-core.js`](../assets/js/config-schema-core.js) (`CS.VERSION`) · [`assets/config/pdm-config.schema.json`](../assets/config/pdm-config.schema.json).

### 1.3 Distinction README / ce document

| Document | Rôle |
|----------|------|
| `README.md` / `README.fr.md` | Accroche produit, Features 1–40, prérequis |
| **Documentation technique** (ce fichier) | Inventaire, contrats et dépannage — canal doc unique |

---

<a id="2-contrats-et-versions"></a>
## 2. Contrats et versions

La version applicative courante est définie par `CS.VERSION` et vaut `1.23.0`. Le thème par défaut est `CS.DEFAULT_THEME_ID` (`marron-day`). Les préférences exportables sont listées dans `CS.PDM_KEYS` : **51** clés `pdm_*` (détail en [§13](#13-les-51-clés-pdm)). Le schéma machine correspondant se trouve dans `assets/config/pdm-config.schema.json`.

Un bump de `CS.VERSION` intervient lorsque le contrat `pdm_*` ou la session évolue dans le code source ; le profil livré `assets/profiles/speech2texte/` est alors recompilé dans la même passe. L’ordre de chargement des scripts JavaScript est fixé dans `lib/env/env.php`, avec un repli dans `assets/js/env.js` ; les scripts statiques requis figurent aussi dans `index.html`.

---

<a id="2-modèle-de-confidentialité"></a>
<a id="3-modèle-de-données-navigateur-et-confidentialité"></a>
## 3. Modèle de données navigateur et confidentialité

### En bref

La **même promesse** s’applique sur [promptdemerde.com](https://promptdemerde.com/) et en auto-hébergement : aucune télémétrie, aucune base de données serveur, et les données d’usage restent dans le navigateur. Sur le site officiel, Ollama s’exécute sur la machine du navigateur (flux A) : le VPS ne reçoit pas l’inférence LLM. La dictée et l’import audio ou vidéo restent dans le navigateur. L’export et l’import de profil ZIP sont traités à **100 % côté client** : le serveur ne lit pas l’archive.

### 3.1 Flux de données

```
[Navigateur]
  ├─ localStorage : 51 clés pdm_* + session
  ├─ sessionStorage : token proxy opérateur (hors export)
  ├─ IndexedDB : blobs audio (optionnel)
  ├─ STT : WASM/ONNX local (Vosk, Whisper, Parakeet)
  └─ LLM flux A : fetch direct → http://localhost:11434 (Ollama)

[Proxy PHP olama.php] — flux B ou auto-hébergement same-origin
  └─ Transit mémoire POST → Ollama — aucune écriture disque applicative
```

### 3.2 Ce que le serveur web PHP ne persiste pas

Ici **serveur** = le **VPS ou vhost PHP** qui sert `index.html`, les assets et éventuellement `olama.php` — que ce soit [promptdemerde.com](https://promptdemerde.com/) ou l’installation auto-hébergée. Ce n’est **pas** Ollama (sur la machine du navigateur) ni le navigateur (localStorage).

- Le serveur ne journalise pas les imports de profil ZIP (traitement **100 % client**).
- Il ne stocke pas l’historique de nettoyage ni les brouillons utilisateur.
- Il n’envoie pas l’audio au cloud pour transcription (le STT reste dans le navigateur).

**Flux B opérateur** : le corps POST transite en **RAM** via `olama.php` sans écriture disque applicative — voir [`SECURITY.md`](../SECURITY.md).

### 3.3 Audit

Le code est publié sous licence MIT sur GitHub et constitue la même base que le déploiement officiel. Le détail proxy, CSP et import malveillant figure dans [`SECURITY.md`](../SECURITY.md).

---

<a id="4-coque-spa-navigation-thèmes-i18n-feedback"></a>
## 4. Coque SPA — navigation, thèmes, i18n, feedback

### 4.1 Routage hash

Le routage hash est porté par [`assets/js/app.js`](../assets/js/app.js) (`PDM.App`). La navigation se fait sans rechargement de page.

| Hash / id | Comportement |
|-----------|----------------|
| `#landing` | Landing si `PDM.Homepage` actif ; sinon workspace |
| `#workspace` | Workspace (défaut) |
| `#prompts` | Prompts |
| `#market` | Entrée Marketplace (sur un clone public : lien vers le site officiel) |
| `#settings` | Options |
| `#config` | Alias de `#settings` |
| `#mentions`, `#cgu`, `#privacy`, `#support` | Pages légales / support |
| `#documentation`, `#doc-*` | Legacy — ouvre la documentation technique GitHub (FR/EN selon langue IHM) puis Workspace |
| *(vide / inconnu)* | Résolution vers `workspace` |

### 4.2 Thèmes

Le module [`themes.js`](../assets/js/themes.js) expose **50** thèmes (25 familles en variantes clair et sombre). L’identifiant actif est stocké dans `pdm_theme`. La valeur par défaut est `marron-day`.

<a id="35-i18n"></a>
### 4.3 i18n

Le fichier [`assets/i18n/manifest.json`](../assets/i18n/manifest.json) déclare les douze locales `fr`, `en`, `ar`, `zh`, `eo`, `es`, `de`, `pt`, `it`, `ru`, `ja` et `ko`. Les modules `i18n.js`, `i18n-apply-dom.js` et `i18n-locales.js` appliquent les libellés et les métadonnées (dont le RTL).

### 4.4 Feedback et accessibilité

Les notifications passent par `PDM.UI.notif`. La coque gère le loader, le menu burger et la touche Escape. La feuille `polish-a11y.css` honore `prefers-reduced-motion`. Le raccourci Ctrl/Cmd+Enter déclenche Nettoyer lorsque le focus le permet.

### 4.5 Header et footer

Les animations d’en-tête sont portées par `animation-inversion.js` et `animation-synopsis.js`. Le pied de page s’appuie sur `footer-projects.js` et `footer-radar-portrait.js`. Le badge d’environnement reflète la variable serveur `PDM_ENV`.

---

<a id="32-workspace"></a>
<a id="5-workspace"></a>
## 5. Workspace


| Zone            | Comportement                                                         |
| --------------- | -------------------------------------------------------------------- |
| **Input**       | Texte libre ; dictée insère au curseur si `pdm_stt_insert_at_cursor` ; **gros texte** : inférence multi-pass automatique (voir §5.1) |
| **Output**      | Résultat Ollama ; sélecteur modèle ; chips format **texte / JSON / HTML** (voir §5.2) |
| **Reset**       | Bouton à droite des en-têtes **Input** et **Output** : même action, efface saisie et résultat (**confirmation** obligatoire) |
| **Nettoyer**    | Requiert prompt système **ou** ≥1 contexte actif                     |
| **Historique**  | Panel latéral (100 entrées max, `pdm_clean_history`) avec trace complète Input / system / prompts de contexte / Output (± compression) |
| **Tags actifs** | Panneau **Prompts de contexte** (`#context-panel`), **replié par défaut** ; un clic sur le titre affiche les `#Tag` |
| **Compresser tokens** | Panneau **Compression des tokens** (cases optionnelles, tout off par défaut) ; au clic **Nettoyer**, compression de system/prompts de contexte/Input avant l’inférence, et Output après si coché — voir §5.3 |


La mise en page utilise `.ws-grid` : deux colonnes à partir de 1024 px de largeur ([`assets/css/style-workspace.css`](../assets/css/style-workspace.css)).

<a id="321-input-long-multi-pass-inférence"></a>
### 5.1 INPUT long (multi-pass inférence)

> [!NOTE]
> Concerne le texte **déjà dans la zone Input** (collé ou issu d’une dictée). Ce n’est **pas** une modification du moteur STT (Whisper, Vosk, Parakeet).

Il n’existe **pas de limite dure** côté inférence : un texte très long est découpé en plusieurs passes. Pour l’**export ZIP**, `pdm_workspace.input` est plafonné à **50 000** caractères.

Les constantes suivantes s’expriment en caractères (pas en tokens) :

| Seuil | Valeur | Effet |
|-------|--------|-------|
| `CHUNK_FORCE_CHARS` | **2 800** | Au-delà → multi-pass obligatoire |
| `PROMPT_CHAR_BUDGET` | **10 000** | Si system+contextes+Input dépasse → multi-pass |
| `CHUNK_MAX_CHARS` | **3 200** | Taille max d’un morceau |
| `CHUNK_MIN_CHARS` | **1 200** | Taille min d’un morceau (gros overhead) |

La taille d’un morceau suit la formule `min(3200, max(1200, 10000 − overhead − 600))`, où `overhead = system + contextes actifs + 200`.

Comportement de découpe et d’inférence :

1. Découpe aux paragraphes, lignes, fins de phrase, puis espaces.
2. Chaque morceau est nettoyé séparément ; l’OUTPUT final est la **concaténation** de toutes les passes (`\n\n` entre morceaux).
3. Pendant le stream, l’indicateur affiche `pass: i/n`.
4. Dérive méta (agent, « demande ambitieuse ») → **1 retry strict** par morceau.


Les modules concernés sont `workspace-input-chunk.js` et `workspace-inference.js`.

<a id="322-format-daffichage-output"></a>
### 5.2 Format d’affichage OUTPUT

La clé `pdm_output_display_format` (défaut `text`) pilote les pastilles du panneau Options LLM du Workspace :

| Valeur | Effet |
|--------|-------|
| `text` | Texte brut (canonique — stockage historique) |
| `json` | Enrobage JSON à l’affichage seulement |
| `html` | Enrobage HTML à l’affichage seulement |

Les profils JSON (`output_xx`) peuvent encore demander une enveloppe au modèle ; l’UI **extrait** toujours le texte utile avant affichage. Guillemets, accents et caractères spéciaux ne doivent **pas** être interdits dans l’INPUT ni l’OUTPUT.

Les modules concernés sont `workspace-output-format.js` et `profile-output-json.js`.

<a id="323-compresser-les-tokens"></a>
### 5.3 Compresser les tokens

Le panneau déroulant **Compression des tokens** se trouve juste au-dessus de « Prompts de contexte » :

- **Cases actives** (choix multiple) : prompt système, prompts de contexte actifs, zone Input et zone Output. Toutes sont **décochées par défaut**.
- **Au clic Nettoyer**, les cibles cochées parmi prompt système, prompts de contexte et zone Input sont compressées **avant** l’inférence, ce qui libère la fenêtre de contexte.
- **Après Nettoyer**, si la zone Output est cochée, le texte affiché est raccourci (affichage seulement).
- Il n’existe **pas** de bouton Compresser ni de dialogue de confirmation : la sélection des cases suffit.
- **Réflexion** : elle n’est **pas** configurée dans ce panneau ; elle est produite *pendant* Nettoyer. Pour alléger le GPU, le plafond de réflexion se règle dans Options (ou la réflexion se désactive).
- Le taux interne vise à conserver environ **55 %** du texte (`rate: 0.55`). Ce taux n’est pas exposé dans l’UI et n’est pas persisté (pas de clé `pdm_*`).
- **Pendant la compression**, un overlay **Output** affiche un preload indéterminé, le libellé d’étape et **Arrêter** ; le menu ne garde que les cases et la zone Output est verrouillée.
- **Après compression**, une marque visuelle (barre et pastille verte) apparaît sur les chips concernés et persiste en session tant que le contenu n’a pas changé.
- Côté UI, la compression appelle Ollama en mode extractif local (`think: false`) via le module `prompt-compress.js`, avec blindage des placeholders et anti-LaTeX ; si les sentinelles sont perdues, le texte d’origine est conservé.
- **Creator / archives** : le même taux cible s’applique hors UI (outil maintainer privé). L’écart de moteur éventuel est **volontaire**.
- **Historique** : chaque Nettoyer écrit une entrée `pdm_clean_history` avec un champ `trace` (Input, prompt système, prompts de contexte actifs, Output — versions **originale** et **compressée** si la case était cochée). Sans compression, seuls les blocs originaux sont conservés. L’UI propose un accordion responsive, une copie par bloc et une modal plein écran.
- **Zone Output** : la compression raccourcit le résultat affiché et ne libère **pas** la fenêtre de contexte pour le prochain Nettoyer (contrairement au prompt système et aux prompts de contexte).
- **Intégrité** : la compression ne doit ni introduire de LaTeX (`$\rightarrow$`), ni faire « fuir » ou manger les placeholders `{{…}}`, ni altérer les clés `output_*`.

---

### 5.4 Modules Workspace

| Module | Rôle |
|--------|------|
| `workspace-inference.js` | Orchestration Nettoyer |
| `workspace-stream.js` | Stream + panneau réflexion |
| `workspace-input-chunk.js` | Multi-pass Input long |
| `workspace-output-format.js` | Format d’affichage Output |
| `prompt-compress.js` | Compression tokens |
| `history-ui.js` / `history-ui-list.js` / `history-ui-modal.js` / `history-trace.js` | Historique |
| `workspace-audio-bind.js` / `workspace-audio-mode.js` | Import audio/vidéo |
| `workspace-image-bind.js` / `workspace-image-encode.js` | Import image vision |
| `workspace-tts-download.js` | Placeholder export TTS |

### 5.5 Exclusion mutuelle des modes Input

Les modes dictée, import audio/vidéo et import image sont mutuellement exclusifs (`workspace-input-tools.js`, `workspace-audio-mode.js`, `workspace-image-bind.js`).

L’inventaire complet figure en [§15.3](#153-workspace).

---

<a id="5-prompts--système-prompts-de-contexte-générateurs"></a>
<a id="6-prompts-système-prompts-de-contexte-générateurs-de-prompts-de-contexte"></a>
## 6. Prompts — système, prompts de contexte, générateurs de prompts de contexte

### En bref

L’assemblage repose sur trois niveaux. Le **prompt système** (unique) fixe la personnalité globale. Les **prompts de contexte**, aussi appelés **`#Tag`**, ajoutent des consignes multiples. Les **générateurs de prompts de contexte** sont des templates internes qui fabriquent ces `#Tag`. L’ordre d’injection est piloté par `pdm_context_position` (`after_system` ou `before_system`). Le texte **Workspace** (zone Input) part **toujours en dernier** message utilisateur.

Le prompt système est **modifiable directement** dans sa zone ; les changements sont **enregistrés automatiquement** dès qu’un autre élément reçoit le focus (ou que le champ est quitté).

### 6.1 Assemblage message LLM (simplifié)

```
after_system:
  [system] prompt système
  [system] prompts de contexte actifs (#Tag1, #Tag2…)
  [user]   texte Workspace

before_system:
  [system] prompts de contexte actifs
  [system] prompt système
  [user]   texte Workspace
```

<a id="52-génération-assistée-de-tag"></a>
### 6.2 Génération assistée de `#Tag`

Le module concerné est [`assets/js/context-generation.js`](../assets/js/context-generation.js).

Deux entrées dans l’écran Prompts :

- **Par titre** : un tag est saisi, puis le **prompt de contexte** associé est généré.
- **Par intention** : le besoin est décrit en texte libre (le **tag / titre est choisi par l’IA**, et n’est pas saisi dans le champ titre). Le **modèle** est le même que celui du Workspace. Le panneau **Options** expose max tokens, température, température de retry et retries max (`pdm_context_gen_*`, synchronisé avec le panneau avancé « Prompts LLM… »). La génération se fait en **stream** avec un bouton **Arrêter**. Cette génération n’utilise pas le mode réflexion (sortie JSON).

Les clés associées sont `pdm_context_gen_*` (voir [§13](#13-les-51-clés-pdm)).

### 6.3 Profils applicatifs

- **Officiel** : le profil `speech2texte` assure la correction post-dictée. Il est **bundlé** sous `assets/profiles/speech2texte/` et listé dans le catalogue `index.json`.
- **Perso** : les profils `(perso)` sont créés localement et exportables en ZIP.
- Un changement de profil déclenche un wipe local puis le chargement du bundle, après une confirmation unique.

Contextes livrés avec `speech2texte` (état actif du bundle) :

| `#Tag` | Actif | Rôle |
|--------|-------|------|
| `#SansPonctuationDAbord` | oui | Ponctuation STT mal placée |
| `#DerniereFormulation` | oui | Dernière version après reprises |
| `#MotsParasites` | oui | Intrus phonétiques |
| `#HesitationsOral` | oui | Euh, hum, bah… |
| `#FrancaisNaturel` | oui | Fluidité après nettoyage |
| `#Conservateur` | non | Mode strict |

---

<a id="7-options-profils-export-et-zone-danger"></a>
## 7. Options, profils, export et zone danger

Les sections typiques de l’écran Options sont les suivantes :

- **LLM** : URL Ollama, token Ollama optionnel, case « Je n'ai pas de token » (flux A), token proxy opérateur (sessionStorage). Après modification de l’URL, **perte de focus** ou bouton **Tester** : la liste des modèles du sélecteur Workspace (`#ws-output-model-select`) se met à jour automatiquement depuis Ollama ; seuls les modèles réellement renvoyés par l’instance figurent dans le sélecteur (plus d’option fantôme « modèle sauvegardé » hors liste) ; en cas d’échec, la liste et le modèle stocké sont invalidés.
- **Dictée** : le panneau regroupe le moteur STT, le choix CPU/GPU, le micro et le raccourci d’effacement du dernier mot.
- **Langue** : les douze locales sont disponibles ; la bascule i18n est immédiate.
- **Thème** : cinquante thèmes sont proposés (vingt-cinq familles en clair et sombre) ; le défaut est `marron-day` (Marron clair).
- **Profil JSON** : l’écran permet l’export ZIP, l’import ZIP, le sélecteur de profil et la création d’un profil `(perso)`.
- **Zone danger — Tout effacer** : purge les données PromptDeMerde dans le navigateur (`localStorage` / `sessionStorage` `pdm_*`, IndexedDB `pdm-audio`, Cache Storage `pdm-*`, cache Parakeet le cas échéant), invalide les caches mémoire applicatifs, puis recharge l’app avec un paramètre `pdm_fresh` (retiré au boot). **Ne remplace pas** la suppression globale des données de navigation Chromium/Firefox pour tous les sites, ni un Shift+F5 absolu ; pour un test « navigateur vierge » hors origine PDM, le process manuel reste le plus sûr.


### 7.1 Modules associés

| Module | Rôle |
|--------|------|
| `settings-ui.js` | UI Options |
| `profile-selector.js` et `profile-selector-*.js` | Sélecteur / export modal |
| `profile-bundle-*.js` | Bundle ZIP / intégrité |
| `storage-wipe.js` | Tout effacer |
| `proxy-token-session.js` | Token proxy sessionStorage |

---

<a id="6-dictée-vocale-et-audio"></a>
<a id="8-dictée-vocale-et-audio-stt"></a>
## 8. Dictée vocale et audio (STT)

### En bref

Cinq moteurs STT s’exécutent **dans le navigateur** ; l’audio n’est **jamais** envoyé au serveur. Vosk est recommandé sous Linux (CPU). Whisper et Parakeet s’appuient sur WebGPU lorsqu’il est disponible. L’import d’un fichier audio ou vidéo (🎵) utilise Whisper Maxi pour une transcription locale ; pour une vidéo, la piste sonore est extraite dans le navigateur. Pendant l’analyse du fichier, la dictée est en pause. **Dès que le texte apparaît dans Input**, l’édition, une nouvelle dictée ou l’effacement (corbeille / Nouvelle saisie) sont possibles, sans passer par Reset. Après un clone GitHub, la commande `cd install && bash restore-large-assets.sh` restaure les modèles.

Sur la bande Workspace figurent **Démarrer dictée vocale**, **Stopper la dictée vocale**, puis **Options**. Il n’y a pas de badges moteur ou micro en haut : un message rouge discret s’affiche à côté du bouton selon la phase (**Démarrage de la dictée vocale…**, **Autorisation du micro…**, **Chargement du moteur vocal…**, **Dictée vocale en cours**).

**Démarrer dictée vocale** (un seul clic) :
1. demande l’autorisation micro au navigateur si besoin ;
2. charge automatiquement le moteur vocal choisi (équivalent de **Charger le moteur**) ;
3. démarre la dictée.

Dans Options, **Charger le moteur** reste disponible pour précharger sans dicter. La ligne Micro combine un sélecteur et **Rafraîchir les micros**.

**Continuité pendant la navigation** : une dictée démarrée sur le Workspace **ne s’arrête pas** lors d’un changement d’écran (Market, Options, pages légales, etc.). Le texte continue de s’insérer dans la zone Input. Arrêt : retour au Workspace puis **Stopper la dictée vocale** (ou fermeture / rechargement de la page).

**Actions qui rechargent la page** (changement de langue, import profil, effacement local, changement de profil, etc.) : si une dictée est en cours, une **modale** demande confirmation. Tant que la modale est ouverte, **la dictée continue** (la prise de parole reste possible). En cas de confirmation : **triple bip** d’avertissement (motif stop × 3, ~1,5 s — le rechargement **attend** la fin des bips), arrêt de la dictée, notification visuelle, puis poursuite de l’action. En cas d’annulation : la dictée reste active. **Juste après le rechargement**, une fenêtre propose de **reprendre la dictée** (un clic) ou de fermer.

### 8.1 Moteurs


| ID `pdm_stt_engine`             | Fichiers                           | Notes                  |
| ------------------------------- | ---------------------------------- | ---------------------- |
| `vosk-mini` / `vosk-maxi`       | `assets/stt/vosk-*/model.tar.gz`   | CPU, fiable Linux      |
| `whisper-mini` / `whisper-maxi` | `assets/stt/whisper-*/onnx/*.onnx` | WebGPU conseillé       |
| `parakeet`                      | `assets/stt/parakeet/*.onnx`       | Meilleure qualité, GPU |


La liste canonique des moteurs est `CS.STT_ENGINES` dans `config-schema-core.js`.

### 8.2 Clés STT (Speech To Text)


| Clé                            | Rôle                          |
| ------------------------------ | ----------------------------- |
| `pdm_stt_device_id`            | ID micro préféré              |
| `pdm_stt_engine`               | Moteur actif                  |
| `pdm_stt_compute`              | `cpu` ou `gpu`                |
| `pdm_stt_insert_at_cursor`     | Insertion dictée au curseur   |
| `pdm_stt_delete_word_enabled`  | Raccourci effacer dernier mot |
| `pdm_stt_delete_word_shortcut` | ex. `ctrl+backspace`          |
| `pdm_stt_delete_word_target`   | `end` ou `cursor`             |


### 8.3 Contexte sécurisé et permission micro

Le micro et WebGPU exigent **HTTPS** ou `http://localhost`. Sur une IP LAN en HTTP, le micro est bloqué par la politique du navigateur.

| Situation | Comportement |
| --------- | ------------ |
| Micro pas encore autorisé | **Démarrer dictée vocale** ouvre la fenêtre d’autorisation du navigateur, puis enchaîne |
| Micro accepté | La dictée démarre (et charge le moteur si besoin) |
| Micro **refusé définitivement** (réglages du site) | Le navigateur **n’affiche plus** la fenêtre. Réinitialiser la permission du site (icône cadenas / infos site → Micro → Autoriser), puis réessayer **Démarrer dictée vocale** ou **Rafraîchir les micros** |

<a id="64-enregistrement-webm"></a>
### 8.4 Enregistrement WebM

La dictée peut enregistrer un flux audio au format WebM en parallèle de la reconnaissance. Les références à ces enregistrements sont stockées via `pdm_audio_blobs` : les blobs vivent en IndexedDB côté navigateur, avec une option d’export en base64 lorsque le profil ZIP inclut l’audio.

### 8.5 Dépannage STT

| Symptôme | Piste |
|----------|-------|
| Micro bloqué sur IP LAN en HTTP | Servir en `https://` ou ouvrir l’app via `http://localhost` |
| Whisper / Parakeet lents ou en CPU | Vérifier WebGPU (`about:support` → WebGPU, ou `navigator.gpu` en console). Un GPU physique ne garantit pas WebGPU |
| Badge Accélération orange | Accélération demandée ≠ moteur en mémoire → recharger le moteur (📥) |
| Qualité faible | Préférer Vosk Maxi sous Linux ; Whisper Maxi / Parakeet si WebGPU fiable |

Messages strip (phases) : **Démarrage…**, **Autorisation du micro…**, **Chargement du moteur…**, **Dictée en cours** — clés i18n `stt.help.*` / `stt.status.*`.

---

<a id="6bis-import-image--description"></a>
<a id="9-import-image--description-vision"></a>
<a id="9-import-image-description-vision"></a>
## 9. Import image → description (vision)

Le bouton **Importer une image** dans la zone Input ouvre un file picker (**pas** de glisser-déposer). Les formats acceptés sont PNG, JPEG, WebP et GIF. L’image est redimensionnée côté navigateur puis envoyée à Ollama (modèle `pdm_image_model`, consigne `pdm_image_prompt`) via le proxy existant, en **transit mémoire**, sans stockage serveur de l’image.

- Le modèle et la consigne d’image s’éditent dans l’écran **Prompts**, bloc Prompts image.
- Les modèles vision **n’apparaissent pas** dans les sélecteurs LLM texte (Workspace et génération de prompts de contexte) : ils figurent uniquement dans le sélecteur du bloc Prompts image.
- La consigne par défaut vise une cartographie complète pour **reproduire** l’image.
- **En cas d’échec**, le toast indique la cause et l’action (par exemple modèle absent → `ollama pull <modèle>` puis Prompts → Prompts image ; Ollama injoignable → Options → LLM). Aucun message générique « a échoué » n’est affiché sans suite.
- L’application **n’installe pas** les modèles : la commande `ollama pull <modèle>` reste à exécuter hors UI (exemple : `moondream`).

---

<a id="10-marketplace-clone-vs-site-officiel"></a>
## 10. Marketplace (clone vs site officiel)

Sur un clone public, le menu **Marketplace** mène au catalogue en ligne sur [promptdemerde.com](https://promptdemerde.com/#market). Le détail d’implémentation n’appartient pas au miroir public de ce dépôt.


---

<a id="4-ollama--flux-a-et-flux-b"></a>
<a id="11-ollama-flux-a-et-flux-b"></a>
## 11. Ollama — flux A et flux B

### En bref

En **flux A** (visiteur en production), le navigateur appelle **directement** Ollama sur `localhost:11434`, avec la case « Je n'ai pas de token » cochée. En **flux B** (opérateur), les requêtes passent par le relais PHP `olama.php`, avec token et allowlist IP. En auto-hébergement, le trajet est souvent same-origin via le proxy local.

### 11.1 Flux A — implémentation

La détection du mode direct est assurée par `shouldUseDirectOllama()` dans [`assets/js/proxy-token-session.js`](../assets/js/proxy-token-session.js). La branche de fetch se trouve dans [`assets/js/ollama.js`](../assets/js/ollama.js). Ollama doit autoriser l’origine du site via `OLLAMA_ORIGINS=https://promptdemerde.com`. La directive CSP `connect-src` (conf serveur) autorise localhost et les plages RFC1918.

#### Pas à pas — visiteur (flux A, site officiel)

1. Installer [Ollama](https://ollama.com) sur la machine locale et tirer un modèle (`ollama pull …`).
2. Autoriser l’origine du site : `OLLAMA_ORIGINS=https://promptdemerde.com` puis redémarrer Ollama (Linux : variable d’environnement / unité systemd ; macOS / Windows : variable avant le lancement du service).
3. Ouvrir [promptdemerde.com](https://promptdemerde.com/) → **Options → LLM** : URL `http://localhost:11434`, case « Je n'ai pas de token » cochée.
4. Cliquer **Tester** : la liste des modèles doit apparaître. En cas d’échec CORS (`Failed to fetch`), revérifier `OLLAMA_ORIGINS` et le redémarrage.

Contrôle rapide : `curl -i http://localhost:11434/api/tags` doit répondre ; en navigateur, la console ne doit plus afficher d’erreur CORS vers `localhost:11434`.

### 11.2 Flux B — opérateur

Le serveur lit le secret `PDM_PROXY_TOKEN`. Côté client, `pdm_token_proxy` est stocké en **sessionStorage** et n’entre pas dans l’export ZIP. Le relais est [`lib/proxy/ollama/olama.php`](../lib/proxy/ollama/olama.php) : limitation de débit, plafond de corps de requête, sans redirection.

<a id="43-paramètres-llm-workspace-panel"></a>
### 11.3 Paramètres LLM (Workspace panel)


| Clé                          | Rôle                               |
| ---------------------------- | ---------------------------------- |
| `pdm_llm_temperature`        | Température nettoyage (0 = défaut) |
| `pdm_llm_max_tokens`         | Plafond sortie                     |
| `pdm_llm_timeout_sec`        | Timeout inférence (défaut 1000 s)  |
| `pdm_llm_thinking_enabled`   | Afficher réflexion modèle          |
| `pdm_llm_thinking_max_chars` | Plafond caractères réflexion       |
| `pdm_output_display_format`  | Format affichage OUTPUT : `text`, `json`, `html` (défaut `text`) |


---

<a id="7-export--import--archive-zip-profil"></a>
<a id="12-export-import-archive-zip-profil"></a>
## 12. Export / import — archive ZIP profil

### En bref

L’action **Exporter** télécharge une **archive ZIP** ; un fichier JSON seul n’est pas produit. L’action **Importer** n’accepte que l’extension `.zip`. L’archive contient des JSON sous `parts/`, des fichiers Markdown (prompt système et prompts de contexte) et un manifest. L’objet logique assemblé est `pdm-config` (51 clés). Les presets disponibles sont **minimal** et **maximal**. Les tokens proxy et les préférences de flux A/B restent en sessionStorage et sont **exclus de l’export**.

### 12.1 Nom de fichier

```
{slug}-promptdemerde-profile-v{CS.VERSION}.zip
```

Exemple de nom : `speech2texte-promptdemerde-profile-v1.23.0.zip`

Le nom de fichier est construit par `buildZipFilename()` dans [`assets/js/profile-bundle-export.js`](../assets/js/profile-bundle-export.js).

### 12.2 Structure ZIP

```
manifest.json
parts/
  config.json       # clés « config » (STT, thème, gen numerics, workspace_ui…)
  session.json      # type pdm-session (LLM session, historique, workspace)
  locales.json
  prompts.json      # index Markdown
  gen-prompts.json
prompts/{locale}/system.md
contexts/{locale}/{Tag}.md
gen-prompts/{locale}/*.md
i18n/               # preset MAXIMAL uniquement
  manifest.json
  ui/{lang}.json
```

### 12.3 Presets


| Preset      | Contenu                                                       |
| ----------- | ------------------------------------------------------------- |
| **minimal** | Prompts MD et parts ; l’UI reprend l’i18n serveur au boot     |
| **maximal** | Ajoute les dossiers `i18n/ui/` pour les langues cochées (clone UI complet) |


### 12.4 Pipeline import

1. `ProfileBundle.loadFromZip()` (JSZip).
2. Résolution Markdown par locale.
3. Assemblage objet `pdm-config` complet.
4. Appel de `validatePdmConfig()` (quatre niveaux de validation et sécurité v2).
5. Dialog source inconnue ; strip `pdm_token_ollama` si tiers.
6. `wipeAllUserData()` puis application.

Les fichiers concernés sont `profile-bundle-loader.js`, `storage-config-import.js` et `settings-ui.js`.

<a id="75-personnalisation-par-édition-zip"></a>
### 12.5 Personnalisation par édition ZIP

Workflow power user :

1. Exporter le profil en preset **maximal**.
2. Dézipper l’archive, puis éditer les Markdown et JSON (un LLM est recommandé pour la cohérence).
3. Re-zipper l’archive, puis l’importer : la validation s’exécute côté client.

Le serveur ne voit pas le contenu de l’archive.

#### Logo nav (`pdm_workspace_ui.brand`)

Sous `parts/config.json` → `pdm_workspace_ui.brand` :

| Champ | Défaut | Rôle |
| ----- | ------ | ---- |
| `firstWord` / `secondWord` | `Prompt` / `DeMerde` | Les deux mots collés du logo |
| `firstWordColor` / `secondWordColor` | `""` | Hex `#RGB` / `#RRGGBB` ; vide = couleurs du thème (mot 1 neutre, mot 2 accent) |
| `showExtension` | `true` | Si `true`, affiche l’extension (ex. `.com`) ; défaut plateforme = affichée |

Sans couleurs hex dans le profil, le thème pose `--nav-logo-word1` (texte) et `--nav-logo-word2` (accent) pour que les deux mots restent **toujours distincts** sur les 50 thèmes. Le profil JSON **prime** s’il renseigne des hex.

### 12.6 Limites (sécurité)


| Limite             | Valeur                    |
| ------------------ | ------------------------- |
| Archive ZIP import | ~5 Mo UI / ~20 Mo schéma  |
| Payload JSON total | ~8 Mo estimé              |
| `pdm_audio_blobs`  | max 50 refs, 50 Mo base64 |


### 12.7 Archives profil produites hors UI

Toute archive ZIP conforme au schéma (§7.2, **51** clés `pdm_*`) peut être importée via Options. Les matériaux de recherche éventuels utilisés pour **fabriquer** une archive restent hors de l’archive utilisateur.

Les livraisons successives d’une même fiche profil **conservent** les versions antérieures (fichiers distincts / itérations numérotées) : une nouvelle archive **n’écrase pas** les précédentes. Le nom de fichier porte la version applicative (`…-profile-vX.Y.Z.zip`). Après une montée de version de l’app, réimporter une archive à jour si l’ancienne refuse l’import (contrat schéma).

---

<a id="13-les-51-clés-pdm"></a>
## 13. Les 51 clés `pdm_*`

### En bref

Toutes les préférences exportables vivent dans l’objet `pdm-config`. Cet objet comporte **51 clés** `pdm_*` obligatoires, plus les métadonnées `version`, `type` et `exportedAt`. En preset maximal, la racine peut aussi porter `i18n` et `langs` ensemble. Les clés sont groupées ci-dessous par domaine. Le schéma machine [`pdm-config.schema.json`](../assets/config/pdm-config.schema.json) déclare la **même liste** que `CS.PDM_KEYS` dans `config-schema-core.js`.

### 13.1 Métadonnées export


| Clé          | Type         | Rôle                    |
| ------------ | ------------ | ----------------------- |
| `version`    | string       | semver app ex. `1.23.0` |
| `type`       | const        | toujours `pdm-config`   |
| `exportedAt` | ISO datetime | horodatage export       |


### 13.2 LLM et Ollama


| Clé                          | Rôle                       | Exemple / note                     |
| ---------------------------- | -------------------------- | ---------------------------------- |
| `pdm_provider`               | Identifiant provider       | `ollama`                           |
| `pdm_model`                  | Modèle actif Workspace     | `llama3.2`                         |
| `pdm_image_model`            | Modèle vision Ollama (liste curated) | `moondream` |
| `pdm_image_prompt`           | Consigne description / cartographie image | (défaut produit) |
| `pdm_ollama_url`             | URL moteur                 | `http://127.0.0.1:11434`           |
| `pdm_token_ollama`           | Bearer Ollama si configuré | exporté en clair — confirmation UI |
| `pdm_llm_temperature`        | Température                | `0` = défaut                       |
| `pdm_llm_max_tokens`         | Plafond tokens sortie      | `0` = défaut                       |
| `pdm_llm_timeout_sec`        | Timeout secondes           | défaut 1000                        |
| `pdm_llm_thinking_enabled`   | Afficher réflexion         | bool                               |
| `pdm_llm_thinking_max_chars` | Plafond réflexion          | `0` = illimité                     |
| `pdm_output_display_format`  | Format affichage OUTPUT    | `text`, `json`, `html` (défaut `text`) |


**Hors export** (sessionStorage) : `pdm_token_proxy` et `pdm_llm_direct_local` ne sont pas inclus dans l’archive.

### 13.3 Prompt système


| Clé                         | Rôle                            |
| --------------------------- | ------------------------------- |
| `pdm_system_prompt`         | Texte markdown consigne globale |
| `pdm_system_prompt_enabled` | Actif ou non                    |


### 13.4 Contextes `#Tag`


| Clé                                 | Rôle                                         |
| ----------------------------------- | -------------------------------------------- |
| `pdm_profiles`                      | Tableau `{ tag, text, active, synopsis, … }` |
| `pdm_context_position`              | `after_system` ou `before_system`            |
| `pdm_context_inject_header`         | En-tête injection contextes                  |
| `pdm_context_profile_line_template` | Template ligne profil dans injection         |


### 13.5 Génération assistée `#Tag`


| Clé                                        | Rôle                       |
| ------------------------------------------ | -------------------------- |
| `pdm_context_gen_system`                   | Prompt système de génération |
| `pdm_context_gen_user_intent`              | User template intention    |
| `pdm_context_gen_user_title`               | User template titre        |
| `pdm_context_gen_tag_intent_suffix`        | Suffix tag                 |
| `pdm_context_gen_forced_tag_system_suffix` | Suffix tag forcé           |
| `pdm_context_gen_retry_system_suffix`      | Retry system               |
| `pdm_context_gen_retry_user_suffix`        | Retry user                 |
| `pdm_context_gen_max_tokens`               | Max tokens gen             |
| `pdm_context_gen_temperature`              | Température gen            |
| `pdm_context_gen_retry_temperature`        | Température retry          |
| `pdm_context_gen_max_retries`              | Nombre retries             |
| `pdm_context_gen_json_schema`              | Schéma JSON contrainte gen |


Les spécifications de génération sont définies dans [`gen-prompt-specs.js`](../assets/js/gen-prompt-specs.js) (neuf entrées).

### 13.6 Profil et projet


| Clé                  | Rôle                                           |
| -------------------- | ---------------------------------------------- |
| `pdm_active_profile` | ID profil actif ex. `speech2texte`             |
| `pdm_project`        | Métadonnées projet (synopsis, branding export) |


### 13.7 Workspace session


| Clé                 | Rôle                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------- |
| `pdm_workspace`     | Brouillon `{ input, output, thinking, contextPanelOpen, inputSource, audioFileName }` |
| `pdm_workspace_ui`  | UI profil : `identity`, `texts`, et `brand` (logo nav deux mots + couleurs hex optionnelles) |
| `pdm_history_count` | Compteur nettoyages                                                                   |
| `pdm_clean_history` | Journal 100 entrées max — champs legacy + `trace` (matrice avant/après compression) |


### 13.8 Interface


| Clé            | Rôle                                 |
| -------------- | ------------------------------------ |
| `pdm_language` | Locale UI `fr`, `en`, …              |
| `pdm_theme`    | ID thème ex. `marron-day` (défaut Marron clair) |


Les cinquante identifiants de thème figurent dans `CS.THEME_IDS` (`config-schema-core.js`).

### 13.9 Dictée STT


| Clé                            | Rôle             |
| ------------------------------ | ---------------- |
| `pdm_stt_device_id`            | Micro            |
| `pdm_stt_engine`               | Moteur           |
| `pdm_stt_compute`              | `cpu` / `gpu`    |
| `pdm_stt_insert_at_cursor`     | bool             |
| `pdm_stt_delete_word_enabled`  | bool             |
| `pdm_stt_delete_word_shortcut` | combinaison      |
| `pdm_stt_delete_word_target`   | `end` / `cursor` |
| `pdm_stt_vosk_lang`            | Locale modèle Vosk (ex. `fr`, `en-us`) |


### 13.10 Audio


| Clé               | Rôle                                        |
| ----------------- | ------------------------------------------- |
| `pdm_audio_blobs` | Références aux enregistrements WebM (segments base64) |


### 13.11 Output JSON profil (protocole v2)

| Clé | Rôle |
|-----|------|
| `pdm_output_json_enabled` | Active enveloppe JSON Ollama (`format=schema`) |
| `pdm_output_json_schema` | Schéma racine (`output_{lang}`) |
| `pdm_output_json_key_pattern` | Pattern clé dynamique (défaut `output_{lang}`) |
| `pdm_output_json_value_schema` | Schéma valeur string (sans `minLength`/`maxLength`) |

Ces clés sont générées par `json-profile-creator.sh` (phase 10) lorsque `parts/output-schema.json` est présent. Au runtime, l’extraction et le freeform STT s’appliquent (voir §3.2.2).


---

### 13.0 Index des 51 clés (`CS.PDM_KEYS`)


| # | Clé |
|---:|---|
| 1 | `pdm_provider` |
| 2 | `pdm_model` |
| 3 | `pdm_image_model` |
| 4 | `pdm_image_prompt` |
| 5 | `pdm_system_prompt` |
| 6 | `pdm_system_prompt_enabled` |
| 7 | `pdm_profiles` |
| 8 | `pdm_language` |
| 9 | `pdm_theme` |
| 10 | `pdm_history_count` |
| 11 | `pdm_clean_history` |
| 12 | `pdm_workspace` |
| 13 | `pdm_stt_device_id` |
| 14 | `pdm_stt_engine` |
| 15 | `pdm_stt_compute` |
| 16 | `pdm_stt_insert_at_cursor` |
| 17 | `pdm_stt_delete_word_enabled` |
| 18 | `pdm_stt_delete_word_shortcut` |
| 19 | `pdm_stt_delete_word_target` |
| 20 | `pdm_stt_vosk_lang` |
| 21 | `pdm_context_position` |
| 22 | `pdm_ollama_url` |
| 23 | `pdm_llm_thinking_enabled` |
| 24 | `pdm_llm_thinking_max_chars` |
| 25 | `pdm_llm_temperature` |
| 26 | `pdm_llm_max_tokens` |
| 27 | `pdm_llm_timeout_sec` |
| 28 | `pdm_token_ollama` |
| 29 | `pdm_context_gen_system` |
| 30 | `pdm_context_gen_user_intent` |
| 31 | `pdm_context_gen_user_title` |
| 32 | `pdm_context_inject_header` |
| 33 | `pdm_context_gen_tag_intent_suffix` |
| 34 | `pdm_context_gen_forced_tag_system_suffix` |
| 35 | `pdm_context_gen_retry_system_suffix` |
| 36 | `pdm_context_gen_retry_user_suffix` |
| 37 | `pdm_active_profile` |
| 38 | `pdm_project` |
| 39 | `pdm_context_profile_line_template` |
| 40 | `pdm_context_gen_max_tokens` |
| 41 | `pdm_context_gen_temperature` |
| 42 | `pdm_context_gen_retry_temperature` |
| 43 | `pdm_context_gen_max_retries` |
| 44 | `pdm_context_gen_json_schema` |
| 45 | `pdm_output_json_enabled` |
| 46 | `pdm_output_json_schema` |
| 47 | `pdm_output_json_key_pattern` |
| 48 | `pdm_output_json_value_schema` |
| 49 | `pdm_output_display_format` |
| 50 | `pdm_audio_blobs` |
| 51 | `pdm_workspace_ui` |

---

<a id="14-namespaces-pdm"></a>
## 14. Namespaces `PDM.*`

| Namespace | Modules |
|-----------|---------|
| `PDM.App` | `app.js` |
| `PDM.Env` | `env.js` |
| `PDM.UI` | `ui.js` |
| `PDM.Storage` | `storage-*.js` |
| `PDM.ConfigSchema` | `config-schema-*.js` |
| `PDM.I18n` / `PDM.I18nLocales` | `i18n*.js` |
| `PDM.Themes` | `themes.js` |
| `PDM.LLM` / `PDM.Providers` | `llm.js`, `providers.js`, `ollama.js` |
| `PDM.ProxyTokenSession` | `proxy-token-session.js` |
| `PDM.Profiles` / `PDM.ProfileSelector` / `PDM.ProfileBundle*` | `profiles.js`, `profile-*.js` |
| `PDM.ContextGeneration` / `PDM.GenPromptSpecs` / `PDM.PromptCompress` | `context-generation.js`, `gen-prompt-specs.js`, `prompt-compress.js` |
| `PDM.Workspace*` / `PDM.InputChunk` | `workspace-*.js` |
| `PDM.STT` | `stt-*.js` |
| `PDM.Homepage` / `PDM.SeoMeta` / `PDM.Docs` | `homepage.js`, `seo-meta.js`, `docs-links.js` |
| `PDM.FooterProjects` | `footer-projects.js` |
| `PDM.AnimationInversion` / `PDM.AnimationSynopsis` | `animation-*.js` |

---

<a id="15-inventaire-javascript"></a>
## 15. Inventaire JavaScript

Le total s’élève à **131** fichiers `assets/js/*.js` versionnés (hors vendor). Les rôles ci-dessous reprennent le synopsis source de chaque module (pas le seul nom de fichier).

<details>
<summary><strong>Inventaire JavaScript (131 fichiers)</strong> — cliquer pour développer</summary>

### 15.1 Coque / bootstrap

| Fichier | Rôle |
|---|---|
| [`app.js`](../assets/js/app.js) | Point d'entrée SPA : routage hash, initialisation et navigation globale. |
| [`bootstrap.js`](../assets/js/bootstrap.js) | Chargeur dynamique des scripts listés par lib/env/env.php. |
| [`env.js`](../assets/js/env.js) | Client de configuration serveur (GET lib/env/env.php). |

### 15.2 config-schema

| Fichier | Rôle |
|---|---|
| [`config-schema-build.js`](../assets/js/config-schema-build.js) | Normalisation import et construction de la config pdm-config par défaut. |
| [`config-schema-core.js`](../assets/js/config-schema-core.js) | Constantes schéma pdm-config, clés et valeurs par défaut. |
| [`config-schema-helpers.js`](../assets/js/config-schema-helpers.js) | Helpers de type, validation et normalisation atomique (projet, audio, workspace UI). |
| [`config-schema-sanitize.js`](../assets/js/config-schema-sanitize.js) | Sanitization HTML pour champs pdm_workspace_ui (sécurité JSON v2). |
| [`config-schema-security.js`](../assets/js/config-schema-security.js) | Limites taille, anti pollution prototype et contrôles import JSON v2. |
| [`config-schema-validate-collections.js`](../assets/js/config-schema-validate-collections.js) | Validation des collections de pdm-config (profils, workspace, historique). |
| [`config-schema-validate-fields.js`](../assets/js/config-schema-validate-fields.js) | Validation des champs scalaires et de l'UI workspace de pdm-config. |
| [`config-schema-validate-gen-prompts.js`](../assets/js/config-schema-validate-gen-prompts.js) | Validation de parts/gen-prompts.json (index des prompts LLM de génération de prompts de contexte). |
| [`config-schema-validate-locales.js`](../assets/js/config-schema-validate-locales.js) | Validation de parts/locales.json (source unique des locales de prompts). |
| [`config-schema-validate-prompts.js`](../assets/js/config-schema-validate-prompts.js) | Validation de parts/prompts.json (index Markdown des prompts par locale). |
| [`config-schema-validate.js`](../assets/js/config-schema-validate.js) | Validateur strict du format pdm-config complet — orchestrateur. |

### 15.3 workspace

| Fichier | Rôle |
|---|---|
| [`workspace-audio-bind.js`](../assets/js/workspace-audio-bind.js) | Bindings import audio/vidéo Workspace (bouton discret, transcription Whisper Maxi locale). |
| [`workspace-audio-mode.js`](../assets/js/workspace-audio-mode.js) | Bascule mode fichier audio/vidéo du Workspace (statut, readonly temporaire). |
| [`workspace-bind.js`](../assets/js/workspace-bind.js) | Bindings UI écran Workspace. |
| [`workspace-dictation-audio-export.js`](../assets/js/workspace-dictation-audio-export.js) | Encodage et téléchargement de l'audio de dictée (WebM/WAV/ZIP). |
| [`workspace-dictation-audio.js`](../assets/js/workspace-dictation-audio.js) | Gestion interface et persistance audio dictée WebM — cœur. |
| [`workspace-image-bind.js`](../assets/js/workspace-image-bind.js) | Import image Workspace → description via modèle vision Ollama. |
| [`workspace-image-encode.js`](../assets/js/workspace-image-encode.js) | Encode / redimensionne une image pour l’API vision Ollama. |
| [`workspace-inference.js`](../assets/js/workspace-inference.js) | Orchestration Nettoyer : assemblage prompts, multi-pass, stream Ollama. |
| [`workspace-input-chunk.js`](../assets/js/workspace-input-chunk.js) | Découpe INPUT long pour inférence LLM sans toucher au STT. |
| [`workspace-input-tools.js`](../assets/js/workspace-input-tools.js) | État unifié des boutons de la zone saisie Workspace. |
| [`workspace-llm-config.js`](../assets/js/workspace-llm-config.js) | Configuration LLM workspace. |
| [`workspace-llm-options.js`](../assets/js/workspace-llm-options.js) | Panneau Options LLM extensible (strip Output). |
| [`workspace-output-format.js`](../assets/js/workspace-output-format.js) | Format d’affichage OUTPUT / réflexion (texte \| JSON \| HTML + stubs). Canonique = texte brut (sans enveloppe). La réponse modèle peut rester en JSON. |
| [`workspace-persistence.js`](../assets/js/workspace-persistence.js) | Persistance brouillon workspace et guards prompt. |
| [`workspace-refresh.js`](../assets/js/workspace-refresh.js) | Rafraîchissement écran Workspace. |
| [`workspace-stream.js`](../assets/js/workspace-stream.js) | Rendu streaming et panneau thinking. |
| [`workspace-thinking.js`](../assets/js/workspace-thinking.js) | Panneau réflexion (thinking) pendant Nettoyer. |
| [`workspace-tts-download.js`](../assets/js/workspace-tts-download.js) | Moteur d'export Text-to-Speech Workspace (V2 / AV2). |
| [`workspace-ui-profile.js`](../assets/js/workspace-ui-profile.js) | Personnalisation UI Workspace depuis pdm_workspace_ui. |

### 15.4 storage

| Fichier | Rôle |
|---|---|
| [`storage-audio-blobs.js`](../assets/js/storage-audio-blobs.js) | Stockage local des fichiers audio importés (IndexedDB). |
| [`storage-config-audio.js`](../assets/js/storage-config-audio.js) | Export/import asynchrone des blobs audio (dictée) dans pdm-config. |
| [`storage-config-import.js`](../assets/js/storage-config-import.js) | Import pdm-config (validation, wipe, application) et bundle profil. |
| [`storage-config-io.js`](../assets/js/storage-config-io.js) | Export/import JSON pdm-config (cœur) et profils personnels. |
| [`storage-core.js`](../assets/js/storage-core.js) | Primitives localStorage et constantes de clés pdm_. |
| [`storage-history.js`](../assets/js/storage-history.js) | Historique nettoyages, migration session et purge données. |
| [`storage-llm-settings.js`](../assets/js/storage-llm-settings.js) | Réglages Ollama, thinking, température, tokens, timeout. |
| [`storage-profile-meta.js`](../assets/js/storage-profile-meta.js) | Profil actif, projet, synopsis, workspace UI, langue, thème. |
| [`storage-prompt-fields.js`](../assets/js/storage-prompt-fields.js) | Champs prompts context-gen et output JSON. |
| [`storage-prompts-bundle.js`](../assets/js/storage-prompts-bundle.js) | Stockage local des prompts système + contextes par locale et par profil.. |
| [`storage-settings.js`](../assets/js/storage-settings.js) | Point d’entrée réglages Storage (modules wipe/prompts/meta/llm). |
| [`storage-wipe.js`](../assets/js/storage-wipe.js) | Wipe données utilisateur, tokens provider et caches navigateur PDM. |
| [`storage-workspace-audio.js`](../assets/js/storage-workspace-audio.js) | Extension brouillon Workspace pour l'import audio (métadonnées + audioRef). |
| [`storage-workspace-stt.js`](../assets/js/storage-workspace-stt.js) | Persistance brouillon workspace et réglages dictée vocale. |

### 15.5 stt

| Fichier | Rôle |
|---|---|
| [`stt-audio-processor.js`](../assets/js/stt-audio-processor.js) | AudioWorklet de capture micro pour dictée STT. |
| [`stt-core.js`](../assets/js/stt-core.js) | Cœur STT : état moteur, ordre des engines, helpers de langue et progression de charge. |
| [`stt-dictation-recorder.js`](../assets/js/stt-dictation-recorder.js) | Enregistrement parallèle WebM pendant la dictée STT. |
| [`stt-disruptive.js`](../assets/js/stt-disruptive.js) | Garde dictée avant actions disruptives (reload, stop forcé). |
| [`stt-init.js`](../assets/js/stt-init.js) | Initialisation / refresh STT : détection support moteur et états UI (unsupported, idle…). |
| [`stt-options-panel.js`](../assets/js/stt-options-panel.js) | Panneau Options dictée extensible (strip Input). |
| [`stt-parakeet-config.js`](../assets/js/stt-parakeet-config.js) | Constantes Parakeet (sample rate, chemins WASM, configs modèle, regex tokens spéciaux). |
| [`stt-parakeet-decode.js`](../assets/js/stt-parakeet-decode.js) | Décodage Parakeet : pipeline audio, jointure de mots horodatés, sanitization du texte. |
| [`stt-parakeet-engine.js`](../assets/js/stt-parakeet-engine.js) | Moteur Parakeet : démarrage/arrêt stream, generations anti-stale, orchestration model+decode. |
| [`stt-parakeet-model.js`](../assets/js/stt-parakeet-model.js) | Chargement / pool modèles Parakeet (ONNX), progression download et unload. |
| [`stt-parakeet.js`](../assets/js/stt-parakeet.js) | Point d'entrée bootstrap — réexporte le module engine. |
| [`stt-permissions.js`](../assets/js/stt-permissions.js) | Permissions micro STT : blocage LAN HTTP, hints Chromium, notifs d’autorisation. |
| [`stt-preload.js`](../assets/js/stt-preload.js) | Préchargement du moteur STT choisi (Options → Charger le moteur) sans démarrer la dictée. |
| [`stt-shared-audio.js`](../assets/js/stt-shared-audio.js) | Capture micro AudioWorklet/ScriptProcessor. |
| [`stt-shared-beep.js`](../assets/js/stt-shared-beep.js) | Bips Web Audio (start/stop/avertissement) pour la dictée. |
| [`stt-shared-core.js`](../assets/js/stt-shared-core.js) | Constantes STT et registre moteurs. |
| [`stt-shared-gpu.js`](../assets/js/stt-shared-gpu.js) | Sonde GPU et backends ONNX. |
| [`stt-shared-permissions.js`](../assets/js/stt-shared-permissions.js) | Permissions micro et erreurs. |
| [`stt-shared-progress.js`](../assets/js/stt-shared-progress.js) | Progression chargement et barres statut. |
| [`stt-shared-support.js`](../assets/js/stt-shared-support.js) | Compatibilité navigateur et bypass LAN. |
| [`stt-shared-text.js`](../assets/js/stt-shared-text.js) | Session texte dictée interim/final, éditable en temps réel. |
| [`stt-ui.js`](../assets/js/stt-ui.js) | UI STT : badges, libellés moteur, liaison Storage modèle / device. |
| [`stt-vosk-catalog.js`](../assets/js/stt-vosk-catalog.js) | Manifest runtime des modèles Vosk mini (assets/stt/vosk/catalog.json).. |
| [`stt-vosk-engine.js`](../assets/js/stt-vosk-engine.js) | Factory moteurs Vosk Mini/Maxi. |
| [`stt-vosk-model.js`](../assets/js/stt-vosk-model.js) | Chargement modèles Vosk (WASM, cache tar.gz). |
| [`stt-whisper-config.js`](../assets/js/stt-whisper-config.js) | Constantes et configuration dtype Whisper Mini/Maxi. |
| [`stt-whisper-decode.js`](../assets/js/stt-whisper-decode.js) | VAD, nettoyage transcript et pipeline live Whisper. |
| [`stt-whisper-engine.js`](../assets/js/stt-whisper-engine.js) | Factory moteurs Whisper Mini/Maxi (point d'entrée module). |
| [`stt-whisper-file-chunk.js`](../assets/js/stt-whisper-file-chunk.js) | Découpage d'un PCM long en segments transcrits séquentiellement. |
| [`stt-whisper-file-decode.js`](../assets/js/stt-whisper-file-decode.js) | Décodage d'un fichier audio ou vidéo en PCM mono 16 kHz (100 % navigateur). |
| [`stt-whisper-file-run.js`](../assets/js/stt-whisper-file-run.js) | Transcription d'un fichier audio ou vidéo via Whisper Maxi (même moteur que la dictée). |
| [`stt-whisper-file.js`](../assets/js/stt-whisper-file.js) | Point d'entrée import audio — branche la façade publique. |
| [`stt-whisper-model.js`](../assets/js/stt-whisper-model.js) | État pools, chargement et déchargement modèles Whisper. |
| [`stt-whisper-worker-bridge.js`](../assets/js/stt-whisper-worker-bridge.js) | Pont Worker Whisper (URL, handlers, transcription). |
| [`stt-whisper-worker.js`](../assets/js/stt-whisper-worker.js) | Web Worker d'inférence Whisper hors thread principal. |
| [`stt-whisper.js`](../assets/js/stt-whisper.js) | Point d'entrée bootstrap — réexporte le module engine et l'import audio. |

### 15.6 profile

| Fichier | Rôle |
|---|---|
| [`profile-bundle-assemble.js`](../assets/js/profile-bundle-assemble.js) | Assemblage fichiers → pdm-config. |
| [`profile-bundle-export-build.js`](../assets/js/profile-bundle-export-build.js) | Assemblage filemap export sync/async. |
| [`profile-bundle-export-keys.js`](../assets/js/profile-bundle-export-keys.js) | Clés session/config et indices MD export ZIP. |
| [`profile-bundle-export-parts.js`](../assets/js/profile-bundle-export-parts.js) | Cache parts bundlés pour export multi-locale. |
| [`profile-bundle-export.js`](../assets/js/profile-bundle-export.js) | Packaging ZIP export profil (blob, checksum package). |
| [`profile-bundle-integrity.js`](../assets/js/profile-bundle-integrity.js) | Intégrité SHA-256 des archives ZIP profil (octets). |
| [`profile-bundle-io.js`](../assets/js/profile-bundle-io.js) | Chargement ProfileBundle depuis URL ou ZIP. |
| [`profile-bundle-loader.js`](../assets/js/profile-bundle-loader.js) | Point d’entrée ProfileBundle (paths / assemble / io). |
| [`profile-bundle-paths.js`](../assets/js/profile-bundle-paths.js) | Chemins, locales et fetch helpers ProfileBundle. |
| [`profile-output-json.js`](../assets/js/profile-output-json.js) | Parse et rend les sorties JSON profil (protocole v2 — clé dynamique output_{lang}).. |
| [`profile-selector-actions.js`](../assets/js/profile-selector-actions.js) | Actions Profil JSON — résolution, import, enregistrement et création. |
| [`profile-selector-export-modal-flags.js`](../assets/js/profile-selector-export-modal-flags.js) | Locales, drapeaux et estimation taille export. |
| [`profile-selector-export-modal-state.js`](../assets/js/profile-selector-export-modal-state.js) | Résumé et presets de la modale d’export. |
| [`profile-selector-export-modal.js`](../assets/js/profile-selector-export-modal.js) | Ouverture / liaison événements modale d’export ZIP. |
| [`profile-selector-export.js`](../assets/js/profile-selector-export.js) | Orchestration export ZIP Profil JSON. |
| [`profile-selector-labels.js`](../assets/js/profile-selector-labels.js) | Libellés, slugs et téléchargements Profil JSON. |
| [`profile-selector.js`](../assets/js/profile-selector.js) | Sélecteur Options Profil JSON (bundle assets/profiles/) — cœur. |
| [`profiles.js`](../assets/js/profiles.js) | Gestion CRUD des prompts de contexte (#PascalCase). |


### 15.7 Prompts UI, génération et compression

| Fichier | Rôle |
|---|---|
| [`context-generation.js`](../assets/js/context-generation.js) | Prompts LLM pour fabriquer des prompts de contexte (#Tag). |
| [`gen-prompt-specs.js`](../assets/js/gen-prompt-specs.js) | Liste canonique des 9 specs de génération de prompts de contexte (id, clés session, fichiers MD). |
| [`prompt-compress.js`](../assets/js/prompt-compress.js) | Compression de tokens (system, contextes, Input, Output) au clic Nettoyer. |
| [`prompts-ui-generate.js`](../assets/js/prompts-ui-generate.js) | Création/génération de contextes (onglet Prompts). |
| [`prompts-ui-list.js`](../assets/js/prompts-ui-list.js) | Liste des contextes (onglet Prompts) — rendu, réordonnancement, DnD. |
| [`prompts-ui.js`](../assets/js/prompts-ui.js) | UI onglet Prompts — cœur (prompt système, contextes, bindings). |

### 15.8 history

| Fichier | Rôle |
|---|---|
| [`history-trace.js`](../assets/js/history-trace.js) | Trace d’inférence (avant/après compression) pour pdm_clean_history. |
| [`history-ui-list.js`](../assets/js/history-ui-list.js) | Rendu de la liste des cartes d'historique (Workspace). |
| [`history-ui-modal.js`](../assets/js/history-ui-modal.js) | Modal plein écran d'une entrée d'historique LLM. |
| [`history-ui.js`](../assets/js/history-ui.js) | UI historique des nettoyages (Workspace et Prompts) — cœur. |

### 15.9 i18n

| Fichier | Rôle |
|---|---|
| [`i18n-apply-dom.js`](../assets/js/i18n-apply-dom.js) | Application DOM des traductions (data-i18n, IDs statiques, panneau STT). Charge après i18n.js (utilise PDM.I18n et PDM._I18nPriv). |
| [`i18n-locales.js`](../assets/js/i18n-locales.js) | Métadonnées des langues UI (drapeaux, RTL, locale des prompts). |
| [`i18n.js`](../assets/js/i18n.js) | Module i18n alimenté par assets/i18n/ui/ (projet) ou bundle user importé. |

### 15.10 themes

| Fichier | Rôle |
|---|---|
| [`themes.js`](../assets/js/themes.js) | 50 thèmes en 25 familles (clair/sombre), Cassé figé, tokens sémantiques. |

### 15.11 footer

| Fichier | Rôle |
|---|---|
| [`footer-projects.js`](../assets/js/footer-projects.js) | Carrousel auto des projets DreamProjectAI dans le footer. |
| [`footer-radar-portrait.js`](../assets/js/footer-radar-portrait.js) | Révélations aléatoires du portrait footer (sync radar, pause hors viewport). |

### 15.12 polish

| Fichier | Rôle |
|---|---|
| [`polish-textarea-resize.js`](../assets/js/polish-textarea-resize.js) | Poignée de redimensionnement custom pour les textarea. |
| [`polish.js`](../assets/js/polish.js) | Micro-interactions UI (scroll reveal, animations légères). |

### 15.13 autres

| Fichier | Rôle |
|---|---|
| [`animation-inversion.js`](../assets/js/animation-inversion.js) | Boucle header « Univers inversé » — chnek ↔ sniper, effets A–E aléatoires. |
| [`animation-synopsis.js`](../assets/js/animation-synopsis.js) | Saisie clavier simulée du synopsis profil dans le header terminal. |
| [`docs-links.js`](../assets/js/docs-links.js) | URL documentation technique GitHub selon la langue IHM (footer + redirects legacy). |
| [`homepage.js`](../assets/js/homepage.js) | Chargeur conditionnel du fragment landing marketing. |
| [`llm.js`](../assets/js/llm.js) | Façade générique PDM.LLM indépendante du provider. |
| [`ollama.js`](../assets/js/ollama.js) | Adaptateur provider Ollama (HTTP, streaming, UI). |
| [`providers.js`](../assets/js/providers.js) | Registry des adaptateurs LLM (Ollama, futurs providers). |
| [`proxy-token-session.js`](../assets/js/proxy-token-session.js) | Token proxy en sessionStorage (Options LLM uniquement, sans modale boot). |
| [`seo-meta.js`](../assets/js/seo-meta.js) | Stack meta SEO (OG, Twitter, keywords, canonical) synchronisée i18n + routes hash. |
| [`settings-ui.js`](../assets/js/settings-ui.js) | UI onglet Options (LLM, STT, thème, sauvegarde). |
| [`synopsis-resolve.js`](../assets/js/synopsis-resolve.js) | Résolution localisée du synopsis profil (i18n + manifest fallback). |
| [`ui.js`](../assets/js/ui.js) | Helpers DOM, notifications, modales et widgets communs. |

</details>


---

<a id="16-inventaire-css"></a>
## 16. Inventaire CSS

<details>
<summary><strong>Inventaire CSS (38 feuilles)</strong> — cliquer pour développer</summary>

| Fichier | Rôle |
|---|---|
| [`polish-a11y.css`](../assets/css/polish-a11y.css) | Accessibilité motion : honore prefers-reduced-motion. |
| [`polish-animation-inversion.css`](../assets/css/polish-animation-inversion.css) | Animation header « Univers inversé » (chnek ↔ sniper, effets A–E). |
| [`polish-animation-synopsis.css`](../assets/css/polish-animation-synopsis.css) | Animation header : typing simulé du synopsis profil. |
| [`polish-buttons.css`](../assets/css/polish-buttons.css) | Polish boutons : lift et glow au survol. |
| [`polish-cards.css`](../assets/css/polish-cards.css) | Effets de survol des cartes. |
| [`polish-copy.css`](../assets/css/polish-copy.css) | Feedback visuel de copie presse-papiers. |
| [`polish-cursor.css`](../assets/css/polish-cursor.css) | Curseur de saisie / typing. |
| [`polish-footer-donation.css`](../assets/css/polish-footer-donation.css) | Footer : styles du carrousel projets DreamProjectAI. |
| [`polish-footer-meta.css`](../assets/css/polish-footer-meta.css) | Footer : badges d’engagements produit. |
| [`polish-footer.css`](../assets/css/polish-footer.css) | Footer : navigation aérée et encart open source. |
| [`polish-hero.css`](../assets/css/polish-hero.css) | Polish de la démo / hero landing. |
| [`polish-history-audio.css`](../assets/css/polish-history-audio.css) | Historique : trace audio et lecteur. |
| [`polish-legal.css`](../assets/css/polish-legal.css) | Pages légales (mentions, CGU, privacy, support). |
| [`polish-loader.css`](../assets/css/polish-loader.css) | Overlay loader (spinner pulsé). |
| [`polish-notifications.css`](../assets/css/polish-notifications.css) | Toasts / notifications (slide-in). |
| [`polish-performance.css`](../assets/css/polish-performance.css) | Coupe les transitions coûteuses sur éléments statiques. |
| [`polish-pricing-badge.css`](../assets/css/polish-pricing-badge.css) | Polish des badges pricing. |
| [`polish-print.css`](../assets/css/polish-print.css) | Styles d’impression. |
| [`polish-responsive.css`](../assets/css/polish-responsive.css) | Ajustements responsive des polish. |
| [`polish-reveal.css`](../assets/css/polish-reveal.css) | Animations de révélation au scroll. |
| [`polish-scrollbar.css`](../assets/css/polish-scrollbar.css) | Scrollbar custom. |
| [`polish-skeleton.css`](../assets/css/polish-skeleton.css) | Skeleton loaders (keyframes). |
| [`polish-tags.css`](../assets/css/polish-tags.css) | Contraste des pastilles `#Tag` sur tous les thèmes. |
| [`polish-textarea-resize.css`](../assets/css/polish-textarea-resize.css) | Poignée custom de redimensionnement des textarea (avec JS). |
| [`polish-theme-swatch.css`](../assets/css/polish-theme-swatch.css) | Pastilles / swatches du sélecteur de thème. |
| [`polish-transitions.css`](../assets/css/polish-transitions.css) | Transitions de sections (fade) sans casser display block/none. |
| [`seo-static.css`](../assets/css/seo-static.css) | Pages SEO statiques `/seo/` et `sitemap.html`. |
| [`style-base.css`](../assets/css/style-base.css) | Tokens globaux (couleurs, typo, layout) et reset SPA. |
| [`style-components.css`](../assets/css/style-components.css) | Composants partagés (notifications de base, contrôles). |
| [`style-config.css`](../assets/css/style-config.css) | Écran / panneaux de configuration legacy. |
| [`style-landing.css`](../assets/css/style-landing.css) | Landing marketing (`#landing`). |
| [`style-layout.css`](../assets/css/style-layout.css) | Coque layout : sections génériques, grille, navigation. |
| [`style-pricing.css`](../assets/css/style-pricing.css) | Page / bloc pricing. |
| [`style-prompts.css`](../assets/css/style-prompts.css) | Écran Prompts (système, `#Tag`, générateurs). |
| [`style-responsive.css`](../assets/css/style-responsive.css) | Breakpoints et adaptations responsive de la coque. |
| [`style-settings.css`](../assets/css/style-settings.css) | Écran Options (`#settings`). |
| [`style-themes.css`](../assets/css/style-themes.css) | Bascules et variables liées aux thèmes. |
| [`style-workspace.css`](../assets/css/style-workspace.css) | Workspace : grille Input/Output, panneaux, outils. |

Les feuilles `style-*` structurent les écrans. Les feuilles `polish-*` portent les micro-interactions et l’accessibilité motion.
</details>

---

<a id="17-php-proxy-et-api"></a>
## 17. PHP, proxy et API

### En bref

Le volume PHP reste faible : il n’y a **pas** de logique métier LLM côté serveur. PHP assure le relais CORS, la liste des profils et la configuration d’environnement des scripts. L’assemblage de `pdm-config` reste entièrement dans le **navigateur**.

### 17.1 Fichiers


| Chemin                       | Rôle                               |
| ---------------------------- | ---------------------------------- |
| `lib/proxy/ollama/olama.php` | Relais POST Ollama                 |
| `lib/api/manifest.php`       | Liste profils + runtimeOk          |
| `lib/api/lib.php`            | Validation bundle profil catalogue |
| `lib/env/env.php`            | Config + whitelist scripts JS      |


### 17.2 Ce que PHP ne fait pas

- PHP ne parse pas l’import ZIP utilisateur.
- PHP ne stocke pas l’historique de nettoyage.
- PHP n’exécute pas la reconnaissance vocale (STT).

---


### 17.3 Fichiers PHP runtime

| Chemin | Rôle |
|--------|------|
| [`lib/api/lib.php`](../lib/api/lib.php) | Bibliothèque profils / helpers |
| [`lib/api/manifest.php`](../lib/api/manifest.php) | API liste des profils |
| [`lib/env/env.php`](../lib/env/env.php) | Config déploiement + scripts |
| [`lib/proxy/proxy.php`](../lib/proxy/proxy.php) | Shim proxy |
| [`lib/proxy/ollama/olama.php`](../lib/proxy/ollama/olama.php) | Relais CORS Ollama |

---

<a id="10-installation-auto-hébergée"></a>
<a id="18-installation-auto-hébergée-et-déploiement"></a>
## 18. Installation auto-hébergée et déploiement

### En bref

L’auto-hébergement repose sur un clone GitHub, un serveur PHP et Ollama. La restauration des modèles STT est **obligatoire** après clone. Ollama tourne sur la machine du navigateur ou sur le réseau local. Le badge du footer affiche AUTO-HÉBERGÉ, PRÉ-PROD ou PROD selon `PDM_ENV`.

### 18.1 Prérequis


| Composant  | Version                                 |
| ---------- | --------------------------------------- |
| PHP        | 7.4+                                    |
| Serveur    | Apache ou Nginx + PHP-FPM               |
| Ollama     | [ollama.ai](https://ollama.ai/download) |
| Navigateur | Chrome/Edge recommandé pour STT GPU     |


### 18.2 Étapes

```bash
git clone https://github.com/JeanSebastienBash/promptdemerde.git
cd promptdemerde/install
bash restore-large-assets.sh
ollama pull llama3.2
```

La racine du dépôt est déployée sur le vhost, puis l’application s’ouvre via `http://localhost/.../`.

### 18.3 Profil au premier lancement

Au premier lancement, le profil officiel **Speech2Texte** (`speech2texte`) est chargé depuis le bundle versionné `assets/profiles/speech2texte/`. D’autres profils s’ajoutent via import ZIP (export perso ou profil obtenu hors clone).

<a id="deploy-pdm-env-badges"></a>

### 18.4 Déploiement — `PDM_ENV`, badges, token

**En bref.** Ni `PDM_ENV` ni le token proxy ne sont **obligatoires** pour faire tourner un clone. Ils servent à **nommer** l’environnement (badge footer) et à **durcir** le relais PHP en production officielle. Les visiteurs de promptdemerde.com utilisent le **flux A** (Ollama direct, sans token).

#### `PDM_ENV` (Apache, facultatif)

La valeur est lue par `pdm_resolve_deployment()` dans [`lib/api/lib.php`](../lib/api/lib.php) :


| Valeur                 | Badge `#footer-env-badge` | Usage type                             |
| ---------------------- | ------------------------- | -------------------------------------- |
| `prod`                 | **PROD**                  | promptdemerde.com VPS                  |
| `preprod` / `pre-prod` | **PRÉ-PROD**              | Pré-production maintainer              |
| *(absent)*             | **AUTO-HÉBERGÉ**          | Clone GitHub, localhost, domaine perso |


**Pourquoi la déclarer ?** Elle influence CORS proxy, rate-limit, messages d’erreur et anti-listing pré-prod — voir [`SECURITY.md`](../SECURITY.md). Elle n’est **pas obligatoire** pour développer ou auto-héberger.

Exemple Apache (`/etc/apache2/envvars` + `PassEnv`) :

```bash
export PDM_ENV=prod
export PDM_PROXY_TOKEN="secret-aleatoire"
```

```apache
# /etc/apache2/conf-available/pdm-env.conf
PassEnv PDM_ENV
PassEnv PDM_PROXY_TOKEN
```

Sans `PDM_ENV` sur un vhost de test, le comportement **AUTO-HÉBERGÉ** est le comportement attendu.

#### Token proxy (`PDM_PROXY_TOKEN`)


| Flux                  | Token ?                 | Qui                             |
| --------------------- | ----------------------- | ------------------------------- |
| **A** — direct Ollama | Non                     | Visiteurs prod, auto-hébergeurs |
| **B** — `olama.php`   | Oui (session opérateur) | Maintainer prod, IP allowlistée |


- Dans l’UI, la case **« Je n'ai pas de token »** active le flux A (`shouldUseDirectOllama()`).
- Le stockage du token proxy utilise `sessionStorage` (`pdm_token_proxy`) et reste **hors export ZIP**.
- Pour un visiteur en production, Ollama doit déclarer `OLLAMA_ORIGINS=https://promptdemerde.com` ; le token Apache n’est pas requis dans ce flux.

---

<a id="19-sécurité-import-et-limites"></a>
## 19. Sécurité import et limites

### En bref

> [!WARNING]
> L’import ZIP constitue une surface XSS locale (HTML workspace sous allowlist), un risque de DoS client via un gros JSON, et un risque de vol du token Ollama si l’archive est tierce.

Les mitigations comprennent la sanitize, les limites de taille, le strip des tokens et une dialog de confirmation. Le détail figure dans [`SECURITY.md`](../SECURITY.md).

### 19.1 Mesures clés

- La allowlist `promptGuardHtml` est définie dans `config-schema-sanitize.js`.
- Les motifs `<script`, `javascript:` et les clés de pollution de prototype sont rejetés.
- L’import UI n’accepte que `.zip` : un JSON seul est refusé (`importJsonDeprecated`).

---

<a id="20-assets-profils-stt-et-vendor"></a>
## 20. Assets profils, STT et vendor

### 20.1 Profils

| Élément | Chemin |
|---------|--------|
| Catalogue | [`assets/profiles/index.json`](../assets/profiles/index.json) |
| Profil bundlé | [`assets/profiles/speech2texte/`](../assets/profiles/speech2texte/) |
| Doc | [`assets/profiles/README.md`](../assets/profiles/README.md) |

### 20.2 STT

Les modèles STT sont rangés sous `assets/stt/vosk/`, `vosk-mini/`, `vosk-maxi/`, `whisper-mini/`, `whisper-maxi/` et `parakeet/`. La documentation de zone est [`assets/stt/README.md`](../assets/stt/README.md). Les binaires lourds se restaurent avec `install/restore-large-assets.sh`.

### 20.3 Vendor et notices

Les dépendances embarquées sont décrites dans [`assets/js/vendor/README.md`](../assets/js/vendor/README.md) et [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md).

### 20.4 Polices

Les polices locales (Fira Code, Inconsolata, Space Grotesk, Archivo Black, Anton, licences OFL) se trouvent sous `assets/fonts/`.

---

<a id="21-glossaire-et-références-croisées"></a>
## 21. Glossaire et références croisées

| Terme | Sens |
|-------|------|
| Prompt système | Consigne globale (`pdm_system_prompt`) |
| Prompt de contexte (`#Tag`) | Entrée de `pdm_profiles[]` |
| Générateur de prompts de contexte | Spec + UI de fabrication de `#Tag` |
| Flux A | Navigateur → Ollama localhost |
| Flux B | Navigateur → `olama.php` → Ollama |
| `pdm-config` | Objet des 51 clés + métadonnées d’export |

### Documents liés

| Document | Rôle |
|----------|------|
| [`README.md`](../README.md) / [`README.fr.md`](../README.fr.md) | Accroche produit |
| [`SECURITY.md`](../SECURITY.md) | Proxy, CSP, import |
| [`CONTRIBUTING.md`](../CONTRIBUTING.md) | Contribution |
| [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md) | Licences vendor |
| [`DOCUMENTATION-TECHNIQUE.en.md`](DOCUMENTATION-TECHNIQUE.en.md) | Version anglaise |

---

<a id="22-dépannage-rapide"></a>
## 22. Dépannage rapide

| Problème | Piste |
|----------|-------|
| Nettoyage bloqué / sortie vide | Prompt système ou `#Tag` actif trop restrictif ; tester avec moins de contextes |
| Ollama ne répond pas | `ollama list` ; URL dans Options → LLM ; bouton **Tester** |
| `Failed to fetch` / CORS (prod) | Configurer `OLLAMA_ORIGINS=https://promptdemerde.com` puis redémarrer Ollama — [§11.1](#11-ollama-flux-a-et-flux-b) |
| Token non renseigné | Flux B uniquement : décocher « Je n'ai pas de token », saisir le token dans Options → LLM |
| Dictée peu fidèle | Vosk Maxi (Linux) ou Whisper / Parakeet si WebGPU OK — [§8.5](#85-dépannage-stt) |
| Micro bloqué | HTTPS ou `http://localhost` — [§8.3](#83-contexte-sécurisé-et-permission-micro) |
| Données perdues après wipe / changement de profil | Exporter le ZIP profil avant ; l’historique vit dans `pdm_clean_history` (exportable) |

---

<a id="licence"></a>
## Licence

MIT — voir [`LICENSE`](../LICENSE).

---

*Documentation technique — version applicative 1.23.0.*
