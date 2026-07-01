# BJMAPEX GRC Intelligence — Target Architecture & Migration Plan

_Prepared as Phase 3 (planning) following the Phase 1 gap audit. Status: for sign-off before code changes begin._
_Date: 2026-07-01_

---

## 1. Decisions this plan is built on (confirmed)

| Decision | Position |
|---|---|
| Product model | Multi-tenant SaaS owned/operated by the user's private consultancy. LGSETA = client #1. |
| **LGSETA data residency** | **LGSETA requires their data in their OWN Azure tenant** → LGSETA gets a **dedicated single-tenant deployment**. The consultancy's shared multi-tenant cloud is for future clients. |
| Codebase | **Multi-tenant-capable from day one** (`tenant_id` on every record, tenant-scoped auth, platform-admin role). LGSETA simply runs it in single-tenant mode. **One codebase, two deploy modes.** |
| Data layer | PostgreSQL (Azure Database for PostgreSQL — Flexible Server), row-level security on `tenant_id`. |
| Auth | Entra ID (OIDC), config-driven, pluggable provider with local-accounts fallback (`AUTH_MODE`). |
| Mobile | Deferred. Web is **PWA-ready first**; React Native later. |
| Hosting (LGSETA) | LGSETA's Azure tenant, region **South Africa North**. |

**Why the "own tenant" answer is good news:** it *removes* the entanglement risk. LGSETA's confidential risk/UIFW data lives entirely inside LGSETA's Azure subscription; your IP (the code) is deployed there under licence but your infrastructure and other clients' data never touch it. This makes the IP/COI story far cleaner — see §9.

---

## 2. Two deployment modes, one codebase

The single most important architectural principle: **build once, deploy two ways.** The application code is identical; only configuration and infrastructure differ.

| | **Mode A — LGSETA (dedicated single-tenant)** | **Mode B — Consultancy shared SaaS** |
|---|---|---|
| Azure subscription | LGSETA's | Yours |
| Region | South Africa North | South Africa North |
| Tenants in the DB | 1 (LGSETA) | Many (client per `tenant_id`) |
| Identity | LGSETA's Entra tenant (staff SSO) | Your Entra multi-tenant app federating to each client; Entra External ID / local for clients without Entra |
| Isolation | Whole environment is LGSETA-only | Row-level security on `tenant_id` in one DB |
| Deploy | `bicep` one-command into LGSETA sub | Same Bicep, your sub |
| Ownership | You license the software; LGSETA owns their data | You own software + operate the platform |

Because `tenant_id` and tenant-scoped auth exist from day one, Mode A is just Mode B with a single tenant seeded and RLS still enforced. Retrofitting multi-tenancy later would be brutal; adding it now is nearly free.

---

## 3. Target logical architecture

See the rendered diagram. In words, request flow and components:

1. **Users** (LGSETA staff, risk owners) hit the **React PWA** served by **Azure Static Web Apps**.
2. Authentication is via **Entra ID (OIDC)** — SSO, MFA, and group/role claims. The PWA obtains an ID/access token; no credentials are handled by our code.
3. The PWA calls the **Express API (`/api/v1`)** hosted on **Azure App Service** (or Container Apps). Every request carries a bearer token.
4. The API runs, in order, on every request: **token validation → tenant resolution → authorization (role check) → input validation (Zod) → business logic → append-only audit write.**
5. State lives in **PostgreSQL Flexible Server** with **row-level security keyed on `tenant_id`**. File uploads go to **Blob Storage**. All secrets (DB connection, OIDC client secret, storage keys) come from **Key Vault** via managed identity — nothing hardcoded.
6. **Application Insights** captures logs/metrics/traces. **GitHub Actions** builds and deploys; **Bicep** provisions the whole stack reproducibly.

**What this kills from the Phase 1 findings:** hardcoded API URL (#11), open datastore (#1–3), JSON race condition (#5), unencrypted flat file (#6), local upload path-traversal (#7), no audit trail (#10), no monitoring/secrets management (#11, #17).

---

## 4. Data architecture

**Engine:** PostgreSQL 16 (Flexible Server), encryption at rest (Azure-managed keys; customer-managed via Key Vault optional for LGSETA), automated backups, point-in-time restore.

**Tenancy:** every table carries `tenant_id UUID NOT NULL`. **Row-level security** policies restrict every query to the caller's tenant; the app sets `SET app.tenant_id = '<uuid>'` per request/connection. Platform-admin role can cross tenants (Mode B operator console only).

**Schema shape (from the current JSON keys):** one table per collection rather than one JSON blob —
`risks`, `operational_risks`, `kris`, `treatment_actions`, `opportunity_risks`, `emerging_risks`, `uifw_cases`, `fraud_cases`, `bcm_incidents`, `compliance_universe`, `compliance_calendar`, `projects`, `contracts`, `iam_users`, `pam_accounts`, `access_reviews`, `policies`, `processes`, `declarations`, `ia_engagements`, `ia_findings`, `ia_followups`, plus `tenants`, `users`, `roles`, and an append-only `audit_log`. Summary/rollup values (currently stored, e.g. `summary.totalRisks`, UIFW totals) become **computed** at query time or via views — no more denormalised counters drifting out of sync.

**Audit trail:** `audit_log` is append-only (INSERT-only role, no UPDATE/DELETE grant) capturing `tenant_id, actor, action, entity_type, entity_id, before, after, timestamp, source_ip`. This is what makes the tool defensible to the AG/ARC — currently absent.

**Migration off JSON:** a one-off, idempotent Node migration script reads `dashboardData.json`, assigns the LGSETA `tenant_id`, and inserts into the normalised tables. Run against a staging DB first; verify row counts and a report diff (generate an EXCOM report from JSON vs from DB and compare) before cutover.

---

## 5. Authentication & authorization

**Provider:** Entra ID via OIDC. Built as a **pluggable auth module** so `AUTH_MODE=entra|local` selects the strategy. Config (`TENANT_ID`, `CLIENT_ID`, `CLIENT_SECRET`, `REDIRECT_URI`) comes from Key Vault.

- **Mode A (LGSETA):** app registered in LGSETA's Entra tenant; staff sign in with their LGSETA accounts.
- **Mode B (SaaS):** multi-tenant app registration in your tenant, federating to each client's Entra; clients without Entra use Entra External ID or local accounts.

**Role model (reserve all of these now):**

| Role | Scope | Can |
|---|---|---|
| `platform-admin` | Above all tenants (operator = you) | Manage tenants, cross-tenant ops (Mode B only) |
| `tenant-admin` | One tenant | Manage users, all modules, generate reports |
| `risk-owner` | One tenant | Edit own risks/actions, attest |
| `contributor` | One tenant | Create/edit within assigned modules |
| `viewer` | One tenant | Read + generate reports |

Authorization is enforced in API middleware (role + tenant), not the UI. The UI only hides what a role can't do; the server is the boundary.

**Token flow doubles as mobile-ready:** because the API is token-authenticated and stateless, the future React Native app uses the same OIDC flow and the same `/api/v1` — no second auth system.

---

## 6. API redesign

- **Versioned:** all routes under `/api/v1`.
- **Delete the dangerous endpoints:** remove `GET/PUT /api/dashboard` (whole-store read/write) and the `declare.html` read-all-write-all pattern. Declarations become `POST /api/v1/declarations` — authenticated (or a scoped tokenised link for staff attestation), appending one validated record server-side.
- **Per-collection, validated:** each collection gets REST routes with **Zod schemas**; reject anything that doesn't validate. Never persist raw `req.body`.
- **Hardening:** `helmet`, `express-rate-limit`, request size caps, CORS restricted to known origins, generic client error messages (detail to App Insights only).
- **Uploads:** server-generated filenames, MIME + size validation, streamed to Blob Storage, parsed with an up-to-date/replacement spreadsheet library (retire vulnerable `xlsx@0.18.5`).
- **Pagination/filtering** added on list endpoints (cheap now, essential at scale).

---

## 7. Findings → remediation traceability

| Phase 1 finding | Closed by |
|---|---|
| #1 Public declare read/writes whole DB | §6 (scoped declarations endpoint) |
| #2 No auth | §5 (Entra + middleware) |
| #3 Blanket `PUT /api/dashboard` | §6 (endpoint removed, per-collection validated writes) |
| #4 IP/COI | §9 + own-tenant deployment (§2) |
| #5 JSON race/corruption | §4 (PostgreSQL + transactions) |
| #6 Unencrypted PII at rest | §4 (encryption at rest; remove real data from repo seed) |
| #7 Upload path-traversal | §6 (random names, Blob, validation) |
| #8 Vulnerable `xlsx` | §6 (library retire/replace) |
| #9 Open CORS | §6 (origin allow-list) |
| #10 No audit trail | §4 (append-only `audit_log`) |
| #11 Hardcoded config / info leak | §3 (Key Vault, App Insights) |
| #12–16 Repo hygiene, monolith, tests, seed data | §8 (CI, decomposition, `.gitignore`, tests) |
| #17 No hardening middleware | §6 |

---

## 8. Phased migration plan

Effort bands are indicative for a solo operator: **S** ≈ days, **M** ≈ 1–2 weeks, **L** ≈ 3+ weeks. This is a **large undertaking; the data-layer + auth work (Phase 1) is the bulk of it.**

### Phase 0 — Repo & foundations (S)
- `.gitignore` `node_modules/` and `dist/`; purge them from the repo.
- Split `App.jsx` (9,079 lines) into module files; split `server.js`; **delete the duplicate `/api/reports` route and the orphaned `reportGenerator.js`.**
- Move hardcoded seed/business data out of components.
- Stand up GitHub Actions (lint + build).

### Phase 1 — Foundation / security & data (L) — _the critical block_
- Provision Azure via **Bicep**: App Service, Static Web Apps, Postgres Flexible Server, Key Vault, Blob, App Insights (parameterised for Mode A vs B).
- Design normalised schema + RLS; write and verify the **JSON→Postgres migration**.
- Implement **Entra OIDC** auth + role/tenant middleware; reserve `platform-admin`.
- **Retire the dangerous endpoints;** rebuild the API as validated `/api/v1` routes with `tenant_id`.
- Add hardening middleware; move uploads to Blob; replace `xlsx`.
- Make the frontend **PWA-ready**; move config to env/Key Vault (kill `App.jsx:9`).
- **Deploy Mode A into LGSETA's Azure tenant (SA North).**

### Phase 2 — Operationalise (M)
- Risk-owner **email attestation loop** (Graph/ACS email + Azure Function timer; tokenised update links feeding reports).
- **Server-side audit trail** live across all mutations.
- Unit + integration **tests**; full CI/CD gates.

### Phase 3 — Ecosystem (L, when clients grow)
- API Management; integrate Finance/ERP → UIFW and HR → owners/units; event-driven sync (Service Bus/Event Grid). GRC tool = system of record for risk, consuming reference data.

### Phase 4 — Intelligence (M, advisory only)
- Emerging-risk horizon scanning, **human-in-the-loop only** — curated SA-gov/sector sources + Azure OpenAI (in-tenant) feeding a candidate-risk queue an officer accepts/rejects. **Never auto-changes ratings** (audit defensibility).

---

## 9. IP / conflict-of-interest gate (must clear before Phase 1 deploy)

The own-tenant deployment cleans up the technical entanglement, but the governance items remain and are **blocking for the LGSETA go-live**:

1. **Written IP-ownership / licensing agreement** — you retain IP; LGSETA receives a licence to run it in their tenant.
2. **COI declaration + clearance** from LGSETA's Accounting Authority / ARC — you are a GRC Manager deploying your own commercial product to your employer.
3. **Procurement/PFMA path** — ensure the software's entry into LGSETA's estate follows a proper SCM route, so the tool itself doesn't become an irregular-expenditure finding.

_I am not a lawyer; obtain qualified legal + governance sign-off. Do not deploy Mode A until items 1–2 are in writing._

---

## 10. What I need from you to start building

1. Confirm the **build sequence** (recommend Phase 0 → Phase 1).
2. Access/decisions for LGSETA's Azure: subscription, resource-group naming, and whether LGSETA's ICT will register the Entra app or delegate it.
3. Confirmation the **IP/COI gate (§9)** is in progress (build can proceed; deploy waits on it).
4. Any LGSETA constraint on **customer-managed keys** or specific SA-public-sector hosting controls.
