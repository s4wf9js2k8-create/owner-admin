import {noticeRelevant} from './communicationRules.js';
import {moduleInfo,isTaskModule} from './customerModules.js';
import {documentKind,balancePence,financialStatus} from './financialRules.js';
export const notificationCategories=['Tasks','Maintenance','Inspections','People','Stock','Bookings','Finance','Approvals','Communications'];
export function generateNotifications(records,orgId,{reminderDays=14,reminders=true,now=new Date(),notices=[],actorId='',department=''}={}){
 const day=now.toISOString().slice(0,10),limit=new Date(now.getTime()+Math.max(1,Math.min(90,Number(reminderDays)||14))*86400000).toISOString().slice(0,10),notifications=[];
 const add=(r,kind,category,title,priority=false,version='')=>{
  notifications.push({id:r.id+':'+kind+':'+JSON.stringify([r.status,r.approval,r.result,r.ownerId||r.owner,r.personId||r.person,r.dueDate,r.expiry,r.quantity,r.reorder,r.priority,r.documentStatus,version]),recordId:r.id,module:r.module,title,category,priority,at:r.updatedAt||r.createdAt||r.submittedAt||r.startDate||r.dueDate||r.expiry||'',detail:r.title,kind});
 };
 for(const r of records.filter(r=>r.orgId===orgId&&!['inspection-template','report-config'].includes(r.recordType))){
  const type=moduleInfo(r.module).type,open=!['Complete','Cancelled'].includes(r.status);
  if(isTaskModule(r.module)&&r.recordType!=='project'&&open){
   if(r.ownerId||r.owner)add(r,'assignment','Tasks','Assigned: '+r.title,['Urgent','High'].includes(r.priority));
   if(reminders&&r.dueDate&&r.dueDate<=limit)add(r,'deadline','Tasks',(r.dueDate<day?'Overdue: ':'Due soon: ')+r.title,r.dueDate<day||r.priority==='Urgent',r.dueDate<day?'overdue':'upcoming');
   else if(['Urgent','High'].includes(r.priority))add(r,'priority','Tasks','High priority: '+r.title,true);
  }
  if(type==='maintenance'&&open&&reminders&&r.dueDate&&r.dueDate<day)add(r,'overdue','Maintenance','Overdue maintenance: '+r.title,true);
  if(type==='inspections'&&['Fail','Requires attention'].includes(r.result))add(r,'failed','Inspections','Failed inspection: '+r.title,true,r.submittedAt||'');
  if(type==='leave')add(r,'leave','People',(r.approval==='Pending'?'Leave approval required: ':'Leave '+String(r.approval||'pending').toLowerCase()+': ')+r.title,r.approval==='Pending');
  if(type==='training'&&r.noExpiry!==true){
   if(!r.expiry)add(r,'validity','People','Qualification validity not recorded: '+r.title,true);
   else if(r.expiry<=limit)add(r,'qualification','People',(r.expiry<day?'Expired qualification: ':'Qualification expiring: ')+(r.qualification||r.title),r.expiry<day,r.expiry<day?'expired':'expiring');
  }
  if(type==='inventory'&&Number.isFinite(Number(r.quantity))&&Number(r.quantity)<=Number(r.reorder||0))add(r,'stock','Stock','Low stock: '+r.title,true);
  if(['events','bookings'].includes(type)&&r.recordType!=='booking'&&r.startTime?.slice(0,10)>=day&&r.startTime?.slice(0,10)<=limit&&r.status!=='Cancelled')add(r,'booking','Bookings','Upcoming: '+r.title,false,r.startTime);
  if(type==='finance'&&documentKind(r)==='invoice'&&financialStatus(r,day)==='Overdue')add(r,'invoice','Finance','Overdue fictional invoice: '+r.reference,true,balancePence(r));
  if(r.submittedAt&&r.approval==='Pending'||r.documentStatus==='Awaiting approval')add(r,'approval','Approvals','Approval required: '+r.title,true,r.submittedAt||'');
 }
 for(const n of notices.filter(n=>n.orgId===orgId&&n.status==='Published'&&noticeRelevant(n,actorId,department)&&!(n.acknowledgements||[]).some(a=>a.personId===actorId))){
  notifications.push({id:n.id+':notice:'+n.publishedAt,recordId:n.id,module:n.module,title:n.title,category:'Communications',priority:n.priority==='Important',at:n.publishedAt,detail:n.body,kind:'notice'});
 }
 return notifications.sort((a,b)=>Number(b.priority)-Number(a.priority)||String(b.at).localeCompare(String(a.at)));
}
