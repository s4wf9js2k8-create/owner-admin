export const modules = [
  { name: "Tasks & projects", description: "Collaborative board, deadlines, checklists and task progress." },
  { name: "Staff & volunteers", description: "A combined people and team directory." },
  { name: "Attendance & timesheets", requires: ["Staff & volunteers"], description: "Attendance sessions and sample timesheet reviews." },
  { name: "Shift rotas", requires: ["Staff & volunteers"], description: "Team shift plans and rota coverage." },
  { name: "Leave and availability", requires: ["Staff & volunteers"], description: "Leave requests and sample availability." },
  { name: "Assets & equipment", description: "Equipment condition and asset tracking." },
  { name: "Maintenance & work orders", requires: ["Assets & equipment"], description: "Maintenance jobs, defects and work orders." },
  { name: "Inspections & checklists", requires: ["Assets & equipment"], description: "Inspection findings and checklists." },
  { name: "Documents & files", description: "Document catalogue and version references." },
  { name: "Events & bookings", description: "Event plans, venues and activity bookings." },
  { name: "Reports & analytics", description: "Operational charts and completion reporting." },
  { name: "Inventory and stock", description: "Stock quantities and reorder thresholds." },
  { name: "Customers / CRM", description: "Customer relationships and a prospect pipeline." },
  { name: "Quotes and invoices", requires: ["Customers / CRM"], description: "Fictional commercial document register, no payments." },
  { name: "Training and qualifications", requires: ["Staff & volunteers"], description: "Training records and renewal dates." },
  { name: "Health & safety", description: "Hazards, corrective actions and risk tracking." },
  { name: "Vehicle / fleet management", description: "Fleet records, servicing and vehicle locations." },
  { name: "Forms and surveys", description: "Submitted forms and review states." },
  { name: "Bookings and appointments", description: "Visits and appointment schedules." },
  { name: "Donations and fundraising", description: "Fictional fundraising and campaign totals." },
  { name: "Archives and collections", description: "Catalogue historic items and storage locations." },
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
      "Tasks & projects", "Staff & volunteers", "Shift rotas", "Documents & files",
      "Assets & equipment", "Inspections & checklists", "Forms and surveys",
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
      "Tasks & projects", "Staff & volunteers", "Shift rotas", "Attendance & timesheets", "Leave and availability", "Documents & files", "Donations and fundraising", "Forms and surveys",
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
      "Tasks & projects", "Staff & volunteers", "Shift rotas", "Attendance & timesheets", "Assets & equipment", "Maintenance & work orders", "Health & safety", "Vehicle / fleet management", "Customers / CRM", "Quotes and invoices", "Documents & files",
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
      "Tasks & projects", "Staff & volunteers", "Shift rotas", "Attendance & timesheets", "Events & bookings", "Bookings and appointments", "Inventory and stock", "Documents & files", "Forms and surveys",
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
  "Tasks & projects": [["Review outstanding work", "Coordinate priority tasks"], ["Plan next improvement", "Prepare delivery milestones"]],
  "Staff & volunteers": [["Sample coordinator A", "Team lead"], ["Sample colleague B", "Operations team"]],
  "Attendance & timesheets": [["Morning workshop shift", "Sample 4-hour shift"], ["Afternoon volunteer support", "Sample 3-hour shift"]],
  "Shift rotas": [["Morning team rota", "Front of house"], ["Weekend support rota", "Site operations"]],
  "Leave and availability": [["Sample annual leave request", "Two days leave"], ["Sample volunteer unavailability", "Weekend request"]],
  "Assets & equipment": [["Workshop compressor", "Equipment register"], ["Visitor radio set", "Portable equipment"]],
  "Maintenance & work orders": [["Service workshop compressor", "Replace intake filter"], ["Repair site lighting", "Inspect wiring"]],
  "Inspections & checklists": [["Workshop tool inspection", "Monthly equipment checks"], ["Site entrance inspection", "Daily safety checks"]],
  "Documents & files": [["Health and safety policy", "Operations documentation"], ["Maintenance instruction", "Workshop handbook"]],
  "Events & bookings": [["Public open day", "Sample weekend event"], ["Community workshop", "Group booking"]],
  "Inventory and stock": [["Hi-vis safety vest", "PPE stock"], ["Workshop consumables", "Maintenance supplies"]],
  "Customers / CRM": [["Example customer A", "Enquiry about planned works"], ["Example prospect B", "Request for quotation"]],
  "Quotes and invoices": [["Draft quote Q-100", "Sample maintenance quotation"], ["Invoice INV-200", "Fictional example invoice"]],
  "Training and qualifications": [["First aid training", "Sample certificate"], ["Site induction", "Example renewal"]],
  "Health & safety": [["Uneven walkway", "Trip hazard identified"], ["Workshop storage", "Review access arrangements"]],
  "Vehicle / fleet management": [["Site van F-01", "Operations vehicle"], ["Maintenance pickup F-02", "Engineering support"]],
  "Forms and surveys": [["Visitor feedback", "Example survey submission"], ["Daily handover form", "Operational checklist"]],
  "Bookings and appointments": [["Group tour reservation", "Example afternoon visit"], ["Equipment consultation", "Sample customer visit"]],
  "Donations and fundraising": [["Sample collection box", "Illustrative donation"], ["Summer fundraiser", "Example campaign"]],
  "Archives and collections": [["Historical photograph set", "Railway collection"], ["Original route timetable", "Reference archives"]],
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
const extras = {
  "Attendance & Hours": [{person:"Sample volunteer A",startTime:"2026-11-06T09:00",endTime:"",approval:"Pending"},{person:"Sample volunteer B",startTime:"2026-11-06T13:00",endTime:"2026-11-06T16:00",approval:"Approved"}],
  "Tasks & projects": [
    { owner: "Sample project lead", checklist: [{text:"Gather requirements",done:true},{text:"Confirm task owner",done:false},{text:"Review completion",done:false}], tags:"Planning", recurrence:"Weekly", comments:[] },
    { owner: "Sample delivery team", checklist: [{text:"Agree milestones",done:false},{text:"Prepare materials",done:false}], tags:"Delivery", recurrence:"None", comments:[] },
  ],
  "Staff & volunteers": [{role:"Coordinator",team:"Operations",contact:"sample@example.invalid"},{role:"Assistant",team:"Visitor services",contact:"example@example.invalid"}],
  "Assets & equipment": [{asset:"EQ-101",location:"Workshop",condition:"Good"},{asset:"EQ-102",location:"Main building",condition:"Monitor"}],
  "Maintenance & work orders": [{asset:"EQ-101",fault:"Replace and test filter",severity:"Medium"},{asset:"EQ-102",fault:"Inspect and repair lighting",severity:"High"}],
  "Inspections & checklists": [{asset:"Workshop",result:"Pending",inspector:"Sample inspector"},{asset:"Entrance",result:"Requires attention",inspector:"Sample supervisor"}],
  "Attendance & timesheets": [{person:"Sample coordinator A",startTime:"2026-11-06T09:00",endTime:"",approval:"Pending"},{person:"Sample colleague B",startTime:"2026-11-06T13:00",endTime:"2026-11-06T16:00",approval:"Approved"}],
  "Shift rotas": [{person:"Sample colleague B",startTime:"2026-11-10T09:00",endTime:"2026-11-10T13:00",location:"Office"},{person:"Sample coordinator A",startTime:"2026-11-11T10:00",endTime:"2026-11-11T17:00",location:"Site"}],
  "Leave and availability": [{person:"Sample coordinator A",startDate:"2026-11-12",endDate:"2026-11-13",approval:"Pending"},{person:"Sample colleague B",startDate:"2026-11-20",endDate:"2026-11-22",approval:"Approved"}],
  "Documents & files": [{folder:"Policies",version:"v1.1",documentType:"Policy"},{folder:"Technical",version:"v2",documentType:"Procedure"}],
  "Events & bookings": [{location:"Main hall",startTime:"2026-11-14T10:00",capacity:"40"},{location:"Workshop",startTime:"2026-11-21T13:00",capacity:"20"}],
  "Inventory and stock": [{sku:"PPE-001",quantity:"5",reorder:"10",location:"Stores"},{sku:"OPS-002",quantity:"42",reorder:"15",location:"Workshop"}],
  "Customers / CRM": [{contact:"Sample contact A",stage:"Lead",company:"Example Co A"},{contact:"Sample contact B",stage:"Proposal",company:"Example Co B"}],
  "Quotes and invoices": [{reference:"Q-100",amount:"240",paymentStatus:"Draft"},{reference:"INV-200",amount:"580",paymentStatus:"Sent (demo)"}],
  "Training and qualifications": [{person:"Sample coordinator A",qualification:"First aid",expiry:"2027-06-15"},{person:"Sample colleague B",qualification:"Site induction",expiry:"2027-02-10"}],
  "Health & safety": [{location:"Visitor path",severity:"Medium",action:"Mark and repair surface"},{location:"Workshop",severity:"High",action:"Secure shelving"}],
  "Vehicle / fleet management": [{registration:"F-01",location:"Operations yard",serviceDue:"2027-01-10"},{registration:"F-02",location:"Service bay",serviceDue:"2026-12-15"}],
  "Forms and surveys": [{formName:"Visitor feedback",submittedBy:"Sample visitor",approval:"Pending"},{formName:"Daily handover",submittedBy:"Sample team",approval:"Reviewed"}],
  "Bookings and appointments": [{person:"Sample visitor A",startTime:"2026-11-16T11:00",location:"Reception"},{person:"Sample customer B",startTime:"2026-11-18T14:00",location:"Workshop"}],
  "Donations and fundraising": [{campaign:"General fund",amount:"35",source:"Sample cash"},{campaign:"Summer appeal",amount:"150",source:"Sample event"}],
  "Archives and collections": [{reference:"ARC-101",location:"Box A-02",category:"Photographs"},{reference:"ARC-102",location:"Shelf C-03",category:"Documents"}],
};

export function seedRecords(orgs) {
  return orgs.flatMap(o=>[
    ...o.modules.filter(m=>m!=="Reporting").flatMap(m=>(examples[m]||[]).map(([title,detail],i)=>({
      id:o.id+"-"+m+"-"+i,orgId:o.id,module:m,title,detail,
      status:i?"In progress":"Planned",priority:i?"High":"Normal",
      owner:i?"Sample operations team":"",dueDate:i?"2026-11-18":"2026-11-10",
      ...(extras[m]?.[i]||{}),
      ...(m==="Tasks & projects"?{recordType:"task",projectId:o.id+"-sample-project"}:{})
    }))),
    ...(o.modules.includes("Tasks & projects")?[{
      id:o.id+"-sample-project",orgId:o.id,module:"Tasks & projects",recordType:"project",
      title:"Site improvement programme",detail:"Example programme bringing sample site improvements together.",
      owner:"Sample project lead",members:"Sample delivery team, Sample project lead",status:"In progress",
      dueDate:"2026-12-20",budget:3500,risk:"Medium",
      milestones:[{text:"Scope agreed",done:true},{text:"Work scheduled",done:false},{text:"Final review",done:false}]
    }]:[])
  ]);
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
