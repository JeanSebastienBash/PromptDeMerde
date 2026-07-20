# Vosk catalogue (runtime)

<p align="center">
  <img src="../assets/images/flags/en.svg" alt="English" width="28" height="20">
</p>
**Documentation navigation** · [Technical documentation](Documentation.md) · [STT models](Stt.md) · [Vosk catalogue](Stt-vosk.md) · [Profiles](Profiles.md) · [Vendor JS](Vendor.md) · [README](../README.md) · [Security](../SECURITY.md)

> **Long-form**: [Documentation.md — 5.3.1](Documentation.md#feat-5-3-1) · layout [`Stt.md`](Stt.md)

- **`assets/stt/vosk/catalog.json`** — runtime manifest (languages, paths, SHA, `available`, optional `maxi` blocks).
- **FR legacy mini**: [`assets/stt/vosk-mini/model.tar.gz`](../assets/stt/vosk-mini/model.tar.gz) (do not touch).
- **FR legacy maxi**: [`assets/stt/vosk-maxi/model.tar.gz`](../assets/stt/vosk-maxi/model.tar.gz) (do not touch).
- **Other product languages**: **Vosk Mini only** — `assets/stt/vosk-mini/{langId}/model.tar.gz` + GitHub parts ([`install/vosk-assets.manifest`](../install/vosk-assets.manifest)).

**Policy**: product multilingual coverage goes through **Vosk Mini** (languages shipped in the catalogue). **Vosk Maxi** stays French-centred (legacy path) — no Maxi extension to other open-source languages. Do not regenerate FR legacy tarballs.

After `git clone`, rebuild heavy binaries with `cd install && bash restore-large-assets.sh` (see [`Stt.md`](Stt.md)). WASM runtime: [`Vendor.md`](Vendor.md).

**Documentation navigation** · [Technical documentation](Documentation.md) · [STT models](Stt.md) · [Vosk catalogue](Stt-vosk.md) · [Profiles](Profiles.md) · [Vendor JS](Vendor.md) · [README](../README.md) · [Security](../SECURITY.md)

## Related documents

| Document | Role |
|----------|------|
| [`Documentation.md`](Documentation.md) | Technical documentation — long-form README mirror |
| [`Stt.md`](Stt.md) | STT models — layout under `assets/stt/` |
| [`Stt-vosk.md`](Stt-vosk.md) | Vosk runtime catalogue |
| [`Profiles.md`](Profiles.md) | Bundled profiles & ZIP contract |
| [`Vendor.md`](Vendor.md) | Embedded JS / ONNX vendor |
| [`../README.md`](../README.md) | Product pitch |
| [`../SECURITY.md`](../SECURITY.md) | Security |
| [`../CONTRIBUTING.md`](../CONTRIBUTING.md) | Contributing |
| [`../THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md) | Third-party notices |


