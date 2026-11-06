import React, { useState } from "react";
import { Panel, Empty, Status } from "./components";
import { BarChart3, Building2, Megaphone, Plus, Server, ArrowRight, LifeBuoy, Palette, Lightbulb, Users, TrendingUp, ClipboardList, ShieldCheck, PackageCheck } from "lucide-react";

export const ownerSeed = {
  leads:[
    {id:"lead-1",name:"Example Workshop Ltd",contact:"Sample contact",stage:"Discovery",sector:"Engineering"},
    {id:"lead-2",name:"Riverbank Community Group",contact:"Example enquiry",stage:"Proposal",sector:"Charity"},
    {id:"lead-3",name:"Oaklands Visitor Centre",contact:"Sample manager",stage:"New",sector:"Visitor attraction"}
  ],
  requests:[
    {id:"request-1",title:"Custom approval steps",org:"Example engineering customer",priority:"High",status:"Reviewing",votes:3},
    {id:"request-2",title:"Recurring rota templates",org:"Example community trust",priority:"Normal",status:"Planned",votes:2},
    {id:"request-3",title:"Exportable asset QR labels",org:"Example visitor site",priority:"Normal",status:"New",votes:1}
  ],
  announcements:[]
};
const stages=["New","Discovery","Proposal","Won","Lost"];
const requestStates=["New","Reviewing","Planned","In progress","Released","Declined"];
const dataNote = "Fictional owner-console demonstration. All changes are kept only in the browser session.";
function Meta({label,value}) {return <div className="metric-tile"><span>{label}</span><strong>{value}</strong></div>}
function CustomerInsights({controller}) {
  const {orgs,records}=controller;
  const [filter,setFilter]=useState("All");
  const rows=orgs.filter(o=>filter==="All"||o.sector===filter);
  const filtered=records.filter(r=>rows.some(o=>o.id===r.orgId));
  const orgStats=rows.map(o=>({name:o.name,modules:o.modules.length,records:records.filter(r=>r.orgId===o.id).length,status:o.status}));
  return <><div className="customer-page-intro"><div><span className="eyebrow">PLATFORM ANALYTICS</span><h2>Client insights</h2><p>See module adoption and sample activity across your organisations.</p></div></div>
    <div className="customer-metrics"><Meta label="Organisations" value={rows.length}/><Meta label="Total enabled modules" value={rows.reduce((v,o)=>v+o.modules.length,0)}/><Meta label="Sample operational records" value={filtered.length}/><Meta label="Active organisations" value={rows.filter(o=>o.status==="Active").length}/></div>
    <Panel title="Usage by customer"><label style={{maxWidth:230}}>Industry filter<select value={filter} onChange={e=>setFilter(e.target.value)}><option>All</option>{["heritage","charity","engineering","visitor"].map(x=><option key={x}>{x}</option>)}</select></label><div className="owner-usage-bars">{orgStats.map(o=><div key={o.name} className="owner-usage-row"><strong>{o.name}</strong><progress value={o.modules} max={Math.max(1,...orgStats.map(x=>x.modules))}/><span>{o.modules} modules · {o.records} records</span></div>)}</div></Panel>
    <Panel title="Customer overview"><div className="table-wrap"><table><thead><tr><th>Customer</th><th>Status</th><th>Enabled modules</th><th>Sample records</th></tr></thead><tbody>{orgStats.map(o=><tr key={o.name}><th>{o.name}</th><td><Status>{o.status}</Status></td><td>{o.modules}</td><td>{o.records}</td></tr>)}</tbody></table></div></Panel><p className="module-disclaimer">{dataNote} These are not real usage events or licensed seat counts.</p></>;
}
function Branding({controller}) {
  const {orgs,selected,setSelected,active,update}=controller;
  const palettes=["#26583e","#315b77","#754b7e","#b45c42","#504e6f","#1f6477","#56663c"];
  const [color,setColor]=useState(active?.color||"#26583e");
  const choose=event=>{setSelected(event.target.value);setColor(orgs.find(o=>o.id===event.target.value)?.color||"#26583e");};
  return <><div className="customer-page-intro"><div><span className="eyebrow">CLIENT EXPERIENCE</span><h2>Branding templates</h2><p>Try a different accent colour for each example company.</p></div></div>
    <div className="settings-layout"><Panel title="Choose a customer"><label>Organisation<select value={selected} onChange={choose}>{orgs.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
      <label>Brand accent<input type="color" aria-label="Brand accent colour" value={color} onChange={e=>setColor(e.target.value)}/></label>
      <div className="owner-palettes">{palettes.map(p=><button type="button" key={p} onClick={()=>setColor(p)} aria-label={"Choose colour "+p} style={{background:p}}/>)}</div>
      <button className="action-primary" onClick={()=>update(active.id,{color},"Updated sample client branding")}>Apply to fictional company</button></Panel>
      <Panel title="Live appearance preview"><div className="owner-brand-preview" style={{"--sample":color}}><header><Building2 size={20}/><strong>{active.name}</strong></header><div><span>Dashboard preview</span><strong>22</strong><small>Illustrative activity</small><button type="button">Sample action</button></div></div>
        <p className="module-disclaimer">Accent only. Real customer domains, logos, fonts and custom themes require further design and production safeguards.</p></Panel></div></>;
}
function Leads({data,setData}) {
  const [name,setName]=useState("");const [contact,setContact]=useState("");const [sector,setSector]=useState("Engineering");
  const add=e=>{e.preventDefault();if(!name.trim())return;setData(d=>({...d,leads:[...d.leads,{id:crypto.randomUUID(),name:name.trim(),contact:contact.trim(),sector,stage:"New"}]}));setName("");setContact("");};
  return <><div className="customer-page-intro"><div><span className="eyebrow">SALES PIPELINE</span><h2>Sales leads</h2><p>Track conversations, discovery and proposals in a fictional sales pipeline.</p></div></div>
    <div className="customer-metrics">{["New","Discovery","Proposal","Won"].map(x=><Meta key={x} label={x} value={data.leads.filter(l=>l.stage===x).length}/>)}</div>
    <Panel title="Add a fictional prospect"><form className="owner-inline-form" onSubmit={add}><label>Company<input value={name} onChange={e=>setName(e.target.value)} maxLength={80} required placeholder="Company name"/></label><label>Contact<input value={contact} onChange={e=>setContact(e.target.value)} maxLength={80} placeholder="Sample contact"/></label><label>Sector<select value={sector} onChange={e=>setSector(e.target.value)}>{["Engineering","Charity","Visitor attraction","Retail","Services","Other"].map(x=><option key={x}>{x}</option>)}</select></label><button type="submit" className="action-primary"><Plus size={16}/> Add prospect</button></form></Panel>
    <div className="pipeline-grid owner-lead-pipeline">{stages.map(stage=><section className="pipeline-column" key={stage}><h3>{stage} <span>{data.leads.filter(l=>l.stage===stage).length}</span></h3>{data.leads.filter(l=>l.stage===stage).map(lead=><article className="purpose-card" key={lead.id}><h3>{lead.name}</h3><small>{lead.sector}</small><p>{lead.contact||"No contact added"}</p><label>Move to<select aria-label={"Stage for "+lead.name} value={lead.stage} onChange={e=>setData(d=>({...d,leads:d.leads.map(l=>l.id===lead.id?{...l,stage:e.target.value}:l)}))}>{stages.map(x=><option key={x}>{x}</option>)}</select></label></article>)}</section>)}</div><p className="module-disclaimer">{dataNote} No external CRM or email is connected.</p></>;
}
function Requests({data,setData}) {
  const [subject,setSubject]=useState("");const [search,setSearch]=useState("");
  const add=e=>{e.preventDefault();if(!subject.trim())return;setData(d=>({...d,requests:[...d.requests,{id:crypto.randomUUID(),title:subject.trim(),org:"Unassigned",priority:"Normal",status:"New",votes:0}]}));setSubject("");};
  return <><div className="customer-page-intro"><div><span className="eyebrow">PRODUCT ROADMAP</span><h2>Feature requests</h2><p>Prioritise customer feedback and move requests through delivery stages.</p></div></div>
    <Panel title="New request"><form className="owner-inline-form" onSubmit={add}><label>Feature description<input value={subject} onChange={e=>setSubject(e.target.value)} maxLength={100} required placeholder="What should Channel Systems add?"/></label><button type="submit" className="action-primary"><Plus size={16}/> Add request</button></form></Panel>
    <Panel title="Request backlog"><div className="customer-tools"><label className="search-field"><input aria-label="Search feature requests" placeholder="Search requests" value={search} onChange={e=>setSearch(e.target.value)}/></label></div>
      <div className="work-feed">{data.requests.filter(r=>[r.title,r.org].join(" ").toLowerCase().includes(search.toLowerCase())).map(r=><div className="owner-request-row" key={r.id}><span className="notification-icon"><Lightbulb size={17}/></span><div><strong>{r.title}</strong><small>{r.org} · {r.votes} votes</small></div><button onClick={()=>setData(d=>({...d,requests:d.requests.map(x=>x.id===r.id?{...x,votes:x.votes+1}:x)}))}>Vote +1</button><label>Status<select aria-label={"Request status for "+r.title} value={r.status} onChange={e=>setData(d=>({...d,requests:d.requests.map(x=>x.id===r.id?{...x,status:e.target.value}:x)}))}>{requestStates.map(x=><option key={x}>{x}</option>)}</select></label></div>)}</div></Panel><p className="module-disclaimer">{dataNote} This does not create GitHub issues or notify customers.</p></>;
}
function Announcements({data,setData}) {
  const [title,setTitle]=useState("");const [body,setBody]=useState("");const [audience,setAudience]=useState("All companies");
  const add=(e,draft)=>{e.preventDefault();if(!title.trim()||!body.trim())return;setData(d=>({...d,announcements:[{id:crypto.randomUUID(),title:title.trim(),body:body.trim(),audience,status:draft?"Draft":"Published (demo)",date:new Date().toLocaleDateString("en-GB")},...d.announcements]}));setTitle("");setBody("");};
  return <><div className="customer-page-intro"><div><span className="eyebrow">CLIENT COMMUNICATIONS</span><h2>Announcements</h2><p>Prepare product updates and messages to example customers.</p></div></div>
    <div className="settings-layout"><Panel title="Compose an announcement"><form onSubmit={e=>add(e,true)}><label>Headline<input required maxLength={100} value={title} onChange={e=>setTitle(e.target.value)} placeholder="What's changing?"/></label><label>Message<textarea required maxLength={1500} value={body} onChange={e=>setBody(e.target.value)} placeholder="Explain the update clearly…"/></label><label>Audience<select value={audience} onChange={e=>setAudience(e.target.value)}>{["All companies","Pilot customers","Professional customers","Enterprise customers"].map(x=><option key={x}>{x}</option>)}</select></label><div className="owner-composer-actions"><button type="submit">Save draft</button><button type="button" className="action-primary" onClick={e=>add(e,false)}>Publish in demo</button></div></form><p className="module-disclaimer">Nothing is actually delivered. The publish action only changes this fictional demo.</p></Panel>
      <Panel title="Announcement history">{data.announcements.length?data.announcements.map(a=><div className="owner-announcement" key={a.id}><small>{a.date} · {a.audience}</small><h3>{a.title}</h3><p>{a.body}</p><Status>{a.status}</Status></div>):<Empty>No announcements composed yet.</Empty>}</Panel></div></>;
}
function Infrastructure({onOpenServer}) {
  return <><div className="customer-page-intro"><div><span className="eyebrow">OPERATIONS & SECURITY</span><h2>Server management</h2><p>The public demonstration does not connect to a production server.</p></div></div>
    <div className="customer-metrics"><Meta label="CPU / memory" value="—"/><Meta label="Disk free" value="—"/><Meta label="Backup status" value="—"/><Meta label="PostgreSQL status" value="—"/></div>
    <Panel title="Private operator workspace"><p>Server monitoring, company storage allocations and account management are separate from this public fictional demo. Open the private server workspace when the authorised backend has been deployed and configured.</p><button className="action-primary" onClick={onOpenServer}><Server size={16}/> Open private server workspace</button><p className="module-disclaimer">Do not infer backup, database or host health from this public page. No infrastructure monitoring is connected here.</p></Panel></>;
}
function Onboarding({onOpenOnboarding,controller}) {
  return <><div className="customer-page-intro"><div><span className="eyebrow">CUSTOMER PROVISIONING</span><h2>Companies & onboarding</h2><p>Take an organisation from discovery to a tailored demo workspace.</p></div></div>
    <div className="customer-metrics"><Meta label="Companies" value={controller.orgs.length}/><Meta label="Trial accounts" value={controller.orgs.filter(o=>o.status==="Trial").length}/><Meta label="Active accounts" value={controller.orgs.filter(o=>o.status==="Active").length}/></div>
    <div className="owner-onboarding-steps">{[["01","Create a company","Choose its sector and initial information."],["02","Choose a package","Enable the specific module catalogue it needs."],["03","Configure roles","Decide what staff can see and manage."],["04","Review & launch","Approve the configuration before sharing a demo."]].map(([n,title,desc])=><div key={n}><strong>{n}</strong><h3>{title}</h3><p>{desc}</p></div>)}</div>
    <button className="action-primary" onClick={onOpenOnboarding}>Open interactive onboarding simulation <ArrowRight size={16}/></button><p className="module-disclaimer">This does not provision real companies or create live user accounts.</p></>;
}
export default function OwnerBusinessPages({page,controller,data,setData,onOpenServer,onOpenOnboarding}) {
  return <div className="owner-business-shell">{page==="Client Insights"?<CustomerInsights controller={controller}/>:page==="Branding Templates"?<Branding controller={controller}/>:page==="Sales Leads"?<Leads data={data} setData={setData}/>:page==="Feature Requests"?<Requests data={data} setData={setData}/>:page==="Announcements"?<Announcements data={data} setData={setData}/>:page==="Infrastructure"?<Infrastructure onOpenServer={onOpenServer}/>:page==="Onboarding"?<Onboarding onOpenOnboarding={onOpenOnboarding} controller={controller}/>:<Empty>Select an owner management page.</Empty>}</div>;
}
