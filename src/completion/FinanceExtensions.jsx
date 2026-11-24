import React, { useState } from "react";
import { money, totalPence, financialStatus } from "../financialRules";
import { refundDue, creditPence } from "./finalRules";
export function ProductCatalogue({
  org,
  module,
  records,
  onAdd,
  onUpdate,
  onConfigure,
  canCreate,
  canEdit,
}) {
  const [message, setMessage] = useState(""),
    products = records.filter(
      (r) => r.orgId === org.id && r.recordType === "product",
    );
  return (
    <details className="completion-workspace">
      <summary>Products, services and illustrative tax defaults</summary>
      <p>
        Catalogue prices are copied into document lines, preserving issued
        pricing when the catalogue changes. These are configurable illustrative
        tax settings, not tax advice.
      </p>
      {products.map((p) => (
        <form
          key={p.id}
          onSubmit={async (e) => {
            e.preventDefault();
            const f = Object.fromEntries(new FormData(e.currentTarget));
            if (
              await onUpdate(org.id, p.id, {
                ...f,
                rate: Number(f.rate),
                vat: Number(f.vat),
              })
            )
              setMessage(
                "Catalogue item updated; existing quotations are preserved.",
              );
          }}
        >
          <strong>{p.code}</strong>
          <div className="form-pair">
            <label>
              Catalogue description
              <input
                name="title"
                required
                defaultValue={p.title}
                disabled={!canEdit}
              />
            </label>
            <label>
              Catalogue price (£)
              <input
                name="rate"
                type="number"
                min="0"
                step=".01"
                required
                defaultValue={p.rate}
                disabled={!canEdit}
              />
            </label>
            <label>
              Catalogue VAT (%)
              <input
                name="vat"
                type="number"
                min="0"
                max="100"
                step=".01"
                required
                defaultValue={p.vat}
                disabled={!canEdit}
              />
            </label>
          </div>
          {canEdit && <button>Save catalogue item</button>}
        </form>
      ))}
      {canCreate && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget,
              f = Object.fromEntries(new FormData(form));
            if (
              await onAdd({
                ...f,
                orgId: org.id,
                module,
                recordType: "product",
                status: "Active",
                rate: Number(f.rate),
                vat: Number(f.vat),
              })
            ) {
              form.reset();
              setMessage("Product/service added.");
            }
          }}
        >
          <h3>Add product or service</h3>
          <label>
            Product/service code
            <input name="code" required maxLength={40} />
          </label>
          <label>
            Product/service name
            <input name="title" required maxLength={120} />
          </label>
          <div className="form-pair">
            <label>
              Unit catalogue price (£)
              <input
                type="number"
                name="rate"
                min="0"
                max="1000000"
                step=".01"
                required
              />
            </label>
            <label>
              Item VAT (%)
              <input
                name="vat"
                type="number"
                min="0"
                max="100"
                step=".01"
                required
                defaultValue="20"
              />
            </label>
          </div>
          <button>Add catalogue item</button>
        </form>
      )}
      {onConfigure && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = Object.fromEntries(new FormData(e.currentTarget)),
              rates = f.rates.split(",").map(Number),
              defaultVat = Number(f.defaultVat);
            if (
              rates.some((n) => !Number.isFinite(n) || n < 0 || n > 100) ||
              !rates.includes(defaultVat)
            ) {
              setMessage(
                "Set valid tax rates and a default present in the list.",
              );
              return;
            }
            if (
              await onConfigure(
                {
                  workspaceConfig: {
                    finance: {
                      taxRates: [...new Set(rates)],
                      defaultVat,
                      terms: f.terms,
                    },
                  },
                },
                "Updated illustrative finance defaults",
              )
            )
              setMessage("Finance defaults saved.");
          }}
        >
          <h3>New document defaults</h3>
          <label>
            Available tax rates (%)
            <input
              name="rates"
              required
              defaultValue={(
                org.workspaceConfig?.finance?.taxRates || [0, 5, 20]
              ).join(",")}
            />
          </label>
          <label>
            Default VAT (%)
            <input
              name="defaultVat"
              required
              type="number"
              min="0"
              max="100"
              step=".01"
              defaultValue={org.workspaceConfig?.finance?.defaultVat || 0}
            />
          </label>
          <label>
            Default payment terms
            <textarea
              name="terms"
              defaultValue={
                org.workspaceConfig?.finance?.terms ||
                "Payment within 30 days. Fictional demonstration only."
              }
            />
          </label>
          <button>Save finance defaults</button>
        </form>
      )}
      {message && <p role="status">{message}</p>}
    </details>
  );
}
export function CreditRefunds({ org, invoice: r, onUpdate, canEdit }) {
  const [message, setMessage] = useState("");
  return (
    <details className="completion-workspace">
      <summary>Invoice correction and fictional refunds</summary>
      <p>
        Uncredited value {money(totalPence(r) - creditPence(r))} · Credit
        balance available for refund {money(refundDue(r))}. No money is moved.
      </p>
      {canEdit &&
        !["Draft", "Cancelled"].includes(financialStatus(r)) &&
        ["creditInvoice", "refundInvoice"].map((action) => (
          <form
            key={action}
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget,
                f = Object.fromEntries(new FormData(form));
              if (
                await onUpdate(org.id, r.id, {
                  _workflow: { kind: action, ...f },
                })
              ) {
                form.reset();
                setMessage(
                  action === "creditInvoice"
                    ? "Credit recorded."
                    : "Fictional refund recorded. No transaction occurred.",
                );
              }
            }}
          >
            <h3>
              {action === "creditInvoice"
                ? "Correct issued or paid invoice"
                : "Record refund against a credit balance"}
            </h3>
            <label>
              {action === "creditInvoice"
                ? "Correction amount (£)"
                : "Refund amount (£)"}
              <input
                name="amount"
                type="number"
                min=".01"
                step=".01"
                max={(
                  (action === "creditInvoice"
                    ? totalPence(r) - creditPence(r)
                    : refundDue(r)) / 100
                ).toFixed(2)}
                required
              />
            </label>
            <label>
              Correction/refund date
              <input
                name="date"
                type="date"
                min={r.creationDate || undefined}
                max={new Date().toISOString().slice(0, 10)}
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </label>
            <label>
              Reason and reference
              <input name="reference" required maxLength={200} />
            </label>
            <button>
              {action === "creditInvoice"
                ? "Record invoice correction"
                : "Record fictional refund"}
            </button>
          </form>
        ))}
      {(r.refunds || []).map((p) => (
        <p key={p.id}>
          {p.date} · {money(p.amountPence)} · {p.reference} · Fictional refund
        </p>
      ))}
      {message && <p role="status">{message}</p>}
    </details>
  );
}
