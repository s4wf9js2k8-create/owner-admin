import React, { useEffect, useMemo, useState } from "react";
import { Panel, Empty, Modal, Status } from "./components";
import { ArrowRight, CalendarDays, CheckCircle2, ClipboardList, Clock3, Flag, FolderKanban, LayoutGrid, List, Plus, Repeat2, Search, UserRound } from "lucide-react";
import { isTask, isProject, nextRecurrenceDate, taskModuleFor } from "./customerWorkflows";
import {StaffSelect,teamMembers} from "./LinkedSelectors";

const statuses=["Planned","In progress","Complete"];
const priorities=["Low","Normal","High","Urgent"];
const repeats=["None","Daily","Weekly","Monthly","Quarterly","Yearly"];
const repeatModes=["After completion","Manual schedule","Template only"];
const dateOf=value=>value?new Date(value.slice(0,10)+"T12:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}):"No deadline";
const today=()=>new Date().toISOString().slice(0,10);
const checkRate=task=>(task.checklist||[]).length?Math.round(100*task.checklist.filter(i=>i.done).length/task.checklist.length):null;
const timeTotal=task=>(task.workLogs||[]).reduce((sum,log)=>sum+(Number(log.minutes)||0),0);
const classPriority=value=>"priority-"+String(value||"Normal").toLowerCase();

export default function CustomerTaskBoard({org,records,onAdd,onUpdate,onNavigate,actor,canEdit=true,canCreate=true,canApprove=true,createRequest=0,focusId}) {
  const [view,setView]=useState("mine");
  const [query,setQuery]=useState("");
  const [priority,setPriority]=useState("All");
  const [owner,setOwner]=useState("All");
  const [selected,setSelected]=useState(null);
  const [creating,setCreating]=useState(false);
  const [creatingProject,setCreatingProject]=useState(false);
  const [notice,setNotice]=useState("");
  const [savedViews,setSavedViews]=useState([]);
  const [viewName,setViewName]=useState("");
  const [showMineComplete,setShowMineComplete]=useState(false);
  useEffect(()=>{if(createRequest>0)setCreating(true);},[createRequest]);
  useEffect(()=>{if(focusId)setSelected(focusId);},[focusId]);

  const scoped=useMemo(()=>records.filter(r=>r.orgId===org.id && org.modules.includes(r.module)),[records,org]);
  const staff=teamMembers(records,org.id);
  const tasks=scoped.filter(isTask);
  const projects=scoped.filter(isProject);
  const assets=scoped.filter(r=>["Assets & equipment","Assets"].includes(r.module));
  const owners=[...new Set(tasks.map(t=>t.owner).filter(Boolean))].sort();
  const filtered=tasks.filter(t=>(priority==="All"||(t.priority||"Normal")===priority) && (owner==="All"||(t.owner||"Unassigned")===owner)
    && [t.title,t.detail,t.owner,t.tags,projects.find(p=>p.id===t.projectId)?.title].join(" ").toLowerCase().includes(query.toLowerCase()));
  const mine=filtered.filter(t=>t.owner===actor && (showMineComplete || t.status!=="Complete"));
  const active=scoped.find(r=>r.id===selected);
  const outstanding=tasks.filter(t=>t.status!=="Complete");
  const overdue=outstanding.filter(t=>t.dueDate && t.dueDate<today());
  const completed=tasks.filter(t=>t.status==="Complete");
  const highPriority=outstanding.filter(t=>["Urgent","High"].includes(t.priority));
  const update=(r,patch)=>onUpdate(org.id,r.id,patch);
  const changeStatus=async(task,status)=>{
    setNotice("");
    if(status==="Complete" && task.dependsOnId && tasks.find(t=>t.id===task.dependsOnId)?.status!=="Complete"){
      setNotice("Complete the linked dependency before finishing this task.");return;
    }
    if(status==="Complete" && task.approval==="Pending"){setNotice("This task is awaiting manager approval.");return;}
    if(status==="Complete" && task.recurrence && task.recurrence!=="None" && (task.recurringMode||"After completion")==="After completion"){
      const dueDate=nextRecurrenceDate(task.dueDate||today(),task.recurrence);
      if(dueDate){
        const saved=await onAdd({...task,id:undefined,createdAt:new Date().toISOString(),title:task.title,originId:task.id,
          dueDate,status:"Planned",approval:"Not requested",workLogs:[],comments:[],
          checklist:(task.checklist||[]).map(item=>({...item,done:false}))});
        if(!saved){setNotice("The next occurrence could not be created, so this task was not closed.");return;}
      }
    }
    await update(task,{status});
  };
  const generateNext=async(task)=>{
    const dueDate=nextRecurrenceDate(task.dueDate||today(),task.recurrence);
    if(!dueDate){setNotice("Select a repeat interval first.");return;}
    const saved=await onAdd({...task,id:undefined,originId:task.id,title:task.title,dueDate,status:"Planned",
      approval:"Not requested",workLogs:[],comments:[],createdAt:new Date().toISOString(),
      checklist:(task.checklist||[]).map(item=>({...item,done:false}))});
    if(saved)setNotice("A new dated occurrence was added to the task board.");
  };
  const createTask=async e=>{
    e.preventDefault();setNotice("");
    const f=Object.fromEntries(new FormData(e.currentTarget));
    const title=String(f.title||"").trim();
    if(!title){setNotice("Please provide a task name.");return;}
    const saved=await onAdd({orgId:org.id,module:taskModuleFor(org),recordType:"task",title,
      detail:String(f.detail||"").trim(),status:f.status||"Planned",owner:String(f.owner||"").trim(),
      priority:f.priority||"Normal",dueDate:f.dueDate||"",personId:staff.find(p=>p.title===f.owner)?.id||"",projectId:f.projectId||"",dependsOnId:f.dependsOnId||"",
      assetRefId:f.assetRefId||"",recurrence:f.recurrence||"None",recurringMode:f.recurringMode||"After completion",
      tags:String(f.tags||"").trim(),estimateHours:Number(f.estimateHours)||0,approval:"Not requested",
      checklist:String(f.checklist||"").split("\n").map(x=>x.trim()).filter(Boolean).map(text=>({text,done:false})),
      workLogs:[],comments:[],attachments:[],createdAt:new Date().toISOString()});
    if(saved){setCreating(false);setView("board");}
  };
  const createProject=async e=>{
    e.preventDefault();
    const f=Object.fromEntries(new FormData(e.currentTarget));
    const saved=await onAdd({orgId:org.id,module:taskModuleFor(org),recordType:"project",title:String(f.title||"").trim(),
      detail:String(f.detail||"").trim(),owner:String(f.owner||"").trim(),leadId:staff.find(p=>p.title===f.owner)?.id||"",members:String(f.members||"").trim(),
      budget:Number(f.budget)||0,risk:f.risk||"Low",dueDate:f.dueDate||"",status:"Planned",
      milestones:String(f.milestones||"").split("\n").map(x=>x.trim()).filter(Boolean).map(text=>({text,done:false})),
      createdAt:new Date().toISOString()});
    if(saved){setCreatingProject(false);setView("projects");}
  };
  const card=t=>{
    const progress=checkRate(t);
    return <article className="task-card" key={t.id}>
      <div className="task-card-top"><span className={"priority-chip "+classPriority(t.priority)}><Flag size={13}/>{t.priority||"Normal"}</span>
      {t.recurrence&&t.recurrence!=="None"&&<span className="subtle-chip"><Repeat2 size={13}/>{t.recurrence}</span>}</div>
      <button className="task-name" onClick={()=>setSelected(t.id)}>{t.title}</button>
      {t.detail&&<p className="task-description">{t.detail}</p>}
      {t.projectId&&<span className="task-tag">{projects.find(p=>p.id===t.projectId)?.title||"Linked project"}</span>}
      {progress!==null&&<div className="task-checklist-progress"><progress max="100" value={progress} aria-label={"Checklist progress for "+t.title}/><small>{progress}% checklist</small></div>}
      <div className="task-meta"><span><UserRound size={14}/>{t.owner||"Unassigned"}</span><span className={t.dueDate<today()&&t.status!=="Complete"?"task-overdue":""}><CalendarDays size={14}/>{dateOf(t.dueDate)}</span></div>
      <div className="task-actions"><button onClick={()=>setSelected(t.id)}>Details</button>{canEdit&&t.status!=="Complete"&&<button aria-label={"Advance "+t.title} onClick={()=>changeStatus(t,t.status==="Planned"?"In progress":"Complete")}><ArrowRight size={15}/>{t.status==="Planned"?"Start":"Finish"}</button>}</div>
    </article>;
  };
  const taskDetails=t=><div className="task-detail">
    <h3>{t.title}</h3><p>{t.detail||"No description yet."}</p>
    <div className="form-pair"><label>Status<select aria-label="Task status" disabled={!canEdit} value={t.status} onChange={e=>changeStatus(t,e.target.value)}>{statuses.map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Priority<select aria-label="Task priority" disabled={!canEdit} value={t.priority||"Normal"} onChange={e=>update(t,{priority:e.target.value})}>{priorities.map(x=><option key={x}>{x}</option>)}</select></label></div>
    <div className="form-pair"><label>Assigned to<input aria-label="Task owner" key={t.id+"-owner"} disabled={!canEdit} defaultValue={t.owner||""} onBlur={e=>{if(e.target.value.trim()!==(t.owner||""))update(t,{owner:e.target.value.trim()});}}/></label>
      <label>Deadline<input type="date" aria-label="Task deadline" disabled={!canEdit} value={t.dueDate||""} onChange={e=>update(t,{dueDate:e.target.value})}/></label></div>
    <label>Project<select aria-label="Linked project" disabled={!canEdit} value={t.projectId||""} onChange={e=>update(t,{projectId:e.target.value})}><option value="">No project</option>{projects.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
    <label>Depends on<select aria-label="Task dependency" disabled={!canEdit} value={t.dependsOnId||""} onChange={e=>update(t,{dependsOnId:e.target.value})}><option value="">No dependency</option>{tasks.filter(x=>x.id!==t.id).map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select></label>
    <label>Linked asset<select aria-label="Task linked asset" disabled={!canEdit} value={t.assetRefId||""} onChange={e=>update(t,{assetRefId:e.target.value})}><option value="">No asset</option>{assets.map(a=><option key={a.id} value={a.id}>{a.asset||a.title}</option>)}</select></label>
    {t.assetRefId&&<button onClick={()=>onNavigate?.(assets.find(a=>a.id===t.assetRefId)?.module||"Assets & equipment",{recordId:t.assetRefId})}>View related asset</button>}
    <div className="form-pair"><label>Repeat<select aria-label="Task recurrence" disabled={!canEdit} value={t.recurrence||"None"} onChange={e=>update(t,{recurrence:e.target.value})}>{repeats.map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Recurrence behaviour<select aria-label="Recurrence mode" disabled={!canEdit} value={t.recurringMode||"After completion"} onChange={e=>update(t,{recurringMode:e.target.value})}>{repeatModes.map(x=><option key={x}>{x}</option>)}</select></label></div>
    {canCreate&&<div className="quick-actions"><button onClick={()=>generateNext(t)} disabled={!t.recurrence||t.recurrence==="None"}>Generate next dated task</button><button onClick={()=>onAdd({...t,id:undefined,originId:t.id,title:t.title+" (copy)",status:"Planned",workLogs:[],comments:[],checklist:(t.checklist||[]).map(item=>({...item,done:false}))})}>Use as template</button></div>}
    <h3>Checklist</h3>
    {(t.checklist||[]).map((item,i)=><label key={i} className="task-check"><input type="checkbox" disabled={!canEdit} checked={Boolean(item.done)} onChange={e=>update(t,{checklist:t.checklist.map((x,j)=>j===i?{...x,done:e.target.checked}:x)})}/><span>{item.text}</span></label>)}
    {!(t.checklist||[]).length&&<p className="muted">No checklist items yet.</p>}
    {canEdit&&<form onSubmit={e=>{e.preventDefault();const v=new FormData(e.currentTarget).get("item").trim();if(v){update(t,{checklist:[...(t.checklist||[]),{text:v,done:false}]});e.currentTarget.reset();}}}><label>Add checklist item<input name="item" maxLength={120} required/></label><button>Add item</button></form>}
    <h3>Approval workflow</h3>
    <p className="muted" role="status">Approval: {t.approval||"Not requested"}</p>
    <div className="quick-actions">
      {canEdit&&(!t.approval||t.approval==="Not requested"||t.approval==="Changes requested")&&<button onClick={()=>update(t,{approval:"Pending"})}>Request manager approval</button>}
      {canApprove&&t.approval==="Pending"&&<><button onClick={()=>update(t,{approval:"Approved"})}>Approve task</button><button onClick={()=>update(t,{approval:"Changes requested"})}>Request changes</button></>}
    </div>
    <h3>Time spent</h3><p className="muted">{(timeTotal(t)/60).toFixed(2)} hours logged · Estimated {t.estimateHours||0} hours</p>
    {(t.workLogs||[]).map((log,i)=><p className="task-note" key={i}>{log.person}: {log.minutes} minutes · {log.description}</p>)}
    {canEdit&&<form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);const minutes=Number(f.get("minutes"));if(minutes>0&&minutes<=1440){update(t,{workLogs:[...(t.workLogs||[]),{person:actor,minutes,description:String(f.get("description")||"").trim()}]});e.currentTarget.reset();}}}><div className="form-pair"><label>Minutes<input name="minutes" type="number" required min="1" max="1440"/></label><label>Work note<input name="description" maxLength={120}/></label></div><button>Log time</button></form>}
    <h3>Completion evidence & attachments</h3>
    <p className="muted">Small fictional images or PDFs can be attached for this session (max 500 KB each). Nothing is uploaded to a server.</p>
    {(t.attachments||[]).map((item,i)=><div className="task-note" key={i}><a href={item.data} download={item.name}>{item.name}</a> · {Math.round(item.bytes/1024)} KB</div>)}
    {canEdit&&<label>Attach sample image or PDF<input type="file" aria-label="Attach task evidence" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>500000){setNotice("Demo attachment must be smaller than 500 KB.");return;}const reader=new FileReader();reader.onload=()=>update(t,{attachments:[...(t.attachments||[]),{name:file.name,bytes:file.size,data:String(reader.result)}]});reader.readAsDataURL(file);}}/></label>}
    <h3>Activity notes</h3>
    {(t.comments||[]).map((n,i)=><div className="task-note" key={i}><small>{n.date} · {n.author||"Sample user"}</small><p>{n.text}</p></div>)}
    {canEdit&&<form onSubmit={e=>{e.preventDefault();const v=new FormData(e.currentTarget).get("note").trim();if(v){update(t,{comments:[...(t.comments||[]),{date:new Date().toLocaleString("en-GB"),author:actor,text:v}]});e.currentTarget.reset();}}}><label>New note<textarea name="note" maxLength={500} required/></label><button>Add note</button></form>}
  </div>;
  const projectDetails=p=>{
    const linked=tasks.filter(t=>t.projectId===p.id),finished=linked.filter(t=>t.status==="Complete").length;
    return <div className="project-details"><h3>{p.title}</h3><p>{p.detail}</p>
      <div className="detail-data-grid"><div><small>Project lead</small><strong>{p.owner||"Unassigned"}</strong></div><div><small>Team</small><strong>{p.members||"Not listed"}</strong></div><div><small>Sample budget</small><strong>£{Number(p.budget||0).toLocaleString("en-GB")}</strong></div><div><small>Risk</small><strong>{p.risk||"Low"}</strong></div></div>
      <p>{finished} / {linked.length} linked tasks complete</p><progress value={finished} max={Math.max(linked.length,1)} aria-label="Project task progress"/>
      <h3>Milestones</h3>{(p.milestones||[]).map((m,i)=><label className="task-check" key={i}><input type="checkbox" disabled={!canEdit} checked={Boolean(m.done)} onChange={e=>update(p,{milestones:p.milestones.map((x,j)=>i===j?{...x,done:e.target.checked}:x)})}/>{m.text}</label>)}
      {canEdit&&<form onSubmit={e=>{e.preventDefault();const value=new FormData(e.currentTarget).get("milestone").trim();if(value){update(p,{milestones:[...(p.milestones||[]),{text:value,done:false}]});e.currentTarget.reset();}}}><label>Add milestone<input name="milestone" maxLength={120} required/></label><button>Add milestone</button></form>}
      <h3>Project tasks</h3>{linked.length?linked.map(t=><div className="ticket" key={t.id}><span>{t.title} · <Status>{t.status}</Status></span><button onClick={()=>setSelected(t.id)}>Open task</button></div>):<Empty>No tasks linked to this project yet.</Empty>}
    </div>;
  };
  return <div className="task-workspace">
    <div className="customer-page-intro"><div><span className="eyebrow">WORK MANAGEMENT</span><h2>Tasks & Projects</h2><p>One connected workspace for assignments, projects and delivery.</p></div>
      {canCreate&&<div className="quick-actions"><button className="action-secondary" onClick={()=>setCreatingProject(true)}><FolderKanban size={16}/> New project</button><button className="action-primary" onClick={()=>setCreating(true)}><Plus size={17}/> New task</button></div>}</div>
    <div className="customer-metrics">
      <div className="metric-tile"><span><ClipboardList size={18}/> Total tasks</span><strong>{tasks.length}</strong><small>{projects.length} linked projects</small></div>
      <div className="metric-tile"><span><Clock3 size={18}/> Outstanding</span><strong>{outstanding.length}</strong><small>{overdue.length} overdue</small></div>
      <div className="metric-tile"><span><Flag size={18}/> High priority</span><strong>{highPriority.length}</strong><small>High and urgent work</small></div>
      <div className="metric-tile"><span><CheckCircle2 size={18}/> Completed</span><strong>{completed.length}</strong><small>{tasks.length?Math.round(completed.length/tasks.length*100):0}% complete</small></div>
    </div>
    <div className="customer-tools"><label className="search-field"><Search size={17}/><input aria-label="Search tasks" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search tasks, assignees, projects"/></label>
      <label>Priority<select aria-label="Filter tasks by priority" value={priority} onChange={e=>setPriority(e.target.value)}>{["All",...priorities].map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Assigned to<select aria-label="Filter tasks by owner" value={owner} onChange={e=>setOwner(e.target.value)}>{["All","Unassigned",...owners].map(x=><option key={x}>{x}</option>)}</select></label></div>
    <div className="saved-view-tools">
      <label>Saved view<select aria-label="Choose saved task view" defaultValue="" onChange={e=>{const item=savedViews.find(v=>v.name===e.target.value);if(item){setPriority(item.priority);setOwner(item.owner);setQuery(item.query);setView(item.view);}}}><option value="">Current filters</option>{savedViews.map(item=><option key={item.name}>{item.name}</option>)}</select></label>
      <input aria-label="Name task view" value={viewName} onChange={e=>setViewName(e.target.value)} maxLength={35} placeholder="Save these filters"/>
      <button onClick={()=>{const name=viewName.trim();if(name){setSavedViews(old=>[...old.filter(i=>i.name!==name),{name,priority,owner,query,view}]);setViewName("");}}}>Save view</button>
      <small>Views last until this demo is refreshed.</small>
    </div>
    <div className="task-tabs" role="group" aria-label="Task views">{[["mine","My tasks",UserRound],["board","Board",LayoutGrid],["list","List",List],["projects","Projects",FolderKanban]].map(([id,name,Icon])=><button key={id} aria-pressed={view===id} className={view===id?"is-active":""} onClick={()=>setView(id)}><Icon size={16}/>{name}</button>)}</div>
    {notice&&<p className="module-disclaimer" role="status">{notice}</p>}
    {view==="mine"&&<div><div className="customer-page-intro"><div><h3>Assigned to {actor}</h3><p>Your active tasks, with direct access to their details and progress.</p></div><label className="task-show-complete"><input type="checkbox" checked={showMineComplete} onChange={e=>setShowMineComplete(e.target.checked)}/> Include completed</label></div>
      <div className="my-task-grid">{mine.length?mine.map(card):<Empty>No tasks currently assigned to this sample team member. Try Board or change the sample identity above.</Empty>}</div></div>}
    {view==="board"&&<div className="kanban-board">{statuses.map(status=><section className="kanban-column" key={status} aria-label={status+" tasks"}><div className="kanban-heading"><h3>{status==="Planned"?"To do":status==="Complete"?"Done":status}</h3><span>{filtered.filter(t=>t.status===status).length}</span></div>{filtered.filter(t=>t.status===status).length?filtered.filter(t=>t.status===status).map(card):<div className="kanban-empty">No tasks</div>}</section>)}</div>}
    {view==="list"&&<Panel title="All tasks"><div className="table-wrap"><table><thead><tr><th>Task</th><th>Project</th><th>Owner</th><th>Priority</th><th>Due</th><th>Status</th><th>Details</th></tr></thead><tbody>{filtered.map(t=><tr key={t.id}><th scope="row">{t.title}</th><td>{projects.find(p=>p.id===t.projectId)?.title||"—"}</td><td>{t.owner||"Unassigned"}</td><td>{t.priority||"Normal"}</td><td>{dateOf(t.dueDate)}</td><td><Status>{t.status}</Status></td><td><button onClick={()=>setSelected(t.id)}>Open</button></td></tr>)}</tbody></table>{!filtered.length&&<Empty>No matching tasks.</Empty>}</div></Panel>}
    {view==="projects"&&<div className="project-cards">{projects.length?projects.map(p=>{const items=tasks.filter(t=>t.projectId===p.id),done=items.filter(t=>t.status==="Complete").length;return <article className="project-card" key={p.id}><small className="eyebrow">PROJECT · {p.risk||"Low"} RISK</small><h3>{p.title}</h3><p>{p.detail||"No summary yet."}</p><div className="project-card-meta"><span>Lead: {p.owner||"Unassigned"}</span><span>Due: {dateOf(p.dueDate)}</span><span>Budget: £{Number(p.budget||0).toLocaleString("en-GB")}</span></div><progress value={done} max={Math.max(items.length,1)}/><small>{done} of {items.length} tasks complete</small><button onClick={()=>setSelected(p.id)}>Open project</button></article>}):<Empty>No projects yet. Create one to group tasks and milestones.</Empty>}</div>}
    {creating&&<Modal title="Create a sample task" onClose={()=>setCreating(false)}><form className="customer-form" onSubmit={createTask}><p>Fictional data only. Nothing is sent outside this tab.</p>
      <label>Task title<input name="title" maxLength={100} required autoFocus/></label><label>Description<textarea name="detail" maxLength={500}/></label>
      <div className="form-pair"><StaffSelect people={staff} label="Assign to" name="owner" value={staff.some(p=>p.title===actor)?actor:""}/><label>Due date<input type="date" name="dueDate"/></label></div>
      <div className="form-pair"><label>Priority<select name="priority" defaultValue="Normal">{priorities.map(x=><option key={x}>{x}</option>)}</select></label><label>Status<select name="status">{statuses.map(x=><option key={x}>{x}</option>)}</select></label></div>
      <label>Project<select name="projectId"><option value="">No project</option>{projects.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
      <label>Depends on task<select name="dependsOnId"><option value="">None</option>{tasks.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></label>
      <label>Linked asset<select name="assetRefId"><option value="">No asset</option>{assets.map(a=><option key={a.id} value={a.id}>{a.asset||a.title}</option>)}</select></label>
      <div className="form-pair"><label>Repeat<select name="recurrence">{repeats.map(x=><option key={x}>{x}</option>)}</select></label><label>Recurring behaviour<select name="recurringMode">{repeatModes.map(x=><option key={x}>{x}</option>)}</select></label></div>
      <label>Estimated hours<input type="number" name="estimateHours" min="0" max="10000" step=".25"/></label>
      <label>Tags<input name="tags" maxLength={80}/></label><label>Checklist items (one per line)<textarea name="checklist" maxLength={1000}/></label>
      <button type="submit" className="action-primary">Create task</button></form></Modal>}
    {creatingProject&&<Modal title="Create sample project" onClose={()=>setCreatingProject(false)}><form className="customer-form" onSubmit={createProject}><label>Project name<input name="title" required maxLength={100} autoFocus/></label>
      <label>Project summary<textarea name="detail" maxLength={500}/></label><StaffSelect people={staff} label="Project lead" name="owner" value={staff.some(p=>p.title===actor)?actor:""}/>
      <label>Team members<input name="members" maxLength={160} placeholder="Sample engineering team"/></label>
      <div className="form-pair"><label>Budget (£, fictional)<input name="budget" type="number" min="0" step=".01"/></label><label>Target date<input name="dueDate" type="date"/></label></div>
      <label>Project risk<select name="risk">{["Low","Medium","High","Critical"].map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Milestones (one per line)<textarea name="milestones" maxLength={1000}/></label>
      <button className="action-primary" type="submit">Create project</button></form></Modal>}
    {active&&<Modal title={isProject(active)?"Project details":"Task details"} onClose={()=>{setSelected(null);setNotice("");}}>{isProject(active)?projectDetails(active):taskDetails(active)}{notice&&<p role="status">{notice}</p>}</Modal>}
  </div>;
}
