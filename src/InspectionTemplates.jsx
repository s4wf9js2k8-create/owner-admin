import { nextInspectionTemplateVersion } from "./inspectionRules";
import React, { useState } from "react";
import { Modal, Empty } from "./components";
export default function InspectionTemplates({
  org,
  module,
  templates,
  onAdd,
  onUpdate,
  canCreate,
}) {
  const [editing, setEditing] = useState(null),
    [open, setOpen] = useState(false),
    [questions, setQuestions] = useState([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const change = (id, patch) =>
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  const save = async (e) => {
    e.preventDefault();
    const name = String(new FormData(e.currentTarget).get("name") || "").trim();
    if (
      !name ||
      !questions.length ||
      questions.some(
        (q) =>
          !q.label.trim() ||
          !q.section.trim() ||
          (q.type === "Multiple choice" &&
            (q.options || []).filter((v) => v.trim()).length < 2),
      )
    ) {
      setError(
        "Enter a name, section and question text. Multiple choice requires at least two choices.",
      );
      return;
    }
    if (
      questions.some(
        (q) =>
          q.type === "Number" &&
          q.minimum !== "" &&
          q.maximum !== "" &&
          Number(q.minimum) > Number(q.maximum),
      )
    ) {
      setError("Minimum measurement must not exceed maximum.");
      return;
    }
    setBusy(true);
    const payload = {
      orgId: org.id,
      module,
      recordType: "inspection-template",
      title: name,
      questions: questions.map((q) => ({
        ...q,
        options: (q.options || []).map((v) => v.trim()).filter(Boolean),
      })),
      status: "Complete",
      version: nextInspectionTemplateVersion(editing),
      versions: [
        ...(editing?.versions || []),
        ...(editing
          ? [
              {
                version: editing.version || 1,
                title: editing.title,
                questions: editing.questions,
                at: new Date().toISOString(),
              },
            ]
          : []),
      ],
    };
    const saved = editing
      ? await onUpdate(org.id, editing.id, {
          title: payload.title,
          questions: payload.questions,
          version: payload.version,
          versions: payload.versions,
        })
      : await onAdd(payload);
    setBusy(false);
    if (saved) {
      setOpen(false);
      setQuestions([]);
      setError("");
    }
  };
  return (
    <div className="inspection-template-tools">
      <p>
        {templates.length} reusable inspection templates · new inspections keep
        a snapshot of their questions.
      </p>
      {canCreate && (
        <button
          onClick={() => {
            setEditing(null);
            setQuestions([]);
            setOpen(true);
          }}
        >
          Build inspection template
        </button>
      )}
      {canCreate &&
        templates.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setEditing(t);
              setQuestions(structuredClone(t.questions || []));
              setOpen(true);
            }}
          >
            Edit {t.title} · v{t.version || 1}
          </button>
        ))}
      <details>
        <summary>Inspection template version history</summary>
        {templates.map((t) => (
          <div key={t.id}>
            <h3>
              {t.title} · current v{t.version || 1}
            </h3>
            {(t.versions || []).map((v, i) => (
              <p key={i}>
                Version {v.version} · {v.at} · {v.title} ·{" "}
                {v.questions.map((q) => q.label).join("; ")}
              </p>
            ))}
          </div>
        ))}
      </details>
      {open && (
        <Modal
          title="Inspection template builder"
          onClose={() => setOpen(false)}
        >
          <form onSubmit={save} className="customer-form">
            <label>
              Template name
              <input
                name="name"
                required
                maxLength={100}
                defaultValue={editing?.title || ""}
              />
            </label>
            {questions.map((q, i) => (
              <fieldset key={q.id} className="inspection-question">
                <legend>Question {i + 1}</legend>
                <label>
                  Section
                  <input
                    value={q.section}
                    required
                    maxLength={80}
                    onChange={(e) => change(q.id, { section: e.target.value })}
                  />
                </label>
                <label>
                  Question text
                  <input
                    value={q.label}
                    required
                    maxLength={160}
                    onChange={(e) => change(q.id, { label: e.target.value })}
                  />
                </label>
                <label>
                  Response type
                  <select
                    value={q.type}
                    onChange={(e) => change(q.id, { type: e.target.value })}
                  >
                    {["Pass / fail", "Multiple choice", "Number", "Notes"].map(
                      (t) => (
                        <option key={t}>{t}</option>
                      ),
                    )}
                  </select>
                </label>
                {q.type === "Multiple choice" && (
                  <label>
                    Choices (one per line)
                    <textarea
                      value={(q.options || []).join("\n")}
                      onChange={(e) =>
                        change(q.id, { options: e.target.value.split("\n") })
                      }
                    />
                  </label>
                )}
                {q.type === "Number" && (
                  <div className="form-pair">
                    <label>
                      Minimum acceptable
                      <input
                        type="number"
                        step="any"
                        value={q.minimum}
                        onChange={(e) =>
                          change(q.id, { minimum: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Maximum acceptable
                      <input
                        type="number"
                        step="any"
                        value={q.maximum}
                        onChange={(e) =>
                          change(q.id, { maximum: e.target.value })
                        }
                      />
                    </label>
                  </div>
                )}
                <label className="task-check">
                  <input
                    type="checkbox"
                    checked={q.required}
                    onChange={(e) =>
                      change(q.id, { required: e.target.checked })
                    }
                  />
                  Required response
                </label>
                <label className="task-check">
                  <input
                    type="checkbox"
                    checked={q.evidenceRequired}
                    onChange={(e) =>
                      change(q.id, { evidenceRequired: e.target.checked })
                    }
                  />
                  Mandatory local evidence
                </label>
                <div className="quick-actions">
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() =>
                      setQuestions((qs) => {
                        const next = [...qs];
                        [next[i - 1], next[i]] = [next[i], next[i - 1]];
                        return next;
                      })
                    }
                  >
                    Move question up
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setQuestions((qs) => qs.filter((x) => x.id !== q.id))
                    }
                  >
                    Remove question
                  </button>
                </div>
              </fieldset>
            ))}
            {!questions.length && <Empty>Add at least one question.</Empty>}
            <button
              type="button"
              onClick={() =>
                setQuestions((qs) => [
                  ...qs,
                  {
                    id: crypto.randomUUID(),
                    section: "Equipment checks",
                    label: "",
                    type: "Pass / fail",
                    required: true,
                    evidenceRequired: false,
                    minimum: "",
                    maximum: "",
                    options: [],
                  },
                ])
              }
            >
              Add inspection question
            </button>
            {error && <p role="alert">{error}</p>}
            <button disabled={busy}>Save inspection template</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
