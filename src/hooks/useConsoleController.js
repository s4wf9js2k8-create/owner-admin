import { useState, useRef } from "react";
import { useBackend } from "./useBackend";
import { useDrawer } from "./useDrawer";
import { demoRoleDefaults, defaultRoleModules } from "../customerWorkflows";
export function useConsoleController(backend) {
  const { data, status, error, run, retry } = useBackend(backend);
  const { orgs, records, tickets, logs, plans, flags } = data;
  const setPlans = (value) => run(() => backend.demoSettings.setPlans(value));
  const setFlags = (value) => run(() => backend.demoSettings.setFlags(value));
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
    [customerRole,setCustomerRole] = useState("Manager"),
    [customerRoles,setCustomerRoles] = useState(demoRoleDefaults),
    [roleModules,setRoleModules] = useState(defaultRoleModules);
  const menuRef = useRef(null),
    menuButton = useRef(null);
  const active = orgs.find((o) => o.id === selected) || orgs[0],
    ticket = tickets.find((t) => t.id === ticketId);
  const log = async (event, orgId = active?.id) => {
    if (await run(() => backend.auditEvents.append(orgId, event)))
      setMessage(event);
  };
  const update = async (id, patch, event = "Updated example organisation") => {
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
  const closeMenu = useDrawer(menuOpen, setMenuOpen, menuRef, menuButton);
  const changeTicket = async (patch) => {
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
      setCustomerRole("Manager");
      setCustomerRoles(demoRoleDefaults);
      setRoleModules(defaultRoleModules);
      setMessage("Fictional demo reset. All session changes cleared.");
    }
  };
  return {
    backend,
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
    setForm,
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
    customerRoles,
    setCustomerRoles,
    roleModules,
    setRoleModules,
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
