# Channel Systems: independent PostgreSQL backend

Status: implemented self-hostable foundation; **not approved for production or real customer data**. Node 22, PostgreSQL 17 and Docker Compose run without a hosted database, Firebase or paid software service. Existing fictional dashboards and the company-onboarding simulation remain available. The Firebase preparation files are historical and are not imported by this backend. EVLT is outside this system and must remain untouched.

This work builds on the company-onboarding workflow merged through PR #11 and preserves it during the backend transition. The new PostgreSQL PR must remain unmerged for review; merging main would publish the demo through the existing Pages workflow.

## What exists

- Versioned, checksummed, transactionally applied SQL migrations for companies/settings/branding, accounts, memberships, packages, entitlement snapshots/overrides, task/attendance/general records, requests/decisions, uploads, explicit customer-access grants and audit events.
- Express API with native Node scrypt password hashing, salted hashes, opaque random session cookies (only hashes in PostgreSQL), absolute 12-hour expiry, logout, account suspension, password recovery/reset and session revocation. No production accounts/passwords are seeded.
- Current account/membership/company/module checks on protected operations; separate platform/operator and tenant roles; RLS for tenant resources and package controls. Runtime role is neither superuser, table owner nor BYPASSRLS; API startup refuses those roles.
- Bounded record APIs with strict schemas, immutable scope, parameterised SQL, optimistic versions, transaction-local identity and atomic mutation/audit writes. Lists are scoped and bounded to 100; full pagination is future work.
- Owner-only company/package/account controls, membership setup, package/feature requests and approvals. Template changes affect subsequent assignments, not every existing company automatically. Prices are nullable draft integers in GBP, not billing commitments. Company overrides add approved modules.
- Filesystem upload storage with private metadata, generated storage IDs, file-signature/type and size checks, no public static directory, attachment-only downloads, no-follow file opens, SHA-256 metadata, company quotas and a serialized global upload-allocation check.
- Explicit opt-in **Private server workspace** with server sign-in/recovery, company records/uploads, operator company/account creation and membership setup, and a live operator storage summary. The fuller offline package/onboarding UI remains separate; not all API endpoints have a production frontend yet.
- Compose persistence, migrations, health checks, loopback API binding, no published database port, resource limits, monitoring and consistent database+upload backup/restore tooling.

The demo is still the default. The new client only calls same-origin `/api` after explicit selection. No automatic Firebase, remote host or fictional-data fallback exists. The bundled Docker app serves the UI at `/owner-admin/` and the API at `/api`.

## Local synthetic installation (no live deployment)

Use a current Docker Engine and Compose v2 supporting BuildKit secrets and service completion dependencies, plus Node 22+ for environment generation. On Linux, Docker Engine/Compose are available as free software. On Windows use compatible Linux containers, preferably Docker Engine in WSL2; Docker Desktop has its own commercial licensing terms and is **not required**. Shell tooling below runs in Linux/WSL; keep the checkout and Docker volumes inside the Linux filesystem. Windows compatibility was designed, not tested on a Windows host.

Allow at least 4 GB RAM and substantially more than 20 GB free disk for images, PostgreSQL, uploads and backups. The initial **20 GiB upload allocation is a configurable application ceiling, not a filesystem reservation and not the total server disk requirement**. Software can be £0; hardware, electricity, connectivity, domain ownership and off-machine recovery media still have operating costs. No such purchase is made here.

From repository root:

```sh
node server/scripts/init-env.js
# Creates a private ignored .env with independent random DB passwords.
# Refuses to overwrite an existing file. Never print or commit its contents.
docker compose up -d --build
```

The initial config permits HTTP cookies only for loopback development at `http://localhost:3000`. Visit `http://localhost:3000/owner-admin/`. No account exists until bootstrap. Generate a unique strong initial owner password privately (12–128 characters), set `BOOTSTRAP_EMAIL` and `BOOTSTRAP_PASSWORD` in your shell without putting their values in shell history or scripts, then run:

```sh
docker compose run --rm -e BOOTSTRAP_EMAIL -e BOOTSTRAP_PASSWORD migrate node src/bootstrap.js
# Clear those shell variables immediately afterwards.
```

Bootstrap refuses to create a second platform operator. It does not create sample/live customers or grant the operator tenant memberships. Use the private workspace or API to create synthetic company accounts and assign company memberships. There is no default username/password, and the demo role selector does not authenticate against this API.

`docker compose ps` should show healthy db/api and a successfully exited migration service. Open `/api/health` for a minimal database-connectivity health check. The migration container holds the privileged migration identity; the API receives only the separate application identity. Never start the API with the migration URL.

Normal native Docker builds need no extra certificate configuration. In a managed environment with a custom HTTPS proxy, supply its public CA as an optional BuildKit `proxy_ca` secret, keeping TLS verification enabled:

```sh
docker build --secret id=proxy_ca,src="$CODEX_PROXY_CERT" -t channel-systems-api:local -f server/Dockerfile .
docker compose up -d --no-build
```

Compose builds use repository root as context. `.dockerignore` excludes `.env`, git metadata, node_modules, backups and test artifacts. Secret values are not copied into images. The optional proxy CA exists only during dependency installation.

## Configuration

| Setting | Purpose |
| --- | --- |
| DB_PASSWORD | Random migration/PostgreSQL bootstrap password, generated locally, hex to avoid URL encoding mistakes |
| API_DB_PASSWORD | Independent random runtime-role password, generated locally |
| PUBLIC_ORIGIN | Exact browser origin, no path/trailing slash; required for state-changing requests |
| INSECURE_LOCAL_HTTP | Development-only cookie exception; false for HTTPS deployment |
| STORAGE_ALLOCATION_BYTES | Total accounted upload ceiling, default 21474836480 (20 GiB) |
| DATABASE_URL | Server-only runtime connection; Compose supplies internally |
| MIGRATION_DATABASE_URL | Privileged migration/maintenance CLI connection only |
| STORAGE_ROOT / RECOVERY_ROOT | Absolute private directories inside API container |

The application never returns either database password. Compose environment values remain visible to Docker host administrators; protect `.env` with filesystem permissions/Windows ACLs, restrict Docker access and protect backups. This is not a secrets vault. Do not run `docker compose config` in shared logs because it expands secrets. Database password rotation is not achieved by editing POSTGRES_PASSWORD on an existing volume; plan an explicit DB role/password rotation and API restart.

## HTTPS and secure remote access — future installation guidance

Do not publish port 5432. Compose publishes port 3000 only on 127.0.0.1. For an approved private installation, place a maintained free reverse proxy such as Caddy or nginx on the host in front of that loopback port. Terminate TLS using an approved certificate (public ACME certificates can be free where domain/network requirements are met), set PUBLIC_ORIGIN to the exact HTTPS origin and INSECURE_LOCAL_HTTP=false, then recreate API. The `__Host-` session cookie is Secure, HttpOnly, SameSite=Strict and path=/; it has no Domain attribute. HTTPS must be working before real sign-in.

Prefer VPN or SSH tunnel access over public internet exposure for initial testing. Keep SSH key-only access, firewall rules, operating-system/Docker/PostgreSQL updates and narrowly scoped admin access under the server owner's control. No VPN, certificate, DNS, firewall or live server is configured by this change. The API does not trust arbitrary X-Forwarded-For headers; rate limits behind a reverse proxy currently share that proxy's IP. Configure narrowly trusted proxy handling only after reviewing the actual network path. Never enable unrestricted trust-proxy to bypass limits.

All state-changing calls require exact Origin and X-CSRF-Protection: 1; no cross-origin CORS grant is installed. Bearer tokens or browser localStorage tokens are not used. Password recovery prepares a JSON delivery file in the private recovery volume, never returns a token in the HTTP response, and stores only a hash in PostgreSQL. A verified operator must deliver the token privately; the recipient uses the reset form in Private server workspace. The link fragment contains `recovery=<token>` and is not sent in HTTP URLs/logs. No email service, SMTP password or paid messaging is assumed. This manual delivery is a functional development recovery path, not a production account-recovery process.

## Operations, backups and storage

See [operations and recovery](OPERATIONS.md), [API and security boundary](SECURITY.md) and [test evidence](TESTING.md). The server has not been deployed. A final threat review, independently tested recovery, MFA/recent authentication for operators, account provisioning/invitations, secure delivery, monitoring/alerts and a full frontend migration remain launch gates.

Security follow-up: see the [issue #13 risk report](SECURITY-REVIEW-13.md). Apply migration 002 and re-run provisioning with API stopped; historical audits remain explicitly legacy. The follow-up is for review, not permission to deploy or auto-merge.
