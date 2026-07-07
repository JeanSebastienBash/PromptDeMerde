# PromptDeMerde.com

> Collez, corrigez à la volée, envoyez — avec ou sans dictée vocale.

**Version** : `1.4.0`

# Documentation mainteneurs : voir Documentation intégrée (#documentation) et assets/config/pdm-config.schema.json

**Dépôt officiel** : [github.com/JeanSebastienBash/promptdemerde](https://github.com/JeanSebastienBash/promptdemerde/)

**PromptDeMerde.com** est une application web **100 % locale** : open source, auto-hébergée, **sans base de données**, **sans compte**, **sans télémétrie**. Rien n'est stocké côté serveur — uniquement dans votre navigateur, avec sauvegarde portable en **export JSON**. Le traitement linguistique s'appuie sur **[Ollama](https://ollama.ai/download)** installé en amont sur votre machine ; la dictée vocale (optionnelle) propose **Vosk Mini/Maxi**, **Whisper Mini/Maxi** et **Parakeet**.

**Usage principal** : saisissez ou collez votre texte dans le Workspace, ajustez-le si besoin, puis lancez le nettoyage afin de **reformuler vos instructions en prompts clairs**. La dictée vocale reste un complément facultatif.

**Usage secondaire** : le prompt système peut être activé, désactivé ou entièrement réécrit ; les prompts de contexte se configurent librement et s'activent à la carte. Vous pouvez ainsi **orienter l'outil vers des besoins détournés**, entièrement personnalisables — autre ton, autre format, autre domaine ou autre logique de reformulation — sans toucher au code source.

### Confidentialité et données

- **Aucune base de données**, aucun compte, **aucune télémétrie** (pas d'analytics, pas de tracking).
- **Rien n'est conservé sur le serveur** : le proxy PHP (`proxy/ollama/olama.php`) relaie vers le moteur LLM sans persistance.
- Options, historique et brouillons : **uniquement dans le navigateur** (localStorage).
- **Sauvegardes** : export/import JSON (*Options → Sauvegarde & restauration*) — seul mécanisme de backup.
- LLM via **Ollama** sur votre machine ; dictée vocale **dans le navigateur**.

Projet open source par [DreamProjectAI](https://dreamproject.online) — code sur [GitHub](https://github.com/JeanSebastienBash/promptdemerde/).

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
4. Configurer l'URL Ollama et le modèle (*Workspace*), puis lancer un nettoyage.

L'URL Ollama par défaut est `http://localhost:11434`. Les requêtes passent par [`proxy/ollama/olama.php`](proxy/ollama/olama.php) uniquement en relais technique ; **aucune donnée n'y est stockée**.

> **Badge PRÉ-PROD** : visible dans le pied de page lorsque le serveur n'est pas en production (`PDM_ENV` ≠ `prod` dans Apache).

> **Note** : le dépôt GitHub ne contient pas le bundle homepage (`assets/homepage/`). Après clone, l'application ouvre directement le **Workspace**. La landing est déployée sur prod/pré-prod par le script `preprod2prod`.

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

---

## Historique des nettoyages

Chaque nettoyage réussi est **enregistré localement** dans votre navigateur (`localStorage`, clé `pdm_clean_history`).

Pour chaque entrée, l'historique conserve notamment :

- le texte **avant** nettoyage (votre saisie) ;
- le texte **après** nettoyage (résultat du modèle) ;
- la **réflexion** du modèle, si le modèle en produit une ;
- le prompt système et les **contextes actifs** au moment du nettoyage ;
- le fournisseur, le modèle, la date et la durée.

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
| **Exporter** | Produit `promptdemerde-config-v1.4.0.json` — sauvegarde **complète** (`type: "pdm-config"`, 17 clés `pdm_*` + métadonnées) |
| **Importer** | Restaure un export `pdm-config` **complet** ; remplace intégralement les données locales. Fichier incomplet, invalide ou avec clés inconnues : **rejeté sans effacer la session** |

**Règles strictes à l'import :**

- Toutes les clés du schéma doivent être présentes — pas de surcharge partielle.
- Aucune clé racine inconnue (`pdm_foo` → rejet).
- Types et enums contrôlés (booléens JSON natifs, thèmes, moteurs STT canoniques, tags profils, cohérence historique).
- Formats partiels legacy (`system-prompt`, `prompts`) : **plus acceptés**.

**Bonne pratique :** exportez régulièrement, notamment avant changement de navigateur, mise à jour du poste, ou utilisation de *Tout effacer*. Pour éditer le JSON à la main, partez d'un export récent ou consultez le gabarit dans la documentation.

**Documentation détaillée :**

| Document | Emplacement | Contenu |
|----------|-------------|---------|
| **Schéma export** | [`assets/config/pdm-config.schema.json`](assets/config/pdm-config.schema.json) | JSON Schema Draft 2020-12 |
| **Tests clone** | [`docs/CLONE-TEST.md`](docs/CLONE-TEST.md) | Matrice navigateurs et checklist post-clone |
| Site → **Documentation** (`#documentation`) | Application | Guide utilisateur intégré |
| Site → **Confidentialité** (`#privacy`) | Application | Table des clés `localStorage` |

---

## Dictée vocale (option secondaire)

La dictée sert à **remplir le Workspace** à la voix. Le texte transcrit reste **entièrement éditable** avant le nettoyage LLM.

Cinq moteurs **100 % locaux** dans le navigateur. Le modèle se charge au **premier clic** sur « Dictée vocale », puis reste en cache jusqu'au changement de moteur.

| Moteur | Intérêt | Taille indicative | Matériel | Qualité à l'oral |
|--------|---------|-------------------|----------|------------------|
| **Vosk Mini** | Le plus léger | ~39 Mo | CPU | **Faible** — articulation nette, peu d'autocorrection |
| **Vosk Maxi** | Vosk plus capable | plus lourd | CPU | **Moyenne** |
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

### Limitation GPU — état des tests

**Les parcours GPU (WebGPU) pour Whisper et Parakeet n'ont pas été validés par les mainteneurs.** Les tests manuels ont porté sur une configuration **CPU standard**, sans validation sur matériel équipé d'un GPU dédié. Si vous disposez d'une carte graphique, **vérifiez vous-même** le bon fonctionnement sur votre machine. Les retours via les issues GitHub sont les bienvenus.

### Micro en HTTP local (Firefox)

Sur Firefox en réseau local non sécurisé, activez dans `about:config` :

- `media.devices.insecure.enabled`
- `media.getusermedia.insecure.enabled`

Puis rechargez la page et autorisez le micro.

---

## Confidentialité

| Principe | Détail |
|----------|--------|
| **Serveur** | Aucune persistance ; pas de BDD ; pas de télémétrie |
| **Navigateur** | Options, historique et brouillons dans le stockage local du navigateur |
| **LLM** | Traitement par Ollama sur votre machine ; [`proxy/ollama/olama.php`](proxy/ollama/olama.php) relaie sans conserver |
| **Voix** | Dictée traitée dans le navigateur ; aucun envoi audio vers un service tiers |
| **Sauvegarde** | Export/import JSON pour conserver et réutiliser l'ensemble de vos données d'usage |

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
| Import JSON rejeté | Vérifiez que le fichier est un `pdm-config` **complet** (ré-exportez depuis l'app). Voir schéma dans `assets/config/`. |

---

## Compatibilité navigateurs

| Fonctionnalité | Chrome / Edge | Firefox | Safari |
|----------------|---------------|---------|--------|
| Workspace + Ollama | OK | OK | OK |
| Export / import JSON | OK | OK | OK |
| Vosk (CPU) | OK | OK | OK |
| Whisper / Parakeet (WebGPU) | OK | Partiel | Partiel (fallback WASM) |
| Micro en HTTP local | Strict | `about:config` requis | Limité |

Checklist détaillée après clone : [`docs/CLONE-TEST.md`](docs/CLONE-TEST.md).

---

## Dépôt et gros fichiers STT

Les modèles Vosk, Whisper et Parakeet (sauf `encoder-model.int4.onnx` ~390 Mo) sont versionnés dans `assets/stt/`. Pour Parakeet, exécutez `bash restore-encoder.sh` après clone. Le bundle homepage (`assets/homepage/`) est exclu du dépôt public (`.gitignore`).

---

## Licence et crédits

Projet open source — [DreamProjectAI](https://dreamproject.online) · [GitHub](https://github.com/JeanSebastienBash/promptdemerde/). Polices et bibliothèques tierces embarquées localement.
