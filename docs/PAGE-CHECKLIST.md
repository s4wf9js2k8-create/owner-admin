# Overhaul page checklist

Updated 13 November 2026. A checked batch item means that specific interaction is implemented and covered by browser tests, not that every feature in the full specification is complete. Every page still requiring work remains listed below. Public demo data resets on refresh.

## Current visible batch — implemented; verification recorded in PR checks

- [x] Dashboard: operational queue layout; live clock-in/out; linked work/stock/inspection alerts; presets; add/remove, reorder and widen widgets; direct task/work-order/leave/inspection creation shortcuts.
- [x] Staff & volunteers: profile tabs for personal details, qualifications, schedule, assigned work and derived history; linked records open their relevant pages; editable status and department.
- [x] Rotas: staff-by-day weekly grid, mobile day agenda, week picker, minimum daily shift coverage warnings, validated shift creation and saved reassignment/location/time editing.
- [x] Maintenance: seven delivery lanes, linked engineer and asset, checklists/labour/review, job history, direct inventory allocation and completion reflected in equipment history.
- [x] Assets: equipment, maintenance-history and inspection-record tabs with linked record navigation and equipment controls.

## Stage 3 operational batch

- [x] Daily Operations: dated opening/closing checks, staff attribution, timestamps, supervisor approvals, history, linked operational overview and acknowledged handovers.
- [x] Inspections: reusable question templates, asset/recorded-location selection, eligible inspector, required responses and browser-local evidence, draft/submission/review, failed-result corrective maintenance and asset history.
- [ ] Fleet Management: detailed profile tabs, per-item daily checks and driver-specific qualification fixtures. Existing vehicle cards and basic checks are preserved.
- [ ] Inventory: returns, transfers, adjustments, purchase orders and suppliers. Existing issue/allocation/receive workflows are preserved.
- [ ] CRM: full profile tabs, linked follow-up tasks and quote activity timeline. Existing customers/contacts/notes/quote links are preserved.

**Next module: Fleet Management**, then Inventory and CRM. Stage 3 is not complete.

## Stage 4 financial batch

- [x] Quotations: draft builder, calculations, CRM links, approval/sent/accepted/rejected/expired states, editing, duplication and printable previews.
- [x] Invoices: accepted-quote conversion, draft/issued/cancelled states, partial fictional payments, outstanding balances, basic credit notes and CRM financial history.
- [ ] Financial extensions: product/service catalogue, contact-ID registry, advanced tax rules and refunds. Company address/contact branding is now configurable.
- [ ] Events and Bookings — next Stage 4 batch: calendar, linked eligible staff/equipment, CRM reservations and resource/capacity checks.
- [ ] Appointments — scheduling views, rescheduling, outcomes, follow-up tasks and CRM history.
- [ ] Documents — local files, stable record links and profile access.
- [ ] Business-record Archives — archive/restore eligible records without losing their links. Existing historical collection catalogue remains distinct.
- [ ] Forms — publish/archive lifecycle, conditional sections and associated-record responses.

Stage 4 is not complete. The earlier Stage 3 Fleet/Inventory/CRM gaps above remain outstanding.

## Stage 5 reporting and communications batch

- [x] Reporting: source-specific measures, date/staff/department/location/status/category filters, grouped charts and drill-down, totals/averages, previous-period comparison, saved configurations, CSV and print/PDF.
- [x] Notifications: actionable current-record inbox, versioned alerts, per-user read/dismiss state, categories, priority and reminder preferences.
- [x] Staff Communications: company/department/staff audiences, draft editing, publishing, acknowledgement history, archiving and shared Daily Operations handover links.
- [x] Roles and permissions: six templates, custom roles, action/module/team permissions, own-record/location scopes, sensitive-record controls and guarded demo mutations. Client-side controls are not production security.
- [x] Central approvals: pending/assigned/urgent/history queues, approver assignment, comments, approve/reject/request changes, self-review policy and stale-decision protection. Leave availability, timesheet corrections and supported record statuses update through the same adapter.
- [x] Workflow automations: configurable failure-to-maintenance, maintenance-to-inspection and recurring-task rules; optional priority condition, enable/disable, execution/error history, deduplication and explicit evaluation. Active browser session only.
- [x] Company settings: per-company profile, departments/locations, working hours/days, leave allowance, minimum shift coverage, roles, modules/dependencies, branding, navigation labels, notification defaults and self-review policy.
- [x] Dashboard: additional enabled-module widgets, per-widget record limits, company-session layout, add/remove/reorder/resize and industry-template reset.
- [x] Search: header command palette, keyboard focus/Escape, responsive overlay, permitted record results and task/work-order/customer/rota/inspection/booking commands. Saved searches remain available.
- [x] Activity: actor, UTC timestamp, meaningful changed fields and record links; date/user/module/action filters; company configuration history. Bounded browser-session history, not a legal audit ledger.
- [ ] Reporting extensions — overtime, full project progress, native Excel and server-scheduled reports.
- [ ] Notification extensions — durable event history, persistent organisation/user preferences and external delivery adapters. No email/push is sent.

The core Stage 5 browser-demonstration workflows are implemented. Reporting/persistence extensions above, production authorization and the earlier unchecked Stage 3/4 and owner-console items remain unfinished. See STAGE5-FINISH.md for verified scope and limitations.

## Still unfinished against the complete specification

- [ ] Dashboard: advanced widget-specific filters and finer-grained server-enforced record permissions.
- [ ] Staff: evidence/documents, full immutable activity history, per-person permissions.
- [ ] Rotas: competency-specific staffing minima, recurring patterns/templates, completed swap workflow. Minimum shift coverage is a session-only setting and does not certify qualified staffing.
- [ ] Maintenance: enforced supervisor completion gates, attachments, recurring jobs/templates, atomic stock/job transaction. Parts updates are sequential in this single-user fictional demo.
- [ ] Assets: purchase information, QR deep links and document library links.
- [ ] Inspections — template editing/version management, recurring schedules and durable evidence storage. Current evidence is browser memory only.
- [ ] Tasks/projects — dependencies, resources, evidence and full budgets.
- [ ] Attendance — correction requests, location and edit validation.
- [ ] Timesheets — allocations and configurable overtime. Central correction requests and approval are implemented.
- [ ] Leave — balances and complete calendar.
- [ ] Training — sessions, assessments, local evidence files.
- [ ] Inventory — returns/transfers, purchase orders, suppliers and atomic movements.
- [ ] Health & safety — risk scoring, reviews and linked corrective workflow.
- [ ] Fleet — insurance, service history and driver fixtures.
- [ ] CRM — complete linked job, appointment and document tabs.
- [ ] Quotes/invoices — advanced financial extensions noted above; the core financial document workflow is implemented.
- [ ] Events/bookings — calendar, ticket categories, eligible staff/equipment.
- [ ] Appointments/resources — shared resource registry and conflict prevention.
- [ ] Documents — actual browser-local files, previews/downloads and record links.
- [ ] Archives — provenance, historical dates and digital references.
- [ ] Forms — conditional sections and workflow triggers.
- [ ] Donations — linked donors/events and reconciliation.
- [ ] Visitor statistics — category/date aggregation and comparisons.
- [ ] Daily operations — reusable recurring check templates and bulk day preparation. Dated opening/closing checks and history are implemented.
- [ ] Reports — remaining extensions listed in Stage 5 above; core filtered reports and custom fields are implemented.
- [ ] Notifications — remaining persistence/delivery extensions listed in Stage 5 above; record-based inbox and preferences are implemented.
- [ ] Global search — advanced indexed search and production permission enforcement. Session saved searches and permitted-record palette are implemented.
- [ ] Roles/company settings — production server enforcement, granular per-person exceptions and advanced module-specific policies. Demo scopes and central approval rules are implemented.
- [ ] Owner overview/customer profiles — connected configuration/activity/usage.
- [ ] Owner onboarding — guided creation into public fictional workspace.
- [ ] Owner packages/modules — bespoke package preview/configuration.
- [ ] Owner branding — logo, terminology, welcome text and document branding.
- [ ] Owner support — assignment/resolution/response metrics.
- [ ] Owner feature requests — linked companies/support and priority scoring.
- [ ] Owner leads — follow-ups and conversion to onboarding draft.
- [ ] Owner announcements/settings/activity — complete connected behavior.
- [ ] Server management — verified diagnostics only; self-hosted production approval remains separate.

See OVERHAUL-AUDIT.md for the earlier baseline inventory. This checklist supersedes its descriptions of the five redesigned interfaces. No EVLT access/modification, Vercel hosting, paid infrastructure or real customer data is involved.
