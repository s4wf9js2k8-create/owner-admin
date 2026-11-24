import React, { useState } from "react";
import { moduleInfo } from "../customerModules";
export default function AvailabilityRanges({
  org,
  module,
  records,
  onAdd,
  canCreate,
}) {
  const [message, setMessage] = useState(""),
    people = records.filter(
      (r) => r.orgId === org.id && moduleInfo(r.module).type === "people",
    );
  return (
    <details className="completion-workspace">
      <summary>Record available dates</summary>
      <p>
        Approved availability is separate from leave. Profiles set to Recorded
        dates only cannot be assigned outside approved available dates.
        Availability never reduces annual leave allowance.
      </p>
      {canCreate && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget,
              f = Object.fromEntries(new FormData(form)),
              p = people.find((p) => p.id === f.personId);
            if (
              await onAdd({
                ...f,
                orgId: org.id,
                module,
                title: "Availability: " + p.title,
                person: p.title,
                requestType: "Available",
                approval: "Pending",
                status: "Planned",
              })
            ) {
              form.reset();
              setMessage("Availability submitted for independent approval.");
            }
          }}
        >
          <label>
            Availability employee
            <select name="personId" aria-label="Availability employee" required>
              <option value="">Choose existing staff</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>
          <div className="form-pair">
            <label>
              Available from
              <input name="startDate" type="date" required />
            </label>
            <label>
              Available until
              <input name="endDate" type="date" required />
            </label>
          </div>
          <label>
            Availability notes
            <textarea name="detail" maxLength={500} />
          </label>
          <button>Submit available dates</button>
        </form>
      )}
      {message && <p role="status">{message}</p>}
    </details>
  );
}
