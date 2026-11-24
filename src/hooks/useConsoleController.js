import { toggleModule } from "../model";
import {
  ownerCanManage,
  ownerCanSupport,
  ownerPageAllowed,
  ownerCanWritePage,
} from "../owner/rules";
import { useState, useRef } from "react";
import { useBackend } from "./useBackend";
import { useDrawer } from "./useDrawer";
import { demoRoleDefaults, defaultRoleModules } from "../customerWorkflows";
export function useConsoleController(backend) {
  const { data, status, error, run: rawRun, retry } = useBackend(backend);
  const { orgs, records, tickets, logs, plans, flags } = data;
  const [ownerAccountId, setOwnerAccountId] = useState("");
  const ownerAccount = flags.ownerAccounts?.find(
    (a) => a.id === ownerAccountId,
  );
  const [previewOwnerRole, setOwnerRole] = useState("Platform Owner");
  const ownerRole = ownerAccount?.role || previewOwnerRole;
  const deny = () => {
    setMessage(
      "This action is unavailable to the selected demonstration owner role.",
    );
    return Promise.resolve(false);
  };
  const run = (operation) =>
    !customer &&
    (!ownerCanWritePage(ownerRole, page, flags.ownerPolicies) ||
      ownerAccount?.status === "Suspended")
      ? deny()
      : rawRun(operation);
  const setPlans = (value) =>
    ownerCanManage(ownerRole, flags.ownerPolicies)
      ? run(() => backend.demoSettings.setPlans(value))
      : deny();
  const setFlags = (value) =>
    ownerCanManage(ownerRole, flags.ownerPolicies)
      ? run(() => backend.demoSettings.setFlags(value))
      : deny();
  const [page, setPage] = useState("Overview"),
    [menuOpen, setMenuOpen] = useState(false),
    [selected, setSelected] = useState(orgs[0]?.id),
    [query, setQuery] = useState(""),
    [statusFilter, setStatusFilter] = useState("All"),
    [form, setForm] = useState(null),
    [message, setMessage] = useState(""),
    [customer, setCustomer] = useState(false),
    [customerPage, setCustomerPage] = useState("Dashboard"),
    [confirm, setConfirm] = useState(null),
    [ticketId, setTicketId] = useState("ticket-1"),
    [customerRole, setCustomerRole] = useState("Administrator"),
    [customerRoles, setCustomerRoles] = useState(demoRoleDefaults),
    [roleModules, setRoleModules] = useState(defaultRoleModules),
    [roleTeams, setRoleTeams] = useState({
      Administrator: "All teams",
      Manager: "All teams",
      Staff: "All teams",
      Viewer: "All teams",
    });
  const menuRef = useRef(null),
    menuButton = useRef(null);
  const active = orgs.find((o) => o.id === selected) || orgs[0],
    ticket = tickets.find((t) => t.id === ticketId);
  const log = async (event, orgId = active?.id) => {
    if (
      await run(() =>
        backend.auditEvents.append(orgId, event, {
          actorName: ownerAccount?.name || "Fictional operator",
          role: ownerRole,
          module: page,
        }),
      )
    )
      setMessage(event);
  };
  const update = async (id, patch, event = "Updated example organisation") => {
    if (!customer && !ownerCanManage(ownerRole, flags.ownerPolicies))
      return deny();
    const saved = await run(async () => {
      const { modules: enabled, admins, ...fields } = patch;
      if (enabled) await backend.entitlements.replace(id, enabled);
      if (admins) await backend.memberships.replace(id, admins);
      if (fields.plan) {
        const plan = plans.find((p) => p.name === fields.plan);
        let combined = backend
          .getSnapshot()
          .orgs.find((o) => o.id === id).modules;
        for (const name of plan?.includedModules || [])
          if (!combined.includes(name)) combined = toggleModule(combined, name);
        await backend.entitlements.replace(id, combined);
      }
      if (Object.keys(fields).length)
        await backend.organisations.update(id, fields);
    });
    if (saved) await log(event, id);
    return saved;
  };
  const navigate = (name) => {
    if (!customer && !ownerPageAllowed(ownerRole, name, flags.ownerPolicies)) {
      deny();
      return;
    }
    setPage(name);
    setMenuOpen(false);
    setQuery("");
  };
  const profile = (id) => {
    setSelected(id);
    navigate("Company Profile");
  };
  const preview = (id) => {
    if (!customer && !ownerCanManage(ownerRole, flags.ownerPolicies))
      return deny();
    if (
      !flags.customerPreview ||
      !orgs.some(
        (o) => o.id === id && !["Archived", "Suspended"].includes(o.status),
      )
    )
      return;
    setSelected(id);
    setCustomer(true);
    setCustomerPage("Dashboard");
    setMenuOpen(false);
  };
  const closeMenu = useDrawer(menuOpen, setMenuOpen, menuRef, menuButton);
  const changeTicket = async (patch) => {
    if (!ownerCanSupport(ownerRole, flags.ownerPolicies)) return deny();
    if (
      await run(() =>
        backend.supportTickets.update(ticket.orgId, ticketId, patch),
      )
    )
      await log("Updated sample ticket " + ticket.subject, ticket.orgId);
  };
  const reset = async () => {
    if (await rawRun(() => backend.reset())) {
      setSelected(backend.getSnapshot().orgs[0]?.id);
      setPage("Overview");
      setCustomer(false);
      setCustomerPage("Dashboard");
      setMenuOpen(false);
      setForm(null);
      setConfirm(null);
      setTicketId("ticket-1");
      setQuery("");
      setStatusFilter("All");
      setOwnerRole("Platform Owner");
      setOwnerAccountId("");
      setCustomerRole("Administrator");
      setCustomerRoles(demoRoleDefaults);
      setRoleModules(defaultRoleModules);
      setRoleTeams({
        Administrator: "All teams",
        Manager: "All teams",
        Staff: "All teams",
        Viewer: "All teams",
      });
      setMessage("Fictional demo reset. All session changes cleared.");
      return true;
    }
    return false;
  };
  return {
    backend,
    denyOwnerAction: deny,
    ownerRole,
    setOwnerRole,
    ownerAccountId,
    setOwnerAccountId,
    ownerAccount,
    run,
    status,
    error,
    retry,
    reset,
    page,
    setPage,
    menuOpen,
    setMenuOpen,
    orgs,
    selected,
    setSelected,
    query,
    setQuery,
    statusFilter,
    setStatusFilter,
    form,
    setForm: (value) =>
      ownerCanManage(ownerRole, flags.ownerPolicies) &&
      ownerCanWritePage(ownerRole, "Organisations", flags.ownerPolicies)
        ? setForm(value)
        : deny(),
    logs,
    message,
    plans,
    setPlans,
    records,
    customer,
    setCustomer,
    customerPage,
    setCustomerPage,
    customerRole,
    setCustomerRole,
    customerRoles: active?.workspaceConfig?.roles || customerRoles,
    setCustomerRoles,
    roleModules: active?.workspaceConfig?.roleModules || roleModules,
    setRoleModules,
    roleTeams: active?.workspaceConfig?.roleTeams || roleTeams,
    setRoleTeams,
    confirm,
    setConfirm,
    flags,
    setFlags,
    saveOwnerPreferences: (values) =>
      ownerAccount?.status === "Suspended"
        ? deny()
        : rawRun(() =>
            backend.demoSettings.setFlags({
              ...backend.getSnapshot().flags,
              ownerUserPrefs: {
                ...backend.getSnapshot().flags.ownerUserPrefs,
                [ownerAccountId || ownerRole]: values,
              },
            }),
          ),
    ticketId,
    setTicketId,
    tickets,
    menuRef,
    menuButton,
    active,
    ticket,
    log,
    update,
    navigate,
    profile,
    preview,
    closeMenu,
    changeTicket,
  };
}
