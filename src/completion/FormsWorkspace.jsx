import React, { useEffect, useState } from "react";
import { Empty, Status } from "../components";
import { moduleInfo } from "../customerModules";
import {
  formFieldTypes,
  fieldVisible,
  validateFields,
  validateAnswers,
} from "./rules";
import { TabBar, exportCsv } from "./Shared";
export default function FormsWorkspace({
  org,
  module,
  records,
  onAdd,
  onUpdate,
  canCreate = false,
  canEdit = false,
  canExport = false,
  onNavigate,
  focusId,
}) {
  const all = records.filter((r) => r.orgId === org.id),
    templates = all.filter(
      (r) => r.module === module && r.recordType === "form-template",
    ),
    responses = all.filter(
      (r) => r.module === module && r.recordType === "form-response",
    );
  const [selected, setSelected] = useState(""),
    [tab, setTab] = useState("Forms"),
    [draft, setDraft] = useState(null),
    [message, setMessage] = useState(""),
    [answers, setAnswers] = useState({}),
    [related, setRelated] = useState(""),
    [responseSearch, setResponseSearch] = useState(""),
    [status, setStatus] = useState("All"),
    [busy, setBusy] = useState(false);
  const current = templates.find((t) => t.id === selected) || templates[0],
    schema = draft || current;
  useEffect(() => {
    if (focusId) {
      const r = all.find((r) => r.id === focusId);
      if (r?.recordType === "form-response") {
        setSelected(r.templateId);
        setTab("Responses");
      } else setSelected(focusId);
    }
  }, [focusId]);
  const choose = (t) => {
    setSelected(t.id);
    setDraft(tab === "Form builder" ? structuredClone(t) : null);
    setAnswers({});
    setRelated("");
    setMessage("");
  };
  const save = async (next) => {
    if (!next?.id) return;
    setBusy(true);
    const ok = await onUpdate(org.id, next.id, {
      title: next.title,
      detail: next.detail || "",
      fields: next.fields,
      workflow: next.workflow || "None",
      status: "Draft",
    });
    setBusy(false);
    if (ok) {
      setDraft(null);
      setMessage("Draft saved. Publish when it is ready for submissions.");
    }
  };
  const publish = async () => {
    setMessage("");
    try {
      const target = draft || current;
      validateFields(target.fields);
      const version = (current.version || 0) + 1;
      const ok = await onUpdate(org.id, current.id, {
        title: target.title,
        detail: target.detail || "",
        fields: target.fields,
        workflow: target.workflow || "None",
        status: "Published",
        version,
        versions: [
          ...(current.versions || []),
          {
            version,
            at: new Date().toISOString(),
            fields: structuredClone(target.fields),
          },
        ],
      });
      if (ok) {
        setDraft(null);
        setMessage("Form published for this demonstration.");
      }
    } catch (err) {
      setMessage(err.message);
    }
  };
  const changeField = (id, patch) =>
    setDraft((old) => ({
      ...old,
      fields: (old || current).fields.map((f) =>
        f.id === id ? { ...f, ...patch } : f,
      ),
    }));
  const move = (id, delta) =>
    setDraft((old) => {
      const fields = [...(old || current).fields],
        index = fields.findIndex((f) => f.id === id),
        other = index + delta;
      if (other < 0 || other >= fields.length) return old;
      [fields[index], fields[other]] = [fields[other], fields[index]];
      return { ...old, fields };
    });
  const selectedResponses = responses.filter(
    (r) =>
      (!current || r.templateId === current.id) &&
      JSON.stringify([r.title, r.answers])
        .toLowerCase()
        .includes(responseSearch.toLowerCase()),
  );
  return (
    <div className="completion-workspace forms-ops">
      <div className="customer-page-intro">
        <div>
          <span className="eyebrow">BUSINESS FORMS</span>
          <h2>Forms & surveys</h2>
          <p>
            Versioned forms, conditional questions, linked submissions and
            supported workflow actions.
          </p>
        </div>
      </div>
      <TabBar
        tabs={["Forms", "Form builder", "Complete form", "Responses"]}
        current={tab}
        setCurrent={(next) => {
          if (next === "Form builder" && current) {
            setDraft(structuredClone(current));
          }
          setTab(next);
          setMessage("");
        }}
      />
      {message && <p role="status">{message}</p>}
      {tab === "Forms" && (
        <>
          <label>
            Form lifecycle
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {["All", "Draft", "Published", "Archived"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <div className="purpose-grid">
            {templates
              .filter((t) => status === "All" || t.status === status)
              .map((t) => (
                <article className="purpose-card" key={t.id}>
                  <span className="eyebrow">
                    Version {t.version || 0} · {t.fields?.length || 0} fields
                  </span>
                  <h3>{t.title}</h3>
                  <Status>{t.status}</Status>
                  <p>{t.detail}</p>
                  <button
                    onClick={() => {
                      choose(t);
                      setTab("Complete form");
                    }}
                  >
                    Preview / complete
                  </button>
                  {canEdit && (
                    <button
                      onClick={() => {
                        choose(t);
                        setDraft(structuredClone(t));
                        setTab("Form builder");
                      }}
                    >
                      Edit structure
                    </button>
                  )}
                </article>
              ))}
          </div>
          {canCreate && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget,
                  f = Object.fromEntries(new FormData(form));
                const saved = await onAdd({
                  orgId: org.id,
                  module,
                  recordType: "form-template",
                  title: f.title.trim(),
                  detail: f.detail,
                  status: "Draft",
                  fields: [],
                  version: 0,
                  versions: [],
                  workflow: "None",
                });
                if (saved) {
                  choose(saved);
                  setDraft(saved);
                  setTab("Form builder");
                  form.reset();
                }
              }}
            >
              <h3>Create a form template</h3>
              <label>
                Form name
                <input name="title" required maxLength={100} pattern=".*\S.*" />
              </label>
              <label>
                Description
                <textarea name="detail" maxLength={1000} />
              </label>
              <button>Create form</button>
            </form>
          )}
          {!templates.length && (
            <Empty>
              No forms yet. Create a draft, add questions, preview and publish
              it.
            </Empty>
          )}
        </>
      )}
      {tab !== "Forms" && current && (
        <label>
          Form template
          <select
            aria-label="Selected form template"
            value={current.id}
            onChange={(e) =>
              choose(templates.find((t) => t.id === e.target.value))
            }
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} · {t.status}
              </option>
            ))}
          </select>
        </label>
      )}
      {tab === "Form builder" && schema && (
        <>
          <div className="form-builder-heading">
            <label>
              Form title
              <input
                disabled={!canEdit}
                value={schema.title}
                onChange={(e) => setDraft({ ...schema, title: e.target.value })}
              />
            </label>
            <label>
              Workflow action
              <select
                disabled={!canEdit}
                value={schema.workflow || "None"}
                onChange={(e) =>
                  setDraft({ ...schema, workflow: e.target.value })
                }
              >
                <option>None</option>
                <option>Defect to maintenance</option>
              </select>
            </label>
          </div>
          {canEdit && (
            <div className="completion-actions">
              <button onClick={() => save(draft || current)} disabled={busy}>
                Save form draft
              </button>
              <button onClick={publish}>Publish form</button>
              <button
                onClick={async () => {
                  if (
                    await onUpdate(org.id, current.id, { status: "Archived" })
                  ) {
                    setDraft(null);
                    setMessage(
                      "Form archived; submissions and version history are retained.",
                    );
                  }
                }}
              >
                Archive form
              </button>
              <button
                onClick={() => {
                  setDraft(null);
                  setTab("Complete form");
                }}
              >
                Preview saved form
              </button>
            </div>
          )}
          <div className="form-builder-fields">
            {(schema.fields || []).map((f, i) => (
              <article className="form-builder-field" key={f.id}>
                <div>
                  <strong>
                    {i + 1}. {f.label}
                  </strong>
                  <small>
                    {f.type} · {f.required ? "Required" : "Optional"}
                    {f.conditionFieldId ? " · Conditional" : ""}
                  </small>
                </div>
                {canEdit && (
                  <>
                    <button
                      aria-label={"Move " + f.label + " up"}
                      disabled={i === 0}
                      onClick={() => move(f.id, -1)}
                    >
                      ↑
                    </button>
                    <button
                      aria-label={"Move " + f.label + " down"}
                      disabled={i === schema.fields.length - 1}
                      onClick={() => move(f.id, 1)}
                    >
                      ↓
                    </button>
                    <button
                      onClick={() =>
                        setDraft({
                          ...schema,
                          fields: schema.fields
                            .filter((x) => x.id !== f.id)
                            .map((x) =>
                              x.conditionFieldId === f.id
                                ? {
                                    ...x,
                                    conditionFieldId: "",
                                    conditionValue: "",
                                  }
                                : x,
                            ),
                        })
                      }
                    >
                      Remove
                    </button>
                    <details>
                      <summary>Field settings</summary>
                      <label>
                        Question label
                        <input
                          value={f.label}
                          onChange={(e) =>
                            changeField(f.id, { label: e.target.value })
                          }
                        />
                      </label>
                      <label className="task-check">
                        <input
                          type="checkbox"
                          checked={Boolean(f.required)}
                          onChange={(e) =>
                            changeField(f.id, { required: e.target.checked })
                          }
                        />
                        Required response
                      </label>
                      <label>
                        Show when
                        <select
                          value={f.conditionFieldId || ""}
                          onChange={(e) =>
                            changeField(f.id, {
                              conditionFieldId: e.target.value,
                            })
                          }
                        >
                          <option value="">Always visible</option>
                          {schema.fields
                            .slice(0, i)
                            .filter((q) => q.type !== "Section")
                            .map((q) => (
                              <option key={q.id} value={q.id}>
                                {q.label}
                              </option>
                            ))}
                        </select>
                      </label>
                      {f.conditionFieldId && (
                        <label>
                          Equals
                          <input
                            value={f.conditionValue || ""}
                            onChange={(e) =>
                              changeField(f.id, {
                                conditionValue: e.target.value,
                              })
                            }
                          />
                        </label>
                      )}
                    </details>
                  </>
                )}
              </article>
            ))}
          </div>
          {canEdit && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget,
                  f = Object.fromEntries(new FormData(form));
                const field = {
                  id: crypto.randomUUID(),
                  label: f.label.trim(),
                  type: f.type,
                  required: f.required === "on",
                  options: String(f.options || "")
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean),
                };
                setDraft({
                  ...schema,
                  fields: [...(schema.fields || []), field],
                });
                form.reset();
              }}
            >
              <h3>Add a question or section</h3>
              <label>
                Question or label
                <input name="label" required pattern=".*\S.*" maxLength={120} />
              </label>
              <label>
                Answer type
                <select name="type" aria-label="Answer type">
                  {formFieldTypes.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label>
                Choices (one per line)
                <textarea name="options" />
              </label>
              <label className="task-check">
                <input type="checkbox" name="required" />
                Required field
              </label>
              <button>Add field</button>
            </form>
          )}
          <details>
            <summary>Published version history</summary>
            {(current.versions || []).map((v) => (
              <p key={v.version}>
                Version {v.version} · {v.at} · {v.fields.length} questions
              </p>
            ))}
          </details>
        </>
      )}
      {tab === "Complete form" && current && (
        <section className="form-run">
          <h3>{current.title}</h3>
          <p>
            Version {current.version || 0} · {current.status}
            {current.status !== "Published"
              ? " · Preview only; publish to accept submissions."
              : ""}
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setMessage("");
              try {
                validateAnswers(current.fields, answers);
                setBusy(true);
                if (
                  await onUpdate(org.id, current.id, {
                    _workflow: {
                      kind: "formSubmit",
                      answers,
                      relatedRecordId: related,
                    },
                  })
                ) {
                  setAnswers({});
                  setTab("Responses");
                  setMessage("Form response submitted in this demo.");
                }
              } catch (err) {
                setMessage(err.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Related business record
              <select
                value={related}
                onChange={(e) => setRelated(e.target.value)}
                required={current.workflow === "Defect to maintenance"}
              >
                <option value="">No linked record</option>
                {all
                  .filter(
                    (r) =>
                      r.id !== current.id &&
                      ![
                        "form-template",
                        "form-response",
                        "report-config",
                        "inspection-template",
                      ].includes(r.recordType) &&
                      (!current.workflow ||
                        current.workflow === "None" ||
                        moduleInfo(r.module).type === "assets"),
                  )
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title} · {r.module}
                    </option>
                  ))}
              </select>
            </label>
            {(current.fields || [])
              .filter((f) => fieldVisible(f, answers))
              .map((f) =>
                f.type === "Section" ? (
                  <h3 key={f.id}>{f.label}</h3>
                ) : (
                  <label key={f.id}>
                    {f.label}
                    {f.type === "Long text" ? (
                      <textarea
                        required={f.required}
                        value={answers[f.id] || ""}
                        onChange={(e) =>
                          setAnswers({ ...answers, [f.id]: e.target.value })
                        }
                      />
                    ) : f.type === "Checkboxes" ? (
                      <span>
                        {f.options.map((o) => (
                          <label className="task-check" key={o}>
                            <input
                              type="checkbox"
                              checked={(answers[f.id] || []).includes(o)}
                              onChange={(e) =>
                                setAnswers({
                                  ...answers,
                                  [f.id]: e.target.checked
                                    ? [...(answers[f.id] || []), o]
                                    : (answers[f.id] || []).filter(
                                        (x) => x !== o,
                                      ),
                                })
                              }
                            />
                            {o}
                          </label>
                        ))}
                      </span>
                    ) : ["Dropdown", "Multiple choice", "Yes / No"].includes(
                        f.type,
                      ) ? (
                      <select
                        required={f.required}
                        value={answers[f.id] || ""}
                        onChange={(e) =>
                          setAnswers({ ...answers, [f.id]: e.target.value })
                        }
                      >
                        <option value="">Choose an answer</option>
                        {(f.type === "Yes / No"
                          ? ["Yes", "No"]
                          : f.options
                        ).map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={
                          f.type === "Number"
                            ? "number"
                            : f.type === "Date"
                              ? "date"
                              : "text"
                        }
                        step={f.type === "Number" ? "any" : undefined}
                        required={f.required}
                        value={answers[f.id] ?? ""}
                        onChange={(e) =>
                          setAnswers({ ...answers, [f.id]: e.target.value })
                        }
                      />
                    )}
                  </label>
                ),
              )}
            {canCreate && (
              <button disabled={busy || current.status !== "Published"}>
                Submit response
              </button>
            )}
          </form>
        </section>
      )}
      {tab === "Responses" && (
        <>
          <div className="completion-actions">
            <label>
              Filter responses
              <input
                value={responseSearch}
                onChange={(e) => setResponseSearch(e.target.value)}
              />
            </label>
            {canExport && (
              <button
                onClick={() => {
                  const fields = [
                    ...new Set(
                      selectedResponses.flatMap((r) =>
                        Object.keys(r.answers || {}),
                      ),
                    ),
                  ];
                  exportCsv(
                    "form-responses",
                    ["Response ID", "Form", "Version", "Submitted", ...fields],
                    selectedResponses.map((r) => [
                      r.id,
                      r.formTitle,
                      r.templateVersion,
                      r.createdAt,
                      ...fields.map((f) => r.answers?.[f] ?? ""),
                    ]),
                  );
                }}
              >
                Export responses CSV
              </button>
            )}
          </div>
          {selectedResponses.map((r) => (
            <details className="form-response" key={r.id}>
              <summary>
                <strong>{r.formTitle || r.title}</strong> · Version{" "}
                {r.templateVersion || "legacy"} ·{" "}
                {r.createdAt?.slice(0, 10) || r.dueDate}
              </summary>
              <dl>
                {Object.entries(r.answers || {}).map(([k, v]) => (
                  <React.Fragment key={k}>
                    <dt>{k}</dt>
                    <dd>{Array.isArray(v) ? v.join(", ") : String(v)}</dd>
                  </React.Fragment>
                ))}
              </dl>
              {r.relatedRecordId && (
                <button
                  onClick={() => {
                    const target = all.find((t) => t.id === r.relatedRecordId);
                    if (target)
                      onNavigate(target.module, { recordId: target.id });
                  }}
                >
                  Open related record
                </button>
              )}
              {r.workOrderId && (
                <button
                  onClick={() => {
                    const job = all.find((j) => j.id === r.workOrderId);
                    if (job) onNavigate(job.module, { recordId: job.id });
                  }}
                >
                  Open generated maintenance
                </button>
              )}
            </details>
          ))}
          {!selectedResponses.length && (
            <Empty>
              No matching submissions. Publish and complete a form to collect
              responses.
            </Empty>
          )}
        </>
      )}
    </div>
  );
}
