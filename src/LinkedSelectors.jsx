import React from "react";
import {moduleInfo} from "./customerModules";

/** Reusable live staff selector: the displayed name is retained for old demo records,
 * while personId reliably links new records to an existing staff profile. */
export function teamMembers(records,orgId){
 return records.filter(r=>r.orgId===orgId && moduleInfo(r.module).type==="people")
  .filter((r,i,a)=>a.findIndex(x=>x.title===r.title)===i)
  .sort((a,b)=>a.title.localeCompare(b.title));
}
export function StaffSelect({people,name="owner",value="",onChange,required=false,placeholder="Choose a team member",disabled=false,label="Assigned staff"}){
 const current=people.find(p=>p.id===value||p.title===value);
 return <label>{label}<select name={name} {...(onChange?{value:current?.title||value||"",onChange}:{defaultValue:current?.title||value||""})} required={required} disabled={disabled}>
 <option value="">{placeholder}</option>
 {people.map(p=><option key={p.id} value={p.title}>{p.title}{p.role?" · "+p.role:""}{p.team?" ("+p.team+")":""}</option>)}
 {value&&!current&&<option value={value}>{value} · legacy assignment</option>}
 </select></label>;
}
export function AssetSelect({assets,name="assetRefId",value="",onChange,label="Asset",disabled=false}){
 return <label>{label}<select name={name} {...(onChange?{value,onChange}:{defaultValue:value})} disabled={disabled}>
 <option value="">General / no asset</option>
 {assets.map(asset=><option key={asset.id} value={asset.id}>{asset.asset||asset.title} — {asset.title}</option>)}
 </select></label>;
}
export function CustomerSelect({customers,name="customerId",value="",onChange,label="Customer",required=false}){
 return <label>{label}<select name={name} {...(onChange?{value,onChange}:{defaultValue:value})} required={required}><option value="">Choose customer</option>
 {customers.map(c=><option key={c.id} value={c.id}>{c.company||c.title}</option>)}
 </select></label>;
}
export const attachedName = (items,id,otherwise="Unassigned")=>items.find(p=>p.id===id)?.title||otherwise;
