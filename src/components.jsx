import React, { useEffect, useRef } from "react";
export function Status({ children }) {
  return (
    <span
      className={
        "status " + String(children).toLowerCase().replaceAll(" ", "-")
      }
    >
      {children}
    </span>
  );
}
export function Empty({ children = "No matching records." }) {
  return <p className="empty-state">{children}</p>;
}
export function Panel({ title, children }) {
  return (
    <article className="panel">
      <h2>{title}</h2>
      {children}
    </article>
  );
}
export function Table({ headings, children }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {headings.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
export function Modal({ title, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current.showModal();
    ref.current.querySelector("input, textarea, select")?.focus();
    return () => previous?.focus();
  }, []);
  return (
    <dialog ref={ref} onCancel={onClose} aria-labelledby="dialog-title">
      <div className="dialog-heading">
        <h2 id="dialog-title">{title}</h2>
        <button type="button" aria-label="Close dialog" onClick={onClose}>
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function OrganisationForm({ org, onSave, onClose, sectors }) {
  return (
    <Modal
      title={org ? "Edit example organisation" : "Create example organisation"}
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          onSave(Object.fromEntries(f));
        }}
      >
        <p>Fictional details only. Changes reset on refresh.</p>
        <label>
          Organisation name
          <input
            name="name"
            required
            maxLength={80}
            pattern=".*\S.*"
            defaultValue={org?.name}
            autoFocus
          />
        </label>
        <label>
          Sector
          <select name="sector" defaultValue={org?.sector || "heritage"}>
            {Object.entries(sectors).map(([key, c]) => (
              <option key={key} value={key}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <button className="primary" type="submit">
          Save example organisation
        </button>
      </form>
    </Modal>
  );
}
