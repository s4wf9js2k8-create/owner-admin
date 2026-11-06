import React from "react";
import { Panel, Table } from "../components";
export default function UsersPage({ controller }) {
  const { orgs, profile } = controller;
  return (
    <Panel title="Administrator directory">
      <p>
        Roles are illustrative labels only. No authenticated sessions or
        invitations exist.
      </p>
      <Table
        headings={["Organisation", "Sample administrator", "Role", "Manage"]}
      >
        {orgs.flatMap((o) =>
          o.admins.map((a, i) => (
            <tr key={o.id + i}>
              <td>{o.name}</td>
              <th scope="row">{a.name}</th>
              <td>{a.role}</td>
              <td>
                <button onClick={() => profile(o.id)}>Manage profile</button>
              </td>
            </tr>
          )),
        )}
      </Table>
    </Panel>
  );
}
