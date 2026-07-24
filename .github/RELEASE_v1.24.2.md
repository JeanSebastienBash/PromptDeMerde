# Tag notes v1.24.2 (RC)

> **Version courante** : `CS.VERSION` **1.24.2** — **release candidate** (pas encore stable).  
> Mémo de tag + smoke QA — **pas** une GitHub Release.

## Highlights

- Patch bump **1.24.1 → 1.24.2** — no new `pdm_*` keys (still **52**).
- Public Documentation scrub: remove private maintainer tooling filenames / phase numbers from `docs/Documentation.md`.
- Maintainer `lib/dev/` layout reorganised locally (excluded from the public mirror).

Free ZIP drop on GitHub remains the **v1.24.1** pack filenames until the next Creator rebuild.

## Smoke QA

- [ ] Footer app version = **1.24.2-RC**
- [ ] Badge README = **1.24.2-RC**
- [ ] `docs/Documentation.md` has **no** `json-profile-creator.sh` string
- [ ] Options → Speech2Texte `(native)` still loads; free ZIPs still list with their archive versions
- [ ] Reformulate (Ollama) still works
- [ ] Tag `v1.24.2` present on GitHub `/tags` (no GitHub Release)
