import useDeepLink from "./completion/DeepLink";
import BrandingEditor from "./owner/BrandingEditor";
import BusinessDashboard from "./owner/BusinessDashboard";
import CompanyDirectory from "./owner/CompanyDirectory";
import CompanyProfile from "./owner/CompanyProfile";
import ActivityCentre from "./owner/ActivityCentre";
import OnboardingWizard from "./owner/OnboardingWizard";
import OwnerAccess from "./owner/OwnerAccess";
import BusinessSettings from "./owner/BusinessSettings";
import Roadmap from "./owner/Roadmap";
import {
  configuredOwnerRoles,
  ownerPageAllowed,
  ownerCanManage,
  ownerCanWritePage,
} from "./owner/rules";
import { activityEntry } from "./administrationRules";
import React, { useState, useEffect } from "react";
import OwnerBusinessPages, { ownerSeed } from "./OwnerBusinessPages";
import CompanyOnboarding from "./CompanyOnboarding";
import ServerWorkspace from "./ServerWorkspace";
import { ShieldAlert } from "lucide-react";
import { createFictionalBackend } from "./backend/fictional";
import { BackendState } from "./layout/BackendState";
import CustomerWorkspace from "./CustomerWorkspace";
import { useConsoleController } from "./hooks/useConsoleController";
import Navigation from "./layout/Navigation";
import ConsoleDialogs from "./layout/ConsoleDialogs";
import ModulesPage from "./pages/ModulesPage";
import SubscriptionsPage from "./pages/SubscriptionsPage";
import UsersPage from "./pages/UsersPage";
import SupportPage from "./pages/SupportPage";
import SettingsPage from "./pages/SettingsPage";
export default function App({ backend: suppliedBackend }) {
  const [serverWorkspace, setServerWorkspace] = useState(false);
  const [onboarding, setOnboarding] = useState(false);
  const [notificationStore, setNotificationStore] = useState({});
  const [personaPolicy, setPersonaPolicy] = useState(null);
  const [ownerData, setOwnerData] = useState(ownerSeed);
  const [demoBackend] = useState(() => createFictionalBackend());
  const backend = suppliedBackend || demoBackend;
  const controller = useConsoleController(backend);
  useEffect(() => {
    document.title = controller.customer
      ? (controller.active?.name || "Workspace") +
        " · " +
        controller.customerPage
      : (controller.flags.business?.name || "Channel Systems") +
        " · " +
        controller.page;
  }, [
    controller.customer,
    controller.active?.name,
    controller.customerPage,
    controller.page,
    controller.flags.business?.name,
  ]);
  const [deepFocus, setDeepFocus] = useState(null);
  useDeepLink(controller, setDeepFocus);
  const {
    page,
    orgs,
    selected,
    setSelected,
    setForm,
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
      className={"shell " + (customer ? "customer-view" : "owner-view")}
      style={{ "--brand": customer && active ? active.color : "#1e3a1e" }}
    >
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Navigation
        controller={
          customer && personaPolicy?.orgId === active?.id
            ? {
                ...controller,
                active: {
                  ...active,
                  modules: active.modules.filter(
                    (m) => !personaPolicy.disabledModules?.includes(m),
                  ),
                },
                customerRoles: {
                  ...controller.customerRoles,
                  [controller.customerRole]: (
                    controller.customerRoles[controller.customerRole] || []
                  ).filter((a) => !personaPolicy.disabledActions?.includes(a)),
                },
              }
            : controller
        }
      />
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
            {deepFocus?.error || message}
          </div>
          <div className="toolbar">
            <button
              onClick={async () => {
                if (await reset()) {
                  setOwnerData(ownerSeed);
                  setNotificationStore({});
                }
              }}
            >
              Reset fictional demo
            </button>
            {!customer &&
              (controller.ownerRole !== "Platform Owner" ||
                controller.ownerAccountId) && (
                <button
                  onClick={() => {
                    controller.setOwnerAccountId("");
                    controller.setOwnerRole("Platform Owner");
                    controller.setPage("Overview");
                  }}
                >
                  Return to owner preview
                </button>
              )}
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
                        setCustomerRole("Administrator");
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
                  onPersona={setPersonaPolicy}
                  externalFocus={deepFocus}
                  notificationStore={notificationStore}
                  setNotificationStore={setNotificationStore}
                  key={active.id}
                  org={active}
                  records={records}
                  onConfigure={async (patch, event, actor) => {
                    if (
                      Object.keys(patch).some(
                        (key) =>
                          ![
                            "name",
                            "sector",
                            "contactPhone",
                            "contactEmail",
                            "address",
                            "description",
                            "color",
                            "logo",
                            "workspaceConfig",
                            "modules",
                          ].includes(key),
                      )
                    )
                      return false;
                    const currentOrg = backend
                      .getSnapshot()
                      .orgs.find((o) => o.id === active.id);
                    const { modules: enabled, ...fields } = patch;
                    const workspaceConfig = {
                      ...currentOrg.workspaceConfig,
                      ...fields.workspaceConfig,
                      activity: [
                        ...(currentOrg.workspaceConfig?.activity || []),
                        activityEntry(
                          actor,
                          event || "Configuration updated",
                          Object.keys(patch.workspaceConfig || patch).join(
                            ", ",
                          ),
                        ),
                      ].slice(-300),
                    };
                    return run(async () => {
                      if (enabled)
                        await backend.entitlements.replace(active.id, enabled);
                      await backend.organisations.update(active.id, {
                        ...fields,
                        workspaceConfig,
                      });
                    });
                  }}
                  platformAnnouncements={ownerData.announcements}
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
                    let createdRecord;
                    const saved = await run(async () => {
                      createdRecord = await backend.records.create(r.orgId, r);
                    });
                    if (saved)
                      await log(
                        "Added sample " + r.module + " record",
                        r.orgId,
                      );
                    return saved ? createdRecord : false;
                  }}
                  onUpdate={async (orgId, id, patch) => {
                    const changed = await run(() =>
                      backend.records.update(orgId, id, patch),
                    );
                    if (changed)
                      await log("Updated sample operational record", orgId);
                    return changed;
                  }}
                />
              </>
            ) : (
              <>
                {controller.ownerAccount?.status === "Suspended" && (
                  <p role="alert">This fictional account is suspended. </p>
                )}
                {controller.ownerAccount?.status === "Suspended" ||
                !ownerPageAllowed(
                  controller.ownerRole,
                  page,
                  controller.flags.ownerPolicies,
                ) ? (
                  <p role="alert">
                    This page is unavailable to the selected owner role.
                  </p>
                ) : (
                  <>
                    <label>
                      Fictional owner account
                      <select
                        aria-label="Fictional owner account"
                        value={controller.ownerAccountId}
                        onChange={(e) => {
                          controller.setOwnerAccountId(e.target.value);
                          const account = controller.flags.ownerAccounts?.find(
                            (a) => a.id === e.target.value,
                          );
                          controller.setOwnerRole(
                            account?.role || "Platform Owner",
                          );
                          controller.setPage("Overview");
                        }}
                      >
                        <option value="">Platform owner / role preview</option>
                        {(controller.flags.ownerAccounts || []).map((a) => (
                          <option
                            key={a.id}
                            value={a.id}
                            disabled={a.status === "Suspended"}
                          >
                            {a.name} · {a.role}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="owner-role-preview">
                      Simulated owner role
                      <select
                        aria-label="Simulated owner role"
                        disabled={Boolean(controller.ownerAccountId)}
                        value={controller.ownerRole}
                        onChange={(e) => {
                          controller.setOwnerRole(e.target.value);
                          controller.setPage("Overview");
                        }}
                      >
                        {configuredOwnerRoles(controller.flags).map((r) => (
                          <option key={r}>{r}</option>
                        ))}
                      </select>
                      <small>
                        Fictional role preview; not secure production access.
                      </small>
                    </label>
                    <div className="heading">
                      <div>
                        <small>OWNER CONSOLE</small>
                        <h1>{page}</h1>
                        <p>
                          Organisation and platform management · demonstration
                        </p>
                      </div>
                      <button
                        className="primary"
                        disabled={
                          !ownerCanManage(
                            controller.ownerRole,
                            controller.flags.ownerPolicies,
                          )
                        }
                        onClick={() => setForm({ type: "create" })}
                      >
                        + Add example organisation
                      </button>
                    </div>
                    {page === "Onboarding" && (
                      <OnboardingWizard
                        controller={controller}
                        draft={ownerData.onboardingDraft}
                        onCreated={(id) =>
                          setOwnerData((d) => ({
                            ...d,
                            onboardingDraft: d.onboardingDraft?.id
                              ? { ...d.onboardingDraft, companyId: id }
                              : undefined,
                            leads: d.leads.map((l) =>
                              l.id === d.onboardingDraft?.id
                                ? { ...l, companyId: id, stage: "Won" }
                                : l,
                            ),
                          }))
                        }
                      />
                    )}
                    {page === "Owner Access" && (
                      <OwnerAccess controller={controller} />
                    )}
                    {page === "Product Roadmap" && (
                      <Roadmap
                        data={ownerData}
                        setData={(update) => {
                          if (
                            !ownerCanWritePage(
                              controller.ownerRole,
                              page,
                              controller.flags.ownerPolicies,
                            )
                          )
                            return controller.denyOwnerAction();
                          const next =
                            typeof update === "function"
                              ? update(ownerData)
                              : update;
                          setOwnerData(next);
                          log("Updated owner " + page);
                        }}
                      />
                    )}
                    {page === "Branding Templates" && (
                      <BrandingEditor key={active.id} controller={controller} />
                    )}
                    {page === "Overview" && (
                      <BusinessDashboard
                        controller={controller}
                        data={ownerData}
                      />
                    )}
                    {page === "Organisations" && (
                      <CompanyDirectory controller={controller} />
                    )}
                    {page === "Company Profile" && (
                      <CompanyProfile controller={controller} />
                    )}
                    {page === "Modules" && (
                      <ModulesPage controller={controller} />
                    )}
                    {page === "Subscriptions" && (
                      <SubscriptionsPage controller={controller} />
                    )}
                    {page === "Users" && <UsersPage controller={controller} />}
                    {page === "Support" && (
                      <SupportPage controller={controller} />
                    )}
                    {page === "Activity Logs" && (
                      <ActivityCentre controller={controller} />
                    )}
                    {page === "Settings" && (
                      <>
                        <BusinessSettings controller={controller} />
                        <SettingsPage controller={controller} />
                      </>
                    )}
                    {[
                      "Client Insights",
                      "Feature Requests",
                      "Sales Leads",
                      "Announcements",
                      "Infrastructure",
                    ].includes(page) && (
                      <OwnerBusinessPages
                        page={page}
                        controller={controller}
                        data={ownerData}
                        setData={(update) => {
                          if (
                            !ownerCanWritePage(
                              controller.ownerRole,
                              page,
                              controller.flags.ownerPolicies,
                            )
                          )
                            return controller.denyOwnerAction();
                          const next =
                            typeof update === "function"
                              ? update(ownerData)
                              : update;
                          setOwnerData(next);
                          log("Updated owner " + page);
                        }}
                        onOpenServer={() => setServerWorkspace(true)}
                        onOpenOnboarding={() => setOnboarding(true)}
                      />
                    )}
                  </>
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
