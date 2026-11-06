import React, { useMemo, useState } from "react";
import { Panel, Empty, Status } from "./components";
import { AlertTriangle, ArrowRight, Bell, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, ClipboardList, Filter, LayoutDashboard, Plus, Search, Settings2, ShieldCheck, Sparkles, UserRound, Zap, Building2, TrendingUp } from "lucide-react";
import { moduleInfo, moduleTypeLabel, isTaskModule } from "./customerModules";
const today = () => new Date().toISOString().slice(0,10);
const format = d => d ? new Date(d.slice(0,10)+"T12:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}) : "Not scheduled";
const priorityScore = p => ({Urgent:4,High:3,Normal:2,Low:1}[p]||2);
const recordDate = r => r.startTime?.slice(0,10)||r.startDate||r.date||r.dueDate||"";
const isLate = r => r.status!=="Complete" && r.dueDate && r.dueDate < today();
const upcoming = all => [...all].filter(r=>recordDate(r)).sort((a,b)=>recordDate(a).localeCompare(recordDate(b)));
const stat = (icon,label,value,caption) => <div className="metric-tile">{icon}<span>{label}</span><strong>{value}</strong><small>{caption}</small></div>;
function dateName(date) {return date.toLocaleDateString("en-GB",{month:"long",year:"numeric"});}
function recordTitle(record) {return record.title;}
export function CustomerDashboard({org,records,onNavigate,onUpdate}) {
  const all=records.filter(r=>r.orgId===org.id && org.modules.includes(r.module));
  const open=all.filter(r=>r.status!=="Complete");
  const overdue=open.filter(isLate);
  const urgent=open.filter(r=>["High","Urgent"].includes(r.priority));
  const completed=all.filter(r=>r.status==="Complete");
  const ratio=all.length?Math.round(100*completed.length/all.length):0;
  const attention=[...open].sort((a,b)=>Number(isLate(b))-Number(isLate(a)) || priorityScore(b.priority)-priorityScore(a.priority) || (a.dueDate||"9999").localeCompare(b.dueDate||"9999"));
  const next=upcoming(open).slice(0,5);
  return <div className="customer-home">
    <div className="customer-welcome"><span className="eyebrow">YOUR ORGANISATION</span><h2>Good to see you.</h2><p>Here's a snapshot of work across {org.name}. These are sample operational records.</p>
      <div className="welcome-actions"><button className="action-primary" onClick={()=>onNavigate("My work")}><ClipboardList size={17}/> Review my work</button><button className="action-secondary" onClick={()=>onNavigate("Calendar")}><CalendarDays size={17}/> Open calendar</button></div>
    </div>
    <div className="customer-metrics">
      {stat(<ClipboardList size={19}/>,"Outstanding",open.length,"Across all active modules")}
      {stat(<AlertTriangle size={19}/>,"Overdue",overdue.length,"Due before today")}
      {stat(<Zap size={19}/>,"High priority",urgent.length,"High and urgent items")}
      {stat(<CheckCircle2 size={19}/>,"Completed",ratio+"%","Of "+all.length+" records")}
    </div>
    <div className="customer-dashboard-grid">
      <Panel title="Needs your attention">
        <div className="panel-helper">Work requiring action, sorted by urgency.</div>
        {attention.length ? attention.slice(0,6).map(r=><div className="attention-row" key={r.id}>
          <div className={"attention-icon "+(isLate(r)?"attention-late":"")}><ClipboardList size={17}/></div>
          <div><h3>{recordTitle(r)}</h3><small>{r.module} · {r.owner||"Unassigned"} · {format(r.dueDate)}</small></div>
          <button onClick={()=>onNavigate(isTaskModule(r.module)?"Tasks & projects":r.module)} aria-label={"View "+r.title}><ArrowRight size={17}/></button>
        </div>) : <Empty>Everything is completed.</Empty>}
        <button className="text-action" onClick={()=>onNavigate("My work")}>Open full work queue <ArrowRight size={15}/></button>
      </Panel>
      <div className="customer-side-stack">
        <Panel title="Coming up"><div className="panel-helper">Next scheduled sample activities</div>
          {next.length ? next.map(r=><div className="upcoming-row" key={r.id}><span className="upcoming-date">{format(recordDate(r))}</span><div><strong>{r.title}</strong><small>{r.module}</small></div></div>) : <Empty>Nothing scheduled.</Empty>}
          <button className="text-action" onClick={()=>onNavigate("Calendar")}>View calendar <ArrowRight size={15}/></button>
        </Panel>
        <Panel title="Completion progress"><div className="completion-layout"><strong>{ratio}%</strong><div><progress max={100} value={ratio} aria-label="Records completed"/><small>{completed.length} finished · {open.length} outstanding</small></div></div></Panel>
      </div>
    </div>
    <Panel title="Your modules"><p className="panel-helper">Choose an area to work in. Only modules enabled for this organisation are shown.</p>
      <div className="module-shortcut-grid">{org.modules.map(name=><button key={name} className="module-shortcut" onClick={()=>onNavigate(name)}>
        <span className="shortcut-icon"><LayoutDashboard size={18}/></span><span><strong>{name}</strong><small>{moduleInfo(name).subtitle}</small></span><ArrowRight size={15}/>
      </button>)}</div>
    </Panel>
  </div>;
}
export function CustomerMyWork({org,records,onNavigate,onUpdate}) {
  const [query,setQuery]=useState("");
  const [filter,setFilter]=useState("Outstanding");
  const [priority,setPriority]=useState("All");
  const work=records.filter(r=>r.orgId===org.id && org.modules.includes(r.module));
  const results=work.filter(r=> (filter==="All" || (filter==="Outstanding"?r.status!=="Complete":filter==="Overdue"?isLate(r):r.status===filter))
    && (priority==="All"||r.priority===priority)
    && [r.title,r.detail,r.owner,r.module].join(" ").toLowerCase().includes(query.toLowerCase()))
    .sort((a,b)=>Number(isLate(b))-Number(isLate(a)) || priorityScore(b.priority)-priorityScore(a.priority) || (a.dueDate||"9999").localeCompare(b.dueDate||"9999"));
  return <div className="utility-page">
    <div className="customer-page-intro"><div><span className="eyebrow">YOUR WORKSPACE</span><h2>My work</h2><p>Everything that needs attention, grouped in one practical work queue.</p></div></div>
    <div className="customer-metrics">{stat(<Clock3 size={18}/>,"Outstanding",work.filter(r=>r.status!=="Complete").length,"Records to action")}{stat(<AlertTriangle size={18}/>,"Overdue",work.filter(isLate).length,"Past deadline")}{stat(<CheckCircle2 size={18}/>,"Completed",work.filter(r=>r.status==="Complete").length,"Finished items")}</div>
    <div className="customer-tools"><label className="search-field"><Search size={17}/><input aria-label="Search my work" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search work, people, or modules"/></label>
      <label>Show<select aria-label="Filter my work" value={filter} onChange={e=>setFilter(e.target.value)}>{["Outstanding","Overdue","Planned","In progress","Complete","All"].map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Priority<select aria-label="Filter work priority" value={priority} onChange={e=>setPriority(e.target.value)}>{["All","Low","Normal","High","Urgent"].map(x=><option key={x}>{x}</option>)}</select></label></div>
    <p className="muted" role="status">{results.length} matching records</p>
    {results.length?<div className="work-feed">{results.map(r=><article key={r.id} className="work-feed-item">
      <div className="work-feed-icon"><ClipboardList size={19}/></div>
      <div><small className="eyebrow">{r.module}</small><h3>{r.title}</h3><p>{r.detail||"No additional details."}</p><div className="work-tags"><Status>{r.status}</Status><span>{r.priority||"Normal"} priority</span><span>{r.owner||"Unassigned"}</span><span className={isLate(r)?"task-overdue":""}>{format(r.dueDate)}</span></div></div>
      <div className="work-feed-actions">{r.status!=="Complete"&&<button onClick={()=>onUpdate(org.id,r.id,{status:"Complete"})}><CheckCircle2 size={16}/> Mark done</button>}<button onClick={()=>onNavigate(isTaskModule(r.module)?"Tasks & projects":r.module)}>Open <ArrowRight size={15}/></button></div>
    </article>)}</div>:<Empty>Nothing matches those filters.</Empty>}
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
export function CustomerNotifications({org,records,readIds,setReadIds,onNavigate}) {
  const [filter,setFilter]=useState("Unread");
  const all=records.filter(r=>r.orgId===org.id&&org.modules.includes(r.module));
  const notifications=all.filter(r=>isLate(r)||["Urgent","High"].includes(r.priority)&&r.status!=="Complete")
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
export function CustomerSettings({org,prefs,setPrefs,roles,setRoles}) {
  const [newRole,setNewRole]=useState("");
  const [role,setRole]=useState("Administrator");
  const roleNames=Object.keys(roles);
  const selected=roles[role]||[];
  return <div className="utility-page"><div className="customer-page-intro"><div><span className="eyebrow">WORKSPACE PREFERENCES</span><h2>Settings</h2><p>Configure this fictional workspace and try a custom-role permissions builder.</p></div></div>
    <div className="settings-layout"><Panel title="Workspace preferences"><div className="settings-sample-brand"><Building2 size={26}/><div><strong>{org.name}</strong><small>Example organisation · {org.modules.length} modules</small></div></div>
      <label>Default home view<select value={prefs.home||"Dashboard"} onChange={e=>setPrefs({...prefs,home:e.target.value})}>{["Dashboard","My work","Calendar"].map(x=><option key={x}>{x}</option>)}</select></label>
      <label className="setting-toggle"><input type="checkbox" checked={Boolean(prefs.compact)} onChange={e=>setPrefs({...prefs,compact:e.target.checked})}/> Compact display preference</label>
      <label className="setting-toggle"><input type="checkbox" checked={prefs.reminders!==false} onChange={e=>setPrefs({...prefs,reminders:e.target.checked})}/> Show overdue reminders in the demo</label>
      <p className="module-disclaimer">Preferences are demonstration-only and remain in this session. No real account settings are changed.</p>
    </Panel>
    <Panel title="Custom roles & permissions"><p className="panel-helper">Prototype a role, then choose which actions it can perform. Actual access control must be implemented on the server before release.</p>
      <label>Edit role<select aria-label="Choose custom role" value={role} onChange={e=>setRole(e.target.value)}>{roleNames.map(name=><option key={name}>{name}</option>)}</select></label>
      <div className="permission-grid">{permissions.map(p=><label className="permission-switch" key={p}><input type="checkbox" checked={selected.includes(p)} onChange={e=>setRoles(current=>({...current,[role]:e.target.checked?[...new Set([...(current[role]||[]),p])]:(current[role]||[]).filter(x=>x!==p)}))}/><span>{p}</span></label>)}</div>
      <form className="create-role-form" onSubmit={e=>{e.preventDefault();const name=newRole.trim();if(name && !roles[name]){setRoles(prev=>({...prev,[name]:["View"]}));setRole(name);setNewRole("");}}}><label>New role<input value={newRole} maxLength={40} onChange={e=>setNewRole(e.target.value)} placeholder="e.g. Team leader" required /></label><button type="submit"><Plus size={16}/> Add role</button></form>
      <p className="module-disclaimer">This visual role builder does not enforce permissions or create real staff accounts.</p>
    </Panel></div>
    <Panel title="Enabled modules"><div className="module-shortcut-grid">{org.modules.map(m=><div className="module-shortcut module-shortcut-static" key={m}><ShieldCheck size={20}/><span><strong>{m}</strong><small>{moduleInfo(m).subtitle}</small></span></div>)}</div></Panel>
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
