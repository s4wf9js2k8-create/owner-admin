# Original specification reconciliation

Scope: the original 50-section overhaul brief and the later Stages 3–7. This is an implementation map for the fictional, session-only GitHub Pages demonstration. It does not redefine the brief as a production backend launch. “Implemented” means the listed demo workflow exists; required release checks and live evidence are recorded in the release PR. The deliberately unavailable services at the end were explicitly excluded or reserved for future infrastructure in the original instructions.

## Gaps found after PR #38 and implemented in this release

| Original requirement | Gap found | Delivered correction |
|---|---|---|
| Tasks: subtasks and connected projects | Only checklists existed | Separately assigned child tasks with parent IDs, inherited project links, cycle protection and a parent completion gate. Repeated manual recurrence generation is deduplicated. |
| Project pages: manager, deadlines, activity | Manager/deadline were creation-only; activity was not shown in the profile | Editable project brief/manager/deadline/risk, shared eligibility and visible task/project activity. |
| Existing staff changes update related modules | Cached assignment labels could remain stale; Working as depended on names | Stable acting-person identity; linked labels update from staff IDs when assignments or names change. Personal email/telephone/name can be edited. |
| Attendance: expected staff and missing clock-outs | Open sessions existed without a clear expected-vs-present board | Today's rota expectations, linked staff/shift entries, live elapsed hours and previous-day clock-out review. |
| Recorded availability | Only unavailable/leave dates were supported | Approved available-date requests and a Recorded dates only policy; missing dates prevent assignments and do not consume annual leave. The full new-employee-to-report workflow is tested. |
| Archived relationships | Active-list filtering could hide records from related dossiers/progress | Read profiles retain permitted archived records; source links open the archive while active operational lists remain filtered. |
| Owner support assignment | Legacy name-only template assignees remained | Seeded fictional owner-account IDs and active-account validation now connect support assignment to Owner Access. |
| Fleet and assignment eligibility | General driving competency was enforced; per-vehicle requirements were not configurable | Recorded department/competency requirements, eligible selectors, explanations and daily-check enforcement. The same requirement controls are available for work orders, inspections and rotas. |
| Events: staffing shortages and alerts | No configurable event staffing minimum or derived shortage notification | Minimum staffing, eligibility-derived coverage and a notification that recalculates when qualifications/leave/assignments change. |
| General bookings: activities/hire/facilities/services | Event tickets and appointments existed, but no priced non-event capacity booking workflow | Separate resource-booking tab/calendar, configurable booking types, existing CRM/resources/staff, pending/confirmed/completed/cancelled states, concurrent capacity, exclusive clashes, invoices, cancellation corrections and CRM history. |
| Documents: recently accessed and approval status | No recent list; editing approved metadata could retain its old approval | Session recent-document links; a new version re-enters review with the editing staff ID and retains the previous version/file. |
| Owner announcements reach selected companies | Distribution depended on the optional Staff Communications module | A single canonical owner announcement is displayed on targeted dashboards/notifications and optionally communications; withdrawal updates all of them immediately. |
| CRM financial history | Explicit refunds were absent from the timeline | Linked fictional refund entries alongside payments/credits and document history. |
| Safety training links | Related qualifications required manual navigation | Direct links from safety records to the existing safety/inspection qualification records. |

## Original 50-section brief: implementation map

| Section | Implementation and boundary |
|---|---|
| 1 Design philosophy | Specialist light workspaces, dark drawer, compact domain controls and responsive cards/agendas. Existing application retained. |
| 2 Connected records | Fictional adapter, stable IDs, atomic stock/approval/booking commands and derived relationships. New code in `reconciliation/rules.js` fills the missing parent/resource/identity connections. |
| 3 Staff eligibility | `staffEligibility.js`, shared pickers, assignment/schedule validators and source-page guards cover employment, approval/expiry, leave, unavailable ranges, department/competency and interval conflicts. Cancelled unavailability is excluded. |
| 4 Customer dashboard | `OperationalDashboard.jsx`: live records, operational quick actions, company presets and configurable filtered/ordered/sized widgets. |
| 5 Tasks and projects | `CustomerTaskBoard.jsx`, `Subtasks`, `ProjectResources`: My Work/board/list/calendar/project views, assignments, statuses, checklists/dependencies, notes/evidence/time/recurrence/approvals, child tasks, milestones/team/resources/budgets/risks/activity. |
| 6 Staff and volunteers | Directory/profile tabs in `CustomerPeopleOps`/`StaffProfile`, linked schedule/qualifications/work/files/history and person permissions. |
| 7 Attendance/timesheets | Clocking, expected staff, review/corrections, session/break validation, weekly totals/overtime/allocations/approvals/CSV. |
| 8 Rotas | Weekly grid/phone agenda, qualified assignments/conflicts, coverage requirements, bounded templates/patterns and independently reviewed swaps. Dragging is optional; accessible controls provide the workflow. |
| 9 Leave/availability | Requests/decisions/cancellation, calendar, annual weekday balances, explicit available/unavailable ranges, recorded-dates policy and automatic eligibility updates. No payroll/accrual calculation is implied. |
| 10 Training | Competency matrix, approved/expired/missing states, sessions/assessments, local evidence and renewals. |
| 11 Assets | Profiles, stable custodians, condition/location, purchase/warranty, inspection/maintenance/files and local QR links. Native scanning is not claimed. |
| 12 Maintenance | Work-order lanes, asset/engineer/project selectors, schedule/checklist/labour/parts/evidence, completion review, recurring templates and asset/stock history. Date-only jobs do not certify a time interval. |
| 13 Inspections | Editable/versioned templates, sections/types/required evidence, asset/location, eligible inspectors, mobile worksheet/review, recurrence and corrective work. |
| 14 Health/safety | Incident/near-miss/hazard/risk workflows, scores/controls/responsible staff/review, corrective work and training links. No legal compliance claim. |
| 15 Fleet | Vehicle profiles, dates/mileage/services/checks/defects/files, configurable check questions and per-vehicle qualified driver rules. |
| 16 Inventory | Stock/location/supplier/order/movement interfaces, receive/issue/return/transfer/adjustments, partial deliveries and atomic parts/job quantities. |
| 17 Customer CRM | Customer/contact/manager/activity/task/scheduling/job/finance/document tabs, calls/notes/opportunities/follow-ups and exact record links. |
| 18 Quotes/invoices | Customer/contact-linked document editor, catalogue snapshots, quantities/discounts/VAT/totals, approval/status/duplication/conversion/print, partial payments/credits/refunds and CRM history. All settlements are fictional. |
| 19 Events/bookings | Calendar, dates/location/status, staff/equipment, tasks/readiness/files, tickets/places/waitlist, individual check-in/undo, invoice links and cancellation corrections. |
| 20 Appointments/resources | Separate staff diary and resource-booking calendar, registered resources/capacity/conflicts, eligible staff, rescheduling/outcomes/follow-up and CRM/staff links. |
| 21 Documents | Categorised/foldered versioned local-file library, ownership/classification/review, record links, recent access, image previews/downloads and retained revisions. No permanent server upload. |
| 22 Archives | Distinct historical collection accession catalogue; operational business archive/restore preserves linked records. Search/date/category/source filters, CSV and print are available. |
| 23 Forms/surveys | Versioned form builder, accessible reordering, sections/question types/required/conditions, preview/publish/submission/history/filter/export and supported defect trigger. |
| 24 Donations | Campaigns/targets, donors/events/sources/contributions and fictional reconciliation. Payment processing and Gift Aid/tax submission are not provided. |
| 25 Visitors | Recorded counts/categories, daily/period comparisons and separately derived event attendance; no arbitrary charts. |
| 26 Daily operations | Dated opening/closing templates, responsibilities/timestamps/review/history, staffing/work/booking queues and acknowledged handovers. |
| 27 Reporting | Module-aware current-record measures, filters/grouping/calculations/comparisons/selected fields, saved configurations, CSV/SpreadsheetML/print. Scheduled delivery is visibly unavailable. |
| 28 Notifications | Derived assignments/deadlines/qualification/leave/stock/bookings/finance/approval/communication and staffing alerts, categories/preferences/read/dismiss/record links. No external delivery. |
| 29 Global search | Permitted-record term index, typed/contextual results and exact-record commands; session saved searches. |
| 30 Roles/permissions | Templates/custom roles, action/module/team/person/ownership/location/sensitive/approval rules, guarded demo writes and role navigation. Explicitly not server security. |
| 31 Company customisation | Profile/industry/branding, enabled modules/dependencies, labels/terminology, operational settings/roles/forms/workflow/notification/dashboard configuration. |
| 32 Owner dashboard | Connected company/support/sales/onboarding/package/module/activity/health widgets and layout/alert preferences. |
| 33 Owner customer management | Directory and company profile tabs connect contact/status/modules/admins/subscription/branding/support/activity/workspace. |
| 34 Onboarding | Guided validated review/back navigation creates actual fictional workspaces with industry/modules/package/branding/roles/locations; saved configuration templates and lead conversion. |
| 35 Packages/modules | Standard/bespoke packages, dependency-aware included/add-on modules, editable allowances/illustrative prices, customer negotiated amounts and period balances. |
| 36 Branding | Company-scoped logo/colours/sidebar/preset/welcome/terminology/labels/document branding and preview/reset. |
| 37 Support | Company-linked inbox/filtering, priority/category/assignment/conversation/internal notes/resolution/reopen and timestamp-supported metrics; responses are local. |
| 38 Feature requests | Company/ticket links, categories/priorities/interest/votes/demand scoring and shared development/roadmap state. |
| 39 Sales | Pipeline/details/ownership/follow-ups/activity/proposals, won/lost and duplicate-safe onboarding draft conversion. |
| 40 Servers | Prepared Node/PostgreSQL/Docker foundation retained; actual configured connection diagnostics are distinguished from unavailable host/backup operations. No VM/service has been provisioned. |
| 41 Mobile | Drawer, touch forms/dialogs, card/agenda alternatives and bounded table scroll. Routine smoke uses phone/tablet Chromium viewports, not physical-device certification. |
| 42 Demo data | Existing fictional organisations retained, connected records update in-session, refresh/Reset Demo restore fixtures consistently; no backend required. |
| 43 Architecture | Shared controls plus specialist domain pages, pure business rules, typed module definitions, adapter state, guarded navigation/scopes and testable calculations. No new dependency. |
| 44 Validation | Required fields, dates/intervals/numbers, quantities/capacity, qualification/scheduling, document calculations, approval/transition/cycle/dedup rules and useful errors. |
| 45 Cross-module scenarios | Scenario families in the browser suites cover maintenance/leave/training/inspection/CRM/finance/events/roles/onboarding, plus new source booking/subtask/document/announcement regressions. |
| 46 Testing | Existing unit, desktop-browser and isolated PostgreSQL CI preserved. Phone/tablet smoke remains short; the broad three-viewport suite is opt-in. No repeated screenshot sweeps. |
| 47 Development/release | Audit, implement, integrate, focused regression, branch/PR, passing CI, merge, Pages deployment and live verification. |
| 48 Quality standard | This map identifies concrete code/workflows and boundaries. Module existence alone is not evidence; final release results are linked from the PR. |
| 49 Owner preferences | Practical operational interfaces, dark drawer, My Work, connected staff/eligibility, industry configuration, fictional refresh reset and GitHub Pages. |
| 50 Deliverables | Current audit/checklist, implementation report, test evidence, PR/merge/Pages/live links and the explicit boundaries below. |

## Additional owner requirements from Stage 6

The current owner console also implements fictional accounts/custom permission matrices with owner escape/reset, company announcements, request/roadmap/release associations, usage counts derived from demo data, business/support/onboarding defaults and per-owner in-app alerts. Monitoring/backups explain their unavailable state; no fake host control or restore success is presented.

## Deliberately unavailable production capabilities

- Secure server-enforced sign-in, permissions and tenant isolation; public role switching is a simulation.
- Durable database/file storage and immutable legal audit retention; refresh resets the public demo as requested.
- Real email/push, unattended automation/report jobs and external customer messaging.
- Real payments/tax/payroll/Gift Aid/compliance certification.
- Hosted self-managed backend operations, live host telemetry and real backup/restore operations.

These require a separately configured private infrastructure project. The original brief specifically requires the public demo to work without that connection and prohibits pretending these operations work. EVLT, Vercel, paid infrastructure and real customer systems remain untouched.
