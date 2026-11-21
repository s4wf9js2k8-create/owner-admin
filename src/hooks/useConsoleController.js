import {
  ownerCanManage,
  ownerCanSupport,
  ownerPageAllowed,
} from "../owner/rules";
import { useState, useRef } from "react";
import { useBackend } from "./useBackend";
import { useDrawer } from "./useDrawer";
import { demoRoleDefaults, defaultRoleModules } from "../customerWorkflows";
export function useConsoleController(backend) {
  const { data, status, error, run: rawRun, retry } = useBackend(backend);
  const { orgs, records, tickets, logs, plans, flags } = data;
  const [ownerRole, setOwnerRole] = useState("Platform Owner");
  const deny = () => {
    setMessage(
      "This action is unavailable to the selected demonstration owner role.",
    );
    return Promise.resolve(false);
  };
  const run = (operation) =>
    !customer && ownerRole === "Read-only Auditor" ? deny() : rawRun(operation);
  const setPlans = (value) =>
    ownerCanManage(ownerRole)
      ? run(() => backend.demoSettings.setPlans(value))
      : deny();
  const setFlags = (value) =>
    ownerCanManage(ownerRole)
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
          actorName: "Fictional operator",
          role: ownerRole,
          module: page,
        }),
      )
    )
      setMessage(event);
  };
  const update = async (id, patch, event = "Updated example organisation") => {
    if (!customer && !ownerCanManage(ownerRole)) return deny();
    const saved = await run(() =>
      "modules" in patch
        ? backend.entitlements.replace(id, patch.modules)
        : "admins" in patch
          ? backend.memberships.replace(id, patch.admins)
          : backend.organisations.update(id, patch),
    );
    if (saved) await log(event, id);
    return saved;
  };
  const navigate = (name) => {
    if (!customer && !ownerPageAllowed(ownerRole, name)) {
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
    if (!customer && !ownerCanManage(ownerRole)) return deny();
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
  const closeMenu = useDrawer(menuOpen, setMenuOpen, menuRef, menuButton);
  const changeTicket = async (patch) => {
    if (!ownerCanSupport(ownerRole)) return deny();
    if (
      await run(() =>
        backend.supportTickets.update(ticket.orgId, ticketId, patch),
      )
    )
      await log("Updated sample ticket " + ticket.subject, ticket.orgId);
  };
  const reset = async () => {
    if (await run(() => backend.reset())) {
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
    }
  };
  return {
    backend,
    ownerRole,
    setOwnerRole,
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
    setForm: (value) => (ownerCanManage(ownerRole) ? setForm(value) : deny()),
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
