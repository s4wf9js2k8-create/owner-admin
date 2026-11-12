import test from 'node:test';
import assert from 'node:assert/strict';
import {weeklyHours,timesheetCsv} from '../src/timeReporting.js';
const session={personId:'a',person:'Alex',startTime:'2026-11-09T22:00',endTime:'2026-11-10T02:00',breakMinutes:30,approval:'Approved'};
test('weekly report splits overnight hours and deducts proportional breaks',()=>{
 const [row]=weeklyHours([session],'2026-11-09');
 assert.deepEqual(row.days,[1.75,1.75,0,0,0,0,0]);
 assert.equal(row.total,3.5);assert.equal(row.pending,0);
});
test('report excludes invalid and open entries and clips week boundaries',()=>{
 const rows=weeklyHours([session,{...session,endTime:''},{...session,breakMinutes:999},{...session,startTime:'2026-11-08T23:00',endTime:'2026-11-09T01:00',breakMinutes:0}],'2026-11-09');
 assert.equal(rows[0].total,4.5);
});
test('weekly CSV quotes names and matches calculated hours',()=>{
 const rows=weeklyHours([{...session,person:'Alex, "Engineer"'}],'2026-11-09');
 assert.match(timesheetCsv(rows),/"Alex, ""Engineer"""/);
 assert.match(timesheetCsv(rows),/"3.50"/);
});
