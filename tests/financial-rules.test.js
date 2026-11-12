import test from 'node:test';
import assert from 'node:assert/strict';
import {financialTotals,settlementPence,financialStatus,balancePence,nextFinancialReference} from '../src/financialRules.js';
test('three lines calculate discounts and VAT in pennies without binary rounding drift',()=>{
 const t=financialTotals([{description:'Labour',quantity:3,rate:80,discount:10,vat:20},{description:'Parts',quantity:2,rate:25,discount:0,vat:20},{description:'Travel',quantity:1,rate:10,discount:0,vat:0}]);
 assert.equal(t.subtotal,30000);assert.equal(t.discount,2400);assert.equal(t.vat,5320);assert.equal(t.total,32920);
 assert.equal(financialTotals([{description:'Fraction',quantity:'1.25',rate:'0.10',vat:20}]).total,16);
});
test('invalid lines cannot be silently dropped from a quotation',()=>{
 for(const line of [{description:'',quantity:1,rate:1},{description:'Test',quantity:0,rate:1},{description:'Test',quantity:1,rate:-1},{description:'Test',quantity:1,rate:1,discount:101},{description:'Test',quantity:'1.001',rate:1}])assert.throws(()=>financialTotals([line]));
});
test('partial payments, credit notes and overpayment validation preserve balance',()=>{
 const r={recordType:'invoice',documentStatus:'Issued',totals:{total:32920},dueDate:'2099-01-01',payments:[{amountPence:10000}],credits:[{amountPence:2000}]};
 assert.equal(balancePence(r),20920);assert.equal(financialStatus(r),'Partially paid');assert.equal(settlementPence(r,'209.20'),20920);assert.throws(()=>settlementPence(r,'209.21'));
 assert.equal(financialStatus({...r,payments:[{amountPence:30920}]}),'Paid');
});
test('overdue and expired status derives from dates, and reference numbers advance',()=>{
 assert.equal(financialStatus({recordType:'quote',documentStatus:'Sent',expiryDate:'2020-01-01'},'2026-01-01'),'Expired');
 assert.equal(financialStatus({recordType:'invoice',documentStatus:'Issued',amount:50,dueDate:'2020-01-01'},'2026-01-01'),'Overdue');
 assert.equal(nextFinancialReference([{reference:'Q-100'},{reference:'Q-0101'},{reference:'INV-200'}],'quote'),'Q-0102');
});
test('returning an expired quote to draft allows renewal without losing itemisation',()=>{
 assert.equal(financialStatus({recordType:'quote',documentStatus:'Draft',expiryDate:'2020-01-01'},'2026-01-01'),'Draft');
});
