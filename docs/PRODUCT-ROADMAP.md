# Product roadmap and acceptance criteria

## Phase 0 — public prototype (current)
- EVLT-style visual layout, hamburger menu, mobile usability.
- Demo organisations, company profiles, plans, module toggles, example tickets.
- No persistence, real logins, payment processing or organisation enforcement.
- Label every action as demo; avoid real names, email addresses or passwords.

## Phase 1 — secure foundation (blocking for real customers)
- Separate Firebase project for owner control plane when quota permits.
- Owner identity via Firebase Auth with MFA where supported; explicit owner allowlist/custom claims.
- Server-side admin API (Cloud Functions or equivalent) for create/suspend organisation, grants, invites and billing changes.
- Tenant-scoped customer datastore; rules and server functions enforce tenant IDs and roles on every read/write.
- Deny-by-default access; never trust client-selected organisation ID, module toggle or hidden buttons.
- Immutable-ish server-created audit trail, timestamps, actor, target, reason, outcome.
- Backup/export, restore drill, deletion process, incident response, secrets management.
- Test with two unrelated test tenants and demonstrate that neither can read or modify the other's records.
**Exit:** independent security review of rules/functions, cross-tenant negative tests, verified backups and role checks.

## Phase 2 — minimum sellable product
- Organisation onboarding wizard, profile, sites and contacts.
- Volunteer/staff directory, attendance, role-based permissions.
- Maintenance/assets and events modules with printable reports.
- Company administrator invitations, deactivate/reactivate, reset flow.
- Usage dashboards and CSV exports; accessible iPhone/iPad workflows.
- Manual billing ledger, invoicing and subscription lifecycle (no fake payment integration).
**Exit:** 2–3 pilot organisations complete real tasks with support and data processing agreement.

## Phase 3 — expansion
- Per-site management, configurable fields, automated reminders, document retention.
- Integrations only when a customer validates need: Square exports, accounting, email.
- Tiered modules and price changes with grandfathering/approval process.
- Support desk, operational alerts, uptime and error monitoring.

## Suggested entity model
organisations/{orgId}: name, status, plan, enabledModules, createdAt.
organisations/{orgId}/members/{uid}: role, status, invitedAt.
organisations/{orgId}/sites/{siteId}; assets; events; attendance; tickets.
ownerAudit/{entryId}: server-generated actor, action, orgId, timestamp.
subscriptions/{orgId}: plan, billingStatus, renewalDate, manuallyVerified.
Keep personal records out of global collections unless access boundaries are carefully designed.

## UX principles
EVLT-inspired light workspace, green header, slide-out dark menu, compact white cards and tables. Mobile-first touch targets; accessible labels; no endless horizontal navigation.

## Release gates
No real data until authentication, authorisation, privacy terms and retention are implemented. No paid launch until security, backup restoration, monitoring, incident response and support capacity are verified.
