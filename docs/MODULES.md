# Module specifications

All current modules use the same session-only record interface: title (100 characters), details (150), progress (Planned / In progress / Complete), organisation and module IDs. Search covers title and details. Records from disabled modules are retained but hidden from the customer workspace and report. Re-enabling restores them. Dependencies are automatically added; removing a prerequisite removes dependent access without deleting records.

| Module             | Prerequisite | Production extension required                                            |
| ------------------ | ------------ | ------------------------------------------------------------------------ |
| Volunteers         | None         | Consent-aware directory, availability, revocation                        |
| Attendance & Hours | Volunteers   | Clock-in/out, times, corrections, approval, duplicate-session prevention |
| Staff              | None         | Membership linkage, assignments                                          |
| Events             | None         | Dates, capacity, calendar, cancellation                                  |
| Maintenance        | None         | Defects, severity, ownership, completion evidence                        |
| Assets             | None         | Unique asset identifiers, locations, service history                     |
| Archives           | None         | Collection identifiers, provenance, attachment policy                    |
| Daily operations   | None         | Dated checklists and handover                                            |
| Projects           | None         | Milestones and responsible teams                                         |
| Donations          | None         | Manual ledger and reconciliation; never imply payments are collected     |
| Tasks              | None         | Assignments, due dates, reminders                                        |
| Work orders        | Assets       | Asset references, job transitions and supervisor sign-off                |
| Inspections        | Assets       | Inspection template, outcomes and approvals                              |
| Schedules          | None         | Recurrence, time zones, conflict handling                                |
| Job records        | None         | Work performed and completion evidence                                   |
| Visitor statistics | None         | Numeric counts, dates, validation, source                                |
| Reporting          | None         | Current demo record counts; production needs permission-filtered exports |

Module-specific configuration, custom fields, attachments, offline work and domain approvals are not implemented. Demo progress is deliberately generic and must not be represented as a valid financial or safety approval. Production catalogue entries should define their schema version, entitlement, dependencies, allowed actions, retention policy and migration strategy. Validate the catalogue is acyclic before accepting server-managed module definitions.
