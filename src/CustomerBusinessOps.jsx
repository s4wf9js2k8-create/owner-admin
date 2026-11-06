import React, { useEffect, useState } from "react";
import { Modal, Empty, Status } from "./components";
import { CalendarDays, CheckCircle2, CreditCard, HeartHandshake, Plus, UserRound, Users } from "lucide-react";
import { moduleInfo } from "./customerModules";
import { firstModuleOfType } from "./customerWorkflows";

const format=v=>v?new Date(v.slice(0,10)+"T12:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}):"Not scheduled";
const formatMoney=v=>"£"+Number(v||0).toLocaleString("en-GB",{minimumFractionDigits:2,maximumFractionDigits:2});
const stages=["Lead","Qualified","Proposal","Customer"];
const financialStatuses=["Draft","Sent (demo)","Accepted","Paid (demo)"];
const types=["Customer appointment","Room / resource","Staff meeting","Group booking"];
const moduleTitle={crm:"Customers & CRM",finance:"Quotes & invoices",events:"Events & bookings",bookings:"Bookings & appointments",donations:"Donations & fundraising"};
const lines=(input)=>String(input||"").split("\n").map(line=>line.split("|").map(x=>x.trim())).filter(parts=>parts[0]).map(([description,quantity,price])=>({description,quantity:Math.max(1,Number(quantity)||1),unitPrice:Math.max(0,Number(price)||0)}));
const amount=items=>items.reduce((total,item)=>total+(Number(item.quantity)||0)*(Number(item.unitPrice)||0),0);
function Metric({label,value,detail}){return <div className="metric-tile"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>}
export default function CustomerBusinessOps({org,module,records,onAdd,onUpdate,onNavigate,focusId,canCreate=true,canEdit=true}) {
  const type=moduleInfo(module).type;
  const [selected,setSelected]=useState(null),[creating,setCreating]=useState(false),[error,setError]=useState("");
  const [search,setSearch]=useState(""),[stage,setStage]=useState("All");
  const [ticketName,setTicketName]=useState(""),[ticketType,setTicketType]=useState("Standard");
  const [bookingDate,setBookingDate]=useState("");
  useEffect(()=>{if(focusId)setSelected(focusId);},[focusId]);
  const rows=records.filter(r=>r.orgId===org.id&&r.module===module);
  const customers=records.filter(r=>r.orgId===org.id&&moduleInfo(r.module).type==="crm");
  const finances=records.filter(r=>r.orgId===org.id&&moduleInfo(r.module).type==="finance");
  const events=records.filter(r=>r.orgId===org.id&&moduleInfo(r.module).type==="events");
  const bookings=records.filter(r=>r.orgId===org.id&&moduleInfo(r.module).type==="bookings");
  const jobs=records.filter(r=>r.orgId===org.id&&moduleInfo(r.module).type==="maintenance");
  const filtered=rows.filter(r=>[r.title,r.company,r.contact,r.person,r.location,r.detail,r.campaign,r.source].join(" ").toLowerCase().includes(search.toLowerCase())
    &&(stage==="All"||(r.stage||"Lead")===stage));
  const current=rows.find(r=>r.id===selected);
  const update=(r,patch)=>onUpdate(org.id,r.id,patch);
  const register=async e=>{
    e.preventDefault();setError("");
    const f=Object.fromEntries(new FormData(e.currentTarget));
    const title=String(f.title||"").trim();
    if(!title){setError("Please enter a title.");return;}
    if(type==="bookings"&&!f.startTime){setError("Choose an appointment time.");return;}
    if(type==="bookings"&&bookings.some(r=>r.location===f.location && r.startTime===f.startTime&&r.status!=="Complete")){setError("This location already has a booking for that time.");return;}
    const invoiceLines=lines(f.lineItems);
    const reference=String(f.reference||"").trim();
    const event=events.find(r=>r.id===f.eventRefId);
    const created=await onAdd({orgId:org.id,module,title,detail:String(f.detail||"").trim(),status:"Planned",
      owner:String(f.owner||"").trim(),contact:String(f.contact||"").trim(),company:String(f.company||"").trim(),
      stage:f.stage||"Lead",customerRefId:f.customerRefId||"",followUp:f.followUp||"",notes:[],
      documentType:f.documentType||"Quote",reference,jobRefId:f.jobRefId||"",
      lineItems:invoiceLines,amount:invoiceLines.length?amount(invoiceLines):Number(f.amount)||0,paymentStatus:"Draft",
      location:f.location||"",startTime:f.startTime||"",capacity:Number(f.capacity)||0,
      assignedTeam:f.assignedTeam||"",resources:f.resources||"",attendees:[],eventRefId:f.eventRefId||"",
      bookingType:f.bookingType||"Customer appointment",person:f.person||"",
      campaign:f.campaign||"",source:f.source||"",giftAidEligible:f.giftAidEligible==="on",
      createdAt:new Date().toISOString()});
    if(created){
      if(type==="bookings"&&event)await update(event,{attendees:[...(event.attendees||[]),{name:f.person||title,ticketType:"Appointment",checkedIn:false,status:(event.attendees||[]).filter(a=>a.status==="Confirmed").length<Number(event.capacity||0)?"Confirmed":"Waitlist"}]});
      setCreating(false);
    }
  };
  const createQuote=async customer=>{
    const financeModule=firstModuleOfType(org,"finance");
    if(!financeModule){setError("Enable Quotes and invoices first.");return;}
    const saved=await onAdd({orgId:org.id,module:financeModule,recordType:"quote",documentType:"Quote",
      title:"Quote for "+(customer.company||customer.title),detail:"Draft from CRM profile",
      reference:"DRAFT-"+Math.floor(Math.random()*9000+1000),customerRefId:customer.id,company:customer.company||customer.title,
      lineItems:[],amount:0,paymentStatus:"Draft",status:"Planned"});
    if(saved){setSelected(null);onNavigate(financeModule);}
  };
  const addAttendee=async(event,e)=>{
    e.preventDefault();
    const name=ticketName.trim();
    if(!name)return;
    const current=(event.attendees||[]),confirmed=current.filter(a=>a.status==="Confirmed").length;
    const isFull=Number(event.capacity)>0&&confirmed>=Number(event.capacity);
    const attendee={name,ticketType,status:isFull?"Waitlist":"Confirmed",checkedIn:false};
    const saved=await update(event,{attendees:[...current,attendee]});
    if(saved){setTicketName("");setTicketType("Standard");}
  };
  const crmView=()=> <div>
    <div className="customer-page-intro"><div><span className="eyebrow">CUSTOMER RELATIONSHIPS</span><h2>Customers & CRM</h2><p>Customer organisations, contacts, follow-ups and linked commercial work.</p></div>{canCreate&&<button className="action-primary" onClick={()=>setCreating(true)}><Plus size={16}/> Add customer</button>}</div>
    <div className="customer-metrics"><Metric label="Contacts" value={rows.length} detail="Fictional customer profiles"/><Metric label="Leads" value={rows.filter(r=>r.stage==="Lead").length} detail="Early-stage relationships"/><Metric label="Customers" value={rows.filter(r=>r.stage==="Customer").length} detail="Confirmed in demo"/></div>
    <div className="customer-tools"><label className="search-field">Search<input aria-label="Search CRM contacts" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Company or contact"/></label><label>Stage<select value={stage} onChange={e=>setStage(e.target.value)}>{["All",...stages].map(x=><option key={x}>{x}</option>)}</select></label></div>
    <div className="crm-columns">{stages.map(step=><section key={step}><h3>{step} <span>{filtered.filter(r=>(r.stage||"Lead")===step).length}</span></h3>{filtered.filter(r=>(r.stage||"Lead")===step).map(r=><article key={r.id}><small>{r.owner||"Unassigned"}</small><h4>{r.company||r.title}</h4><p>{r.contact||"No contact"} · Next action {format(r.followUp)}</p><button onClick={()=>setSelected(r.id)}>Open customer</button></article>)}</section>)}</div></div>;
  const financeView=()=> <div><div className="customer-page-intro"><div><span className="eyebrow">DOCUMENTS & ESTIMATES</span><h2>Quotes & invoices</h2><p>Itemised draft documents with customer links and printable previews.</p></div>{canCreate&&<button className="action-primary" onClick={()=>setCreating(true)}><Plus size={16}/> Create quote / invoice</button>}</div>
    <div className="customer-metrics"><Metric label="Documents" value={rows.length} detail="Quotes and invoices"/><Metric label="Sample total" value={formatMoney(rows.reduce((s,r)=>s+Number(r.amount||0),0))} detail="Illustrative only"/><Metric label="Drafts" value={rows.filter(r=>(r.paymentStatus||"Draft")==="Draft").length} detail="Not sent anywhere"/></div>
    <div className="commercial-documents">{filtered.map(r=><article key={r.id}><div><small>{r.documentType||"Quote"} · {r.reference||"No reference"}</small><h3>{r.title}</h3><p>{r.company||customers.find(c=>c.id===r.customerRefId)?.company||"Unlinked customer"}</p></div><div><strong>{formatMoney(r.amount)}</strong><Status>{r.paymentStatus||"Draft"}</Status><button onClick={()=>setSelected(r.id)}>Preview & edit</button></div></article>)}</div></div>;
  const eventsView=()=> <div><div className="customer-page-intro"><div><span className="eyebrow">EVENT OPERATIONS</span><h2>Events & bookings</h2><p>Events, capacities, attendee lists, check-ins and waiting lists.</p></div>{canCreate&&<button className="action-primary" onClick={()=>setCreating(true)}><Plus size={16}/> Plan event</button>}</div>
    <div className="customer-metrics"><Metric label="Events" value={rows.length} detail="Planned activities"/><Metric label="Registrations" value={rows.reduce((s,r)=>s+(r.attendees||[]).length,0)} detail="Across all events"/><Metric label="Checked in" value={rows.reduce((s,r)=>s+(r.attendees||[]).filter(a=>a.checkedIn).length,0)} detail="Attendee confirmations"/></div>
    <div className="event-tiles">{[...filtered].sort((a,b)=>(a.startTime||"9999").localeCompare(b.startTime||"9999")).map(r=>{const confirmed=(r.attendees||[]).filter(a=>a.status==="Confirmed").length;return <article key={r.id}><div className="event-date"><CalendarDays size={20}/><strong>{format(r.startTime)}</strong></div><div><h3>{r.title}</h3><p>{r.location||"Venue not set"} · Team: {r.assignedTeam||"Unassigned"}</p><span>{confirmed} / {r.capacity||"Unlimited"} registered</span><progress max={Math.max(Number(r.capacity||0),confirmed,1)} value={confirmed}/></div><button onClick={()=>setSelected(r.id)}>Manage event</button></article>})}</div></div>;
  const bookingsView=()=> {
    const entries=filtered.filter(r=>!bookingDate||r.startTime?.slice(0,10)===bookingDate);
    return <div><div className="customer-page-intro"><div><span className="eyebrow">APPOINTMENT DIARY</span><h2>Bookings & appointments</h2><p>Appointments, room reservations and linked event bookings.</p></div>{canCreate&&<button className="action-primary" onClick={()=>setCreating(true)}><Plus size={16}/> New booking</button>}</div>
      <div className="customer-metrics"><Metric label="Bookings" value={rows.length} detail="Sample appointments"/><Metric label="Today" value={rows.filter(r=>r.startTime?.slice(0,10)===new Date().toISOString().slice(0,10)).length} detail="Scheduled for today"/><Metric label="Rooms & venues" value={new Set(rows.map(r=>r.location).filter(Boolean)).size} detail="Distinct resource names"/></div>
      <div className="customer-tools"><label>Date<input aria-label="Filter booking date" type="date" value={bookingDate} onChange={e=>setBookingDate(e.target.value)}/></label><button onClick={()=>setBookingDate("")}>All dates</button></div>
      <div className="booking-diary">{[...entries].sort((a,b)=>(a.startTime||"9999").localeCompare(b.startTime||"9999")).map(r=><article key={r.id}><div><strong>{r.startTime?.replace("T"," ")||"Unscheduled"}</strong><small>{r.bookingType||"Customer appointment"}</small></div><div><h3>{r.person||r.title}</h3><p>{r.location||"No location"}{r.eventRefId?" · Linked event":""}</p></div><button onClick={()=>setSelected(r.id)}>Edit booking</button></article>)}</div></div>;
  };
  const donationsView=()=>{
    const total=rows.reduce((s,r)=>s+Number(r.amount||0),0);
    const sources=[...new Set(rows.map(r=>r.source||"Other"))];
    return <div><div className="customer-page-intro"><div><span className="eyebrow">FUNDRAISING</span><h2>Donations & fundraising</h2><p>Track sample fundraising by campaign and source; no payments or Gift Aid claims are processed.</p></div>{canCreate&&<button className="action-primary" onClick={()=>setCreating(true)}><Plus size={16}/> Record sample donation</button>}</div>
      <div className="customer-metrics"><Metric label="Total raised (fictional)" value={formatMoney(total)} detail="Example amounts only"/><Metric label="Donations" value={rows.length} detail="Recorded samples"/><Metric label="Gift Aid candidates" value={rows.filter(r=>r.giftAidEligible).length} detail="Unverified eligibility flag"/></div>
      <div className="donation-layout"><section><h3>Fundraising by source</h3>{sources.map(source=><div className="donation-source" key={source}><strong>{source}</strong><span>{formatMoney(rows.filter(r=>(r.source||"Other")===source).reduce((sum,r)=>sum+Number(r.amount||0),0))}</span></div>)}</section>
        <section><h3>Donation records</h3>{filtered.map(r=><article key={r.id}><div><strong>{r.campaign||r.title}</strong><small>{r.source||"Other"}</small></div><div><strong>{formatMoney(r.amount)}</strong><button onClick={()=>setSelected(r.id)}>View</button></div></article>)}</section></div>
    </div>;
  };
  const detail=r=> <div className="business-detail"><h3>{r.title}</h3><p>{r.detail}</p>
    {type==="crm"&&<><div className="form-pair"><label>Company<input disabled={!canEdit} value={r.company||""} onChange={e=>update(r,{company:e.target.value})}/></label><label>Contact<input disabled={!canEdit} value={r.contact||""} onChange={e=>update(r,{contact:e.target.value})}/></label></div>
      <label>Relationship stage<select disabled={!canEdit} value={r.stage||"Lead"} onChange={e=>update(r,{stage:e.target.value})}>{stages.map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Follow-up date<input type="date" disabled={!canEdit} value={r.followUp||""} onChange={e=>update(r,{followUp:e.target.value})}/></label>
      <h3>Related quotes & invoices</h3>{finances.filter(f=>f.customerRefId===r.id).map(f=><div className="ticket" key={f.id}><span>{f.title} · {formatMoney(f.amount)}</span><button onClick={()=>onNavigate(f.module,{recordId:f.id})}>Open</button></div>)}
      {canCreate&&firstModuleOfType(org,"finance")&&<button onClick={()=>createQuote(r)}>Create draft quote for this customer</button>}
      <h3>Customer notes</h3>{(r.notes||[]).map((n,i)=><p key={i} className="task-note">{n.date}: {n.text}</p>)}
      {canEdit&&<form onSubmit={e=>{e.preventDefault();const text=new FormData(e.currentTarget).get("note").trim();if(text){update(r,{notes:[...(r.notes||[]),{date:new Date().toLocaleDateString("en-GB"),text}]});e.currentTarget.reset();}}}><label>Follow-up note<textarea name="note" required maxLength={400}/></label><button>Add note</button></form>}</>}
    {type==="finance"&&<><div className="doc-preview"><header><strong>{r.documentType||"Quote"}</strong><span>{r.reference||"Draft reference"}</span></header><h3>{r.company||customers.find(c=>c.id===r.customerRefId)?.company||"Example customer"}</h3><p>{r.detail}</p><table><thead><tr><th>Item</th><th>Qty</th><th>Unit price</th><th>Total</th></tr></thead><tbody>{(r.lineItems||[]).map((item,i)=><tr key={i}><td>{item.description}</td><td>{item.quantity}</td><td>{formatMoney(item.unitPrice)}</td><td>{formatMoney(Number(item.quantity)*Number(item.unitPrice))}</td></tr>)}</tbody></table><strong className="doc-total">Total: {formatMoney(r.amount)}</strong></div>
      <label>Document status<select aria-label="Document status" disabled={!canEdit} value={r.paymentStatus||"Draft"} onChange={e=>update(r,{paymentStatus:e.target.value})}>{financialStatuses.map(x=><option key={x}>{x}</option>)}</select></label>
      {r.customerRefId&&<button onClick={()=>{const c=customers.find(x=>x.id===r.customerRefId);if(c)onNavigate(c.module,{recordId:c.id})}}>Open linked customer</button>}
      {r.jobRefId&&<button onClick={()=>{const j=jobs.find(x=>x.id===r.jobRefId);if(j)onNavigate(j.module,{recordId:j.id})}}>Open related work order</button>}
      <button onClick={()=>window.print()}>Print / save document as PDF</button><p className="module-disclaimer">No invoice is issued, emailed, paid or stored outside this tab.</p></>}
    {type==="events"&&<><div className="detail-data-grid"><div><small>Venue</small><strong>{r.location||"—"}</strong></div><div><small>Date</small><strong>{format(r.startTime)}</strong></div><div><small>Capacity</small><strong>{r.capacity||"Unlimited"}</strong></div><div><small>Team</small><strong>{r.assignedTeam||"Unassigned"}</strong></div></div>
      <h3>Attendees & check-in</h3>{(r.attendees||[]).map((a,i)=><div className="event-attendee" key={i}><span><strong>{a.name}</strong><small>{a.ticketType} · {a.status}</small></span>
        {canEdit&&a.status==="Confirmed"&&<button onClick={()=>update(r,{attendees:r.attendees.map((x,j)=>i===j?{...x,checkedIn:!x.checkedIn}:x)})}>{a.checkedIn?"Undo check-in":"Check in"}</button>}</div>)}
      {canCreate&&<form onSubmit={e=>addAttendee(r,e)}><label>Attendee name<input value={ticketName} onChange={e=>setTicketName(e.target.value)} required maxLength={100}/></label><label>Ticket type<select value={ticketType} onChange={e=>setTicketType(e.target.value)}>{["Standard","Child","Group","Complimentary"].map(x=><option key={x}>{x}</option>)}</select></label><button>Register attendee</button></form>}
      <h3>Event summary</h3><p>Confirmed {(r.attendees||[]).filter(a=>a.status==="Confirmed").length} · Waitlisted {(r.attendees||[]).filter(a=>a.status==="Waitlist").length} · Checked in {(r.attendees||[]).filter(a=>a.checkedIn).length}</p></>}
    {type==="bookings"&&<><label>Booking type<select disabled={!canEdit} value={r.bookingType||types[0]} onChange={e=>update(r,{bookingType:e.target.value})}>{types.map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Start time<input disabled={!canEdit} type="datetime-local" value={r.startTime||""} onChange={e=>update(r,{startTime:e.target.value})}/></label><label>Location<input disabled={!canEdit} value={r.location||""} onChange={e=>update(r,{location:e.target.value})}/></label>
      {r.eventRefId&&<button onClick={()=>{const event=events.find(x=>x.id===r.eventRefId);if(event)onNavigate(event.module,{recordId:event.id});}}>Open linked event</button>}</>}
    {type==="donations"&&<><p>Campaign: {r.campaign||"General donations"}</p><p>Source: {r.source||"Unknown"} · Sample amount {formatMoney(r.amount)}</p>
      <label className="setting-toggle"><input type="checkbox" disabled={!canEdit} checked={Boolean(r.giftAidEligible)} onChange={e=>update(r,{giftAidEligible:e.target.checked})}/> Possible Gift Aid eligibility (unverified)</label><p className="module-disclaimer">This checkbox is not a Gift Aid declaration and does not submit any claim.</p></>}
  </div>;
  const createForm=()=> <Modal title={"Create sample "+moduleTitle[type].toLowerCase()} onClose={()=>setCreating(false)}><form className="customer-form" onSubmit={register}>{error&&<p role="alert">{error}</p>}
    <label>Title<input name="title" maxLength={100} required autoFocus/></label>
    {type==="crm"&&<><label>Company<input name="company" maxLength={120}/></label><label>Contact<input name="contact" maxLength={120}/></label><label>Account manager<input name="owner" maxLength={80}/></label><label>Stage<select name="stage">{stages.map(x=><option key={x}>{x}</option>)}</select></label><label>Follow-up<input name="followUp" type="date"/></label></>}
    {type==="finance"&&<><label>Document type<select name="documentType"><option>Quote</option><option>Invoice</option></select></label><label>Reference<input name="reference" maxLength={40}/></label>
      <label>Customer<select name="customerRefId"><option value="">No linked customer</option>{customers.map(c=><option value={c.id} key={c.id}>{c.company||c.title}</option>)}</select></label>
      <label>Related work order<select name="jobRefId"><option value="">None</option>{jobs.map(j=><option value={j.id} key={j.id}>{j.title}</option>)}</select></label>
      <label>Line items (one per line: Description | quantity | unit price)<textarea name="lineItems" rows={4} placeholder={"Inspection | 1 | 75\nParts | 2 | 12.50"}/></label></>}
    {type==="events"&&<><label>Venue<input name="location" required maxLength={100}/></label><label>Start date and time<input name="startTime" type="datetime-local" required/></label><label>Capacity<input name="capacity" type="number" min="0" step="1"/></label><label>Staff / team<input name="assignedTeam" maxLength={120}/></label><label>Equipment & resources<input name="resources" maxLength={200}/></label></>}
    {type==="bookings"&&<><label>Booking type<select name="bookingType">{types.map(x=><option key={x}>{x}</option>)}</select></label><label>Customer / attendee<input name="person" maxLength={100}/></label><label>Start time<input name="startTime" type="datetime-local" required/></label><label>Location / resource<input name="location" maxLength={100} required/></label>
      <label>Link event<select name="eventRefId"><option value="">No event</option>{events.map(r=><option key={r.id} value={r.id}>{r.title}</option>)}</select></label></>}
    {type==="donations"&&<><label>Campaign<input name="campaign" maxLength={100}/></label><label>Amount (£, fictional)<input name="amount" type="number" min="0" step=".01" required/></label><label>Source / channel<select name="source">{["Event","Cash collection","Online (demo)","Sponsored activity","Other"].map(x=><option key={x}>{x}</option>)}</select></label><label className="setting-toggle"><input name="giftAidEligible" type="checkbox"/> Possible Gift Aid eligible (not verified)</label></>}
    <label>Notes<textarea name="detail" maxLength={400}/></label>
    <button type="submit" className="action-primary">Save sample {type==="crm"?"customer":type==="finance"?"document":type==="events"?"event":type==="bookings"?"booking":"donation"}</button></form></Modal>;
  return <div className="business-operations">
    {type==="crm"?crmView():type==="finance"?financeView():type==="events"?eventsView():type==="bookings"?bookingsView():donationsView()}
    {creating&&createForm()}
    {current&&<Modal title={moduleTitle[type]+" details"} onClose={()=>{setSelected(null);setError("");}}>{detail(current)}{error&&<p role="alert">{error}</p>}</Modal>}
  </div>;
}
