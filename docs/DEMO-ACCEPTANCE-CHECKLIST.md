# Current original-spec acceptance

Baseline: merged PR #38. This release reconciles the [original specification](ORIGINAL-SPEC-RECONCILIATION.md) and [current page audit](FULL-APPLICATION-AUDIT.md). Final release identifiers and CI/deployment/live verification are recorded in its PR.

- [x] Separately assigned subtasks retain parent/project IDs, prevent cycles and block premature completion; manual recurrence does not duplicate the next occurrence.
- [x] Project brief/manager/deadline/risk can be edited; staff/resource/date rules and visible history remain connected.
- [x] Staff personal name/email/telephone editing retains acting-user identity and refreshes foreign-key labels.
- [x] Approved available-date requests and Recorded dates only policies gate assignments without consuming leave; changed request dates invalidate stale decisions.
- [x] New employee → training approval → availability approval → shift → clock-in/out → timesheet approval → reporting passes as one browser workflow.
- [x] Attendance expectations/stale sessions, vehicle-specific qualification/department rules and event staffing-shortage alerts derive from connected records.
- [x] Service/resource bookings enforce concurrent capacity, exclusive scheduling clashes, price/customer references, single invoicing and cancellation corrections.
- [x] Document recent links survive module navigation; revisions retain history and re-enter independent review.
- [x] Owner announcements reach selected organisations without optional communications and disappear from dashboard/notifications on archive.
- [x] Related dossiers/progress keep permitted archived records; source links open the archived record and restoration retains its history.
- [x] Support assignments use active fictional owner-account IDs; local refunds and safety training appear in related histories.
- [x] npm ci, lint, 158 unit tests and build passed locally; changed workflows and short phone/tablet booking smoke passed.
- Final desktop regression and isolated PostgreSQL CI must pass before merging. Pages deployment and a small live verification must succeed before publication is reported.

No permanent storage, production authentication/authorization, external delivery/payment or real server/backup operation is claimed. No EVLT, Vercel or paid infrastructure is used.

---

## Historical acceptance evidence

# Demonstration acceptance checklist

Verified baseline release: [PR #35](https://github.com/s4wf9js2k8-create/owner-admin/pull/35) and [PR #36](https://github.com/s4wf9js2k8-create/owner-admin/pull/36), merged as `266dd08` and `5671507`. **137 unit tests, 252 browser cases and 18 PostgreSQL integration tests passed in CI; 93 browser workflows passed against the deployed GitHub Pages site.** The public JS/CSS bytes match the built artifact. See [release report](RELEASE-2026-11-22.md) and [current checklist](PAGE-CHECKLIST.md). Earlier counts below are historical evidence for earlier commits, not replacements for final-head verification.

The final corrective-action scheduling fix is tracked in [PR #37](https://github.com/s4wf9js2k8-create/owner-admin/pull/37): staff options and save-time eligibility use the selected deadline, and future leave/qualification expiry are regression cases. All **138 unit tests** and the updated safety scenario at three widths passed locally. The final 252-case full browser run, CI, merge and live verification are recorded in that PR; baseline release results are not substituted for checks on the correction.


Updated 22 November 2026. This checklist records the current fictional, browser-session demonstration; it is not a production launch checklist. The page inventory, classifications, remaining defects and scope are in [FULL-APPLICATION-AUDIT.md](FULL-APPLICATION-AUDIT.md).

## Verified baseline

- [x] Main and merged PRs #25–#32 inspected before changes; React/Vite and Node/PostgreSQL/Docker preparation preserved.
- [x] Existing `npm ci`, lint, 102 unit tests, build and 195 browser cases executed successfully before Stage 7.
- [x] Automated navigation/screenshot audit: 122 page visits across the owner console and all four companies; no page errors or desktop root overflow.

## Implemented Stage 7 acceptance workflows

- [x] Event month/week planner opens the exact event; original event sources/IDs remain accessible after navigation consolidation.
- [x] Event team/equipment are existing records; staff eligibility and resource clashes are validated before writes publish.
- [x] Optional event competency and site-inspection appointment competency use approved/valid training.
- [x] Event preparation tasks appear in linked work; allocations appear in rotas, staff schedules and equipment profiles.
- [x] Reservations select CRM customers, calculate places, waitlist rather than overbook, check in once and release capacity/attendance on cancellation.
- [x] A confirmed priced reservation creates one linked draft invoice with correct customer/line totals; no actual payment collection.
- [x] Appointments support day/week views, staff filters, room registration, resource reservations, rescheduling, cancellation, outcomes and one linked follow-up task.
- [x] CRM provides contacts with IDs, editable customer details, local call/meeting/note/opportunity activity, assigned follow-ups and linked commercial/scheduling/job/document records.
- [x] Quotations started from CRM preselect the customer. Contact selections use IDs and invoice conversion retains the link.
- [x] Maintenance creation selects an optional CRM customer; the linked customer dossier shows the job.
- [x] Reports derive reservation places, admissions and fictional booking values using linked event dates/venues/staff, including filters, CSV and grouping; preparation tasks retain their own deadlines.
- [x] Dates span approved leave correctly, including local summer dates and a half-open midnight finish.
- [x] Navigation groups collapse by keyboard; active state survives legacy event search links. Reduced motion is respected.
- [x] Customer modules load on demand; initial JS is reduced without adding dependencies.

The checked implementation rows refer to the source-frozen batch. Final automated acceptance and release evidence below must pass before release is reported successful.

## Final release verification

- [x] Dependency installation, lint, 119 unit tests and build passed; the 17 scheduling/report rule cases also passed under Europe/London.
- Full regression outcomes: PR #33 passed 216 cases; the cancellation follow-up in [PR #34](https://github.com/s4wf9js2k8-create/owner-admin/pull/34) expands this to 219 cases. Check its final CI before release.
- [x] All 21 expanded workflows pass at desktop 1440px, phone 390px and tablet 820px, including error/reset/keyboard checks. The per-width 126-page sweep reported no page errors/root overflow (378 visits).
- [x] PostgreSQL integration suite: 18 passing locally with Docker, also exercised by PR CI.
The cancellation-active-queue/history scenario passed on all three viewports. Its final release state is recorded in [PR #34](https://github.com/s4wf9js2k8-create/owner-admin/pull/34); original Stage 7 release evidence is in [PR #33](https://github.com/s4wf9js2k8-create/owner-admin/pull/33): required CI checks, merge SHA, existing GitHub Pages build/deployment, public HTML/assets and live owner/customer workflow results. No deployment or live checks are claimed from source-only verification.

## Remaining-workflow follow-up acceptance — PR #35

- [x] Fleet profiles, qualified driving fixtures, per-question checks, mileage/defects and linked corrective maintenance.
- [x] Business archive/restore retains completed records, history and IDs; CSV and restoration scenario.
- [x] Published/versioned/conditional/linked forms; submitted defect creates maintenance and retains response schema.
- [x] Training sessions, attendee assessments and local evidence; pending qualifications update the matrix.
- [x] Scored safety assessment creates linked corrective maintenance.
- [x] Campaign target/donor links and fictional reconciliation update the contribution ledger.
- [x] Visitor category/date totals, daily chart, comparison and CSV use current records.
- [x] Asset purchase controls and locally generated QR link open the exact asset profile.
- [x] Recurring operational templates create one check per date, including repeated generation.
- [x] Owner package allowances/add-ons and illustrative billing-period balances; overlap is rejected.
- [x] Existing maintenance stock/history scenario now includes completed checklist, assigned engineer and supervisor approval.
- [x] `npm ci`, lint, 133 unit tests, build, all 246 browser cases and 18 PostgreSQL integration tests passed locally.
- [x] Screenshots reviewed for Fleet, Safety and Business Archives at 390px and 1440px. Automated new-flow tests check root overflow at 390/820/1440px.

Remote CI, merge and deployment/live verification are tracked in [PR #35](https://github.com/s4wf9js2k8-create/owner-admin/pull/35). These statuses are reported only after verification.

## Explicitly still unfinished

- [ ] Competency-specific staffing minima, full shift swaps, granular per-person permissions and recurring inspection generation.
- [ ] Event ticket categories/individual attendees/checklists/cancellation-credit extensions.
- [ ] Products/services, advanced tax/refunds and collection provenance/historical-date controls.
- [ ] Dedicated overtime/project report measures; XML export is Excel-compatible SpreadsheetML, not native XLSX.
- [ ] Custom owner accounts/matrix, expanded defaults/templates, sales ownership and release-announcement associations.
- [ ] Durable authentication/authorisation, hosted storage, external delivery, background schedules, live telemetry and backup operations in the public app.

See FULL-APPLICATION-AUDIT.md and PAGE-CHECKLIST.md for the page inventory. No EVLT resource, Vercel hosting, paid infrastructure, real customer data, payment provider or external messaging is involved. Refresh and Reset Demo restore the connected fictional fixtures.

Follow-up hardening: legacy template version numbering and configurable overtime CSV labels have regression coverage; fictional persona/task/project IDs now share staff records. Lint, 135 unit tests and build passed; the final suite is 249 browser cases. PR #35 records its executed result. Earlier counts above describe the initial completed run, and are not substituted for checks on the final head.
