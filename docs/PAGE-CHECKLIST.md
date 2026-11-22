# Overhaul page checklist

Updated 22 November 2026. A checked batch item means that specific interaction is implemented and covered by browser tests, not that every feature in the full specification is complete. Every page still requiring work remains listed below. Public demo data resets on refresh.

## Current visible batch — implemented; verification recorded in PR checks

- [x] Dashboard: operational queue layout; live clock-in/out; linked work/stock/inspection alerts; presets; add/remove, reorder and widen widgets; direct task/work-order/leave/inspection creation shortcuts.
- [x] Staff & volunteers: profile tabs for personal details, qualifications, schedule, assigned work and derived history; linked records open their relevant pages; editable status and department.
- [x] Rotas: staff-by-day weekly grid, mobile day agenda, week picker, minimum daily shift coverage warnings, validated shift creation and saved reassignment/location/time editing.
- [x] Maintenance: seven delivery lanes, linked engineer and asset, checklists/labour/review, job history, direct inventory allocation and completion reflected in equipment history.
- [x] Assets: equipment, maintenance-history and inspection-record tabs with linked record navigation and equipment controls.

## Stage 3 operational batch

- [x] Daily Operations: dated opening/closing checks, staff attribution, timestamps, supervisor approvals, history, linked operational overview and acknowledged handovers.
- [x] Inspections: reusable question templates, asset/recorded-location selection, eligible inspector, required responses and browser-local evidence, draft/submission/review, failed-result corrective maintenance and asset history.
- [x] Fleet Management: dedicated vehicle profiles, per-item checks, qualified drivers, defect/equipment/maintenance links, mileage/service history, insurance/MOT dates and local evidence.
- [x] Inventory: receive/issue/allocation, returns, transfers, reasoned adjustments, suppliers, purchase orders and partial deliveries; linked stock/job/order transactions publish atomically. See WORKSPACE-RECOVERY.md.
- [x] CRM: searchable directory, profile tabs, contact IDs, local activity/opportunity entries, linked follow-up tasks, jobs/appointments/bookings/documents and financial history; quotations start with the selected customer.

The core Stage 3 workflows above are implemented. Advanced rota, inspection recurrence and permission requirements remain in the outstanding list below.

## Stage 4 financial batch

- [x] Quotations: draft builder, calculations, CRM links, approval/sent/accepted/rejected/expired states, editing, duplication and printable previews.
- [x] Invoices: accepted-quote conversion, draft/issued/cancelled states, partial fictional payments, outstanding balances, basic credit notes and CRM financial history.
- [ ] Financial extensions: product/service catalogue, advanced tax rules and refunds. Financial contact IDs and company address/contact branding are implemented.
- [x] Events and Bookings — month/week calendar, exact-record links, eligible staff/competency and equipment allocation, preparation tasks/documents, CRM reservations, capacity/waitlist/check-in/cancellation, linked draft invoices and derived reports. Ticket categories and individual attendee identities remain incomplete.
- [x] Appointments — day/week diary, registered resource IDs/conflict checks, eligible staff, rescheduling/cancellation, outcomes, one linked follow-up task and CRM/staff/calendar history.
- [x] Documents — browser-local files, image previews/downloads, versions, classification, stable links and asset/staff profile access.
- [x] Business-record Archives — archive/restore eligible records while preserving IDs, history and links; selected CSV/print. Historical collection catalogues remain distinct.
- [x] Forms — draft/publish/archive, versioned conditional questions/sections, associated-record responses and defect-to-maintenance.

Stage 4 advanced finance, event ticket/attendee and collection-catalogue extensions remain unfinished; the earlier Fleet gap is resolved.

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
- [ ] Reporting extensions — dedicated overtime/project measures and scheduled delivery. Filtered Excel-compatible XML export is implemented; delivery remains unavailable.
- [x] Notification session preferences/read state survive company switches and reset with the demo. Durable history and external delivery remain future private-backend capabilities; no email/push is sent.

The core Stage 5 browser-demonstration workflows are implemented. Reporting/persistence extensions above, production authorization and the earlier unchecked Stage 3/4 and owner-console items remain unfinished. See STAGE5-FINISH.md for verified scope and limitations.

## Still unfinished against the complete specification

- [ ] Dashboard: advanced widget-specific filters and finer-grained server-enforced record permissions.
- [ ] Staff: evidence/documents, full immutable activity history, per-person permissions.
- [ ] Rotas: competency-specific staffing minima, recurring patterns/templates, completed swap workflow. Minimum shift coverage is a session-only setting and does not certify qualified staffing.
- [x] Maintenance: new-job supervisor completion gate, checklist/engineer validation, scheduled intervals, project links, local evidence and recurring templates. Stock/job writes remain atomic.
- [x] Assets: purchase/reference/warranty information, local downloadable QR profile links and document-library access.
- [ ] Inspections — editing/version snapshots are implemented; automatic recurring schedules remain. Evidence is browser-local; durable server storage is unavailable.
- [x] Tasks/projects — dependency validation/cycle protection, staff/equipment IDs, local evidence, budgets/cost balances and linked time allocations. Advanced multi-stage cost approvals are not implemented.
- [ ] Attendance — correction requests, location and edit validation.
- [x] Timesheets — project/job allocations, configurable overtime and matching CSV labels. Central correction requests and approvals remain connected.
- [x] Leave — month calendar and annual approved-weekday balances, with overlapping dates counted once. No payroll/holiday accrual is inferred.
- [x] Training — group sessions, attendee assessments, local certificates and pending qualification generation.
- [x] Inventory — returns/transfers, suppliers, purchase orders/deliveries and atomic stock/job movements.
- [x] Health & safety — scored assessments, controls, responsible staff, review history and linked corrective tasks/work orders.
- [x] Fleet — insurance/service reminders/history, qualified driver fixtures and per-item daily checks.
- [x] CRM — connected profile tabs for contacts, activity, tasks, jobs/schedule, finance and documents.
- [ ] Quotes/invoices — advanced financial extensions noted above; the core financial document workflow is implemented.
- [ ] Events/bookings extensions — ticket categories, individual visitor identity, automatic cancellation credits and structured event checklist. The core calendar/staff/resources/CRM reservation workflow is implemented.
- [x] Appointments/resources — shared resource registry and cross-event/appointment conflicts; rescheduling, outcomes and follow-ups.
- [x] Documents — actual browser-local files, image previews/downloads, versions and record links.
- [ ] Archives — provenance, historical dates and digital references.
- [x] Forms — conditional questions/sections, required validation, schema snapshots and supported defect-to-maintenance trigger.
- [x] Donations — campaign targets, linked CRM donors/events and fictional reconciliation. Retained module aliases have independent stable campaign IDs.
- [x] Visitor statistics — category/date totals, prior-period comparison and separate event attendance, avoiding double counting.
- [x] Daily operations — recurring opening/closing templates and bounded date-range preparation, with qualification/availability validation where applicable and date deduplication.
- [ ] Reports — remaining extensions listed in Stage 5 above; core filtered reports and custom fields are implemented.
- [ ] Notifications — remaining persistence/delivery extensions listed in Stage 5 above; record-based inbox and preferences are implemented.
- [ ] Global search — advanced indexed search and production permission enforcement. Session saved searches and permitted-record palette are implemented.
- [ ] Roles/company settings — production server enforcement, granular per-person exceptions and advanced module-specific policies. Demo scopes and central approval rules are implemented.
- [x] Owner overview/customer profiles — connected company/status/support/usage widgets, directory, profile tabs and company contact/module/subscription changes.
- [x] Owner onboarding — guided nine-stage creation into the actual public fictional workspace, industry recommendations, branding and linked lead conversion.
- [x] Owner packages/modules — new configured/bespoke packages, included-module dependencies, negotiated subscription prices and illustrative payment records.
- [x] Owner branding — company-specific logo, accent/secondary navigation colours, labels, welcome/presets and financial-document logo.
- [x] Owner support — inbox filters, assignment, local conversations, resolution/reopen and timestamp-supported response metrics.
- [x] Owner feature requests/roadmap — linked companies/support, priority/votes, company-interest IDs and shared development states.
- [x] Owner leads — seven-stage pipeline, contact/opportunity/follow-up/activity fields and conversion without duplicate companies.
- [x] Owner announcements/settings/activity — targeted in-app publication/archive, retained drafts, business/onboarding defaults and filtered structured activity timeline.
- [x] Owner role previews — five templates, restricted navigation and guarded writes. This is not secure authentication.
- [ ] Owner advanced extensions — custom owner accounts/permission matrices, further defaults/templates, sales ownership and release-announcement links. Package allowance editing, optional add-on prices and illustrative period balances are implemented.
- [ ] Server management — verified diagnostics only; self-hosted production approval remains separate.

See OVERHAUL-AUDIT.md for the earlier baseline inventory. This checklist supersedes its descriptions of the five redesigned interfaces. No EVLT access/modification, Vercel hosting, paid infrastructure or real customer data is involved.

## Stage 7 integration batch

See [FULL-APPLICATION-AUDIT.md](FULL-APPLICATION-AUDIT.md) for the complete per-page inventory and [DEMO-ACCEPTANCE-CHECKLIST.md](DEMO-ACCEPTANCE-CHECKLIST.md) for exact acceptance/release evidence. This batch connects scheduling, commercial records and customer dossiers; it does not claim that all earlier unfinished requirements are complete. Event aliases are consolidated in customer navigation; other legacy alias consolidation remains pending. Production infrastructure is unchanged.


## Remaining-workflow follow-up — 22 November 2026

This list supersedes earlier descriptions of missing interactions; earlier unchecked extensions not listed as implemented remain open. Final release verification is tracked in FULL-APPLICATION-AUDIT.md and the associated PR.

- [x] Fleet: dedicated profiles, qualified drivers, per-item checks, local evidence, mileage/service history, insurance/MOT dates, linked defects/maintenance/equipment.
- [x] Business archives: eligible-record archive/restore, preserved IDs/history/links, source/date filters, selected CSV/print. Active valid qualifications are not eligible for archive.
- [x] Forms: record-based templates, draft/publish/archive, conditional/required fields, sections/choices/reordering, linked versioned submissions, CSV and defect-to-maintenance.
- [x] Training: group sessions, attendee pass/fail, pending qualifications, local evidence; failed assessments cannot be approved.
- [x] Safety: scored assessments, controls/reviews/responsibility and linked corrective tasks/work orders.
- [x] Fundraising: campaign targets, CRM donor/event IDs, contribution references/sources, local reconciliation and CSV.
- [x] Visitors: date/category summaries, daily chart, period comparison, linked event attendance and CSV.
- [x] Leave: month calendar and annual weekday balances, with overlaps counted once.
- [x] Timesheets/projects: project/job allocation, recorded breaks, configurable overtime, project team/equipment/costs/budget balance and allocated hours.
- [x] Recurring templates: bounded shift, maintenance and opening/closing occurrence generation; validation is atomic and repeated dates are deduplicated.
- [x] Maintenance: new-job checklist/engineer/supervisor completion gate, central decisions/self-review checks, scheduled intervals, linked project and local evidence.
- [x] Assets: purchase/reference/warranty details and downloadable local QR profile labels. Refresh still resets session-only new records.
- [x] Inspections: editable template versions preserve existing inspection question snapshots.
- [x] Reports: Excel-compatible XML of the same filtered/selected rows as CSV; no unattended delivery.
- [x] Notifications: per-company/user read/preferences remain while switching workspaces and clear on Reset Demo.
- [x] Owner packages: editable allowances, priced optional modules, company add-ons and illustrative non-overlapping billing-period balances.
- [ ] Competency minima, completed shift swaps, per-person permission exceptions and recurring inspections.
- [ ] Product/service catalogue, advanced tax rules/refunds, event ticket/attendee/checklist/cancellation-credit extensions.
- [ ] Collection provenance/date/digital-reference controls and dedicated overtime/project reporting measures.
- [ ] Custom owner accounts/matrix and further business/support/onboarding defaults, sales ownership and roadmap-release announcements.
- [ ] Real backend hosting, durable storage, external delivery, background schedules, live monitoring and backup operations. These require separately configured private infrastructure and are unavailable in this browser demo.


## Verified release references

- Main operational follow-up: [PR #35](https://github.com/s4wf9js2k8-create/owner-admin/pull/35).
- Campaign-ID integrity correction and regression: [PR #36](https://github.com/s4wf9js2k8-create/owner-admin/pull/36).
- Verified baseline functional release source: `56715076948a721333e1af5d8fe731047a7c906f`.
- CI passed lint/build, **137 unit tests, 252 browser tests and 18 PostgreSQL integration tests**. Browser coverage uses 1440px, 390px and 820px Chromium viewports, not physical-device certification.
- [Pages deployment](https://github.com/s4wf9js2k8-create/owner-admin/actions/runs/45068016291) succeeded; public JS and CSS byte hashes match the built artifact. All **93 deployed browser workflow checks passed**, including the campaign-edit isolation scenario at each viewport. Details are recorded in PR #36.

The next unfinished customer workflow is competency-specific rota staffing and completed shift swaps. Outstanding items remain unchecked above. Production-only services remain unavailable; this checklist does not declare the full multi-stage specification complete.

Final follow-up: [PR #37](https://github.com/s4wf9js2k8-create/owner-admin/pull/37) validates safety-generated corrective assignments at the selected deadline, including future approved leave and qualification expiry. Staff choices recalculate on date changes. All 138 unit tests and the expanded safety scenario at the three widths passed locally; the PR records final full-suite and deployment outcomes.
