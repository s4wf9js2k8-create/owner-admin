# Current original-spec completion report

The latest source reconciliation starts from merged PR #38 (`cf97d69`). [ORIGINAL-SPEC-RECONCILIATION.md](ORIGINAL-SPEC-RECONCILIATION.md) maps all 50 original sections and identifies the specific gaps found after that release. [FULL-APPLICATION-AUDIT.md](FULL-APPLICATION-AUDIT.md) is the current per-page inventory; it supersedes the earlier broad completion wording.

New working controls cover separately assigned subtasks/parent gates, editable project briefs/managers/deadlines and activity, stable staff/contact/assignment identity, explicit approved availability, attendance expectations, vehicle/work assignment policies, event staffing alerts, non-event resource/service capacity bookings and invoicing, recently accessed/reviewed document versions, canonical owner announcements, active owner-account support assignment, refund history and related safety training. Historical dossiers and project progress retain archived records while active lists remain filtered.

Business logic is separated into pure `reconciliation/rules.js` helpers and specialist React controls under `src/reconciliation/`. The existing fictional adapter validates and publishes connected writes atomically. No dependency, paid service, infrastructure or production backend change is introduced. EVLT is untouched.

Local acceptance: npm ci, lint, **158 unit tests**, build, six new desktop workflow scenarios, the expanded archive/profile scenario and focused phone/tablet booking smoke have passed. The six include the uninterrupted new-employee → qualification → availability approval → rota → attendance/timesheet approval → reporting workflow. Final desktop regression, PostgreSQL CI, PR/merge/Pages/live evidence is recorded in the release PR. No previous build's result substitutes for this one. Routine checks remain desktop plus short phone/tablet smoke; no broad screenshot sweep is repeated.

Production security, durable storage, external messaging/payments, unattended jobs and real host/backup operations remain explicitly unavailable as required by the public-demo specification.

---

## Historical PR #38 report

# Final public-demo workflow completion

Baseline: main `2044e05` after PR #37. Development branch: `completion/final-demo-workflows`.

This release closes the remaining browser-session workflow items in the previous checklist. It preserves existing specialist pages, fictional organisation identities, reset behaviour and the Node/PostgreSQL/Docker preparation. It adds no dependencies or infrastructure.

## Changed workflows

- Qualified rota coverage measures the lowest concurrent number of eligible people across a required competency/location/time window. Shift exchanges retain both assignments until independent review, revalidate both together and prevent stale/repeated decisions.
- Individual staff restrictions reduce role grants; source-page approvals use the same central self-review rules. Attendance correction requests retain original hours until approved, including location and overlap/break validation.
- Recurring inspections preserve template-question snapshots, validate every generated inspector/date and deduplicate occurrences. These are bounded user-triggered session operations.
- Catalogue products/services feed quotation lines as price snapshots. Company VAT/terms defaults remain illustrative. Corrections and refunds preserve payments and credit history, respect uncredited/refundable limits, and move no money.
- Ticket categories share event capacity. Individual attendee IDs allow separate check-in/undo and attendance totals. Cancellation restores capacity and corrects linked draft/issued invoices; any refund remains an explicit fictional record.
- Historical collection entries have provenance, historical dates, physical locations, conservation condition and digital references, distinct from documents and operational-record archiving.
- Reports add configured-threshold overtime and linked project progress/budget/cost measures; widget-specific filters and an indexed permitted-record search update from the same session state.
- Owner accounts/custom roles support page-specific viewing/writing restrictions. Business defaults feed support and onboarding, saved templates reuse company configuration, owner alerts have session preferences, and sales ownership/roadmap announcement IDs connect the owner pages.
- Equivalent legacy modules share navigation destinations without deleting their data. Fundraising retains independent source campaign IDs and a source filter.

## Architecture

`completion/finalRules.js` contains pure validation and atomic multi-record commands. `completion/rules.js` delegates to it through the existing fictional adapter. Specialist controls remain separate components. Search indexing, financial calculations, reporting and owner policy helpers stay outside presentation components.

No production backend/security/payment/file-delivery claim is introduced. PAGE-CHECKLIST.md records current page scope and explicit production boundaries.

## Proportionate verification policy

Routine `npm run test:e2e` runs functional regression at desktop size. `npm run test:e2e:mobile` runs one focused touch/navigation/dialog/layout scenario at phone and tablet sizes. `npm run test:e2e:all` retains the optional full three-viewport matrix. CI uses desktop regression plus the short mobile smoke, retaining its isolated PostgreSQL job. No repeated page/screenshot sweeps or large live-browser matrix is required.

Local and CI results, PR/merge/deployment identifiers and the final live verification will be recorded in the release PR after execution. No earlier release's passing result is substituted for this release.

## Local acceptance

`npm ci`, lint, **147 unit tests** and the build passed. All **eight new desktop workflow scenarios** passed, alongside the corrected legacy campaign-navigation and branding checks. The short phone/tablet smoke passed at 390px and 820px. Final full desktop regression and isolated PostgreSQL integration results are reported by the PR checks; deployment and live verification are reported separately.
