# Offline company onboarding and package controls — issue #10

Use **Company onboarding simulation** beside Reset fictional demo. This is a separate, disposable fictional workflow; return to the existing demonstration at any time. It uses the existing offline service, not the unrestricted dashboard fixture adapter. Leaving the simulation or reloading discards its companies, requests and invitations. No real login, invitation delivery, billing, Firebase or persistence occurs.

## Roles and workflow

Owner Admin means the **Channel Systems operator**, never the owner of a client business. The simulated operator can view all fictional company profiles, create companies, assign packages, set brand colour, approve reporting overrides, suspend/reactivate companies and issue a mock organisation-admin invitation to the synthetic guest. Platform rights still do not grant tenant record access. Client admins see only their active memberships, subscribed package, available modules, brand and their company's requests. Viewers cannot submit requests or manage companies.

The explicit identity selector is a testing convenience that can impersonate fixture users. It is not authentication or a production security boundary. Every visitor still controls their browser. Never put real company or personal information into this workflow.

To try onboarding: create a fictional company as operator; issue its guest admin invitation; select Invited fictional admin and accept. The recipient gains only that company's organisation-admin membership. Wrong recipients, replay, expiry, suspension and loss of issuer authority are handled by the offline invitation service. There is one reusable synthetic guest fixture, so after joining a company it cannot receive a second invitation to that same company. No actual message is sent.

## Packages and entitlements

Essential defaults to tasks; Professional and Enterprise default to tasks and reporting. These are the offline service's two supported domain modules, distinct from the legacy demo's richer illustrative module catalogue and legacy Pilot/Starter plans. Existing legacy plans, screens and backend contracts remain compatible. Future integration must deliberately map this catalogue; it must not equate similarly named packages automatically.

Templates have configurable module defaults and nullable draft monthly GBP placeholders. Unset means not quoted. There is no price promise, payment, invoice, proration or billing cycle implementation. Editing a template is versioned and affects future assignments only. Existing tenants retain their approved module snapshot until an explicit package/override operation or approval; no template edit silently enables features across companies.

Company overrides add explicitly approved modules to package defaults. The UI always includes tasks and allows an approved reporting override. Removing an override does not remove reporting if it is included by the package. A package downgrade blocks retained records in disabled modules at the offline service boundary; records are not deleted. Reactivation restores the previously configured package/modules.

Company admins can request a package change or a standalone reporting feature. Requests are tenant-bound, versioned and pending; they do not activate anything. One pending request per company avoids overlapping decisions. The operator sees an approval queue and approves/rejects explicitly. Approval requires both the request's current version and the company's current version. Package approval uses the current template plus approved overrides. Feature approval adds the reporting override and preserves the subscribed package. Rejection leaves entitlements unchanged. Stale, replayed or suspended-company approvals fail without partial changes. Requester-supplied org/role/entitlement fields are rejected.

## Added service ports

All ports return detached Promise results and use the existing BackendError codes. They extend `createOfflineBackend` without changing existing record, Firebase-preparation or public fictional adapter signatures.

- `packages.list()` for active sessions; `packages.update(name, patch, version)` for operator only. Patch allows modules and draft monthly value.
- `companies.list/create/update/inviteAdmin` for operator only. Updates validate name, colour, package, status, additive overrides and expected version. Provisioning creates a tenant without automatic user membership; admin setup occurs through a mock invitation.
- `workspace.get/requests/request(orgId, values)` for current tenant members; submitting requires organisation-admin permission. Request values contain exactly one supported package or feature.
- `approvals.list/decide(requestId, decision, requestVersion, companyVersion)` for operator only.

Current authoritative account/organisation/member status and role are checked on each tenant operation. State, version change and success audit are generated in one synchronous in-process command. Denied operations also generate redacted internal audit. This is not a distributed transaction or durable audit. The legacy low-level operator `configure` remains for existing offline contract tests; production composition must use reviewed business commands rather than expose arbitrary configuration endpoints.

## Verification and remaining work

Unit tests exercise owner-only management, forged roles/fields, tenant isolation, viewer denial, package/feature requests, approval/rejection, disabled records after downgrade, stale company/request/template versions, independent branding, template snapshot semantics, suspension/reactivation and invitation isolation. Browser tests cover request/approval and create/invite/suspend/reactivate on desktop, phone and tablet, alongside all prior workflows and accessibility checks.

Before production: unify module/plan catalogues; approve commercial prices and lifecycle rules; add real identity, verified invitation recipients and protected UI projections; implement storage transactions/idempotent provisioning, durable audit, account lifecycle, pagination/rate limits, export/recovery and independent security review. Firebase integration remains preparation only. No Rules, live infrastructure, deployment workflow, credentials or EVLT resource is changed by this issue.
