import { platformAnnouncementRelevant } from "./reconciliation/rules";
import { canonicalModule } from "./completion/moduleNavigation";
import React, { useState, useEffect, useCallback } from "react";
import { isTaskModule, moduleInfo } from "./customerModules";
const InventoryWorkspace = React.lazy(() => import("./InventoryWorkspace"));
const DocumentWorkspace = React.lazy(() => import("./DocumentWorkspace"));
const ReportingWorkspace = React.lazy(() => import("./ReportingWorkspace"));
const NotificationInbox = React.lazy(() => import("./NotificationInbox"));
const CommunicationsWorkspace = React.lazy(
  () => import("./CommunicationsWorkspace"),
);
import {
  recordInScope,
  approvalToken,
  approvalType,
} from "./administrationRules";
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
const CustomerPeopleOps = React.lazy(() => import("./CustomerPeopleOps"));
const CustomerAssetOps = React.lazy(() => import("./CustomerAssetOps"));
const CustomerEventsOps = React.lazy(
  () => import("./scheduling/EventsWorkspace"),
);
const AppointmentsWorkspace = React.lazy(
  () => import("./scheduling/AppointmentsWorkspace"),
);
const CustomerDirectory = React.lazy(
  () => import("./scheduling/CustomerDirectory"),
);
const CustomerFormsOps = React.lazy(
  () => import("./completion/FormsWorkspace"),
);
const CollectionWorkspace = React.lazy(
  () => import("./completion/CollectionWorkspace"),
);
const VisitorWorkspace = React.lazy(
  () => import("./completion/VisitorWorkspace"),
);
const FundraisingWorkspace = React.lazy(
  () => import("./completion/FundraisingWorkspace"),
);
const SafetyWorkspace = React.lazy(
  () => import("./completion/SafetyWorkspace"),
);
const FleetWorkspace = React.lazy(() => import("./completion/FleetWorkspace"));
const ArchivesWorkspace = React.lazy(
  () => import("./completion/ArchivesWorkspace"),
);
const CustomerCommercialOps = React.lazy(
  () => import("./CustomerCommercialOps"),
);
const CustomerResourcesOps = React.lazy(() => import("./CustomerResourcesOps"));
import {
  moduleAllowed,
  demoRoleDefaults,
  scopedRecords,
} from "./customerWorkflows";
const CustomerTaskBoard = React.lazy(() => import("./CustomerTaskBoard"));
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
  "Business archives",
];
export default function CustomerWorkspace({
  org,
  records,
  platformAnnouncements = [],
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
  onPersona,
  externalFocus,
  notificationStore,
  setNotificationStore,
}) {
  const [accessMessage, setAccessMessage] = useState("");
  const [fallbackNotifications, setFallbackNotifications] = useState({});
  const notificationUsers = notificationStore || fallbackNotifications,
    setNotificationUsers = setNotificationStore || setFallbackNotifications;
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
  const [createContext, setCreateContext] = useState({});
  const [focus, setFocus] = useState(null);
  const [documentAccess, setDocumentAccess] = useState({});
  const markDocumentAccess = useCallback(
    (id) =>
      setDocumentAccess((old) => ({ ...old, [id]: new Date().toISOString() })),
    [],
  );
  useEffect(() => {
    if (externalFocus?.orgId === org.id && externalFocus.id)
      setFocus({ page: externalFocus.page, id: externalFocus.id });
  }, [externalFocus, org.id]);
  const people = scopedRecords(records, org).filter((r) =>
    ["Staff & volunteers", "Volunteers", "Staff"].includes(r.module),
  );
  const [actor, setActor] = useState(
    () =>
      people.find((p) => p.module === "Staff & volunteers")?.id ||
      people[0]?.id ||
      "Sample team member",
  );
  const currentPerson =
    people.find((p) => p.id === actor || p.title === actor) ||
    people.find((p) => p.module === "Staff & volunteers") ||
    people[0];
  const activeActor = currentPerson?.title || "Sample team member",
    personPolicy = currentPerson?.permissionOverrides || {};
  useEffect(() => {
    onPersona?.({ orgId: org.id, ...personPolicy });
  }, [org.id, currentPerson, onPersona]);
  const roleActions = (
    customerRoles[customerRole] ||
    demoRoleDefaults[customerRole] ||
    []
  ).filter((a) => !personPolicy.disabledActions?.includes(a));
  const canView = roleActions.includes("View");
  const visibleOrg = {
    ...org,
    modules: org.modules.filter(
      (m) =>
        canView &&
        moduleAllowed(customerRole, m, roleModules) &&
        !personPolicy.disabledModules?.includes(m),
    ),
  };
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
      people
        .filter((r) =>
          ["Staff & volunteers", "Staff", "Volunteers"].includes(r.module),
        )
        .sort(
          (a, b) =>
            (a.module === "Staff & volunteers" ? 0 : 1) -
            (b.module === "Staff & volunteers" ? 0 : 1),
        )
        .map((r) => r.title),
    ),
  ];

  const canEdit = canView && roleActions.includes("Edit"),
    canCreate = canView && roleActions.includes("Create"),
    canApprove = canView && roleActions.includes("Approve"),
    canManage = canView && roleActions.includes("Manage"),
    canExport = canView && roleActions.includes("Export"),
    canManageStaff =
      (canManage || roleActions.includes("Manage staff")) &&
      !personPolicy.disabledActions?.includes("Manage staff"),
    canReport = canView && roleActions.includes("Reports");
  const actorKey = org.id + ":" + (currentPerson?.id || activeActor);
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
    ...(personPolicy.department ? { department: personPolicy.department } : {}),
    ...(personPolicy.location ? { location: personPolicy.location } : {}),
    ...(personPolicy.ownOnly ? { ownership: "Mine" } : {}),
    sensitive:
      customerRole === "Administrator" ||
      Boolean(org.workspaceConfig?.roleScopes?.[customerRole]?.sensitive),
  };
  const permittedRecords = visibleRecords
    .filter((r) => recordInScope(r, scope, currentPerson, records))
    .filter(
      (r) =>
        moduleInfo(r.module).type !== "communications" ||
        canApprove ||
        (r.status === "Published" &&
          noticeRelevant(r, currentPerson?.id, currentPerson?.team)),
    );
  const accessibleRecords = permittedRecords.filter((r) => !r.archivedAt);
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
  const normalizedPage = canonicalModule(page, visibleOrg.modules);
  const current = allowedPage(normalizedPage) ? normalizedPage : "Dashboard";
  const navigate = (target, options = {}) => {
    target = canonicalModule(target, visibleOrg.modules);
    if (!allowedPage(target)) {
      setAccessMessage(
        "This page is unavailable to the selected demonstration role.",
      );
      return;
    }
    setAccessMessage("");
    if (
      options.recordId &&
      permittedRecords.some((r) => r.id === options.recordId && r.archivedAt)
    )
      target = "Business archives";
    if (options.recordId) setFocus({ page: target, id: options.recordId });
    else setFocus(null);
    if (options.create) {
      setCreateRequest((v) => v + 1);
      setCreateContext(options);
    } else setCreateRequest(0);
    setPage(target);
  };
  const deny = (message) => {
    setAccessMessage(message);
    return Promise.resolve(false);
  };
  const safeUpdate = (orgId, id, patch) => {
    const record = permittedRecords.find(
      (r) => r.orgId === orgId && r.id === id,
    );
    if (
      orgId !== org.id ||
      !record ||
      (!canEdit &&
        !(patch._workflow?.kind === "formSubmit" && canCreate) &&
        !(
          canApprove &&
          (patch._approval ||
            ["decideSwap", "creditInvoice", "refundInvoice"].includes(
              patch._workflow?.kind,
            ) ||
            Object.keys(patch).every((key) => key === "approverId"))
        ))
    )
      return deny("This record or action is unavailable to the selected role.");
    if (patch._workflow) {
      const kind = patch._workflow.kind;
      for (const key of [
        "driverId",
        "personId",
        "relatedRecordId",
        "assetRefId",
        "targetId",
        "reviewerId",
      ]) {
        const target = patch._workflow[key];
        if (target && !permittedRecords.some((r) => r.id === target))
          return deny("The linked record is outside your access.");
      }
      if (
        kind === "invoiceResourceBooking" &&
        (!canCreate ||
          !visibleOrg.modules.some((m) => moduleInfo(m).type === "finance"))
      )
        return deny(
          "Creating a booking invoice requires Create permission and financial module access.",
        );
      if (patch._workflow.createWork && !canCreate)
        return deny(
          "Creating corrective maintenance requires Create permission.",
        );
      if (
        [
          "archive",
          "restore",
          "assessTraining",
          "decideSwap",
          "creditInvoice",
          "refundInvoice",
        ].includes(kind) &&
        !canApprove
      )
        return deny("This workflow requires approval permission.");
      if (
        [
          "formSubmit",
          "correctiveSafety",
          "generateSchedule",
          "repeatInspection",
        ].includes(kind) &&
        !canCreate
      )
        return deny("Creating linked records requires Create permission.");
      if (
        scope.ownership === "Mine" &&
        [patch._workflow.driverId, patch._workflow.personId]
          .filter(Boolean)
          .some((id) => id !== currentPerson?.id)
      )
        return deny("This role can record its own work only.");
    }
    if (
      record.recordType === "project" &&
      !canManageStaff &&
      [
        "memberIds",
        "resourceIds",
        "budget",
        "costs",
        "leadId",
        "title",
        "detail",
        "dueDate",
        "risk",
      ].some((k) => k in patch)
    )
      return deny("Project administration requires Manage staff permission.");
    if ((patch.permissionOverrides || patch.demoRole) && !canManage)
      return deny("Changing profile permissions requires Manage permission.");
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
    if (
      scope.ownership === "Mine" &&
      patch.staffIds?.some((id) => id !== currentPerson?.id)
    )
      return deny("This role can assign work to itself only.");
    if (
      patch._stockMovement?.orderId &&
      !accessibleRecords.some((r) => r.id === patch._stockMovement.orderId)
    )
      return deny("The receiving job is outside your access.");
    if (
      ["leave", "timesheets", "documents", "training"].includes(
        moduleInfo(record.module).type,
      ) &&
      ["Approved", "Rejected"].includes(patch.approval) &&
      approvalType(record)
    ) {
      if (!currentPerson)
        return deny("Choose a staff profile before reviewing.");
      return onUpdate(orgId, id, {
        _actor: actorMeta,
        _approval: {
          token: approvalToken(record),
          actorId: currentPerson.id,
          decision: patch.approval === "Approved" ? "Approve" : "Reject",
          comment: "Decision recorded in " + record.module,
        },
      });
    }
    if (
      record.requiresSupervisorReview &&
      ["Approved", "Requires changes"].includes(patch.review)
    ) {
      if (!record.completionRequestedAt)
        return deny("Submit work for supervisor approval first.");
      if (!currentPerson)
        return deny(
          "Choose an active staff member using Working as before reviewing.",
        );
      return onUpdate(orgId, id, {
        _actor: actorMeta,
        _approval: {
          token: approvalToken(record),
          actorId: currentPerson.id,
          decision: patch.review === "Approved" ? "Approve" : "Request changes",
          comment: "Supervisor completion review",
        },
      });
    }
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
          ...(payload.staffIds || []),
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
  const platformNotices = platformAnnouncements.filter((a) =>
    platformAnnouncementRelevant(a, org),
  );
  const shared = {
    platformNotices,
    org: visibleOrg,
    records: accessibleRecords,
    historyRecords: permittedRecords,
    onNavigate: navigate,
    onUpdate: safeUpdate,
    actor: activeActor,
    canEdit,
  };
  const focusId =
    canonicalModule(focus?.page, visibleOrg.modules) === current
      ? focus.id
      : null;
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
        notices={[
          ...accessibleRecords.filter((r) => r.recordType === "notice"),
          ...platformNotices.map((a) => ({
            ...a,
            orgId: org.id,
            module: "Dashboard",
            status: "Published",
            audience: "Company",
            publishedAt: a.publishedAt || a.date,
          })),
        ]}
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
  else if (current === "Business archives")
    content = (
      <ArchivesWorkspace
        {...shared}
        records={permittedRecords}
        canEdit={canEdit && canApprove}
        canExport={canExport}
        focusId={focusId}
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
        records={permittedRecords}
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
        canManageProjects={canManageStaff}
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
        historyRecords={permittedRecords}
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
        onConfigure={configure}
        actorId={currentPerson?.id || ""}
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
  else if (moduleInfo(current).type === "documents")
    content = (
      <DocumentWorkspace
        actorId={currentPerson?.id || ""}
        recentAccess={documentAccess}
        onAccess={markDocumentAccess}
        key={current}
        {...shared}
        module={current}
        onAdd={safeAdd}
        focusId={focusId}
        canCreate={canCreate}
        canExport={canExport}
      />
    );
  else if (moduleInfo(current).type === "inventory")
    content = (
      <InventoryWorkspace
        key={current}
        {...shared}
        module={current}
        onAdd={safeAdd}
        focusId={focusId}
        canCreate={canCreate}
      />
    );
  else if (moduleInfo(current).type === "archives")
    content = (
      <CollectionWorkspace
        {...shared}
        module={current}
        onAdd={safeAdd}
        canCreate={canCreate}
        canExport={canExport}
        focusId={focusId}
      />
    );
  else if (moduleInfo(current).type === "visitors")
    content = (
      <VisitorWorkspace
        {...shared}
        module={current}
        onAdd={safeAdd}
        canCreate={canCreate}
        canExport={canExport}
      />
    );
  else if (moduleInfo(current).type === "donations")
    content = (
      <FundraisingWorkspace
        {...shared}
        module={current}
        onAdd={safeAdd}
        canCreate={canCreate}
        canExport={canExport}
        focusId={focusId}
      />
    );
  else if (moduleInfo(current).type === "safety")
    content = (
      <SafetyWorkspace
        {...shared}
        module={current}
        onAdd={safeAdd}
        canCreate={canCreate}
        canApprove={canApprove}
        focusId={focusId}
      />
    );
  else if (moduleInfo(current).type === "fleet")
    content = (
      <FleetWorkspace
        {...shared}
        module={current}
        onAdd={safeAdd}
        canCreate={canCreate}
        focusId={focusId}
      />
    );
  else if (moduleInfo(current).type === "bookings")
    content = (
      <AppointmentsWorkspace
        onConfigure={canManage ? configure : undefined}
        key={current}
        {...shared}
        module={current}
        onAdd={safeAdd}
        canCreate={canCreate}
        focusId={focusId}
        createRequest={createRequest}
      />
    );
  else if (moduleInfo(current).type === "crm")
    content = (
      <CustomerDirectory
        key={current}
        {...shared}
        module={current}
        onAdd={safeAdd}
        canCreate={canCreate}
        focusId={focusId}
        createRequest={createRequest}
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
        onConfigure={canManage ? configure : undefined}
        key={current}
        {...shared}
        module={current}
        onAdd={safeAdd}
        canCreate={canCreate}
        canApprove={canApprove}
        focusId={focusId}
        createRequest={createRequest}
        initialCustomerId={createContext.customerId}
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
        onUpdate={safeUpdate}
        onNavigate={navigate}
        canEdit={canEdit}
        canExport={canExport}
        focusId={focusId}
      />
    );
  else if (moduleInfo(current).type === "events")
    content = (
      <CustomerEventsOps
        canExport={canExport}
        key={current}
        org={visibleOrg}
        module={current}
        records={accessibleRecords}
        onAdd={safeAdd}
        onUpdate={safeUpdate}
        canCreate={canCreate}
        canEdit={canEdit}
        onNavigate={navigate}
        focusId={focusId}
        createRequest={createRequest}
      />
    );
  else if (
    ["assets", "maintenance", "inspections", "inventory"].includes(
      moduleInfo(current).type,
    )
  )
    content = (
      <CustomerAssetOps
        historyRecords={permittedRecords}
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
            onChange={(e) => {
              setActor(
                people.find((p) => p.title === e.target.value)?.id ||
                  e.target.value,
              );
              const p = people.find((p) => p.title === e.target.value);
              if (p?.demoRole && customerRoles[p.demoRole])
                setCustomerRole(p.demoRole);
            }}
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
        records={permittedRecords}
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
