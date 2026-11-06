# Offline synthetic tenant authorization model

This is a **pure policy proof of concept**, not Firebase Rules, a Firebase adapter or production security. It is not imported by the public demo. It uses invented tenant A/B identities and JavaScript Maps; no real project identifiers, accounts, secrets, SDK, emulator download or network client exists here.

Run with Node.js 22+ after checkout, even without `npm ci`:

```sh
node --test tests/tenant-policy.test.js
# Equivalent package command:
npm run test:policy
```

The existing `npm test` glob also runs this suite in CI. Dependency installation and the separate browser suite may use the network; this policy command itself requires neither network nor installed packages. Do not run Firebase login/setup/deploy commands for this model.

`policy.js` takes two separate inputs:

- `trusted`: a hypothetical server's verified principal plus current accounts, organisations, memberships, entitlements and stored records. These are synthetic assumptions supplied by `fixtures.js`, **not** things verified by this code. A live browser must never supply this state.
- `request`: an untrusted action and org/module/record address, plus bounded list limit or validated write fields. Request roles, claimed actor IDs, wildcards, identity overrides and unknown operations default to deny.

The policy allows viewers to read/list, members to additionally create/update, and organisation admins to additionally delete, exclusively within active memberships and enabled modules. Unknown/platform roles have no implicit grant. Reads/updates/deletes check stored identity against the addressed path; creates cannot overwrite an existing ID. A list grant binds one organisation/module rather than returning arbitrary records to filter in a browser.

The test-only executor in `tests/tenant-policy.test.js` checks the grant before accessing an in-memory Map. Denied read/write cases assert a generic denial and no state changes. Positive cases prove both tenants still use their own records. Reusing the same synthetic principal after membership revocation or module disable demonstrates that decisions consult current state rather than a cached role label. The model intentionally assumes one synthetic identity realm; it does not test Identity Platform tenant-aware identities.

There are 14 named cases with multiple operation/tenant variants. They test policy logic only. The executor is not a production data layer: a live API must authenticate cryptographically, bind identity realm/tenant/UID, load trustworthy state, and atomically recheck authorization with its database mutation. A grant is a point-in-time decision, **not** a reusable capability; revoke-after-check races, stale caches, indexes, listeners and distributed conflicts remain untested.

Choose a pure policy model here because no real SDK/backend has been implemented and the issue permits pure policy tests. It exercises the intended authorization invariant without provisioning anything. A future Firebase implementation must translate policy into real Rules and trusted handler checks and prove them with emulator tests; it must not assume these JavaScript tests validate Firestore behavior. See [the decision, rollout gates and unverified items](../../docs/TENANCY-DECISION.md).
