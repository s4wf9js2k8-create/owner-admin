import React from "react";
export function EvidencePicker({
  value,
  onChange,
  label = "Local evidence",
  multiple = false,
}) {
  return (
    <label>
      {label}
      <input
        type="file"
        multiple={multiple}
        onChange={async (e) => {
          const files = [...e.target.files];
          if (files.some((f) => f.size > 2097152)) {
            e.target.setCustomValidity("Choose files up to 2 MB each.");
            e.target.reportValidity();
            return;
          }
          e.target.setCustomValidity("");
          const results = await Promise.all(
            files.map(
              (file) =>
                new Promise((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onerror = () =>
                    reject(new Error("Unable to read the local file."));
                  reader.onload = () =>
                    resolve({
                      id: crypto.randomUUID(),
                      name: file.name,
                      type: file.type,
                      size: file.size,
                      data: reader.result,
                    });
                  reader.readAsDataURL(file);
                }),
            ),
          ).catch((err) => {
            e.target.setCustomValidity(err.message);
            e.target.reportValidity();
            return null;
          });
          if (results) onChange(multiple ? results : results[0] || null);
        }}
      />
      <small>
        Browser memory only, maximum 2 MB per file; no server upload.
      </small>
      {(Array.isArray(value) ? value : [value]).filter(Boolean).map((f) => (
        <a key={f.id || f.name} href={f.data} download={f.name}>
          {f.name} · Download local copy
        </a>
      ))}
    </label>
  );
}
export function exportCsv(name, headings, rows) {
  if (!rows) {
    rows = headings.slice(1);
    headings = headings[0];
  }
  const escape = (value) =>
    '"' +
    String(value ?? "")
      .replace(/^\s*[=+@-]/, "'$&")
      .replaceAll('"', '""') +
    '"';
  const url = URL.createObjectURL(
    new Blob(
      [
        [headings, ...rows]
          .map((row) => row.map(escape).join(","))
          .join("\r\n"),
      ],
      { type: "text/csv;charset=utf-8" },
    ),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name + ".csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function History({ entries = [] }) {
  return (
    <div className="completion-history">
      {entries.map((e, i) => (
        <p key={e.id || i}>
          <small>
            {e.at || e.date} · {e.actorName || ""}
          </small>
          <span>{e.text || e.details || e.action || e.notes || e.result}</span>
        </p>
      ))}
      {!entries.length && <p>No activity recorded yet.</p>}
    </div>
  );
}
export function TabBar({
  tabs,
  current,
  setCurrent,
  label = "Record sections",
}) {
  return (
    <div className="profile-tabs" aria-label={label}>
      {tabs.map((t) => (
        <button
          key={t}
          aria-pressed={current === t}
          onClick={() => setCurrent(t)}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
