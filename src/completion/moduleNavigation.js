import { moduleInfo } from "../customerModules.js";
export const preferredModule = {
  people: "Staff & volunteers",
  inspections: "Inspections & checklists",
  archives: "Archives and collections",
  reporting: "Reports & analytics",
  assets: "Assets & equipment",
  maintenance: "Maintenance & work orders",
  schedule: "Shift rotas",
  timesheets: "Attendance & timesheets",
  events: "Events & bookings",
  projects: "Tasks & projects",
  donations: "Donations and fundraising",
};
export const canonicalModule = (name, enabled) => {
  const preferred = preferredModule[moduleInfo(name).type];
  return preferred
    ? enabled.includes(preferred)
      ? preferred
      : enabled.find((m) => moduleInfo(m).type === moduleInfo(name).type) ||
        name
    : name;
};
export function uniqueModules(enabled) {
  const result = [];
  for (const name of enabled) {
    const canonical = canonicalModule(name, enabled),
      type = moduleInfo(canonical).type;
    if (preferredModule[type]) {
      if (result.some((n) => moduleInfo(n).type === type)) continue;
    }
    if (!result.includes(canonical)) result.push(canonical);
  }
  return result;
}
