# Architecture and organisation onboarding

## Repository assessment

Initial architecture: React 18, React DOM, Lucide icons, Vite 6, GitHub Pages at `/owner-admin/`; no router, server, Firebase SDK/configuration, lockfile, tests or lint. One compressed component held all state. Customer concepts offered static metrics and placeholder module pages. Existing commercial and security documents already describe launch gates; this change does not replace those gates or duplicate the business plan.

## Implemented demonstration

- `src/main.jsx`: mount only; `src/App.jsx`, `src/pages/` and `src/layout/`: focused console views.
- `src/hooks/`: controller, backend loading/subscription and drawer keyboard behavior.
- `src/backend/`: explicit resource contracts and the fictional in-memory adapter.
- `src/model.js`: sector presets, module catalogue, dependencies, fixture creation and scoped record helpers.
- `src/components.jsx`: native modal forms, panels, table and status primitives.
- `src/CustomerWorkspace.jsx`: one configurable customer application, generic records and summary report.
- `src/style.css`: green header, dark drawer, compact panels, responsive tables and print layout.

UI state lives in React memory and fictional resource state lives in the in-memory adapter. There are no service calls or browser-storage persistence. Records include organisation ID, module, ID, title, detail and progress; IDs are generated with `crypto.randomUUID`. UI selectors filter by organisation and enabled modules. This is a correctness property of demo code, **not a security boundary**. Any visitor controls their browser.

Organisation configuration includes name, sector, colour, modules, administrator labels, plan, billing cycle, trial date, status and notes. A sector supplies defaults when creating an organisation; subsequent sector edits do not replace modules or records. Logo upload, menu reordering, field configuration and module-specific settings are pending.

## Proposed production boundary (not implemented)

Keep a single shared customer application, configured by a server-fetched organisation profile. Serve owner and customer surfaces with separate privileged routes and access policies. Decide whether a separate private repository is needed for deployment governance; do not duplicate a codebase per customer.

Evaluate a **new** Firebase project against another managed identity/database stack before provisioning. No Firebase project is selected or connected here. Use separate development, staging and production environments, entirely independent of EVLT.

Proposed API contracts:

| Operation                                    | Required server checks                                                      | Effects                                           |
| -------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------- |
| `GET /me/workspace`                          | Valid session, active membership and tenant                                 | Return only current tenant configuration          |
| `GET/POST /organisations/:id/records`        | Tenant membership, module entitlement, action permission; schema validation | Tenant-bound read/create                          |
| `PATCH /organisations/:id/records/:recordId` | Same checks plus stored record tenant and optimistic version                | Validated update plus audit event                 |
| `POST /owner/organisations`                  | Owner role, MFA/recent authentication, rate limit                           | Provision new tenant using idempotency key        |
| `POST /owner/organisations/:id/status`       | Owner role, recent authentication, reason                                   | Suspend/archive plus server audit; revoke access  |
| `POST /owner/organisations/:id/entitlements` | Owner role, valid dependency graph                                          | Atomic entitlement and audit changes              |
| `POST /owner/organisations/:id/subscription` | Owner role, validated transition and pricing version                        | Subscription change; no client-calculated charges |

Never take actor, role or tenant authority from a form. Verify identity server-side; derive allowed tenants from trusted memberships; reject route/record tenant mismatches. Deny by default at API and database layers. Test direct requests, not merely hidden UI. Subscriptions, entitlements and role grants must be server-owned. Use transactions for dependent changes, version checks for concurrent edits and idempotency for provisioning/billing. Audit successful and failed privileged operations with server time, actor, tenant, target, action, reason and outcome; redact personal data and secrets.

## Permission model to implement

| Role               | Intended access                                                                  |
| ------------------ | -------------------------------------------------------------------------------- |
| Platform owner     | Provision organisations, pricing, entitlements and privileged support operations |
| Organisation admin | Own organisation settings and approved user administration; no owner role grants |
| Manager            | Assigned modules, work assignment and domain approvals                           |
| Staff / volunteer  | Assigned records, own attendance where allowed                                   |
| Viewer             | Read-only permitted module records                                               |

A role alone is insufficient: check active organisation, active membership, resource ownership, entitlement and action permission on every request. A support user must not implicitly receive unrestricted cross-tenant data access.

## Onboarding

Demo: create a fictional organisation → select sector → review modules/dependencies → set colour → assign sample roles → preview modules → create a sample record → review report and activity. Refresh clears all changes.

Production gate: agree scope and processor responsibilities, establish isolated environments and MFA, test two unrelated tenants, configure minimal entitlements, invite nominated admin securely, rehearse export/restore/offboarding and complete security review before importing any actual information. Payment activation and real account creation require explicit approval. Backups, retention, deletion and incident procedures remain mandatory pending work in the security checklist.

## Backend preparation (issue #2)

See [adapter contracts](BACKEND-CONTRACT.md), [documentation-only Firebase design](FIREBASE-DESIGN.md), and [threat model and negative test plan](THREAT-MODEL.md). No live backend is implemented or connected.

## Offline foundation (issue #6)

[OFFLINE-BACKEND.md](OFFLINE-BACKEND.md) documents the separately instantiated, disposable service behind protected-style resource ports. It models current-state authorization and synthetic sessions without changing the public dashboard, and provides a migration boundary for a separately approved Firebase or PostgreSQL implementation. No live service is connected.
