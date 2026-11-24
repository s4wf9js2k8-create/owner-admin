import React, { useState } from "react";
export default function AttendanceCorrection({
  org,
  record: r,
  onUpdate,
  actorId,
  canEdit,
}) {
  const [message, setMessage] = useState("");
  return (
    <details className="completion-workspace">
      <summary>Request attendance correction</summary>
      <p>
        Recorded hours stay unchanged until a reviewer decides in Approvals.
      </p>
      {r.correctionRequest && (
        <p>
          Latest correction: {r.correctionRequest.status} ·{" "}
          {r.correctionRequest.reason}
        </p>
      )}
      {canEdit && r.correctionRequest?.status !== "Pending" && (
        <form
          key={r.id}
          onSubmit={async (e) => {
            e.preventDefault();
            const f = Object.fromEntries(new FormData(e.currentTarget)),
              minutes =
                (Date.parse(f.endTime) - Date.parse(f.startTime)) / 60000;
            if (
              !actorId ||
              !(minutes > 0) ||
              Number(f.breakMinutes) > minutes
            ) {
              setMessage(
                "Choose a Working as staff profile and valid times/breaks.",
              );
              return;
            }
            if (
              await onUpdate(org.id, r.id, {
                correctionRequest: {
                  ...f,
                  breakMinutes: Number(f.breakMinutes),
                  at: new Date().toISOString(),
                  requesterId: actorId,
                  status: "Pending",
                },
              })
            )
              setMessage(
                "Correction requested; original attendance is retained until approval.",
              );
          }}
        >
          <label>
            Corrected clock-in
            <input
              type="datetime-local"
              name="startTime"
              required
              defaultValue={r.startTime || ""}
            />
          </label>
          <label>
            Corrected clock-out
            <input
              type="datetime-local"
              name="endTime"
              required
              defaultValue={r.endTime || ""}
            />
          </label>
          <label>
            Corrected break minutes
            <input
              type="number"
              name="breakMinutes"
              min="0"
              step="1"
              required
              defaultValue={r.breakMinutes || 0}
            />
          </label>
          <label>
            Corrected location
            <select name="location" defaultValue={r.location || ""}>
              <option value="">Location not recorded</option>
              {[
                ...new Set(
                  [
                    r.location,
                    ...(org.workspaceConfig?.operations?.locations || [
                      "Main site",
                    ]),
                  ].filter(Boolean),
                ),
              ].map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
          <label>
            Correction reason
            <textarea name="reason" required maxLength={500} />
          </label>
          <button>Submit attendance correction</button>
        </form>
      )}
      {message && <p role="status">{message}</p>}
    </details>
  );
}
