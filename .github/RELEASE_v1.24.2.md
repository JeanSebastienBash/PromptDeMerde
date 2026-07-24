# Tag notes v1.24.2 (RC · production-ready)

> **Version courante** : `CS.VERSION` **1.24.2** — **release candidate considered production-ready**.  
> Mémo de tag + smoke QA — **pas** une GitHub Release.

## Official status

- V1 considered complete (MVP on this line).
- Marketplace V1 complete; Free and Premium catalogue downloads stay free.
- GitHub Issues / PRs welcome; security + general support → email.
- No automated product test suite in this repository (maintainer choice); CI remains structural.

## Highlights

- Patch bump **1.24.1 → 1.24.2** — no new `pdm_*` keys (still **52**).
- Public Documentation scrub: remove private maintainer tooling filenames / phase numbers from `docs/Documentation.md`.
- Maintainer `lib/dev/` layout reorganised locally (excluded from the public mirror).
- README **Official note from DreamProjectAI** + channel / maturity copy aligned.

Free ZIP drop on GitHub remains the **v1.24.1** pack filenames until the next Creator rebuild.

## Smoke QA

- [ ] Footer app version = **1.24.2** (RC line)
- [ ] Badge README = **1.24.2-RC**
- [ ] Official note visible at top of README (`#menu-official-note`)
- [ ] `docs/Documentation.md` has **no** `json-profile-creator.sh` string
- [ ] Options → Speech2Texte `(native)` still loads; free ZIPs still list with their archive versions
- [ ] Reformulate (Ollama) still works
- [ ] Tag `v1.24.2` present on GitHub `/tags` (no GitHub Release) — when published
