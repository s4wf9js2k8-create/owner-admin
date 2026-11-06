export const modules = [
  { name: "Volunteers", description: "Volunteer directory and availability." },
  {
    name: "Attendance & Hours",
    requires: ["Volunteers"],
    description: "Attendance sessions and contributed hours.",
  },
  { name: "Staff", description: "Staff directory and assignments." },
  { name: "Events", description: "Plan events, dates and delivery." },
  { name: "Maintenance", description: "Track defects and maintenance work." },
  { name: "Assets", description: "Equipment and asset register." },
  { name: "Archives", description: "Catalogue historical collections." },
  { name: "Daily operations", description: "Opening checks and daily tasks." },
  { name: "Projects", description: "Coordinate community projects." },
  {
    name: "Donations",
    description: "Illustrative donation ledger; no payment collection.",
  },
  { name: "Tasks", description: "Team tasks and progress." },
  {
    name: "Work orders",
    requires: ["Assets"],
    description: "Equipment work and job outcomes.",
  },
  {
    name: "Inspections",
    requires: ["Assets"],
    description: "Scheduled equipment checks.",
  },
  { name: "Schedules", description: "Planned maintenance visits." },
  { name: "Job records", description: "Completed engineering jobs." },
  {
    name: "Visitor statistics",
    description: "Fictional daily visitor counts.",
  },
  { name: "Reporting", description: "Summaries of current demo records." },
];
export const sectors = {
  heritage: {
    label: "Heritage railway / museum",
    name: "Meadow Vale Railway",
    color: "#28533a",
    modules: [
      "Volunteers",
      "Attendance & Hours",
      "Events",
      "Maintenance",
      "Assets",
      "Archives",
      "Daily operations",
      "Reporting",
    ],
  },
  charity: {
    label: "Charity / community",
    name: "Willow Community Trust",
    color: "#365b46",
    modules: [
      "Volunteers",
      "Projects",
      "Events",
      "Donations",
      "Tasks",
      "Reporting",
    ],
  },
  engineering: {
    label: "Maintenance / engineering",
    name: "Northbank Engineering",
    color: "#374f60",
    modules: [
      "Staff",
      "Work orders",
      "Assets",
      "Inspections",
      "Schedules",
      "Job records",
      "Reporting",
    ],
  },
  visitor: {
    label: "Visitor attraction",
    name: "Oakfield Discovery Park",
    color: "#4d5d38",
    modules: [
      "Staff",
      "Visitor statistics",
      "Events",
      "Maintenance",
      "Daily operations",
      "Reporting",
    ],
  },
};
export const plans = [
  { name: "Pilot", monthly: 0, annual: 0, trial: 30 },
  { name: "Starter", monthly: 25, annual: 250, trial: 14 },
  { name: "Professional", monthly: 65, annual: 650, trial: 14 },
  { name: "Enterprise", monthly: 120, annual: 1200, trial: 0 },
];
export function createOrganisation({
  name,
  sector = "heritage",
  id = crypto.randomUUID(),
}) {
  if (!name?.trim() || name.trim().length > 80 || !sectors[sector])
    throw new Error("Enter a name of 1–80 characters and a valid sector.");
  return {
    id,
    name: name.trim(),
    sector,
    color: sectors[sector].color,
    status: "Trial",
    plan: "Pilot",
    cycle: "Monthly",
    trialEnds: "2026-12-06",
    modules: [...sectors[sector].modules],
    notes: "",
    admins: [{ name: "Sample coordinator", role: "Organisation admin" }],
  };
}
export const starter = Object.entries(sectors).map(([sector, c], i) => ({
  ...createOrganisation({ name: c.name, sector, id: "demo-" + sector }),
  status: i % 2 ? "Active" : "Trial",
  plan: i % 2 ? "Professional" : "Pilot",
}));
export function toggleModule(enabled, name) {
  if (!modules.some((m) => m.name === name)) throw new Error("Unknown module");
  const next = new Set(enabled);
  if (next.has(name)) {
    next.delete(name);
    let changed = true;
    while (changed) {
      changed = false;
      for (const m of modules)
        if (next.has(m.name) && m.requires?.some((r) => !next.has(r))) {
          next.delete(m.name);
          changed = true;
        }
    }
  } else {
    const add = (n) => {
      const m = modules.find((x) => x.name === n);
      m.requires?.forEach(add);
      next.add(n);
    };
    add(name);
  }
  return [...next];
}
export function updateRecord(records, orgId, id, patch) {
  // Demo data scoping only. Production authorisation must happen on the server.
  return records.map((r) =>
    r.orgId === orgId && r.id === id
      ? { ...r, ...patch, id: r.id, orgId: r.orgId, module: r.module }
      : r,
  );
}
const examples = {
  Volunteers: [
    ["Sample volunteer A", "Visitor welcome"],
    ["Sample volunteer B", "Collections team"],
  ],
  "Attendance & Hours": [
    ["Morning volunteer shift", "4 hours"],
    ["Archive session", "3 hours"],
  ],
  Staff: [
    ["Sample team member A", "Duty supervisor"],
    ["Sample team member B", "Operations"],
  ],
  Events: [
    ["Winter open day", "12 December 2026"],
    ["Community workshop", "19 December 2026"],
  ],
  Maintenance: [
    ["Entrance lighting repair", "Workshop team"],
    ["Roof gutter inspection", "Site team"],
  ],
  Assets: [
    ["Workshop pump P-04", "Service bay"],
    ["Portable radio R-12", "Reception"],
  ],
  Archives: [
    ["Station photograph collection", "Box A-12"],
    ["Historic timetable register", "Shelf B-03"],
  ],
  "Daily operations": [
    ["Opening safety walk", "Duty team"],
    ["Close visitor areas", "Evening team"],
  ],
  Projects: [
    ["Community garden", "Winter planting"],
    ["Warm space sessions", "Weekly programme"],
  ],
  Donations: [
    ["Fictional fundraising event", "£240 sample total"],
    ["Fictional collection box", "£85 sample total"],
  ],
  Tasks: [
    ["Prepare activity room", "Community team"],
    ["Check supplies", "Stores team"],
  ],
  "Work orders": [
    ["Replace pump seal", "Pump P-04"],
    ["Inspect drive belt", "Workshop motor"],
  ],
  Inspections: [
    ["Pump pressure check", "Pump P-04"],
    ["Tool safety inspection", "Service bay"],
  ],
  Schedules: [
    ["Monthly equipment service", "10 December 2026"],
    ["Quarterly site visit", "15 December 2026"],
  ],
  "Job records": [
    ["Motor bearing replacement", "Service bay"],
    ["Lighting circuit repair", "Main site"],
  ],
  "Visitor statistics": [
    ["Saturday visitors", "184 sample visitors"],
    ["Sunday visitors", "206 sample visitors"],
  ],
};
export function seedRecords(orgs) {
  return orgs.flatMap((o) =>
    o.modules
      .filter((m) => m !== "Reporting")
      .flatMap((m) =>
        (examples[m] || []).map(([title, detail], i) => ({
          id: `${o.id}-${m}-${i}`,
          orgId: o.id,
          module: m,
          title,
          detail,
          status: i ? "In progress" : "Planned",
          priority: i ? "High" : "Normal",
          owner: i ? "Sample operations team" : "",
          dueDate: i ? "2026-12-15" : "2026-12-10",
        })),
      ),
  );
}
export function visibleRecords(records, org, module, query = "") {
  return records.filter(
    (r) =>
      r.orgId === org.id &&
      org.modules.includes(r.module) &&
      (!module || r.module === module) &&
      `${r.title} ${r.detail}`.toLowerCase().includes(query.toLowerCase()),
  );
}
