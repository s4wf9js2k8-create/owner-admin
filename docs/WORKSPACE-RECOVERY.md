# Workspace recovery — 21 November 2026

The execution workspace was replaced between development turns. The earlier unpublished `overhaul/remaining-workflows` checkout, source changes and local test logs are absent. GitHub main remained at merged PR #30 (`0aab510`). The larger unpublished continuation was never deployed and must not be described as released.

This recovery reconstructs the inventory workspace and document library and its linked maintenance transactions from the implementation recorded in the conversation. It adds supplier records, purchase orders, partial deliveries, stock returns, location transfers, adjustments with reasons and movement history. Stock quantities, work-order parts and purchase-order delivery balances publish together through the existing fictional adapter. Invalid negative stock, over-returns and excess deliveries are rejected before publication. Existing maintenance allocations use the same transaction. Reports exclude supplier and purchase-order configuration rows.

New automated cases cover atomic allocations/returns, transfers, insufficient stock, partial/excess deliveries and browser workflows on desktop/iPhone/iPad. Final executed results and deployment evidence are recorded in the pull request.

The recovered document library includes local files up to 2 MB, supported image previews, downloads respecting Export permission, metadata editing, version history and stable record links exposed from assets and staff profiles. No server uploads occur.

Fleet, CRM, appointments, archives, expanded forms, fundraising, training-session and owner-console changes from the lost checkout remain unrecovered. They are not included in this recovery release. The existing PAGE-CHECKLIST.md remains authoritative for those gaps. No real customer data, paid infrastructure, EVLT access or Vercel deployment is involved. All demo changes remain in browser memory and reset on refresh.
