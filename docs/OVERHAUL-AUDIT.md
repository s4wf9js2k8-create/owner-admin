# Channel Systems overhaul audit — 12 November 2026

This is an implementation inventory and gap register, not a claim that the complete requested overhaul has shipped. The existing repository already contains specialised domain components. The older MODULES.md description of all pages as generic is obsolete. EVLT was not accessed or modified. The Node/PostgreSQL/Docker foundation is unchanged.

## Customer surfaces

| Surface | Existing implementation | Remaining acceptance gaps |
| --- | --- | --- |
| Dashboard | Widget visibility/order and operational record summaries | Resize, industry-specific presets, comprehensive quick actions |
| Tasks/projects | My Work, board/list/calendar, project grouping, checklists, comments, approval gates | Dependencies, complete resource/budget planning, evidence |
| People | Searchable cards, editable profiles, linked work and qualifications | Full profile tabs, document/history/permissions details |
| Attendance | Clock in/out, duplicate-open check, corrections, approvals | Location, correction workflow, validation of every edit |
| Timesheets | **Updated:** actual weekly daily totals, week navigation, overnight splitting, recorded break deduction, overtime illustration, CSV | Allocation, configurable overtime policy, correction approval workflow |
| Rotas | Weekly day planner, shifts, overlap/leave warnings, swap request | Staffing requirements, templates, recurrence, validated reassignment |
| Leave | Request, approve/reject, overlap warnings; **updated:** cancellation in decision selector | Balances, full leave calendar, self-service cancellation authority |
| Training | **Updated:** staff-by-qualification competency matrix, missing/valid/expiring/expired/approval states and linked certificate review | Evidence files, training sessions, assessment workflows |
| Assets | Register cards, custodians, condition/location, linked work and inspection history | QR/mobile deep links, purchasing/warranty details |
| Maintenance | Three-state work board, engineer selection, checklists, labour, parts, supervisor review | Richer workflow states, completion evidence, enforced transitions, recurring templates |
| Inspections | Inspection list/detail, checks, outcome, findings, linked corrective work orders | Template builder, per-question outcomes/evidence, completion validation |
| Inventory | Stock register, receive/issue/allocate, movement history, negative stock prevention | Returns/transfers, suppliers/POs, atomic allocation |
| Safety | Risk lanes, incident/hazard entry, corrective actions, qualified owner | Likelihood/severity assessments, review dates, linked corrective workflow |
| Fleet | Vehicle cards, mileage, daily checks, defects, linked maintenance | Driver qualifications in fixtures, insurance, complete service history |
| CRM | Customer profiles, contacts, notes/calls/follow-ups, linked quotes | Complete appointment/job/document tabs and identity migration |
| Quotes/invoices | Customer selector, line items, totals, print preview | Discounts, full VAT rules, document transition validation |
| Events | Event cards, capacity, confirmed/waitlisted bookings, check-in/cancellation | Staff/resource selection, event calendar, ticket categories |
| Appointments | Agenda and staff conflict checking | Resource registry, resource clashes, day/week views |
| Documents | Categorised library, version metadata, owners/review | Real local file handling, record linking, download/preview |
| Archives | Separate collection catalogue | Historical dates, provenance, digital references |
| Forms | Builder, field reorder, previews, responses | Conditional sections and validated workflow triggers |
| Donations | Campaigns and manual fictional donations | Stable donor/event links, sources and reconciliation |
| Visitors | Record-based bar chart/count entry | Category/date aggregation, weekly/monthly comparisons |
| Daily operations | Opening checks and handover notes | Daily scoping, closing templates, operational rollup |
| Reports | Record summaries, filters/CSV/print | Domain measures, custom fields and robust date filters |
| Notifications | Derived record alerts and read state | Preferences by category, complete activity generation |
| Search | Typed record results, navigation, create commands | Saved searches, full identity/permission coverage |
| Roles/settings | Simulated permissions, module/team visibility | Record ownership/approval scopes; client UI is not security |

## Owner surfaces

Organisation directory/profile, module dependencies, illustrative packages, fictional support conversations/status, onboarding simulation, accent preview, lead pipeline, feature backlog, announcements, activity logs and explicit disconnected server diagnostics already exist. Full customer configuration history, guided onboarding into the public workspace, lead conversion, linked feature votes/support, branding beyond accent and measured support response metrics remain incomplete. No paid service, real billing, external messaging or verified host monitoring is introduced.

## Foundation changes in this branch

Eligibility now requires recorded active employment, rejects missing expiry unless explicitly non-expiring, respects certificate valid-from dates, offers department/explicit qualification criteria, checks stable engineer/inspector/driver/owner IDs for overlaps and rejects incomplete time windows. Generic engineering training no longer grants inspection competency. Existing fixture staff explicitly record active employment. Legacy name links remain supported; migration to IDs everywhere is still required. These are fictional workflow correctness checks, not production security.

Pure weekly time calculations live in timeReporting.js and have behavioural tests for overnight boundaries, breaks, invalid/open sessions and CSV quoting. Existing browser tests remain the regression baseline; the added matrix scenario checks that expiry changes remove an engineer from assignment options.

## Release gate

The whole-application overhaul is **not complete**. Do not label all pages finished or production-ready. Resolve each gap above and execute the requested cross-module scenarios before claiming complete acceptance. This branch is a reviewable foundation increment.
