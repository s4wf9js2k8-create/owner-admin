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
