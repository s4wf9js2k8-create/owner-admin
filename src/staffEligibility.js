import { moduleInfo } from "./customerModules.js";

const typeOf = record => moduleInfo(record.module).type;
const datePart = value => String(value || "").slice(0,10);
const dayOf = value => datePart(value) || new Date().toISOString().slice(0,10);
const normal = text => String(text || "").trim().toLowerCase();

export const assignmentRequirements = {
  maintenance: { label:"Maintenance / engineering", terms:["maintenance","engineering","mechanical","electrical","technician"] },
  inspections: { label:"Inspection competency", terms:["inspection","inspector","safety inspection","engineering"] },
  fleet: { label:"Vehicle / driving", terms:["driver","driving","vehicle","fleet"] },
  safety: { label:"Safety competency", terms:["health and safety","safety","risk assessment"] }
};
export const requirementFor = type => assignmentRequirements[type] || null;
export function availabilityAssessment(person, records, orgId, {kind="maintenance", date, startTime, endTime, excludedRecordId=""}={}){
 const day = dayOf(date || startTime);
 const related = records.filter(r=>r.orgId===orgId);
 const qualifications=related.filter(r=>typeOf(r)==="training" && (r.personId===person.id || (!r.personId && normal(r.person)===normal(person.title))));
 const required=requirementFor(kind);
 const reasons=[];
 const status=normal(person.employmentStatus||person.memberStatus||person.staffStatus||"active");
 if(["inactive","suspended","left","former","terminated"].includes(status))reasons.push("Inactive staff profile");
 const matching=required ? qualifications.filter(q=>[q.qualification,q.title,q.detail].some(v=>required.terms.some(term=>normal(v).includes(term)))) : qualifications;
 if(required&&!matching.length)reasons.push("No recorded "+required.label.toLowerCase()+" qualification");
 else if(required&&!matching.some(q=>(!q.expiry||datePart(q.expiry)>=day)&&!["revoked","failed","expired"].includes(normal(q.status))&&q.approval!=="Rejected"))reasons.push("Qualification expired or not valid on "+day);
 const leave=related.filter(r=>typeOf(r)==="leave" && (r.personId===person.id || (!r.personId&&normal(r.person)===normal(person.title))) && r.approval==="Approved" && datePart(r.startDate)<=day && datePart(r.endDate)>=day);
 if(leave.length)reasons.push("Approved leave on "+day);
 const unavailable=related.filter(r=>typeOf(r)==="leave"&&(r.personId===person.id||(!r.personId&&normal(r.person)===normal(person.title)))&&["Unavailable","Unavailability"].includes(r.requestType||r.availabilityStatus)&&datePart(r.startDate)<=day&&datePart(r.endDate)>=day);
 if(unavailable.length)reasons.push("Marked unavailable on "+day);
 if(startTime && endTime){
  const clashes=related.filter(r=>r.id!==excludedRecordId && (r.personId===person.id || (!r.personId&&normal(r.person||r.owner)===normal(person.title))) &&
   ["schedule","bookings","maintenance","inspections"].includes(typeOf(r)) && r.startTime&&r.endTime &&
   r.startTime<endTime && startTime<r.endTime && r.status!=="Cancelled");
  if(clashes.length)reasons.push("Overlapping shift, booking or assignment");
 }
 return {eligible:reasons.length===0,reasons,qualifications:matching};
}
export function eligibleStaff(records,orgId,criteria={}){
 const people=records.filter(r=>r.orgId===orgId&&typeOf(r)==="people")
  .filter((p,i,list)=>list.findIndex(other=>normal(other.title)===normal(p.title))===i)
  .sort((a,b)=>a.title.localeCompare(b.title));
 const assessed=people.map(person=>({...person,assessment:availabilityAssessment(person,records,orgId,criteria)}));
 return {eligible:assessed.filter(p=>p.assessment.eligible),excluded:assessed.filter(p=>!p.assessment.eligible),all:assessed};
}
export function validateAssignee(records,orgId,name,criteria={}){
 if(!name)return {eligible:true,reasons:[]};
 const person=records.find(p=>p.orgId===orgId&&typeOf(p)==="people"&&normal(p.title)===normal(name));
 return person?availabilityAssessment(person,records,orgId,criteria):{eligible:false,reasons:["Select a person from the staff directory"]};
}
