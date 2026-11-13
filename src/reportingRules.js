import {moduleInfo} from './customerModules.js';
import {documentKind,totalPence,balancePence,financialStatus} from './financialRules.js';
export const reportDate=r=>String(r.startTime||r.operationDate||r.date||r.creationDate||r.dueDate||r.createdAt||'').slice(0,10);
export function reportStatus(r){const type=moduleInfo(r.module).type;if(type==='finance')return financialStatus(r);if(type==='inspections')return r.result||r.status||'Not recorded';if(type==='people')return r.employmentStatus||r.staffStatus||'Not recorded';return (['leave','timesheets','training','documents'].includes(type)?r.approval:r.status)||r.status||'Not recorded';}
export function reportPerson(r,records){
 const ids=[r.personId,r.ownerId,r.engineerId,r.inspectorId,r.custodianId];
 return records.find(p=>p.orgId===r.orgId&&moduleInfo(p.module).type==='people'&&ids.includes(p.id))||records.find(p=>p.orgId===r.orgId&&moduleInfo(p.module).type==='people'&&[r.person,r.owner,r.inspector].includes(p.title));
}
export const metricOptions=type=>[{id:'count',label:'Record count',unit:'records'},...(type==='timesheets'?[{id:'hours',label:'Completed hours (breaks deducted)',unit:'hours'}]:[]),...(type==='finance'?[{id:'invoiceTotal',label:'Fictional invoice face value',unit:'GBP'},{id:'balance',label:'Outstanding invoice balance',unit:'GBP'}]:[]),...(type==='inventory'?[{id:'quantity',label:'Current stock units',unit:'units'}]:[]),...(type==='visitors'?[{id:'visitors',label:'Visitor count',unit:'visitors'}]:[]),...(type==='donations'?[{id:'amount',label:'Fictional donations',unit:'GBP'}]:[]),...(type==='maintenance'?[{id:'labour',label:'Recorded labour',unit:'hours'},{id:'parts',label:'Parts issued to jobs',unit:'units'}]:[])];
export function reportValue(r,metric){
 if(metric==='count')return 1;
 if(metric==='hours'){
  if(!r.startTime||!r.endTime)return null;
  const minutes=(Date.parse(r.endTime)-Date.parse(r.startTime))/60000,breaks=Number(r.breakMinutes||0);
  return Number.isFinite(minutes)&&Number.isFinite(breaks)&&minutes>=0&&breaks>=0&&breaks<=minutes?(minutes-breaks)/60:null;
 }
 if(metric==='balance'&&['Draft','Cancelled'].includes(financialStatus(r)))return null;
 if(['invoiceTotal','balance'].includes(metric))return documentKind(r)==='invoice'?(metric==='invoiceTotal'?totalPence(r):balancePence(r))/100:null;
 if(metric==='labour')return (r.workLogs||[]).reduce((n,l)=>n+Number(l.minutes||0),0)/60;
 if(metric==='parts')return (r.partsUsed||[]).reduce((n,p)=>n+Number(p.qty||0),0);
 const field={quantity:'quantity',visitors:'count',amount:'amount'}[metric],value=Number(r[field]);
 return field&&r[field]!==undefined&&Number.isFinite(value)?value:null;
}
export function buildReport(records,orgId,config){
 const scoped=records.filter(r=>r.orgId===orgId&&!['report-config','inspection-template'].includes(r.recordType));
 const rows=scoped.filter(r=>r.module===config.source).filter(r=>{
  const person=reportPerson(r,records),date=reportDate(r);
  return (!config.from||date&&date>=config.from)&&(!config.to||date&&date<=config.to)&&(!config.staff||person?.id===config.staff)&&(!config.department||(r.team||person?.team||person?.department)===config.department)&&(!config.location||r.location===config.location)&&(!config.status||reportStatus(r)===config.status)&&(!config.category||(r.category||r.condition||r.result||r.recordType||'Not recorded')===config.category);
 });
 const metric=metricOptions(moduleInfo(config.source).type).some(m=>m.id===config.metric)?config.metric:'count';
 const accepted=rows.map(record=>({record,value:reportValue(record,metric)})).filter(r=>r.value!==null&&Number.isFinite(r.value));
 const grouping=r=>config.group==='staff'?reportPerson(r,records)?.title||r.person||r.owner||'Unassigned':config.group==='department'?r.team||reportPerson(r,records)?.team||'Not recorded':config.group==='date'?reportDate(r)||'Undated':config.group==='location'?r.location||'Not recorded':config.group==='category'?r.category||r.condition||r.result||r.recordType||'Not recorded':reportStatus(r);
 const buckets=new Map();
 for(const row of accepted){const key=grouping(row.record);if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(row);}
 const calculate=list=>config.calculation==='average'?(list.length?list.reduce((n,r)=>n+r.value,0)/list.length:0):list.reduce((n,r)=>n+r.value,0);
 return {rows,accepted,excluded:rows.length-accepted.length,total:calculate(accepted),groups:[...buckets.entries()].map(([label,list])=>({label,value:calculate(list),count:list.length,ids:list.map(r=>r.record.id)})),undated:rows.filter(r=>!reportDate(r)).length};
}
export function previousPeriod(config){
 if(!config.from||!config.to||config.from>config.to)return null;
 const start=Date.parse(config.from+'T00:00:00Z'),end=Date.parse(config.to+'T00:00:00Z'),duration=end-start+86400000;
 if(!Number.isFinite(duration)||duration<=0)return null;
 return {...config,from:new Date(start-duration).toISOString().slice(0,10),to:new Date(start-86400000).toISOString().slice(0,10)};
}
export const reportFields={title:'Record',date:'Report date',status:'Status',staff:'Staff',department:'Department',location:'Location',value:'Metric value'};
export function reportCsv(report,config,records){
 const escape=value=>'"'+String(value??'').replace(/^\s*[=+@-]/,"'$&").replaceAll('"','""')+'"';
 const fields=(config.fields||Object.keys(reportFields)).filter(f=>reportFields[f]);
 const lines=[fields.map(f=>reportFields[f]),...report.accepted.map(({record:r,value})=>{const person=reportPerson(r,records);const values={title:r.title,date:reportDate(r),status:reportStatus(r),staff:person?.title||r.person||r.owner||'',department:r.team||person?.team||'',location:r.location||'',value:Number(value.toFixed(2))};return fields.map(f=>values[f]);})];
 return '\ufeff'+lines.map(row=>row.map(escape).join(',')).join('\r\n');
}
