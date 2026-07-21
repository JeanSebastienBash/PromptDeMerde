# Tag notes v1.24.0 (RC)

> **Version courante** : `CS.VERSION` **1.24.0** — **release candidate** (pas encore stable).  
> Mémo de tag + smoke QA — **pas** une GitHub Release.

## Highlights

- Nouvelle clé `pdm_llm_input_char_budget` (slider Options LLM) : défaut **10000**, max **100000**, **0 = illimité** (une seule passe Reformulate).
- Abrogation du forçage multipass dès **2800** caractères Input.
- Découpe intelligente : tours `#USER:` / `#SYSTEM:` (bouton ↪) ou paragraphes / ponctuation.
- UI : plafond réflexion `pdm_llm_thinking_max_chars` passé en **ascenseur** (sémantique inchangée, 0 = illimité).
- Profil livré `speech2texte` aligné **v1.24.0** ; **52** clés top-level `pdm_*`.

## Smoke QA

- [ ] Options LLM : slider budget Input (0 → Illimité ; 10000 défaut ; 100000 max)
- [ ] Reformulate Input court sous budget → 1 passe
- [ ] Reformulate Input long au-dessus du budget → multipass + toast + `pass: i/n`
- [ ] Budget 0 + Input long → 1 passe
- [ ] Transcript `#USER:`/`#SYSTEM:` long → coupes aux tours
- [ ] Réflexion ON → slider max chars (0 = Illimité)
- [ ] Export / import ZIP profil contient `pdm_llm_input_char_budget`
- [ ] Footer app + badge README = **1.24.0-RC**
