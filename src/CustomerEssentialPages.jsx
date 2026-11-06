import React, { useState } from "react";
import { Panel, Empty, Status } from "./components";
import { AlertTriangle, ArrowRight, Bell, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, ClipboardList, LayoutDashboard, Plus, Search, ShieldCheck, Building2, Users } from "lucide-react";
import { moduleInfo, isTaskModule } from "./customerModules";
import { onSiteEntries, upcomingShifts, firstModuleOfType } from "./customerWorkflows";
const today = () => new Date().toISOString().slice(0,10);
const format = d => d ? new Date(d.slice(0,10)+"T12:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}) : "Not scheduled";
const priorityScore = p => ({Urgent:4,High:3,Normal:2,Low:1}[p]||2);
const recordDate = r => r.startTime?.slice(0,10)||r.startDate||r.date||r.dueDate||"";
const isLate = r => r.status!=="Complete" && r.dueDate && r.dueDate < today();
const upcoming = all => [...all].filter(r=>recordDate(r)).sort((a,b)=>recordDate(a).localeCompare(recordDate(b)));
const stat = (icon,label,value,caption) => <div className="metric-tile">{icon}<span>{label}</span><strong>{value}</strong><small>{caption}</small></div>;
function dateName(date) {return date.toLocaleDateString("en-GB",{month:"long",year:"numeric"});}
const widgetNames={staff:"Staff on site",shifts:"Upcoming shifts",attention:"Work needing attention",progress:"Completion progress"};
export function CustomerDashboard({org,records,onNavigate,prefs,setPrefs,actor}) {
  const [customising,setCustomising]=useState(false);
  const all=records.filter(r=>r.orgId===org.id&&org.modules.includes(r.module));
  const open=all.filter(r=>r.status!=="Complete");
  const overdue=open.filter(isLate);
  const completed=all.filter(r=>r.status==="Complete");
  const ratio=all.length?Math.round(100*completed.length/all.length):0;
  const onSite=onSiteEntries(records,org);
  const shifts=upcomingShifts(records,org).filter(r=>r.startTime?.slice(0,10)>=today()).slice(0,5);
  const attendanceModule=firstModuleOfType(org,"timesheets");
  const rotaModule=firstModuleOfType(org,"schedule");
  const attention=[...open].filter(r=>isTaskModule(r.module)||["maintenance","inspections"].includes(moduleInfo(r.module).type))
    .sort((a,b)=>Number(isLate(b))-Number(isLate(a))||priorityScore(b.priority)-priorityScore(a.priority)).slice(0,5);
  const widgets=prefs.widgets||["staff","shifts","attention","progress"];
  const show=name=>widgets.includes(name);
  return <div className="customer-home">
    <div className="customer-welcome"><span className="eyebrow">YOUR OPERATIONS</span><h2>Welcome back{actor?", "+actor:""}.</h2><p>See who's on site, who's working next and where your team needs support.</p>
      <div className="welcome-actions"><button className="action-primary" onClick={()=>onNavigate("My work")}><ClipboardList size={17}/> My work</button>
      <button className="action-secondary" onClick={()=>onNavigate("Calendar")}><CalendarDays size={17}/> Team calendar</button></div></div>
    <div className="customer-metrics">
      {stat(<Users size={19}/>,"On site",onSite.length,"Open sample clock-ins")}
      {stat(<CalendarDays size={19}/>,"Upcoming shifts",shifts.length,"Next scheduled entries")}
      {stat(<AlertTriangle size={19}/>,"Needs attention",overdue.length,"Past due date")}
      {stat(<CheckCircle2 size={19}/>,"Completion",ratio+"%","Across accessible records")}
    </div>
    <div className="widget-control"><h3>Dashboard widgets</h3><button onClick={()=>setCustomising(v=>!v)}>{customising?"Finish customising":"Customise dashboard"}</button></div>
    {customising&&<div className="widget-picker">{Object.entries(widgetNames).map(([id,label])=><label key={id}><input type="checkbox" checked={show(id)} onChange={e=>setPrefs({...prefs,widgets:e.target.checked?[...widgets,id]:widgets.filter(x=>x!==id)})}/>{label}</label>)}</div>}
    <div className="operations-widgets">
      {show("staff")&&<Panel title="Staff on site">
        <p className="panel-helper">People with an open demo clock-in. This does not verify physical presence.</p>
        {onSite.length?onSite.map(r=><div className="attention-row" key={r.id}><div className="attention-icon"><Users size={18}/></div><div><h3>{r.person||r.title}</h3><small>Clocked in at {r.startTime?.slice(11)||"Unknown"} · {r.module}</small></div><button aria-label={"Open attendance for "+(r.person||r.title)} onClick={()=>onNavigate(r.module,{recordId:r.id})}><ArrowRight size={16}/></button></div>):<Empty>No open clock-ins at present.</Empty>}
        {attendanceModule&&<button className="text-action" onClick={()=>onNavigate(attendanceModule)}>Open attendance & timesheets <ArrowRight size={15}/></button>}
      </Panel>}
      {show("shifts")&&<Panel title="Upcoming shifts">
        <p className="panel-helper">Sample upcoming assignments across enabled shift modules.</p>
        {shifts.length?shifts.map(r=><div className="upcoming-row" key={r.id}><span className="upcoming-date">{format(r.startTime)}</span><div><strong>{r.person||r.title}</strong><small>{r.location||"Location not set"} · {r.startTime?.slice(11)||"Time not set"}</small></div><button onClick={()=>onNavigate(r.module,{recordId:r.id})}>Open</button></div>):<Empty>No upcoming shifts scheduled.</Empty>}
        {rotaModule&&<button className="text-action" onClick={()=>onNavigate(rotaModule)}>Open weekly rota <ArrowRight size={15}/></button>}
      </Panel>}
      {show("attention")&&<Panel title="Work needing attention">
        <p className="panel-helper">Outstanding tasks, maintenance and inspections.</p>
        {attention.length?attention.map(r=><div className="attention-row" key={r.id}><div className={"attention-icon "+(isLate(r)?"attention-late":"")}><ClipboardList size={17}/></div><div><h3>{r.title}</h3><small>{r.module} · {r.owner||"Unassigned"} · {format(r.dueDate)}</small></div><button onClick={()=>onNavigate(isTaskModule(r.module)?"Tasks & projects":r.module,{recordId:r.id})} aria-label={"View "+r.title}><ArrowRight size={17}/></button></div>):<Empty>Nothing in the attention queue.</Empty>}
        <button className="text-action" onClick={()=>onNavigate("My work")}>Open my work <ArrowRight size={15}/></button>
      </Panel>}
      {show("progress")&&<Panel title="Completion progress"><div className="completion-layout"><strong>{ratio}%</strong><div><progress max={100} value={ratio} aria-label="Records completed"/><small>{completed.length} complete · {open.length} outstanding</small></div></div></Panel>}
    </div>
    <Panel title="Your enabled tools"><p className="panel-helper">Choose a distinct workflow. These shortcuts reflect the modules available to the simulated role.</p><div className="module-shortcut-grid">{org.modules.filter(m=>!isTaskModule(m)).concat(org.modules.some(isTaskModule)?["Tasks & projects"]:[]).map(name=><button key={name} className="module-shortcut" onClick={()=>onNavigate(name)}><span className="shortcut-icon"><LayoutDashboard size={18}/></span><span><strong>{name}</strong><small>{moduleInfo(name).subtitle}</small></span><ArrowRight size={15}/></button>)}</div></Panel>
  </div>;
}
export function CustomerMyWork({org,records,onNavigate,onUpdate,actor,canEdit}) {
  const [query,setQuery]=useState("");
  const [filter,setFilter]=useState("Outstanding");
  const [priority,setPriority]=useState("All");
  const [scope,setScope]=useState("Mine");
  const all=records.filter(r=>r.orgId===org.id&&org.modules.includes(r.module));
  const staff=all.find(r=>["Staff & volunteers","Staff","Volunteers"].includes(r.module)&&r.title===actor);
  const teamMembers=all.filter(r=>["Staff & volunteers","Staff","Volunteers"].includes(r.module)&&r.team&&r.team===staff?.team).map(r=>r.title);
  const work=all.filter(r=>["projects","maintenance","inspections","schedule","leave","events","bookings"].includes(moduleInfo(r.module).type));
  const scoped=work.filter(r=>scope==="All"||(scope==="Mine"?r.owner===actor||r.person===actor:teamMembers.includes(r.owner)||teamMembers.includes(r.person)||r.owner===actor||r.person===actor));
  const results=scoped.filter(r=>(filter==="All"||(filter==="Outstanding"?r.status!=="Complete":filter==="Overdue"?isLate(r):r.status===filter))
    &&(priority==="All"||r.priority===priority)
    &&[r.title,r.detail,r.owner,r.person,r.module].join(" ").toLowerCase().includes(query.toLowerCase()))
    .sort((a,b)=>Number(isLate(b))-Number(isLate(a))||priorityScore(b.priority)-priorityScore(a.priority)||(a.dueDate||"9999").localeCompare(b.dueDate||"9999"));
  const todayItems=work.filter(r=>recordDate(r)===today()&&(r.owner===actor||r.person===actor));
  const navigateRecord=r=>onNavigate(isTaskModule(r.module)?"Tasks & projects":r.module,{recordId:r.id});
  return <div className="utility-page">
    <div className="customer-page-intro"><div><span className="eyebrow">YOUR DAY & ASSIGNMENTS</span><h2>My work</h2><p>Personal work, your team's assignments and the next actions needed.</p></div></div>
    <div className="customer-metrics">{stat(<ClipboardList size={18}/>,"My assignments",work.filter(r=>r.owner===actor||r.person===actor).length,"Tasks, shifts and bookings")}{stat(<AlertTriangle size={18}/>,"Overdue",scoped.filter(isLate).length,"Within this view")}{stat(<CheckCircle2 size={18}/>,"Completed",scoped.filter(r=>r.status==="Complete").length,"Finished records")}</div>
    <div className="my-work-agenda"><h3>Today's agenda</h3>{todayItems.length?todayItems.map(r=><button key={r.id} onClick={()=>navigateRecord(r)}><CalendarDays size={16}/><span>{r.title}<small>{r.module}</small></span><ArrowRight size={15}/></button>):<p>No dated sample activities assigned to you today.</p>}</div>
    <div className="customer-tools"><label className="search-field"><Search size={17}/><input aria-label="Search my work" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search tasks, shifts, people"/></label>
      <label>Scope<select aria-label="Work scope" value={scope} onChange={e=>setScope(e.target.value)}><option value="Mine">Assigned to me</option><option value="Team">My team</option><option value="All">All permitted work</option></select></label>
      <label>Show<select aria-label="Filter my work" value={filter} onChange={e=>setFilter(e.target.value)}>{["Outstanding","Overdue","Planned","In progress","Complete","All"].map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Priority<select aria-label="Filter work priority" value={priority} onChange={e=>setPriority(e.target.value)}>{["All","Low","Normal","High","Urgent"].map(x=><option key={x}>{x}</option>)}</select></label></div>
    <p className="muted" role="status">{results.length} matching assignments</p>
    {results.length?<div className="work-feed">{results.map(r=><article key={r.id} className="work-feed-item">
      <div className="work-feed-icon"><ClipboardList size={19}/></div>
      <div><small className="eyebrow">{r.module}</small><h3>{r.title}</h3><p>{r.detail||"No additional details."}</p><div className="work-tags"><Status>{r.status}</Status><span>{r.priority||"Normal"} priority</span><span>{r.owner||r.person||"Unassigned"}</span><span className={isLate(r)?"task-overdue":""}>{format(recordDate(r))}</span></div></div>
      <div className="work-feed-actions">{canEdit&&r.status!=="Complete"&&["projects","maintenance"].includes(moduleInfo(r.module).type)&&<button onClick={()=>onUpdate(org.id,r.id,{status:"Complete"})}><CheckCircle2 size={16}/> Mark done</button>}<button onClick={()=>navigateRecord(r)}>Open <ArrowRight size={15}/></button></div>
    </article>)}</div>:<Empty>No work matches those filters. Choose another scope to explore team assignments.</Empty>}
  </div>;
}
function monthDays(year,month) {
  const first=new Date(year,month,1),offset=(first.getDay()+6)%7,days=new Date(year,month+1,0).getDate();
  return [...Array.from({length:offset},()=>null),...Array.from({length:days},(_,i)=>i+1)];
}
export function CustomerCalendar({org,records,onNavigate}) {
  const now=new Date();
  const [month,setMonth]=useState(new Date(now.getFullYear(),now.getMonth(),1));
  const [day,setDay]=useState(today());
  const events=records.filter(r=>r.orgId===org.id&&org.modules.includes(r.module)&&recordDate(r));
  const active=events.filter(r=>recordDate(r)===day);
  const days=monthDays(month.getFullYear(),month.getMonth());
  return <div className="utility-page">
    <div className="customer-page-intro"><div><span className="eyebrow">SCHEDULE & DEADLINES</span><h2>Calendar</h2><p>Due dates, visits, appointments and events from enabled modules.</p></div></div>
    <div className="calendar-layout"><Panel title="Monthly overview">
      <div className="calendar-controls"><button aria-label="Previous month" onClick={()=>setMonth(d=>new Date(d.getFullYear(),d.getMonth()-1,1))}><ChevronLeft size={18}/></button><h3>{dateName(month)}</h3><button aria-label="Next month" onClick={()=>setMonth(d=>new Date(d.getFullYear(),d.getMonth()+1,1))}><ChevronRight size={18}/></button><button className="calendar-today" onClick={()=>{setMonth(new Date(now.getFullYear(),now.getMonth(),1));setDay(today());}}>Today</button></div>
      <div className="calendar-grid calendar-weekdays">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(x=><span key={x}>{x}</span>)}</div>
      <div className="calendar-grid calendar-days">{days.map((num,i)=>num?<button key={i} className={(day===month.getFullYear()+"-"+String(month.getMonth()+1).padStart(2,"0")+"-"+String(num).padStart(2,"0")?"chosen ":"")+(events.some(r=>recordDate(r)===month.getFullYear()+"-"+String(month.getMonth()+1).padStart(2,"0")+"-"+String(num).padStart(2,"0"))?"has-events":"")} onClick={()=>setDay(month.getFullYear()+"-"+String(month.getMonth()+1).padStart(2,"0")+"-"+String(num).padStart(2,"0"))}>{num}</button>:<span key={i} aria-hidden="true"/>)}</div>
      <p className="muted">Dates with a dot have sample scheduled records.</p></Panel>
      <Panel title={"Agenda for "+format(day)}>{active.length?active.map(r=><div className="calendar-agenda" key={r.id}><small>{r.module}</small><strong>{r.title}</strong><span>{r.owner||"Unassigned"} · {r.status}</span><button onClick={()=>onNavigate(r.module)}>Open module</button></div>):<Empty>No activity scheduled for this date.</Empty>}</Panel></div>
    <Panel title="Upcoming dates"><div className="agenda-list">{upcoming(events).filter(r=>recordDate(r)>=today()).slice(0,8).map(r=><div key={r.id} className="upcoming-row"><span className="upcoming-date">{format(recordDate(r))}</span><div><strong>{r.title}</strong><small>{r.module} · {r.status}</small></div><button onClick={()=>onNavigate(r.module)}>Open</button></div>)}</div></Panel>
  </div>;
}
export function CustomerNotifications({org,records,readIds,setReadIds,onNavigate,prefs}) {
  const [filter,setFilter]=useState("Unread");
  const all=records.filter(r=>r.orgId===org.id&&org.modules.includes(r.module));
  const notifications=all.filter(r=>(prefs?.reminders!==false&&isLate(r))||["Urgent","High"].includes(r.priority)&&r.status!=="Complete")
    .map(r=>({id:r.id,title:isLate(r)?"Overdue: "+r.title:"High priority: "+r.title,record:r,kind:isLate(r)?"Overdue":"Priority"}));
  const visible=notifications.filter(n=>filter==="All"||(filter==="Unread"?!readIds.includes(n.id):readIds.includes(n.id)));
  return <div className="utility-page"><div className="customer-page-intro"><div><span className="eyebrow">ACTIVITY & REMINDERS</span><h2>Notifications</h2><p>In-app reminders calculated from sample deadlines and priorities. No email or push notifications are sent.</p></div>
    <button className="action-secondary" onClick={()=>setReadIds([...new Set([...readIds,...notifications.map(n=>n.id)])])}><CheckCircle2 size={16}/> Mark all read</button></div>
    <div className="customer-metrics">{stat(<Bell size={18}/>,"Notifications",notifications.length,"Generated from demo records")}{stat(<AlertTriangle size={18}/>,"Unread",notifications.filter(n=>!readIds.includes(n.id)).length,"Need review")}</div>
    <div className="customer-tools"><label>Show<select aria-label="Filter notifications" value={filter} onChange={e=>setFilter(e.target.value)}>{["Unread","All","Read"].map(x=><option key={x}>{x}</option>)}</select></label></div>
    <div className="notification-feed">{visible.map(n=><article className={"notification-item "+(!readIds.includes(n.id)?"unread":"")} key={n.id}><span className="notification-icon"><Bell size={18}/></span><div><small>{n.kind} · {n.record.module}</small><h3>{n.title}</h3><p>{n.record.owner||"Unassigned"} · {format(n.record.dueDate)}</p></div><div className="notification-actions"><button onClick={()=>setReadIds(ids=>ids.includes(n.id)?ids.filter(x=>x!==n.id):[...ids,n.id])}>{readIds.includes(n.id)?"Mark unread":"Mark read"}</button><button onClick={()=>onNavigate(n.record.module)}>Open</button></div></article>)}</div>
    {!visible.length&&<Empty>You're all caught up with this notification filter.</Empty>}</div>;
}
const permissions=["View","Create","Edit","Approve","Export","Manage"];
export function CustomerSettings({org,records,prefs,setPrefs,roles,setRoles,roleModules,setRoleModules,roleTeams,setRoleTeams,customerRole,canManage,onNavigate}) {
  const [newRole,setNewRole]=useState("");
  const [role,setRole]=useState("Administrator");
  const roleNames=Object.keys(roles);
  const selected=roles[role]||[];
  const permitted=roleModules[role]||[];
  const selectedAll=permitted.includes("*");
  const teams=[...new Set(records.filter(r=>["Staff & volunteers","Staff","Volunteers"].includes(r.module)).map(r=>r.team).filter(Boolean))];
  const availableWidgets={staff:"Staff on site",shifts:"Upcoming shifts",attention:"Work needing attention",progress:"Completion progress"};
  const toggleModule=(module,enabled)=>{
    const current=selectedAll?[...org.modules]:permitted.filter(x=>x!=="*");
    setRoleModules(old=>({...old,[role]:enabled?[...new Set([...current,module])]:current.filter(x=>x!==module)}));
  };
  return <div className="utility-page"><div className="customer-page-intro"><div><span className="eyebrow">WORKSPACE PREFERENCES</span><h2>Settings</h2><p>Configure the dashboard and try role, action, module and team scoping using temporary sample data.</p></div></div>
    <div className="settings-layout">
      <Panel title="Workspace preferences">
        <div className="settings-sample-brand"><Building2 size={26}/><div><strong>{org.name}</strong><small>Example organisation · {org.modules.length} visible modules</small></div></div>
        <label>Preferred start view<select value={prefs.home||"Dashboard"} onChange={e=>setPrefs({...prefs,home:e.target.value})}>{["Dashboard","My work","Calendar"].map(x=><option key={x}>{x}</option>)}</select></label>
        <button onClick={()=>onNavigate(prefs.home||"Dashboard")}>Go to preferred start view</button>
        <label className="setting-toggle"><input type="checkbox" checked={Boolean(prefs.compact)} onChange={e=>setPrefs({...prefs,compact:e.target.checked})}/> Compact display</label>
        <label className="setting-toggle"><input type="checkbox" checked={prefs.reminders!==false} onChange={e=>setPrefs({...prefs,reminders:e.target.checked})}/> Show overdue notifications</label>
        <h3>Dashboard widgets</h3>
        <div className="permission-grid">{Object.entries(availableWidgets).map(([id,label])=><label className="permission-switch" key={id}><input type="checkbox" checked={(prefs.widgets||[]).includes(id)} onChange={e=>setPrefs({...prefs,widgets:e.target.checked?[...new Set([...(prefs.widgets||[]),id])]:(prefs.widgets||[]).filter(x=>x!==id)})}/>{label}</label>)}</div>
        <p className="module-disclaimer">These settings change the demo immediately, and reset when you refresh.</p>
      </Panel>
      <Panel title="Custom roles & permissions">
        <p className="panel-helper">Choose what a simulated role can do, which modules it sees and the team it covers. Current role: <strong>{customerRole}</strong>.</p>
        <label>Edit role<select aria-label="Choose custom role" value={role} onChange={e=>setRole(e.target.value)}>{roleNames.map(name=><option key={name}>{name}</option>)}</select></label>
        <h3>Allowed actions</h3>
        <div className="permission-grid">{permissions.map(p=><label className="permission-switch" key={p}><input type="checkbox" disabled={!canManage} checked={selected.includes(p)} onChange={e=>setRoles(current=>({...current,[role]:e.target.checked?[...new Set([...(current[role]||[]),p])]:(current[role]||[]).filter(x=>x!==p)}))}/><span>{p}</span></label>)}</div>
        <h3>Module visibility</h3>
        <div className="permission-grid">{org.modules.map(m=><label className="permission-switch" key={m}><input type="checkbox" disabled={!canManage} checked={selectedAll||permitted.includes(m)} onChange={e=>toggleModule(m,e.target.checked)}/><span>{m}</span></label>)}</div>
        <label>Team restriction<select aria-label="Role team scope" disabled={!canManage} value={roleTeams[role]||"All teams"} onChange={e=>setRoleTeams(old=>({...old,[role]:e.target.value}))}><option>All teams</option>{teams.map(team=><option key={team}>{team}</option>)}</select></label>
        <form className="create-role-form" onSubmit={e=>{e.preventDefault();const name=newRole.trim();if(name&&!roles[name]){setRoles(prev=>({...prev,[name]:["View"]}));setRoleModules(old=>({...old,[name]:[]}));setRoleTeams(old=>({...old,[name]:"All teams"}));setRole(name);setNewRole("");}}}>
          <label>New role<input value={newRole} maxLength={40} onChange={e=>setNewRole(e.target.value)} placeholder="e.g. Team leader" required disabled={!canManage}/></label>
          <button type="submit" disabled={!canManage}><Plus size={16}/> Add role</button>
        </form>
        <p className="module-disclaimer">This is only a role-visibility demonstration. It does not authenticate users or enforce server-side permissions.</p>
      </Panel>
    </div>
    <Panel title="Available modules"><div className="module-shortcut-grid">{org.modules.map(m=><div className="module-shortcut module-shortcut-static" key={m}><ShieldCheck size={20}/><span><strong>{m}</strong><small>{moduleInfo(m).subtitle}</small></span></div>)}</div></Panel>
  </div>;
}
export function CustomerInsights({org,records,onNavigate}) {
  const all=records.filter(r=>r.orgId===org.id&&org.modules.includes(r.module));
  return <div className="utility-page"><div className="customer-page-intro"><div><span className="eyebrow">OPERATIONAL REPORTING</span><h2>Insights</h2><p>Explore live summaries of fictional records in this browser session.</p></div><button className="action-secondary" onClick={()=>window.print()}>Print report</button></div>
    <div className="customer-metrics">{stat(<ClipboardList size={18}/>,"Records",all.length,"Enabled modules")}{stat(<Clock3 size={18}/>,"Open",all.filter(r=>r.status!=="Complete").length,"Not completed")}{stat(<CheckCircle2 size={18}/>,"Complete",all.filter(r=>r.status==="Complete").length,"Finished")}{stat(<AlertTriangle size={18}/>,"Overdue",all.filter(isLate).length,"Requires attention")}</div>
    <Panel title="Completion by module"><div className="report-bars">{org.modules.filter(m=>!["Reporting","Reports & analytics"].includes(m)).map(m=>{const list=all.filter(r=>r.module===m),rate=list.length?Math.round(list.filter(r=>r.status==="Complete").length/list.length*100):0;return <button key={m} className="report-bar-row" onClick={()=>onNavigate(m)}><span>{m}</span><progress max={100} value={rate}/><strong>{rate}%</strong><small>{list.length} records</small></button>})}</div></Panel>
    <p className="module-disclaimer">This is operational demo reporting, not an official financial, legal or safety report.</p>
  </div>;
}
