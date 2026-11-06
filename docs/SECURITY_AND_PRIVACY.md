# Security and privacy implementation checklist

**Warning:** This repository currently contains a public-facing demonstration. Its Owner Admin title does not make it private or authenticated. Do not use it to store actual client or volunteer details.

## Threat model
1. A visitor to the public demo attempts to access private organisations.
2. An authenticated customer attempts to read or modify another customer's records.
3. A former employee or volunteer retains access after leaving.
4. A leaked token or compromised browser session exposes data.
5. Accidental deletion or faulty migration destroys records.
6. An owner-level account is compromised.

## Minimum implementation controls
- Put owner-only administration behind authenticated server-side authorisation and MFA. Do not rely on a hidden URL or a client-side role flag.
- Use least-privilege permissions for owner, organisation admin, manager and staff/volunteer roles.
- Validate `organisationId` and record ownership for **every** read and write on the server and in database rules. Never trust an organisation ID provided by the browser.
- Reject access by suspended or revoked accounts immediately; implement tested account deletion/revocation flows.
- Keep secrets in provider-managed environment secrets, not frontend bundles or Git history. Firebase web configuration is not itself a secret; security rules and auth remain essential.
- Separate development, staging and production databases. Keep EVLT data isolated.
- Rate-limit sensitive operations; log failed access attempts without exposing credentials.
- Maintain immutable server-generated audit events for changes to permissions, users, billing and sensitive records.
- Use HTTPS, security headers, dependency updates and appropriate content security policy.
- Define data retention and deletion periods, encrypted backup schedules and restore testing.
- Obtain written agreements for customer processing and publish a suitable privacy notice before onboarding.
- Follow UK ICO guidance on controller/processor responsibilities, UK GDPR, personal-data breaches and the data protection fee where applicable.

## Required tests
- Anonymous user cannot read or change any real records.
- Organisation A cannot query, enumerate or modify Organisation B's records.
- Suspended user cannot continue with an old token/session.
- Non-admin cannot grant themselves owner/admin roles.
- Malformed requests fail safely.
- Backups can restore a deleted sample dataset.
- All changes to user privileges appear in server audit logs.

## Public demo policy
Only fictional data. Do not add email addresses, passwords, payment details, API keys or actual customer/volunteer records. Changes to the owner console are temporary and disappear on refresh. Module toggles are illustrative, not security enforcement.

## Important deployment point
GitHub Pages is public hosting and does not provide a private backend. Making a repository private is not a substitute for protecting a deployed site. Before using the console for real owner functions, move it behind a secured deployment and implement authentication and backend authorisation.
