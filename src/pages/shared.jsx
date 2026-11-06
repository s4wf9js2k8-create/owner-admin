import React from "react";
import { sectors } from "../model";
import { Panel, Table, Status, Empty } from "../components";
export function OrganisationRows({ orgs, profile, preview }) {
  return orgs.length ? (
    <Table
      headings={["Organisation", "Sector", "Status", "Package", "Actions"]}
    >
      {orgs.map((o) => (
        <tr key={o.id}>
          <th scope="row">{o.name}</th>
          <td>{sectors[o.sector].label}</td>
          <td>
            <Status>{o.status}</Status>
          </td>
          <td>{o.plan}</td>
          <td>
            <button onClick={() => profile(o.id)}>Profile</button>
            {preview && o.status !== "Archived" && (
              <button onClick={() => preview(o.id)}>Preview</button>
            )}
          </td>
        </tr>
      ))}
    </Table>
  ) : (
    <Empty>No organisations match your search.</Empty>
  );
}
export function Activity({ logs }) {
  return (
    <Panel title="Recent local activity">
      <p>Browser-session events only; no secure server audit trail.</p>
      {logs.length ? (
        <Table headings={["Time", "Event"]}>
          {logs.map((l) => (
            <tr key={l.id}>
              <td>{l.time}</td>
              <td>{l.event}</td>
            </tr>
          ))}
        </Table>
      ) : (
        <Empty>Make a demonstration change to see activity here.</Empty>
      )}
    </Panel>
  );
}
