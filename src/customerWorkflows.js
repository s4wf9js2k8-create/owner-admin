// Shared rules for the FICTIONAL customer demo. These are display/workflow rules, not security.
import { isTaskModule, moduleInfo } from "./customerModules";

export const universalCustomerPages = ["Dashboard","My work","Calendar","Notifications","Settings"];
export const taskModuleFor = org => org.modules.includes("Tasks & projects") ? "Tasks & projects" : org.modules.find(isTaskModule);
export const firstModuleOfType = (org,type) => org.modules.find(name => moduleInfo(name).type===type);
export const scopedRecords = (records,org) => records.filter(r=>r.orgId===org.id && org.modules.includes(r.module));
export const recordType = r => r.recordType || (r.module==="Projects"?"project":"task");
export const isProject = r => isTaskModule(r.module) && recordType(r)==="project";
export const isTask = r => isTaskModule(r.module) && !isProject(r);
export const projectFor = (records,projectId) => records.find(r=>r.id===projectId && isProject(r));
export const findAsset = (records,assetRef) => records.find(r=>moduleInfo(r.module).type==="assets" && (r.id===assetRef || r.asset===assetRef));
export const relatedRecords = (records,assetRecord) => records.filter(r=>["maintenance","inspections"].includes(moduleInfo(r.module).type) && (r.assetRefId===assetRecord.id || (r.asset && r.asset === assetRecord.asset)));
export const dateOf = input => input?.slice(0,10) || "";
export const nextRecurrenceDate = (date,frequency) => {
  const parsed = date ? new Date(date+"T12:00:00Z") : new Date();
  if(Number.isNaN(parsed.getTime())) return "";
  if(frequency==="Daily") parsed.setUTCDate(parsed.getUTCDate()+1);
  else if(frequency==="Weekly") parsed.setUTCDate(parsed.getUTCDate()+7);
  else if(frequency==="Monthly") parsed.setUTCMonth(parsed.getUTCMonth()+1);
  else if(frequency==="Quarterly") parsed.setUTCMonth(parsed.getUTCMonth()+3);
  else if(frequency==="Yearly") parsed.setUTCFullYear(parsed.getUTCFullYear()+1);
  else return "";
  return parsed.toISOString().slice(0,10);
};
export const onSiteEntries = (records,org) => scopedRecords(records,org).filter(r=>moduleInfo(r.module).type==="timesheets" && r.startTime && !r.endTime);
export const upcomingShifts = (records,org) => scopedRecords(records,org).filter(r=>moduleInfo(r.module).type==="schedule" && r.startTime).sort((a,b)=>a.startTime.localeCompare(b.startTime));
export const demoRoleDefaults = {
  Administrator:["View","Create","Edit","Approve","Export","Manage"],
  Manager:["View","Create","Edit","Approve","Export"],
  Staff:["View","Create","Edit"],
  Viewer:["View"]
};
export function moduleAllowed(role,module,roleModules) {
  const configured=roleModules[role];
  if(!configured) return true;
  return configured.includes("*") || configured.includes(module) || (isTaskModule(module)&&configured.includes("Tasks & projects"));
}
export const defaultRoleModules = {
  Administrator:["*"],Manager:["*"],Staff:["*"],
  Viewer:["Staff & volunteers","Volunteers","Staff","Assets & equipment","Assets","Documents & files","Events & bookings","Events","Shift rotas","Schedules","Tasks & projects","Tasks","Projects","Reports & analytics","Reporting"]
};
