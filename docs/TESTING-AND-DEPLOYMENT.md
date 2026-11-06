# Testing and deployment

## Checks

`npm ci` uses committed dependency versions. `npm run lint` checks JavaScript/JSX, hook placement, keys and unused code. `npm test` exercises profile validation, dependencies, preset consistency, record filtering and immutable identity fields. `npm run build` produces `dist` for GitHub Pages. `npm run test:e2e` runs Chromium scenarios at desktop, iPhone and iPad viewport sizes; it starts a local Vite server on 4173.

Browser checks cover organisation creation/edit/archive confirmation/cancel, filters, reset on refresh, customer records across all four sectors, organisation scoping, dependency changes, package confirmation, support history, keyboard menu/dialog behaviour, page errors and horizontal document overflow. Tables may scroll inside their own containers. These checks do not test Safari, real accounts, backend security or billing.

`CHROMIUM_PATH` can select a local executable; otherwise `/usr/bin/chromium` is used when available, falling back to Playwright's installed Chromium. Install with `npx playwright install --with-deps chromium` in CI. Screenshots are generated under ignored `test-results`.

## Review and deployment

Pull requests run lint, unit tests, build and browser tests in `.github/workflows/ci.yml`. The existing Pages workflow remains limited to `main` pushes or manual dispatch; this branch must not be deployed before review. Its build now uses `npm ci`, lint and unit tests. Browser tests run in the PR check. Branch protection and required CI must be configured in repository settings before relying on these checks to block merges; workflow files alone do not enforce review.

The Vite base remains `/owner-admin/`; `public/customer-concepts.html` preserves the old URL and points to the shared interactive application. No production deployment or main-branch merge is part of development. After an approved merge, verify Pages assets, customer previews and refresh behaviour. Roll back through a reviewed revert of the release commit. No database migrations exist.

## Future release tests

Before real data: API/schema tests, authenticated permission matrices, anonymous and cross-tenant negative requests, revoked/suspended-session tests, entitlement bypass tests, concurrent mutations, idempotent provisioning, audit integrity, backup restore drills and incident exercises. Add WebKit and real iPhone/iPad testing plus independent accessibility and security review.

## Development validation record

On 6 November 2026: lint passed; 5 model tests passed; production build passed; all 12 Chromium browser scenarios passed. After the tablet summary-grid adjustment, all 3 responsive keyboard/overflow scenarios passed again. `npm audit --audit-level=moderate` reported zero vulnerabilities at that time. Screenshots were inspected for the overview layout. These are local results, not proof that GitHub-hosted CI or a production deployment has run successfully.

## Backend preparation coverage

`npm test` discovers all `tests/*.test.js`, including the fictional adapter contract suite. Browser tests inject alternate adapters at the entry module to exercise loading, load retry, mutation failure and empty states without shipping fault controls in the app. The reset and drawer tests run at all three configured viewport sizes. No real accounts or Firebase calls are used. The future security suite is specified in [THREAT-MODEL.md](THREAT-MODEL.md); it has not been implemented or passed.

CI uses GitHub’s Ubuntu runner preinstalled Chrome through `CHROMIUM_PATH=/usr/bin/google-chrome`, running the same Playwright Chromium projects without downloading a second browser or reinstalling system packages. Local runs continue to use `/usr/bin/chromium` when present or Playwright-managed Chromium otherwise.

## Offline tenant policy (issue #4)

Run `npm run test:policy` (or `node --test tests/tenant-policy.test.js`) with Node.js 22+; no npm dependencies, network access, Firebase SDK/CLI, real project or emulator is required. The existing `npm test` glob includes its 14 named tests in CI, bringing unit/model/policy coverage to 30 tests. The policy uses only synthetic A/B fixtures outside `src/`; it establishes model invariants, not Firebase Rules/Auth/IAM enforcement. See [the proof-of-concept README](../proof-of-concepts/tenant-authorization/README.md) and [the decision record](TENANCY-DECISION.md) for exact limits and future checks.

## Issue #6 offline foundation

The disposable [offline service](OFFLINE-BACKEND.md) is covered by `tests/offline.test.js` (automatically included in `npm test`) and `tests/browser/offline.spec.js` (all three Chromium viewport projects). It is never mounted in the public demonstration or included in its production import graph. Branch CI validates it without deploying; the existing Pages workflow still deploys only main or explicit workflow dispatch. No workflow is changed by this implementation.

Verified locally on 2026-11-06 for issue #6: lint passed; all 37 unit/model/policy/service tests passed; production build passed; all 33 Chromium browser cases passed across desktop, phone and tablet; `git diff --check` passed. These results cover the offline model and fictional demo, not live Firebase/PostgreSQL or production authentication.

## Issue #8 Firebase preparation

Verified locally on 2026-11-06: lint passed, all 45 unit/model/service/policy/preparation tests passed, production build passed, all 36 Chromium browser cases passed, and `git diff --check` passed. The production asset hashes match the pre-change demo build. The new Rules guard is static only; no Firebase SDK, official Rules compiler/emulator or deployed service was used. See [Firebase preparation](FIREBASE-PREPARATION.md) for the future validation gates. No Firebase deployment workflow/configuration was added.
