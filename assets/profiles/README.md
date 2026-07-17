# Profils applicatifs (`assets/profiles/`)

Chaque profil **bundlé au boot** vit dans son propre dossier. L’**UI traduite** (12 langues) est **partagée** : [`assets/i18n/ui/`](../i18n/ui/).

## Politique dépôt GitHub (canon)

| Couche | Chemin | Sur GitHub public |
|--------|--------|-------------------|
| **Profil par défaut** | `speech2texte/` + [`index.json`](index.json) | **Oui** — seul profil servi au boot |
| **Autres profils** | import ZIP utilisateur | **Non** — jamais de second dossier sous `assets/profiles/` |

> **Règle** : `assets/profiles/index.json` ne liste **que** `speech2texte`. Les extensions s’obtiennent par **import ZIP** (localStorage `pdm_custom_profiles`) — pas comme dossier versionné ici.

Le profil par défaut au runtime est `manifest.defaultProfileId` (API `lib/api/manifest.php`), calculé depuis `"default": true` dans `manifest.json` ou le premier profil valide.

## Arborescence par profil bundlé

```
assets/profiles/<profil-id>/
  manifest.json              # id, label, synopsis, project, default (sélecteur)
  prompts/{locale}/system.md
  contexts/{locale}/{Tag}.md
  gen-prompts/{locale}/*.md
  parts/
    locales.json               # defaultLocale + locales[]
    prompts.json               # index system + contexts
    gen-prompts.json
    config.json                # réglages numériques / STT (sans textes)
```

## Quelle clé vit où (interdits croisés)

| Fichier | Rôle | Clés interdites ailleurs |
|---------|------|--------------------------|
| `manifest.json` | id, label, **synopsis** (≤ 100 car.) | — |
| `parts/locales.json` | `defaultLocale`, `locales[]` | — |
| `parts/prompts.json` | index system + contexts | `availableLocales`, `defaultLocale` |
| `parts/gen-prompts.json` | index templates gen | `availableLocales`, `defaultLocale` |
| `parts/config.json` | réglages | `pdm_system_prompt`, `pdm_profiles`, clés `pdm_context_gen_*` ; **`pdm_theme` par défaut : `marron-day`** |

## Rôle PHP vs navigateur

| Couche | Fichiers | Rôle |
|--------|----------|------|
| PHP mince | `lib/api/manifest.php`, `lib/api/lib.php` | `runtimeOk`, liste profils **depuis index.json**, `defaultProfileId` |
| Navigateur | `profile-bundle-loader.js`, etc. | fetch statique des `.md`, assemblage `pdm-config` |

Le PHP **ne charge pas** les prompts MD ; il valide que le déploiement contient des bundles cohérents.

**HTTP** : règle Apache dans le [`server HTTP config`](../../server HTTP config) racine — refuse tout sous-dossier autre que `speech2texte/`.

## Langues des prompts (12 locales)

Locales dans `parts/locales.json` (`ar`, `de`, `en`, `eo`, `es`, `fr`, `it`, `ja`, `ko`, `pt`, `ru`, `zh`). Langue UI → locale prompts (1:1).

## Export / import utilisateur

- **Session** : prompts édités mémorisés par locale (`pdm_prompts_bundle`).
- **Export ZIP** : archive profil complète.
- **Import ZIP** : restaure un profil dans `pdm_custom_profiles` — **pas** dans `assets/profiles/`.
