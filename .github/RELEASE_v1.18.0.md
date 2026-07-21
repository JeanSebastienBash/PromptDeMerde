# Tag notes v1.18.0 (archive)

> Fiche archive pour le **tag** v1.18.0 (pas une GitHub Release). **Version courante du dépôt** : voir [`README.md`](../README.md) et `CS.VERSION` (**RC** — pas encore stable).

## Résumé

PromptDeMerde.com — reformulateur de prompts IA **100 % local** (Ollama), open source MIT, sans compte, zéro télémétrie. Dictée vocale dans le navigateur (Vosk, Whisper, Parakeet). Sauvegarde et partage via **archive ZIP profil** (43 clés `pdm_*` à l’époque ; **49** clés en v1.21.0).

## Après clone (obligatoire)

```bash
git clone https://github.com/JeanSebastienBash/promptdemerde.git
cd promptdemerde
cd install
bash restore-large-assets.sh
```

Reconstitue les modèles STT (> 40 Mo) livrés en parts ≤ 30 Mo. Sans cette étape, la dictée ne fonctionne pas.

## Points forts

- Workspace + Prompts + Options — **12 langues**, **50 thèmes**
- STT : Vosk Mini/Maxi, Whisper, Parakeet
- Export / import **archive ZIP profil** — `{profil}-promptdemerde-profile-v1.23.2.zip`
- Ollama local (visiteur ou auto-hébergement) — voir `SECURITY.md` pour le proxy opérateur

## Plan de test

- [ ] `cd install && bash restore-large-assets.sh` sur un clone frais
- [ ] Workspace + nettoyage Ollama
- [ ] Dictée Vosk Maxi (Linux) ou moteur disponible
- [ ] Export / import ZIP profil
