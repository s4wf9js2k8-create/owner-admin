# Demonstration acceptance checklist

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
- [x] Reports derive reservation places, admissions and fictional booking values using the event date, including CSV/grouping.
- [x] Dates span approved leave correctly, including local summer dates and a half-open midnight finish.
- [x] Navigation groups collapse by keyboard; active state survives legacy event search links. Reduced motion is respected.
- [x] Customer modules load on demand; initial JS is reduced without adding dependencies.

The checked implementation rows refer to the source-frozen batch. Final automated acceptance and release evidence below must pass before release is reported successful.

## Final release verification

- [ ] Lint, unit tests, build and the full browser suite pass on the final branch.
- [ ] Desktop 1440px, phone 390px and tablet 820px workflows pass, including empty/error/reset states and no root overflow.
- [ ] PostgreSQL integration suite passes where Docker is available, including CI.
- [ ] PR checks pass; merge according to repository rules.
- [ ] Existing GitHub Pages deployment succeeds for the merged commit.
- [ ] Public HTML/asset hashes and deployed end-to-end owner/customer workflows verified.

## Explicitly not accepted as finished

- [ ] Fleet per-question checks, complete vehicle history and driving fixtures.
- [ ] Business-record archive/restore; collection archives are retained independently.
- [ ] Form publish/archive/conditional/record-link lifecycle.
- [ ] Full safety risk scoring, project resources/dependencies, training sessions, donor targets and visitor-period analytics.
- [ ] Owner add-on billing/period ledger, custom owner accounts and expanded settings/templates.
- [ ] Durable authentication/authorisation, hosted storage, external delivery, background schedules, live telemetry and backup operations in the public app.

No EVLT resource, Vercel hosting, paid infrastructure, real customer data, payment provider or external messaging is involved. Refresh and Reset Demo restore the connected fictional fixtures.
