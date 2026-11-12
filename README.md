# Owner Admin

A React/Vite public **fictional-data demonstration** of a configurable organisation management product. No authentication, database, payments, persistent storage or production authorisation exists. Never enter real personal data, credentials or customer records. All changes reset on refresh or with **Reset fictional demo**.

EVLT is a separate project. This repository neither connects to nor configures EVLT services.

## Develop and verify

Requires Node.js 22+ and npm.

```sh
npm ci
npm run dev
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Vite serves the app under `/owner-admin/`. Browser tests use installed `/usr/bin/chromium` when present, otherwise Playwright's Chromium; `CHROMIUM_PATH` overrides the executable. Tests cover desktop (1440px), iPhone-sized (390px) and iPad-sized (820px) Chromium viewports. They do not establish Safari compatibility or production tenant security.

## Working demonstration

- Organisation directory, sector search, status filter, create/edit forms, confirmed archive/suspend/reactivate changes, branding colour and sample administrators.
- Module catalogue with dependency handling and organisation-specific configuration.
- Illustrative monthly/annual packages, trial date, package confirmation and local activity history. No billing ledger or payment integration.
- Support ticket status, priority, fictional communication history and internal notes. Nothing is sent.
- One shared customer workspace for railway/museum, charity, engineering and visitor attraction examples. Enabled modules control navigation; searchable sample records support creation and progress changes. Reports count current enabled records and support printing.
- Local feature flag, explicit platform health states and keyboard-accessible navigation/dialogs.

The generic record workflow demonstrates reusable infrastructure, not finished attendance, finance or engineering domain logic. Editing a sector label preserves existing modules and records; configure modules separately. Archiving preserves fixtures and removes the organisation from preview choices. Customer preview can still show a suspended organisation because it demonstrates UI, not access enforcement.

## Documentation

- [Tenancy decision matrix, evidence and offline-test limitations](docs/TENANCY-DECISION.md)
- [Synthetic authorization model (no Firebase or network required)](proof-of-concepts/tenant-authorization/README.md)

- [Backend contracts and fictional adapter](docs/BACKEND-CONTRACT.md)
- [Future Firebase design and separate-project launch prerequisites](docs/FIREBASE-DESIGN.md)
- [Threat model and security test plan](docs/THREAT-MODEL.md)

- [Architecture and onboarding](docs/ARCHITECTURE.md)
- [Priorities and implementation status](docs/PRODUCT-ROADMAP.md)
- [Module specifications](docs/MODULES.md)
- [Security and privacy release gates](docs/SECURITY_AND_PRIVACY.md)
- [Testing and deployment](docs/TESTING-AND-DEPLOYMENT.md)
- [Existing customer blueprints](docs/CUSTOMER-WEBSITE-BLUEPRINTS.md)
- [Commercial discovery and pricing hypotheses](docs/BUSINESS-PLAN.md)

The existing business and sales documents are drafts, not product claims or pricing commitments.

Offline development: see the [offline backend foundation](docs/OFFLINE-BACKEND.md) for synthetic sessions, tenant-authorized resource operations, tests and future integration gates. The public demonstration remains on its fictional adapter; no live authentication or database is connected.

[Dedicated Firebase preparation](docs/FIREBASE-PREPARATION.md) documents the offline-only interface, draft collections/Rules and environment inventory for a future independently approved Channel Systems project. It cannot connect to a live Firebase project.

Try **Company onboarding simulation** for operator provisioning, Essential/Professional/Enterprise templates, client package/feature requests and explicit approval. See [the workflow and service reference](docs/COMPANY-ONBOARDING.md). All identities, companies and invitations remain fictional and disposable.

The selected backend direction is now **self-hosted PostgreSQL + Node.js + Docker Compose**. See [installation, security, recovery and verification](docs/self-hosting/README.md). The explicit **Private server workspace** connects to the same-origin API; the fictional demo remains the default. Firebase preparation is historical only. No live server has been deployed, and this foundation is not yet approved for production/customer data.

The current [overhaul audit and remaining acceptance gaps](docs/OVERHAUL-AUDIT.md) supersedes the old generic-module implementation inventory. The demo remains incomplete against the full application-overhaul brief.
