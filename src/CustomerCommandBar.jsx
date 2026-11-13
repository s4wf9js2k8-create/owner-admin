import React, { useState, useEffect, useRef } from "react";
import { Command, Search, ArrowRight, Plus, BookmarkPlus } from "lucide-react";
import { isTaskModule, moduleInfo } from "./customerModules";

export default function CustomerCommandBar({
  org,
  records,
  onNavigate,
  canEdit,
}) {
  const [palette, setPalette] = useState(false);
  const root = useRef(null),
    input = useRef(null),
    previous = useRef(null);
  useEffect(() => {
    const open = () => {
      previous.current = document.activeElement;
      setPalette(true);
      requestAnimationFrame(() => input.current?.focus());
    };
    window.addEventListener("channel-open-search", open);
    return () => window.removeEventListener("channel-open-search", open);
  }, []);
  const close = () => {
    setPalette(false);
    previous.current?.focus();
  };
  const trap = (e) => {
    if (!palette) return;
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
    if (e.key === "Tab") {
      const items = [
        ...root.current.querySelectorAll("button:not(:disabled),input,select"),
      ];
      const first = items[0],
        last = items.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  };
  const [query, setQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState("All modules");
  const [saved, setSaved] = useState([]);
  const [saveName, setSaveName] = useState("");
  const search = query.trim().toLowerCase();
  const matches = records
    .filter(
      (r) => !["inspection-template", "report-config"].includes(r.recordType),
    )
    .filter(
      (r) =>
        (moduleFilter === "All modules" || r.module === moduleFilter) &&
        [
          r.title,
          r.detail,
          r.owner,
          r.asset,
          r.company,
          r.contact,
          r.location,
          r.reference,
        ]
          .join(" ")
          .toLowerCase()
          .includes(search),
    )
    .slice(0, 7);
  const commands = [
    { title: "Open Tasks & Projects", target: "Tasks & projects" },
    {
      title: "Open shift rota",
      target: org.modules.find((m) => ["Shift rotas", "Schedules"].includes(m)),
    },
    {
      title: "Open asset register",
      target: org.modules.find((m) =>
        ["Assets & equipment", "Assets"].includes(m),
      ),
    },
    {
      title: "Open staff directory",
      target: org.modules.find((m) =>
        ["Staff & volunteers", "Volunteers", "Staff"].includes(m),
      ),
    },
    { title: "Open calendar", target: "Calendar" },
    ...(canEdit
      ? [
          {
            title: "Create a task",
            keywords: "create task",
            target: "Tasks & projects",
            create: true,
          },
          {
            title: "Raise maintenance job",
            target: org.modules.find(
              (m) => moduleInfo(m).type === "maintenance",
            ),
            create: true,
          },
          {
            title: "Add customer",
            target: org.modules.find((m) => moduleInfo(m).type === "crm"),
            create: true,
          },
          {
            title: "Start inspection",
            target: org.modules.find(
              (m) => moduleInfo(m).type === "inspections",
            ),
            create: true,
          },
          {
            title: "Create booking",
            target: org.modules.find((m) => moduleInfo(m).type === "bookings"),
            create: true,
          },
        ]
      : []),
  ].filter(
    (c) =>
      c.target &&
      (c.target === "Calendar" ||
        (c.target === "Tasks & projects" && org.modules.some(isTaskModule)) ||
        org.modules.includes(c.target)),
  );
  const suggested = commands.filter(
    (c) =>
      !search ||
      (c.title + " " + (c.keywords || "")).toLowerCase().includes(search),
  );
  const show = palette || search.length > 0;
  const go = (target, recordId, create) => {
    onNavigate(target, { recordId, create });
    setQuery("");
    if (palette) close();
  };
  return (
    <div
      ref={root}
      onKeyDown={trap}
      role={palette ? "dialog" : undefined}
      aria-modal={palette ? true : undefined}
      aria-label={palette ? "Global search palette" : undefined}
      className={"command-console " + (palette ? "command-palette" : "")}
    >
      <div className="palette-heading">
        {palette && (
          <>
            <strong>Search permitted records & commands</strong>
            <button onClick={close}>Close search</button>
          </>
        )}
      </div>
      <div className="command-input-row">
        <Search size={18} />
        <input
          ref={input}
          aria-label="Search or run a command"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search everything, or type a command…"
        />
        <label>
          In
          <select
            aria-label="Global search module"
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
          >
            <option>All modules</option>
            {org.modules.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
      </div>
      {show && (
        <div
          className="command-results"
          role="region"
          aria-label="Global search results"
        >
          {suggested.length > 0 && (
            <div className="command-results-group">
              <small>COMMANDS</small>
              {suggested.map((c) => (
                <button
                  key={c.title}
                  onClick={() => go(c.target, null, c.create)}
                >
                  {c.create ? <Plus size={16} /> : <Command size={16} />}{" "}
                  {c.title}
                  <ArrowRight size={14} />
                </button>
              ))}
            </div>
          )}
          <div className="command-results-group">
            <small>RESULTS · {matches.length} shown</small>
            {matches.map((r) => (
              <button
                key={r.id}
                onClick={() =>
                  go(
                    isTaskModule(r.module) ? "Tasks & projects" : r.module,
                    r.id,
                    false,
                  )
                }
              >
                <span>
                  <strong>{r.title}</strong>
                  <small>
                    {moduleInfo(r.module).title} ·{" "}
                    {r.owner || r.asset || r.location || "Sample record"}
                  </small>
                </span>
                <ArrowRight size={14} />
              </button>
            ))}
            {!matches.length && (
              <p className="muted">
                No matching records in your permitted modules.
              </p>
            )}
          </div>
          <div className="command-save">
            <input
              aria-label="Name global search"
              placeholder="Name this search"
              maxLength={40}
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
            />
            <button
              onClick={() => {
                if (saveName.trim()) {
                  setSaved((old) => [
                    ...old.filter((i) => i.name !== saveName.trim()),
                    { name: saveName.trim(), query, moduleFilter },
                  ]);
                  setSaveName("");
                }
              }}
            >
              <BookmarkPlus size={15} /> Save search
            </button>
          </div>
        </div>
      )}
      {saved.length > 0 && (
        <div className="command-saved">
          <small>Saved this session:</small>
          {saved.map((item) => (
            <button
              key={item.name}
              onClick={() => {
                setQuery(item.query);
                setModuleFilter(item.moduleFilter);
              }}
            >
              {item.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
