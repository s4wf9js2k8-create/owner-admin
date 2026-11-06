import React, { useState } from "react";
import { isTaskModule } from "./customerModules";
import CustomerTaskBoard from "./CustomerTaskBoard";
import CustomerModulePage from "./CustomerModulePage";
import {
  CustomerDashboard, CustomerMyWork, CustomerCalendar, CustomerNotifications,
  CustomerSettings, CustomerInsights
} from "./CustomerEssentialPages";

const universal = ["Dashboard", "My work", "Calendar", "Notifications", "Settings", "Insights"];
const defaultRoles = {
  Administrator: ["View", "Create", "Edit", "Approve", "Export", "Manage"],
  Manager: ["View", "Create", "Edit", "Approve", "Export"],
  Staff: ["View", "Create", "Edit"],
  Viewer: ["View"]
};
export default function CustomerWorkspace({org,records,onUpdate,onAdd,page,setPage}) {
  const [readIds,setReadIds] = useState([]);
  const [prefs,setPrefs] = useState({home:"Dashboard",compact:false,reminders:true});
  const [roles,setRoles] = useState(defaultRoles);
  const current = universal.includes(page) || org.modules.includes(page) ? page : "Dashboard";
  const navigate = target => setPage(target);
  const shared = {org,records,onNavigate:navigate,onUpdate};
  let content;
  if(current==="Dashboard") content=<CustomerDashboard {...shared}/>;
  else if(current==="My work") content=<CustomerMyWork {...shared}/>;
  else if(current==="Calendar") content=<CustomerCalendar {...shared}/>;
  else if(current==="Notifications") content=<CustomerNotifications {...shared} readIds={readIds} setReadIds={setReadIds}/>;
  else if(current==="Settings") content=<CustomerSettings org={org} prefs={prefs} setPrefs={setPrefs} roles={roles} setRoles={setRoles}/>;
  else if(current==="Insights" || current==="Reporting" || current==="Reports & analytics") content=<CustomerInsights {...shared}/>;
  else if(isTaskModule(current)) content=<CustomerTaskBoard org={org} records={records} onAdd={onAdd} onUpdate={onUpdate}/>;
  else content=<CustomerModulePage key={current} org={org} module={current} records={records} onAdd={onAdd} onUpdate={onUpdate}/>;
  return <div className={"customer-shell "+(prefs.compact?"customer-compact":"")}>
    <div className="customer-context"><span>{org.name}</span><span>Customer demonstration</span><span>{org.modules.length} modules enabled</span></div>
    <div className="heading customer-heading"><div><small>{org.name} · FICTIONAL DEMONSTRATION</small><h1>{current}</h1><p>This customer preview uses fictional data and has no real account permissions.</p></div></div>
    {content}
  </div>;
}
