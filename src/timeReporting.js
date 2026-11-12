// Pure calculations shared by attendance review and CSV export. Fictional data only.
export function weeklyHours(sessions, week) {
  const start=Date.parse(week+"T00:00:00Z"), end=start+7*86400000;
  const rows=new Map();
  for(const entry of sessions){
    if(!entry.startTime||!entry.endTime)continue;
    const from=Date.parse(entry.startTime.endsWith("Z")?entry.startTime:entry.startTime+"Z");
    const until=Date.parse(entry.endTime.endsWith("Z")?entry.endTime:entry.endTime+"Z");
    if(!Number.isFinite(from)||!Number.isFinite(until)||until<=from||until<=start||from>=end)continue;
    const breaks=Number(entry.breakMinutes||0);
    if(!Number.isFinite(breaks)||breaks<0||breaks>(until-from)/60000)continue;
    const key=entry.personId||entry.person;
    if(!key)continue;
    const row=rows.get(key)||{id:key,person:entry.person||key,days:Array(7).fill(0),pending:0};
    const paidRatio=1-breaks/((until-from)/60000);
    for(let i=0;i<7;i++)row.days[i]+=Math.max(0,Math.min(until,start+(i+1)*86400000)-Math.max(from,start+i*86400000))/3600000*paidRatio;
    if(entry.approval!=="Approved")row.pending++;
    rows.set(key,row);
  }
  return [...rows.values()].map(row=>({...row,total:row.days.reduce((n,h)=>n+h,0),overtime:Math.max(0,row.days.reduce((n,h)=>n+h,0)-40)}));
}
export function timesheetCsv(rows){
  const escape=value=>'"'+String(value).replaceAll('"','""')+'"';
  return [["Person","Mon","Tue","Wed","Thu","Fri","Sat","Sun","Total hours","Over 40 hours","Pending sessions"],...rows.map(r=>[r.person,...r.days.map(h=>h.toFixed(2)),r.total.toFixed(2),r.overtime.toFixed(2),r.pending])].map(r=>r.map(escape).join(",")).join("\r\n");
}
