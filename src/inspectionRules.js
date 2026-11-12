export function assessInspection(questions,responses) {
  const errors=[];let failed=false;
  for(const q of questions){
    const response=responses[q.id]||{},value=String(response.value??'').trim();
    if(q.required&&!value)errors.push(q.label+': a response is required.');
    if(value&&q.type==='Number'){
      const n=Number(value);
      if(!Number.isFinite(n))errors.push(q.label+': enter a valid measurement.');
      else if(q.minimum!==''&&q.minimum!==undefined&&n<Number(q.minimum)||q.maximum!==''&&q.maximum!==undefined&&n>Number(q.maximum))failed=true;
    }
    if(value&&q.type==='Pass / fail'&&!['Pass','Fail'].includes(value))errors.push(q.label+': select Pass or Fail.');
    if(q.type==='Multiple choice'&&value&&!(q.options||[]).includes(value))errors.push(q.label+': select one of the configured choices.');
    if(value==='Fail')failed=true;
    if(q.evidenceRequired&&!response.evidence?.dataUrl)errors.push(q.label+': local evidence is required.');
  }
  return {errors,result:failed?'Fail':'Pass'};
}
