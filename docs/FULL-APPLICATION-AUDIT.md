# Full application audit — Stage 7

Latest functional release: [PR #35](https://github.com/s4wf9js2k8-create/owner-admin/pull/35) and [PR #36](https://github.com/s4wf9js2k8-create/owner-admin/pull/36), merged as `266dd08` and `5671507`. **137 unit tests, 252 browser cases and 18 PostgreSQL integration tests passed in CI; 93 browser workflows passed against the deployed GitHub Pages site.** The public JS/CSS bytes match the built artifact. See [release report](RELEASE-2026-11-22.md) and [current checklist](PAGE-CHECKLIST.md). Earlier counts below are historical evidence for earlier commits, not replacements for final-head verification.


Audit started 22 November 2026 on main `806a9c1` (PRs #25–#32 reviewed). This is a public, session-only fictional demonstration, not a production readiness review. Source inspection and the existing browser regression suite are the baseline. Screenshots/navigation observations were collected for every owner destination and enabled customer module across all four sample organisations, then repeated after implementation at desktop, phone and tablet widths. Release verification is recorded below after execution.

Classifications: **COMPLETE** means the currently advertised core demo workflow is connected and covered by passing tests; **PARTIAL** means important specification features are missing; **PLACEHOLDER**, **BROKEN** and **REDUNDANT** identify non-useful, failed or duplicate destinations. Production-only services are explicitly unavailable, rather than counted as implemented.

## Customer page-by-page inventory

Every page below has a distinct purpose; aliases refer to existing retained data identities. Mobile baseline: existing suite at 390/820/1440px; current screenshots and overflow observations are assessed during this stage. Named regression files are under `tests/browser/`.

### Dashboard — PARTIAL

- Implementation/purpose: `OperationalDashboard.jsx` — Operational control centre.
- Primary actions: Clock in/out; open urgent work. Secondary: Configure widgets and presets.
- Connected modules: Attendance, rotas, tasks, inspections, stock.
- Defects/missing: Booking widgets now exclude resource definitions/completed appointments; finer widget filters remain.
- Mobile: navigation/rendering inspected at 390px, 820px and 1440px, with no root overflow or page errors in the 126-page sweep at each width; listed workflow tests cover interactions, and unimplemented advanced paths are not asserted tested.
- Coverage: `operational-redesign; administration-finish`. Completion: PARTIAL; no assertion that every requested extension is delivered.

### My Work — PARTIAL

- Implementation/purpose: `CustomerEssentialPages.jsx` — Personal and team work queue.
- Primary actions: Filter assignments; open work. Secondary: Complete supported task types.
- Connected modules: Tasks, maintenance, staff, schedule.
- Defects/missing: Linked schedules now resolve staff names/teams from IDs, and cancelled work is excluded from active/overdue queues while retained in All/history. Legacy free-text records and broader project/resource integration remain.
- Mobile: navigation/rendering inspected at 390px, 820px and 1440px, with no root overflow or page errors in the 126-page sweep at each width; listed workflow tests cover interactions, and unimplemented advanced paths are not asserted tested.
- Coverage: `customer-overhaul`. Completion: PARTIAL; no assertion that every requested extension is delivered.

### Calendar — PARTIAL

- Implementation/purpose: `CustomerEssentialPages.jsx` — Cross-module dated agenda.
- Primary actions: Choose day/month; open activity. Secondary: Browse upcoming dates.
- Connected modules: All dated records.
- Defects/missing: Exact-record links and cancelled/resource-row exclusion implemented; external calendar/time-zone integrations remain unavailable.
- Mobile: navigation/rendering inspected at 390px, 820px and 1440px, with no root overflow or page errors in the 126-page sweep at each width; listed workflow tests cover interactions, and unimplemented advanced paths are not asserted tested.
- Coverage: `customer-overhaul`. Completion: PARTIAL; no assertion that every requested extension is delivered.

### Tasks & Projects (Tasks / Projects aliases) — PARTIAL

- Implementation/purpose: `CustomerTaskBoard.jsx` — Task delivery and project milestones.
- Primary actions: Create/edit tasks; checklist; time; status. Secondary: Board/list/calendar; project views; comments.
- Connected modules: Staff, projects, approvals, automations.
- Defects/missing: Linked project team and equipment, cost entries/budget balance, allocated attendance hours and maintenance are implemented. Task dependency cycles and premature completion are rejected at save time. Multi-stage cost approvals are not implemented.
- Mobile: navigation/rendering inspected at 390px, 820px and 1440px, with no root overflow or page errors in the 126-page sweep at each width; listed workflow tests cover interactions, and unimplemented advanced paths are not asserted tested.
- Coverage: `customer-overhaul; administration-finish`. Completion: PARTIAL; no assertion that every requested extension is delivered.

### Staff & Volunteers (Staff / Volunteers aliases) — PARTIAL

- Implementation/purpose: `CustomerPeopleOps.jsx; StaffProfile.jsx` — People directory and personnel dossier.
- Primary actions: Create/edit people; profile tabs. Secondary: Open qualifications, schedule, work, files.
- Connected modules: Qualifications, attendance, leave, rotas, work.
- Defects/missing: Events and appointments now linked in Schedule; individual permission editing remains.
- Mobile: navigation/rendering inspected at 390px, 820px and 1440px, with no root overflow or page errors in the 126-page sweep at each width; listed workflow tests cover interactions, and unimplemented advanced paths are not asserted tested.
- Stage 7 integration coverage: `stage7-scheduling.spec.js` (desktop/phone/tablet).
- Coverage: `operational-redesign; staff-eligibility`. Completion: PARTIAL; no assertion that every requested extension is delivered.

### Attendance & Timesheets (Attendance & Hours alias) — PARTIAL

- Implementation/purpose: `CustomerPeopleOps.jsx` — Clock sessions and weekly hours.
- Primary actions: Clock in/out; review hours. Secondary: Correction requests; CSV; weekly summary.
- Connected modules: Staff, approvals, reporting.
- Defects/missing: Existing project/job selectors and configurable weekly overtime threshold are implemented. Correction requests still use the central approval workflow. Attendance alias consolidation and stricter editing/correction-only policies remain.
- Mobile: navigation/rendering inspected at 390px, 820px and 1440px, with no root overflow or page errors in the 126-page sweep at each width; listed workflow tests cover interactions, and unimplemented advanced paths are not asserted tested.
- Coverage: `operational-redesign; staff-eligibility`. Completion: PARTIAL; no assertion that every requested extension is delivered.

### Shift Rotas (Schedules alias) — PARTIAL

- Implementation/purpose: `CustomerPeopleOps.jsx; RotaPlanner.jsx` — Weekly staffing planner.
- Primary actions: Create/edit validated shifts. Secondary: Week/day views; coverage warnings.
- Connected modules: Staff, qualifications, leave, availability.
- Defects/missing: Event/appointment commitments remain visible. Bounded daily/weekly/fortnightly shift templates validate each generated assignment atomically and skip duplicates. Competency-specific minima and completed swaps remain unfinished.
- Mobile: navigation/rendering inspected at 390px, 820px and 1440px, with no root overflow or page errors in the 126-page sweep at each width; listed workflow tests cover interactions, and unimplemented advanced paths are not asserted tested.
- Stage 7 integration coverage: `stage7-scheduling.spec.js` (desktop/phone/tablet).
- Coverage: `staff-eligibility; operational-redesign`. Completion: PARTIAL; no assertion that every requested extension is delivered.

### Leave & Availability — PARTIAL

- Implementation/purpose: `CustomerPeopleOps.jsx` — Availability requests and decisions.
- Primary actions: Request, approve/reject/cancel leave. Secondary: Record unavailable dates.
- Connected modules: Staff, eligibility, approvals.
- Defects/missing: A month calendar and annual approved-weekday balances are implemented, including duplicate-date protection and configured business days. Payroll accrual, holidays and pro-rata entitlement are not inferred.
- Mobile: navigation/rendering inspected at 390px, 820px and 1440px, with no root overflow or page errors in the 126-page sweep at each width; listed workflow tests cover interactions, and unimplemented advanced paths are not asserted tested.
- Coverage: `staff-eligibility; administration-finish`. Completion: PARTIAL; no assertion that every requested extension is delivered.

### Training & Qualifications — PARTIAL

- Implementation/purpose: `CustomerPeopleOps.jsx` — Competency matrix and renewal records.
- Primary actions: Record training; expiry; approval. Secondary: Filter staff/qualifications.
- Connected modules: Staff, eligibility, notifications.
- Defects/missing: Group training sessions, attendee assessments, local certificate evidence and pending qualification generation are implemented. Failed assessments cannot be approved as qualifications. Server evidence storage is unavailable.
- Mobile: navigation/rendering inspected at 390px, 820px and 1440px, with no root overflow or page errors in the 126-page sweep at each width; listed workflow tests cover interactions, and unimplemented advanced paths are not asserted tested.
- Coverage: `staff-eligibility`. Completion: PARTIAL; no assertion that every requested extension is delivered.

### Assets & Equipment (Assets alias) — PARTIAL

- Implementation/purpose: `CustomerAssetOps.jsx` — Equipment register and history.
- Primary actions: Create asset; inspect; report defect. Secondary: Custodian, condition, maintenance/files tabs.
- Connected modules: Staff, maintenance, inspections, documents.
- Defects/missing: Purchase date/cost/reference, warranty editing and locally generated downloadable QR labels/deep links are implemented. Newly created session-only assets cannot survive a refresh. Duplicate alias navigation remains.
- Mobile: navigation/rendering inspected at 390px, 820px and 1440px, with no root overflow or page errors in the 126-page sweep at each width; listed workflow tests cover interactions, and unimplemented advanced paths are not asserted tested.
- Stage 7 integration coverage: `stage7-scheduling.spec.js` (desktop/phone/tablet).
- Coverage: `operational-redesign; stock-recovery`. Completion: PARTIAL; no assertion that every requested extension is delivered.

### Maintenance & Work Orders (Maintenance / Work orders / Job records aliases) — PARTIAL

- Implementation/purpose: `CustomerAssetOps.jsx` — Repair board and job execution.
- Primary actions: Assign engineer; checklist; parts; labour; complete. Secondary: Supervisor review; asset/inspection navigation.
- Connected modules: Assets, inspections, stock, staff, approvals.
- Defects/missing: New jobs enforce engineer/checklist/supervisor completion gates. Completion enters the shared approval workflow, including self-review rules. Scheduled start/end, project allocation, local work evidence and bounded recurring templates are implemented. Due-date-only jobs do not establish interval availability; Job records still overlaps active maintenance.
- Mobile: navigation/rendering inspected at 390px, 820px and 1440px, with no root overflow or page errors in the 126-page sweep at each width; listed workflow tests cover interactions, and unimplemented advanced paths are not asserted tested.
- Coverage: `operational-redesign; stock-recovery`. Completion: PARTIAL; no assertion that every requested extension is delivered.

### Inspections & Checklists (Inspections alias) — PARTIAL

- Implementation/purpose: `InspectionTemplates.jsx; InspectionRun.jsx` — Template-based checks and corrective work.
- Primary actions: Build template; run; submit; review. Secondary: Local evidence; corrective maintenance.
- Connected modules: Assets, staff/qualifications, maintenance, automations.
- Defects/missing: Templates can be edited with retained prior versions; existing inspections keep their question snapshot. Automatic recurring inspection scheduling remains unfinished.
- Mobile: navigation/rendering inspected at 390px, 820px and 1440px, with no root overflow or page errors in the 126-page sweep at each width; listed workflow tests cover interactions, and unimplemented advanced paths are not asserted tested.
- Coverage: `stage3-operations; administration-finish`. Completion: PARTIAL; no assertion that every requested extension is delivered.

### Health & Safety — PARTIAL

- Implementation/purpose: `completion/SafetyWorkspace.jsx` — Risk assessment and corrective-action board.
- Primary actions: Report hazard; assign competent responsible person. Secondary: Edit risk/action/status.
- Connected modules: Staff and training.
- Defects/missing: Likelihood/severity, affected people, controls, review date, qualified responsible person, local evidence and linked corrective task/maintenance are implemented. Safety records remain fictional and establish no legal compliance.
- Mobile: navigation/rendering inspected at 390px, 820px and 1440px, with no root overflow or page errors in the 126-page sweep at each width; listed workflow tests cover interactions, and unimplemented advanced paths are not asserted tested.
- Coverage: `bespoke-pages`. Completion: PARTIAL; no assertion that every requested extension is delivered.

### Fleet Management — PARTIAL

- Implementation/purpose: `completion/FleetWorkspace.jsx` — Vehicle garage and tabbed operating profiles.
- Primary actions: Register vehicle; mileage; pass/defect check. Secondary: Driver selection; defects; linked repair.
- Connected modules: Staff, qualifications, maintenance.
- Defects/missing: Per-item checks, qualified driver fixtures/assignment, local evidence, mileage, defects, linked maintenance, equipment identity, service history and calculated service/MOT/insurance dates are implemented. No telemetry, legal roadworthiness verification or real fleet services.
- Mobile: navigation/rendering inspected at 390px, 820px and 1440px, with no root overflow or page errors in the 126-page sweep at each width; listed workflow tests cover interactions, and unimplemented advanced paths are not asserted tested.
- Coverage: `bespoke-pages`. Completion: PARTIAL; no assertion that every requested extension is delivered.

### Inventory & Stock — COMPLETE

- Implementation/purpose: `InventoryWorkspace.jsx; stockTransactions.js` — Stock control and purchasing.
- Primary actions: Receive/issue/return/transfer/adjust; deliveries. Secondary: Suppliers, orders, movement history.
- Connected modules: Maintenance, assets, suppliers.
- Defects/missing: Core advertised demo movements validated atomically; no real procurement/storage.
- Mobile: navigation/rendering inspected at 390px, 820px and 1440px, with no root overflow or page errors in the 126-page sweep at each width; listed workflow tests cover interactions, and unimplemented advanced paths are not asserted tested.
- Coverage: `stock-recovery`. Completion: COMPLETE; no assertion that every requested extension is delivered.

### Customers & CRM — PARTIAL

- Implementation/purpose: `scheduling/CustomerDirectory.jsx` — Customer directory and relationship management.
- Primary actions: Create customer; stage/account manager; activity. Secondary: Financial links and follow-up date.
- Connected modules: Staff, contacts, tasks, jobs, quotes/invoices/payments, bookings, appointments and documents.
- Defects/missing: Directory, profile tabs, contact IDs, calls/notes/opportunity activity, assigned tasks, quote initiation and combined commercial/scheduling/job/document links implemented. Remaining: richer opportunity valuations and customer merge/deduplication tools.
- Mobile: navigation/rendering inspected at 390px, 820px and 1440px, with no root overflow or page errors in the 126-page sweep at each width; listed workflow tests cover interactions, and unimplemented advanced paths are not asserted tested.
- Stage 7 integration coverage: `stage7-scheduling.spec.js` (desktop/phone/tablet).
- Coverage: `bespoke-pages; financial-workflows`. Completion: PARTIAL; no assertion that every requested extension is delivered.

### Quotations — PARTIAL

- Implementation/purpose: `FinancialWorkspace.jsx` — Itemised quotations and approvals.
- Primary actions: Create/edit/duplicate; approve/send/accept. Secondary: Print; convert to invoice.
- Connected modules: CRM, staff, jobs.
- Defects/missing: Contacts now use stable IDs and CRM quotations preselect customer; catalogue/tax extensions incomplete.
- Mobile: navigation/rendering inspected at 390px, 820px and 1440px, with no root overflow or page errors in the 126-page sweep at each width; listed workflow tests cover interactions, and unimplemented advanced paths are not asserted tested.
- Coverage: `financial-workflows`. Completion: PARTIAL; no assertion that every requested extension is delivered.

### Invoices — PARTIAL

- Implementation/purpose: `FinancialWorkspace.jsx` — Invoice balances and fictional settlement.
- Primary actions: Convert quote; issue; record partial/full payment. Secondary: Credit note; print/history.
- Connected modules: CRM, quotes, reports.
- Defects/missing: Booking-generated drafts and contact IDs implemented; advanced credits/refunds incomplete.
- Mobile: navigation/rendering inspected at 390px, 820px and 1440px, with no root overflow or page errors in the 126-page sweep at each width; listed workflow tests cover interactions, and unimplemented advanced paths are not asserted tested.
- Coverage: `financial-workflows`. Completion: PARTIAL; no assertion that every requested extension is delivered.

### Events (Events & bookings alias) — PARTIAL

- Implementation/purpose: `scheduling/EventsWorkspace.jsx` — Event plan and visitor booking desk.
- Primary actions: Create event; reserve; waitlist; check-in. Secondary: Cancel booking and recompute totals.
- Connected modules: Staff, assets/resources, CRM, tasks, rotas, documents, reporting and booking IDs.
- Defects/missing: Month/week planner; existing staff and equipment; optional recorded competency; end times and save-time conflicts; linked preparation tasks/documents. Remaining: ticket categories, finer event statuses and a structured event checklist beyond linked tasks.
- Mobile: navigation/rendering inspected at 390px, 820px and 1440px, with no root overflow or page errors in the 126-page sweep at each width; listed workflow tests cover interactions, and unimplemented advanced paths are not asserted tested.
- Stage 7 integration coverage: `stage7-scheduling.spec.js` (desktop/phone/tablet).
- Coverage: `connected-business`. Completion: PARTIAL; no assertion that every requested extension is delivered.

### Bookings (event booking desk) — PARTIAL

- Implementation/purpose: `scheduling/EventsWorkspace.jsx` — Capacity reservations and admissions.
- Primary actions: Reserve, waitlist, check-in, cancel. Secondary: Promote waitlist with capacity guard.
- Connected modules: Events, CRM, invoices, reports and live capacity.
- Defects/missing: CRM/price/invoice linkage and adapter capacity checks implemented; waitlist/check-in/cancellation preserve history. Remaining: individual attendee identities/ticket types; cancellations do not automatically create financial credits.
- Mobile: navigation/rendering inspected at 390px, 820px and 1440px, with no root overflow or page errors in the 126-page sweep at each width; listed workflow tests cover interactions, and unimplemented advanced paths are not asserted tested.
- Stage 7 integration coverage: `stage7-scheduling.spec.js` (desktop/phone/tablet).
- Coverage: `connected-business`. Completion: PARTIAL; no assertion that every requested extension is delivered.

### Appointments / Resource Bookings — PARTIAL

- Implementation/purpose: `scheduling/AppointmentsWorkspace.jsx` — Customer/staff scheduling.
- Primary actions: Create appointment; change generic status. Secondary: Eligible staff and optional customer selector.
- Connected modules: Staff, leave/qualifications, CRM, resources, tasks, calendar, notifications and reporting.
- Defects/missing: Day/week diary, stable room/resource IDs, conflicts, rescheduling, completion outcome, follow-up tasks and history implemented. Remaining: recurrent appointments and external calendar adapters.
- Mobile: navigation/rendering inspected at 390px, 820px and 1440px, with no root overflow or page errors in the 126-page sweep at each width; listed workflow tests cover interactions, and unimplemented advanced paths are not asserted tested.
- Stage 7 integration coverage: `stage7-scheduling.spec.js` (desktop/phone/tablet).
- Coverage: `bespoke-pages; staff-eligibility`. Completion: PARTIAL; no assertion that every requested extension is delivered.

### Documents — COMPLETE

- Implementation/purpose: `DocumentWorkspace.jsx` — Controlled browser-local library.
- Primary actions: Select local file; create/edit/link/version. Secondary: Preview/download; classification; approval.
- Connected modules: Staff, assets, jobs, customers, events, inspections.
- Defects/missing: Browser-memory storage only; no permanent cloud upload; linked-record profile access varies.
- Mobile: navigation/rendering inspected at 390px, 820px and 1440px, with no root overflow or page errors in the 126-page sweep at each width; listed workflow tests cover interactions, and unimplemented advanced paths are not asserted tested.
- Coverage: `stock-recovery`. Completion: COMPLETE; no assertion that every requested extension is delivered.

### Archives & Collections (Archives alias) — PARTIAL

- Implementation/purpose: `CustomerResourcesOps.jsx` — Historical collection catalogue.
- Primary actions: Accession item; view condition/location. Secondary: Search and condition changes.
- Connected modules: Independent collection records.
- Defects/missing: Collection provenance/historical dates/digital references remain unfinished. A separate Business archives workspace now archives/restores eligible records with retained IDs/history/links, filters, selected CSV and browser print.
- Mobile: navigation/rendering inspected at 390px, 820px and 1440px, with no root overflow or page errors in the 126-page sweep at each width; listed workflow tests cover interactions, and unimplemented advanced paths are not asserted tested.
- Coverage: `bespoke-pages`. Completion: PARTIAL; no assertion that every requested extension is delivered.

### Forms & Surveys — PARTIAL

- Implementation/purpose: `completion/FormsWorkspace.jsx` — Versioned form builder and response workspace.
- Primary actions: Create template; reorder fields; submit. Secondary: Preview responses.
- Connected modules: Staff/assets/customers/operational records through stable related IDs; defect responses can create maintenance.
- Defects/missing: Draft/publish/archive, versions, accessible reordering, conditional fields, required validation, linked responses, CSV and defect-to-maintenance are implemented. Responses retain the submitted schema. No permanent server form hosting.
- Mobile: navigation/rendering inspected at 390px, 820px and 1440px, with no root overflow or page errors in the 126-page sweep at each width; listed workflow tests cover interactions, and unimplemented advanced paths are not asserted tested.
- Coverage: `connected-business`. Completion: PARTIAL; no assertion that every requested extension is delivered.

### Donations & Fundraising (Donations alias) — PARTIAL

- Implementation/purpose: `completion/FundraisingWorkspace.jsx` — Campaign targets and contribution/reconciliation ledger.
- Primary actions: Record donation; browse campaign. Secondary: View contribution details.
- Connected modules: Campaign names.
- Defects/missing: Campaign targets, linked CRM donors/events, contribution sources/references, CSV and fictional reconciliation are implemented. No payment processing or Gift Aid claims.
- Mobile: navigation/rendering inspected at 390px, 820px and 1440px, with no root overflow or page errors in the 126-page sweep at each width; listed workflow tests cover interactions, and unimplemented advanced paths are not asserted tested.
- Coverage: `bespoke-pages`. Completion: PARTIAL; no assertion that every requested extension is delivered.

### Visitor Statistics — PARTIAL

- Implementation/purpose: `completion/VisitorWorkspace.jsx` — Date/category visitor analysis and recording.
- Primary actions: Record count; browse chart. Secondary: Open recorded day.
- Connected modules: Reporting.
- Defects/missing: Daily/category/period totals, previous-period comparison, CSV and separate linked event attendance are implemented. Event counts are not automatically added to manual visitor totals to avoid double counting.
- Mobile: navigation/rendering inspected at 390px, 820px and 1440px, with no root overflow or page errors in the 126-page sweep at each width; listed workflow tests cover interactions, and unimplemented advanced paths are not asserted tested.
- Coverage: `bespoke-pages`. Completion: PARTIAL; no assertion that every requested extension is delivered.

### Daily Operations — PARTIAL

- Implementation/purpose: `DailyOperations.jsx` — Daily checks and accountable handover.
- Primary actions: Complete/approve opening and closing checks. Secondary: Create/acknowledge linked handover.
- Connected modules: Staff, attendance, shifts, work, maintenance.
- Defects/missing: Reusable opening/closing templates and bounded date-range preparation are implemented, including staff IDs and per-date deduplication. Background execution remains unavailable.
- Mobile: navigation/rendering inspected at 390px, 820px and 1440px, with no root overflow or page errors in the 126-page sweep at each width; listed workflow tests cover interactions, and unimplemented advanced paths are not asserted tested.
- Coverage: `stage3-operations`. Completion: PARTIAL; no assertion that every requested extension is delivered.

### Reports & Analytics (Reporting / Insights aliases) — PARTIAL

- Implementation/purpose: `ReportingWorkspace.jsx; reportingRules.js` — Filtered records and grouped analysis.
- Primary actions: Filter/build/save reports; CSV/print. Secondary: Comparisons and chart drilldown.
- Connected modules: Current enabled module records.
- Defects/missing: Confirmed places, checked-in visitors and illustrative booking value derive from reservations using linked event dates, venues and staff. Filters, CSV and grouped summaries share the same joins; preparation tasks keep their own deadlines. Configured overtime is available in weekly review; project allocations are shown in project profiles. Excel-compatible SpreadsheetML export uses the same filtered rows/fields as CSV. Dedicated overtime/project report measures and scheduled delivery remain unfinished.
- Mobile: navigation/rendering inspected at 390px, 820px and 1440px, with no root overflow or page errors in the 126-page sweep at each width; listed workflow tests cover interactions, and unimplemented advanced paths are not asserted tested.
- Coverage: `stage5-workspaces`. Completion: PARTIAL; no assertion that every requested extension is delivered.

### Notifications — COMPLETE

- Implementation/purpose: `NotificationInbox.jsx` — Actionable record-based inbox.
- Primary actions: Open record; read/dismiss; mark all read. Secondary: Categories/reminders/preferences.
- Connected modules: Tasks, stock, qualifications, approvals, bookings.
- Defects/missing: Session state only; no external delivery/background processing claimed.
- Mobile: navigation/rendering inspected at 390px, 820px and 1440px, with no root overflow or page errors in the 126-page sweep at each width; listed workflow tests cover interactions, and unimplemented advanced paths are not asserted tested.
- Coverage: `stage5-workspaces`. Completion: COMPLETE; no assertion that every requested extension is delivered.

### Staff Communications — COMPLETE

- Implementation/purpose: `CommunicationsWorkspace.jsx` — Targeted notices and acknowledgements.
- Primary actions: Draft/publish/archive; acknowledge. Secondary: Department/person targeting; handover links.
- Connected modules: Staff, roles, Daily Operations.
- Defects/missing: No email/chat delivery; audience and acknowledgement are fictional/session-only.
- Mobile: navigation/rendering inspected at 390px, 820px and 1440px, with no root overflow or page errors in the 126-page sweep at each width; listed workflow tests cover interactions, and unimplemented advanced paths are not asserted tested.
- Coverage: `stage5-workspaces`. Completion: COMPLETE; no assertion that every requested extension is delivered.

### Approvals — COMPLETE

- Implementation/purpose: `AdministrationPages.jsx` — Central supported review decisions.
- Primary actions: Approve/reject/request changes; comments. Secondary: Assign approver; open source.
- Connected modules: Leave, timesheets, jobs, inspection, document, quote.
- Defects/missing: Supported demo transitions only; no durable authorisation boundary.
- Mobile: navigation/rendering inspected at 390px, 820px and 1440px, with no root overflow or page errors in the 126-page sweep at each width; listed workflow tests cover interactions, and unimplemented advanced paths are not asserted tested.
- Coverage: `administration-finish`. Completion: COMPLETE; no assertion that every requested extension is delivered.

### Automations — COMPLETE

- Implementation/purpose: `AdministrationPages.jsx; administrationRules.js` — Session trigger/action configuration.
- Primary actions: Create/enable/disable/evaluate rules. Secondary: History and errors.
- Connected modules: Inspections, maintenance, tasks.
- Defects/missing: Supported trigger set only; no closed-browser server schedule.
- Mobile: navigation/rendering inspected at 390px, 820px and 1440px, with no root overflow or page errors in the 126-page sweep at each width; listed workflow tests cover interactions, and unimplemented advanced paths are not asserted tested.
- Coverage: `administration-finish`. Completion: COMPLETE; no assertion that every requested extension is delivered.

### Global Search — PARTIAL

- Implementation/purpose: `CustomerCommandBar.jsx` — Permitted records and creation commands.
- Primary actions: Search/filter/open record; quick command. Secondary: Save search; keyboard dialog.
- Connected modules: All accessible records.
- Defects/missing: Event and reservation focus now resolves the correct event; appointment/resource results and quick creation are wired. Resource definitions are excluded from record search. Form-template records use the new versioned workspace; configuration rows are excluded from normal search. Saved searches remain session-local.
- Mobile: navigation/rendering inspected at 390px, 820px and 1440px, with no root overflow or page errors in the 126-page sweep at each width; listed workflow tests cover interactions, and unimplemented advanced paths are not asserted tested.
- Stage 7 integration coverage: `stage7-scheduling.spec.js` (desktop/phone/tablet).
- Coverage: `administration-finish`. Completion: PARTIAL; no assertion that every requested extension is delivered.

### Activity History — COMPLETE

- Implementation/purpose: `AdministrationPages.jsx` — Record-change timeline.
- Primary actions: Filter and open source. Secondary: Actor/date/action scope.
- Connected modules: Record activity and company settings.
- Defects/missing: Bounded, mutable session history; not a legal audit ledger.
- Mobile: navigation/rendering inspected at 390px, 820px and 1440px, with no root overflow or page errors in the 126-page sweep at each width; listed workflow tests cover interactions, and unimplemented advanced paths are not asserted tested.
- Coverage: `administration-finish`. Completion: COMPLETE; no assertion that every requested extension is delivered.

### Company Settings / Roles — PARTIAL

- Implementation/purpose: `CompanyConfiguration.jsx` — Company-scoped operating configuration.
- Primary actions: Edit profile, modules, roles and workflows. Secondary: Branding, widgets, notifications, locations.
- Connected modules: Navigation, eligibility, approvals, dashboard.
- Defects/missing: Production enforcement and granular per-person exceptions remain.
- Mobile: navigation/rendering inspected at 390px, 820px and 1440px, with no root overflow or page errors in the 126-page sweep at each width; listed workflow tests cover interactions, and unimplemented advanced paths are not asserted tested.
- Coverage: `administration-finish`. Completion: PARTIAL; no assertion that every requested extension is delivered.

## Owner page-by-page inventory

Packages and subscriptions, server monitoring/backups, accounts/permissions and client configuration are internal sections of their related destinations; separate redundant navigation pages are not invented.

### Owner Home — COMPLETE

- Implementation/purpose: `src/owner/BusinessDashboard.jsx` — Connected operational owner widgets.
- Primary/secondary actions: Customise widgets; quick actions. Connected modules: Company, support, sales, plan, modules.
- Defects/missing: Current demo overview covered; no revenue/telemetry claims.
- Mobile: responsive cards/tabs/inbox/wizard covered by `owner-stage6.spec.js` on 390/820/1440px.
- Coverage/completion: nine Stage 6 owner scenarios; COMPLETE for stated demo scope.

### Companies — COMPLETE

- Implementation/purpose: `src/owner/CompanyDirectory.jsx` — Searchable business directory.
- Primary/secondary actions: Search/filter; profile; preview. Connected modules: Company/status/package/onboarding.
- Defects/missing: Suspended/archived previews guarded.
- Mobile: responsive cards/tabs/inbox/wizard covered by `owner-stage6.spec.js` on 390/820/1440px.
- Coverage/completion: nine Stage 6 owner scenarios; COMPLETE for stated demo scope.

### Company Profiles / Client Configuration — PARTIAL

- Implementation/purpose: `src/owner/CompanyProfile.jsx` — Tabbed customer administration.
- Primary/secondary actions: Edit contacts; configure modules/subscription; open support. Connected modules: Modules/users/packages/branding/support/activity.
- Defects/missing: Contact/address and role metadata only; advanced per-module controls remain.
- Mobile: responsive cards/tabs/inbox/wizard covered by `owner-stage6.spec.js` on 390/820/1440px.
- Coverage/completion: nine Stage 6 owner scenarios; PARTIAL for stated demo scope.

### Company Onboarding — COMPLETE

- Implementation/purpose: `src/owner/OnboardingWizard.jsx` — Nine-stage real demo workspace creation.
- Primary/secondary actions: Back/next/review/create/open workspace. Connected modules: Industry/modules/package/branding/roles/locations/leads.
- Defects/missing: No real account invitations; retries reuse company ID.
- Mobile: responsive cards/tabs/inbox/wizard covered by `owner-stage6.spec.js` on 390/820/1440px.
- Coverage/completion: nine Stage 6 owner scenarios; COMPLETE for stated demo scope.

### Module Catalogue — PARTIAL

- Implementation/purpose: `src/pages/ModulesPage.jsx` — Product capabilities and dependencies.
- Primary/secondary actions: Search/filter; enable/disable for company. Connected modules: Companies/packages/industry presets.
- Defects/missing: Development status is broad functional/partial demo, not independently verified production status.
- Mobile: responsive cards/tabs/inbox/wizard covered by `owner-stage6.spec.js` on 390/820/1440px.
- Coverage/completion: nine Stage 6 owner scenarios; PARTIAL for stated demo scope.

### Packages & Pricing / Subscriptions — PARTIAL

- Implementation/purpose: `src/pages/SubscriptionsPage.jsx; src/owner/CommercialControls.jsx` — Configured packages and illustrative agreements.
- Primary/secondary actions: Create package; assign; negotiated amount; fictional payment. Connected modules: Companies/modules/plans.
- Defects/missing: Package descriptions/prices/trial/user/storage/support/module allowances can be edited. Optional module prices, company add-ons, negotiated base pricing and non-overlapping illustrative billing periods with recorded-payment balances are implemented. No real billing or receipts.
- Mobile: responsive cards/tabs/inbox/wizard covered by `owner-stage6.spec.js` on 390/820/1440px.
- Coverage/completion: nine Stage 6 owner scenarios; PARTIAL for stated demo scope.

### Sales Leads — PARTIAL

- Implementation/purpose: `src/OwnerBusinessPages.jsx` — Seven-stage opportunity pipeline.
- Primary/secondary actions: Add/move lead; follow-up/activity; won conversion. Connected modules: Onboarding/companies.
- Defects/missing: Detailed ownership and complete proposal lifecycle remain.
- Mobile: responsive cards/tabs/inbox/wizard covered by `owner-stage6.spec.js` on 390/820/1440px.
- Coverage/completion: nine Stage 6 owner scenarios; PARTIAL for stated demo scope.

### Support — COMPLETE

- Implementation/purpose: `src/pages/SupportPage.jsx` — Ticket inbox and resolution.
- Primary/secondary actions: Create/assign/filter; note/respond locally; resolve/reopen. Connected modules: Companies/modules/feature requests.
- Defects/missing: Metrics use valid timestamps only; no external messages.
- Mobile: responsive cards/tabs/inbox/wizard covered by `owner-stage6.spec.js` on 390/820/1440px.
- Coverage/completion: nine Stage 6 owner scenarios; COMPLETE for stated demo scope.

### Feature Requests — PARTIAL

- Implementation/purpose: `src/OwnerBusinessPages.jsx` — Customer feedback backlog.
- Primary/secondary actions: Add/link/vote/prioritise/status. Connected modules: Companies/tickets/roadmap.
- Defects/missing: Formal weighted demand scoring remains.
- Mobile: responsive cards/tabs/inbox/wizard covered by `owner-stage6.spec.js` on 390/820/1440px.
- Coverage/completion: nine Stage 6 owner scenarios; PARTIAL for stated demo scope.

### Product Roadmap — PARTIAL

- Implementation/purpose: `src/owner/Roadmap.jsx` — Shared request delivery board.
- Primary/secondary actions: Move states; target dates; notes. Connected modules: Feature request IDs.
- Defects/missing: Release-to-announcement associations remain.
- Mobile: responsive cards/tabs/inbox/wizard covered by `owner-stage6.spec.js` on 390/820/1440px.
- Coverage/completion: nine Stage 6 owner scenarios; PARTIAL for stated demo scope.

### Customer Branding — COMPLETE

- Implementation/purpose: `src/owner/BrandingEditor.jsx` — Selected-company live appearance preview.
- Primary/secondary actions: Preview/apply/reset logo/colours/labels/preset. Connected modules: Company/workspace/document branding.
- Defects/missing: Small local logo bytes only; changes isolated in demo.
- Mobile: responsive cards/tabs/inbox/wizard covered by `owner-stage6.spec.js` on 390/820/1440px.
- Coverage/completion: nine Stage 6 owner scenarios; COMPLETE for stated demo scope.

### Customer Announcements — COMPLETE

- Implementation/purpose: `src/OwnerBusinessPages.jsx` — Audience-targeted local service notices.
- Primary/secondary actions: Draft/edit/preview/publish/archive. Connected modules: Company/package audiences/customer communications.
- Defects/missing: Scheduling explicitly unavailable; no delivery claims.
- Mobile: responsive cards/tabs/inbox/wizard covered by `owner-stage6.spec.js` on 390/820/1440px.
- Coverage/completion: nine Stage 6 owner scenarios; COMPLETE for stated demo scope.

### Client Analytics — COMPLETE

- Implementation/purpose: `src/OwnerBusinessPages.jsx` — Available company/module/record comparisons.
- Primary/secondary actions: Filter industry and compare counts. Connected modules: Companies/modules/current records.
- Defects/missing: Demo information only; no production usage telemetry.
- Mobile: responsive cards/tabs/inbox/wizard covered by `owner-stage6.spec.js` on 390/820/1440px.
- Coverage/completion: nine Stage 6 owner scenarios; COMPLETE for stated demo scope.

### Server Management / Monitoring / Backup Status — PARTIAL

- Implementation/purpose: `src/OwnerBusinessPages.jsx; ServerManagement.jsx` — Honest platform boundary/diagnostic view.
- Primary/secondary actions: Open separate private workspace; inspect available status. Connected modules: Preserved Node/Postgres backend.
- Defects/missing: Public disconnected diagnostics and disabled backup controls; real services unavailable.
- Mobile: responsive cards/tabs/inbox/wizard covered by `owner-stage6.spec.js` on 390/820/1440px.
- Coverage/completion: nine Stage 6 owner scenarios; PARTIAL for stated demo scope.

### Owner Activity — COMPLETE

- Implementation/purpose: `src/owner/ActivityCentre.jsx` — Chronological administrative change log.
- Primary/secondary actions: Filter company/action/module/date. Connected modules: Owner actions/companies.
- Defects/missing: Fictional actor and browser-side mutable history.
- Mobile: responsive cards/tabs/inbox/wizard covered by `owner-stage6.spec.js` on 390/820/1440px.
- Coverage/completion: nine Stage 6 owner scenarios; COMPLETE for stated demo scope.

### Company Administrators — PARTIAL

- Implementation/purpose: `src/pages/UsersPage.jsx` — Fictional company administrator metadata.
- Primary/secondary actions: Add/edit role/name entries. Connected modules: Company memberships.
- Defects/missing: Not real accounts or invitations.
- Mobile: responsive cards/tabs/inbox/wizard covered by `owner-stage6.spec.js` on 390/820/1440px.
- Coverage/completion: nine Stage 6 owner scenarios; PARTIAL for stated demo scope.

### Owner Accounts / Permissions — PARTIAL

- Implementation/purpose: `src/owner/OwnerAccess.jsx` — Five fictional owner-role previews.
- Primary/secondary actions: Select role; inspect allowed pages/actions. Connected modules: Navigation/controller guards.
- Defects/missing: Custom accounts/invitations/permission matrix missing.
- Mobile: responsive cards/tabs/inbox/wizard covered by `owner-stage6.spec.js` on 390/820/1440px.
- Coverage/completion: nine Stage 6 owner scenarios; PARTIAL for stated demo scope.

### Business Settings — PARTIAL

- Implementation/purpose: `src/owner/BusinessSettings.jsx; src/pages/SettingsPage.jsx` — Owner business defaults.
- Primary/secondary actions: Edit profile/default package/planning response target. Connected modules: Overview/onboarding/support.
- Defects/missing: Support categories, notification/default templates incomplete.
- Mobile: responsive cards/tabs/inbox/wizard covered by `owner-stage6.spec.js` on 390/820/1440px.
- Coverage/completion: nine Stage 6 owner scenarios; PARTIAL for stated demo scope.

## Duplication and architecture findings

- Tasks/Projects already share one module and tabs; do not split them.
- Attendance/Timesheets share session data but their live board and weekly review serve different needs.
- Event bookings, staff appointments and equipment/room reservations are distinct workflows that must share capacity/conflict rules.
- Documents are browser-local working files; collection archives are historical objects. A separate business-record archiving workflow is still missing.
- Notifications are per-user actions; communications are published, acknowledged notices.
- Owner settings administer Channel Systems; company settings configure a single fictional workspace.
- Support tickets resolve incidents; linked feature requests/roadmap manage product demand.
- **REDUNDANT navigation aliases remain:** Assets/Assets & equipment, Staff/Staff & volunteers/Volunteers and Maintenance/Work orders/Job records. Events/Events & bookings are consolidated to the modern destination when both are enabled; the shared workspace retains both sources and search links keep their original IDs. Data identities must be retained and all related rows must remain reachable if navigation is consolidated.
- Existing Node/PostgreSQL/Docker foundation, migrations, tenant policy, private workspace and backup scripts remain separate and unchanged. No production backend is deployed.

## Stage 7 implementation checklist

- [x] Complete baseline page navigation/screenshot audit and regression checks.
- [x] Shared event/reservation/appointment validation at the fictional adapter boundary.
- [x] Event calendar, linked eligible team/resources, tasks and documents.
- [x] CRM-linked reservations, safe capacity/waitlist/check-in/cancellation and invoice linkage.
- [x] Day/week appointment diary, resource registry/conflicts, rescheduling/outcomes/follow-up.
- [x] Customer profile tabs, stable contact IDs, combined activity and linked operational records.
- [x] Staff/rota/asset/calendar/search/report connections for the new scheduling workflows.
- [x] Responsive page sweeps at all three widths, workflow overflow checks, group keyboard/focus behavior, dialog Escape/focus, validation/error states, and reduced-motion support.
Release tracking: [PR #33](https://github.com/s4wf9js2k8-create/owner-admin/pull/33) contains the final full-suite CI result, merge commit, Pages deployment run and deployed workflow checks. These external release states are not inferred from source completion.

## Verification and remaining work

Baseline evidence: `npm ci`, lint, 102 unit tests, build and **195 browser tests passed** before changes. A scripted sweep inspected 122 destinations (18 owner and 104 customer page visits across the four organisations), captured desktop screenshots, and reported zero page errors or root horizontal overflow. This is automated navigation evidence, not a claim that every advanced control was manually inspected.

Stage 7 adds a coherent scheduling/commercial integration batch, not completion of all stages. The eight scenario implementations are in `tests/browser/stage7-scheduling.spec.js`; new rule/adapter cases are in `tests/scheduling.test.js`. Local acceptance: lint, **117 unit tests**, build, **18 PostgreSQL integration tests**, and **21 expanded scheduling/commercial browser workflows** passed. The 15 scheduling rule/adapter cases also passed under `TZ=Europe/London`. Final full-suite CI and Pages evidence are recorded in [PR #33](https://github.com/s4wf9js2k8-create/owner-admin/pull/33). The final application code remains unchanged during the final regression run; documentation updates do not alter its behavior.

Performance: the initial main JavaScript chunk fell from 560.01 kB / 152.48 kB gzip to approximately 423.30 kB / 123.14 kB gzip by loading specialist customer modules on demand; no dependencies added.

The original remaining-work register below is superseded by the 22 November follow-up at the end of this document. That follow-up implements Fleet, archives, forms, safety, training, project resources, fundraising, visitors and owner billing extensions; remaining accounts/settings and other advanced requirements are listed there. Complete requests A–D and F are covered in part by existing scenario suites; a single uninterrupted employee-to-payroll scenario and all advanced financial/maintenance supervisor gates are not claimed implemented.

Collection archives remain distinct from documents, and persistent/external production services remain explicitly unavailable. Earlier unchecked requirements in PAGE-CHECKLIST.md remain unfinished.

### Post-implementation viewport sweep

The updated navigation/screenshot sweep completed **126 page visits at each of 390px, 820px and 1440px** (378 visits total), with no recorded page errors and no root horizontal overflow. This includes owner pages, all enabled customer pages and newly enabled CRM/asset records; bounded horizontal scroll inside existing tables/rotas is intentional. Relevant desktop/mobile screenshots were reviewed for events, the appointment diary and CRM. The sweep is a navigation/layout observation, not a replacement for the workflow tests.

### Cancellation status integration follow-up

[PR #34](https://github.com/s4wf9js2k8-create/owner-admin/pull/34) excludes completed/cancelled events and shifts from upcoming dashboard widgets; removes cancelled appointments/events from My Work outstanding/today/overdue queues; retains them in All/history; and derives assignment names/team matching from staff IDs. Its new scenario passed at all three viewports. The expanded suite contains 219 browser cases (24 Stage 7 cases); final CI and deployed checks are recorded in the PR.

The PR #34 report follow-up also joins reservation dates/locations/staff to the linked event for filters, grouped summaries, screen rows and CSV, without copying event details into reservations. Changing the event venue/staff updates the report. Event preparation tasks retain their own report deadline. These two new rule cases failed before the correction and pass after it. Local final follow-up checks: lint, 119 unit tests, build, 17 Europe/London rule cases, and six focused cancellation/booking-report browser cases across all three viewports. The full 219-case CI run remains the release gate.


## Remaining-workflow implementation follow-up — 22 November 2026

Baseline: main `da01770`, following merged PRs #33/#34. This follow-up preserves the existing customer and owner interfaces and adds specialised components under `src/completion/`. The pure command layer validates related writes before one fictional-state publication; it is not a production API or security boundary.

Implemented: fleet profiles/item checks/services/driving qualifications; business-record archive/restore; published/conditional/linked/versioned forms; training sessions/assessments/local certificates; safety scoring/corrective work; campaign targets/donors/events/reconciliation; visitor period/category analysis; leave calendar/balances; project team/equipment/costs/time allocations; configurable overtime; recurring shift/maintenance/operational templates; maintenance completion gates and evidence; editable inspection template versions; asset purchase/warranty/QR profiles; Excel-compatible report export; notification state retained while switching companies; owner package/add-on/period controls. Individual earlier entries above describe residual limits; PARTIAL pages are not silently reclassified COMPLETE.

The QR encoder is the only added dependency (`qrcode-generator`); QR generation is local and calls no external service. The obsolete state-only forms component is removed after replacement with the versioned record-based workflow.

Verification: `npm ci`, lint, all **133 unit tests**, and build passed. All **246 browser cases passed** locally at desktop 1440px, iPhone 390px and iPad 820px, including 27 executions of nine new workflows. All **18 PostgreSQL integration tests passed** against the disposable synthetic database. The application source was frozen during the final run. [PR #35](https://github.com/s4wf9js2k8-create/owner-admin/pull/35) records remote CI, merge, Pages and deployed live checks; none are inferred from the local test result.

Still unfinished: competency-specific rota minima/swaps; per-person permission exceptions; recurring inspection generation; structured ticket categories/individual attendees/event checklist/cancellation credits; product/service catalogue/advanced tax/refunds; collection catalogue provenance/dates; dedicated overtime/project report measures; owner custom accounts/matrix/settings/templates, sales ownership and release associations. Production authentication/storage/email/push/schedules/telemetry/backups remain explicitly unavailable in the public application. This is a substantial follow-up, not a claim that the entire multi-stage specification is finished.

### Follow-up review hardening

The final page review advances legacy inspection templates correctly from implicit v1 to v2, exposes retained question versions, labels timesheet CSV exports with the configured overtime threshold, and reduces repeated customer-header spacing. Fictional acting-user choices now come from staff records; seeded project/task owners and teams use those same stable staff IDs. The new version scenario passed at all three viewports; lint, **135 unit tests** and build passed. These changes expand the full release suite to **249 browser cases**; latest full CI and deployment evidence remains in PR #35. The earlier 246-case run and 130-page-per-width sweep are baseline evidence preceding this small hardening change, not a claim that later changes were covered by the earlier run.

### Campaign identity correction

A fixture-integrity check after PR #35 found that the legacy and modern fundraising modules both generated `General fund` with the same internal ID. The correction qualifies campaign IDs by their original module identity, preserving donation links without merging the two record sets. Regression tests require every fixture record ID to be unique, every donation to resolve its own campaign/module/company, and editing one alias's campaign to leave the other unchanged. Lint, **137 unit tests** and build passed locally; the expanded 252-case regression suite is the release gate for this correction, including a desktop/phone/tablet campaign-edit isolation scenario. PR #35's deployed 90-case browser check passed before this correction; it does not substitute for final live verification of the corrected release.
