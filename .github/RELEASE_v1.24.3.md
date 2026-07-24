# Tag notes v1.24.3 (RC · production-ready)

> **Version courante** : `CS.VERSION` **1.24.3** — **release candidate considered production-ready**.  
> Mémo de tag + smoke QA — **pas** une GitHub Release.

## Official status

- V1 branch done (MVP finished on this line).
- Marketplace V1 finished; Free and Premium catalogue downloads stay free on V1.
- GitHub Issues / PRs invited; security + general questions → email.
- No automated product test suite in this repository (maintainer choice); CI remains structural in this GitHub repo.
- No V2 while solo (stated in README official note).

## Highlights

- Patch bump **1.24.2 → 1.24.3** — no new `pdm_*` keys (still **52**).
- README **Official note from DreamProjectAI** (direct voice) + open contribution channels.
- Safer untrusted profile archive display (`ui-safe-display.js` + callers).

Free ZIP drop on GitHub remains the **v1.24.1** pack filenames until the next Creator rebuild.

## Smoke QA

- [ ] Footer app version = **1.24.3** (RC line)
- [ ] Badge README = **1.24.3-RC**
- [ ] Official note visible at top of README (`#menu-official-note`)
- [ ] Import a ZIP with custom chrome → labels render as text (no HTML execution)
- [ ] Options → Speech2Texte `(native)` still loads; free ZIPs still list with their archive versions
- [ ] Reformulate (Ollama) still works
- [ ] Tag `v1.24.3` present on GitHub `/tags` (no GitHub Release) — when published
