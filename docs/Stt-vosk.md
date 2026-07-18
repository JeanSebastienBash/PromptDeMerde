# Vosk catalogue (runtime)

<p align="center">
  <img src="../assets/images/flags/en.svg" alt="English" width="28" height="20">
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
| [`../README.md`](../README.md) | Product pitch |
| [`Documentation.md`](Documentation.md) | Technical documentation |
| [`../CONTRIBUTING.md`](../CONTRIBUTING.md) | Contributing |
| [`../SECURITY.md`](../SECURITY.md) | Security |
| [`../THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md) | Third-party notices |
| [`Stt.md`](Stt.md) | STT zone |
| [`Profiles.md`](Profiles.md) | Profiles zone |
| [`Vendor.md`](Vendor.md) | Vendor zone |
