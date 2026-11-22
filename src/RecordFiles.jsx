import React from "react";
import { moduleInfo } from "./customerModules";
export function LinkedRecordFiles({ record, records, onNavigate }) {
  const docs = records.filter(
    (r) =>
      moduleInfo(r.module).type === "documents" &&
      (r.relatedIds || []).includes(record.id),
  );
  return (
    <section>
      <h3>Linked documents</h3>
      {records
        .filter(
          (r) =>
            r.recordType === "form-response" &&
            (r.relatedRecordId === record.id ||
              r.relatedIds?.includes(record.id)),
        )
        .map((r) => (
          <button
            key={r.id}
            onClick={() => onNavigate(r.module, { recordId: r.id })}
          >
            {r.formTitle || r.title} · Form submission
          </button>
        ))}
      {docs.length ? (
        docs.map((r) => (
          <button
            key={r.id}
            onClick={() => onNavigate(r.module, { recordId: r.id })}
          >
            {r.title} · Version {r.version || 1}
          </button>
        ))
      ) : (
        <p>No linked document records.</p>
      )}
    </section>
  );
}
