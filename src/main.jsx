import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  LayoutDashboard,
  Building2,
  Blocks,
  CreditCard,
  Users,
  LifeBuoy,
  ScrollText,
  Settings,
  ShieldAlert,
  Menu,
  X,
} from "lucide-react";
import {
  modules,
  sectors,
  plans as initialPlans,
  starter,
  createOrganisation,
  toggleModule,
  seedRecords,
  updateRecord,
} from "./model";
import {
  Panel,
  Table,
  Status,
  Empty,
  Modal,
  OrganisationForm,
} from "./components";
import CustomerWorkspace from "./CustomerWorkspace";
import "./style.css";
const pages = [
  ["Overview", LayoutDashboard],
  ["Organisations", Building2],
  ["Company Profile", Building2],
  ["Modules", Blocks],
  ["Subscriptions", CreditCard],
  ["Users", Users],
  ["Support", LifeBuoy],
  ["Activity Logs", ScrollText],
  ["Settings", Settings],
];
function App() {
  const [page, setPage] = useState("Overview"),
    [menuOpen, setMenuOpen] = useState(false),
    [orgs, setOrgs] = useState(starter),
    [selected, setSelected] = useState(starter[0].id),
    [query, setQuery] = useState(""),
    [statusFilter, setStatusFilter] = useState("All"),
    [form, setForm] = useState(null),
    [logs, setLogs] = useState([]),
    [message, setMessage] = useState(""),
    [plans, setPlans] = useState(initialPlans),
    [records, setRecords] = useState(() => seedRecords(starter)),
    [customer, setCustomer] = useState(false),
    [customerPage, setCustomerPage] = useState("Dashboard"),
    [confirm, setConfirm] = useState(null),
    [flags, setFlags] = useState({ customerPreview: true }),
    [ticketId, setTicketId] = useState("ticket-1");
  const [tickets, setTickets] = useState([
    {
      id: "ticket-1",
      orgId: starter[0].id,
      subject: "Configure volunteer attendance",
      priority: "Normal",
      status: "Open",
      history: [
        {
          kind: "Customer message (fictional)",
          text: "Can the attendance module be enabled for our demo?",
          time: "6 November 2026",
        },
      ],
    },
    {
      id: "ticket-2",
      orgId: starter[2].id,
      subject: "Review inspection workflow",
      priority: "High",
      status: "In progress",
      history: [],
    },
  ]);
  const menuRef = useRef(null),
    menuButton = useRef(null);
  const active = orgs.find((o) => o.id === selected) || orgs[0],
    ticket = tickets.find((t) => t.id === ticketId);
  const log = (event) => {
    setLogs((old) =>
      [
        {
          id: crypto.randomUUID(),
          event,
          time: new Date().toLocaleString("en-GB"),
        },
        ...old,
      ].slice(0, 200),
    );
    setMessage(event);
  };
  const update = (id, patch, event = "Updated example organisation") => {
    setOrgs((old) => old.map((o) => (o.id === id ? { ...o, ...patch } : o)));
    log(event);
  };
  const navigate = (name) => {
    setPage(name);
    setMenuOpen(false);
    setQuery("");
  };
  const profile = (id) => {
    setSelected(id);
    navigate("Company Profile");
  };
  const preview = (id) => {
    if (
      !flags.customerPreview ||
      !orgs.some((o) => o.id === id && o.status !== "Archived")
    )
      return;
    setSelected(id);
    setCustomer(true);
    setCustomerPage("Dashboard");
    setMenuOpen(false);
  };
  const closeMenu = () => {
    setMenuOpen(false);
    menuButton.current?.focus();
  };
  useEffect(() => {
    if (!menuOpen) return;
    menuRef.current?.querySelector("button")?.focus();
    const key = (e) => {
      if (e.key === "Escape") closeMenu();
      if (e.key === "Tab") {
        const els = [
          menuButton.current,
          ...menuRef.current.querySelectorAll("button"),
        ];
        const i = els.indexOf(document.activeElement);
        e.preventDefault();
        els[(i + (e.shiftKey ? -1 : 1) + els.length) % els.length]?.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [menuOpen]);
  const changeTicket = (patch) => {
    setTickets((old) =>
      old.map((t) => (t.id === ticketId ? { ...t, ...patch } : t)),
    );
    log("Updated sample ticket " + ticket.subject);
  };
  return (
    <div
      className="shell"
      style={{ "--brand": customer ? active.color : "#1e3a1e" }}
    >
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <button
          ref={menuButton}
          className="menu-toggle"
          aria-label={
            menuOpen ? "Close navigation menu" : "Open navigation menu"
          }
          aria-expanded={menuOpen}
          aria-controls="navigation"
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <span className="topbrand">
          {customer ? active.name : "Owner Admin"}
        </span>
        <span className="tag">Fictional demo</span>
        {customer && (
          <button
            className="header-action"
            onClick={() => {
              setCustomer(false);
              setMenuOpen(false);
            }}
          >
            Owner console
          </button>
        )}
      </header>
      {menuOpen && (
        <button
          className="nav-overlay"
          aria-label="Close navigation menu"
          onClick={closeMenu}
        />
      )}
      <aside
        ref={menuRef}
        id="navigation"
        className={menuOpen ? "menu-open" : ""}
        inert={!menuOpen ? "" : undefined}
      >
        <div className="brand">{customer ? active.name : "Owner Admin"}</div>
        <div className="sub">
          {customer ? "Customer workspace" : "Platform management"}
        </div>
        <nav aria-label="Main navigation">
          {(customer
            ? ["Dashboard", ...active.modules].map((n) => [n, LayoutDashboard])
            : pages
          ).map(([name, Icon]) => (
            <button
              key={name}
              aria-current={
                (customer ? customerPage : page) === name ? "page" : undefined
              }
              className={
                (customer ? customerPage : page) === name ? "selected" : ""
              }
              onClick={() => {
                if (customer) {
                  setCustomerPage(name);
                  setMenuOpen(false);
                } else navigate(name);
              }}
            >
              <Icon size={18} />
              {name}
            </button>
          ))}
        </nav>
        <div className="foot">
          Demo environment
          <br />
          Changes reset on refresh
        </div>
      </aside>
      <main id="main" tabIndex="-1">
        <section>
          <div className="demo-strip">
            <ShieldAlert size={18} />
            <span>
              Public demonstration · fictional data only · no authentication,
              payments or backend. Do not enter personal details or credentials.
            </span>
          </div>
          <div role="status" className="feedback">
            {message}
          </div>
          {customer ? (
            <>
              <div className="toolbar">
                <label>
                  Example workspace
                  <select
                    aria-label="Example workspace"
                    value={selected}
                    onChange={(e) => {
                      setSelected(e.target.value);
                      setCustomerPage("Dashboard");
                    }}
                  >
                    {orgs
                      .filter((o) => o.status !== "Archived")
                      .map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
              <CustomerWorkspace
                key={active.id + customerPage}
                org={active}
                records={records}
                page={customerPage}
                setPage={setCustomerPage}
                onAdd={(r) => {
                  setRecords((old) => [
                    ...old,
                    { ...r, id: crypto.randomUUID() },
                  ]);
                  log("Added sample " + r.module + " record");
                }}
                onUpdate={(orgId, id, patch) => {
                  setRecords((old) => updateRecord(old, orgId, id, patch));
                  log("Updated sample record progress");
                }}
              />
            </>
          ) : (
            <>
              <div className="heading">
                <div>
                  <small>OWNER CONSOLE</small>
                  <h1>{page}</h1>
                  <p>Organisation and platform management · demonstration</p>
                </div>
                <button
                  className="primary"
                  onClick={() => setForm({ type: "create" })}
                >
                  + Add example organisation
                </button>
              </div>
              {page === "Overview" && (
                <>
                  <div className="cards">
                    {[
                      [
                        "Organisations",
                        orgs.filter((o) => o.status !== "Archived").length,
                      ],
                      [
                        "Active subscriptions",
                        orgs.filter((o) => o.status === "Active").length,
                      ],
                      [
                        "Enabled modules",
                        orgs.reduce((n, o) => n + o.modules.length, 0),
                      ],
                      [
                        "Open support tickets",
                        tickets.filter((t) => t.status !== "Closed").length,
                      ],
                    ].map(([k, v]) => (
                      <article key={k}>
                        <small>{k}</small>
                        <strong>{v}</strong>
                      </article>
                    ))}
                  </div>
                  <div className="two-column">
                    <Panel title="Needs attention">
                      <p>
                        <Status>Trial</Status>{" "}
                        {orgs.filter((o) => o.status === "Trial").length}{" "}
                        organisations in trial
                      </p>
                      <p>
                        <Status>High</Status>{" "}
                        {
                          tickets.filter(
                            (t) =>
                              t.priority === "High" && t.status !== "Closed",
                          ).length
                        }{" "}
                        high-priority tickets
                      </p>
                      <p>
                        Production readiness: authentication, isolation and
                        backups pending.
                      </p>
                      <button onClick={() => navigate("Support")}>
                        Review support
                      </button>
                    </Panel>
                    <Panel title="Quick management">
                      <div className="quick-actions">
                        {[
                          "Organisations",
                          "Modules",
                          "Subscriptions",
                          "Activity Logs",
                        ].map((n) => (
                          <button key={n} onClick={() => navigate(n)}>
                            {n}
                          </button>
                        ))}
                      </div>
                      <p>
                        Explore four sectors using the same customer
                        application.
                      </p>
                      <button
                        disabled={
                          !flags.customerPreview ||
                          !orgs.some((o) => o.status !== "Archived")
                        }
                        onClick={() =>
                          preview(orgs.find((o) => o.status !== "Archived")?.id)
                        }
                      >
                        Explore customer workspace
                      </button>
                    </Panel>
                  </div>
                  <Panel title="Organisation directory">
                    <OrganisationRows
                      orgs={orgs.slice(0, 4)}
                      profile={profile}
                      preview={flags.customerPreview ? preview : null}
                    />
                  </Panel>
                  <Activity logs={logs.slice(0, 5)} />
                </>
              )}
              {page === "Organisations" && (
                <>
                  <div className="toolbar">
                    <input
                      aria-label="Search organisations"
                      placeholder="Search name or sector"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    <select
                      aria-label="Filter organisation status"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      {["All", "Trial", "Active", "Suspended", "Archived"].map(
                        (s) => (
                          <option key={s}>{s}</option>
                        ),
                      )}
                    </select>
                  </div>
                  <Panel title="All organisations">
                    <OrganisationRows
                      orgs={orgs.filter(
                        (o) =>
                          (o.name + " " + sectors[o.sector].label)
                            .toLowerCase()
                            .includes(query.toLowerCase()) &&
                          (statusFilter === "All" || o.status === statusFilter),
                      )}
                      profile={profile}
                      preview={flags.customerPreview ? preview : null}
                    />
                  </Panel>
                </>
              )}
              {page === "Company Profile" && (
                <>
                  <div className="toolbar">
                    <label>
                      Organisation
                      <select
                        value={selected}
                        onChange={(e) => setSelected(e.target.value)}
                      >
                        {orgs.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      onClick={() => setForm({ type: "edit", org: active })}
                    >
                      Edit profile
                    </button>
                    <button
                      disabled={
                        !flags.customerPreview || active.status === "Archived"
                      }
                      onClick={() => preview(active.id)}
                    >
                      Preview customer dashboard
                    </button>
                  </div>
                  <Panel title={active.name}>
                    <div className="org-meta">
                      <Status>{active.status}</Status>
                      <span>{sectors[active.sector].label}</span>
                      <small>{active.id}</small>
                    </div>
                    <div className="profile-grid">
                      <label>
                        Brand colour
                        <input
                          type="color"
                          value={active.color}
                          onChange={(e) =>
                            update(
                              active.id,
                              { color: e.target.value },
                              "Updated sample branding",
                            )
                          }
                        />
                      </label>
                      <label>
                        Account status
                        <select
                          value={active.status}
                          onChange={(e) =>
                            setConfirm({
                              id: active.id,
                              status: e.target.value,
                            })
                          }
                        >
                          {["Trial", "Active", "Suspended", "Archived"].map(
                            (s) => (
                              <option key={s}>{s}</option>
                            ),
                          )}
                        </select>
                      </label>
                      <label>
                        Internal sample notes
                        <textarea
                          value={active.notes}
                          maxLength={500}
                          onChange={(e) =>
                            setOrgs((old) =>
                              old.map((o) =>
                                o.id === active.id
                                  ? { ...o, notes: e.target.value }
                                  : o,
                              ),
                            )
                          }
                          onBlur={() => log("Updated sample profile notes")}
                        />
                      </label>
                    </div>
                    <p>
                      {active.modules.length} modules · {active.plan} ·{" "}
                      {active.cycle}
                    </p>
                    <button onClick={() => navigate("Modules")}>
                      Configure modules
                    </button>
                    <button onClick={() => navigate("Subscriptions")}>
                      Manage subscription
                    </button>
                  </Panel>
                  <Panel title="Example administrators">
                    <p>No accounts or invitations are created.</p>
                    {active.admins.map((a, i) => (
                      <div className="ticket" key={i}>
                        <span>{a.name}</span>
                        <select
                          aria-label={"Role for " + a.name}
                          value={a.role}
                          onChange={(e) =>
                            update(
                              active.id,
                              {
                                admins: active.admins.map((x, j) =>
                                  i === j ? { ...x, role: e.target.value } : x,
                                ),
                              },
                              "Changed sample administrator role",
                            )
                          }
                        >
                          {["Organisation admin", "Manager", "Viewer"].map(
                            (r) => (
                              <option key={r}>{r}</option>
                            ),
                          )}
                        </select>
                        <button
                          onClick={() =>
                            update(
                              active.id,
                              {
                                admins: active.admins.filter((_, j) => j !== i),
                              },
                              "Removed sample administrator",
                            )
                          }
                        >
                          Remove sample
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() =>
                        update(
                          active.id,
                          {
                            admins: [
                              ...active.admins,
                              {
                                name:
                                  "Sample coordinator " +
                                  (active.admins.length + 1),
                                role: "Viewer",
                              },
                            ],
                          },
                          "Added sample administrator",
                        )
                      }
                    >
                      Add sample administrator
                    </button>
                  </Panel>
                </>
              )}
              {page === "Modules" && (
                <Panel title="Module catalogue">
                  <label>
                    Organisation
                    <select
                      value={selected}
                      onChange={(e) => setSelected(e.target.value)}
                    >
                      {orgs.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p>
                    Dependencies are enabled automatically. Disabling a
                    dependency also disables dependent modules. Demo
                    configuration does not enforce production permissions.
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
                            {m.requires &&
                              " Requires: " + m.requires.join(", ")}
                          </small>
                        </span>
                      </label>
                    ))}
                  </div>
                </Panel>
              )}
              {page === "Subscriptions" && (
                <>
                  <Panel title="Illustrative packages">
                    <p>
                      Sample GBP prices only, not commercial offers. No charges,
                      invoices or payment processing occur.
                    </p>
                    <Table
                      headings={[
                        "Package",
                        "Monthly £",
                        "Annual £",
                        "Trial days",
                      ]}
                    >
                      {plans.map((p, i) => (
                        <tr key={p.name}>
                          <th scope="row">{p.name}</th>
                          {["monthly", "annual", "trial"].map((k) => (
                            <td key={k}>
                              <input
                                type="number"
                                min="0"
                                max={k === "trial" ? 90 : 100000}
                                step="1"
                                aria-label={p.name + " " + k}
                                value={p[k]}
                                onChange={(e) => {
                                  const n = Number(e.target.value);
                                  if (
                                    Number.isInteger(n) &&
                                    n >= 0 &&
                                    n <= (k === "trial" ? 90 : 100000)
                                  )
                                    setPlans((old) =>
                                      old.map((x, j) =>
                                        i === j ? { ...x, [k]: n } : x,
                                      ),
                                    );
                                }}
                                onBlur={() =>
                                  log(
                                    "Updated illustrative " +
                                      p.name +
                                      " pricing",
                                  )
                                }
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </Table>
                  </Panel>
                  <Panel title="Subscription configuration">
                    <label>
                      Organisation
                      <select
                        value={selected}
                        onChange={(e) => setSelected(e.target.value)}
                      >
                        {orgs.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="profile-grid">
                      <label>
                        Package
                        <select
                          value={active.plan}
                          onChange={(e) =>
                            setConfirm({ id: active.id, plan: e.target.value })
                          }
                        >
                          {plans.map((p) => (
                            <option key={p.name}>{p.name}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Billing cycle
                        <select
                          value={active.cycle}
                          onChange={(e) =>
                            update(
                              active.id,
                              { cycle: e.target.value },
                              "Changed sample billing cycle",
                            )
                          }
                        >
                          {["Monthly", "Annual"].map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Trial ends
                        <input
                          type="date"
                          value={active.trialEnds}
                          onChange={(e) =>
                            update(
                              active.id,
                              { trialEnds: e.target.value },
                              "Changed sample trial end",
                            )
                          }
                        />
                      </label>
                    </div>
                    <p>
                      <Status>{active.status}</Status> · Illustrative fee: £
                      {
                        plans.find((p) => p.name === active.plan)[
                          active.cycle === "Annual" ? "annual" : "monthly"
                        ]
                      }{" "}
                      / {active.cycle === "Annual" ? "year" : "month"}
                    </p>
                  </Panel>
                  <Panel title="Billing history">
                    <Empty>
                      No real billing history. Package changes appear in the
                      local activity log; no invoices or payments have been
                      created.
                    </Empty>
                  </Panel>
                </>
              )}
              {page === "Users" && (
                <Panel title="Administrator directory">
                  <p>
                    Roles are illustrative labels only. No authenticated
                    sessions or invitations exist.
                  </p>
                  <Table
                    headings={[
                      "Organisation",
                      "Sample administrator",
                      "Role",
                      "Manage",
                    ]}
                  >
                    {orgs.flatMap((o) =>
                      o.admins.map((a, i) => (
                        <tr key={o.id + i}>
                          <td>{o.name}</td>
                          <th scope="row">{a.name}</th>
                          <td>{a.role}</td>
                          <td>
                            <button onClick={() => profile(o.id)}>
                              Manage profile
                            </button>
                          </td>
                        </tr>
                      )),
                    )}
                  </Table>
                </Panel>
              )}
              {page === "Support" && (
                <>
                  <Panel title="Customer support">
                    <button
                      onClick={() => {
                        const t = {
                          id: crypto.randomUUID(),
                          orgId: active.id,
                          subject: "Sample request " + (tickets.length + 1),
                          priority: "Normal",
                          status: "Open",
                          history: [],
                        };
                        setTickets((old) => [...old, t]);
                        setTicketId(t.id);
                        log("Created sample support request");
                      }}
                    >
                      Add example ticket
                    </button>
                    <Table
                      headings={[
                        "Subject",
                        "Organisation",
                        "Priority",
                        "Status",
                      ]}
                    >
                      {tickets.map((t) => (
                        <tr key={t.id}>
                          <th scope="row">
                            <button onClick={() => setTicketId(t.id)}>
                              {t.subject}
                            </button>
                          </th>
                          <td>{orgs.find((o) => o.id === t.orgId)?.name}</td>
                          <td>
                            <Status>{t.priority}</Status>
                          </td>
                          <td>
                            <Status>{t.status}</Status>
                          </td>
                        </tr>
                      ))}
                    </Table>
                  </Panel>
                  <Panel title={ticket.subject}>
                    <div className="profile-grid">
                      <label>
                        Priority
                        <select
                          value={ticket.priority}
                          onChange={(e) =>
                            changeTicket({ priority: e.target.value })
                          }
                        >
                          {["Low", "Normal", "High", "Urgent"].map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Ticket status
                        <select
                          value={ticket.status}
                          onChange={(e) =>
                            changeTicket({ status: e.target.value })
                          }
                        >
                          {["Open", "In progress", "Waiting", "Closed"].map(
                            (s) => (
                              <option key={s}>{s}</option>
                            ),
                          )}
                        </select>
                      </label>
                    </div>
                    <h3>Communication history</h3>
                    {ticket.history.length ? (
                      ticket.history.map((h, i) => (
                        <div className="history" key={i}>
                          <small>
                            {h.kind} · {h.time}
                          </small>
                          <p>{h.text}</p>
                        </div>
                      ))
                    ) : (
                      <Empty>No messages yet.</Empty>
                    )}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget),
                          text = f.get("note").trim();
                        if (!text) return;
                        changeTicket({
                          history: [
                            ...ticket.history,
                            {
                              kind: f.get("kind"),
                              text,
                              time: new Date().toLocaleString("en-GB"),
                            },
                          ],
                        });
                        e.currentTarget.reset();
                      }}
                    >
                      <label>
                        Entry type
                        <select name="kind">
                          <option>Internal note</option>
                          <option>Simulated customer reply (not sent)</option>
                        </select>
                      </label>
                      <label>
                        Fictional message
                        <textarea name="note" required maxLength={500} />
                      </label>
                      <button type="submit">Add local entry</button>
                    </form>
                  </Panel>
                </>
              )}
              {page === "Activity Logs" && <Activity logs={logs} />}
              {page === "Settings" && (
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
                      Flags control this demonstration’s interface. They are not
                      access control or production settings.
                    </p>
                  </Panel>
                </>
              )}
            </>
          )}
          <footer className="notice">
            Session-only demonstration. Refresh to restore fixtures. Local
            activity is not a secure audit trail. EVLT’s repository, database
            and deployment are separate and untouched.{" "}
            <a href="./customer-concepts.html">Customer concepts</a>
          </footer>
        </section>
      </main>
      {form && (
        <OrganisationForm
          org={form.org}
          sectors={sectors}
          onClose={() => setForm(null)}
          onSave={(values) => {
            if (form.type === "edit")
              update(
                form.org.id,
                { name: values.name.trim(), sector: values.sector },
                "Updated sample organisation profile",
              );
            else {
              const o = createOrganisation(values);
              setOrgs((old) => [...old, o]);
              setRecords((old) => [...old, ...seedRecords([o])]);
              setSelected(o.id);
              log("Created example organisation " + o.name);
              navigate("Company Profile");
            }
            setForm(null);
          }}
        />
      )}
      {confirm && (
        <Modal
          title="Confirm demonstration change"
          onClose={() => setConfirm(null)}
        >
          <p>
            {orgs.find((o) => o.id === confirm.id)?.name}:{" "}
            {confirm.plan
              ? "change package to " + confirm.plan
              : "change status to " + confirm.status}
            ?
          </p>
          <p>
            No billing or account access changes occur. Archiving preserves
            sample records and hides the organisation from the preview selector.
          </p>
          <button
            className="primary"
            onClick={() => {
              const { id, ...patch } = confirm;
              update(
                id,
                patch,
                confirm.plan
                  ? "Changed sample package to " + confirm.plan
                  : "Changed sample status to " + confirm.status,
              );
              setConfirm(null);
            }}
          >
            Confirm sample change
          </button>
          <button onClick={() => setConfirm(null)}>Cancel</button>
        </Modal>
      )}
    </div>
  );
}
function OrganisationRows({ orgs, profile, preview }) {
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
function Activity({ logs }) {
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
createRoot(document.getElementById("root")).render(<App />);
