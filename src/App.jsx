import React, { useState } from "react";
import OwnerBusinessPages, { ownerSeed } from "./OwnerBusinessPages";
import CompanyOnboarding from "./CompanyOnboarding";
import ServerWorkspace from "./ServerWorkspace";
import { ShieldAlert } from "lucide-react";
import { createFictionalBackend } from "./backend/fictional";
import { BackendState } from "./layout/BackendState";
import CustomerWorkspace from "./CustomerWorkspace";
import { Activity } from "./pages/shared";
import { useConsoleController } from "./hooks/useConsoleController";
import Navigation from "./layout/Navigation";
import ConsoleDialogs from "./layout/ConsoleDialogs";
import OverviewPage from "./pages/OverviewPage";
import OrganisationsPage from "./pages/OrganisationsPage";
import CompanyProfilePage from "./pages/CompanyProfilePage";
import ModulesPage from "./pages/ModulesPage";
import SubscriptionsPage from "./pages/SubscriptionsPage";
import UsersPage from "./pages/UsersPage";
import SupportPage from "./pages/SupportPage";
import SettingsPage from "./pages/SettingsPage";
export default function App({ backend: suppliedBackend }) {
  const [serverWorkspace, setServerWorkspace] = useState(false);
  const [onboarding, setOnboarding] = useState(false);
  const [ownerData, setOwnerData] = useState(ownerSeed);
  const [demoBackend] = useState(() => createFictionalBackend());
  const backend = suppliedBackend || demoBackend;
  const controller = useConsoleController(backend);
  const {
    page,
    orgs,
    selected,
    setSelected,
    setForm,
    logs,
    message,
    records,
    customer,
    customerPage,
    setCustomerPage,
    customerRole,
    setCustomerRole,
    customerRoles,
    setCustomerRoles,
    roleModules,
    setRoleModules,
    roleTeams,
    setRoleTeams,
    active,
    log,
    run,
    reset,
    status,
    error,
    retry,
  } = controller;
  if (serverWorkspace)
    return <ServerWorkspace onClose={() => setServerWorkspace(false)} />;
  if (onboarding)
    return <CompanyOnboarding onClose={() => setOnboarding(false)} />;
  return (
    <div
      className="shell"
      style={{ "--brand": customer && active ? active.color : "#1e3a1e" }}
    >
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Navigation controller={controller} />
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
          <div className="toolbar">
            <button onClick={async () => { await reset(); setOwnerData(ownerSeed); }}>Reset fictional demo</button>
            <button onClick={() => setServerWorkspace(true)}>
              Private server workspace
            </button>
            <button onClick={() => setOnboarding(true)}>
              Company onboarding simulation
            </button>
            <small>Changes exist only in this tab and reset on refresh.</small>
          </div>
          <BackendState
            status={status}
            error={error}
            retry={retry}
            empty={!orgs.length}
          />
          {status === "ready" &&
            orgs.length > 0 &&
            (customer ? (
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
                  key={active.id}
                  org={active}
                  records={records}
                  page={customerPage}
                  setPage={setCustomerPage}
                  customerRole={customerRole}
                  setCustomerRole={setCustomerRole}
                  customerRoles={customerRoles}
                  setCustomerRoles={setCustomerRoles}
                  roleModules={roleModules}
                  setRoleModules={setRoleModules}
                  roleTeams={roleTeams}
                  setRoleTeams={setRoleTeams}
                  onAdd={async (r) => {
                    const saved = await run(() =>
                      backend.records.create(r.orgId, r),
                    );
                    if (saved)
                      await log(
                        "Added sample " + r.module + " record",
                        r.orgId,
                      );
                    return saved;
                  }}
                  onUpdate={async (orgId, id, patch) => {
                    const changed = await run(() => backend.records.update(orgId, id, patch));
                    if (changed) await log("Updated sample operational record", orgId);
                    return changed;
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
                  <OverviewPage controller={controller} />
                )}
                {page === "Organisations" && (
                  <OrganisationsPage controller={controller} />
                )}
                {page === "Company Profile" && (
                  <CompanyProfilePage controller={controller} />
                )}
                {page === "Modules" && <ModulesPage controller={controller} />}
                {page === "Subscriptions" && (
                  <SubscriptionsPage controller={controller} />
                )}
                {page === "Users" && <UsersPage controller={controller} />}
                {page === "Support" && <SupportPage controller={controller} />}
                {page === "Activity Logs" && <Activity logs={logs} />}
                {page === "Settings" && (
                  <SettingsPage controller={controller} />
                )}
                {["Onboarding","Branding Templates","Client Insights","Feature Requests","Sales Leads","Announcements","Infrastructure"].includes(page) && (
                  <OwnerBusinessPages page={page} controller={controller} data={ownerData} setData={setOwnerData} onOpenServer={() => setServerWorkspace(true)} onOpenOnboarding={() => setOnboarding(true)} />
                )}
              </>
            ))}
          <footer className="notice">
            Session-only demonstration. Refresh to restore fixtures. Local
            activity is not a secure audit trail. EVLT’s repository, database
            and deployment are separate and untouched.{" "}
            <a href="./customer-concepts.html">Customer concepts</a>
          </footer>
        </section>
      </main>
      <ConsoleDialogs controller={controller} />
    </div>
  );
}
