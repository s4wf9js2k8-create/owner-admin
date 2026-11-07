import React, { useEffect, useState } from "react";
import { Empty, Modal, Status } from "./components";
import { ClipboardCheck, Package, Plus, Wrench } from "lucide-react";
import { firstModuleOfType, findAsset, relatedRecords } from "./customerWorkflows";
import { moduleInfo } from "./customerModules";
import { StaffSelect, QualifiedStaffSelect, teamMembers } from "./LinkedSelectors";
import {validateAssignee} from "./staffEligibility";

const fmtDate=v=>v?new Date(v.slice(0,10)+"T12:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}):"Not set";
const today=()=>new Date().toISOString().slice(0,10);
const conditions=["Good","Monitor","Needs attention","Out of service"];
const results=["Pending","Pass","Fail","Requires attention"];
const states=["Planned","In progress","Complete"];
const Severity=["Low","Medium","High","Critical"];
const assetId=r=>r.asset||r.reference||r.title;
const summary=(label,value)=> <div className="metric-tile"><span>{label}</span><strong>{value}</strong></div>;
export default function CustomerAssetOps({org,module,records,onAdd,onUpdate,onNavigate,focusId,canCreate=true,canEdit=true,canApprove=true}) {
  const type=moduleInfo(module).type;
  const [creating,setCreating]=useState(false);
  const [assignmentDate,setAssignmentDate]=useState("");
  const [selected,setSelected]=useState(null);
  const [error,setError]=useState("");
  const [filter,setFilter]=useState("");
  const [targetAsset,setTargetAsset]=useState("");
  const [scanned,setScanned]=useState("");
  const [targetOrder,setTargetOrder]=useState("");
  const rows=records.filter(r=>r.orgId===org.id&&r.module===module);
  const staff=teamMembers(records,org.id);
  const assets=records.filter(r=>r.orgId===org.id&&moduleInfo(r.module).type==="assets");
  const workOrders=records.filter(r=>r.orgId===org.id&&moduleInfo(r.module).type==="maintenance");
  const inspections=records.filter(r=>r.orgId===org.id&&moduleInfo(r.module).type==="inspections");
  const filtered=rows.filter(r=>[r.title,r.detail,r.asset,r.sku,r.location,r.fault].join(" ").toLowerCase().includes(filter.toLowerCase()));
  const current=rows.find(r=>r.id===selected);
  useEffect(()=>{if(focusId)setSelected(focusId);},[focusId]);
  const update=(r,patch)=>onUpdate(org.id,r.id,patch);
  const create=async e=>{
    e.preventDefault();setError("");
    const raw=Object.fromEntries(new FormData(e.currentTarget));
    const title=String(raw.title||"").trim();
    if(!title){setError("Enter a title.");return;}
    if(type==="maintenance"||type==="inspections"){
      const name=type==="maintenance"?raw.owner:raw.inspector;
      const assessment=validateAssignee(records,org.id,name,{kind:type,date:raw.dueDate});
      if(name&&!assessment.eligible){setError("Staff member is not eligible: "+assessment.reasons.join("; "));return;}
    }
    const fields={orgId:org.id,module,title,detail:String(raw.detail||"").trim(),status:"Planned",owner:String(raw.owner||"").trim(),engineerId:staff.find(p=>p.title===raw.owner)?.id||"",custodianId:staff.find(p=>p.title===raw.custodian)?.id||"",inspectorId:staff.find(p=>p.title===raw.inspector)?.id||"",
      dueDate:raw.dueDate||"",asset:raw.asset||(assets.find(a=>a.id===raw.assetRefId)?.asset||""),assetRefId:raw.assetRefId||"",
      location:raw.location||"",condition:raw.condition||"Good",custodian:raw.custodian||"",warrantyUntil:raw.warrantyUntil||"",
      fault:raw.fault||"",severity:raw.severity||"Medium",result:raw.result||"Pending",inspector:raw.inspector||"",
      sku:raw.sku||"",quantity:raw.quantity||"0",reorder:raw.reorder||"0",
      checklist:String(raw.checklist||"").split("\n").map(x=>x.trim()).filter(Boolean).map(text=>({text,done:false})),
      actions:[],workLogs:[],movements:[],partsUsed:[],createdAt:new Date().toISOString()};
    const saved=await onAdd(fields);if(saved){setCreating(false);setTargetAsset("");}
  };
  const startWorkOrder=async (source,kind)=>{
    setError("");
    const workModule=firstModuleOfType(org,"maintenance");
    if(!workModule){setError("Enable Maintenance & work orders first.");return;}
    const relatedAsset=findAsset(assets,source.assetRefId||source.asset);
    if(kind==="inspection" && workOrders.some(w=>w.sourceInspectionId===source.id&&w.status!=="Complete")){setError("An open corrective work order already exists for this inspection.");return;}
    const title=kind==="inspection"?"Corrective action: "+source.title:"Service asset: "+source.title;
    const saved=await onAdd({orgId:org.id,module:workModule,title,detail:kind==="inspection"?"Created from failed inspection: "+source.title:"Maintenance requested from asset profile.",
      asset:relatedAsset?.asset||source.asset||"",assetRefId:relatedAsset?.id||source.assetRefId||"",sourceInspectionId:kind==="inspection"?source.id:"",
      fault:kind==="inspection"?"Resolve findings from "+source.title:"Inspect and maintain equipment",severity:kind==="inspection"?"High":"Medium",
      status:"Planned",priority:kind==="inspection"?"High":"Normal",owner:"",dueDate:source.dueDate||today(),
      checklist:[{text:"Review scope and safety",done:false},{text:"Carry out corrective work",done:false},{text:"Record outcome",done:false}],
      workLogs:[],partsUsed:[],createdAt:new Date().toISOString()});
    if(saved){setSelected(null);onNavigate(workModule);}
  };
  const related=asset=>relatedRecords(records.filter(r=>r.orgId===org.id),asset);
  const assetsView=()=> <div><div className="customer-page-intro"><div><span className="eyebrow">EQUIPMENT CONTROL</span><h2>Asset register</h2><p>Asset identifiers, locations, custodians and linked work history.</p></div>{canCreate&&<button className="action-primary" onClick={()=>setCreating(true)}><Plus size={16}/> Register asset</button>}</div>
    <div className="customer-metrics">{summary("Assets",rows.length)}{summary("Needs attention",rows.filter(r=>["Needs attention","Out of service"].includes(r.condition)).length)}{summary("Related jobs",rows.reduce((sum,a)=>sum+related(a).length,0))}</div>
    <label className="people-search">Find asset<input aria-label="Find asset" value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Asset ID, equipment or location"/></label>
    <div className="asset-register">{filtered.map(r=><article key={r.id} className="asset-profile-card"><div className="asset-profile-top"><span className="asset-identity"><Package size={20}/><strong>{assetId(r)}</strong></span><Status>{r.condition||"Good"}</Status></div>
      <h3>{r.title}</h3><p>{r.location||"Unassigned location"} · Custodian: {r.custodian||"Not assigned"}</p>
      <div className="asset-profile-links"><span>{related(r).filter(x=>moduleInfo(x.module).type==="maintenance").length} jobs</span><span>{related(r).filter(x=>moduleInfo(x.module).type==="inspections").length} inspections</span></div>
      <button onClick={()=>setSelected(r.id)}>Open asset actions</button></article>)}</div>{!filtered.length&&<Empty>No assets match that search.</Empty>}
  </div>;
  const maintenanceView=()=> <div><div className="customer-page-intro"><div><span className="eyebrow">WORK ORDER DELIVERY</span><h2>Maintenance & work orders</h2><p>Track faults, allocated engineers, job checklists, time and parts.</p></div>{canCreate&&<button className="action-primary" onClick={()=>setCreating(true)}><Plus size={16}/> Raise work order</button>}</div>
    <div className="customer-metrics">{summary("Open jobs",rows.filter(r=>r.status!=="Complete").length)}{summary("Completed",rows.filter(r=>r.status==="Complete").length)}{summary("Critical",rows.filter(r=>r.severity==="Critical").length)}</div>
    <div className="job-board">{states.map(status=><section key={status}><h3>{status} <span>{filtered.filter(r=>r.status===status).length}</span></h3>
      {filtered.filter(r=>r.status===status).map(r=><article key={r.id} className="job-board-card"><small>{r.asset||"No asset"} · {r.severity||"Medium"} priority</small><h4>{r.title}</h4><p>{r.fault||r.detail}</p><div><span>{r.owner||"Unassigned"}</span><span>{fmtDate(r.dueDate)}</span></div><button onClick={()=>setSelected(r.id)}>Manage work order</button></article>)}</section>)}</div>
  </div>;
  const inspectionView=()=> <div><div className="customer-page-intro"><div><span className="eyebrow">INSPECTION CONTROL</span><h2>Inspections & checklists</h2><p>Scheduled checks, results and corrective maintenance actions.</p></div>{canCreate&&<button className="action-primary" onClick={()=>setCreating(true)}><Plus size={16}/> New inspection</button>}</div>
    <div className="customer-metrics">{summary("Inspections",rows.length)}{summary("Passed",rows.filter(r=>r.result==="Pass").length)}{summary("Attention required",rows.filter(r=>["Fail","Requires attention"].includes(r.result)).length)}</div>
    <div className="inspection-list">{filtered.map(r=><article key={r.id} className="inspection-row"><div className="inspection-emblem"><ClipboardCheck size={20}/></div><div><h3>{r.title}</h3><p>{r.asset||"General check"} · {r.inspector||"Unassigned"} · Due {fmtDate(r.dueDate)}</p><Status>{r.result||"Pending"}</Status></div><div className="quick-actions"><button onClick={()=>setSelected(r.id)}>Inspect</button>{canCreate&&["Fail","Requires attention"].includes(r.result)&&<button onClick={()=>startWorkOrder(r,"inspection")}>Create corrective work order</button>}</div></article>)}</div>
    {error&&<p role="alert">{error}</p>}
  </div>;
  const inventoryView=()=> {
    const low=rows.filter(r=>Number(r.quantity)<=Number(r.reorder||0));
    return <div><div className="customer-page-intro"><div><span className="eyebrow">PARTS & STORES</span><h2>Inventory and stock</h2><p>Stock movements and allocating parts against maintenance jobs.</p></div>{canCreate&&<button className="action-primary" onClick={()=>setCreating(true)}><Plus size={16}/> Add stock item</button>}</div>
    <div className="customer-metrics">{summary("Stock items",rows.length)}{summary("Low stock",low.length)}{summary("Units available",rows.reduce((sum,r)=>sum+Number(r.quantity||0),0))}</div>
    <label className="people-search">Find part or enter scanned code<input aria-label="Search stock or barcode" value={scanned} onChange={e=>setScanned(e.target.value)} placeholder="SKU or item name"/></label>
    <div className="inventory-table"><div className="table-wrap"><table><thead><tr><th>Part / SKU</th><th>Location</th><th>Available</th><th>Reorder at</th><th>Actions</th></tr></thead><tbody>{rows.filter(r=>[r.title,r.sku].join(" ").toLowerCase().includes(scanned.toLowerCase())).map(r=><tr key={r.id}><th>{r.title}<small className="cell-subtitle">{r.sku||"No SKU"}</small></th><td>{r.location||"—"}</td><td><strong className={Number(r.quantity)<=Number(r.reorder||0)?"task-overdue":""}>{Number(r.quantity||0)}</strong></td><td>{r.reorder||"0"}</td><td><button onClick={()=>setSelected(r.id)}>Stock movement</button></td></tr>)}</tbody></table></div></div>
    <p className="module-disclaimer">Enter a sample barcode or SKU to find stock. Device-camera barcode scanning is not connected.</p>
  </div>;
  };
  const details=r=><div className="asset-detail-content"><h3>{r.title}</h3><p>{r.detail||r.fault}</p>
    {type==="assets"&&<><div className="detail-data-grid"><div><small>Asset ID</small><strong>{assetId(r)}</strong></div><div><small>Location</small><strong>{r.location||"—"}</strong></div><div><small>Custodian</small><strong>{r.custodian||"Not assigned"}</strong></div><div><small>Warranty until</small><strong>{fmtDate(r.warrantyUntil)}</strong></div></div>
      <label>Condition<select aria-label="Asset condition" disabled={!canEdit} value={r.condition||"Good"} onChange={e=>update(r,{condition:e.target.value})}>{conditions.map(x=><option key={x}>{x}</option>)}</select></label>
      {canEdit&&<div className="form-pair"><label>Location<input aria-label="Asset location" value={r.location||""} onChange={e=>update(r,{location:e.target.value})}/></label><StaffSelect people={staff} label="Asset custodian" name="custodian" value={r.custodian||""} onChange={e=>update(r,{custodian:e.target.value,custodianId:staff.find(p=>p.title===e.target.value)?.id||""})}/></div>}
      <h3>Related work & inspections</h3>{related(r).map(x=><div className="ticket" key={x.id}><span>{x.title} · {x.module}</span><button onClick={()=>onNavigate(x.module,{recordId:x.id})}>Open</button></div>)}
      {canCreate&&firstModuleOfType(org,"maintenance")&&<button className="action-primary" onClick={()=>startWorkOrder(r,"asset")}><Wrench size={15}/> Create work order for this asset</button>}
      <p className="module-disclaimer">Asset reference: {r.id}. This can be used to connect demo records; external camera QR scanning is not yet implemented.</p></>}
    {type==="maintenance"&&<><div className="detail-data-grid"><div><small>Asset</small><strong>{r.asset||"Not linked"}</strong></div><div><small>Severity</small><strong>{r.severity||"Medium"}</strong></div><div><small>Engineer</small><strong>{r.owner||"Unassigned"}</strong></div><div><small>Due</small><strong>{fmtDate(r.dueDate)}</strong></div></div>
      <label>Job status<select aria-label="Work order status" disabled={!canEdit} value={r.status||"Planned"} onChange={e=>update(r,{status:e.target.value})}>{states.map(x=><option key={x}>{x}</option>)}</select></label>
      <QualifiedStaffSelect records={records} orgId={org.id} kind="maintenance" date={r.dueDate} excludedRecordId={r.id} name="engineer" label="Assigned engineer" disabled={!canEdit} value={r.owner||""} onChange={e=>{const name=e.target.value;const result=validateAssignee(records,org.id,name,{kind:"maintenance",date:r.dueDate,excludedRecordId:r.id});if(result.eligible)update(r,{owner:name,engineerId:staff.find(p=>p.title===name)?.id||""});}}/>
      {r.assetRefId&&<button onClick={()=>{const a=assets.find(a=>a.id===r.assetRefId);if(a)onNavigate(a.module,{recordId:a.id});}}>Open linked asset</button>}
      {r.sourceInspectionId&&<button onClick={()=>{const i=inspections.find(i=>i.id===r.sourceInspectionId);if(i)onNavigate(i.module,{recordId:i.id});}}>Open source inspection</button>}
      <h3>Job checklist</h3>{(r.checklist||[]).map((item,i)=><label key={i} className="task-check"><input type="checkbox" disabled={!canEdit} checked={Boolean(item.done)} onChange={e=>update(r,{checklist:r.checklist.map((x,j)=>j===i?{...x,done:e.target.checked}:x)})}/>{item.text}</label>)}
      {canEdit&&<form onSubmit={e=>{e.preventDefault();const value=new FormData(e.currentTarget).get("task").trim();if(value){update(r,{checklist:[...(r.checklist||[]),{text:value,done:false}]});e.currentTarget.reset();}}}><label>Add work step<input name="task" maxLength={120} required/></label><button>Add step</button></form>}
      <h3>Labour & parts</h3><p>{(r.workLogs||[]).reduce((sum,log)=>sum+Number(log.minutes||0),0)} minutes recorded · {(r.partsUsed||[]).length} stock allocations</p>
      {(r.partsUsed||[]).map((part,i)=><p className="task-note" key={i}>{part.name}: {part.qty} units</p>)}
      {canEdit&&<form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);const mins=Number(f.get("minutes"));if(mins>0&&mins<=1440){update(r,{workLogs:[...(r.workLogs||[]),{minutes:mins,note:String(f.get("note")||"").trim()}]});e.currentTarget.reset();}}}><div className="form-pair"><label>Labour minutes<input type="number" min="1" max="1440" name="minutes" required/></label><label>Work notes<input name="note" maxLength={100}/></label></div><button>Log labour</button></form>}
      <h3>Supervisor review</h3><label>Review status<select disabled={!canApprove} value={r.review||"Pending"} onChange={e=>update(r,{review:e.target.value})}>{["Pending","Approved","Requires changes"].map(x=><option key={x}>{x}</option>)}</select></label></>}
    {type==="inspections"&&<><QualifiedStaffSelect records={records} orgId={org.id} kind="inspections" date={r.dueDate} excludedRecordId={r.id} label="Inspector" name="inspector" value={r.inspector||""} disabled={!canEdit} onChange={e=>{const name=e.target.value;const result=validateAssignee(records,org.id,name,{kind:"inspections",date:r.dueDate,excludedRecordId:r.id});if(result.eligible)update(r,{inspector:name,inspectorId:staff.find(p=>p.title===name)?.id||""});}}/><label>Inspection result<select aria-label="Inspection result" disabled={!canEdit} value={r.result||"Pending"} onChange={e=>update(r,{result:e.target.value,status:e.target.value==="Pass"?"Complete":"In progress"})}>{results.map(x=><option key={x}>{x}</option>)}</select></label>
      <h3>Inspection steps</h3>{(r.checklist||[]).map((item,i)=><label className="task-check" key={i}><input type="checkbox" disabled={!canEdit} checked={Boolean(item.done)} onChange={e=>update(r,{checklist:r.checklist.map((x,j)=>i===j?{...x,done:e.target.checked}:x)})}/>{item.text}</label>)}
      {canEdit&&<form onSubmit={e=>{e.preventDefault();const value=new FormData(e.currentTarget).get("step").trim();if(value){update(r,{checklist:[...(r.checklist||[]),{text:value,done:false}]});e.currentTarget.reset();}}}><label>Add inspection check<input name="step" required maxLength={120}/></label><button>Add check</button></form>}
      <label>Findings<textarea aria-label="Inspection findings" disabled={!canEdit} value={r.findings||""} onChange={e=>update(r,{findings:e.target.value})}/></label>
      <h3>Corrective actions</h3>{workOrders.filter(x=>x.sourceInspectionId===r.id).map(x=><div className="ticket" key={x.id}><span>{x.title} · {x.status}</span><button onClick={()=>onNavigate(x.module,{recordId:x.id})}>Open job</button></div>)}
      {canCreate&&["Fail","Requires attention"].includes(r.result)&&<button className="action-primary" onClick={()=>startWorkOrder(r,"inspection")}>Create corrective work order</button>}
      {error&&<p role="alert">{error}</p>}</>}
    {type==="inventory"&&<><p>Available: <strong>{r.quantity||0} units</strong> · Reorder at {r.reorder||0}</p>
      {canEdit&&<form onSubmit={e=>{e.preventDefault();setError("");const f=new FormData(e.currentTarget),qty=Number(f.get("quantity")),mode=String(f.get("mode")),current=Number(r.quantity||0);if(!Number.isInteger(qty)||qty<=0){setError("Enter a positive whole number.");return;}if(mode!=="Receive"&&qty>current){setError("Not enough sample stock available.");return;}
        const next=current+(mode==="Receive"?qty:-qty);
        const order=mode==="Allocate"?workOrders.find(w=>w.id===targetOrder):null;
        if(mode==="Allocate"&&!order){setError("Choose a work order for allocation.");return;}
        const movement={mode,qty,at:new Date().toLocaleString("en-GB"),orderId:order?.id||""};
        update(r,{quantity:String(next),movements:[...(r.movements||[]),movement]});
        if(order)update(order,{partsUsed:[...(order.partsUsed||[]),{name:r.title,sku:r.sku,qty,stockId:r.id}]});
        e.currentTarget.reset();}}>
        <label>Stock operation<select name="mode" defaultValue="Receive" onChange={e=>setTargetAsset(e.target.value)}>{["Receive","Issue","Allocate"].map(x=><option key={x}>{x}</option>)}</select></label>
        {targetAsset==="Allocate"&&<label>Work order<select aria-label="Allocate to work order" value={targetOrder} onChange={e=>setTargetOrder(e.target.value)}><option value="">Select work order</option>{workOrders.map(w=><option key={w.id} value={w.id}>{w.title}</option>)}</select></label>}
        <label>Quantity<input type="number" name="quantity" min="1" step="1" required/></label><button type="submit">Record stock movement</button>
      </form>}
      {error&&<p role="alert">{error}</p>}
      <h3>Movement history</h3>{(r.movements||[]).map((m,i)=><p key={i} className="task-note">{m.mode} {m.qty} · {m.at} {m.orderId?"· Work order linked":""}</p>)}</>}
  </div>;
  return <div className="asset-operations">
    {type==="assets"?assetsView():type==="maintenance"?maintenanceView():type==="inspections"?inspectionView():inventoryView()}
    {creating&&<Modal title={type==="assets"?"Register a sample asset":type==="maintenance"?"Raise sample work order":type==="inspections"?"Create sample inspection":"Add sample stock item"} onClose={()=>setCreating(false)}>
      <form className="customer-form" onSubmit={create}>{error&&<p role="alert">{error}</p>}
        <label>Record title<input name="title" required maxLength={100} autoFocus/></label>
        <label>Description<textarea name="detail" maxLength={400}/></label>
        {type==="assets"&&<><label>Asset reference<input name="asset" maxLength={60} placeholder="EQ-103"/></label><label>Location<input name="location" maxLength={80}/></label><StaffSelect people={staff} label="Custodian" name="custodian"/><label>Warranty until<input type="date" name="warrantyUntil"/></label><label>Condition<select name="condition">{conditions.map(x=><option key={x}>{x}</option>)}</select></label></>}
        {["maintenance","inspections"].includes(type)&&<><label>Asset<select name="assetRefId" onChange={e=>setTargetAsset(e.target.value)}><option value="">Unlinked / general</option>{assets.map(a=><option key={a.id} value={a.id}>{assetId(a)}</option>)}</select></label>
          {type==="maintenance"?<><QualifiedStaffSelect records={records} orgId={org.id} kind="maintenance" date={assignmentDate} label="Assigned engineer" name="owner"/><label>Work required<textarea name="fault" maxLength={350}/></label><label>Severity<select name="severity">{Severity.map(x=><option key={x}>{x}</option>)}</select></label></>:<><QualifiedStaffSelect records={records} orgId={org.id} kind="inspections" date={assignmentDate} label="Inspector" name="inspector"/><label>Result<select name="result">{results.map(x=><option key={x}>{x}</option>)}</select></label></>}
          <label>Checklist steps (one per line)<textarea name="checklist" maxLength={1000}/></label><label>Due date<input type="date" name="dueDate" value={assignmentDate} onChange={e=>setAssignmentDate(e.target.value)}/></label></>}
        {type==="inventory"&&<><label>SKU<input name="sku" required maxLength={40}/></label><label>Opening quantity<input name="quantity" type="number" min="0" step="1" required/></label><label>Reorder threshold<input name="reorder" type="number" min="0" step="1"/></label><label>Store location<input name="location" maxLength={80}/></label></>}
        <button className="action-primary" type="submit">Save sample {type==="assets"?"asset":type==="maintenance"?"work order":type==="inspections"?"inspection":"item"}</button></form></Modal>}
    {current&&<Modal title={type==="assets"?"Asset quick actions":type==="maintenance"?"Work order detail":type==="inspections"?"Inspection detail":"Stock management"} onClose={()=>{setSelected(null);setError("");}}>{details(current)}</Modal>}
  </div>;
}
