import React, { useState } from "react";
import { isTaskModule, moduleInfo } from "./customerModules";
const ReportingWorkspace=React.lazy(()=>import("./ReportingWorkspace"));
const NotificationInbox=React.lazy(()=>import("./NotificationInbox"));
const CommunicationsWorkspace=React.lazy(()=>import("./CommunicationsWorkspace"));
import {noticeRelevant} from "./communicationRules";
const FinancialWorkspace=React.lazy(()=>import("./FinancialWorkspace"));
import DailyOperations from "./DailyOperations";
import OperationalDashboard from "./OperationalDashboard";
import CustomerPeopleOps from "./CustomerPeopleOps";
import CustomerAssetOps from "./CustomerAssetOps";
import CustomerEventsOps from "./CustomerEventsOps";
import CustomerFormsOps, {initialFormTemplates} from "./CustomerFormsOps";
import CustomerCommercialOps from "./CustomerCommercialOps";
import CustomerResourcesOps from "./CustomerResourcesOps";
import { moduleAllowed, demoRoleDefaults, scopedRecords } from "./customerWorkflows";
import CustomerTaskBoard from "./CustomerTaskBoard";
import CustomerModulePage from "./CustomerModulePage";
import CustomerCommandBar from "./CustomerCommandBar";
import {
  CustomerMyWork, CustomerCalendar,
  CustomerSettings
} from "./CustomerEssentialPages";

const universal = ["Dashboard","My work","Calendar","Notifications","Settings","Insights"];
export default function CustomerWorkspace({
  org,records,onUpdate,onAdd,page,setPage,
  customerRole,setCustomerRole,customerRoles,setCustomerRoles,roleModules,setRoleModules,roleTeams,setRoleTeams
}) {
  const [notificationUsers,setNotificationUsers] = useState({});
  const [formTemplates,setFormTemplates]=useState(initialFormTemplates);
  const [prefs,setPrefs] = useState({
    home:"Dashboard",compact:false,reminders:true,
    widgets:org.sector==="engineering"?["attention","staff","work","shifts"]:org.sector==="charity"?["events","shifts","staff","work"]:["staff","shifts","attention","work"]
  });
  const [createRequest,setCreateRequest]=useState(0);
  const [focus,setFocus]=useState(null);
  const visibleOrg={...org,modules:org.modules.filter(m=>moduleAllowed(customerRole,m,roleModules))};
  const people=scopedRecords(records,org).filter(r=>["Staff & volunteers","Volunteers","Staff"].includes(r.module));
  const currentTeam=roleTeams[customerRole]||"All teams";
  const visibleRecords=scopedRecords(records,visibleOrg).filter(r=>{
    if(currentTeam==="All teams")return true;
    const team=r.team||people.find(p=>p.title===r.owner||p.title===r.person)?.team||"";
    return team===currentTeam;
  });
  const choices=[...new Set([
    ...visibleRecords.filter(r=>isTaskModule(r.module)).map(r=>r.owner),
    ...visibleRecords.filter(r=>["Staff & volunteers","Volunteers","Staff"].includes(r.module)).map(r=>r.title)
  ].filter(Boolean))];
  const [actor,setActor]=useState(choices[0]||"Sample team member");
  const canEdit=(customerRoles[customerRole]||demoRoleDefaults[customerRole]||[]).includes("Edit");
  const canCreate=(customerRoles[customerRole]||demoRoleDefaults[customerRole]||[]).includes("Create");
  const canApprove=(customerRoles[customerRole]||demoRoleDefaults[customerRole]||[]).includes("Approve");
  const canExport=(customerRoles[customerRole]||demoRoleDefaults[customerRole]||[]).includes("Export");
  const currentPerson=people.find(p=>p.title===actor);
  const actorKey=currentPerson?.id||actor;
  const userInbox=notificationUsers[actorKey]||{read:[],dismissed:[],settings:{reminderDays:14}};
  const setUserInbox=update=>setNotificationUsers(old=>({...old,[actorKey]:typeof update==="function"?update(old[actorKey]||{read:[],dismissed:[],settings:{reminderDays:14}}):update}));
  const accessibleRecords=visibleRecords.filter(r=>moduleInfo(r.module).type!=="communications"||canApprove||r.status==="Published"&&noticeRelevant(r,currentPerson?.id,currentPerson?.team));
  const validPage = universal.includes(page) || visibleOrg.modules.includes(page) ||
    page==="Tasks & projects" && visibleOrg.modules.some(isTaskModule);
  const current=validPage?page:"Dashboard";
  const navigate=(target,options={})=>{
    const canGo=universal.includes(target) || visibleOrg.modules.includes(target) ||
      target==="Tasks & projects" && visibleOrg.modules.some(isTaskModule);
    if(!canGo) return;
    if(options.recordId)setFocus({page:target,id:options.recordId});
    else setFocus(null);
    if(options.create)setCreateRequest(v=>v+1);
    else setCreateRequest(0);
    setPage(target);
  };
  const safeUpdate=(orgId,id,patch)=>canEdit?onUpdate(orgId,id,patch):Promise.resolve(false);
  const safeAdd=(payload)=>canCreate?onAdd(payload):Promise.resolve(false);
  const shared={org:visibleOrg,records:accessibleRecords,onNavigate:navigate,onUpdate:safeUpdate,actor,canEdit};
  const focusId=focus?.page===current?focus.id:null;
  let content;
  if(current==="Dashboard")content=<OperationalDashboard {...shared} onAdd={safeAdd} canCreate={canCreate} prefs={prefs} setPrefs={setPrefs}/>;
  else if(current==="My work")content=<CustomerMyWork {...shared}/>;
  else if(current==="Calendar")content=<CustomerCalendar {...shared}/>;
  else if(current==="Notifications")content=<NotificationInbox {...shared} prefs={prefs} settings={userInbox.settings} setSettings={settings=>setUserInbox(old=>({...old,settings}))} state={userInbox} setState={setUserInbox} actorId={currentPerson?.id||""} department={currentPerson?.team||""} notices={accessibleRecords.filter(r=>r.recordType==="notice")}/>;
  else if(current==="Settings")content=<CustomerSettings org={visibleOrg} records={accessibleRecords} onNavigate={navigate} prefs={prefs} setPrefs={setPrefs} roles={customerRoles} setRoles={setCustomerRoles} roleModules={roleModules} setRoleModules={setRoleModules} roleTeams={roleTeams} setRoleTeams={setRoleTeams} customerRole={customerRole} canManage={(customerRoles[customerRole]||[]).includes("Manage")}/>;
  else if(current==="Insights"||current==="Reporting"||current==="Reports & analytics")content=<ReportingWorkspace {...shared} onAdd={safeAdd} canCreate={canCreate} canExport={canExport}/>;
  else if(moduleInfo(current).type==="communications")content=<CommunicationsWorkspace {...shared} module={current} onAdd={safeAdd} onUpdate={async(orgId,id,patch)=>{const record=accessibleRecords.find(r=>r.id===id&&r.orgId===orgId&&r.module===current);if(!record)return false;if(canEdit)return onUpdate(orgId,id,patch);if(Object.keys(patch).length===1&&patch.acknowledgements&&currentPerson&&record.status==="Published"&&noticeRelevant(record,currentPerson.id,currentPerson.team))return onUpdate(orgId,id,{acknowledgements:[...(record.acknowledgements||[]).filter(a=>a.personId!==currentPerson.id),{personId:currentPerson.id,at:new Date().toISOString()}]});return false;}} actorId={currentPerson?.id||""} department={currentPerson?.team||""} canManage={canCreate&&canApprove} focusId={focusId}/>;
  else if(isTaskModule(current))content=<CustomerTaskBoard org={visibleOrg} records={accessibleRecords} onAdd={safeAdd} onUpdate={safeUpdate} actor={actor} canEdit={canEdit} canCreate={canCreate} canApprove={canApprove} createRequest={createRequest} focusId={focusId} onNavigate={navigate}/>;
  else if(["people","timesheets","schedule","leave","training"].includes(moduleInfo(current).type))content=<CustomerPeopleOps key={current} org={visibleOrg} module={current} records={accessibleRecords} onAdd={safeAdd} onUpdate={safeUpdate} onNavigate={navigate} focusId={focusId} canCreate={canCreate} canEdit={canEdit} canApprove={canApprove} createRequest={createRequest}/>;
  else if(moduleInfo(current).type==="operations")content=<DailyOperations key={current} {...shared} module={current} onAdd={safeAdd} canCreate={canCreate} canApprove={canApprove}/>;
  else if(["documents","archives","fleet","safety","bookings","operations","visitors"].includes(moduleInfo(current).type))content=<CustomerResourcesOps key={current} org={visibleOrg} module={current} records={accessibleRecords} onAdd={safeAdd} onUpdate={safeUpdate} onNavigate={navigate} focusId={focusId} canCreate={canCreate} canEdit={canEdit}/>;
  else if(moduleInfo(current).type==="finance")content=<FinancialWorkspace key={current} {...shared} module={current} onAdd={safeAdd} canCreate={canCreate} canApprove={canApprove} focusId={focusId}/>;
  else if(["crm","finance","donations"].includes(moduleInfo(current).type))content=<CustomerCommercialOps key={current} org={visibleOrg} module={current} records={accessibleRecords} onAdd={safeAdd} onUpdate={safeUpdate} onNavigate={navigate} focusId={focusId} canCreate={canCreate} canEdit={canEdit}/>;
  else if(moduleInfo(current).type==="forms")content=<CustomerFormsOps key={current} org={visibleOrg} module={current} records={accessibleRecords} onAdd={safeAdd} canCreate={canCreate} templates={formTemplates} setTemplates={setFormTemplates}/>;
  else if(moduleInfo(current).type==="events")content=<CustomerEventsOps key={current} org={visibleOrg} module={current} records={accessibleRecords} onAdd={safeAdd} onUpdate={safeUpdate} canCreate={canCreate} canEdit={canEdit}/>;
  else if(["assets","maintenance","inspections","inventory"].includes(moduleInfo(current).type))content=<CustomerAssetOps key={current} org={visibleOrg} module={current} records={accessibleRecords} onAdd={safeAdd} onUpdate={safeUpdate} onNavigate={navigate} focusId={focusId} canCreate={canCreate} canEdit={canEdit} canApprove={canApprove} createRequest={createRequest}/>;
  else content=<CustomerModulePage key={current} org={visibleOrg} module={current} records={accessibleRecords} onAdd={safeAdd} onUpdate={safeUpdate} onNavigate={navigate} focusId={focusId} canEdit={canEdit} canCreate={canCreate} canApprove={canApprove} canExport={canExport}/>;
  return <div className={"customer-shell "+(prefs.compact?"customer-compact":"")}>
    <div className="customer-context"><span>{org.name}</span><span>Fictional customer demo</span><span>{visibleOrg.modules.length} accessible modules</span></div>
    <div className="customer-persona-row">
      <label>Simulated role<select aria-label="Simulated customer role" value={customerRole} onChange={e=>{setCustomerRole(e.target.value);setPage("Dashboard");}}>{Object.keys(customerRoles).map(name=><option key={name}>{name}</option>)}</select></label>
      <label>Working as<select aria-label="Sample team member" value={choices.includes(actor)?actor:(choices[0]||"Sample team member")} onChange={e=>setActor(e.target.value)}>{choices.length?choices.map(name=><option key={name}>{name}</option>):<option>Sample team member</option>}</select></label>
      <small>Role: {customerRole} · Team scope: {currentTeam}. This is a visual demo, not secure access control.</small>
    </div>
    <CustomerCommandBar org={visibleOrg} records={accessibleRecords} onNavigate={navigate} canEdit={canCreate}/>
    <div className="heading customer-heading"><div><small>{org.name} · CUSTOMER WORKSPACE</small><h1>{current}</h1><p>Interactive temporary data. Changes reset when you refresh.</p></div></div>
    <React.Suspense fallback={<p role="status">Loading workspace…</p>}>{content}</React.Suspense>
  </div>;
}
