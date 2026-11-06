import React, { useState } from "react";
import { modules, toggleModule } from "../model";
import { Panel } from "../components";
import { Blocks, CheckCircle2 } from "lucide-react";
const groups = [
  ["Work & collaboration",["Tasks & projects","Documents & files","Reports & analytics","Forms and surveys"]],
  ["People & scheduling",["Staff & volunteers","Attendance & timesheets","Shift rotas","Leave and availability","Training and qualifications"]],
  ["Assets & compliance",["Assets & equipment","Maintenance & work orders","Inspections & checklists","Health & safety","Vehicle / fleet management"]],
  ["Customers & business",["Inventory and stock","Customers / CRM","Quotes and invoices","Bookings and appointments","Donations and fundraising"]],
  ["Events & collections",["Events & bookings","Archives and collections"]]
];
const covered=new Set(groups.flatMap(g=>g[1]));
const sections=[...groups,["Other / existing module types",modules.filter(m=>!covered.has(m.name)).map(m=>m.name)]];
export default function ModulesPage({controller}) {
  const {selected,setSelected,orgs,active,update}=controller;
  const [search,setSearch]=useState("");
  const [filter,setFilter]=useState("All");
  const matching=m=>[m.name,m.description,...(m.requires||[])].join(" ").toLowerCase().includes(search.toLowerCase()) &&
    (filter==="All"||(filter==="Enabled"?active.modules.includes(m.name):!active.modules.includes(m.name)));
  const change=m=>update(active.id,{modules:toggleModule(active.modules,m.name)},"Changed sample module access: "+m.name);
  return <div className="owner-module-catalogue">
    <div className="customer-page-intro"><div><span className="eyebrow">PRODUCT CONFIGURATION</span><h2>Module catalogue</h2><p>Build a different combination of management tools for each fictional company.</p></div></div>
    <div className="customer-metrics">
      <div className="metric-tile"><Blocks size={18}/><span>Available modules</span><strong>{modules.length}</strong><small>Across multiple industries</small></div>
      <div className="metric-tile"><CheckCircle2 size={18}/><span>Enabled for customer</span><strong>{active.modules.length}</strong><small>Includes required dependencies</small></div>
    </div>
    <Panel title="Configure a company">
      <div className="catalogue-controls">
        <label>Organisation<select value={selected} onChange={e=>setSelected(e.target.value)}>{orgs.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
        <label>Search modules<input aria-label="Search modules" placeholder="Search name or capability" value={search} onChange={e=>setSearch(e.target.value)}/></label>
        <label>Show<select aria-label="Filter modules" value={filter} onChange={e=>setFilter(e.target.value)}>{["All","Enabled","Disabled"].map(x=><option key={x}>{x}</option>)}</select></label>
      </div>
      <p className="muted">Module dependencies are handled automatically. Disabling a required module also disables features that depend on it. This demonstration does not enforce production permissions.</p>
      {sections.map(([name,names])=>{
        const items=names.map(n=>modules.find(m=>m.name===n)).filter(Boolean).filter(matching);
        if(!items.length)return null;
        return <div className="catalogue-group" key={name}><div className="catalogue-group-heading"><h3>{name}</h3><span>{items.length} modules</span></div>
          <div className="module-grid">{items.map(m=><label className={"module catalogue-module "+(active.modules.includes(m.name)?"enabled":"")} key={m.name}>
            <input type="checkbox" checked={active.modules.includes(m.name)} onChange={()=>change(m)}/>
            <span><b>{m.name}</b><small>{m.description}</small>{m.requires?.length>0&&<small className="module-dependency">Requires: {m.requires.join(", ")}</small>}</span>
          </label>)}</div>
        </div>;
      })}
      {!modules.some(matching)&&<p className="empty-state">No modules match this search and filter.</p>}
    </Panel>
  </div>;
}
