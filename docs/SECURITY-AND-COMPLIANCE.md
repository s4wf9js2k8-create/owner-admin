# Security and UK privacy checklist — planning document

**Current demo is public and has no real security. Do not enter real data.**

## Architecture
- Separate owner application and Firebase project from EVLT.
- Owner UI calls trusted server endpoints; all sensitive actions recheck Firebase identity and owner privileges server-side.
- Organisation users authenticate separately and can only access their own tenant's resources.
- Server-created tenant membership and module entitlements; client cannot grant itself access.
- Firebase rules default-deny, test read/write/update/delete against unauthorised users, suspended users and cross-tenant IDs.
- Use Firebase emulator automated rules tests and staged environments before production.
- No service-account credentials or secrets in GitHub Pages, repository or browser bundle.

## Security operations
- Strong passwords/MFA, session expiry, owner account recovery.
- Least-privilege access, audited changes, rate limiting, monitoring and alerting.
- Encrypt in transit and at rest using provider controls; documented backups and restore tests.
- Dependency scanning, security patches, tested releases and rollback.
- Explicit suspend versus delete semantics; retention and customer export.
- Data incident response contact and breach assessment workflow.

## UK GDPR
Determine whether each customer is controller and your business processor for each processing purpose; roles depend on actual decisions and processing.
Before onboarding: privacy notices, Article 28 processor agreement where applicable, subprocessors, retention policy, data subject request handling, international transfer review, and DPIA screening.
The ICO says processors and controllers both have obligations; processor contracts need specified terms.
https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/personal-information-what-is-it/who-does-the-uk-gdpr-apply-to/
https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/contracts-and-liabilities-between-controllers-and-processors-multi/

## External standards
NCSC Cloud Security Principles include separation between customers, secure identity, secure service administration and audit.
https://www.ncsc.gov.uk/collection/cloud/the-cloud-security-principles

## Security acceptance tests
1. Unauthenticated visitor gets zero customer data.
2. Tenant A cannot list/read/write Tenant B even with guessed IDs.
3. Ordinary admin cannot elevate own role or grant paid modules.
4. Suspended organisation loses access promptly.
5. Owner-only actions cannot be performed via direct API call by tenant admins.
6. Logs record changes without leaking secrets.
7. Backups restore to a test environment.
8. Public source and deployed bundle contain no credentials.

This is a development checklist, not a certification or legal opinion.
