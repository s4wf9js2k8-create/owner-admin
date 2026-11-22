# Module catalogue and implementation reference

Updated 22 November 2026. The application no longer uses a single generic record page for all modules. The authoritative current inventory, purpose, actions, relationships, defects, mobile evidence and completion classifications are in [FULL-APPLICATION-AUDIT.md](FULL-APPLICATION-AUDIT.md). Acceptance/release evidence is tracked in [DEMO-ACCEPTANCE-CHECKLIST.md](DEMO-ACCEPTANCE-CHECKLIST.md).

`src/model.js` defines stable entitlement names, prerequisites and industry presets. `src/customerModules.js` maps existing aliases to domain types. Dedicated React workspaces cover staffing/time/rotas, tasks/projects, assets/jobs/inspections, inventory, finance, events, appointments, CRM, documents, operations, reports and administration. Legacy module identities and their records are retained; disabling an entitlement hides access without deleting history.

Workflows use domain statuses: quotations follow approval/sent/acceptance states; invoices derive balances from fictional settlements; event reservations distinguish confirmation, waitlist, check-in and cancellation; appointments retain completed/cancelled history; approvals reject stale decisions. Some older modules still use generic progress states and remain PARTIAL in the audit.

Dependencies are added when modules are enabled and dependent access is removed when prerequisites are disabled. Current event/appointment workspaces require the staff directory and CRM. Events combine the legacy and modern event sources; customer navigation shows one event destination when both are enabled. More legacy people/asset/job aliases still need careful consolidation without losing their records or permissions.

All public records are fictional and in memory. Production entitlements, access checks, schema migrations, concurrency, retention and auditing must be server-owned. The self-hosted Node/PostgreSQL foundation remains separate; no live backend, file upload service, billing or external delivery is activated by the demo.
