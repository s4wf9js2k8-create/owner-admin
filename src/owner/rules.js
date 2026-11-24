export const ownerRoles = [
  "Platform Owner",
  "Platform Administrator",
  "Support Agent",
  "Sales Representative",
  "Read-only Auditor",
];
export const ownerPages = [
  "Overview",
  "Organisations",
  "Company Profile",
  "Modules",
  "Subscriptions",
  "Users",
  "Support",
  "Activity Logs",
  "Onboarding",
  "Branding Templates",
  "Client Insights",
  "Feature Requests",
  "Product Roadmap",
  "Sales Leads",
  "Announcements",
  "Infrastructure",
  "Settings",
  "Owner Access",
];
export function ownerPageAllowed(role, page, policies = {}) {
  const original = role;
  role = ownerRoles.includes(role)
    ? role
    : policies.customRoles?.find((r) => r.name === role)?.base;
  if (
    original !== "Platform Owner" &&
    policies.roles?.[original]?.disabledPages?.includes(page)
  )
    return false;
  return role === "Platform Owner" ||
    role === "Platform Administrator" ||
    role === "Read-only Auditor"
    ? ownerPages.includes(page)
    : role === "Support Agent"
      ? [
          "Overview",
          "Support",
          "Feature Requests",
          "Product Roadmap",
          "Activity Logs",
        ].includes(page)
      : role === "Sales Representative"
        ? [
            "Overview",
            "Sales Leads",
            "Client Insights",
            "Activity Logs",
          ].includes(page)
        : false;
}
export const ownerBase = (role, policies = {}) =>
  ownerRoles.includes(role)
    ? role
    : policies.customRoles?.find((r) => r.name === role)?.base;
export const ownerCanManage = (role, policies = {}) =>
  ["Platform Owner", "Platform Administrator"].includes(
    ownerBase(role, policies),
  ) &&
  (role === "Platform Owner" ||
    (!policies.roles?.[role]?.readOnly &&
      policies.roles?.[role]?.manage !== false));
export const ownerCanSupport = (role, policies = {}) =>
  ownerCanWritePage(role, "Support", policies);
export function illustrativeAmount(org, plans) {
  const plan = plans.find((p) => p.name === org.plan);
  if (!plan) return null;
  const negotiated = org.negotiatedPrice;
  const base =
    negotiated !== undefined &&
    negotiated !== "" &&
    Number.isFinite(Number(negotiated))
      ? Number(negotiated)
      : Number(org.cycle === "Annual" ? plan.annual : plan.monthly);
  const addons = (plan.addons || [])
    .filter(
      (a) =>
        (org.subscriptionAddons || []).includes(a.module) &&
        !(plan.includedModules || []).includes(a.module),
    )
    .reduce((n, a) => n + Number(a.monthly || 0), 0);
  return (
    Math.round((base + addons * (org.cycle === "Annual" ? 12 : 1)) * 100) / 100
  );
}
export function reorder(values, id, delta) {
  const result = [...values],
    a = result.indexOf(id),
    b = a + delta;
  if (a < 0 || b < 0 || b >= result.length) return result;
  [result[a], result[b]] = [result[b], result[a]];
  return result;
}

export const dashboardWidgetsFor = (preset) =>
  ({
    Engineering: ["attention", "staff", "work", "shifts"],
    Operations: ["staff", "shifts", "attention", "work"],
    Community: ["events", "shifts", "staff", "work"],
    Visitor: ["events", "visitors", "staff", "bookings"],
  })[preset] || ["staff", "shifts", "attention", "work"];

export function monthlyEquivalent(org, plans) {
  const value = illustrativeAmount(org, plans);
  return value === null ? null : value / (org.cycle === "Annual" ? 12 : 1);
}

export const ownerCanWritePage = (role, page, policies = {}) =>
  ownerPageAllowed(role, page, policies) &&
  (role === "Platform Owner" ||
    (!policies.roles?.[role]?.readOnly &&
      !policies.roles?.[role]?.disabledWrites?.includes(page))) &&
  (ownerCanManage(role, policies) ||
    (ownerBase(role, policies) === "Support Agent" &&
      ["Support", "Feature Requests"].includes(page)) ||
    (ownerBase(role, policies) === "Sales Representative" &&
      page === "Sales Leads"));
export const configuredOwnerRoles = (flags) => [
  ...ownerRoles,
  ...(flags?.ownerPolicies?.customRoles || []).map((r) => r.name),
];
