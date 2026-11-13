# Stage 5 delivery: Reporting, Notifications and Staff Communications

This coherent batch implements the first three Stage 5 priorities. It does not claim that the entire stage, earlier Fleet/Inventory/CRM work or the remaining Stage 4 modules are complete.

## Reporting

The new reporting workspace selects one enabled, permitted source module and an appropriate measure: counts, completed attendance hours with breaks deducted, invoice face values/balances, current stock quantities, visitor counts, donations, recorded maintenance labour or issued parts. It supports immediate date/staff/department/location/status/category filters, grouping, totals/averages, equal-length prior-period comparison, field selection, chart-bucket drill-down and record links. Unavailable numeric values are excluded and counted rather than silently becoming zero. Invoice balances exclude drafts/cancellations; face values explicitly include selected statuses and must not be represented as collected revenue.

CSV matches the contributing rows and selected fields, including a selected chart bucket, and guards spreadsheet formula prefixes. Native XLSX is not implemented. Saved configurations are shared fictional records under the company's reporting module and survive module/company navigation within the session. Disabled or inaccessible source modules cannot be opened through a saved configuration. Printing uses browser print/PDF. Scheduled delivery is explicitly unavailable.

Dates select the first available session start, operational/visitor date, financial creation date, due date or creation date. Date filtering excludes undated records; unfiltered reports identify undated rows. These dates do not reconstruct historical inventory balances or event activity logs. Hours reports exclude open/invalid sessions; overtime/payroll policies and full project progress calculations remain unfinished.

## Notifications

A pure notification projection derives task assignments/deadlines/priority, overdue maintenance, failed inspections, leave decisions, qualification expiry/unknown validity, low stock, upcoming dated events/appointments, overdue fictional invoices, approval requests and published notices from permitted current records. Versioned notification identities make meaningful record changes appear unread again. This is a current-state inbox, not a durable event ledger; obsolete conditions disappear when records resolve. Displayed record dates are labelled as such, not invented alert timestamps.

Read/unread, mark-all-read, dismissal/restoration, category filters, priority view and reminder/category preferences are scoped to the selected fictional user and current company workspace. They reset on refresh and when that workspace is remounted; they are not persisted server preferences. Related-record actions pass stable IDs. No email, push or closed-browser processing occurs. The independent projection can support a future delivery adapter; no external delivery adapter is connected.

## Staff Communications

A new entitled module provides notices with company, current department or selected staff-ID audiences, priorities and linked records. Managers with Create and Approve actions can save/edit drafts, publish, archive and review acknowledgement timestamps. Staff readers see published notices matching their audience and can acknowledge once using an existing fictional staff profile. Unknown/legacy actor labels must select a staff profile before acknowledgement. Published notices also generate relevant in-app alerts; acknowledgement resolves those alerts. Record and module visibility remain fictional client behavior, not production authorization.

The handover view reads existing Daily Operations records and links to the original workflow. It does not create a duplicate chat or second handover store. Existing companies gain the communications module through their industry presets; custom companies can enable it through the catalogue with its staff-directory dependency. Existing module permissions continue to apply.

## Architecture and remaining work

Reporting calculations, notification generation and audience rules are separate pure modules with behavioral tests. The new views use the existing shared adapter; no new dependencies or backend services are introduced. Reporting, notification, communication and financial views load on demand to reduce the main JavaScript bundle.

Next priorities: six-role templates/permission scopes, central approvals, active-session automation with deduplication, company configuration, additional dashboard widgets/reset, header search and richer audit timelines. Those workflows are not implemented by this release. Notification approval alerts open the original module; they are not a central approval inbox. Prior-stage gaps remain in PAGE-CHECKLIST.md. EVLT, Vercel and paid infrastructure are untouched.
