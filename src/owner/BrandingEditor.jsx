import { dashboardWidgetsFor } from "./rules";
import React, { useState } from "react";
import { sectors } from "../model";
export default function BrandingEditor({ controller: c }) {
  const o = c.active,
    [color, setColor] = useState(o.color),
    [secondary, setSecondary] = useState(
      o.workspaceConfig?.secondaryColor || "#374f60",
    ),
    [welcome, setWelcome] = useState(o.workspaceConfig?.welcomeText || ""),
    [logo, setLogo] = useState(o.logo || ""),
    [message, setMessage] = useState("");
  return (
    <div>
      <span className="eyebrow">CLIENT EXPERIENCE</span>
      <h2>Branding templates</h2>
      <label>
        Organisation
        <select
          aria-label="Organisation"
          value={c.selected}
          onChange={(e) => {
            c.setSelected(e.target.value);
            const next = c.orgs.find((o) => o.id === e.target.value);
            setColor(next.color);
            setSecondary(next.workspaceConfig?.secondaryColor || "#374f60");
            setWelcome(next.workspaceConfig?.welcomeText || "");
            setLogo(next.logo || "");
          }}
        >
          {c.orgs.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </label>
      <div className="settings-layout">
        <form
          className="panel"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = Object.fromEntries(new FormData(e.currentTarget));
            if (
              await c.update(
                o.id,
                {
                  color,
                  logo,
                  workspaceConfig: {
                    ...o.workspaceConfig,
                    welcomeText: welcome,
                    secondaryColor: secondary,
                    dashboardPreset: f.preset,
                    dashboardPrefs: {
                      ...o.workspaceConfig?.dashboardPrefs,
                      widgets: dashboardWidgetsFor(f.preset),
                    },
                    navLabels: Object.fromEntries(
                      o.modules.map((m, i) => [m, f["label" + i] || m]),
                    ),
                  },
                },
                "Updated sample client branding",
              )
            )
              setMessage("Branding applied only to " + o.name);
          }}
        >
          <label>
            Brand accent
            <input
              aria-label="Brand accent colour"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </label>
          <label>
            Secondary colour
            <input
              type="color"
              value={secondary}
              onChange={(e) => setSecondary(e.target.value)}
            />
          </label>
          <label>
            Customer welcome message
            <input
              value={welcome}
              onChange={(e) => setWelcome(e.target.value)}
            />
          </label>
          <label>
            Dashboard preset
            <select
              name="preset"
              defaultValue={o.workspaceConfig?.dashboardPreset || "Operations"}
            >
              {["Operations", "Engineering", "Community", "Visitor"].map(
                (p) => (
                  <option key={p}>{p}</option>
                ),
              )}
            </select>
          </label>
          <label>
            Company logo (local, up to 200 KB)
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (
                  f.size > 200000 ||
                  !["image/png", "image/jpeg"].includes(f.type)
                ) {
                  setMessage("Choose a PNG/JPEG up to 200 KB.");
                  return;
                }
                const r = new FileReader();
                r.onload = () => setLogo(r.result);
                r.readAsDataURL(f);
              }}
            />
          </label>
          <details>
            <summary>Module navigation labels</summary>
            {o.modules.map((m, i) => (
              <label key={m}>
                {m}
                <input
                  name={"label" + i}
                  defaultValue={o.workspaceConfig?.navLabels?.[m] || m}
                />
              </label>
            ))}
          </details>
          <div className="owner-quick-actions">
            <button>Apply to fictional company</button>
            <button
              type="button"
              onClick={() => {
                setColor(sectors[o.sector].color);
                setSecondary("#374f60");
                setWelcome("");
                setLogo("");
                setMessage("Default preview restored. Apply to save.");
              }}
            >
              Reset branding preview
            </button>
          </div>
        </form>
        <article className="panel">
          <h3>Live workspace appearance</h3>
          <button onClick={() => c.preview(o.id)}>
            Open selected customer workspace
          </button>
          <div
            className="owner-brand-sample"
            style={{ borderColor: color, background: "#f5f8f8" }}
          >
            <header
              style={{ background: secondary, color: "#fff", padding: 12 }}
            >
              {logo && <img src={logo} alt="Local company logo preview" />}
              {o.name}
            </header>
            <h3 style={{ color }}>Dashboard preview</h3>
            <p>{welcome || "Company welcome message"}</p>
            <p>{o.modules.length} enabled modules</p>
          </div>
          <p>
            Logo bytes and settings remain in memory. Nothing is uploaded to
            permanent storage.
          </p>
        </article>
      </div>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
