import React, { useEffect, useState } from "react";
import { createOfflineBackend } from "./backend/offline.js";
import { Panel } from "./components";

/** Explicitly synthetic role-switching lab; never a production login surface. */
export default function CompanyOnboarding({ onClose }) {
  const [service] = useState(() => createOfflineBackend());
  const [uid, setUid] = useState("owner");
  const [data, setData] = useState(null);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const [invite, setInvite] = useState(null);
  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError("");
    (async () => {
      const client = await service.fakeLogin(uid);
      const orgs = await (uid === "owner"
        ? client.companies.list()
        : client.organisations.list());
      const packages = await client.packages.list();
      const requests =
        uid === "owner"
          ? await client.approvals.list()
          : (
              await Promise.all(
                orgs.map((o) => client.workspace.requests(o.id)),
              )
            ).flat();
      if (!cancelled) setData({ uid, client, orgs, packages, requests });
    })().catch((e) => {
      if (!cancelled) setError(e.code ?? "UNAVAILABLE");
    });
    return () => {
      cancelled = true;
    };
  }, [service, uid, revision]);
  const run = async (action) => {
    try {
      setError("");
      await action();
      setRevision((n) => n + 1);
    } catch (e) {
      setError(e.code ?? "UNAVAILABLE");
    }
  };
  return (
    <div className="shell">
      <main id="main" className="onboarding-lab">
        <section>
          <h1>Company onboarding simulation</h1>
          <p>
            Fictional offline workflow · no live authentication, invitations,
            payments or persistence. Owner Admin is for the Channel Systems
            operator; company admins use only their own workspace.
          </p>
          <button onClick={onClose}>Return to public demonstration</button>
          <label>
            Simulated identity
            <select value={uid} onChange={(e) => setUid(e.target.value)}>
              <option value="owner">Channel Systems operator</option>
              <option value="alice">Alpha company admin</option>
              <option value="bob">Beta company admin</option>
              <option value="viewer">Alpha viewer</option>
              <option value="guest">Invited fictional admin</option>
            </select>
          </label>
          {error && (
            <p role="alert">
              Simulation action failed: {error}. Reload the workspace and retry.
            </p>
          )}
          {(!data || data.uid !== uid) && !error && <p role="status">Loading fictional workspace…</p>}
          {data && data.uid === uid && (
            <>
              {uid === "owner" && (
                <>
                  <Panel title="Onboard a fictional company">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const values = new FormData(e.currentTarget);
                        run(() =>
                          data.client.companies.create({
                            name: values.get("name"),
                            package: values.get("package"),
                            color: values.get("color"),
                          }),
                        );
                      }}
                    >
                      <label>
                        Fictional company name
                        <input name="name" required maxLength={100} />
                      </label>
                      <label>
                        Initial package
                        <select name="package">
                          {data.packages.map((p) => (
                            <option key={p.name}>{p.name}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Initial brand colour
                        <input
                          name="color"
                          type="color"
                          defaultValue="#28533a"
                        />
                      </label>
                      <button type="submit">Create fictional company</button>
                    </form>
                  </Panel>
                  <Panel title="Draft package templates">
                    <p>
                      Prices are configurable placeholders in GBP; unset means
                      not quoted. Template edits affect future assignments only.
                    </p>
                    {data.packages.map((p) => (
                      <form
                        key={p.name}
                        onSubmit={(e) => {
                          e.preventDefault();
                          const values = new FormData(e.currentTarget);
                          run(() =>
                            data.client.packages.update(
                              p.name,
                              {
                                monthly:
                                  values.get("price") === ""
                                    ? null
                                    : Number(values.get("price")),
                                modules: values.get("reporting")
                                  ? ["tasks", "reporting"]
                                  : ["tasks"],
                              },
                              p.version,
                            ),
                          );
                        }}
                      >
                        <h3>{p.name}</h3>
                        <label>
                          {p.name} draft monthly price
                          <input
                            name="price"
                            type="number"
                            min="0"
                            max="100000"
                            step="1"
                            defaultValue={p.monthly ?? ""}
                          />
                        </label>
                        <label>
                          <input
                            name="reporting"
                            type="checkbox"
                            defaultChecked={p.modules.includes("reporting")}
                          />
                          Include reporting (tasks always included)
                        </label>
                        <button>Save {p.name} template</button>
                      </form>
                    ))}
                  </Panel>
                  <Panel title="Package approval queue">
                    {data.requests.length === 0 ? (
                      <p>No requests.</p>
                    ) : (
                      data.requests.map((r) => (
                        <div key={r.id}>
                          <p>
                            {data.orgs.find((o) => o.id === r.orgId)?.name}{" "}
                            requests {r.package ?? `${r.feature} feature`}:{" "}
                            {r.status}
                          </p>
                          {r.status === "pending" &&
                            ["approved", "rejected"].map((decision) => (
                              <button
                                key={decision}
                                onClick={() =>
                                  run(() =>
                                    data.client.approvals.decide(
                                      r.id,
                                      decision,
                                      r.version,
                                      data.orgs.find((o) => o.id === r.orgId)
                                        .version,
                                    ),
                                  )
                                }
                              >
                                {decision === "approved" ? "Approve" : "Reject"}{" "}
                                {r.package ?? `${r.feature} feature`}
                              </button>
                            ))}
                        </div>
                      ))
                    )}
                  </Panel>
                </>
              )}
              {data.orgs.length === 0 && (
                <p>
                  No company membership. Ask the simulated operator for an
                  invitation.
                </p>
              )}
              {data.orgs.map((org) => (
                <Panel key={org.id} title={org.name}>
                  <div
                    style={{
                      borderLeft: `6px solid ${org.color}`,
                      paddingLeft: 12,
                    }}
                  >
                    <p>
                      Subscribed package: <strong>{org.package}</strong> ·{" "}
                      {org.status}
                    </p>
                    <p>Available modules: {org.modules.join(", ") || "none"}</p>
                    {uid === "owner" ? (
                      <>
                        <p>Operator management only</p>
                        <label>
                          Package for {org.name}
                          <select
                            value={org.package}
                            onChange={(e) =>
                              run(() =>
                                data.client.companies.update(
                                  org.id,
                                  { package: e.target.value },
                                  org.version,
                                ),
                              )
                            }
                          >
                            {data.packages.map((p) => (
                              <option key={p.name}>{p.name}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Brand for {org.name}
                          <input
                            type="color"
                            value={org.color}
                            onChange={(e) =>
                              run(() =>
                                data.client.companies.update(
                                  org.id,
                                  { color: e.target.value },
                                  org.version,
                                ),
                              )
                            }
                          />
                        </label>
                        <label>
                          <input
                            type="checkbox"
                            checked={org.overrides.includes("reporting")}
                            onChange={(e) =>
                              run(() =>
                                data.client.companies.update(
                                  org.id,
                                  {
                                    overrides: e.target.checked
                                      ? ["reporting"]
                                      : [],
                                  },
                                  org.version,
                                ),
                              )
                            }
                          />
                          Approved reporting override for {org.name}
                        </label>
                        <button
                          onClick={() =>
                            run(() =>
                              data.client.companies.update(
                                org.id,
                                {
                                  status:
                                    org.status === "active"
                                      ? "suspended"
                                      : "active",
                                },
                                org.version,
                              ),
                            )
                          }
                        >
                          {org.status === "active" ? "Suspend" : "Reactivate"}{" "}
                          {org.name}
                        </button>
                        <button
                          onClick={() =>
                            run(async () =>
                              setInvite({
                                ...(await data.client.companies.inviteAdmin(
                                  org.id,
                                  "guest",
                                )),
                                name: org.name,
                              }),
                            )
                          }
                        >
                          Invite fictional admin to {org.name}
                        </button>
                      </>
                    ) : (
                      <>
                        <p>
                          Company settings: brand {org.color}. Package and
                          module activation require Channel Systems approval.
                        </p>
                        {uid !== "viewer" && (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              const values = new FormData(e.currentTarget);
                              run(() =>
                                data.client.workspace.request(org.id, {
                                  package: values.get("package"),
                                }),
                              );
                            }}
                          >
                            <label>
                              Requested package for {org.name}
                              <select name="package">
                                {data.packages
                                  .filter((p) => p.name !== org.package)
                                  .map((p) => (
                                    <option key={p.name}>{p.name}</option>
                                  ))}
                              </select>
                            </label>
                            <button>
                              Request package change for {org.name}
                            </button>
                          </form>
                        )}
                        {uid !== "viewer" &&
                          !org.modules.includes("reporting") && (
                            <button
                              onClick={() =>
                                run(() =>
                                  data.client.workspace.request(org.id, {
                                    feature: "reporting",
                                  }),
                                )
                              }
                            >
                              Request reporting feature for {org.name}
                            </button>
                          )}
                        {data.requests
                          .filter((r) => r.orgId === org.id)
                          .map((r) => (
                            <p key={r.id}>
                              Request: {r.package ?? `${r.feature} feature`} —{" "}
                              {r.status}
                            </p>
                          ))}
                      </>
                    )}
                  </div>
                </Panel>
              ))}
              {invite && (
                <Panel title="Mock invitation">
                  <p>
                    Invitation for fictional guest to {invite.name}; no message
                    was sent.
                  </p>
                  {uid === "guest" && (
                    <button
                      onClick={() =>
                        run(async () => {
                          await data.client.invitations.accept(invite.token);
                          setInvite(null);
                        })
                      }
                    >
                      Accept fictional admin invitation
                    </button>
                  )}
                </Panel>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
