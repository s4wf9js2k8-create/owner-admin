// GBP demo arithmetic: integer pennies, line-level rounding, inclusive of no tax advice.
function scaled(value,label){
 const text=String(value??'');
 if(!/^\d+(\.\d{1,2})?$/.test(text)||Number(text)>1000000)throw new Error(label+': enter a non-negative number with at most two decimal places (maximum 1,000,000).');
 const [whole,fraction='']=text.split('.');return BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));
}
const round=(value,divisor)=>(value+divisor/2n)/divisor;
export function financialTotals(items){
 if(!items.length)throw new Error('Add at least one line item.');
 const lines=items.map(item=>{
  if(!String(item.description||'').trim())throw new Error('Every line needs a description.');
  const quantity=scaled(item.quantity,'Quantity'),price=scaled(item.rate,'Unit price'),discount=scaled(item.discount||0,'Discount'),vat=scaled(item.vat||0,'VAT');
  if(!quantity||discount>10000n||vat>10000n)throw new Error('Quantity must be positive; discount and VAT must be between 0 and 100%.');
  const gross=round(quantity*price,100n),reduction=round(gross*discount,10000n),net=gross-reduction,tax=round(net*vat,10000n);
  return {...item,gross:Number(gross),discountPence:Number(reduction),net:Number(net),tax:Number(tax),total:Number(net+tax)};
 });
 const sum=field=>{const value=lines.reduce((n,line)=>n+line[field],0);if(!Number.isSafeInteger(value))throw new Error('Document total exceeds the supported precision.');return value;};
 return {lines,subtotal:sum('gross'),discount:sum('discountPence'),net:sum('net'),vat:sum('tax'),total:sum('total')};
}
export const money=pence=>'£'+(Number(pence||0)/100).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
export const documentKind=r=>r.recordType==='invoice'||/^INV-/.test(r.reference||'')?'invoice':'quote';
export const totalPence=r=>r.totals?.total??Math.round(Number(r.amount||0)*100);
export function balancePence(r){return totalPence(r)-(r.payments||[]).reduce((n,p)=>n+p.amountPence,0)-(r.credits||[]).reduce((n,c)=>n+c.amountPence,0);}
export function financialStatus(r,day=new Date().toISOString().slice(0,10)){
 const state=r.documentStatus||(r.paymentStatus==='Sent (demo)'?(documentKind(r)==='invoice'?'Issued':'Sent'):['Accepted','Rejected','Cancelled'].includes(r.paymentStatus)?r.paymentStatus:'Draft');
 if(documentKind(r)==='quote')return !['Draft','Accepted','Rejected','Cancelled'].includes(state)&&r.expiryDate&&r.expiryDate<day?'Expired':state;
 if(state==='Draft'||state==='Cancelled')return state;
 if(balancePence(r)===0)return 'Paid';
 if(r.dueDate&&r.dueDate<day)return 'Overdue';
 return (r.payments||[]).length?'Partially paid':'Issued';
}
export function settlementPence(record,amount){
 const pence=Number(scaled(amount,'Amount'));
 if(!pence||pence>balancePence(record))throw new Error('Amount must be positive and cannot exceed the outstanding balance.');
 return pence;
}
export function nextFinancialReference(records,kind){
 const prefix=kind==='invoice'?'INV-':'Q-';
 const maximum=Math.max(0,...records.filter(r=>String(r.reference||'').startsWith(prefix)).map(r=>Number(r.reference.slice(prefix.length))||0));
 return prefix+String(maximum+1).padStart(4,'0');
}
