import React, { useMemo, useState } from "react";
import { Panel, Empty, Modal, Status } from "./components";
import { moduleInfo, moduleTypeLabel } from "./customerModules";
import { Plus, Search, Download, CalendarDays, MapPin, Package, ClipboardCheck, AlertTriangle, UserRound, FileText, Wrench, BriefcaseBusiness, Clock3, CheckCircle2 } from "lucide-react";

const today = () => new Date().toISOString().slice(0, 10);
const display = value => value === null || value === undefined || value === "" ? "—" : String(value);
const fmtDate = date => date ? new Date(date.slice(0,10)+"T12:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}) : "No date";
const fieldValue = (record,field) => record[field[0]] ?? "";
const csvSafe = value => {
  const raw = String(value ?? "");
  const safe = /^[\s]*[=+@\-]/.test(raw) ? "'" + raw : raw;
  return '"' + safe.replaceAll('"','""') + '"';
};
function exportRows(module, rows, fields) {
  const keys = [["title","Record"],["detail","Description"],["owner","Owner"],["priority","Priority"],["dueDate","Due date"],["status","Status"],...fields.filter(field=>!["owner","dueDate"].includes(field[0])).map(field=>[field[0],field[1]])];
  const csv = [keys.map(x=>csvSafe(x[1])).join(","), ...rows.map(r=>keys.map(k=>csvSafe(r[k[0]])).join(","))].join("\r\n");
  const file = new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
  const url = URL.createObjectURL(file);
  const a = document.createElement("a"); a.href=url; a.download=module.toLowerCase().replace(/[^a-z0-9]+/g,"-")+"-demo.csv"; a.click();
  URL.revokeObjectURL(url);
}
function ModuleIcon({type}) {
  const Icon = ({people:UserRound,assets:Package,maintenance:Wrench,inspections:ClipboardCheck,documents:FileText,
    schedule:CalendarDays,events:CalendarDays,bookings:Clock3,safety:AlertTriangle}[type] || BriefcaseBusiness);
  return <Icon size={21}/>;
}
const fmtValue = (field, record) => {
  const value = fieldValue(record,field);
  if (!value) return "—";
  if (field[2] === "date") return fmtDate(value);
  if (field[2] === "datetime-local") return value.replace("T"," ");
  return display(value);
};
function Kpi({label,value,sub,icon:Icon}) {return <div className="metric-tile"><span>{Icon && <Icon size={18}/>} {label}</span><strong>{value}</strong><small>{sub}</small></div>}
export default function CustomerModulePage({org,module,records,onAdd,onUpdate}) {
  const spec = moduleInfo(module);
  const [query,setQuery] = useState("");
  const [filter,setFilter] = useState("All");
  const [selected,setSelected] = useState(null);
  const [creating,setCreating] = useState(false);
  const [sort,setSort] = useState("title");
  const [error,setError] = useState("");
  const rows = useMemo(()=>records.filter(r=>r.orgId===org.id && r.module===module),[org.id,module,records]);
  const found = useMemo(()=>rows.filter(r=>[r.title,r.detail,r.owner,...spec.fields.map(f=>String(r[f[0]]||""))].join(" ").toLowerCase().includes(query.toLowerCase())
    && (filter==="All" || r.status===filter)).sort((a,b)=>sort==="due"?(a.dueDate||"9999").localeCompare(b.dueDate||"9999"):sort==="priority" ? ["Urgent","High","Normal","Low"].indexOf(a.priority||"Normal")-["Urgent","High","Normal","Low"].indexOf(b.priority||"Normal"):a.title.localeCompare(b.title)),[rows,query,filter,sort,spec]);
  const open = rows.filter(r=>r.status!=="Complete");
  const overdue = open.filter(r=>r.dueDate && r.dueDate<today());
  const currentRecord = rows.find(r=>r.id===selected);
  const update = (r,patch)=>onUpdate(org.id,r.id,patch);
  const money = values => values.reduce((sum,r)=>sum + (Number(r.amount)||0),0);
  const metrics = spec.type==="inventory" ? [
    ["Stock items",rows.length,"Listed products"],
    ["Low stock",rows.filter(r=>Number(r.quantity)<=Number(r.reorder||0)).length,"At or below reorder point"],
    ["Available units",rows.reduce((sum,r)=>sum+(Number(r.quantity)||0),0),"Across listed items"],
  ] : spec.type==="timesheets" ? [
    ["Sessions",rows.length,"Recorded sample sessions"],
    ["Pending",rows.filter(r=>r.approval==="Pending").length,"Awaiting review"],
    ["Approved",rows.filter(r=>r.approval==="Approved").length,"Illustrative approvals"],
  ] : spec.type==="donations" || spec.type==="finance" ? [
    ["Records",rows.length,"Fictional records"],
    ["Sample value","£"+money(rows).toLocaleString("en-GB",{maximumFractionDigits:2}),"Illustrative only"],
    ["Open",open.length,"Not completed"],
  ] : spec.type==="people" ? [
    ["People",rows.length,"Directory profiles"],
    ["Active",rows.filter(r=>r.status!=="Complete").length,"Sample active entries"],
    ["Teams",new Set(rows.map(r=>r.team||r.detail).filter(Boolean)).size,"Groups and roles"],
  ] : [
    ["Total "+moduleTypeLabel[spec.type].toLowerCase(),rows.length,"In this module"],
    ["In progress",rows.filter(r=>r.status==="In progress").length,"Currently underway"],
    [spec.type==="inspections"?"Need attention":"Outstanding",spec.type==="inspections"?rows.filter(r=>["Fail","Requires attention"].includes(r.result)).length:open.length,overdue.length+" overdue by deadline"],
  ];
  const save = async e => {
    e.preventDefault();setError("");
    const raw = Object.fromEntries(new FormData(e.currentTarget));
    const title = String(raw.title||"").trim();
    if(!title){setError("Enter a title.");return;}
    if(raw.startTime && raw.endTime && raw.endTime < raw.startTime){setError("The end time cannot be before the start time.");return;}
    const values={orgId:org.id,module,title,detail:String(raw.detail||"").trim(),owner:String(raw.owner||"").trim(),
      priority:raw.priority||"Normal",status:raw.status||"Planned",dueDate:raw.dueDate||""};
    spec.fields.forEach(field=>{values[field[0]]=String(raw[field[0]]||"").trim();});
    const saved=await onAdd(values);
    if(saved) setCreating(false);
  };
  const recordDetails = r => <div className="module-detail-body">
    <h3>{r.title}</h3><p>{r.detail||"No further description."}</p>
    <div className="detail-data-grid">
      {spec.fields.map(field=><div key={field[0]}><small>{field[1]}</small><strong>{fmtValue(field,r)}</strong></div>)}
      <div><small>Assigned to</small><strong>{r.owner||"Unassigned"}</strong></div>
      <div><small>Priority</small><strong>{r.priority||"Normal"}</strong></div>
      <div><small>Due</small><strong>{fmtDate(r.dueDate)}</strong></div>
    </div>
    <div className="form-pair"><label>Progress<select aria-label="Record status" value={r.status||"Planned"} onChange={e=>update(r,{status:e.target.value})}>{["Planned","In progress","Complete"].map(x=><option key={x}>{x}</option>)}</select></label>
    <label>Priority<select aria-label="Record priority" value={r.priority||"Normal"} onChange={e=>update(r,{priority:e.target.value})}>{["Low","Normal","High","Urgent"].map(x=><option key={x}>{x}</option>)}</select></label></div>
    <label>Next deadline<input aria-label="Record due date" type="date" value={r.dueDate||""} onChange={e=>update(r,{dueDate:e.target.value})}/></label>
    {spec.fields.filter(field=>Array.isArray(field[2])).map(field=><label key={field[0]}>{field[1]}<select value={r[field[0]]||field[2][0]} onChange={e=>update(r,{[field[0]]:e.target.value})}>{field[2].map(x=><option key={x}>{x}</option>)}</select></label>)}
    <p className="muted">Changes in this demonstration are local to the browser session. This is not a legally valid approval, signature, payroll or accounting record.</p>
  </div>;
  const rowAction = r => <button type="button" onClick={()=>setSelected(r.id)} aria-label={"View "+r.title}>View details</button>;
  const summaryCard = r => <article className="purpose-card" key={r.id}>
    <div className="purpose-card-heading"><div><span className="eyebrow">{moduleTypeLabel[spec.type]}</span><h3>{r.title}</h3></div><Status>{r.status}</Status></div>
    <p>{r.detail}</p>
    <div className="purpose-properties">
      {spec.fields.slice(0,3).map(f=><div key={f[0]}><small>{f[1]}</small><strong>{fmtValue(f,r)}</strong></div>)}
    </div><div className="purpose-card-footer"><small>{r.owner||"Unassigned"} · {fmtDate(r.dueDate)}</small>{rowAction(r)}</div>
  </article>;
  const stage = r => r.stage||"Lead";
  const renderType = () => {
    if(!found.length) return <Empty>No matching {moduleTypeLabel[spec.type].toLowerCase()}. Change filters or add an example record.</Empty>;
    if(["people","assets","fleet","archives","documents","training"].includes(spec.type))
      return <div className="purpose-grid">{found.map(summaryCard)}</div>;
    if(spec.type==="crm")
      return <div className="pipeline-grid">{["Lead","Qualified","Proposal","Customer"].map(step=><section className="pipeline-column" key={step}><h3>{step} <span>{found.filter(r=>stage(r)===step).length}</span></h3>{found.filter(r=>stage(r)===step).map(summaryCard)}</section>)}</div>;
    if(["events","schedule","bookings","leave"].includes(spec.type))
      return <div className="agenda-list">{[...found].sort((a,b)=>(a.startTime||a.startDate||a.dueDate||"9999").localeCompare(b.startTime||b.startDate||b.dueDate||"9999")).map(r=><article className="agenda-item" key={r.id}><div className="agenda-date"><CalendarDays size={18}/><strong>{fmtDate(r.startTime||r.startDate||r.dueDate)}</strong></div><div><h3>{r.title}</h3><p>{r.detail||spec.subtitle}</p><small>{r.person||r.owner||"Unassigned"} {r.location?"· "+r.location:""}</small></div><div>{rowAction(r)}</div></article>)}</div>;
    if(["maintenance","inspections","safety","operations"].includes(spec.type))
      return <div className="work-order-list">{found.map(r=><article className="work-order" key={r.id}>
        <div className="work-order-icon"><ModuleIcon type={spec.type}/></div>
        <div className="work-order-content"><div className="work-order-title"><h3>{r.title}</h3><Status>{r.status}</Status></div>
        <p>{r.fault||r.action||r.detail}</p>
        <div className="work-order-meta">{spec.fields.slice(0,3).map(f=><span key={f[0]}>{f[1]}: <strong>{fmtValue(f,r)}</strong></span>)}<span>Due: <strong>{fmtDate(r.dueDate)}</strong></span></div></div>{rowAction(r)}</article>)}</div>;
    if(spec.type==="reporting")
      return <div className="report-bars">{found.map(r=><div key={r.id}><span>{r.title}</span><progress value={r.status==="Complete"?100:r.status==="In progress"?50:0} max={100}/><small>{r.status}</small></div>)}</div>;
    return <div className="table-wrap"><table><thead><tr><th>Record</th>{spec.fields.slice(0,3).map(f=><th key={f[0]}>{f[1]}</th>)}<th>Status</th><th>Action</th></tr></thead><tbody>{found.map(r=><tr key={r.id}><th scope="row">{r.title}<small className="cell-subtitle">{r.detail}</small></th>{spec.fields.slice(0,3).map(f=><td key={f[0]}>{fmtValue(f,r)}</td>)}<td><Status>{r.status}</Status></td><td>{rowAction(r)}</td></tr>)}</tbody></table></div>;
  };
  return <div className="purpose-module">
    <div className="customer-page-intro"><div><span className="eyebrow">{moduleTypeLabel[spec.type].toUpperCase()}</span><h2>{spec.title}</h2><p>{spec.subtitle}</p></div>
      {spec.type!=="reporting" && <button type="button" className="action-primary" onClick={()=>setCreating(true)}><Plus size={17}/> New {moduleTypeLabel[spec.type].toLowerCase().replace(/s$/,"")}</button>}</div>
    <div className="customer-metrics">{metrics.map(([label,value,sub],i)=><Kpi key={label} label={label} value={value} sub={sub} icon={[Package,Clock3,CheckCircle2][i]}/>)}</div>
    <div className="customer-tools">
      <label className="search-field"><Search size={17}/><input aria-label={"Search "+module} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search this module"/></label>
      <label>Status<select aria-label="Filter module status" value={filter} onChange={e=>setFilter(e.target.value)}>{["All","Planned","In progress","Complete"].map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Sort<select aria-label="Sort module records" value={sort} onChange={e=>setSort(e.target.value)}><option value="title">Name</option><option value="due">Due date</option><option value="priority">Priority</option></select></label>
      <button type="button" className="action-secondary" onClick={()=>exportRows(module,found,spec.fields)}><Download size={16}/> Export CSV</button>
    </div>
    <p className="muted" role="status">Showing {found.length} of {rows.length} records · Fictional demo data</p>
    {renderType()}
    {spec.type==="timesheets" && <p className="module-disclaimer">Times are illustrative; no payroll hours are calculated or attendance approvals issued.</p>}
    {spec.type==="finance" && <p className="module-disclaimer">Fictional amounts only. No invoices, billing messages or payments are sent.</p>}
    {["inspections","safety","training"].includes(spec.type) && <p className="module-disclaimer">This example is not an accredited inspection, safety certification or verified training record.</p>}
    <div className="module-lower"><div><h3>Ways to work</h3><p>Search, filter and review the {moduleTypeLabel[spec.type].toLowerCase()} above. Add an example item and change its status to see the dashboard update.</p></div><div><h3>Demo information</h3><p>Changes reset on refresh. External services, real files and organisation permissions are not connected in this public preview.</p></div></div>
    {creating && <Modal title={"Add sample "+moduleTypeLabel[spec.type].toLowerCase()} onClose={()=>setCreating(false)}>
      <form className="customer-form" onSubmit={save}>
        <p>Use fictional details. This information is only kept in the current browser session.</p>
        {error && <p role="alert">{error}</p>}
        <label>Record title<input name="title" required maxLength={100} autoFocus placeholder="Give this item a clear name" /></label>
        <label>Description<textarea name="detail" maxLength={400} placeholder="Useful details or instructions" /></label>
        {spec.fields.filter(f=>!["owner","dueDate"].includes(f[0])).map(field=><label key={field[0]}>{field[1]}{Array.isArray(field[2])?<select name={field[0]}>{field[2].map(x=><option key={x}>{x}</option>)}</select>:<input name={field[0]} type={field[2]||"text"} min={field[2]==="number"?"0":undefined} step={field[2]==="number"?"any":undefined} maxLength={field[2]?undefined:140}/>}</label>)}
        <div className="form-pair"><label>Assigned to<input name="owner" maxLength={80}/></label><label>Due date<input name="dueDate" type="date"/></label></div>
        <div className="form-pair"><label>Priority<select name="priority">{["Normal","Low","High","Urgent"].map(x=><option key={x}>{x}</option>)}</select></label><label>Progress<select name="status">{["Planned","In progress","Complete"].map(x=><option key={x}>{x}</option>)}</select></label></div>
        <button type="submit" className="action-primary">Create sample record</button>
      </form>
    </Modal>}
    {currentRecord && <Modal title={"Review "+moduleTypeLabel[spec.type].toLowerCase()} onClose={()=>setSelected(null)}>{recordDetails(currentRecord)}</Modal>}
  </div>;
}
