import test from 'node:test';
import assert from 'node:assert/strict';
import {buildReport,previousPeriod,reportCsv} from '../src/reportingRules.js';
import {generateNotifications} from '../src/notificationRules.js';
import {noticeRelevant} from '../src/communicationRules.js';
const records=[{id:'staff',orgId:'a',module:'Staff & volunteers',title:'Alex',team:'Workshop'},{id:'one',orgId:'a',module:'Attendance & timesheets',title:'First shift',personId:'staff',startTime:'2026-11-01T09:00',endTime:'2026-11-01T13:00',breakMinutes:30,approval:'Approved'},{id:'two',orgId:'a',module:'Attendance & timesheets',title:'Open shift',personId:'staff',startTime:'2026-11-02T09:00',endTime:'',approval:'Pending'},{id:'other',orgId:'b',module:'Attendance & timesheets',title:'Other company',startTime:'2026-11-01T09:00',endTime:'2026-11-01T18:00'}];
const config={source:'Attendance & timesheets',metric:'hours',group:'staff',calculation:'total',from:'2026-11-01',to:'2026-11-01',staff:'staff',department:'Workshop',fields:['title','date','value']};
test('report filters use linked staff IDs, dates, breaks and company scope',()=>{
 const report=buildReport(records,'a',config);assert.equal(report.total,3.5);assert.equal(report.groups[0].label,'Alex');assert.equal(report.accepted.length,1);assert.match(reportCsv(report,config,records),/First shift.*2026-11-01.*3.5/);
 assert.equal(buildReport(records,'a',{...config,to:'2026-11-03'}).excluded,1);
 assert.equal(buildReport(records,'a',{...config,department:'Other'}).total,0);
});
test('previous period is equal duration and export protects spreadsheet formulas',()=>{
 const previous=previousPeriod({...config,from:'2026-11-04',to:'2026-11-06'});assert.equal(previous.from,'2026-11-01');assert.equal(previous.to,'2026-11-03');
 const report=buildReport(records.map(r=>r.id==='one'?{...r,title:'=SUM(1,1)'}:r),'a',config);assert.match(reportCsv(report,config,records),/'=SUM/);
});
test('invoice reporting excludes quotations and averages eligible invoices only',()=>{
 const report=buildReport([{id:'q',orgId:'a',module:'Quotes and invoices',recordType:'quote',amount:500},{id:'i',orgId:'a',module:'Quotes and invoices',recordType:'invoice',documentStatus:'Issued',amount:100,payments:[{amountPence:3000}]}],'a',{source:'Quotes and invoices',metric:'balance',group:'status',calculation:'average'});assert.equal(report.total,70);assert.equal(report.excluded,1);
});
test('alerts reflect live changes with stable IDs and fresh versions for priority changes',()=>{
 const task={id:'t',orgId:'a',module:'Tasks & projects',title:'Urgent repair',ownerId:'staff',priority:'Urgent',status:'Planned',dueDate:'2026-11-14'};
 const options={now:new Date('2026-11-13T12:00:00Z')};const first=generateNotifications([task],'a',options);assert.equal(first[0].category,'Tasks');assert.equal(first[0].priority,true);assert.equal(first[0].recordId,'t');assert.equal(generateNotifications([{...task,status:'Complete'}],'a',options).length,0);assert.notEqual(first[0].id,generateNotifications([{...task,priority:'Normal'}],'a',options)[0].id);assert.equal(generateNotifications([task],'b',options).length,0);
});
test('low stock, expired qualifications, failed inspections and leave decisions generate specific alerts',()=>{
 const data=[{id:'s',module:'Inventory and stock',quantity:1,reorder:2},{id:'q',module:'Training and qualifications',expiry:'2020-01-01'},{id:'i',module:'Inspections',result:'Fail'},{id:'l',module:'Leave and availability',approval:'Approved'}].map(r=>({...r,orgId:'a',title:r.id}));
 const result=generateNotifications(data,'a');for(const category of ['Stock','People','Inspections'])assert.ok(result.some(n=>n.category===category));assert.ok(result.some(n=>n.title.includes('Leave approved')));
});
test('targeted announcements require matching staff or department and acknowledgement resolves the alert',()=>{
 const notice={id:'n',orgId:'a',module:'Staff communications',title:'Notice',body:'Instruction',status:'Published',audience:'Staff',recipients:['staff'],acknowledgements:[],publishedAt:'2026-11-13T12:00:00Z'};
 assert.equal(noticeRelevant(notice,'other','Workshop'),false);assert.equal(generateNotifications([],'a',{notices:[notice],actorId:'staff'}).length,1);assert.equal(generateNotifications([],'a',{notices:[{...notice,acknowledgements:[{personId:'staff'}]}],actorId:'staff'}).length,0);
});
