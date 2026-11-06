import React, { useState } from "react";
import { Command, Search, ArrowRight, Plus, BookmarkPlus } from "lucide-react";
import { isTaskModule } from "./customerModules";

export default function CustomerCommandBar({org,records,onNavigate,canEdit}) {
  const [query,setQuery]=useState("");
  const [moduleFilter,setModuleFilter]=useState("All modules");
  const [saved,setSaved]=useState([]);
  const [saveName,setSaveName]=useState("");
  const search = query.trim().toLowerCase();
  const matches = records.filter(r => (moduleFilter==="All modules" || r.module===moduleFilter) &&
    [r.title,r.detail,r.owner,r.asset,r.company,r.contact,r.location,r.reference].join(" ").toLowerCase().includes(search)).slice(0,7);
  const commands=[
    {title:"Open Tasks & Projects",target:"Tasks & projects"},
    {title:"Open shift rota",target:org.modules.find(m=>["Shift rotas","Schedules"].includes(m))},
    {title:"Open asset register",target:org.modules.find(m=>["Assets & equipment","Assets"].includes(m))},
    {title:"Open staff directory",target:org.modules.find(m=>["Staff & volunteers","Volunteers","Staff"].includes(m))},
    {title:"Open calendar",target:"Calendar"},
    ...(canEdit ? [{title:"Create a task",target:"Tasks & projects",create:true}] : []),
  ].filter(c=>c.target && (c.target==="Calendar" || c.target==="Tasks & projects"&&org.modules.some(isTaskModule) || org.modules.includes(c.target)));
  const suggested=commands.filter(c=>!search || c.title.toLowerCase().includes(search));
  const show=search.length>0;
  const go=(target,recordId,create)=>{onNavigate(target,{recordId,create});setQuery("");};
  return <div className="command-console">
    <div className="command-input-row"><Search size={18}/><input aria-label="Search or run a command" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search everything, or type a command…" />
      <label>In<select aria-label="Global search module" value={moduleFilter} onChange={e=>setModuleFilter(e.target.value)}><option>All modules</option>{org.modules.map(m=><option key={m}>{m}</option>)}</select></label>
    </div>
    {show && <div className="command-results" role="region" aria-label="Global search results">
      {suggested.length>0 && <div className="command-results-group"><small>COMMANDS</small>{suggested.map(c=><button key={c.title} onClick={()=>go(c.target,null,c.create)}>{c.create?<Plus size={16}/>:<Command size={16}/>} {c.title}<ArrowRight size={14}/></button>)}</div>}
      <div className="command-results-group"><small>RESULTS · {matches.length} shown</small>
        {matches.map(r=><button key={r.id} onClick={()=>go(isTaskModule(r.module)?"Tasks & projects":r.module,r.id,false)}><span><strong>{r.title}</strong><small>{r.module} · {r.owner||r.asset||r.location||"Sample record"}</small></span><ArrowRight size={14}/></button>)}
        {!matches.length && <p className="muted">No matching records in your permitted modules.</p>}
      </div>
      <div className="command-save"><input aria-label="Name global search" placeholder="Name this search" maxLength={40} value={saveName} onChange={e=>setSaveName(e.target.value)}/><button onClick={()=>{if(saveName.trim()){setSaved(old=>[...old.filter(i=>i.name!==saveName.trim()),{name:saveName.trim(),query,moduleFilter}]);setSaveName("");}}}><BookmarkPlus size={15}/> Save search</button></div>
    </div>}
    {saved.length>0 && <div className="command-saved"><small>Saved this session:</small>{saved.map(item=><button key={item.name} onClick={()=>{setQuery(item.query);setModuleFilter(item.moduleFilter)}}>{item.name}</button>)}</div>}
  </div>;
}
