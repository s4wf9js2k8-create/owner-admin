import React, { useState } from 'react';
import { Empty, Modal, Status } from './components';
import { moduleInfo, isTaskModule } from './customerModules';
import { teamMembers } from './LinkedSelectors';

const today = () => new Date().toISOString().slice(0, 10);
const timestamp = value => value ? new Date(value).toLocaleString('en-GB') : '';
export default function DailyOperations({org,module,records,onAdd,onUpdate,onNavigate,canCreate,canEdit,canApprove}) {
  const [date,setDate] = useState(today());
  const [creating,setCreating] = useState(false);
  const [selected,setSelected] = useState(null);
  const [notice,setNotice] = useState('');
  const [busy,setBusy] = useState(false);
  const people = teamMembers(records,org.id);
  const [operator,setOperator] = useState(people[0]?.id || '');
  const person = people.find(p=>p.id===operator);
  const all = records.filter(r=>r.orgId===org.id);
  const rows = all.filter(r=>r.module===module);
  const checks = rows.filter(r=>r.recordType!=='handover' && (r.operationDate || today())===date);
  const handovers = rows.filter(r=>r.recordType==='handover'&&r.operationDate===date);
  const current = rows.find(r=>r.id===selected);
  const type = r=>moduleInfo(r.module).type;
  const staffName = id=>people.find(p=>p.id===id)?.title || 'Staff profile unavailable';
  const go = r=>onNavigate(isTaskModule(r.module)?'Tasks & projects':r.module,{recordId:r.id});
  const onSite = all.filter(r=>type(r)==='timesheets'&&r.startTime?.slice(0,10)<=date&&(!r.endTime||r.endTime.slice(0,10)>date));
  const shifts = all.filter(r=>type(r)==='schedule'&&r.startTime?.slice(0,10)===date&&r.status!=='Cancelled');
  const work = all.filter(r=>['maintenance','projects','inspections'].includes(type(r))&&r.status!=='Complete'&&(r.dueDate<=date||r.priority==='High'||r.severity==='Critical'));
  const activities = all.filter(r=>['events','bookings'].includes(type(r))&&r.recordType!=='booking'&&r.startTime?.slice(0,10)===date&&r.status!=='Cancelled');
  const change = (r,patch)=>onUpdate(org.id,r.id,patch);
  const complete = async(r,done)=>{
    if(!person){setNotice('Select the staff member recording this activity.');return;}
    await change(r,{status:done?'Complete':'Planned',completedAt:done?new Date().toISOString():'',completedById:done?person.id:'',approval:'Pending',approvedById:''});
  };
  const createCheck = async e=>{
    e.preventDefault();const form=e.currentTarget,f=Object.fromEntries(new FormData(form));
    if(!f.title.trim()||!people.some(p=>p.id===f.ownerId)){setNotice('Enter a check and select existing staff.');return;}
    setBusy(true);
    const saved=await onAdd({orgId:org.id,module,title:f.title.trim(),detail:f.detail.trim(),recordType:'operational-check',operationDate:date,checkType:f.checkType,ownerId:f.ownerId,owner:staffName(f.ownerId),status:'Planned',approval:'Pending',handover:[]});
    setBusy(false);if(saved)setCreating(false);
  };
  const addHandover = async(e,source)=>{
    e.preventDefault();if(!person){setNotice('Select the staff member recording this activity.');return;}
    const form=e.currentTarget,f=Object.fromEntries(new FormData(form)),note=String(f.note||'').trim();
    if(!note)return;
    setBusy(true);
    const entry={note,at:new Date().toISOString(),authorId:person.id,category:f.category||'Handover',recordId:f.recordId||'',acknowledgements:[]};
    const ok=source?await change(source,{handover:[...(source.handover||[]),entry]}):await onAdd({orgId:org.id,module,recordType:'handover',title:note.slice(0,100),detail:note,operationDate:date,status:'Planned',...entry});
    setBusy(false);if(ok)form.reset();
  };
  const noteForm = source=><form onSubmit={e=>addHandover(e,source)} className="customer-form"><label>Handover note<textarea name="note" required maxLength={1000}/></label><div className="form-pair"><label>Category<select name="category">{['Handover','Outstanding issue','Announcement','Equipment problem'].map(x=><option key={x}>{x}</option>)}</select></label><label>Related operational record<select name="recordId"><option value="">General handover</option>{all.filter(r=>['maintenance','projects','assets','schedule'].includes(type(r))).map(r=><option key={r.id} value={r.id}>{r.title}</option>)}</select></label></div><p>Recorded by {person?.title||'select staff above'}</p><button disabled={busy}>Add handover note</button></form>;
  const noteView = (note,index,source)=>{
    const linked=all.find(r=>r.id===note.recordId),acks=note.acknowledgements||[];
    return <article className="handover-entry" key={note.id||index}><small>{note.category||'Handover'} · {timestamp(note.at)} · {note.authorId?staffName(note.authorId):'Legacy author not recorded'}</small><p>{note.note}</p>{linked&&<button onClick={()=>go(linked)}>Open {linked.title}</button>}<p>{acks.length?acks.map(a=>staffName(a.personId)).join(', ')+' acknowledged':'Awaiting acknowledgement'}</p>{canEdit&&person&&!acks.some(a=>a.personId===person.id)&&<button onClick={()=>{const next=[...acks,{personId:person.id,at:new Date().toISOString()}];return source?change(source,{handover:source.handover.map((n,i)=>i===index?{...n,acknowledgements:next}:n)}):change(note,{acknowledgements:next});}}>Acknowledge handover</button>}</article>;
  };
  const recordList=(items,empty)=>items.length?items.slice(0,8).map(r=><button key={r.id} className="profile-linked-row" onClick={()=>go(r)}><span><strong>{r.personId?staffName(r.personId):r.person||r.title}</strong><small>{r.startTime?.slice(11)||r.dueDate||''} · {r.location||r.module}</small></span><Status>{r.result||r.status}</Status><span>→</span></button>):<Empty>{empty}</Empty>;
  return <div className="daily-operations-board">
    <div className="ops-banner"><div><span className="eyebrow">DAILY OPERATIONS</span><h2>Operations desk</h2><p>Opening, delivery, closing and the next shift's handover.</p></div><label>Operational date<input type="date" value={date} required onChange={e=>{if(e.target.value)setDate(e.target.value);}}/></label></div>
    <div className="operations-toolbar"><label>Recording as<select aria-label="Recording as" value={operator} onChange={e=>setOperator(e.target.value)}><option value="">Select staff</option>{people.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>{canCreate&&<button className="action-primary" onClick={()=>setCreating(true)}>Add daily check</button>}</div>
    {notice&&<p role="alert">{notice}</p>}
    <div className="daily-overview"><section><h3>Staff currently working</h3>{recordList(onSite,'No open attendance sessions.')}</section><section><h3>Expected staff</h3>{recordList(shifts,'No shifts scheduled for this date.')}</section><section><h3>Scheduled activities & appointments</h3>{recordList(activities,'No scheduled activities.')}</section><section><h3>Operational alerts & important work</h3>{recordList(work,'No outstanding priority work.')}</section></div>
    <div className="daily-check-columns">{['Opening','Closing'].map(kind=>{
      const items=checks.filter(r=>(r.checkType||(r.title.toLowerCase().includes('clos')?'Closing':'Opening'))===kind);
      return <section key={kind}><header><h3>{kind} checklist</h3><span>{items.filter(r=>r.status==='Complete').length}/{items.length} complete</span></header><div className="daily-check-list">{items.map(r=><article className="daily-check" key={r.id}><label><input type="checkbox" disabled={!canEdit||busy} checked={r.status==='Complete'} onChange={e=>complete(r,e.target.checked)}/><span><strong>{r.title}</strong><small>{r.ownerId?staffName(r.ownerId):r.owner||'Unassigned'}</small><small>{r.completedAt?timestamp(r.completedAt)+' · '+staffName(r.completedById):'Outstanding'}</small></span></label><div><button onClick={()=>setSelected(r.id)}>Handover notes</button>{canApprove&&r.status==='Complete'&&r.approval!=='Approved'&&<button disabled={!person} onClick={()=>change(r,{approval:'Approved',approvedById:person.id,approvedAt:new Date().toISOString()})}>Approve check</button>}<Status>{r.approval||'Pending'}</Status></div></article>)}</div>{!items.length&&<Empty>No {kind.toLowerCase()} checks for this date.</Empty>}</section>;
    })}</div>
    <section className="shift-handover"><h3>Shift handover</h3>{canCreate&&noteForm(null)}{handovers.map((n,i)=>noteView(n,i,null))}{!handovers.length&&<Empty>No shift handover recorded for this date.</Empty>}</section>
    <details className="ops-tools"><summary>Previous checklist history</summary>{rows.filter(r=>r.recordType!=='handover'&&r.completedAt).map(r=><div className="task-note" key={r.id}><strong>{r.title}</strong> · {r.operationDate||today()} · {timestamp(r.completedAt)} · {staffName(r.completedById)} · {r.approval||'Pending'}</div>)}</details>
    {creating&&<Modal title="Add operational check" onClose={()=>setCreating(false)}><form className="customer-form" onSubmit={createCheck}><label>Check title<input name="title" required maxLength={100}/></label><label>Checklist<select name="checkType"><option>Opening</option><option>Closing</option></select></label><label>Assigned staff<select name="ownerId" aria-label="Assigned staff" required><option value="">Choose staff</option>{people.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label><label>Instructions<textarea name="detail" maxLength={500}/></label><button disabled={busy}>Save daily check</button></form></Modal>}
    {current&&<Modal title="Operational check & handover" onClose={()=>setSelected(null)}><h3>{current.title}</h3><p>{current.detail}</p><p>Completed by: {current.completedById?staffName(current.completedById):'Outstanding'} · {timestamp(current.completedAt)}</p>{canCreate&&noteForm(current)}{(current.handover||[]).map((n,i)=>noteView(n,i,current))}</Modal>}
    <p className="module-disclaimer">Temporary fictional operations. Clock-ins do not verify physical presence; approvals are demonstration decisions.</p>
  </div>;
}
