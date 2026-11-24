import React, { useState } from "react";
import { QualifiedStaffSelect } from "../LinkedSelectors";
export default function Subtasks({ task, records, onAdd, onOpen, canCreate }) {
  const [date, setDate] = useState(
    task.dueDate || new Date().toISOString().slice(0, 10),
  );
  const parent = records.find((r) => r.id === task.parentTaskId),
    children = records.filter(
      (r) => r.orgId === task.orgId && r.parentTaskId === task.id,
    ),
    people = records.filter((r) =>
      ["Staff & volunteers", "Staff", "Volunteers"].includes(r.module),
    );
  return (
    <section className="completion-workspace">
      <h3>Subtasks</h3>
      {task.parentTaskId && !parent && (
        <p>
          The parent task is outside the currently available records. Its saved
          link is retained.
        </p>
      )}
      {parent && (
        <button onClick={() => onOpen(parent.id)}>
          Open parent: {parent.title}
        </button>
      )}
      {children.map((c) => (
        <p key={c.id}>
          <button onClick={() => onOpen(c.id)}>{c.title}</button> ·{" "}
          {c.archivedAt ? "Archived · " : ""}
          {c.status} · {c.owner || c.person || "Unassigned"}
        </p>
      ))}
      {!children.length && (
        <p>
          No subtasks. Break this work into separately assigned deliverables.
        </p>
      )}
      {canCreate && !["Complete", "Cancelled"].includes(task.status) && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget,
              f = Object.fromEntries(new FormData(form)),
              p = people.find((p) => p.title === f.owner);
            if (
              await onAdd({
                orgId: task.orgId,
                module: task.module,
                recordType: "task",
                parentTaskId: task.id,
                projectId: task.projectId || "",
                title: f.title,
                owner: f.owner,
                ownerId: p?.id || "",
                personId: p?.id || "",
                dueDate: f.dueDate,
                status: "Planned",
                priority: task.priority || "Normal",
                approval: "Not requested",
                checklist: [],
                comments: [],
              })
            )
              form.reset();
          }}
        >
          <label>
            Subtask title
            <input name="title" required maxLength={150} />
          </label>
          <label>
            Subtask deadline
            <input
              name="dueDate"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <QualifiedStaffSelect
            label="Subtask assignee"
            name="owner"
            records={records}
            orgId={task.orgId}
            kind="projects"
            date={date}
            required
          />
          <button>Create subtask</button>
        </form>
      )}
    </section>
  );
}
