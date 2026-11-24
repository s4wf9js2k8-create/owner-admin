# Current full-application audit

Baseline: PR #38 (`cf97d69`). This audit reconciles the implementation with the original overhaul specification and Stages 3–7. The requirement-by-requirement map and remaining infrastructure boundaries are in [ORIGINAL-SPEC-RECONCILIATION.md](ORIGINAL-SPEC-RECONCILIATION.md).

**Status scope:** COMPLETE below means a functional, connected browser-demo workflow with relevant automated coverage. It never means production authentication, permanent file storage, external delivery, real payments or verified host/backup operations. Final regression and live release evidence is recorded in the development PR. Earlier page sweeps are historical evidence in Git history/PRs #33–#38 and are not repeated release gates.

## Customer pages

| Page / purpose | Primary and secondary working actions | Implementation / connected records | Coverage / status |
|---|---|---|---|
| Operational dashboard | Clocking, quick creation, open work; widget add/remove/order/size/filter/template; platform updates | `OperationalDashboard`, `PlatformNotices`; attendance/staff/rotas/work/events/finance/owner announcements | operational-redesign, administration-finish, original-spec; COMPLETE demo |
| My Work | Assigned/today/overdue/blocked/approval queues and original-record links | `CustomerEssentialPages`; ID-linked tasks/jobs/schedules | connected-workflows, stage5-workspaces; COMPLETE demo |
| Team calendar | Date/view controls and source record navigation | `CustomerEssentialPages`; tasks/shifts/events/appointments/resource bookings | customer-overhaul, stage7-scheduling; COMPLETE demo |
| Tasks | My Work/board/list/calendar, qualified assignments, custom statuses, dependencies, subtasks, checklists, time, evidence, notes, recurrence, approvals, activity | `CustomerTaskBoard`, `Subtasks`; staff/projects/assets/customers/approvals | customer-overhaul, connected-workflows, original-spec; COMPLETE demo |
| Projects | Create/edit brief/manager/deadline/risk, team/equipment/budget/costs/time, milestones, tasks, files and history | `ProjectResources`; linked task progress, staff/resources/maintenance/time | remaining-workflows, original-spec; COMPLETE demo |
| Staff/volunteers | Directory/create/edit/profile tabs, contact data, permissions, qualifications, schedule/work/files/history | `CustomerPeopleOps`, `StaffProfile`; stable actor/assignment identity | operational-redesign, final-demo-workflows, original-spec; COMPLETE demo |
| Attendance/timesheets | Clocking/manual sessions, expected-vs-present, stale clock-out review, corrections/approvals, weekly hours/breaks/overtime/allocations/CSV | `CustomerPeopleOps`, `AttendanceExpectations`, `AttendanceCorrection`; rota/staff/jobs/projects | administration-finish, final-demo-workflows, original-spec rules; COMPLETE demo |
| Rotas | Weekly grid/day agenda, create/reassign, conflicts, coverage minima, patterns/templates, swap request/independent decision | `RotaPlanner`, `RotaExtensions`, `AssignmentPolicy`; qualifications/leave/commitments | operational-redesign, final-demo-workflows; COMPLETE demo |
| Leave/availability | Requests, decisions, cancellation, calendar, balances, available/unavailable dates and recorded-date policies | `CustomerPeopleOps`, `LeaveCalendar`; staff/eligibility/approvals | staff-eligibility, administration-finish, original-spec rules; COMPLETE demo |
| Training | Competency matrix, qualifications/expiry/review, sessions/assessments/local evidence | `TrainingSessions`; staff/assignment eligibility | staff-eligibility, remaining-workflows; COMPLETE demo |
| Assets | Register/profile/condition/custodian/location, purchase/warranty, QR, files, maintenance/inspection history | `CustomerAssetOps`, `AssetExtras`; staff/jobs/inspections/documents | operational-redesign, remaining-workflows; COMPLETE demo |
| Maintenance | Fault board, qualified engineer/requirements, checklist/time/parts/evidence, project/schedule, recurrence, completion/review/history | `CustomerAssetOps`, `WorkOrderExtras`, `AssignmentPolicy`; assets/stock/staff/approvals | connected-workflows, stock-recovery, operational-redesign; COMPLETE demo |
| Inspections | Versioned templates/sections/questions/evidence, asset/location/qualified inspector, mobile run/review, recurrence, corrective jobs | `InspectionTemplates`, `InspectionRun`, `InspectionRecurrence`; equipment/history/work orders | stage3-operations, remaining-workflows, final-demo-workflows; COMPLETE demo |
| Health/safety | Incidents/near misses/hazards, scored assessments/controls/responsibility/review, training and corrective links | `SafetyWorkspace`; staff/qualifications/tasks/maintenance | remaining-workflows, corrective-date regression; COMPLETE demo, no compliance certification |
| Fleet | Vehicle/check/service/mileage/defect/document profiles, configurable checks, vehicle-specific competency/department and eligible drivers | `FleetWorkspace`, `AssignmentPolicy`; staff/qualifications/assets/maintenance | bespoke-pages, original-spec; COMPLETE demo |
| Inventory | Stock/location/supplier/order profiles, receive/issue/return/transfer/adjust, partial delivery, history | `InventoryWorkspace`, stock transactions; asset-linked maintenance parts | stock-recovery, remaining-workflows; COMPLETE demo |
| CRM | Customer/contact/manager profiles, calls/notes/opportunities/follow-ups/tasks, related schedule/jobs/files/finance/refunds | `scheduling/CustomerDirectory`; staff/customers/documents/quotes/invoices/bookings | stage7-scheduling, financial-workflows, original-spec; COMPLETE demo |
| Quotations | Catalogue/customer/contact selection, item editor/calculations, approval/sent/acceptance, duplicate/edit/preview/print/conversion | `FinancialWorkspace`; CRM/products/invoices/jobs | financial-workflows, final-demo-workflows; COMPLETE demo |
| Invoices | Draft/issue/due/cancel, partial fictional payments/credits/refunds, balances, source/customer links and print | financial rules/commands; quotes/CRM/event and resource bookings | financial-workflows, final-demo-workflows, original-spec; COMPLETE demo, no money movement |
| Events/ticket bookings | Month/week calendar, create/duplicate/edit, qualified team/equipment, readiness/tasks/files, staffing minima, categories/capacity/waitlist, individual admissions and financial cancellation | `EventsWorkspace`, `EventExtensions`; staff/rotas/assets/CRM/finance/notifications | stage7-scheduling, final-demo-workflows, original-spec; COMPLETE demo |
| Appointments | Day/week diary, staff/resource conflicts, reschedule/cancel/outcome/follow-up | `AppointmentsWorkspace`; staff/CRM/resources/tasks | stage7-scheduling; COMPLETE demo |
| Service/resource bookings | Separate calendar/type/status/customer/resource booking, concurrent capacity/price, optional eligible employee, invoice/cancel/complete/history | `ResourceBookings`, reconciliation rules; registered resources/assets/CRM/finance | original-spec rules/browser/mobile smoke; COMPLETE demo |
| Document library | Local file/metadata/create/edit/category/folder/access/owner, versions/review, recent access, preview/download and record links | `DocumentWorkspace`, `RecordFiles`; staff/assets/projects/jobs/customers/events/inspections | connected-business, stage7-scheduling, original-spec; COMPLETE demo, browser-local files |
| Historical collections | Accession/reference/provenance/date/condition/location/digital reference, search/filter/CSV/print | `CollectionWorkspace`; distinct from active documents | final-demo-workflows; COMPLETE demo |
| Business archives | Review eligible source records, archive/restore without deletion, retained IDs/history, selected CSV/print | `ArchivesWorkspace`; original operational records | remaining-workflows; COMPLETE demo |
| Forms/surveys | Create/build/reorder/sections/conditions/required/type options, preview/publish/respond/history/filter/CSV and supported defect trigger | `FormsWorkspace`; versioned linked submissions | remaining-workflows; COMPLETE demo |
| Fundraising | Targets/campaigns/donors/events/contributions/sources/reconciliation/CSV | `FundraisingWorkspace`; independent campaign IDs from retained source aliases | remaining-workflows, campaign-identity; COMPLETE demo, no payment/tax submission |
| Visitor analysis | Record counts/categories, period comparisons/trends and separate event admissions | `VisitorWorkspace`; bookings/events | remaining-workflows; COMPLETE demo |
| Daily operations | Opening/closing templates/checks/responsibility/timestamps/review/history, staffing/work/booking queues and handovers | `DailyOperations`; staff/attendance/rotas/tasks/maintenance | stage3-operations, remaining-workflows; COMPLETE demo |
| Reporting | Source/measure/fields/filter/group/calculation/comparison, saved reports, drill-down/CSV/SpreadsheetML/print | `ReportingWorkspace`, reporting rules; permitted current records | stage5-workspaces, reporting/unit rules; COMPLETE demo, unattended delivery unavailable |
| Notifications | Read/unread/priority/category/dismiss/preferences and correct source links, including eligibility-derived event staffing | `NotificationInbox`, notification rules; work/people/stock/finance/bookings/approvals/platform updates | stage5-workspaces, final-demo-workflows, original-spec; COMPLETE demo, no external messages |
| Staff communications | Targeted drafts/publish/acknowledge/archive and handover links; canonical owner bulletins | `CommunicationsWorkspace`; staff/departments/operations/owner | stage5-workspaces, owner-stage6, original-spec; COMPLETE demo |
| Approvals | Pending/assigned/history, independent decisions/comments/changes, source status/availability/hour updates | `AdministrationPages.ApprovalsPage`, administration rules; leave/time/work/inspection/document/finance | administration-finish, final-demo-workflows; COMPLETE demo |
| Automations | Templates/trigger/condition/action, enable/disable, session execution/errors/deduplication | administration rules; inspection/maintenance/tasks | administration-finish; COMPLETE supported session workflows, no closed-browser execution |
| Company settings | Profile/operations/departments/locations, modules/dependencies, roles/person scopes, labels/branding/dashboard/notification/workflow preferences | `CompanyConfiguration`, shared role/config state | administration-finish, final-demo-workflows; COMPLETE demo |
| Search/activity | Permitted indexed results/commands/saved searches; attributed change timeline/filter/source navigation | command bar/search index/activity page | stage5-workspaces, final-demo-workflows; COMPLETE demo, no immutable audit claim |

## Owner pages

| Page / purpose | Working actions and relationships | Coverage / status |
|---|---|---|
| Business overview | Connected company/support/sales/onboarding/package/module/activity/health widgets, quick actions, layout and personal alert preferences | owner-stage6, final-demo-workflows; COMPLETE demo |
| Companies/company profiles | Directory/search/status, contact edit, profile tabs, module dependencies/admins/subscription/branding/support/activity and workspace preview | workflows, owner-stage6; COMPLETE demo |
| Onboarding/templates | Validated review/back/creation, industry/module/package/branding/roles/locations, saved configuration and duplicate-safe lead conversion | onboarding, owner-stage6; COMPLETE demo |
| Module catalogue | Purpose/capabilities/dependencies/package/industry metadata, honest demo status, search/category, company enable/disable | workflows, owner-stage6; COMPLETE demo |
| Packages/pricing/subscriptions | Standard/bespoke package editing, allowances/add-ons, negotiated/frequency/period amounts, illustrative payments/statuses and company links | owner-stage6, remaining-workflows; COMPLETE demo, not real billing |
| Sales pipeline | Stages/details/ownership/contact/activity/proposal/follow-up, won/lost and onboarding link | customer-overhaul, owner-stage6; COMPLETE demo |
| Support | Customer/priority/assignee/module/status/date inbox, conversation/internal notes/responses, resolution/reopen and recorded timing metrics | workflows, owner-stage6; COMPLETE demo, no emailed responses |
| Feature requests/roadmap | Company/ticket links, interest/votes/demand/priority, shared statuses, release dates/notes/announcements | owner-stage6; COMPLETE demo |
| Customer branding | Isolated company logo/colours/sidebar/labels/terminology/welcome/dashboard/document preview/apply/reset | owner-stage6; COMPLETE demo |
| Customer announcements | Draft/preview/target/publish/archive, canonical updates visible without optional modules and immediately withdrawn on archive | owner-stage6, original-spec; COMPLETE demo, no external delivery |
| Client insights | Company/module/user/record/package/status counts from actual fictional state | customer-overhaul, owner-stage6; COMPLETE demo, not production telemetry |
| Infrastructure/monitoring/backups | Verified configured API/storage diagnostics, explicit disconnected/unsupported host/backup state; no fake backup/restore controls | backend-states, backend integration; COMPLETE boundary/diagnostic interface; real operations UNAVAILABLE |
| Owner activity | Attributed company/configuration/commercial/service changes and company/action/module/date filters | owner-stage6, workflows; COMPLETE demo |
| Owner accounts/permissions | Fictional records/roles/suspension/reactivation/custom template-derived page matrix, guarded writes and owner escape/reset | owner-stage6, final-demo-workflows; COMPLETE demo, not authentication |
| Business settings | Business details/branding, package/trial/onboarding defaults/templates, support priorities/categories/targets and owner alerts | owner-stage6, final-demo-workflows; COMPLETE demo |

## Redundant destinations and preservation

Legacy Staff/Volunteers, Tasks/Projects, Assets, Maintenance/Work orders/Job records, schedule/attendance, event, collection/report and fundraising aliases are consolidated when equivalent destinations are enabled. Permitted original records and stable identities remain available; campaign source records stay independent. These aliases are **REDUNDANT navigation entries**, not deleted business data. Events, appointments, non-event resource bookings, active documents, historical collections and business archives retain distinct workflows.

## Defects corrected during reconciliation

- Read profiles now retain permitted archived records without returning them to active operational lists; project progress retains archived completed work.
- Recorded available dates have independent review and never consume annual leave. Source dates/versions/answers now invalidate stale approval decisions.
- Owner support assignment uses real fictional account IDs, including the seeded platform/support/implementation accounts.
- New booking forms incorrectly matched unrelated invoices through an undefined ID; the regression now covers pre-save validation.
- Source assignment labels and Working as selection could follow stale names rather than staff IDs.
- Cancelled unavailable-date records continued blocking assignments.
- Manual recurring-task generation could duplicate an existing occurrence.
- Parent completion could occur without separately tracked subtasks.
- An approved document's new version could retain old review state.
- Announcements could silently miss organisations without the optional communications module.

## Mobile, accessibility, performance and release

New controls reuse labelled native inputs, visible validation, dialog focus/Escape handling and the dark drawer. The phone/tablet smoke now completes a resource booking as well as operational navigation/profile/dialog checks. Cards and bounded calendars avoid a new wide desktop table. No dependencies or infrastructure were added; specialist pages remain lazy-loaded. No screenshot sweep or full three-device functional matrix is required for routine CI.

Release gate: dependency installation, lint, unit/build, focused changed-workflow checks, desktop regression and short phone/tablet smoke plus the existing isolated PostgreSQL job. Final PR/merge/Pages/live results belong in [DEMO-ACCEPTANCE-CHECKLIST.md](DEMO-ACCEPTANCE-CHECKLIST.md) and the release PR, never inferred from a previous revision.
