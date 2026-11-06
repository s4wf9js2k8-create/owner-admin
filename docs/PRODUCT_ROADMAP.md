# Product roadmap — Owner Admin

## Current status (November 2026)
The owner console is a browser-session demo with fictional organisations. The four sector concepts in `public/customer-concepts.html` are illustrative, not connected customer applications. No real user access, payments, tenant isolation or persistent records exist.

## Product architecture
- Keep EVLT's existing repository, deployment and Firebase project independent. Never copy EVLT user data into a commercial demo.
- One private source repository for the reusable customer application; separate deployments and customer environments where appropriate.
- A separate private owner console, accessible only to authorised owners, for provisioning and billing oversight.
- Shared reusable modules: people/volunteers, attendance, shifts, events, maintenance, assets, reporting, documents, support.
- Sector-specific configuration rather than copying each customer's entire codebase.
- Every stored business record must have an immutable organisation ID. Tenant access is checked server-side, not just hidden in the UI.

## Phase 1 — Safe product demonstration
- [x] Owner console UI with sample organisations and modules
- [x] Four customer sector layout concepts
- [ ] Deploy demos with clear demonstration labels
- [ ] Review mobile accessibility, navigation and error states
- [ ] Create a separate private customer-app repository before adding real client logic
- [ ] Select an original product name and verify domain/trademark availability

## Phase 2 — Secure foundations (blocker before real customers)
- [ ] Establish separate production and test environments
- [ ] Authentication, MFA for privileged accounts and secure session handling
- [ ] Server-enforced organisation roles and permissions
- [ ] Firestore rules and backend checks for cross-tenant isolation
- [ ] Audit events recorded server-side with timestamps and actor IDs
- [ ] Account invitation, revocation and offboarding procedures
- [ ] Encrypted backups, recovery tests and retention/deletion policies
- [ ] Monitoring, alerting and incident response
- [ ] Automated tests for unauthorised reads/writes and cross-tenant access
- [ ] Independent security review before accepting customer data

## Phase 3 — Minimum viable customer application
- [ ] Organisation setup wizard and branding
- [ ] Role-specific home page and navigation
- [ ] People directory and consent-aware records
- [ ] Shifts/attendance with corrections and approval
- [ ] Tasks and maintenance with attachments and status history
- [ ] Events and calendars
- [ ] CSV import/export and printable reports
- [ ] Accessible mobile and tablet workflows
- [ ] Support ticket intake and help centre
- [ ] Admin controls for enabling licensed modules (enforced by backend)

## Phase 4 — Commercial readiness
- [ ] Validate requirements with at least three prospective organisations
- [ ] Written pricing model and realistic cost calculations
- [ ] Privacy notice, processor agreements and subprocessor inventory
- [ ] Terms, service levels, support hours and data export commitments
- [ ] UK GDPR assessment and appropriate registration/fee checks
- [ ] Billing provider integration only after a business/legal review
- [ ] Pilot contracts and explicit written permission for testimonials
- [ ] Customer onboarding and rollback plan

## Release gates
**Demo:** fictional data only, clearly labelled, no real accounts.
**Private pilot:** secure backend, permission tests, backups, privacy documents and written agreement.
**Public launch:** security review, support process, monitoring, billing and operational capacity.

## Product decisions to revisit
Target customer type, core paid modules, hosting and identity provider, price, business name, ownership/contract arrangements and whether per-customer deployment is needed for higher-risk clients.
