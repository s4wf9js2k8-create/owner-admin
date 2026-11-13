import React, { useState } from "react";
import { isTaskModule, moduleInfo } from "./customerModules";
const ReportingWorkspace = React.lazy(() => import("./ReportingWorkspace"));
const NotificationInbox = React.lazy(() => import("./NotificationInbox"));
const CommunicationsWorkspace = React.lazy(
  () => import("./CommunicationsWorkspace"),
);
import { recordInScope } from "./administrationRules";
const CompanyConfiguration = React.lazy(() => import("./CompanyConfiguration"));
const ApprovalsPage = React.lazy(() =>
  import("./AdministrationPages").then((m) => ({ default: m.ApprovalsPage })),
);
const AutomationsPage = React.lazy(() =>
  import("./AdministrationPages").then((m) => ({ default: m.AutomationsPage })),
);
const ActivityPage = React.lazy(() =>
  import("./AdministrationPages").then((m) => ({ default: m.ActivityPage })),
);
import { noticeRelevant } from "./communicationRules";
const FinancialWorkspace = React.lazy(() => import("./FinancialWorkspace"));
import DailyOperations from "./DailyOperations";
import OperationalDashboard from "./OperationalDashboard";
import CustomerPeopleOps from "./CustomerPeopleOps";
import CustomerAssetOps from "./CustomerAssetOps";
import CustomerEventsOps from "./CustomerEventsOps";
import CustomerFormsOps, { initialFormTemplates } from "./CustomerFormsOps";
import CustomerCommercialOps from "./CustomerCommercialOps";
import CustomerResourcesOps from "./CustomerResourcesOps";
import {
  moduleAllowed,
  demoRoleDefaults,
  scopedRecords,
} from "./customerWorkflows";
import CustomerTaskBoard from "./CustomerTaskBoard";
import CustomerModulePage from "./CustomerModulePage";
import CustomerCommandBar from "./CustomerCommandBar";
import { CustomerMyWork, CustomerCalendar } from "./CustomerEssentialPages";

const universal = [
  "Dashboard",
  "My work",
  "Calendar",
  "Notifications",
  "Settings",
  "Insights",
  "Approvals",
  "Automations",
  "Activity history",
];
export default function CustomerWorkspace({
  org,
  records,
  onUpdate,
  onAdd,
  onConfigure,
  page,
  setPage,
  customerRole,
  setCustomerRole,
  customerRoles,
  roleModules,
  roleTeams,
}) {
  const [accessMessage, setAccessMessage] = useState("");
  const [notificationUsers, setNotificationUsers] = useState({});
  const [formTemplates, setFormTemplates] = useState(initialFormTemplates);
  const [prefs, setLocalPrefs] = useState(
    org.workspaceConfig?.dashboardPrefs || {
      home: "Dashboard",
      compact: false,
      reminders: true,
      widgets:
        org.sector === "visitor"
          ? ["events", "visitors", "staff", "bookings"]
          : org.sector === "engineering"
            ? ["attention", "staff", "work", "shifts"]
            : org.sector === "charity"
              ? ["events", "shifts", "staff", "work"]
              : ["staff", "shifts", "attention", "work"],
    },
  );
  const setPrefs = (value) => {
    const next = typeof value === "function" ? value(prefs) : value;
    setLocalPrefs(next);
    if (canManage)
      configure(
        { workspaceConfig: { dashboardPrefs: next } },
        "Updated dashboard preferences",
      );
  };
  const [createRequest, setCreateRequest] = useState(0);
  const [focus, setFocus] = useState(null);
  const roleActions =
    customerRoles[customerRole] || demoRoleDefaults[customerRole] || [];
  const canView = roleActions.includes("View");
  const visibleOrg = {
    ...org,
    modules: org.modules.filter(
      (m) => canView && moduleAllowed(customerRole, m, roleModules),
    ),
  };
  const people = scopedRecords(records, org).filter((r) =>
    ["Staff & volunteers", "Volunteers", "Staff"].includes(r.module),
  );
  const currentTeam = roleTeams[customerRole] || "All teams";
  const visibleRecords = scopedRecords(records, visibleOrg).filter((r) => {
    if (currentTeam === "All teams") return true;
    const team =
      r.team ||
      people.find(
        (p) =>
          [r.personId, r.ownerId, r.engineerId, r.inspectorId].includes(p.id) ||
          p.title === r.owner ||
          p.title === r.person,
      )?.team ||
      "";
    return team === currentTeam;
  });
  const choices = [
    ...new Set(
      [
        ...(["Staff", "Volunteer"].includes(customerRole)
          ? []
          : visibleRecords
              .filter((r) => isTaskModule(r.module))
              .map((r) => r.owner)),
        ...visibleRecords
          .filter((r) =>
            ["Staff & volunteers", "Volunteers", "Staff"].includes(r.module),
          )
          .map((r) => r.title),
      ].filter(Boolean),
    ),
  ];
  const [actor, setActor] = useState(choices[0] || "Sample team member");
  const canEdit =
    canView &&
    (
      customerRoles[customerRole] ||
      demoRoleDefaults[customerRole] ||
      []
    ).includes("Edit");
  const canCreate =
    canView &&
    (
      customerRoles[customerRole] ||
      demoRoleDefaults[customerRole] ||
      []
    ).includes("Create");
  const canApprove =
    canView &&
    (
      customerRoles[customerRole] ||
      demoRoleDefaults[customerRole] ||
      []
    ).includes("Approve");
  const canManage =
    canView && (customerRoles[customerRole] || []).includes("Manage");
  const canExport =
    canView &&
    (
      customerRoles[customerRole] ||
      demoRoleDefaults[customerRole] ||
      []
    ).includes("Export");
  const canManageStaff = canManage || roleActions.includes("Manage staff");
  const canReport = canView && roleActions.includes("Reports");
  const activeActor = choices.includes(actor)
    ? actor
    : choices[0] || "Sample team member";
  const currentPerson = people.find((p) => p.title === activeActor);
  const actorKey = currentPerson?.id || activeActor;
  const userInbox = notificationUsers[actorKey] || {
    read: [],
    dismissed: [],
    settings: {},
  };
  const setUserInbox = (update) =>
    setNotificationUsers((old) => ({
      ...old,
      [actorKey]:
        typeof update === "function"
          ? update(old[actorKey] || { read: [], dismissed: [], settings: {} })
          : update,
    }));
  const actorMeta = {
    actorId: currentPerson?.id || "",
    actorName: activeActor,
    role: customerRole,
  };
  const scope = {
    ownership: ["Staff", "Volunteer"].includes(customerRole) ? "Mine" : "All",
    ...org.workspaceConfig?.roleScopes?.[customerRole],
    sensitive:
      customerRole === "Administrator" ||
      Boolean(org.workspaceConfig?.roleScopes?.[customerRole]?.sensitive),
  };
  const accessibleRecords = visibleRecords
    .filter((r) => recordInScope(r, scope, currentPerson, records))
    .filter(
      (r) =>
        moduleInfo(r.module).type !== "communications" ||
        canApprove ||
        (r.status === "Published" &&
          noticeRelevant(r, currentPerson?.id, currentPerson?.team)),
    );
  const allowedPage = (target) =>
    target === "Settings" || target === "Automations"
      ? canManage
      : target === "Approvals"
        ? canApprove || canEdit
        : target === "Insights"
          ? canReport
          : universal.includes(target) ||
            (visibleOrg.modules.includes(target) &&
              (!["Reporting", "Reports & analytics"].includes(target) ||
                canReport)) ||
            (target === "Tasks & projects" &&
              visibleOrg.modules.some(isTaskModule));
  const current = allowedPage(page) ? page : "Dashboard";
  const navigate = (target, options = {}) => {
    if (!allowedPage(target)) {
      setAccessMessage(
        "This page is unavailable to the selected demonstration role.",
      );
      return;
    }
    setAccessMessage("");
    if (options.recordId) setFocus({ page: target, id: options.recordId });
    else setFocus(null);
    if (options.create) setCreateRequest((v) => v + 1);
    else setCreateRequest(0);
    setPage(target);
  };
  const deny = (message) => {
    setAccessMessage(message);
    return Promise.resolve(false);
  };
  const safeUpdate = (orgId, id, patch) => {
    const record = accessibleRecords.find(
      (r) => r.orgId === orgId && r.id === id,
    );
    if (
      orgId !== org.id ||
      !record ||
      (!canEdit &&
        !(
          canApprove &&
          (patch._approval ||
            Object.keys(patch).every((key) => key === "approverId"))
        ))
    )
      return deny("This record or action is unavailable to the selected role.");
    if (moduleInfo(record.module).type === "people" && !canManageStaff)
      return deny("Managing staff profiles requires Manage staff permission.");
    if (
      (patch._approval ||
        ["Approved", "Rejected"].includes(patch.approval) ||
        patch.review === "Approved" ||
        patch.documentStatus === "Approved") &&
      !canApprove
    )
      return deny("The selected role cannot make approval decisions.");
    if (
      scope.ownership === "Mine" &&
      ["ownerId", "personId", "engineerId", "inspectorId"].some(
        (key) => patch[key] && patch[key] !== currentPerson?.id,
      )
    )
      return deny("This role can assign work to itself only.");
    return onUpdate(orgId, id, { ...patch, _actor: actorMeta });
  };
  const safeAdd = (payload) => {
    if (
      !canCreate ||
      (moduleInfo(payload.module).type === "people" && !canManageStaff) ||
      payload.orgId !== org.id ||
      !visibleOrg.modules.includes(payload.module)
    )
      return deny("The selected role cannot create this record.");
    if (scope.ownership === "Mine") {
      if (!currentPerson)
        return deny(
          "Select an existing staff profile using Working as before creating records.",
        );
      if (
        [
          payload.ownerId,
          payload.personId,
          payload.engineerId,
          payload.inspectorId,
        ]
          .filter(Boolean)
          .some((id) => id !== currentPerson.id)
      )
        return deny("This role can create assignments for itself only.");
    }
    return onAdd({ ...payload, _actor: actorMeta });
  };
  const configure = (patch, event) =>
    canManage
      ? onConfigure(patch, event, actorMeta)
      : deny("Company configuration requires Manage permission.");
  const shared = {
    org: visibleOrg,
    records: accessibleRecords,
    onNavigate: navigate,
    onUpdate: safeUpdate,
    actor: activeActor,
    canEdit,
  };
  const focusId = focus?.page === current ? focus.id : null;
  let content;
  if (current === "Dashboard")
    content = (
      <OperationalDashboard
        {...shared}
        onAdd={safeAdd}
        canCreate={canCreate}
        prefs={prefs}
        setPrefs={setPrefs}
      />
    );
  else if (current === "My work") content = <CustomerMyWork {...shared} />;
  else if (current === "Calendar") content = <CustomerCalendar {...shared} />;
  else if (current === "Notifications")
    content = (
      <NotificationInbox
        {...shared}
        prefs={prefs}
        settings={{
          reminderDays: 14,
          ...org.workspaceConfig?.notificationDefaults,
          ...userInbox.settings,
        }}
        setSettings={(settings) =>
          setUserInbox((old) => ({ ...old, settings }))
        }
        state={userInbox}
        setState={setUserInbox}
        actorId={currentPerson?.id || ""}
        department={currentPerson?.team || ""}
        notices={accessibleRecords.filter((r) => r.recordType === "notice")}
      />
    );
  else if (current === "Settings")
    content = (
      <CompanyConfiguration
        org={org}
        records={accessibleRecords}
        onConfigure={configure}
        onNavigate={navigate}
        prefs={prefs}
        setPrefs={setPrefs}
        roles={customerRoles}
        roleModules={roleModules}
        roleTeams={roleTeams}
        customerRole={customerRole}
        canManage={canManage}
      />
    );
  else if (current === "Approvals")
    content = (
      <ApprovalsPage
        {...shared}
        actorId={currentPerson?.id || ""}
        canApprove={canApprove}
      />
    );
  else if (current === "Automations")
    content = (
      <AutomationsPage
        {...shared}
        onConfigure={configure}
        canManage={canManage}
      />
    );
  else if (current === "Activity history")
    content = <ActivityPage {...shared} canManage={canManage} />;
  else if (
    current === "Insights" ||
    current === "Reporting" ||
    current === "Reports & analytics"
  )
    content = (
      <ReportingWorkspace
        {...shared}
        onAdd={safeAdd}
        canCreate={canCreate}
        canExport={canExport}
      />
    );
  else if (moduleInfo(current).type === "communications")
    content = (
      <CommunicationsWorkspace
        {...shared}
        module={current}
        onAdd={safeAdd}
        onUpdate={async (orgId, id, patch) => {
          const record = accessibleRecords.find(
            (r) => r.id === id && r.orgId === orgId && r.module === current,
          );
          if (!record) return false;
          if (canEdit) return safeUpdate(orgId, id, patch);
          if (
            Object.keys(patch).length === 1 &&
            patch.acknowledgements &&
            currentPerson &&
            record.status === "Published" &&
            noticeRelevant(record, currentPerson.id, currentPerson.team)
          )
            return onUpdate(orgId, id, {
              _actor: actorMeta,
              acknowledgements: [
                ...(record.acknowledgements || []).filter(
                  (a) => a.personId !== currentPerson.id,
                ),
                { personId: currentPerson.id, at: new Date().toISOString() },
              ],
            });
          return false;
        }}
        actorId={currentPerson?.id || ""}
        department={currentPerson?.team || ""}
        canManage={canCreate && canApprove}
        focusId={focusId}
      />
    );
  else if (isTaskModule(current))
    content = (
      <CustomerTaskBoard
        org={visibleOrg}
        records={accessibleRecords}
        onAdd={safeAdd}
        onUpdate={safeUpdate}
        actor={activeActor}
        canEdit={canEdit}
        canCreate={canCreate}
        canApprove={canApprove}
        createRequest={createRequest}
        focusId={focusId}
        onNavigate={navigate}
      />
    );
  else if (
    ["people", "timesheets", "schedule", "leave", "training"].includes(
      moduleInfo(current).type,
    )
  )
    content = (
      <CustomerPeopleOps
        key={current}
        org={visibleOrg}
        module={current}
        records={accessibleRecords}
        onAdd={safeAdd}
        onUpdate={safeUpdate}
        onNavigate={navigate}
        focusId={focusId}
        canCreate={
          canCreate && (moduleInfo(current).type !== "people" || canManageStaff)
        }
        canEdit={
          canEdit && (moduleInfo(current).type !== "people" || canManageStaff)
        }
        canApprove={canApprove}
        canManage={canManage}
        createRequest={createRequest}
      />
    );
  else if (moduleInfo(current).type === "operations")
    content = (
      <DailyOperations
        key={current}
        {...shared}
        module={current}
        onAdd={safeAdd}
        canCreate={canCreate}
        canApprove={canApprove}
      />
    );
  else if (
    [
      "documents",
      "archives",
      "fleet",
      "safety",
      "bookings",
      "operations",
      "visitors",
    ].includes(moduleInfo(current).type)
  )
    content = (
      <CustomerResourcesOps
        key={current}
        org={visibleOrg}
        module={current}
        records={accessibleRecords}
        onAdd={safeAdd}
        onUpdate={safeUpdate}
        onNavigate={navigate}
        focusId={focusId}
        canCreate={canCreate}
        canEdit={canEdit}
        createRequest={createRequest}
      />
    );
  else if (moduleInfo(current).type === "finance")
    content = (
      <FinancialWorkspace
        key={current}
        {...shared}
        module={current}
        onAdd={safeAdd}
        canCreate={canCreate}
        canApprove={canApprove}
        focusId={focusId}
      />
    );
  else if (["crm", "finance", "donations"].includes(moduleInfo(current).type))
    content = (
      <CustomerCommercialOps
        key={current}
        org={visibleOrg}
        module={current}
        records={accessibleRecords}
        onAdd={safeAdd}
        onUpdate={safeUpdate}
        onNavigate={navigate}
        focusId={focusId}
        canCreate={canCreate}
        canEdit={canEdit}
        createRequest={createRequest}
      />
    );
  else if (moduleInfo(current).type === "forms")
    content = (
      <CustomerFormsOps
        key={current}
        org={visibleOrg}
        module={current}
        records={accessibleRecords}
        onAdd={safeAdd}
        canCreate={canCreate}
        templates={formTemplates}
        setTemplates={setFormTemplates}
      />
    );
  else if (moduleInfo(current).type === "events")
    content = (
      <CustomerEventsOps
        key={current}
        org={visibleOrg}
        module={current}
        records={accessibleRecords}
        onAdd={safeAdd}
        onUpdate={safeUpdate}
        canCreate={canCreate}
        canEdit={canEdit}
      />
    );
  else if (
    ["assets", "maintenance", "inspections", "inventory"].includes(
      moduleInfo(current).type,
    )
  )
    content = (
      <CustomerAssetOps
        key={current}
        org={visibleOrg}
        module={current}
        records={accessibleRecords}
        onAdd={safeAdd}
        onUpdate={safeUpdate}
        onNavigate={navigate}
        focusId={focusId}
        canCreate={canCreate}
        canEdit={canEdit}
        canApprove={canApprove}
        createRequest={createRequest}
      />
    );
  else
    content = (
      <CustomerModulePage
        key={current}
        org={visibleOrg}
        module={current}
        records={accessibleRecords}
        onAdd={safeAdd}
        onUpdate={safeUpdate}
        onNavigate={navigate}
        focusId={focusId}
        canEdit={canEdit}
        canCreate={canCreate}
        canApprove={canApprove}
        canExport={canExport}
      />
    );
  return (
    <div
      className={"customer-shell " + (prefs.compact ? "customer-compact" : "")}
    >
      <div className="customer-context">
        <span>{org.name}</span>
        <span>Fictional customer demo</span>
        <span>{visibleOrg.modules.length} accessible modules</span>
      </div>
      <div className="customer-persona-row">
        <label>
          Simulated role
          <select
            aria-label="Simulated customer role"
            value={customerRole}
            onChange={(e) => {
              setCustomerRole(e.target.value);
              setPage("Dashboard");
            }}
          >
            {Object.keys(customerRoles).map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <label>
          Working as
          <select
            aria-label="Sample team member"
            value={activeActor}
            onChange={(e) => setActor(e.target.value)}
          >
            {choices.length ? (
              choices.map((name) => <option key={name}>{name}</option>)
            ) : (
              <option>Sample team member</option>
            )}
          </select>
        </label>
        <small>
          Role: {customerRole} · Team scope: {currentTeam}. This is a visual
          demo, not secure access control.
        </small>
      </div>
      {accessMessage && <p role="alert">{accessMessage}</p>}
      <CustomerCommandBar
        org={visibleOrg}
        records={accessibleRecords}
        onNavigate={navigate}
        canEdit={canCreate}
      />
      <div className="heading customer-heading">
        <div>
          <small>{org.name} · CUSTOMER WORKSPACE</small>
          <h1>{current}</h1>
          <p>Interactive temporary data. Changes reset when you refresh.</p>
        </div>
      </div>
      <React.Suspense fallback={<p role="status">Loading workspace…</p>}>
        {content}
      </React.Suspense>
    </div>
  );
}
