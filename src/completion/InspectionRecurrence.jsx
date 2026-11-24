import React, { useState } from "react";
export default function InspectionRecurrence({
  org,
  record,
  onUpdate,
  canCreate,
}) {
  const [message, setMessage] = useState("");
  if (!canCreate || !record.inspectionQuestions?.length) return null;
  return (
    <details className="completion-workspace">
      <summary>Schedule recurring inspections</summary>
      <p>
        New inspections retain this question version and asset. The inspector
        must be eligible on every date. Existing occurrences are not duplicated.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const f = Object.fromEntries(new FormData(e.currentTarget));
          if (
            await onUpdate(org.id, record.id, {
              _workflow: {
                kind: "repeatInspection",
                ...f,
                interval: Number(f.interval),
              },
            })
          )
            setMessage("Inspection schedule generated.");
        }}
      >
        <label>
          Inspection recurrence starts
          <input type="date" name="from" required />
        </label>
        <label>
          Inspection recurrence ends
          <input type="date" name="to" required />
        </label>
        <label>
          Inspection interval
          <select name="interval">
            <option value="7">Weekly</option>
            <option value="14">Fortnightly</option>
            <option value="28">Every four weeks</option>
          </select>
        </label>
        <button>Generate inspection schedule</button>
      </form>
      {message && <p role="status">{message}</p>}
    </details>
  );
}
