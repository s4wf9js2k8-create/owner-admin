import React from "react";
import { modules, toggleModule } from "../model";
import { Panel } from "../components";
export default function ModulesPage({ controller }) {
  const { selected, setSelected, orgs, active, update } = controller;
  return (
    <Panel title="Module catalogue">
      <label>
        Organisation
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          {orgs.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </label>
      <p>
        Dependencies are enabled automatically. Disabling a dependency also
        disables dependent modules. Demo configuration does not enforce
        production permissions.
      </p>
      <div className="module-grid">
        {modules.map((m) => (
          <label className="module" key={m.name}>
            <input
              type="checkbox"
              checked={active.modules.includes(m.name)}
              onChange={() =>
                update(
                  active.id,
                  { modules: toggleModule(active.modules, m.name) },
                  "Changed sample module access: " + m.name,
                )
              }
            />
            <span>
              <b>{m.name}</b>
              <small>
                {m.description}
                {m.requires && " Requires: " + m.requires.join(", ")}
              </small>
            </span>
          </label>
        ))}
      </div>
    </Panel>
  );
}
