# Checklist tests — clone PromptDeMerde.com

Matrice de validation manuelle après `git clone` et déploiement sur Apache + PHP 7.4+.

## Prérequis

- [ ] Ollama installé et démarré (`ollama list`)
- [ ] Au moins un modèle tiré (`ollama pull llama3.2` ou équivalent)
- [ ] PHP 7.4+ avec Apache (ou Nginx + PHP-FPM)
- [ ] Accès `http://localhost/.../index.html` (pas `file://`)

## 1. Démarrage applicatif

- [ ] Page charge sans erreur console bloquante
- [ ] Footer affiche `v1.4.0`
- [ ] Navigation hash : `#workspace`, `#prompts`, `#settings`, `#documentation`, `#mentions`, `#cgu`, `#privacy`, `#support`
- [ ] Sans bundle homepage : pas de lien Accueil, ouverture sur Workspace

## 2. Workspace et LLM

- [ ] Prompt système ou au moins un contexte actif requis pour nettoyer
- [ ] Test connexion Ollama (Options) : statut OK
- [ ] Nettoyage d'un texte brouillon : streaming visible, résultat dans la zone sortie
- [ ] Interruption (bouton Arrêter) conserve le texte partiel
- [ ] Historique : entrée créée, restauration, suppression

## 3. Export / import JSON

- [ ] Export produit `promptdemerde-config-v1.4.0.json`
- [ ] Avertissement si token Ollama configuré
- [ ] Import complet remplace les données et recharge la page
- [ ] Fichier incomplet rejeté sans effacer la session

## 4. Dictée vocale (STT)

### Vosk Mini (CPU, le plus léger)

- [ ] Premier clic charge le modèle (~39 Mo)
- [ ] Transcription visible dans le Workspace
- [ ] Bip début / fin audible

### Whisper Mini (si GPU ou CPU acceptable)

- [ ] Chargement modèle ONNX
- [ ] Fallback WASM si WebGPU indisponible

### Parakeet (optionnel)

- [ ] `bash assets/stt/parakeet/restore-encoder.sh` exécuté
- [ ] Encoder présent (`encoder-model.int4.onnx`)
- [ ] Bips dictée fonctionnels

## 5. Navigateurs

| Test | Chrome / Edge | Firefox | Safari |
|------|---------------|---------|--------|
| Workspace + nettoyage | | | |
| Export / import | | | |
| Vosk Mini dictée | | | |
| Micro HTTP local | localhost OK | `about:config` si LAN HTTP | |

### Firefox — micro en HTTP local

Si le site est servi en HTTP (non localhost) :

1. `about:config` → `media.devices.insecure.enabled` = true
2. `media.getusermedia.insecure.enabled` = true
3. Recharger et autoriser le micro

## 6. Sécurité proxy (si exposé sur Internet)

- [ ] `X-Ollama-Url` vers IP publique refusée (403)
- [ ] `localhost` et IP LAN privée acceptées
- [ ] En prod (`PDM_ENV=prod`) : CORS limité au domaine du site

## 7. Régressions connues corrigées (v1.4.0 audit)

- [ ] Un seul routeur hash (`app.js`, pas de conflit `polish.js`)
- [ ] Messages d'erreur LLM échappés (pas d'injection HTML)
- [ ] GPU Whisper/Parakeet : seuils VRAM 4 Go min / 6 Go conseillé

---

**Date de la matrice** : juillet 2026 · **Version cible** : 1.4.0
