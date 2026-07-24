# Tag notes v1.24.1 (RC)

> **Version courante** : `CS.VERSION` **1.24.1** — **release candidate** (pas encore stable).  
> Mémo de tag + smoke QA — **pas** une GitHub Release.

## Feature freeze (V1)

No new V1 product features. Allowed work: **bug fixes**, **screen polish**, and **official JSON profile packs** for `zip/free-profile/`. Marketplace downloads stay **free**; paid checkout is out of scope for V1.

## Highlights

- Shared free ZIP drop `zip/free-profile/` with **AdsGeneratorPro**, **ContractClauseCleaner**, **MeetingMinutesPro**, **NoConformistLandpage**, **SeoMetaPack** (`*-JsonProfile-v1.24.1.zip`, embedded `market/`).
- **Speech2Texte** remains the native boot pack (`assets/profiles/`) — not duplicated in the free drop.
- **Marketplace V1**: official DreamprojectAI packs only; **all downloads free** (no cart / checkout).
- Provider selector: **Ollama only** (no greyed Free LLM / cloud “coming soon” option).
- Options selector: sequential ZIP validation (invalid archives ignored); permanent scan status + Show more / Show less for rejects.
- PascalCase profile nomenclature (stems, labels, create/export).
- Selector badges end with archive version `(x.y.z)`; native vs zip dedupe keeps `(native)`.
- No new `pdm_*` keys — still **52** top-level; `speech2texte` + free packs aligned **v1.24.1**.

## Smoke QA

- [ ] Options → JSON profile: Speech2Texte `(native) (Free) (1.24.1)` plus the five free ZIPs as `(zip) (Free) (1.24.1)`
- [ ] Marketplace (official): five cards; CTA **Download** (never Purchase) → real ZIP under `zip/free-profile/`
- [ ] Drop an invalid ZIP under `zip/free-profile/` → skipped from selector; permanent refused line + Show more
- [ ] All valid → permanent “all archives valid” line
- [ ] Create / export profile name enforces PascalCase
- [ ] Footer app + badge README = **1.24.1-RC**
- [ ] Import free ZIP (e.g. AdsGeneratorPro) succeeds → Workspace Reformulate OK
- [ ] Provider select lists **Ollama** only (no disabled cloud option)
- [ ] Nav label reads **Marketplace**
