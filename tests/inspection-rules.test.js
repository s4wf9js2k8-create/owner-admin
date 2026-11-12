import test from 'node:test';
import assert from 'node:assert/strict';
import {assessInspection} from '../src/inspectionRules.js';
const questions=[{id:'a',label:'Guard secure',type:'Pass / fail',required:true,evidenceRequired:true},{id:'b',label:'Pressure',type:'Number',required:true,minimum:'2',maximum:'5'}];
test('inspection submission rejects missing answers and mandatory evidence',()=>{
 assert.equal(assessInspection(questions,{}).errors.length,3);
 assert.match(assessInspection(questions,{a:{value:'Pass'},b:{value:'3'}}).errors[0],/evidence/);
});
test('failed checks and out-of-range measurements fail the overall inspection',()=>{
 const data={a:{value:'Pass',evidence:{dataUrl:'data:image/png;base64,test'}},b:{value:'6'}};
 assert.equal(assessInspection(questions,data).result,'Fail');
 assert.equal(assessInspection(questions,{...data,b:{value:'3'}}).result,'Pass');
 assert.equal(assessInspection(questions,{...data,a:{value:'Fail',evidence:data.a.evidence}}).result,'Fail');
});
test('invalid numbers and forged multiple-choice values cannot pass validation',()=>{
 assert.match(assessInspection([questions[1]],{b:{value:'no number'}}).errors[0],/measurement/);
 assert.match(assessInspection([{id:'c',label:'Condition',type:'Multiple choice',options:['Good','Poor']}],{c:{value:'Other'}}).errors[0],/configured/);
});
