import React, { useMemo, useState } from "react";
import { Panel, Empty, Modal, Status } from "./components";
import { CalendarDays, CheckCircle2, ClipboardList, List, LayoutGrid, Plus, Search, SlidersHorizontal, Clock3, Flag, UserRound, ArrowRight, Repeat2 } from "lucide-react";

const states = ["Planned", "In progress", "Complete"];
const priorityLevels = ["Low", "Normal", "High", "Urgent"];
const labels = { Planned: "To do", "In progress": "In progress", Complete: "Done" };
const dateOf = value => value ? new Date(value + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "No deadline";
const today = () => new Date().toISOString().slice(0, 10);
const taskCompleteness = task => (task.checklist || []).length ? Math.round(100 * task.checklist.filter(item => item.done).length / task.checklist.length) : null;
const classPriority = value => "priority-" + String(value || "Normal").toLowerCase();

export default function CustomerTaskBoard({ org, records, onAdd, onUpdate }) {
  const [view, setView] = useState("board");
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState("All");
  const [owner, setOwner] = useState("All");
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);
  const [savedViews, setSavedViews] = useState([]);
  const [viewName, setViewName] = useState("");
  const [formError, setFormError] = useState("");

  const tasks = useMemo(() => records.filter(record => record.orgId === org.id && org.modules.includes(record.module) && ["Tasks", "Projects", "Tasks & projects"].includes(record.module)), [records, org]);
  const owners = [...new Set(tasks.map(task => task.owner).filter(Boolean))].sort();
  const filtered = tasks.filter(task =>
    (priority === "All" || (task.priority || "Normal") === priority) &&
    (owner === "All" || (task.owner || "Unassigned") === owner) &&
    [task.title, task.detail, task.owner, task.tags].join(" ").toLowerCase().includes(query.toLowerCase())
  );
  const active = tasks.find(task => task.id === selected);
  const outstanding = tasks.filter(task => task.status !== "Complete");
  const overdue = outstanding.filter(task => task.dueDate && task.dueDate < today());
  const completed = tasks.filter(task => task.status === "Complete");
  const highPriority = outstanding.filter(task => ["Urgent", "High"].includes(task.priority));

  const update = (task, patch) => onUpdate(org.id, task.id, patch);
  const moveTask = (task, target) => update(task, { status: target });
  const openDetails = task => setSelected(task.id);
  const newTask = async event => {
    event.preventDefault();
    setFormError("");
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    const title = String(fields.title || "").trim();
    if (!title) { setFormError("Give your task a title."); return; }
    const saved = await onAdd({
      orgId: org.id, module: org.modules.includes("Tasks & projects") ? "Tasks & projects" : org.modules.includes("Tasks") ? "Tasks" : "Projects",
      title, detail: String(fields.detail || "").trim(), owner: String(fields.owner || "").trim(),
      status: fields.status || "Planned", priority: fields.priority || "Normal",
      dueDate: fields.dueDate || "", recurrence: fields.recurrence || "None",
      tags: String(fields.tags || "").trim(),
      checklist: String(fields.checklist || "").split("\n").map(value => value.trim()).filter(Boolean).map(text => ({ text, done: false })),
      comments: [], createdAt: new Date().toISOString(),
    });
    if (saved) { setCreating(false); setView("board"); }
  };
  const taskCard = task => {
    const isOverdue = task.dueDate && task.dueDate < today() && task.status !== "Complete";
    const progress = taskCompleteness(task);
    return <article className="task-card" key={task.id}>
      <div className="task-card-top">
        <span className={"priority-chip " + classPriority(task.priority)}><Flag size={13} />{task.priority || "Normal"}</span>
        {task.recurrence && task.recurrence !== "None" && <span className="subtle-chip"><Repeat2 size={13} />{task.recurrence}</span>}
      </div>
      <button type="button" className="task-name" onClick={() => openDetails(task)}>{task.title}</button>
      {task.detail && <p className="task-description">{task.detail}</p>}
      {task.tags && <span className="task-tag">{task.tags}</span>}
      {progress !== null && <div className="task-checklist-progress"><progress value={progress} max="100" aria-label={"Checklist progress for " + task.title} /><small>{progress}% checklist</small></div>}
      <div className="task-meta">
        <span><UserRound size={14}/>{task.owner || "Unassigned"}</span>
        <span className={isOverdue ? "task-overdue" : ""}><CalendarDays size={14}/>{dateOf(task.dueDate)}</span>
      </div>
      <div className="task-actions">
        <button type="button" onClick={() => openDetails(task)}>Details</button>
        {task.status !== "Complete" && <button type="button" onClick={() => moveTask(task, task.status === "Planned" ? "In progress" : "Complete")} aria-label={"Advance " + task.title}><ArrowRight size={15}/> {task.status === "Planned" ? "Start" : "Finish"}</button>}
      </div>
    </article>;
  };

  return <div className="task-workspace">
    <div className="customer-page-intro"><div><span className="eyebrow">WORK MANAGEMENT</span><h2>Tasks & Projects</h2><p>Plan, prioritise and track the team's work in one place.</p></div>
      <button className="action-primary" type="button" onClick={() => setCreating(true)}><Plus size={17}/> New task</button></div>
    <div className="customer-metrics">
      <div className="metric-tile"><span><ClipboardList size={18}/> Total tasks</span><strong>{tasks.length}</strong><small>Across enabled task modules</small></div>
      <div className="metric-tile"><span><Clock3 size={18}/> Outstanding</span><strong>{outstanding.length}</strong><small>{overdue.length} overdue</small></div>
      <div className="metric-tile"><span><Flag size={18}/> High priority</span><strong>{highPriority.length}</strong><small>High or urgent, still open</small></div>
      <div className="metric-tile"><span><CheckCircle2 size={18}/> Completed</span><strong>{completed.length}</strong><small>{tasks.length ? Math.round(completed.length / tasks.length * 100) : 0}% of all tasks</small></div>
    </div>
    <div className="customer-tools">
      <label className="search-field"><Search size={17}/><input aria-label="Search tasks" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search tasks, owners or tags" /></label>
      <label><SlidersHorizontal size={16}/> Priority<select aria-label="Filter tasks by priority" value={priority} onChange={e => setPriority(e.target.value)}>{["All", ...priorityLevels].map(x => <option key={x}>{x}</option>)}</select></label>
      <label>Assigned to<select aria-label="Filter tasks by owner" value={owner} onChange={e => setOwner(e.target.value)}>{["All", "Unassigned", ...owners].map(x => <option key={x}>{x}</option>)}</select></label>
      <div className="segmented-actions" role="group" aria-label="Task view">
        <button className={view === "board" ? "is-active" : ""} aria-pressed={view === "board"} onClick={() => setView("board")}><LayoutGrid size={16}/> Board</button>
        <button className={view === "list" ? "is-active" : ""} aria-pressed={view === "list"} onClick={() => setView("list")}><List size={16}/> List</button>
      </div>
    </div>
    <div className="saved-view-tools">
      <label>Saved view<select aria-label="Choose saved task view" defaultValue="" onChange={e => {const item=savedViews.find(v=>v.name===e.target.value);if(item){setPriority(item.priority);setOwner(item.owner);setQuery(item.query);setView(item.view);}}}><option value="">Current filters</option>{savedViews.map(v=><option key={v.name}>{v.name}</option>)}</select></label>
      <input aria-label="Name task view" placeholder="Name this view" maxLength={35} value={viewName} onChange={e => setViewName(e.target.value)} />
      <button type="button" onClick={() => {if(viewName.trim()){setSavedViews(v=>[...v.filter(x=>x.name!==viewName.trim()),{name:viewName.trim(),priority,owner,query,view}]);setViewName("");}}}>Save view</button>
      <small>Saved until you refresh this demo.</small>
    </div>
    <p className="muted" role="status">Showing {filtered.length} of {tasks.length} tasks</p>
    {view === "board" ? <div className="kanban-board">{states.map(state=><section className="kanban-column" key={state} aria-label={labels[state] + " tasks"}>
      <div className="kanban-heading"><h3>{labels[state]}</h3><span>{filtered.filter(task=>task.status===state).length}</span></div>
      {filtered.filter(task=>task.status===state).length ? filtered.filter(task=>task.status===state).map(taskCard) : <div className="kanban-empty">No tasks here</div>}
    </section>)}</div>
    : <Panel title="Task list"><div className="table-wrap"><table><thead><tr><th>Task</th><th>Owner</th><th>Priority</th><th>Due</th><th>Status</th><th>Details</th></tr></thead><tbody>{filtered.map(task=><tr key={task.id}><th scope="row">{task.title}</th><td>{task.owner||"Unassigned"}</td><td>{task.priority||"Normal"}</td><td>{dateOf(task.dueDate)}</td><td><Status>{task.status}</Status></td><td><button onClick={()=>openDetails(task)}>Open</button></td></tr>)}</tbody></table>{!filtered.length && <Empty>No tasks match these filters.</Empty>}</div></Panel>}
    {creating && <Modal title="Create a sample task" onClose={()=>setCreating(false)}>
      <form className="customer-form" onSubmit={newTask}>
        <p>Fictional demo only. No notifications are sent and tasks reset when you refresh.</p>
        {formError && <p role="alert">{formError}</p>}
        <label>Task title<input name="title" maxLength={100} required autoFocus placeholder="e.g. Inspect workshop equipment" /></label>
        <label>Description<textarea name="detail" maxLength={500} placeholder="What needs to be done?" /></label>
        <div className="form-pair"><label>Assign to<input name="owner" maxLength={80} placeholder="Team member or group" /></label><label>Due date<input type="date" name="dueDate" /></label></div>
        <div className="form-pair"><label>Priority<select name="priority" defaultValue="Normal">{priorityLevels.map(x=><option key={x}>{x}</option>)}</select></label><label>Status<select name="status">{states.map(x=><option key={x}>{x}</option>)}</select></label></div>
        <label>Repeat<select name="recurrence">{["None","Daily","Weekly","Monthly","Quarterly","Yearly"].map(x=><option key={x}>{x}</option>)}</select></label>
        <label>Tags<input name="tags" maxLength={80} placeholder="e.g. Safety, workshop" /></label>
        <label>Checklist items (one per line)<textarea name="checklist" maxLength={1000} placeholder={"Prepare equipment\nInspect components\nRecord outcome"} /></label>
        <button type="submit" className="action-primary">Create task</button>
      </form>
    </Modal>}
    {active && <Modal title="Task details" onClose={()=>setSelected(null)}>
      <div className="task-detail">
        <h3>{active.title}</h3>
        <p>{active.detail || "No description yet."}</p>
        <div className="form-pair"><label>Status<select aria-label="Task status" value={active.status} onChange={e=>update(active,{status:e.target.value})}>{states.map(x=><option key={x}>{x}</option>)}</select></label><label>Priority<select aria-label="Task priority" value={active.priority||"Normal"} onChange={e=>update(active,{priority:e.target.value})}>{priorityLevels.map(x=><option key={x}>{x}</option>)}</select></label></div>
        <div className="form-pair"><label>Assigned to<input aria-label="Task owner" key={active.id+"-owner"} defaultValue={active.owner||""} maxLength={80} onBlur={e=>{if(e.target.value.trim()!==(active.owner||""))update(active,{owner:e.target.value.trim()});}} /></label><label>Deadline<input type="date" aria-label="Task deadline" value={active.dueDate||""} onChange={e=>update(active,{dueDate:e.target.value})}/></label></div>
        <label>Repeat<select aria-label="Task recurrence" value={active.recurrence||"None"} onChange={e=>update(active,{recurrence:e.target.value})}>{["None","Daily","Weekly","Monthly","Quarterly","Yearly"].map(x=><option key={x}>{x}</option>)}</select></label>
        <h3>Checklist</h3>
        {(active.checklist||[]).map((item,index)=><label className="task-check" key={index}><input type="checkbox" checked={Boolean(item.done)} onChange={e=>update(active,{checklist:active.checklist.map((entry,i)=>i===index?{...entry,done:e.target.checked}:entry)})}/><span>{item.text}</span></label>)}
        {!(active.checklist||[]).length && <p className="muted">No checklist items yet.</p>}
        <form onSubmit={e=>{e.preventDefault();const value=new FormData(e.currentTarget).get("item").trim();if(value){update(active,{checklist:[...(active.checklist||[]),{text:value,done:false}]});e.currentTarget.reset();}}}>
          <label>Add checklist item<input name="item" maxLength={120} required placeholder="Next step" /></label><button type="submit">Add item</button>
        </form>
        <h3>Internal demo notes</h3>
        {(active.comments||[]).map((note,index)=><div className="task-note" key={index}><small>{note.date}</small><p>{note.text}</p></div>)}
        <form onSubmit={e=>{e.preventDefault();const value=new FormData(e.currentTarget).get("note").trim();if(value){update(active,{comments:[...(active.comments||[]),{date:new Date().toLocaleString("en-GB"),text:value}]});e.currentTarget.reset();}}}>
          <label>New note<textarea name="note" maxLength={500} required placeholder="Add a progress update" /></label><button type="submit">Add note</button>
        </form>
      </div>
    </Modal>}
  </div>;
}
