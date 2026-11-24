import React, { useEffect, useState } from "react";
import { moduleInfo } from "../customerModules";
import { Modal, Status } from "../components";
import { exportCsv } from "./Shared";
export default function CollectionWorkspace({
  org,
  module,
  records,
  onAdd,
  onUpdate,
  canCreate,
  canEdit,
  canExport,
  focusId,
}) {
  const [selected, setSelected] = useState(""),
    [creating, setCreating] = useState(false),
    [search, setSearch] = useState(""),
    [category, setCategory] = useState("All"),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [message, setMessage] = useState("");
  useEffect(() => {
    if (focusId) setSelected(focusId);
  }, [focusId]);
  const rows = records.filter(
      (r) => r.orgId === org.id && moduleInfo(r.module).type === "archives",
    ),
    current = rows.find((r) => r.id === selected),
    shown = rows.filter(
      (r) =>
        JSON.stringify([
          r.title,
          r.reference,
          r.detail,
          r.provenance,
          r.location,
          r.historicalDate,
        ])
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        (category === "All" || r.category === category) &&
        (!from || r.historicalDate >= from) &&
        (!to || r.historicalDate <= to),
    );
  const fields = (r) => (
    <>
      <label>
        Collection title
        <input name="title" required defaultValue={r?.title || ""} />
      </label>
      <label>
        Collection reference
        <input name="reference" required defaultValue={r?.reference || ""} />
      </label>
      <label>
        Historical date
        <input
          type="date"
          name="historicalDate"
          defaultValue={r?.historicalDate || ""}
        />
      </label>
      <label>
        Historical date description
        <input
          name="dateDescription"
          placeholder="For example, circa 1920"
          defaultValue={r?.dateDescription || ""}
        />
      </label>
      <label>
        Collection category
        <input name="category" required defaultValue={r?.category || ""} />
      </label>
      <label>
        Physical storage location
        <input name="location" required defaultValue={r?.location || ""} />
      </label>
      <label>
        Description
        <textarea name="detail" required defaultValue={r?.detail || ""} />
      </label>
      <label>
        Provenance
        <textarea name="provenance" defaultValue={r?.provenance || ""} />
      </label>
      <label>
        Digital reference URL
        <input
          type="url"
          name="digitalReference"
          defaultValue={r?.digitalReference || ""}
        />
      </label>
      <label>
        Conservation condition
        <select name="condition" defaultValue={r?.condition || "Good"}>
          <option>Good</option>
          <option>Monitor</option>
          <option>Poor</option>
          <option>Needs attention</option>
        </select>
      </label>
    </>
  );
  return (
    <div className="completion-workspace">
      <div className="customer-page-intro">
        <div>
          <span className="eyebrow">HISTORICAL COLLECTION CATALOGUE</span>
          <h2>Archives & collections</h2>
          <p>
            Provenance, historical dates and physical custody. Completed
            business records belong in Business archives.
          </p>
        </div>
        {canCreate && (
          <button onClick={() => setCreating(true)}>Accession item</button>
        )}
      </div>
      <div className="form-pair">
        <label>
          Search collection
          <input value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <label>
          Collection category filter
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {[
              "All",
              ...new Set(rows.map((r) => r.category).filter(Boolean)),
            ].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Historical date from
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          Historical date to
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
      </div>
      {canExport && (
        <>
          <button
            onClick={() =>
              exportCsv("collection-catalogue", [
                [
                  "Reference",
                  "Title",
                  "Date",
                  "Date description",
                  "Category",
                  "Location",
                  "Provenance",
                  "Condition",
                  "Digital reference",
                ],
                ...shown.map((r) => [
                  r.reference,
                  r.title,
                  r.historicalDate,
                  r.dateDescription,
                  r.category,
                  r.location,
                  r.provenance,
                  r.condition,
                  r.digitalReference,
                ]),
              ])
            }
          >
            Export collection CSV
          </button>
          <button onClick={() => window.print()}>
            Print collection catalogue
          </button>
        </>
      )}
      <div className="archive-catalogue">
        {shown.map((r) => (
          <article className="archive-card" key={r.id}>
            <small>
              {r.reference || "Unnumbered"} · {r.category || "Uncategorised"}
            </small>
            <h3>{r.title}</h3>
            <p>
              {r.dateDescription || r.historicalDate || "Date not recorded"}
            </p>
            <p>{r.detail}</p>
            <p>{r.location}</p>
            <Status>{r.condition || "Not assessed"}</Status>
            <button onClick={() => setSelected(r.id)}>
              View collection item
            </button>
          </article>
        ))}
      </div>
      {!shown.length && (
        <p>
          No collection items match. Add an accession record or change the
          filters.
        </p>
      )}
      {(creating || current) && (
        <Modal
          title={
            creating
              ? "Accession collection item"
              : "Historical collection record"
          }
          onClose={() => {
            setCreating(false);
            setSelected("");
          }}
        >
          <form
            key={current?.id || "new"}
            onSubmit={async (e) => {
              e.preventDefault();
              const f = Object.fromEntries(new FormData(e.currentTarget));
              if (
                rows.some(
                  (r) =>
                    r.id !== current?.id &&
                    r.reference?.toLowerCase() === f.reference.toLowerCase(),
                )
              ) {
                setMessage("That collection reference is already used.");
                return;
              }
              const ok = creating
                ? await onAdd({
                    ...f,
                    orgId: org.id,
                    module,
                    recordType: "collection-item",
                    status: "Catalogued",
                  })
                : await onUpdate(org.id, current.id, f);
              if (ok) {
                setCreating(false);
                setSelected("");
                setMessage("Catalogue record saved.");
              }
            }}
          >
            <fieldset disabled={!canEdit && !creating}>
              {fields(current)}
            </fieldset>
            {(canEdit || creating) && <button>Save collection record</button>}
          </form>
          {current?.digitalReference &&
            /^https?:\/\//.test(current.digitalReference) && (
              <a
                href={current.digitalReference}
                target="_blank"
                rel="noreferrer"
              >
                Open digital reference
              </a>
            )}
        </Modal>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
