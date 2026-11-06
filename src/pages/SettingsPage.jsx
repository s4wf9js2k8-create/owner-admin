import React from "react";
import { Panel, Table } from "../components";
export default function SettingsPage({ controller }) {
  const { flags, setFlags, log } = controller;
  return (
    <>
      <Panel title="Platform health">
        <Table headings={["Service", "State"]}>
          {[
            ["Frontend", "Local demonstration"],
            ["Authentication", "Not connected"],
            ["Database", "Not connected"],
            ["Payments", "Disabled"],
            ["Backup / recovery", "Not implemented"],
            ["EVLT systems", "Disconnected — never accessed"],
          ].map(([k, v]) => (
            <tr key={k}>
              <th scope="row">{k}</th>
              <td>{v}</td>
            </tr>
          ))}
        </Table>
      </Panel>
      <Panel title="Local feature flags">
        <label className="module">
          <input
            type="checkbox"
            checked={flags.customerPreview}
            onChange={(e) => {
              setFlags({ customerPreview: e.target.checked });
              log("Changed local customer preview flag");
            }}
          />
          Enable customer workspace preview
        </label>
        <p>
          Flags control this demonstration’s interface. They are not access
          control or production settings.
        </p>
      </Panel>
    </>
  );
}
