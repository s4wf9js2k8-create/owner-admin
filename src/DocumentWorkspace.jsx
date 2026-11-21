import React, { useState, useEffect } from "react";
import { Modal, Status } from "./components";
import { moduleInfo } from "./customerModules";
export default function DocumentWorkspace({
  org,
  module,
  records,
  onAdd,
  onUpdate,
  onNavigate,
  focusId,
  canCreate,
  canEdit,
  canExport,
}) {
  const [selected, setSelected] = useState(null),
    [editing, setEditing] = useState(false),
    [creating, setCreating] = useState(false),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("All"),
    [file, setFile] = useState(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (focusId) setSelected(focusId);
  }, [focusId]);
  const docs = records.filter((r) => r.module === module),
    current = docs.find((r) => r.id === selected),
    targets = records.filter(
      (r) =>
        r.module !== module &&
        ![
          "inspection-template",
          "report-config",
          "supplier",
          "purchase-order",
        ].includes(r.recordType),
    );
  const pick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2097152) {
      setMessage("Choose a file up to 2 MB.");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => setMessage("The local file could not be read.");
    reader.onload = () => {
      setFile({
        name: f.name,
        type: f.type,
        size: f.size,
        data: reader.result,
      });
      setMessage("File selected locally; no server upload.");
    };
    reader.readAsDataURL(f);
  };
  const save = async (e) => {
    e.preventDefault();
    if (busy) return;
    const f = new FormData(e.currentTarget),
      values = Object.fromEntries(f);
    if (!values.title.trim()) {
      setMessage("Enter a document title.");
      return;
    }
    setBusy(true);
    const patch = {
      ...values,
      title: values.title.trim(),
      relatedIds: f.getAll("relatedIds"),
      ownerId: values.ownerId || "",
      sensitive: values.access === "Confidential",
      localFile: file || current?.localFile || null,
      modifiedAt: new Date().toISOString(),
    };
    const ok = editing
      ? await onUpdate(org.id, current.id, {
          ...patch,
          version: Number(current.versionNumber || 1) + 1,
          versionNumber: Number(current.versionNumber || 1) + 1,
          revisions: [
            ...(current.revisions || []),
            {
              title: current.title,
              at: patch.modifiedAt,
              version: current.version || 1,
              file: current.localFile || null,
            },
          ],
        })
      : await onAdd({
          orgId: org.id,
          module,
          ...patch,
          version: 1,
          versionNumber: 1,
          approval: "Pending",
          status: "Planned",
          createdAt: patch.modifiedAt,
          revisions: [],
        });
    setBusy(false);
    if (ok) {
      setCreating(false);
      setEditing(false);
      setFile(null);
    }
  };
  return (
    <div className="document-workspace">
      <div className="customer-page-intro">
        <div>
          <span className="eyebrow">WORKING DOCUMENT LIBRARY</span>
          <h2>Document control</h2>
          <p>Linked records, local files, ownership and retained versions.</p>
        </div>
        {canCreate && (
          <button
            onClick={() => {
              setCreating(true);
              setFile(null);
              setMessage("");
            }}
          >
            Add document
          </button>
        )}
      </div>
      <div className="customer-tools">
        <label>
          Find document
          <input value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <label>
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {[
              "All",
              ...new Set(docs.map((r) => r.documentType || "Other")),
            ].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="document-shelf">
        {docs
          .filter(
            (r) =>
              r.title.toLowerCase().includes(query.toLowerCase()) &&
              (category === "All" || (r.documentType || "Other") === category),
          )
          .map((r) => (
            <button
              className="document-cover"
              key={r.id}
              onClick={() => setSelected(r.id)}
            >
              <small>
                {r.documentType || "Other"} · {r.folder || "Unfiled"}
              </small>
              <strong>{r.title}</strong>
              <span>Version {r.version || 1}</span>
              <span>{r.localFile ? r.localFile.name : "Metadata only"}</span>
              <Status>{r.approval || "Pending"}</Status>
            </button>
          ))}
      </div>
      {current && !editing && !creating && (
        <Modal title="Controlled document" onClose={() => setSelected(null)}>
          <h2>{current.title}</h2>
          <p>
            {current.detail} · {current.documentType || "Other"} · Version{" "}
            {current.version || 1}
          </p>
          <p>
            Owner:{" "}
            {records.find((r) => r.id === current.ownerId)?.title ||
              current.owner ||
              "Not recorded"}{" "}
            · {current.access || "Internal"}
          </p>
          {canEdit && (
            <button
              onClick={() => {
                setEditing(true);
                setFile(null);
              }}
            >
              Edit document details
            </button>
          )}
          <h3>Related records</h3>
          {(current.relatedIds || []).map((id) => {
            const r = records.find((x) => x.id === id);
            return r ? (
              <button
                key={id}
                onClick={() => onNavigate(r.module, { recordId: id })}
              >
                {r.title} · {r.module}
              </button>
            ) : (
              <p key={id}>Linked record is outside your current access.</p>
            );
          })}
          {current.localFile ? (
            <>
              <p>
                Browser-local file · {current.localFile.name} ·{" "}
                {current.localFile.size} bytes
              </p>
              {canExport && (
                <a
                  href={current.localFile.data}
                  download={current.localFile.name}
                >
                  Download local file
                </a>
              )}
              {["image/png", "image/jpeg", "image/webp"].includes(
                current.localFile.type,
              ) && (
                <img
                  style={{
                    maxWidth: "100%",
                    maxHeight: 380,
                    objectFit: "contain",
                  }}
                  src={current.localFile.data}
                  alt={current.title}
                />
              )}
              <p>
                Image preview is supported; other files can be downloaded for
                local viewing.
              </p>
            </>
          ) : (
            <p>Metadata only. No file has been uploaded or stored.</p>
          )}
          <h3>Version history</h3>
          {(current.revisions || []).map((r, i) => (
            <p key={i}>
              Version {r.version} · {r.title} · {r.at}{" "}
              {canExport && r.file && (
                <a href={r.file.data} download={r.file.name}>
                  Download previous file
                </a>
              )}
            </p>
          ))}
        </Modal>
      )}
      {(creating || editing) && (
        <Modal
          title={editing ? "Edit document" : "New document record"}
          onClose={() => {
            setCreating(false);
            setEditing(false);
            setFile(null);
          }}
        >
          <form key={editing ? current.id : "new"} onSubmit={save}>
            <label>
              Document title
              <input
                name="title"
                required
                pattern=".*\S.*"
                defaultValue={editing ? current.title : ""}
              />
            </label>
            <label>
              Description
              <textarea
                name="detail"
                defaultValue={editing ? current.detail : ""}
              />
            </label>
            <label>
              Category
              <select
                name="documentType"
                defaultValue={editing ? current.documentType : "Policy"}
              >
                {[
                  "Policy",
                  "Procedure",
                  "Drawing",
                  "Report",
                  "Asset manual",
                  "Staff document",
                  "Customer document",
                  "Contract",
                  "Financial",
                  "Other",
                ].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Folder
              <input
                name="folder"
                defaultValue={editing ? current.folder : ""}
              />
            </label>
            <label>
              Document owner
              <select
                name="ownerId"
                defaultValue={editing ? current.ownerId : ""}
              >
                <option value="">Unassigned</option>
                {records
                  .filter((r) => moduleInfo(r.module).type === "people")
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Access classification
              <select
                name="access"
                defaultValue={editing ? current.access : "Internal"}
              >
                <option>Internal</option>
                <option>Public</option>
                <option>Confidential</option>
              </select>
            </label>
            <label>
              Related records (select multiple)
              <select
                style={{ width: "100%", minHeight: 150 }}
                name="relatedIds"
                multiple
                size="6"
                defaultValue={editing ? current.relatedIds : []}
              >
                {targets.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.module} · {r.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Local file (optional, up to 2 MB)
              <input type="file" onChange={pick} />
            </label>
            {file && <p>{file.name} selected locally</p>}
            <button disabled={busy}>Save document record</button>
          </form>
          {message && <p role="status">{message}</p>}
        </Modal>
      )}
      <p className="module-disclaimer">
        Files and metadata stay in this tab's memory and reset on refresh.
        Nothing is uploaded to permanent storage. Confidential classification
        uses demonstration permissions only.
      </p>
    </div>
  );
}
