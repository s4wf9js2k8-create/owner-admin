export const ownerRoles = [
  "Platform Owner",
  "Platform Administrator",
  "Support Agent",
  "Sales Representative",
  "Read-only Auditor",
];
const all = [
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
export function ownerPageAllowed(role, page) {
  return role === "Platform Owner" ||
    role === "Platform Administrator" ||
    role === "Read-only Auditor"
    ? all.includes(page)
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
export const ownerCanManage = (role) =>
  ["Platform Owner", "Platform Administrator"].includes(role);
export const ownerCanSupport = (role) =>
  ownerCanManage(role) || role === "Support Agent";
export function illustrativeAmount(org, plans) {
  const plan = plans.find((p) => p.name === org.plan);
  if (!plan) return null;
  const negotiated = org.negotiatedPrice;
  if (
    negotiated !== undefined &&
    negotiated !== "" &&
    Number.isFinite(Number(negotiated))
  )
    return Number(negotiated);
  return Number(org.cycle === "Annual" ? plan.annual : plan.monthly);
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

export const ownerCanWritePage = (role, page) =>
  ownerCanManage(role) ||
  (role === "Support Agent" &&
    ["Support", "Feature Requests"].includes(page)) ||
  (role === "Sales Representative" && page === "Sales Leads");
