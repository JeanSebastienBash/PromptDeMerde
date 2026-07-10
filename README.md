# PromptDeMerde.com

> **Synopsis** : Guide utilisateur du dépôt open source PromptDeMerde (installation, usage, STT, export JSON).

> **Objectif** : Permettre à quiconque d'installer et utiliser l'outil localement sans compte ni télémétrie.

> Collez, corrigez à la volée, envoyez — avec ou sans dictée vocale.

**Version** : `1.11.0`

# Documentation mainteneurs : voir [Architecture (contributeurs)](#architecture-contributeurs), Documentation intégrée (`#documentation`) et [`assets/config/pdm-config.schema.json`](assets/config/pdm-config.schema.json)

**Dépôt officiel** : [github.com/JeanSebastienBash/promptdemerde](https://github.com/JeanSebastienBash/promptdemerde/)

**PromptDeMerde.com** est une application web **100 % locale** : open source, auto-hébergée, **sans base de données**, **sans compte**, **sans télémétrie**. Rien n'est **conservé** côté serveur après vos requêtes — uniquement dans votre navigateur, avec sauvegarde portable en **export JSON**. Le traitement linguistique s'appuie sur **[Ollama](https://ollama.ai/download)** installé en amont sur votre machine ; la dictée vocale (optionnelle) propose **Vosk Mini/Maxi**, **Whisper Mini/Maxi** et **Parakeet**.

**Usage principal** : saisissez ou collez votre texte dans le Workspace, ajustez-le si besoin, puis lancez le nettoyage afin de **reformuler vos instructions en prompts clairs**. La dictée vocale reste un complément facultatif.

**Usage secondaire** : le prompt système peut être activé, désactivé ou entièrement réécrit ; les prompts de contexte se configurent librement et s'activent à la carte. Vous pouvez ainsi **orienter l'outil vers des besoins détournés**, entièrement personnalisables — autre ton, autre format, autre domaine ou autre logique de reformulation — sans toucher au code source.

### Confidentialité et données

- **Aucune base de données**, aucun compte, **aucune télémétrie** (pas d'analytics, pas de tracking).
- **Rien n'est conservé sur le serveur** après vos requêtes : le proxy PHP ([`lib/proxy/ollama/olama.php`](lib/proxy/ollama/olama.php)) relaie vers le moteur LLM **sans persistance** (pas de session PHP, pas d'écriture disque applicative).
- **Transit LLM** : lors d'un nettoyage, votre texte, le prompt système et les contextes actifs **traversent** le proxy en mémoire (POST `api/chat`) pour joindre Ollama — puis la requête se termine. Rien n'est archivé côté serveur.
- Options, historique et brouillons : **uniquement dans le navigateur** (`localStorage`).
- **Sauvegardes** : export/import JSON (*Options → Sauvegarde & restauration*) — seul mécanisme de backup.
- LLM via **Ollama** sur votre machine ou votre réseau ; dictée vocale **dans le navigateur**.

> **Promesse produit** : aucune **conservation** serveur — pas « le serveur ne voit jamais vos textes ». Le code est open source et auditable ; l'auto-hébergement offre le contrôle maximal de l'infrastructure.

Projet open source par [DreamProjectAI](https://dreamproject.online) — code sur [GitHub](https://github.com/JeanSebastienBash/promptdemerde/).

---

## Versions récentes

### v1.11.0 (Juillet 2026) — Personnalisation UI Workspace par profil

**Nouvelles fonctionnalités :**
- Clé export/import **`pdm_workspace_ui`** : identité (`username@hostname`), marque header, textes Workspace (placeholders, boutons, notifications, guards)
- Section **`workspace_ui`** dans chaque `meta.json` de profil ; assemblage via `assemble.php`
- Module **`PDM.WorkspaceUi`** (`workspace-ui-profile.js`) : application DOM + `syncFromActiveProfile()` au boot
- **`workspace_input`** du `meta.json` = exemple en **placeholder** (champ Input vide au chargement profil)

**Périmètre :** écran Workspace uniquement (homepage, Options, Prompts hors scope).

### v1.10.0 (Juillet 2026) — Enregistrement dictée WebM

**Nouvelles fonctionnalités :**
- **Enregistrement automatique** des dictées vocales en format WebM pendant la transcription
- **Multi-segments** : dictées successives regroupées dans un même enregistrement
- **Bouton téléchargement** discret (⬇) dans les outils de saisie après dictée
- **Export intelligent** : segment unique → WebM direct, multi-segments → archive ZIP + transcription
- **Persistance locale** : blobs stockés en IndexedDB avec nettoyage automatique
- **Export/import JSON** étendu avec `pdm_audio_blobs` (Base64) pour enregistrements de dictée

**Améliorations techniques :**
- Nouveau `inputSource: 'audio-dictation'` dans le schéma v1.10.0
- Badge 🎙️ spécialisé dans l'historique pour les dictées enregistrées
- Architecture modulaire : `stt-dictation-recorder.js` + `workspace-dictation-audio.js`
- Patch non-invasif du pipeline STT existant (`MediaRecorder` parallèle)
- Support multi-segments avec compteur et métadonnées détaillées

---

## À qui s'adresse cet outil ?

- Vous avez un prompt brouillon (collé, tapé ou dicté) et voulez le **nettoyer avant** de l'envoyer à un LLM.
- Vous voulez **corriger à la volée** le texte dans le Workspace — qu'il vienne du presse-papiers ou du micro — avant de cliquer sur Nettoyer.
- Vous cherchez une solution qui fonctionne sur **Windows, macOS, Linux** (et dans un navigateur récent sur mobile).
- Vous souhaitez une installation **locale** avec **Ollama**, sans compte ni abonnement.
- *(Optionnel)* Vous préférez parler plutôt que taper : la dictée est disponible, mais ce n'est pas le cœur du produit.

---

## Démarrage rapide

**Prérequis :** [Ollama](https://ollama.ai/download) installé sur la machine qui exécutera les modèles.

1. **Cloner le dépôt officiel** :
   ```bash
   git clone https://github.com/JeanSebastienBash/promptdemerde.git
   cd promptdemerde
   ```
2. Télécharger un modèle Ollama, par exemple :
   ```bash
   ollama pull llama3.2
   ```
3. **Déployer** sur un serveur web avec PHP 7.4+ (Apache, Nginx + PHP-FPM) ou ouvrir via `http://localhost/...`.
4. Configurer l'URL Ollama dans *Options → Intelligence artificielle*, choisir le modèle dans le **Workspace**, puis lancer un nettoyage. Si aucun modèle n'est encore défini, le **premier modèle Ollama disponible** est sélectionné automatiquement au premier usage (réflexion désactivée dans ce cas).

L'URL Ollama par défaut est `http://localhost:11434`. Les requêtes passent par [`lib/proxy/ollama/olama.php`](lib/proxy/ollama/olama.php) uniquement en relais technique ; **aucune donnée n'y est stockée**.

> **Badge PRÉ-PROD** : visible dans le pied de page lorsque le serveur n'est pas en production (`PDM_ENV` ≠ `prod` dans Apache).

> **Logo nav** : l'extension `.com` n'apparaît dans le header que sur les déploiements officiels (pré-prod / prod, `features.brandNavExtension` via `env.php`). Sur un clone GitHub sans `env.php`, elle reste masquée dans la nav mais **conservée dans le footer**.

> **Note profils** : le dépôt GitHub ne contient pas non plus le bundle profils (`assets/profiles/`). Lorsque `assets/profiles/manifest.json` est présent sur disque, un sélecteur **Profil JSON** apparaît dans le header — options lues dynamiquement depuis ce manifest via `lib/api/manifest.php` (pas de liste figée dans le JS). Les prompts système et de contexte y sont stockés en **Markdown** éditables à la main ; le serveur les assemble en `pdm-config` à la demande. Sur un clone GitHub sans bundle profils : comportement intégré Speech2Texte par défaut côté stockage (`speech2texte`).

> **Poids du clone** : les modèles STT sous `assets/stt/` représentent ~640 Mo. L'encodeur Parakeet (`encoder-model.int4.onnx`, ~373 Mo) est **gitignoré** — après clone, exécutez `bash assets/stt/parakeet/restore-encoder.sh` si vous utilisez Parakeet.

> **Sécurité déploiement** : voir [`SECURITY.md`](SECURITY.md) (proxy Ollama, token `PDM_PROXY_TOKEN`, rate-limit, prod Internet).


---

## Bundle profils (Profil JSON)

Lorsque le fichier `assets/profiles/manifest.json` est **présent sur disque** (local maintainer, pré-prod, prod — indépendamment de `PDM_ENV`), un **sélecteur Profil JSON** s'affiche à droite de la ligne `$ chnek@promptdemerde:~#` dans le header.

### Alimentation du sélecteur (dynamique, index `manifest.json`)

Le sélecteur **n'est pas figé dans le JavaScript** : au chargement, `profile-selector.js` interroge `lib/api/manifest.php`, qui renvoie le contenu de `assets/profiles/manifest.json`. Les `<option>` du `<select id="profile-selector">` sont construites à partir du tableau `profiles` (`id` → valeur, `label` → libellé affiché).

| Comportement | Détail |
|--------------|--------|
| **Liste du sélecteur** | Index explicite `manifest.json` — **pas** de scan automatique des sous-dossiers de `assets/profiles/` |
| **Contenu d'un profil** | Lu dynamiquement depuis `assets/profiles/<id>/` (`meta.json`, `system.md`, `contexts/*.md`) via `lib/api/assemble.php` |
| **Validation serveur** | Seuls les `id` déclarés dans `manifest.json` sont acceptés (`pdm_validate_profile_id`) |
| **Profil par défaut** | Entrée avec `"default": true` dans le manifest si `pdm_active_profile` est absent |
| **Noms réservés import** | Liste alimentée depuis le manifest au boot ; repli `FALLBACK_RESERVED_NAMES` dans `profile-selector.js` si le fetch échoue |

Un dossier `assets/profiles/mon-profil/` **sans** entrée correspondante dans `manifest.json` **n'apparaît pas** dans le sélecteur et ne peut pas être assemblé.

### Profils disponibles (catalogue actuel)

| id (technique) | Label sélecteur | Usage |
|----------------|-----------------|-------|
| `speech2texte` | Speech2Texte | Correction post-STT : ponctuation, répétitions, mots parasites (**défaut**) |
| `ads-generator` | AdsGenerator | Titre + description petites annonces entre particuliers (humain, sans style IA) |
| `video-meta-descriptor` | VideoMetaDescriptor | Titre, description, tags, catégorie et conseil visibilité |

Chaque profil charge un **pack complet** : prompt système, prompts de contexte, moteur STT, thème, exemple workspace et ordre d'injection — pas seulement le prompt système.

Réglages communs à tous les profils officiels : **Vosk Maxi** + **CPU**, contextes injectés **après** le prompt système (`after_system`).

Chaque entrée du manifest et chaque `meta.json` de profil peuvent définir un bloc **`project`** :

| Champ | Description |
|-------|-------------|
| `platform_url` | URL de la plateforme hôte (**PromptDeMerde.com**) |
| `name` | Nom du projet / profil applicatif |
| `url` | URL du projet (produit, dépôt ou service) |
| `vitrine_url` | URL de la page projet sur le site vitrine DreamProjectAI |

Assemblé côté serveur dans **`pdm_project`** du `pdm-config` exporté.

### Contenu bundlé par profil

#### `speech2texte` — Speech2Texte (défaut)

| Élément | Valeur |
|---------|--------|
| **Rôle** | Correcteur post-dictée : pipeline ponctuation STT → répétitions de correction → mots parasites |
| **Thème** | `light` (Cassé) |
| **Exemple workspace** | Transcription orale avec hésitations, répétitions et mots parasites (rendez-vous confirmé) |

**Prompts de contexte** :

| Tag | Actif | Rôle |
|-----|-------|------|
| `#SansPonctuationDAbord` | oui | Retire la ponctuation STT mal placée avant de repenser la phrase |
| `#DerniereFormulation` | oui | Garde la dernière version complète après reprises orales |
| `#MotsParasites` | oui | Corrige ou retire les intrus phonétiques STT |
| `#HesitationsOral` | oui | Retire euh, hum, bah… sauf sens voulu |
| `#FrancaisNaturel` | oui | Accords, syntaxe et fluidité après nettoyage |
| `#Conservateur` | non | Mode strict : dépollution seule, zéro interprétation |

---

#### `video-meta-descriptor` — VideoMetaDescriptor

| Élément | Valeur |
|---------|--------|
| **Rôle** | Pack métadonnées YouTube : titre, description SEO, tags, catégorie officielle, conseil visibilité |
| **Thème** | `light` (Cassé) |
| **Exemple workspace** | Brief tuto Ollama Linux (durée, public, ton, mots-clés, contenu vidéo) |

**Format de sortie imposé** : blocs `--- TITRE ---`, `--- DESCRIPTION ---`, `--- TAGS ---`, `--- CATÉGORIE YOUTUBE ---`, `--- CONSEIL VISIBILITÉ ---`.

**Prompts de contexte** :

| Tag | Actif | Rôle |
|-----|-------|------|
| `#TitreAccrocheur` | oui | Mot-clé tôt, ≤ 100 car., sans clickbait |
| `#DescriptionSEO` | oui | Phrase-clé dans les 150 premiers caractères |
| `#TagsLongueTraine` | oui | Mix niche + volume de recherche |
| `#CategorieOfficielle` | oui | Une des 15 catégories YouTube |
| `#ConseilVisibilite` | oui | Niche, type de chaîne, conseil concret |
| `#TonCreatif` | non | Adapte si humour / ton décalé dans le brief |
| `#TutoPasAPas` | non | Timestamps indicatifs si tutoriel |

---

#### `ads-generator` — AdsGenerator

| Élément | Valeur |
|---------|--------|
| **Rôle** | Petites annonces entre particuliers : titre + description, ton sobre, anti-style IA |
| **Thème** | `light` (Cassé) |
| **Exemple workspace** | Notes brutes vélo Decathlon (prix, lieu, étage, état) |

**Format de sortie imposé** : blocs `--- TITRE ---` et `--- DESCRIPTION ---`.

**Prompts de contexte** :

| Tag | Actif | Rôle |
|-----|-------|------|
| `#TonParticulier` | oui | Ton particulier direct, sans jargon commercial |
| `#AntiIA` | oui | Interdit tournures type ChatGPT |
| `#PropreSansVulgarite` | oui | Pas d'argot ; prix en euros, lieux corrects |
| `#TitreCourt` | oui | Objet + marque + état + prix factuel |
| `#InfosPratiques` | oui | Retrait, livraison, dispo si mentionnés |
| `#RelacheLeger` | non | Ton oral léger autorisé, sans argot |
| `#UrgenceVente` | non | Urgence sobre si déménagement / vente rapide |

---

Les tags **actifs** (rouge dans le Workspace) et **inactifs** sont définis dans le frontmatter YAML de chaque fichier `contexts/*.md` (`active: true|false`). Tout reste modifiable dans l'onglet Prompts après chargement du profil.

### Changer de profil

1. Choisir un profil dans le sélecteur header.
2. Confirmer — **toutes les données locales sont effacées** puis remplacées (un seul dialogue de confirmation, sans second confirm comme à l'import Options).
3. L'application recharge la configuration assemblée côté serveur.
4. Si aucun modèle Ollama n'est défini, le **premier modèle disponible** est sélectionné automatiquement (réflexion désactivée dans ce cas).

### Profil JSON sélectionné (`pdm_active_profile`)

Le profil du sélecteur header est exporté dans **`pdm_active_profile`** et restauré à l'import. Au premier lancement sans export, la valeur par défaut est `speech2texte`.

### Structure du bundle (hors dépôt GitHub)

```
assets/profiles/
  manifest.json        # index obligatoire : ids + labels du sélecteur
  <profil-id>/
    meta.json          # stt, thème, exemple workspace, workspace_ui (optionnel)
    system.md          # prompt système (frontmatter YAML)
    contexts/*.md      # prompts de contexte (#Tag)
```

### Personnalisation UI Workspace (`pdm_workspace_ui`)

Chaque profil peut définir dans `meta.json` une section **`workspace_ui`**, exportée dans le `pdm-config` sous la clé **`pdm_workspace_ui`**. Elle pilote l'identité affichée (`username@hostname`) et les textes de l'écran **Workspace** uniquement (placeholders, boutons, notifications, guards). Le **logo du header** reste toujours **PromptDeMerde.com** (plateforme) — `pdm_workspace_ui.brand` n'est plus personnalisable.

**Important — `workspace_input` vs placeholder :** la clé **`workspace_input`** du `meta.json` sert d'**exemple affiché en placeholder** dans le champ Input (grisé, non prérempli). Elle alimente `pdm_workspace_ui.texts.inputPlaceholder` **uniquement si** `texts.inputPlaceholder` n'est pas défini. Le brouillon `pdm_workspace.input` reste **vide** au chargement d'un profil.

**Synchronisation session :** au boot, si le bundle profils est actif, `PDM.WorkspaceUi.syncFromActiveProfile()` réaligne la session sur `assemble.php?id=<pdm_active_profile>` (prompt système, contextes bundlés, thème, `pdm_workspace_ui`, etc.) **sans effacer** le brouillon workspace ni l'historique. Un empreinte `pdm_profile_bundle_fp` évite les réécritures inutiles quand le bundle est déjà à jour.

Exemple dans `assets/profiles/ads-generator/meta.json` :

```json
{
  "workspace_input": "Ex : vélo decathlon homme rouge bon état…",
  "project": {
    "platform_url": "https://promptdemerde.com",
    "name": "AdsGenerator",
    "url": "https://commercify.online",
    "vitrine_url": "https://commercify.online"
  },
  "workspace_ui": {
    "identity": {
      "username": "c2c",
      "hostname": "Commercify",
      "usernameAlt": "vendeur"
    },
    "texts": {
      "submitLabel": "OPTIMISER L'ANNONCE →",
      "outputPlaceholder": "L'annonce optimisée apparaîtra ici…"
    }
  }
}
```

Les clés `texts` non renseignées conservent les libellés par défaut PromptDeMerde. La clé est validée à l'import/export JSON et persistée en session locale avec le reste de la configuration.

Exemple d'entrée dans `manifest.json` :

```json
{
  "profiles": [
    { "id": "mon-profil", "label": "MonProfil" },
    { "id": "speech2texte", "label": "Speech2Texte", "default": true }
  ]
}
```

### Ajouter un profil officiel

1. Créer `assets/profiles/<id>/` avec `meta.json`, `system.md` et `contexts/*.md`.
2. Ajouter `{ "id": "<id>", "label": "<Libellé sélecteur>" }` dans `manifest.json` (même `id` que le dossier).
3. Recharger l'application — le sélecteur se met à jour sans modifier le JS.
4. Déployer le bundle complet (manifest + dossiers) sur pré-prod/prod (rsync, artefact privé).

Assembly serveur : `lib/api/manifest.php` (liste) · `lib/api/assemble.php?id=<profil-id>` → `pdm-config` complet.

**Clone GitHub** : pas de bundle, pas de sélecteur — valeurs par défaut intégrées (`speech2texte`). Un utilisateur en prod peut toujours exporter/importer manuellement sa config via *Options → Sauvegarde & restauration*.

### Import JSON — noms de fichier réservés (bundle profils actif)

Lorsque le bundle profils est déployé, l'**import manuel** d'un fichier JSON via *Options → Sauvegarde & restauration* est **refusé** si le nom du fichier (sans extension) correspond à un profil JSON officiel.

La comparaison utilise une **clé normalisée** :

1. conversion en minuscules ;
2. suppression de tout caractère autre que `a-z` et `0-9` (tirets, espaces, virgules, majuscules détournées, etc.).

| Fichier tenté | Résultat |
|---------------|----------|
| `Speech2Texte.json` | Refusé |
| `speech-2-texte.json` | Refusé |
| `AdsGenerator.json` | Refusé |
| `PromptDeMerde.json` | Refusé |
| `ma-config-perso.json` | Autorisé (si contenu `pdm-config` valide) |
| `promptdemerde-config-v1.11.0.json` | Autorisé |

Le **sélecteur Profil JSON** dans le header n'est pas concerné par cette règle (il charge la configuration assemblée côté serveur).

---

## Prompts de contexte — personnalisation complète

Dans l'application, l'onglet **Prompts** regroupe deux notions distinctes :

### Prompt système

- **Rôle par défaut** : reformuler votre texte en français correct, sans exécuter la demande ni poser de questions. C'est le comportement « nettoyeur de prompt » de l'outil.
- **Entièrement modifiable** : vous pouvez réécrire le prompt système pour un autre usage (traduction, résumé, autre ton, etc.).
- **Activable / désactivable** : une case à cocher permet de couper le prompt système. Si vous le désactivez, seuls les **prompts de contexte actifs** sont envoyés au modèle.
- **Vide = défaut** : si le champ est vide, le prompt système intégré à l'application est utilisé automatiquement.

### Prompts de contexte

Ce sont des **instructions supplémentaires** que vous nommez avec un tag court précédé de `#` (exemple : `#TonFormel`, `#AntiBullshit`).

| Question | Réponse |
|----------|---------|
| Sont-ils verrouillés ? | **Non.** Tout est modifiable : tag, texte, activation. Aucune fonctionnalité payante ne bloque la création ou l'édition. |
| Combien en créer ? | Jusqu'à **999** prompts de contexte (affiché « ∞ » dans l'interface). |
| Combien activer en même temps ? | **Autant que vous voulez** : cochez « Actif » sur chaque prompt à injecter. |
| Où les activer ? | Dans l'onglet **Prompts**, ou depuis le **Workspace** (tags de contexte). |
| Peut-on les supprimer ? | Oui, chaque prompt peut être supprimé individuellement. Les trois exemples fournis au premier lancement sont des modèles, pas des contraintes. |

### Ordre d'injection

Vous choisissez si les prompts de contexte actifs passent **avant** ou **après** le prompt système (réglage dans l'onglet Prompts). Votre texte du Workspace est toujours envoyé en dernier, dans un message séparé.

**Exemple (contexte après le système, recommandé) :**

```
[Message système]
  → Prompt système (nettoyage par défaut)
  → #TonFormel : Adopte un ton formel…
  → #AntiBullshit : Va droit au but…

[Message utilisateur]
  → Votre texte collé, tapé ou dicté dans le Workspace (modifiable avant envoi)
```

### Condition pour lancer un nettoyage

Au moins **une** des deux options doit être active :

- le **prompt système**, ou
- **un ou plusieurs prompts de contexte**.

Sinon le bouton de nettoyage reste bloqué (message d'aide affiché).

### Génération assistée

L'onglet Prompts propose aussi de **générer** un prompt de contexte à partir d'une intention ou d'un titre, via le modèle LLM configuré — utile pour démarrer, puis tout reste éditable.

Trois niveaux de prompts distincts existent dans l'application :

| Prompt | Rôle | Stockage | Export JSON |
|--------|------|----------|-------------|
| **Système (nettoyage)** | Reformuler le texte du Workspace | `pdm_system_prompt` | Oui (texte complet) |
| **Contexte (#Tag)** | Modificateurs injectés au nettoyage | `pdm_profiles[].prompt` | Oui |
| **En-tête injection** | Phrase avant les `#Tag` actifs | `pdm_context_inject_header` | Oui |
| **Génération de contextes** | Fabriquer un `#Tag` via l'IA | `pdm_context_gen_*` + suffixes | Oui |

**Prompts LLM pour la génération** (section dépliable dans Prompts) :

- `pdm_context_gen_system` — prompt système (sortie JSON `{ tag, prompt }`).
- `pdm_context_gen_user_intent` — préfixe du message utilisateur en mode « par intention ».
- `pdm_context_gen_user_title` — modèle du message utilisateur en mode « par titre » (`{{title}}`).
- `pdm_context_inject_header` — en-tête injecté avant les contextes actifs au nettoyage.
- `pdm_context_gen_tag_intent_suffix` — suffixe tag forcé (mode intention, `{{tag}}`).
- `pdm_context_gen_forced_tag_system_suffix` — suffixe tag forcé (prompt système génération).
- `pdm_context_gen_retry_system_suffix` / `pdm_context_gen_retry_user_suffix` — suffixes des tentatives JSON.
- `pdm_context_profile_line_template` — format de chaque ligne contexte injectée (`{{tag}}`, `{{prompt}}`).
- `pdm_context_gen_max_tokens`, `pdm_context_gen_temperature`, `pdm_context_gen_retry_temperature`, `pdm_context_gen_max_retries` — paramètres LLM de la génération.
- `pdm_context_gen_json_schema` — schéma JSON Ollama imposé au premier essai.
- `pdm_system_prompt_enabled` — activation du prompt système au nettoyage.
- `pdm_context_position` — ordre d'injection (`after_system` ou `before_system`).

Les valeurs par défaut sont intégrées à l'application (`config-schema-core.js`) ; elles sont **persistées en session** au premier lancement et **toujours incluses en entier** dans l'export JSON (**36** clés `pdm_*`).

**Provenance** : chaque prompt de contexte peut porter un bloc `origin` dans `pdm_profiles[]` (méthode, date, modèle, prompts LLM exacts utilisés pour les contextes générés par l'IA). Visible dans l'interface sous « Provenance » et dans l'export JSON.

---

## Historique des nettoyages

Chaque nettoyage réussi est **enregistré localement** dans votre navigateur (`localStorage`, clé `pdm_clean_history`).

Pour chaque entrée, l'historique conserve notamment :

- le texte **avant** nettoyage (votre saisie) ;
- le texte **après** nettoyage (résultat du modèle) ;
- la **réflexion** du modèle, si le modèle en produit une ;
- le prompt système et les **contextes actifs** au moment du nettoyage ;
- le fournisseur, le modèle, la date et la durée ;
- si l'input venait d'un **fichier audio importé** : `inputSource`, nom du fichier, taille, type MIME, date du fichier et `audioRef` (référence IndexedDB).

**Relecture audio** : le fichier audio lui-même est stocké en **IndexedDB** (navigateur), pas dans le JSON. Un lecteur `<audio>` est disponible dans la vue détaillée de l'historique tant que le blob est encore présent. Après un export/import JSON ou un autre navigateur, seule la **trace** (métadonnées) est conservée — pas la relecture.

**Limite blobs** : 20 fichiers ou ~100 Mo (éviction LRU automatique).

**Limite** : 100 entrées maximum (les plus anciennes sont retirées automatiquement).

**Actions disponibles** :

- consulter l'historique dans le **Workspace** et l'onglet **Prompts** ;
- **restaurer** une entrée dans le Workspace ;
- **supprimer** une entrée ou **vider** tout l'historique.

Rien n'est conservé sur le serveur. Pour une conservation au-delà du navigateur, reportez-vous à la section **Sauvegarde et restauration**.

---

## Sauvegarde et restauration (recommandé)

Les données d'usage (paramètres, prompts de contexte, prompt système, historique des nettoyages, brouillon du Workspace, réglages STT, URL et modèle Ollama, token API) **ne sont pas centralisées sur le serveur**. Elles résident dans le navigateur tant que vous ne les exportez pas.

Dans **Options → Sauvegarde & restauration** :

| Action | Description |
|--------|-------------|
| **Exporter** | Produit `promptdemerde-config-v1.11.0.json` — sauvegarde **complète** (`type: "pdm-config"`, **36** clés `pdm_*` + métadonnées). Si un token Ollama est configuré, une **confirmation** est demandée (token en clair dans le fichier). **v1.10.0+** : option d'inclusion des blobs audio dictée dans `pdm_audio_blobs` (encodage Base64). **v1.11.0+** : `pdm_workspace_ui` (personnalisation Workspace). |
| **Importer** | Validation du fichier **avant** confirmation ; restaure un export `pdm-config` **complet** ; remplace intégralement les données locales (y compris `pdm_active_profile` et champs audio du workspace / historique). **v1.10.0+** : si `pdm_audio_blobs` est présent, les enregistrements de dictée sont restaurés automatiquement en IndexedDB. Fichier incomplet, invalide, nom réservé ou clés inconnues : **rejeté sans effacer la session** |

**Règles strictes à l'import :**

- Toutes les clés du schéma doivent être présentes — pas de surcharge partielle.
- Aucune clé racine inconnue (`pdm_foo` → rejet).
- Types et enums contrôlés (booléens JSON natifs, thèmes, moteurs STT canoniques, tags profils, cohérence historique).
- Formats partiels legacy (`system-prompt`, `prompts`) : **plus acceptés**.
- **Noms réservés** (pré-prod/prod avec bundle profils) : un import manuel est refusé si le nom du fichier correspond à un profil JSON officiel après normalisation (minuscules, alphanumériques seuls). Voir section [Bundle profils](#bundle-profils-pré-prod--prod).

**Bonne pratique :** exportez régulièrement, notamment avant changement de navigateur, mise à jour du poste, changement de profil JSON, ou utilisation de *Tout effacer*. Pour éditer le JSON à la main, partez d'un export récent ou consultez le gabarit dans la documentation.

**Documentation détaillée :**

| Document | Emplacement | Contenu |
|----------|-------------|---------|
| **Schéma export** | [`assets/config/pdm-config.schema.json`](assets/config/pdm-config.schema.json) | JSON Schema Draft 2020-12 |
| **Architecture code** | [README § Architecture (contributeurs)](#architecture-contributeurs) | Modules `PDM.*`, export 36 clés, ordre scripts |
| Site → **Documentation** (`#documentation`) | Application | Guide utilisateur intégré |
| Site → **Confidentialité** (`#privacy`) | Application | Transit vs persistance, table `localStorage` |

---

## Import d'un fichier audio (Workspace)

Un petit bouton discret (🎵) dans la zone **INPUT** du Workspace permet de charger un **fichier audio local** (wav, mp3, ogg, m4a… selon le navigateur). La transcription démarre **immédiatement** et s'affiche dans la zone de saisie, qui passe alors en **lecture seule**.

- **100 % local** : le fichier est décodé et transcrit **dans le navigateur** ; il n'est **jamais** envoyé au serveur.
- **Moteur fixe** : **Whisper Maxi** (non configurable pour ce flux) — c'est le **même** modèle que la dictée vocale (déjà présent dans `assets/stt/whisper-maxi/`, aucune installation supplémentaire).
- **Priorité audio** : importer un fichier **remplace** le texte en cours ; il n'y a pas de mélange entre saisie manuelle et fichier audio.
- **Persistance locale** : le blob audio est enregistré en **IndexedDB** (`PDM.StorageAudioBlobs`) avec une référence `audioRef` dans `pdm_workspace` ; métadonnées exportées dans le JSON (`audioFileName`, `audioFileSize`, `audioMimeType`, `audioLastModified`). **Pas de chemin disque** — le navigateur n'expose que le nom du fichier.
- **Historique** : après un nettoyage LLM réussi, la trace audio est copiée dans `pdm_clean_history` (blob cloné, relecture dans l'historique).
- **Reprendre la main** : cliquez sur **Reset** ou sur l'icône d'effacement pour repasser en saisie manuelle. Le nettoyage (« NETTOYER CE TAS DE MERDE ») reste déclenché **manuellement**.

---

## Dictée vocale (option secondaire)

La dictée sert à **remplir le Workspace** à la voix. Le texte transcrit reste **entièrement éditable** avant le nettoyage LLM. Moteur, micro et accélération CPU/GPU se règlent dans le **bloc dictée du Workspace** (plus dans Options).

Cinq moteurs **100 % locaux** dans le navigateur. Le modèle se charge au **premier clic** sur « Dictée vocale », puis reste en cache jusqu'au changement de moteur.

| Moteur | Intérêt | Taille indicative | Matériel | Qualité à l'oral |
|--------|---------|-------------------|----------|------------------|
| **Vosk Mini** | Le plus léger | ~39 Mo | CPU | **Faible** — articulation nette, peu d'autocorrection |
| **Vosk Maxi** | Vosk plus capable (défaut applicatif si valeur absente ou legacy) | plus lourd | CPU | **Moyenne** |
| **Whisper Mini** | Bon compromis + autocorrection | ~40 Mo | GPU conseillé | **Élevée** |
| **Whisper Maxi** | Meilleure qualité Whisper | plus lourd | GPU conseillé | **Très élevée** |
| **Parakeet** | Très précis, forte autocorrection | ~409 Mo | GPU fortement conseillé | **La plus élevée** |

### Parakeet — reconstituer le gros fichier modèle

**Si vous n'utilisez pas Parakeet, ignorez cette étape.** Vosk et Whisper fonctionnent sans script supplémentaire.

**Si vous choisissez Parakeet**, exécutez une seule fois :

```bash
cd assets/stt/parakeet
bash restore-encoder.sh
```

Ce script reconstitue `encoder-model.int4.onnx`, vérifie l'empreinte SHA256 et ne supprime aucun fichier existant (renommage en `*_sauv` en cas de conflit). Le décodeur et le vocabulaire sont déjà inclus dans le dépôt.

Script mainteneur (publication GitHub) : `archive-encoder.sh` — découpe le fichier complet en parts de 30 Mo.

### Limitation GPU — accélération dictée

Le choix **CPU / GPU** pour Whisper et Parakeet n'apparaît que si le navigateur détecte un GPU WebGPU avec **≥ 1 Go VRAM** (`stt-shared-gpu.js`). Sinon, l'exécution reste en CPU.

### Limitation GPU — état des tests

**Les parcours GPU (WebGPU) pour Whisper et Parakeet n'ont pas été validés par les mainteneurs.** Les tests manuels ont porté sur une configuration **CPU standard**, sans validation sur matériel équipé d'un GPU dédié. Si vous disposez d'une carte graphique, **vérifiez vous-même** le bon fonctionnement sur votre machine. Les retours via les issues GitHub sont les bienvenus.

### Micro en HTTP local (Firefox)

Sur Firefox en réseau local non sécurisé, activez dans `about:config` :

- `media.devices.insecure.enabled`
- `media.getusermedia.insecure.enabled`

Puis rechargez la page et autorisez le micro.

### Enregistrement des dictées (v1.10.0+)

**Nouveau** : les dictées vocales sont **automatiquement enregistrées** en WebM pendant la transcription et peuvent être téléchargées pour l'entraînement de modèles IA ou l'archivage.

**Fonctionnement :**
- **Parallèle transparent** : `MediaRecorder` fonctionne en parallèle du pipeline STT existant, sans perturber la transcription.
- **Multi-segments** : plusieurs dictées successives dans la même session sont stockées comme segments séparés d'un même enregistrement.
- **Persistance locale** : blobs WebM stockés dans IndexedDB (`pdm-audio`), liés à la session par un `audioRef` unique.
- **Bouton téléchargement** : icône ⬇ discrète dans les outils de saisie, visible uniquement après dictée.
- **Export intelligent** : 
  - **Segment unique** : téléchargement direct `.webm`
  - **Multi-segments** : archive ZIP contenant tous les segments + transcription (`transcript.txt`) + métadonnées (`info.txt`)
- **Export/import JSON** : les blobs audio peuvent être inclus dans l'export JSON (encodage Base64), avec limite de taille configurable.

**Usage :**
1. Effectuez une dictée vocale normale
2. Le bouton ⬇ apparaît automatiquement après la transcription
3. Cliquez pour télécharger l'enregistrement WebM correspondant
4. Pour plusieurs dictées : l'archive ZIP regroupe tous les segments

**Métadonnées workspace et historique :**
- `inputSource: 'audio-dictation'` identifie les entrées enregistrées
- `audioSegmentCount` indique le nombre de segments
- Badge spécial 🎙️ dans l'historique avec compteur de segments
- Compatible avec les fonctions d'export/import existantes

---

## Confidentialité

| Principe | Détail |
|----------|--------|
| **Serveur — persistance** | Aucune conservation ; pas de BDD ; pas de session PHP ; pas de télémétrie |
| **Serveur — transit LLM** | À chaque nettoyage, prompt utilisateur + système + contextes actifs transitent via [`lib/proxy/ollama/olama.php`](lib/proxy/ollama/olama.php) (RAM, relais vers Ollama) — **sans archivage** |
| **Navigateur** | Options, historique et brouillons dans `localStorage` |
| **LLM** | Traitement par Ollama sur votre machine ou réseau ; le proxy ne conserve pas les contenus |
| **Voix / audio** | Dictée et import fichier audio : **100 % navigateur** — aucun envoi audio au serveur |
| **Sauvegarde** | Export/import JSON pour conserver l'ensemble de vos données d'usage |

### Au repos vs en transit

| Donnée | Sur disque serveur | Pendant un nettoyage |
|--------|-------------------|----------------------|
| Texte Workspace (prompt utilisateur) | Non | Oui (transit POST) |
| Prompt système | Non | Oui (fusionné dans le message `system`) |
| Prompts de contexte actifs | Non | Oui (fusionnés dans le message `system`) |
| Historique complet | Non | Non |
| Config JSON exportée | Non | Non |

**Garantie architecture** : le dépôt open source n'implémente aucun stockage serveur des prompts. **Limite infra** : un opérateur d'hébergement pourrait journaliser le trafic HTTP s'il le configurait — ce n'est pas une fonctionnalité du produit. Pour un contrôle total : **auto-hébergement**.

Cette application ne requiert ni compte ni inscription. La maîtrise de vos données vous incombe : pensez à l'export régulier si vous souhaitez les conserver au-delà du cycle de vie du navigateur.

---

## Dépannage

| Problème | Piste |
|----------|-------|
| Nettoyage bloqué | Activez le prompt système ou au moins un prompt de contexte (onglet Prompts). |
| Ollama ne répond pas | Vérifiez qu'Ollama tourne (`ollama list`) et l'URL dans Options. |
| Dictée peu fidèle (Vosk Mini) | Articulez, corrigez le texte, ou passez à Whisper / Parakeet |
| Dictée lente ou lourde | Utilisez le copier-coller, ou un modèle Ollama plus léger |
| Parakeet : modèle absent | Lancez `bash restore-encoder.sh` dans `assets/stt/parakeet/`. |
| Espace navigateur plein | Exportez votre configuration, puis réduisez l'historique |
| Données perdues (nouveau navigateur) | Importez un export JSON via *Options → Sauvegarde & restauration* |
| Import JSON rejeté | Vérifiez que le fichier est un `pdm-config` **complet** (ré-exportez depuis l'app). Nom de fichier réservé profil JSON ? Renommez l'export. Voir schéma dans `assets/config/`. |

---

## Compatibilité navigateurs

| Fonctionnalité | Chrome / Edge | Firefox | Safari |
|----------------|---------------|---------|--------|
| Workspace + Ollama | OK | OK | OK |
| Export / import JSON | OK | OK | OK |
| Vosk (CPU) | OK | OK | OK |
| Whisper / Parakeet (WebGPU) | OK | Partiel | Partiel (fallback WASM) |
| Micro en HTTP local | Strict | `about:config` requis | Limité |

---

## Dépôt et gros fichiers STT

Les modèles Vosk, Whisper et Parakeet (sauf `encoder-model.int4.onnx` ~390 Mo) sont versionnés dans `assets/stt/`. Pour Parakeet, exécutez `bash restore-encoder.sh` après clone. Le bundle homepage (`assets/homepage/`) est exclu du dépôt public (`.gitignore`).

---

## Architecture (contributeurs)

> **Synopsis** : Carte des modules `PDM.*`, ordre de chargement et API PHP pour contributeurs GitHub.  
> **Objectif** : Onboarding technique sans accès à la Bible mainteneurs.

SPA **no-build** (IIFE + `window.PDM.*`), proxy PHP Ollama, profils JSON en Markdown.  
Pas de bundler : scripts listés dans `lib/env/env.php` et `assets/js/env.js`.

Voir aussi [`CONTRIBUTING.md`](CONTRIBUTING.md). Ne pas réintroduire de monolithes.  
**Mainteneurs avec accès Bible** : synchroniser `00-meta/00-architecture.md` et `00-meta/00-confidentialite.md` (Bible privée, hors dépôt) lors des changements structurants ou de copy privacy (DEC-029, DEC-032).

### Namespace `window.PDM`

| Module | Fichier(s) | Rôle |
|--------|------------|------|
| `PDM.ConfigSchema` | `config-schema-core.js`, `config-schema-validate.js` | Validation `pdm-config` |
| `PDM.Storage` | `storage-*.js` | localStorage |
| `PDM.Env` | `env.js` | Client `lib/env/env.php` |
| `PDM.Providers` | `providers.js` | Registre LLM |
| `PDM.ContextGeneration` | `context-generation.js` | Prompts LLM pour générer des `#Tag` |
| `PDM.LLM` | `llm.js` | Façade LLM ; injection via templates Storage |
| `PDM.App` | `app.js` + `workspace-*.js` + `*-ui.js` | SPA |
| `PDM.STT` | `stt-core.js` … `stt-init.js` | Dictée vocale |
| `PDM.STT.Shared` | `stt-shared-*.js` | Utilitaires STT |
| `PDM.STT._engines` | `stt-shared-core.js` | Registre moteurs |
| `PDM.UI` | `ui.js` | DOM, notifications |
| `PDM.Profiles` | `profiles.js` | Prompts de contexte |
| `PDM.ProfileSelector` | `profile-selector.js` | Sélecteur Profil JSON (header, fetch manifest) |
| `PDM.WorkspaceUi` | `workspace-ui-profile.js` | Personnalisation UI Workspace (`pdm_workspace_ui`) |

### Ordre de chargement

#### Statique (`index.html`)

1. `config-schema-core.js` → `config-schema-validate.js`
2. `storage-core.js` → … → `storage-config-io.js`
3. `env.js` → `bootstrap.js`

#### Dynamique (`lib/env/env.php`)

Providers → UI → **STT shared (`stt-shared-core.js` first)** → moteurs STT → façade STT → `workspace-ui-profile.js` → `app.js` → workspace modules → `context-generation.js` → prompts-ui → settings/history/polish → homepage (optionnel).

**Export JSON** : **36** clés `pdm_*` (schéma export **1.11.0**) — voir [`assets/config/pdm-config.schema.json`](assets/config/pdm-config.schema.json).

**ES modules** : `stt-parakeet.js`, `stt-whisper.js` (entrypoints dans `bootstrap.js` `MODULE_SCRIPTS`).

**Synchronisation obligatoire** : `lib/env/env.php` (`$coreScripts`) **et** `assets/js/env.js` (`FALLBACK.assets.scripts`).

Lors de l'ajout d'un fichier JS :

1. L'ajouter à `lib/env/env.php` (`$coreScripts`) **et** `assets/js/env.js` (`FALLBACK.assets.scripts`) dans le bon ordre.
2. S'il est statique (avant bootstrap), ajouter une balise `<script>` dans `index.html`.

### API PHP

| Path | Rôle |
|------|------|
| `lib/api/manifest.php` | Liste profils applicatifs |
| `lib/api/assemble.php` | Markdown → `pdm-config` |
| `lib/env/env.php` | Config + scripts autorisés |
| `lib/proxy/ollama/olama.php` | Relais Ollama CORS |

Données profils : `assets/profiles/` (Markdown). Code API : `lib/api/`.

### CSS

Partials `assets/css/style-*.css` puis `polish-*.css`, liés dans `index.html` (cascade préservée).

### Typographie

Échelle stricte dans `style-base.css` (`:root`) — base `html` 18px :

- **Fira Code** (`--font-body`) : corps, code, textareas, output LLM
- **Inconsolata** (`--font-ui`) : nav, labels, boutons, footer

Tailles sémantiques : `--text-caption` · `--text-small` · `--text-body` · `--text-ui` · `--text-title` · `--text-display` · `--text-hero`. Interlignage : `--leading-tight` · `--leading-normal` · `--leading-relaxed`. Ne pas ajouter de `font-size` en valeurs brutes dans les CSS — utiliser les tokens ou les classes `.text-*`.

---

## Licence et crédits

Projet open source — [DreamProjectAI](https://dreamproject.online) · [GitHub](https://github.com/JeanSebastienBash/promptdemerde/). Polices et bibliothèques tierces embarquées localement.
