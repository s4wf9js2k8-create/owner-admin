# Stage 3 delivery: daily operations and inspections

This release implements the first two modules in the requested priority order. Fleet, advanced inventory and CRM remain the next batch; their existing functionality is preserved. It does not claim all of Stage 3 is complete.

## Daily operations

The operations desk aggregates tenant-scoped attendance, rota shifts, dated events/appointments and outstanding important work. Select an operational date to review opening and closing checks. New checks select staff by stable ID. Completing a check records the selected fictional operator and timestamp; changing completion invalidates prior approval. Supervisors can approve completed checks. Handover entries link to existing operational records, retain staff attribution and support per-person acknowledgement. Existing checkbox and per-check handover workflows remain usable. Earlier fixtures without an operational date are treated as current-day legacy checks; newly created checks are explicitly dated.

## Inspections

Managers build reusable inspection templates in their existing enabled inspection module. Questions have sections, pass/fail, multiple choice, number or notes response types, required flags and optional mandatory evidence. Number questions can specify an acceptable measurement range. Starting an inspection copies the template questions into the record, preserving that inspection's form if a later template differs. The asset selector uses asset IDs; the optional location selector uses locations already recorded in the fictional company. Inspectors must meet the shared eligibility rules both at assignment and submission.

Drafts are saved to the shared fictional adapter. Submission validates question responses and required evidence, calculates the outcome, and requests review. Supervisors approve results or return the inspection for correction. Failed inspections can create a corrective work order through the existing linked-maintenance workflow, with duplicate open corrective jobs prevented. Asset inspection history reads the shared inspection record directly.

## Evidence and demonstration limits

PNG/JPEG/PDF evidence up to 1 MB per question is read into browser memory using FileReader. Images can be previewed inline; PDFs are retained as local evidence data without an embedded viewer. Nothing is uploaded to a server; refresh/reset discards files and records. These workflows do not establish regulatory compliance, production authorization or durable storage. The standalone self-hosted backend is unchanged, as are EVLT and hosting configuration.

The legacy free-form inspection workflow remains available for existing demonstrations. Template inspections have validated question submission and review; legacy result changes must not be presented as the same assurance level.
