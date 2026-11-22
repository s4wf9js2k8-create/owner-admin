# Stage 6 owner console: implemented workflows and outstanding scope

Updated 21 November 2026. Checked rows describe working public-demo workflows; they do not assert production readiness or completion of every advanced requirement. Release tests/deployment evidence are recorded in the PR.

- [x] Business control centre: connected status, support, sales, package, adoption, health-boundary and activity widgets; session layout controls and quick navigation.
- [x] Company directory: search/status filters, contacts, packages/modules, onboarding indicator and workspace links.
- [x] Company profiles: overview/contact editing, modules, administrators, subscription, branding, support and activity tabs. Existing consequential change confirmations remain.
- [x] Guided onboarding: nine stages, six industry choices, recommended/custom modules with dependencies, actual package definitions, logo/accent/welcome/preset, departments/locations, administrator metadata, roles, review and actual demo workspace creation. Back preserves inputs; retry reuses the created company.
- [x] Module catalogue: dependencies, existing company controls, industry presets, package membership and honest functional/partial-demo labels. Disabling modules retains records.
- [x] Packages: creation of standard/bespoke configured prices, trial/user/storage/support allowances and included modules; legacy pricing edits retained. Assigning a package adds its included modules and dependencies.
- [x] Subscriptions: configured price/frequency, dates, negotiated amount, trial/active/past-due/suspended/cancelled metadata, confirmed state changes and explicitly illustrative payment history.
- [x] Sales: seven pipeline stages, opportunity/contact fields, follow-ups, requirements, recorded activities and won-lead conversion. Created company IDs link back to the original lead and prevent repeat conversion.
- [x] Support: customer/priority/status/assignee/module/date/search filters, assignment, conversations/internal notes, resolution/reopen and actual timestamp-supported response/resolution averages. Missing timestamps remain unavailable.
- [x] Feature requests: company/support links, priority/votes, distinct company-interest IDs and development states.
- [x] Roadmap: request-linked planned/in-progress/testing/released columns, target dates and development notes; changing a card updates the feedback backlog.
- [x] Branding: company-specific logo, accent/secondary navigation colour, welcome message, preset and module labels; preview/reset/apply, plus company logo in financial previews. Local image bytes only.
- [x] Announcements: retained/editable drafts, preview, selected-company/package audiences, actual in-app notices and archiving. Future scheduling is labelled unavailable.
- [x] Client analytics: existing company comparisons, industry filters, enabled modules/current-record counts. No production telemetry claims.
- [x] Monitoring/backups: explicit disconnected diagnostics and backup boundaries; real operations remain in the preserved private backend. No fake backup/restore buttons.
- [x] Activity centre: structured fictional actor/role/timestamp/module, company/action/module/date filters and chronological cards. Not tamper-proof.
- [x] Owner permissions: five fictional role templates, navigation/page guards, write guards and blocked unsupported company actions; public reset consistently restores all session state.
- [x] Business settings: business profile, configured onboarding package default and support planning target; existing preview flag retained.
Release verification is tracked separately in PR #32, including executed regression counts, merge status, GitHub Pages deployment and live-site workflow checks: https://github.com/s4wf9js2k8-create/owner-admin/pull/32

## Remaining Stage 6 extensions

- Package editing/add-on prices/illustrative period balances are implemented in the 22 November remaining-workflow follow-up (`PackageEditor.jsx`), with a browser scenario covering totals and overlap rejection. No real billing or receipts.
- Custom owner account records, invitations and editable fine-grained permission matrices. The public demo offers role previews; real secure account administration belongs to the existing private backend.
- Owner-specific notification preferences, support priority/category template editing and reusable onboarding-template management beyond industry presets.
- More detailed sales ownership and roadmap release/announcement associations. Existing lead conversion and request/roadmap relationships use stable IDs.
- Real telemetry, durable audit history, external messages, scheduled announcements and authorised backup/restore operations require a connected private backend; these are unavailable in the public demo.

Customer-module gaps from earlier stages remain in PAGE-CHECKLIST.md. No EVLT access/modification, Vercel hosting, paid services, real customers or payment providers are involved.
