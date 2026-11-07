import test from "node:test";
import assert from "node:assert/strict";
import { availabilityAssessment, eligibleStaff, validateAssignee } from "../src/staffEligibility.js";

const orgId="demo-engineering";
const personA={id:"a",orgId,module:"Staff & volunteers",title:"Alex Engineer",employmentStatus:"Active"};
const personB={id:"b",orgId,module:"Staff & volunteers",title:"Blair Inspector",employmentStatus:"Active"};
const records=[
 personA,personB,
 {id:"qa",orgId,module:"Training and qualifications",person:"Alex Engineer",qualification:"Maintenance engineering",expiry:"2028-05-15",approval:"Approved"},
 {id:"qb",orgId,module:"Training and qualifications",personId:"b",person:"Blair Inspector",qualification:"Inspection safety",expiry:"2028-05-15",approval:"Approved"},
];
const criteria={kind:"maintenance",date:"2027-02-14"};
test("maintenance only offers staff with a matching valid certificate",()=>{
 const people=eligibleStaff(records,orgId,criteria);
 assert.deepEqual(people.eligible.map(p=>p.title),["Alex Engineer"]);
 assert.match(people.excluded[0].assessment.reasons.join(" " ),/qualification/);
});
test("inspection role uses inspection competence, not generic maintenance entitlement",()=>{
 assert.equal(validateAssignee(records,orgId,"Blair Inspector",{kind:"inspections",date:"2027-02-14"}).eligible,true);
 assert.equal(validateAssignee(records,orgId,"Blair Inspector",criteria).eligible,false);
});
test("qualifications expiring before a work date are rejected",()=>{
 const assessed=availabilityAssessment(personA,records,orgId,{kind:"maintenance",date:"2029-01-01"});
 assert.equal(assessed.eligible,false);
 assert.match(assessed.reasons.join(" " ),/expired/);
});
test("approved leave excludes staff for the affected dates only",()=>{
 const data=[...records,{id:"leave",orgId,module:"Leave and availability",personId:"a",person:"Alex Engineer",startDate:"2027-02-13",endDate:"2027-02-16",approval:"Approved"}];
 assert.equal(validateAssignee(data,orgId,"Alex Engineer",criteria).eligible,false);
 assert.equal(validateAssignee(data,orgId,"Alex Engineer",{...criteria,date:"2027-02-17"}).eligible,true);
});
test("unapproved leave does not block eligibility",()=>{
 const data=[...records,{id:"leave",orgId,module:"Leave and availability",person:"Alex Engineer",startDate:"2027-02-13",endDate:"2027-02-16",approval:"Pending"}];
 assert.equal(validateAssignee(data,orgId,"Alex Engineer",criteria).eligible,true);
});
test("overlapping assignments are rejected and the edited assignment is excluded",()=>{
 const booking={id:"shift1",orgId,module:"Shift rotas",person:"Alex Engineer",startTime:"2027-02-14T09:00",endTime:"2027-02-14T13:00",status:"Planned"};
 const data=[...records,booking],next={kind:"schedule",startTime:"2027-02-14T11:00",endTime:"2027-02-14T15:00"};
 assert.equal(validateAssignee(data,orgId,"Alex Engineer",next).eligible,false);
 assert.equal(validateAssignee(data,orgId,"Alex Engineer",{...next,excludedRecordId:"shift1"}).eligible,true);
 assert.equal(validateAssignee(data,orgId,"Alex Engineer",{...next,startTime:"2027-02-14T14:00"}).eligible,true);
});
test("inactive and unknown staff are never eligible",()=>{
 assert.equal(validateAssignee([{...personA,employmentStatus:"Suspended"},...records.slice(1)],orgId,"Alex Engineer",criteria).eligible,false);
 assert.equal(validateAssignee(records,orgId,"Nonexistent Person",criteria).eligible,false);
});
test("records from another company cannot grant qualifications",()=>{
 const other=records.map(r=>r.id==="qa"?{...r,orgId:"other-company"}:r);
 assert.equal(validateAssignee(other,orgId,"Alex Engineer",criteria).eligible,false);
});
test("safety and driver roles require their respective competence",()=>{
 assert.equal(validateAssignee(records,orgId,"Blair Inspector",{kind:"safety"}).eligible,true);
 assert.equal(validateAssignee(records,orgId,"Blair Inspector",{kind:"fleet"}).eligible,false);
});

test("pending or rejected qualifications cannot unlock maintenance assignment",()=>{
 const pending=records.map(r=>r.id==="qa"?{...r,approval:"Pending"}:r);
 const rejected=records.map(r=>r.id==="qa"?{...r,approval:"Rejected"}:r);
 assert.equal(validateAssignee(pending,orgId,"Alex Engineer",criteria).eligible,false);
 assert.equal(validateAssignee(rejected,orgId,"Alex Engineer",criteria).eligible,false);
});
