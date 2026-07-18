# Vosk catalogue (runtime)

<p align="center">
  <a href="Stt-vosk.en.md"><img src="../assets/images/flags/en.svg" alt="English" width="28" height="20"></a>
  &nbsp;
  <a href="Stt-vosk.md"><img src="../assets/images/flags/fr.svg" alt="Français" width="28" height="20"></a>
</p>

- **`catalog.json`** — runtime manifest (languages, paths, SHA, `available`, optional `maxi` blocks).
- **FR legacy mini**: `../vosk-mini/model.tar.gz` (do not touch).
- **FR legacy maxi**: `../vosk-maxi/model.tar.gz` (do not touch).
- **Other product languages**: **Vosk Mini only** — `../vosk-mini/{langId}/model.tar.gz` + GitHub parts (`install/vosk-assets.manifest`).

**Policy**: product multilingual coverage goes through **Vosk Mini** (languages shipped in the catalogue — already delivered). **Vosk Maxi** stays French-centred (legacy path) — no Maxi extension to other open-source languages. Do not regenerate FR legacy tarballs.

**Scope**: the STT / Vosk language effort is **closed** for the open-source product. No Vosk engine redesign; no major catalogue expansion. Only minor fixes remain in scope.

## Related documents

| Document | Role |
|----------|------|
| [`../README.md`](../README.md) | Product pitch (EN) |
| [`Documentation.en.md`](Documentation.en.md) | Technical documentation (EN) |
| [`../CONTRIBUTING.md`](../CONTRIBUTING.md) | Contributing (EN) |
| [`../SECURITY.md`](../SECURITY.md) | Security (EN) |
| [`../THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md) | Third-party notices (EN) |
| [`Stt.en.md`](Stt.en.md) | STT zone (EN) |
| [`Stt-vosk.en.md`](Stt-vosk.en.md) | Vosk catalogue (EN) |
| [`Profiles.en.md`](Profiles.en.md) | Profiles zone (EN) |
| [`Vendor.en.md`](Vendor.en.md) | Vendor zone (EN) |
