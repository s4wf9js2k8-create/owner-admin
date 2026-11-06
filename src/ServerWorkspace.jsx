import React, { useState } from "react";
import { createPostgresClient } from "./backend/postgres";
import { Panel } from "./components";
import ServerManagement from "./ServerManagement";
export default function ServerWorkspace({ onClose }) {
  const [client] = useState(() => createPostgresClient());
  const [session, setSession] = useState(null),
    [companies, setCompanies] = useState([]),
    [storage, setStorage] = useState(null),
    [records, setRecords] = useState([]),
    [selected, setSelected] = useState(""),
    [module, setModule] = useState("tasks"),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const run = async (fn) => {
    setBusy(true);
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setMessage(e.message);
      if (e.message === "UNAUTHENTICATED") {
        setSession(null);
        setCompanies([]);
        setStorage(null);
        setRecords([]);
      }
    } finally {
      setBusy(false);
    }
  };
  const refresh = async (owner) => {
    const rows = await client.call("GET", "/companies");
    setCompanies(rows);
    setStorage(owner ? await client.call("GET", "/owner/storage") : null);
  };
  const formValues = (e) => Object.fromEntries(new FormData(e.currentTarget));
  return (
    <main id="main">
      <section>
        <h1>Private server workspace</h1>
        <p>
          Connects only to this site's /api endpoint. The fictional
          demonstration stays separate. This self-hosted backend requires
          further security review before commercial use.
        </p>
        <button
          disabled={busy}
          onClick={() =>
            run(async () => {
              if (session) await client.auth.logout();
              onClose();
            })
          }
        >
          Return to fictional demonstration
        </button>
        {message && <p role="alert">{message}</p>}
        {!session ? (
          <>
            <Panel title="Server sign in">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const values = formValues(e);
                  run(async () => {
                    const result = await client.auth.login(values);
                    setSelected("");
                    setRecords([]);
                    setSession(result);
                    await refresh(result.platformAdmin);
                  });
                }}
              >
                <label>
                  Email
                  <input
                    name="email"
                    type="email"
                    autoComplete="username"
                    required
                  />
                </label>
                <label>
                  Password
                  <input
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    maxLength={128}
                  />
                </label>
                <button disabled={busy}>Sign in to private server</button>
              </form>
            </Panel>
            <Panel title="Password recovery">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const values = formValues(e);
                  run(async () => {
                    const result = await client.call(
                      "POST",
                      "/auth/recovery",
                      values,
                    );
                    setMessage(result.message);
                  });
                }}
              >
                <label>
                  Recovery email
                  <input name="email" type="email" required />
                </label>
                <button disabled={busy}>
                  Request private recovery instructions
                </button>
              </form>
              <p>
                Recovery instructions are prepared in the server's private
                delivery spool. An operator must verify the requester before
                sharing them; no email provider is connected.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const values = formValues(e);
                  run(async () => {
                    await client.call("POST", "/auth/reset", values);
                    setMessage("Password reset. Sign in again.");
                  });
                }}
              >
                <label>
                  Recovery token
                  <input name="token" required autoComplete="off" />
                </label>
                <label>
                  New password
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={12}
                    maxLength={128}
                    autoComplete="new-password"
                  />
                </label>
                <button disabled={busy}>Reset server password</button>
              </form>
            </Panel>
          </>
        ) : (
          <>
            <p>
              {session.platformAdmin
                ? "Channel Systems operator"
                : "Company workspace"}{" "}
              · authenticated server session
            </p>
            <button
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await client.auth.logout();
                  setSession(null);
                  setCompanies([]);
                  setRecords([]);
                  setStorage(null);
                })
              }
            >
              Sign out of server
            </button>
            <button
              disabled={busy}
              onClick={() => run(() => refresh(session.platformAdmin))}
            >
              Refresh server data
            </button>
            {session.platformAdmin && (
              <>
                <ServerManagement client={client} storage={storage} busy={busy} onRefresh={() => run(() => refresh(true))} />
                <Panel title="Create server company">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const values = formValues(e);
                      run(async () => {
                        await client.call("POST", "/owner/companies", values);
                        await refresh(true);
                      });
                    }}
                  >
                    <label>
                      Company name
                      <input name="name" required maxLength={100} />
                    </label>
                    <label>
                      Server package
                      <select name="package">
                        {["Essential", "Professional", "Enterprise"].map(
                          (p) => (
                            <option key={p}>{p}</option>
                          ),
                        )}
                      </select>
                    </label>
                    <button disabled={busy}>Create server company</button>
                  </form>
                </Panel>
                <Panel title="Create server account">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const values = formValues(e);
                      run(async () => {
                        const result = await client.call(
                          "POST",
                          "/owner/accounts",
                          values,
                        );
                        setMessage("Created account ID: " + result.id);
                      });
                    }}
                  >
                    <label>
                      Account email
                      <input name="email" type="email" required />
                    </label>
                    <label>
                      Initial account password
                      <input
                        name="password"
                        type="password"
                        minLength={12}
                        maxLength={128}
                        required
                        autoComplete="new-password"
                      />
                    </label>
                    <button disabled={busy}>Create company account</button>
                  </form>
                  <p>
                    Share initial credentials only through an independently
                    verified private channel. Company accounts never receive
                    platform privileges.
                  </p>
                </Panel>
                <Panel title="Assign company membership">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const { company, account, role } = formValues(e);
                      run(() =>
                        client.call(
                          "PUT",
                          `/companies/${encodeURIComponent(company)}/memberships/${encodeURIComponent(account)}`,
                          { role, status: "active" },
                        ),
                      );
                    }}
                  >
                    <label>
                      Membership company
                      <select name="company">
                        {companies.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Account ID
                      <input name="account" required />
                    </label>
                    <label>
                      Company role
                      <select name="role">
                        {[
                          "viewer",
                          "staff",
                          "manager",
                          "organisation-admin",
                        ].map((r) => (
                          <option key={r}>{r}</option>
                        ))}
                      </select>
                    </label>
                    <button disabled={busy}>Assign new membership</button>
                  </form>
                </Panel>
              </>
            )}
            {companies.map((c) => (
              <Panel key={c.id} title={c.name}>
                <div
                  style={{
                    borderLeft: `6px solid ${c.color}`,
                    paddingLeft: 12,
                  }}
                >
                  <p>
                    {c.package} · {c.status} · {c.modules.join(", ")}
                  </p>
                  <small>Company ID: {c.id}</small>
                  {session.platformAdmin ? (
                    <button
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          await client.call(
                            "PATCH",
                            `/owner/companies/${c.id}`,
                            {
                              version: c.version,
                              status:
                                c.status === "active" ? "suspended" : "active",
                            },
                          );
                          await refresh(true);
                        })
                      }
                    >
                      {c.status === "active" ? "Suspend" : "Reactivate"} server
                      company {c.name}
                    </button>
                  ) : (
                    <button
                      disabled={busy}
                      onClick={() => {
                        setSelected(c.id);
                        setRecords([]);
                        setModule(
                          c.modules.includes("tasks")
                            ? "tasks"
                            : (c.modules[0] ?? "tasks"),
                        );
                      }}
                    >
                      Open {c.name} records
                    </button>
                  )}
                </div>
              </Panel>
            ))}
            {!session.platformAdmin && selected && (
              <Panel title="Company records">
                <label>
                  Record module
                  <select
                    value={module}
                    onChange={(e) => {
                      setModule(e.target.value);
                      setRecords([]);
                    }}
                  >
                    {(companies.find((c) => c.id === selected)?.modules ?? [])
                      .filter((m) => m !== "reporting")
                      .map((m) => (
                        <option key={m}>{m}</option>
                      ))}
                  </select>
                </label>
                <button
                  disabled={busy}
                  onClick={() =>
                    run(async () =>
                      setRecords(await client.records.list(selected, module)),
                    )
                  }
                >
                  Load company records
                </button>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const { title } = formValues(e);
                    run(async () => {
                      await client.records.create(selected, { module, title });
                      setRecords(await client.records.list(selected, module));
                    });
                  }}
                >
                  <label>
                    Record title
                    <input name="title" required maxLength={100} />
                  </label>
                  <button disabled={busy}>Create server record</button>
                </form>
                {records.map((r) => (
                  <div key={r.id}>
                    <p>
                      {r.title} · {r.progress}%
                    </p>
                    <button
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          await client.records.update(
                            selected,
                            r.id,
                            { progress: 100 },
                            r.version,
                          );
                          setRecords(
                            await client.records.list(selected, module),
                          );
                        })
                      }
                    >
                      Complete {r.title}
                    </button>
                    <button
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          await client.records.delete(
                            selected,
                            r.id,
                            r.version,
                          );
                          setRecords(
                            await client.records.list(selected, module),
                          );
                        })
                      }
                    >
                      Delete {r.title}
                    </button>
                  </div>
                ))}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const file = new FormData(e.currentTarget).get("file");
                    run(async () => {
                      await client.call(
                        "POST",
                        `/companies/${selected}/files`,
                        new Uint8Array(await file.arrayBuffer()),
                        { "X-File-Name": file.name },
                      );
                      setMessage("File uploaded privately.");
                    });
                  }}
                >
                  <label>
                    Company document or photo
                    <input
                      name="file"
                      type="file"
                      accept="application/pdf,image/png,image/jpeg"
                      required
                    />
                  </label>
                  <button disabled={busy}>Upload company file</button>
                </form>
              </Panel>
            )}
          </>
        )}
      </section>
    </main>
  );
}
