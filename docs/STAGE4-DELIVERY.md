# Stage 4 delivery — financial documents

This batch completes the primary quotation → invoice → recorded settlement workflow. The rest of Stage 4 is explicitly unfinished. Earlier Fleet, Inventory and CRM gaps were confirmed in the repository and have not been relabelled complete.

## Implemented

- Separate searchable quotation and invoice views with status filters and sorting.
- Draft builders with generated unique references, CRM customer/contact selection, staff ID, dates, linked work, description, terms, private notes and editable line items.
- Quantity, unit price, percentage discount and VAT calculations use integer pennies and explicit line rounding. Invalid or incomplete lines cannot be silently omitted.
- Quote request/approval, sent, accepted/rejected and date-derived expired states. Draft editing and duplication. Approval uses the existing simulated approval permission.
- Accepted quote conversion copies itemised pricing and retains customer/quote IDs. Repeat conversion opens the existing invoice.
- Draft invoice issue/cancellation; issued invoices are not edited in place. Partial fictional payment records and basic credit notes reduce the outstanding balance. Zero balance is displayed as Paid; overdue status derives from the due date.
- Payment/credit records retain date, amount, reference/reason and method; overpayment and credits beyond the outstanding balance are rejected. Credits on already settled invoices/refunds are not supported.
- CRM profiles derive document, payment and credit activity from the shared financial records.
- A separate printable document window contains company branding, customer, itemisation, totals and terms, without workspace controls or internal notes. Browser print/save-as-PDF is supported.
- Existing financial samples now have connected customers and correctly calculated line items. The shared customer creation callback returns the created record, rather than discarding its ID; boolean success/failure behavior remains compatible through truthiness.

## Limits and unfinished work

All documents and payment records are fictional, browser-memory data and reset on refresh. Nothing is sent, billed or collected. The display is not tax-compliance software. VAT supports simple per-line percentage rates with penny rounding; exemptions, tax jurisdictions, invoice corrections involving refunds, tax registration validation and accounting integrations are not implemented. Catalogue management and inventory pricing integration remain separate work; custom products/services can be entered as document lines. Contact selection uses the current CRM primary/available contact labels; a full contact-ID registry is still outstanding. Company address/logo configuration is not added here.

Next Stage 4 batch: Events and Bookings, then Appointments, Documents, business-record Archives and Forms. Their previous implementations remain intact and incomplete against the full brief. See PAGE-CHECKLIST.md.
