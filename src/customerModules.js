// Customer-facing module definitions for the fictional demonstration.
// Identity keys for existing modules are kept for backwards-compatible fixtures.
export const moduleSpecs = {
  "Tasks & projects": {type:"projects",title:"Tasks & projects",subtitle:"Team work, deliverables and milestones.",fields:[["project","Project"],["owner","Assignee"],["dueDate","Deadline","date"]]},
  Tasks: {type:"projects",title:"Tasks",subtitle:"Team work and prioritised action items.",fields:[["owner","Assignee"],["dueDate","Deadline","date"]]},
  Projects: {type:"projects",title:"Projects",subtitle:"Track project outcomes and delivery.",fields:[["owner","Lead"],["dueDate","Target date","date"]]},
  "Staff & volunteers": {type:"people",title:"People directory",subtitle:"Your people, roles, skills and availability.",fields:[["person","Person"],["role","Role"],["team","Team"],["contact","Contact (fictional)"]]},
  Staff: {type:"people",title:"Staff directory",subtitle:"Team roles and assignments.",fields:[["role","Role"],["team","Department"],["contact","Contact (fictional)"]]},
  Volunteers: {type:"people",title:"Volunteers",subtitle:"Volunteer profiles and contributions.",fields:[["role","Role"],["team","Volunteer team"],["contact","Contact (fictional)"]]},
  "Attendance & timesheets": {type:"timesheets",title:"Attendance & timesheets",subtitle:"Review sample shift times and approval status.",fields:[["person","Person"],["startTime","Clock in","datetime-local"],["endTime","Clock out","datetime-local"],["approval","Approval",["Pending","Approved","Rejected"]]]},
  "Attendance & Hours": {type:"timesheets",title:"Attendance & hours",subtitle:"Sample attendance sessions and hours.",fields:[["person","Person"],["startTime","Start time","datetime-local"],["endTime","End time","datetime-local"],["approval","Approval",["Pending","Approved","Rejected"]]]},
  "Shift rotas": {type:"schedule",title:"Shift rotas",subtitle:"See who is scheduled and where.",fields:[["person","Team member"],["startTime","Shift start","datetime-local"],["endTime","Shift end","datetime-local"],["location","Location"]]},
  "Leave and availability": {type:"leave",title:"Leave & availability",subtitle:"Sample leave requests and team capacity.",fields:[["person","Team member"],["startDate","Start date","date"],["endDate","End date","date"],["approval","Decision",["Pending","Approved","Rejected"]]]},
  "Assets & equipment": {type:"assets",title:"Assets & equipment",subtitle:"Equipment, locations, condition and maintenance links.",fields:[["asset","Asset reference"],["location","Location"],["condition","Condition",["Good","Monitor","Needs attention","Out of service"]]]},
  Assets: {type:"assets",title:"Asset register",subtitle:"Equipment, locations and condition.",fields:[["asset","Asset ID"],["location","Location"],["condition","Condition",["Good","Monitor","Needs attention","Out of service"]]]},
  "Maintenance & work orders": {type:"maintenance",title:"Maintenance & work orders",subtitle:"Defects, planned service and completed work.",fields:[["asset","Affected asset"],["fault","Work required"],["severity","Severity",["Low","Medium","High","Critical"]]]},
  Maintenance: {type:"maintenance",title:"Maintenance",subtitle:"Defect and repair work tracking.",fields:[["asset","Affected asset"],["fault","Work required"],["severity","Severity",["Low","Medium","High","Critical"]]]},
  "Work orders": {type:"maintenance",title:"Work orders",subtitle:"Job instructions and equipment work.",fields:[["asset","Asset reference"],["fault","Instructions"],["severity","Severity",["Low","Medium","High","Critical"]]]},
  "Inspections & checklists": {type:"inspections",title:"Inspections & checklists",subtitle:"Scheduled checks and evidence of findings.",fields:[["asset","Inspection subject"],["result","Result",["Pending","Pass","Fail","Requires attention"]],["inspector","Inspector"]]},
  Inspections: {type:"inspections",title:"Inspections",subtitle:"Equipment checks and findings.",fields:[["asset","Subject"],["result","Result",["Pending","Pass","Fail","Requires attention"]],["inspector","Inspector"]]},
  "Documents & files": {type:"documents",title:"Documents & files",subtitle:"Folders, policies and document versions.",fields:[["folder","Folder"],["version","Version"],["documentType","Type",["Policy","Procedure","Drawing","Report","Other"]]]},
  Events: {type:"events",title:"Events",subtitle:"Upcoming activities and operational plans.",fields:[["location","Venue"],["startTime","Start date / time","datetime-local"],["capacity","Capacity","number"]]},
  "Events & bookings": {type:"events",title:"Events & bookings",subtitle:"Events, venues and bookings.",fields:[["location","Venue"],["startTime","Start date / time","datetime-local"],["capacity","Capacity","number"]]},
  "Reports & analytics": {type:"reporting",title:"Reports & analytics",subtitle:"Operational summary of fictional records.",fields:[]},
  Reporting: {type:"reporting",title:"Reporting",subtitle:"Current operational summary.",fields:[]},
  "Inventory and stock": {type:"inventory",title:"Inventory & stock",subtitle:"Products, reorder points and availability.",fields:[["sku","SKU"],["quantity","In stock","number"],["reorder","Reorder threshold","number"],["location","Storage location"]]},
  "Customers / CRM": {type:"crm",title:"Customers & CRM",subtitle:"Sample customer relationships and opportunities.",fields:[["contact","Contact"],["stage","Stage",["Lead","Qualified","Proposal","Customer"]],["company","Company"]]},
  "Quotes and invoices": {type:"finance",title:"Quotes & invoices",subtitle:"Draft documents and fictional amounts; nothing is sent or charged.",fields:[["reference","Reference"],["amount","Amount (£)","number"],["paymentStatus","Document status",["Draft","Sent (demo)","Accepted","Paid (demo)"]]]},
  "Training and qualifications": {type:"training",title:"Training & qualifications",subtitle:"Skills, qualifications and renewal dates.",fields:[["person","Team member"],["qualification","Qualification"],["expiry","Expiry date","date"]]},
  "Health & safety": {type:"safety",title:"Health & safety",subtitle:"Hazard and corrective action registers.",fields:[["location","Location"],["severity","Risk rating",["Low","Medium","High","Critical"]],["action","Corrective action"]]},
  "Vehicle / fleet management": {type:"fleet",title:"Fleet management",subtitle:"Vehicles, servicing and inspections.",fields:[["registration","Vehicle / ID"],["location","Depot"],["serviceDue","Next service","date"]]},
  "Forms and surveys": {type:"forms",title:"Forms & surveys",subtitle:"Manage sample survey responses and requests.",fields:[["formName","Form"],["submittedBy","Submitted by"],["approval","Review",["Pending","Reviewed","Needs changes"]]]},
  "Bookings and appointments": {type:"bookings",title:"Bookings & appointments",subtitle:"Appointments, contacts and availability.",fields:[["person","Customer / attendee"],["startTime","Appointment","datetime-local"],["location","Location"]]},
  "Donations and fundraising": {type:"donations",title:"Donations & fundraising",subtitle:"Fictional donation activity and campaign tracking.",fields:[["campaign","Campaign"],["amount","Amount (£)","number"],["source","Source"]]},
  Donations: {type:"donations",title:"Donations",subtitle:"Sample charity fundraising records.",fields:[["campaign","Campaign"],["amount","Amount (£)","number"],["source","Source"]]},
  "Archives and collections": {type:"archives",title:"Archives & collections",subtitle:"Collection catalogue and item locations.",fields:[["reference","Catalogue ID"],["location","Stored at"],["category","Category"]]},
  Archives: {type:"archives",title:"Archives",subtitle:"Historic collection inventory.",fields:[["reference","Catalogue ID"],["location","Stored at"],["category","Category"]]},
  "Daily operations": {type:"operations",title:"Daily operations",subtitle:"Opening tasks, handovers and end-of-day checks.",fields:[["location","Area"],["owner","Responsible person"]]},
  Schedules: {type:"schedule",title:"Schedules",subtitle:"Planned visits and works.",fields:[["startTime","Scheduled start","datetime-local"],["location","Site"]]},
  "Job records": {type:"maintenance",title:"Job records",subtitle:"Completed work and supporting details.",fields:[["asset","Asset"],["fault","Work completed"]]},
  "Visitor statistics": {type:"visitors",title:"Visitor statistics",subtitle:"Daily activity and sample visitor counts.",fields:[["date","Visit date","date"],["count","Visitors","number"]]},
};
export const moduleInfo = name => moduleSpecs[name] || {type:"generic",title:name,subtitle:"Manage records for this module.",fields:[]};
export const isTaskModule = name => ["Tasks", "Projects", "Tasks & projects"].includes(name);
export const inputField = (field, value = "") => field[2] instanceof Array ? {type:"select",options:field[2],value} : {type:field[2] || "text",value};
export const moduleTypeLabel = {
  people:"Directory", timesheets:"Timesheets", schedule:"Roster", leave:"Requests", assets:"Asset register",
  maintenance:"Work orders", inspections:"Inspections", documents:"Library", events:"Event planner", reporting:"Analytics",
  inventory:"Stock control", crm:"Pipeline", finance:"Documents", training:"Qualifications", safety:"Risk register",
  fleet:"Vehicle register", forms:"Responses", bookings:"Appointments", donations:"Campaigns", archives:"Catalogue",
  operations:"Daily checklist", visitors:"Visitor overview", generic:"Records", projects:"Board"
};
