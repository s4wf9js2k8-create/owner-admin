import React from "react";
import {moduleInfo} from "./customerModules";
import {eligibleStaff} from "./staffEligibility";

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

/** Restrict assignment to staff who meet the role and schedule requirements.
 * The exclusions stay visible to managers for explanation, but cannot be selected. */
export function QualifiedStaffSelect({records,orgId,kind="maintenance",date,startTime,endTime,excludedRecordId="",name="owner",value="",onChange,required=false,label="Assigned staff",disabled=false}){
 const {eligible,excluded}=eligibleStaff(records,orgId,{kind,date,startTime,endTime,excludedRecordId});
 const current=eligible.find(p=>p.title===value);
 const invalid=value && !current;
 const choices=eligible.map(person=><option key={person.id} value={person.title}>{person.title}{person.team?" · "+person.team:""}</option>);
 return <div className="qualified-staff-picker"><label>{label}<select name={name}
  {...(onChange?{value:current?.title||"",onChange}:{defaultValue:current?.title||""})}
  required={required} disabled={disabled||!eligible.length} aria-label={label}>
  <option value="">Choose eligible staff</option>{choices}
 </select></label>
 <small>{eligible.length} eligible · {excluded.length} unavailable or not qualified{date?" · "+date:""}</small>
 {invalid&&<p role="alert">Previously assigned person is no longer eligible. Choose another qualified, available team member.</p>}
 {excluded.length>0&&<details><summary>Why are {excluded.length} staff excluded?</summary><ul>{excluded.map(p=><li key={p.id}><strong>{p.title}</strong>: {p.assessment.reasons.join("; ")}</li>)}</ul></details>}
 {!eligible.length&&<p role="alert">No eligible staff. Record valid training or check the selected date and approved leave before assigning this work.</p>}
 </div>;
}
