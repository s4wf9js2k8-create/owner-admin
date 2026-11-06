import React, { useState } from "react";
import { isTaskModule, moduleInfo } from "./customerModules";
import CustomerPeopleOps from "./CustomerPeopleOps";
import CustomerAssetOps from "./CustomerAssetOps";
import CustomerEventsOps from "./CustomerEventsOps";
import { moduleAllowed, demoRoleDefaults, scopedRecords } from "./customerWorkflows";
import CustomerTaskBoard from "./CustomerTaskBoard";
import CustomerModulePage from "./CustomerModulePage";
import CustomerCommandBar from "./CustomerCommandBar";
import {
  CustomerDashboard, CustomerMyWork, CustomerCalendar, CustomerNotifications,
  CustomerSettings, CustomerInsights
} from "./CustomerEssentialPages";

const universal = ["Dashboard","My work","Calendar","Notifications","Settings","Insights"];
export default function CustomerWorkspace({
  org,records,onUpdate,onAdd,page,setPage,
  customerRole,setCustomerRole,customerRoles,setCustomerRoles,roleModules,setRoleModules,roleTeams,setRoleTeams
}) {
  const [readIds,setReadIds] = useState([]);
  const [prefs,setPrefs] = useState({
    home:"Dashboard",compact:false,reminders:true,
    widgets:["staff","shifts","attention","progress"]
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
    setPage(target);
  };
  const safeUpdate=(orgId,id,patch)=>canEdit?onUpdate(orgId,id,patch):Promise.resolve(false);
  const safeAdd=(payload)=>canCreate?onAdd(payload):Promise.resolve(false);
  const shared={org:visibleOrg,records:visibleRecords,onNavigate:navigate,onUpdate:safeUpdate,actor,canEdit};
  const focusId=focus?.page===current?focus.id:null;
  let content;
  if(current==="Dashboard")content=<CustomerDashboard {...shared} prefs={prefs} setPrefs={setPrefs}/>;
  else if(current==="My work")content=<CustomerMyWork {...shared}/>;
  else if(current==="Calendar")content=<CustomerCalendar {...shared}/>;
  else if(current==="Notifications")content=<CustomerNotifications {...shared} readIds={readIds} setReadIds={setReadIds} prefs={prefs}/>;
  else if(current==="Settings")content=<CustomerSettings org={visibleOrg} records={visibleRecords} onNavigate={navigate} prefs={prefs} setPrefs={setPrefs} roles={customerRoles} setRoles={setCustomerRoles} roleModules={roleModules} setRoleModules={setRoleModules} roleTeams={roleTeams} setRoleTeams={setRoleTeams} customerRole={customerRole} canManage={(customerRoles[customerRole]||[]).includes("Manage")}/>;
  else if(current==="Insights"||current==="Reporting"||current==="Reports & analytics")content=<CustomerInsights {...shared}/>;
  else if(isTaskModule(current))content=<CustomerTaskBoard org={visibleOrg} records={visibleRecords} onAdd={safeAdd} onUpdate={safeUpdate} actor={actor} canEdit={canEdit} canCreate={canCreate} canApprove={canApprove} createRequest={createRequest} focusId={focusId} onNavigate={navigate}/>;
  else if(["people","timesheets","schedule","leave","training"].includes(moduleInfo(current).type))content=<CustomerPeopleOps key={current} org={visibleOrg} module={current} records={visibleRecords} onAdd={safeAdd} onUpdate={safeUpdate} onNavigate={navigate} focusId={focusId} canCreate={canCreate} canEdit={canEdit} canApprove={canApprove}/>;
  else if(moduleInfo(current).type==="events")content=<CustomerEventsOps key={current} org={visibleOrg} module={current} records={visibleRecords} onAdd={safeAdd} onUpdate={safeUpdate} canCreate={canCreate} canEdit={canEdit}/>;
  else if(["assets","maintenance","inspections","inventory"].includes(moduleInfo(current).type))content=<CustomerAssetOps key={current} org={visibleOrg} module={current} records={visibleRecords} onAdd={safeAdd} onUpdate={safeUpdate} onNavigate={navigate} focusId={focusId} canCreate={canCreate} canEdit={canEdit} canApprove={canApprove}/>;
  else content=<CustomerModulePage key={current} org={visibleOrg} module={current} records={visibleRecords} onAdd={safeAdd} onUpdate={safeUpdate} onNavigate={navigate} focusId={focusId} canEdit={canEdit} canCreate={canCreate} canApprove={canApprove} canExport={canExport}/>;
  return <div className={"customer-shell "+(prefs.compact?"customer-compact":"")}>
    <div className="customer-context"><span>{org.name}</span><span>Fictional customer demo</span><span>{visibleOrg.modules.length} accessible modules</span></div>
    <div className="customer-persona-row">
      <label>Simulated role<select aria-label="Simulated customer role" value={customerRole} onChange={e=>{setCustomerRole(e.target.value);setPage("Dashboard");}}>{Object.keys(customerRoles).map(name=><option key={name}>{name}</option>)}</select></label>
      <label>Working as<select aria-label="Sample team member" value={choices.includes(actor)?actor:(choices[0]||"Sample team member")} onChange={e=>setActor(e.target.value)}>{choices.length?choices.map(name=><option key={name}>{name}</option>):<option>Sample team member</option>}</select></label>
      <small>Role: {customerRole} · Team scope: {currentTeam}. This is a visual demo, not secure access control.</small>
    </div>
    <CustomerCommandBar org={visibleOrg} records={visibleRecords} onNavigate={navigate} canEdit={canCreate}/>
    <div className="heading customer-heading"><div><small>{org.name} · CUSTOMER WORKSPACE</small><h1>{current}</h1><p>Interactive temporary data. Changes reset when you refresh.</p></div></div>
    {content}
  </div>;
}
