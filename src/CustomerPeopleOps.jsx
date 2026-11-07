import React, { useEffect, useState } from "react";
import { Empty, Modal, Status } from "./components";
import { Clock3, Plus, ArrowLeft, ArrowRight, AlertTriangle } from "lucide-react";
import { moduleInfo, isTaskModule } from "./customerModules";
import {QualifiedStaffSelect} from "./LinkedSelectors";
import {validateAssignee} from "./staffEligibility";

const day=v=>v?.slice(0,10)||"";
const today=()=>new Date().toISOString().slice(0,10);
const date=v=>v?new Date(day(v)+"T12:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short"}):"—";
const minutes=(start,end)=>start&&end?Math.max(0,Math.round((new Date(end)-new Date(start))/60000)):0;
const weekStart=v=>{const d=new Date(day(v)+"T12:00:00");d.setDate(d.getDate()-(d.getDay()+6)%7);return d.toISOString().slice(0,10);};
const weekDays=v=>Array.from({length:7},(_,i)=>{const d=new Date(v+"T12:00:00");d.setDate(d.getDate()+i);return d.toISOString().slice(0,10);});
const shiftEndValid=(start,end)=>!start||!end||end>start;
const startsWithin=(d,start,end)=>d>=day(start)&&d<=day(end);
const tableDate=v=>v?String(v).replace("T"," "):"Open";
const peopleType=name=>moduleInfo(name).type==="people";
const nextDate=(base,increment)=>{const d=new Date(base+"T12:00:00");d.setDate(d.getDate()+increment);return d.toISOString().slice(0,10);};
function SectionHeading({eyebrow,title,description,children}){return <div className="customer-page-intro"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>{children}</div>;}
function Measure({title,value,desc}){return <div className="metric-tile"><span>{title}</span><strong>{value}</strong><small>{desc}</small></div>;}
export default function CustomerPeopleOps({org,module,records,onAdd,onUpdate,onNavigate,focusId,canCreate=true,canEdit=true,canApprove=true}) {
  const type=moduleInfo(module).type;
  const [selected,setSelected]=useState(null),[creating,setCreating]=useState(false);
  const [query,setQuery]=useState(""),[error,setError]=useState("");
  const [week,setWeek]=useState(weekStart(today()));
  const [shiftStart,setShiftStart]=useState("");
  const [shiftEnd,setShiftEnd]=useState("");
  const list=records.filter(r=>r.orgId===org.id&&r.module===module);
  const people=records.filter(r=>r.orgId===org.id&&peopleType(r.module));
  const rotas=records.filter(r=>r.orgId===org.id&&moduleInfo(r.module).type==="schedule");
  const leaves=records.filter(r=>r.orgId===org.id&&moduleInfo(r.module).type==="leave");
  const timesheets=records.filter(r=>r.orgId===org.id&&moduleInfo(r.module).type==="timesheets");
  const training=records.filter(r=>r.orgId===org.id&&moduleInfo(r.module).type==="training");
  const actorNames=[...new Set([...people.map(p=>p.title),...list.map(r=>r.person)].filter(Boolean))].sort();
  const [clockPerson,setClockPerson]=useState("");
  useEffect(()=>{if(focusId)setSelected(focusId);},[focusId]);
  const active=list.find(r=>r.id===selected);
  const update=(r,patch)=>onUpdate(org.id,r.id,patch);
  const filtered=list.filter(r=>[r.title,r.person,r.team,r.role,r.detail,r.qualification].join(" ").toLowerCase().includes(query.toLowerCase()));
  const created=async e=>{
    e.preventDefault();setError("");
    const values=Object.fromEntries(new FormData(e.currentTarget));
    const title=String(values.title||values.person||"").trim();
    if(!title){setError("Enter a name or title.");return;}
    if(!shiftEndValid(values.startTime,values.endTime)){setError("End must come after start.");return;}
    if(values.startDate&&values.endDate&&values.endDate<values.startDate){setError("Leave end date must not be before its start.");return;}
    if(type==="schedule"){
      const result=validateAssignee(records,org.id,values.person,{kind:"schedule",date:values.startTime,startTime:values.startTime,endTime:values.endTime});
      if(!values.person||!result.eligible){setError("Shift assignment rejected: "+(result.reasons||["Select a team member"]).join("; "));return;}
    }
    const saved=await onAdd({orgId:org.id,module,title,detail:String(values.detail||"").trim(),status:"Planned",
      person:String(values.person||"").trim(),personId:people.find(p=>p.title===values.person)?.id||"",role:String(values.role||"").trim(),team:String(values.team||"").trim(),
      contact:String(values.contact||"").trim(),startTime:values.startTime||"",endTime:values.endTime||"",
      startDate:values.startDate||"",endDate:values.endDate||"",location:values.location||"",
      qualification:values.qualification||"",expiry:values.expiry||"",approval:"Pending",swapRequested:false});
    if(saved){setCreating(false);setClockPerson("");}
  };
  const approve=(r,value)=>update(r,{approval:value});
  const peoplePage=()=> <div>
    <SectionHeading eyebrow="PEOPLE DIRECTORY" title="Staff & volunteers" description="Staff profiles, roles, teams and connected qualifications.">
      {canCreate&&<button className="action-primary" onClick={()=>setCreating(true)}><Plus size={16}/> Add person</button>}
    </SectionHeading>
    <div className="customer-metrics"><Measure title="People" value={list.length} desc="Sample directory"/><Measure title="Teams" value={new Set(list.map(r=>r.team).filter(Boolean)).size} desc="Departments & groups"/><Measure title="Qualifications" value={training.length} desc="Linked training records"/></div>
    <label className="people-search">Search people<input value={query} onChange={e=>setQuery(e.target.value)} aria-label="Search people" placeholder="Name, team or role"/></label>
    <div className="people-profile-grid">{filtered.map(p=>{
      const trained=training.filter(t=>t.person===p.title),assigned=records.filter(r=>r.orgId===org.id&&isTaskModule(r.module)&&r.owner===p.title);
      return <article className="people-profile" key={p.id}><div className="people-avatar">{p.title.slice(0,1)}</div><div><h3>{p.title}</h3><p>{p.role||p.detail||"Member"}</p><small>{p.team||"No assigned team"}</small></div>
        <div className="people-profile-stats"><span>{assigned.length} assigned tasks</span><span>{trained.length} qualifications</span></div>
        <button onClick={()=>setSelected(p.id)}>Open profile</button></article>;
    })}</div>{!filtered.length&&<Empty>No matching people.</Empty>}</div>;
  const clockIn=async()=>{
    const person=clockPerson||actorNames[0];
    if(!person){setError("Choose a sample person to clock in.");return;}
    if(timesheets.some(r=>r.person===person&&r.startTime&&!r.endTime)){setError("This person already has an open clock-in.");return;}
    setError("");
    await onAdd({orgId:org.id,module,title:person+" · Sample session",detail:"Manual in-app clock-in",person,
      startTime:new Date().toISOString().slice(0,16),endTime:"",status:"In progress",approval:"Pending"});
  };
  const timesheetPage=()=>{
    const open=list.filter(r=>r.startTime&&!r.endTime);
    const approved=list.filter(r=>r.approval==="Approved");
    const totals=[...new Set(list.map(r=>r.person).filter(Boolean))].map(person=>{
      const sessions=list.filter(r=>r.person===person),mins=sessions.reduce((sum,r)=>sum+minutes(r.startTime,r.endTime),0);
      return {person,sessions:sessions.length,hours:(mins/60).toFixed(2),pending:sessions.filter(r=>r.approval==="Pending").length};
    });
    return <div><SectionHeading eyebrow="TIME & ATTENDANCE" title="Attendance & timesheets" description="Open clock-ins, reviewed sessions, corrections and sample hours.">
      {canCreate&&<button className="action-primary" onClick={()=>setCreating(true)}><Plus size={16}/> Manual session</button>}</SectionHeading>
      <div className="customer-metrics"><Measure title="Open clock-ins" value={open.length} desc="No recorded clock-out"/><Measure title="Completed sessions" value={list.filter(r=>r.startTime&&r.endTime).length} desc="Sample time entries"/><Measure title="Approved" value={approved.length} desc="Manager-reviewed sessions"/></div>
      {canCreate&&<div className="people-clock"><label>Team member<select aria-label="Clock-in team member" value={clockPerson||actorNames[0]||""} onChange={e=>setClockPerson(e.target.value)}>{actorNames.map(x=><option key={x}>{x}</option>)}</select></label><button onClick={clockIn}><Clock3 size={16}/> Clock in</button><small>Open a sample shift, then clock out to calculate worked hours.</small></div>}
      {error&&<p role="alert">{error}</p>}
      <h3 className="section-title">Open clock-ins</h3><div className="people-time-list">
        {open.length?open.map(r=><article key={r.id}><div><strong>{r.person||r.title}</strong><small>Started {tableDate(r.startTime)}</small></div>{canEdit&&<button onClick={()=>update(r,{endTime:new Date().toISOString().slice(0,16),status:"Complete"})}>Clock out</button>}</article>):<Empty>All sample sessions have a clock-out.</Empty>}
      </div>
      <h3 className="section-title">Weekly review by person</h3><div className="table-wrap"><table><thead><tr><th>Person</th><th>Sessions</th><th>Recorded hours</th><th>Pending review</th></tr></thead><tbody>{totals.map(t=><tr key={t.person}><th>{t.person}</th><td>{t.sessions}</td><td>{t.hours} h</td><td>{t.pending}</td></tr>)}</tbody></table></div>
      <h3 className="section-title">Sessions requiring review</h3><div className="people-time-list">{filtered.map(r=><article key={r.id}><div><strong>{r.person||r.title}</strong><small>{tableDate(r.startTime)} – {tableDate(r.endTime)} · {(minutes(r.startTime,r.endTime)/60).toFixed(2)}h · {r.approval||"Pending"}</small></div>
        <div className="quick-actions">{canApprove&&r.endTime&&r.approval!=="Approved"&&<button onClick={()=>approve(r,"Approved")}>Approve</button>}<button onClick={()=>setSelected(r.id)}>Review / correct</button></div></article>)}</div>
      <p className="module-disclaimer">Clock-in actions and approvals are temporary demonstration records. They are not verified workplace attendance or payroll.</p>
    </div>;
  };
  const rotaPage=()=>{
    const dates=weekDays(week);
    const leaveOn=(person,when)=>leaves.some(r=>r.person===person&&r.approval==="Approved"&&startsWithin(when,r.startDate,r.endDate));
    const conflicts=r=>rotas.some(other=>other.id!==r.id&&other.person===r.person&&other.startTime&&other.endTime&&r.startTime&&r.endTime&&other.startTime<r.endTime&&r.startTime<other.endTime);
    const weekRows=filtered.filter(r=>r.startTime&&day(r.startTime)>=week&&day(r.startTime)<=dates[6]);
    return <div><SectionHeading eyebrow="SHIFT PLANNING" title="Shift rotas" description="Weekly staff assignments, coverage and leave conflicts.">
      {canCreate&&<button className="action-primary" onClick={()=>setCreating(true)}><Plus size={16}/> Add shift</button>}</SectionHeading>
      <div className="rota-header"><button onClick={()=>setWeek(nextDate(week,-7))} aria-label="Previous rota week"><ArrowLeft size={16}/></button><strong>Week beginning {date(week)}</strong><button onClick={()=>setWeek(nextDate(week,7))} aria-label="Next rota week"><ArrowRight size={16}/></button></div>
      <div className="rota-week">{dates.map(d=>{
        const shifts=weekRows.filter(r=>day(r.startTime)===d);
        return <section key={d} className="rota-day"><h3>{new Date(d+"T12:00:00").toLocaleDateString("en-GB",{weekday:"short",day:"numeric"})}<span>{shifts.length} shifts</span></h3>
          {shifts.map(r=><article key={r.id} className={leaveOn(r.person,d)||conflicts(r)?"rota-conflict":""}><strong>{r.person||r.owner||r.title}</strong><small>{r.startTime.slice(11)} – {r.endTime?.slice(11)||"Open"}</small><small>{r.location||"Location not set"}</small>
            {(leaveOn(r.person,d)||conflicts(r))&&<span className="rota-warning"><AlertTriangle size={12}/> Staffing conflict</span>}
            {r.swapRequested&&<span className="rota-warning">Swap requested</span>}
            <button onClick={()=>setSelected(r.id)}>Manage</button></article>)}
          {!shifts.length&&<small className="rota-empty">Unstaffed</small>}</section>;
      })}</div>
      <p className="module-disclaimer">Availability and overlap conflicts use current sample leave and shift records; drag-and-drop shift moves are not enabled yet.</p>
    </div>;
  };
  const leavePage=()=> {
    const pending=list.filter(r=>r.approval==="Pending");
    const conflicts=r=>rotas.filter(s=>s.person===r.person&&day(s.startTime)>=r.startDate&&day(s.startTime)<=r.endDate);
    return <div><SectionHeading eyebrow="AVAILABILITY & REQUESTS" title="Leave & availability" description="Review leave requests alongside scheduled shifts.">
      {canCreate&&<button className="action-primary" onClick={()=>setCreating(true)}><Plus size={16}/> Request leave</button>}</SectionHeading>
      <div className="customer-metrics"><Measure title="Requests" value={list.length} desc="Total submitted"/><Measure title="Pending" value={pending.length} desc="Require a decision"/><Measure title="Approved" value={list.filter(r=>r.approval==="Approved").length} desc="Recorded in the team calendar"/></div>
      <div className="leave-list">{filtered.map(r=><article key={r.id}><div><h3>{r.person||r.title}</h3><p>{date(r.startDate)} – {date(r.endDate)} · <Status>{r.approval||"Pending"}</Status></p><small>{r.detail}</small>{conflicts(r).length>0&&<div className="rota-warning"><AlertTriangle size={14}/> {conflicts(r).length} scheduled shifts overlap this request.</div>}</div><div className="quick-actions">{canApprove&&r.approval==="Pending"&&<><button onClick={()=>approve(r,"Approved")}>Approve</button><button onClick={()=>approve(r,"Rejected")}>Reject</button></>}<button onClick={()=>setSelected(r.id)}>Details</button></div></article>)}</div>
      </div>;
  };
  const trainingPage=()=> {
    const missing=people.filter(p=>!list.some(r=>r.person===p.title));
    const expiring=list.filter(r=>r.expiry&&r.expiry<=nextDate(today(),45));
    return <div><SectionHeading eyebrow="COMPETENCY MANAGEMENT" title="Training & qualifications" description="Team certificates, renewal dates and competency coverage.">
      {canCreate&&<button className="action-primary" onClick={()=>setCreating(true)}><Plus size={16}/> Record qualification</button>}</SectionHeading>
      <div className="customer-metrics"><Measure title="Qualifications" value={list.length} desc="Example records"/><Measure title="Expiring soon" value={expiring.length} desc="Within 45 days"/><Measure title="No qualifications" value={missing.length} desc="Profiles without a linked record"/></div>
      <div className="table-wrap"><table><thead><tr><th>Staff member</th><th>Qualification</th><th>Renewal date</th><th>Progress</th></tr></thead><tbody>{filtered.map(r=><tr key={r.id}><th>{r.person||r.title}</th><td>{r.qualification||r.detail}</td><td>{date(r.expiry)}</td><td><button onClick={()=>setSelected(r.id)}>Open</button></td></tr>)}</tbody></table></div>
      </div>;
  };
  const selectedDetails=r=><div className="people-details"><h3>{r.title}</h3><p>{r.detail}</p>
    {type==="people"?<><label>Role<input disabled={!canEdit} value={r.role||""} onChange={e=>update(r,{role:e.target.value})}/></label>
      <label>Team<input disabled={!canEdit} value={r.team||""} onChange={e=>update(r,{team:e.target.value})}/></label>
      <label>Sample contact<input disabled={!canEdit} value={r.contact||""} onChange={e=>update(r,{contact:e.target.value})}/></label>
      <h3>Related work</h3>{records.filter(x=>x.orgId===org.id&&isTaskModule(x.module)&&x.owner===r.title).map(t=><div key={t.id} className="ticket">{t.title}<button onClick={()=>onNavigate("Tasks & projects",{recordId:t.id})}>Open task</button></div>)}
      <h3>Qualifications</h3>{training.filter(t=>t.person===r.title).map(t=><p key={t.id}>{t.qualification||t.title} · {date(t.expiry)}</p>)}</>:
      <>{["person","startTime","endTime","startDate","endDate","location","qualification","expiry"].filter(key=>r[key]!==undefined).map(key=><label key={key}>{key}<input disabled={!canEdit} type={key==="startTime"||key==="endTime"?"datetime-local":key==="startDate"||key==="endDate"||key==="expiry"?"date":"text"} value={r[key]||""} onChange={e=>update(r,{[key]:e.target.value})}/></label>)}
        <label>Approval<select disabled={!canApprove} value={r.approval||"Pending"} onChange={e=>approve(r,e.target.value)}>{["Pending","Approved","Rejected"].map(x=><option key={x}>{x}</option>)}</select></label>
        {type==="schedule"&&<div className="quick-actions">{canEdit&&<button onClick={()=>update(r,{swapRequested:true})}>Request shift swap</button>}{canApprove&&r.swapRequested&&<button onClick={()=>update(r,{swapRequested:false})}>Resolve swap request</button>}</div>}</>}
    <p className="module-disclaimer">This is fictional demo information, not a live staff or payroll record.</p></div>;
  const form=()=> <Modal title={type==="people"?"Add sample person":type==="schedule"?"Add sample shift":type==="timesheets"?"Add manual time entry":type==="leave"?"Request sample leave":"Record sample training"} onClose={()=>setCreating(false)}><form className="customer-form" onSubmit={created}>
    {error&&<p role="alert">{error}</p>}
    {type==="people"?<><label>Name<input name="title" maxLength={100} required autoFocus/></label><label>Role<input name="role" maxLength={80}/></label><label>Team<input name="team" maxLength={80}/></label><label>Sample contact<input name="contact" maxLength={100}/></label><label>Profile notes<textarea name="detail" maxLength={200}/></label></>:
      <>{type==="schedule"?<QualifiedStaffSelect records={records} orgId={org.id} kind="schedule" label="Person" name="person" required startTime={shiftStart} endTime={shiftEnd} date={shiftStart}/>:<label>Person<select name="person" required><option value="">Select team member</option>{actorNames.map(x=><option key={x}>{x}</option>)}</select></label>}{""}
        {["timesheets","schedule"].includes(type)&&<><label>Start<input name="startTime" type="datetime-local" required {...(type==="schedule"?{value:shiftStart,onChange:e=>setShiftStart(e.target.value)}:{})}/></label><label>End<input name="endTime" type="datetime-local" {...(type==="schedule"?{value:shiftEnd,onChange:e=>setShiftEnd(e.target.value)}:{})}/></label></>}
        {type==="schedule"&&<label>Location<input name="location" maxLength={80}/></label>}
        {type==="leave"&&<><label>First day<input name="startDate" type="date" required/></label><label>Last day<input name="endDate" type="date" required/></label></>}
        {type==="training"&&<><label>Qualification<input name="qualification" maxLength={120} required/></label><label>Expiry<input name="expiry" type="date"/></label></>}
        <label>Notes<textarea name="detail" maxLength={200}/></label></>}
    <button type="submit" className="action-primary">Save sample {type==="people"?"person":"record"}</button>
  </form></Modal>;
  return <div className="people-operations">
    {type==="people"?peoplePage():type==="timesheets"?timesheetPage():type==="schedule"?rotaPage():type==="leave"?leavePage():trainingPage()}
    {creating&&form()}
    {active&&<Modal title={"Review "+moduleInfo(module).title.toLowerCase()} onClose={()=>setSelected(null)}>{selectedDetails(active)}</Modal>}
  </div>;
}
