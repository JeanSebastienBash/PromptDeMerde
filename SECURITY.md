# Security — PromptDeMerde.com

<p align="center">
  <img src="assets/images/flags/en.svg" alt="English" width="28" height="20">
</p>


> Threat model, Ollama proxy hardening, **profile ZIP archive** import, and deployment best practices.

## Architecture and sensitive data

| Component | Data | Server persistence |
|-----------|------|-------------------|
| Browser | Prompts, history, Ollama token (localStorage), proxy token (sessionStorage), audio blobs | None server-side |
| PHP proxy (`lib/proxy/ollama/olama.php`) | POST body to Ollama (prompts, contexts, **base64 vision images**) | **In-memory transit only** — no application disk write |
| Ollama | LLM inference | Depends on Ollama installation |
| Profile API (`lib/api/*.php`) | Markdown read → JSON | Read-only disk |

The proxy **does not replace** an application firewall. CORS is restricted in production (`PDM_ENV=prod`) to official origins; in official pre-production, self-hosting, or development, CORS is open (`*`) — **do not expose pre-prod or a clone on the Internet without network protection**.

**Profile export / import** is **100% client-side**: the ZIP archive (and the `pdm-config` it contains) is **never** sent to the PHP server. UI import accepts **`.zip` only** — a standalone JSON file is rejected. Risks concern **the user who imports** (local XSS, token theft in `localStorage`, browser DoS), not server compromise via the archive.

## Ollama proxy — risks

Without hardening, any HTTP client can:

- Relay requests to local Ollama (`127.0.0.1:11434`) or the LAN via `X-Ollama-Url`
- Consume GPU/CPU (resource abuse)
- Probe the private network (RFC 1918 allowed by host filter)

Measures implemented in `olama.php`:

| Measure | Variable / behavior |
|---------|---------------------|
| Optional authentication | `PDM_PROXY_TOKEN` — header `Authorization: Bearer …` or `X-PDM-Proxy-Token` |
| Rate limiting | 120 req/min/IP in prod, 300 in pre-prod / self-hosted (temp files) |
| POST body limit | `PDM_PROXY_MAX_BODY` (default 10 MB) |
| No HTTP redirect | `follow_location` disabled (anti-SSRF via redirect) |
| Sanitized headers | CRLF stripped in relayed `User-Agent` / `Accept` |
| Generic errors | Detailed messages hidden when `PDM_ENV=prod` |

### Configuring the proxy token

The proxy token protects the **operator PHP relay** to the prod server Ollama. **Visitors** do not need one: they use **their** local Ollama via direct browser connection.

1. **Server** (Apache **or** Nginx) — official prod (operator flow only):

   **Apache**

   ```bash
   # /etc/apache2/envvars
   export PDM_ENV=prod
   export PDM_PROXY_TOKEN="your-long-random-secret"
   ```

   ```apache
   # /etc/apache2/conf-available/pdm-env.conf
   PassEnv PDM_ENV
   PassEnv PDM_PROXY_TOKEN
   ```

   Then `sudo a2enconf pdm-env && sudo systemctl restart apache2`.

   **Nginx + PHP-FPM** (equivalent)

   In the FPM pool (e.g. `/etc/php/8.x/fpm/pool.d/www.conf` or dedicated pool):

   ```ini
   env[PDM_ENV] = prod
   env[PDM_PROXY_TOKEN] = your-long-random-secret
   ```

   Then `sudo systemctl reload php*-fpm`.  
   Alternative: `fastcgi_param` in `server` / `location ~ \.php$`:

   ```nginx
   fastcgi_param PDM_ENV prod;
   fastcgi_param PDM_PROXY_TOKEN "your-long-random-secret";
   ```

   **IP allowlist** mandatory on `/lib/proxy/` (Apache vhost, Nginx `location`, or reverse proxy in front) — the token **does not replace** this filtering.

   Nginx example:

   ```nginx
   location /lib/proxy/ {
       allow 127.0.0.1;
       allow ::1;
       allow YOUR.OPERATOR.IP;
       deny all;
       # … include snippets/fastcgi-php.conf / proxy_pass depending on stack
   }
   ```

   > Nginx: CSP, noindex `/lib/`, anti-listing, etc. must be replicated in the Nginx vhost config (Apache HTTP header equivalents).

2. **Operator** (authorized IP) — uncheck "I don't have a token", enter the **Proxy token** for the session:

   - **Options → LLM**: checkbox + token field on one line.
   - Storage: **`sessionStorage`** — `pdm_token_proxy` (secret) and `pdm_llm_direct_local` (flow A/B) — reset on each browser session.

3. **Prod visitors (flow A)** — leave **"I don't have a token"** checked; install <a href="https://ollama.ai/download" target="_blank" rel="noopener noreferrer">Ollama</a> locally; default URL `http://localhost:11434` in *Options → LLM*. **CORS required** on the workstation:

   ```bash
   OLLAMA_ORIGINS=https://promptdemerde.com ollama serve
   ```

   Linux (systemd): `Environment="OLLAMA_ORIGINS=https://promptdemerde.com"` in `/etc/systemd/system/ollama.service.d/environment.conf`, then `systemctl daemon-reload && systemctl restart ollama`.

   Without this variable: `Failed to fetch` on LLM test even if Ollama is running. IP allowlist on `/lib/proxy/` does not fix this case (it only concerns flow B).

> **Internet prod recommendation**: combine `PDM_PROXY_TOKEN` with an **IP allowlist** on `/lib/proxy/` — do not open the relay to visitors.

## Profile ZIP archive import — untrusted content (security v2 — v1.14.0+)

### Product promise

| Claim | True? |
|-------|-------|
| "Importing my validated full ZIP export restores my session" | **Yes** |
| "Importing any third-party archive is safe" | **No** — impossible without removing all workspace HTML richness and all user trust |
| "Importing a standalone `.json` from the UI" | **No** — rejected (`importJsonDeprecated`); **ZIP** container mandatory |

### Threat model (malicious archive)

```
Attacker ──► distributes evil-profile.zip (pdm-config + prompts)
                    │
                    ▼
Victim imports on https://promptdemerde.com
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
   Local XSS   Token theft   Browser DoS
   (guard)     localStorage  (large JSON/blobs)
        │
        └─────► fetch Ollama proxy (from victim browser, if token present)
```

| Threat | Reaches PHP server? | Reaches other users? | Status v1.14.0 |
|--------|---------------------|----------------------|----------------|
| RCE / disk write via profile import | No | No | Mitigated (client-only import) |
| Cross-user data theft | No | No | Mitigated (no multi-tenant) |
| XSS → theft of `pdm_token_*` | Not directly | No | **Mitigated** (sanitize + reject) |
| Client DoS (RAM, localStorage) | No | No | **Mitigated** (size limits) |
| Proxy abuse via victim session | Indirect | No | Depends on `PDM_PROXY_TOKEN` + infra |
| LLM prompt injection | No | No | By design (not a bug) |

### Technical measures (code)

| # | Measure | File(s) |
|---|---------|---------|
| 1 | HTML allowlist `promptGuardHtml` (`a[href^="#"]`, `strong`, `em`, `span.inject-*`) | `config-schema-sanitize.js` |
| 2 | Sanitization on import + render (defense in depth) | `config-schema-build.js`, `workspace-ui-profile.js` |
| 3 | Reject if `<script`, `onerror=`, `javascript:` before normalization | `containsDangerousWorkspaceHtml` |
| 4 | Import archive cap **20 MB** (ZIP) | `settings-ui.js`, `config-schema-security.js` |
| 5 | String length caps + JSON size estimate | `config-schema-security.js` |
| 6 | Reject keys `__proto__`, `constructor`, `prototype` (recursive) | `config-schema-security.js` |
| 7 | `pdm_audio_blobs`: segment format, max 50 refs, 50 MB base64 total | validator + `storage-config-audio.js` |
| 8 | `pdm_token_ollama` cleared by default on import (`stripTokens`) | `storage-config-import.js` |
| 9 | "Unsigned file / unknown source" dialog — **UX consent**, not crypto | `settings-ui.js` |
| 10 | **SHA-256 checksum** of ZIP bytes: if `expectedChecksum` provided and mismatch → **reject** | `profile-bundle-integrity.js`, `storage-config-import.js` |
| 11 | Manual test fixtures | `tests/fixtures/evil-*.json` |

### ZIP integrity (checksum) vs crypto signature

| Layer | Status (v1.23.1) |
|-------|------------------|
| SHA-256 on ZIP bytes | **Yes** — export (`buildZipPackage`), creator (`profile-zip-checksum.mjs`) |
| Import verification | **Yes** if `options.expectedChecksum` / `checksum_sha256` (otherwise unsigned dialog only) |
| `archive_trust.signed` | **Always false** until asymmetric signature is verified |
| Ed25519 / maintainer HMAC | **Out of scope** — separate ticket; future keys **off git** |

ZIP checksums: verify client-side integrity on import (profile bundle modules) — no dedicated server tool in the public clone.

### HTTP headers (server config)

- `Content-Security-Policy`: `script-src 'self' 'unsafe-inline' 'unsafe-eval'` — inline for `base href` script; `unsafe-eval` for **Vosk** (Worker `new Function()`); `connect-src` includes `'self' blob: data:` (STT WASM) and **local/LAN Ollama** (`localhost`, `127.0.0.1`, RFC1918 ranges) for prod flow A; `img-src` / `frame-src` allow footer thumbnails and YouTube embeds
- `Permissions-Policy`: `microphone=(self)` (dictation); camera and geolocation denied
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- Under `assets/profiles/`, only `speech2texte/` and `index.json` are served (zone doc: [`docs/Profiles.md`](docs/Profiles.md)) — everything else returns **403** (server HTTP rule)

### Residual risks (~5%)

- Browser / sanitizer zero-day
- Intentional prompt injection (`pdm_system_prompt`, contexts)
- Social engineering ("import this profile")
- Workstation compromise or malicious extension
- **Third-party self-hosting**: an admin **other than** the official maintainer who enabled HTTP body logging (verbose access/error logs, reverse proxy debug) — outside product promise, outside official stack

**Out of scope "residual" for official prod** (`promptdemerde.com`): the DreamProjectAI maintainer / operator **does not log** application request bodies (`olama.php` = RAM transit only). This is not a ~5% residual risk on that server — it is an **operational policy** (practical risk **~0%** as long as this policy holds).

## Profile ZIP archive export/import and tokens

Export produces a **ZIP archive** (`{slug}-promptdemerde-profile-v{version}.zip`) containing a `pdm-config` object (**51** `pdm_*` keys + metadata), Markdown prompts, and — in **maximal** preset — UI dictionaries. The machine schema [`assets/config/pdm-config.schema.json`](assets/config/pdm-config.schema.json) declares the **same 51** keys as `CS.PDM_KEYS` (plus optional `i18n`/`langs`).

Export includes `pdm_token_ollama` **in plain text** if present. User confirmation is requested before export. Never share an archive containing tokens.

The proxy token (`pdm_token_proxy`) and flow A preference (`pdm_llm_direct_local`) are **not** included in export — they live in **sessionStorage** only.

On **import**, `pdm_token_ollama` is **cleared by default** when the archive does not clearly come from a recent application export (protection against third-party archives).

## CORS

| Environment | `Access-Control-Allow-Origin` |
|-------------|-------------------------------|
| `PDM_ENV=prod` | `https://promptdemerde.com`, `https://www.promptdemerde.com` only |
| `PDM_ENV=preprod` / absent / other | `*` (official pre-prod, self-hosted, local development) |

CORS protects **reading** responses by third-party sites; it does not prevent server-side proxy execution.

## Profiles and HTML rendering

`pdm_workspace_ui.texts.promptGuardHtml` may contain intentional HTML (anchor links to the Prompts tab). Only profiles and exports from **trusted sources** should be imported.

History rendering, LLM errors, and workspace identity use `textContent` or `PDM.UI.escapeHtml`. `promptGuardHtml` is the only HTML field rendered via `innerHTML`, with allowlist sanitization.

## Report a vulnerability

Contact **dreamproject-ai@proton.me** by email (sole support channel).

**GitHub is not a project follow-up channel for DreamProjectAI**: no code review or issue triage on our side on the public repository. A security report via GitHub issue will therefore not be handled as a maintained ticket — prefer email.

DreamProjectAI **publishes versioned updates from time to time** on this repository via **<a href="https://github.com/JeanSebastienBash/PromptDeMerde/tags" target="_blank" rel="noopener noreferrer">git tags</a>** only — **no** GitHub Releases. The 1.x line is currently **RC** (not yet stable). No public schedule commitment.

## Public deployment checklist

### Pre-production (tests before prod)

- [ ] `PDM_ENV=preprod` + Apache/Nginx vhost with `Options -Indexes` and `SetEnv PDM_ENV preprod`
- [ ] Test: `GET /lib/` and `GET /assets/stt/` → **403** (no Apache listing)
- [ ] Test: `GET /README.md` → **403** (project doc root not exposed)
- [ ] HTTrack-type re-mirror: listings inaccessible, prompts/assets still served via direct GET

### Prod

- [ ] `PDM_ENV=prod` (footer badge **PROD**)
- [ ] `PDM_PROXY_TOKEN` set server-side; operator enters token **each session** (modal or Options → LLM)
- [ ] Reverse proxy with auth or IP allowlist
- [ ] Ollama not exposed directly on the Internet (127.0.0.1 or Unix socket)
- [ ] HTTPS mandatory
- [ ] CSP and security headers active (Apache/Nginx / vhost config)
- [ ] `.env` and secrets off Git (see `.gitignore`)
- [ ] Test: Ollama proxy returns 401 without token from the Internet
- [ ] Test: profile ZIP import triggers no server POST with archive content

## Related documents

| Document | Role |
|----------|------|
| [`README.md`](README.md) | Product pitch (EN) |
| [`docs/Documentation.md`](docs/Documentation.md) | Technical documentation (EN) |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Contributing (EN) |
| [`SECURITY.md`](SECURITY.md) | Security (EN) |
| [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) | Third-party notices (EN) |
| [`docs/Stt.md`](docs/Stt.md) | STT zone (EN) |
| [`docs/Stt-vosk.md`](docs/Stt-vosk.md) | Vosk catalogue (EN) |
| [`docs/Profiles.md`](docs/Profiles.md) | Profiles zone (EN) |
| [`docs/Vendor.md`](docs/Vendor.md) | Vendor zone (EN) |
