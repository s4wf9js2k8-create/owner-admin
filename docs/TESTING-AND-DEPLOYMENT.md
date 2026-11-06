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
