# Tag notes v1.24.1 (RC)

> **Version courante** : `CS.VERSION` **1.24.1** — **release candidate** (pas encore stable).  
> Mémo de tag + smoke QA — **pas** une GitHub Release.

## Highlights

- Shared free ZIP drop `zip/free-profile/` with shipped **Speech2Texte** + **PromptListStructurator** (`*-promptdemerde-profile-v1.24.1.zip`).
- Options selector: sequential ZIP validation (invalid archives ignored); permanent scan status + Show more / Show less for rejects.
- PascalCase profile nomenclature (stems, labels, create/export).
- Selector badges end with archive version `(x.y.z)`; native vs zip dedupe keeps `(native)`.
- No new `pdm_*` keys — still **52** top-level; `speech2texte` + free packs aligned **v1.24.1**.

## Smoke QA

- [ ] Options → JSON profile: Speech2Texte `(native) (Free) (1.24.1)` and PromptListStructurator `(zip) (Free) (1.24.1)`
- [ ] Drop an invalid ZIP under `zip/free-profile/` → skipped from selector; permanent refused line + Show more
- [ ] All valid → permanent “all archives valid” line
- [ ] Create / export profile name enforces PascalCase
- [ ] Footer app + badge README = **1.24.1-RC**
- [ ] Import free ZIP Speech2Texte / PromptListStructurator succeeds
