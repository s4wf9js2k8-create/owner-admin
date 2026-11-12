// Print only the rendered document, keeping private notes and workspace controls out.
export function printFinancialDocument(element,title){
 const preview=window.open('','_blank');
 if(!preview)return false;
 preview.opener=null;
 preview.document.open();
 preview.document.write('<!doctype html><html><head><meta charset="utf-8"><style>body{font:14px Arial,sans-serif;color:#243a2b;margin:28px}header{display:flex;justify-content:space-between;border-bottom:3px solid #365c40;padding-bottom:16px}h2{margin-top:0}h3{font-size:16px}.document-parties{display:flex;justify-content:space-between;gap:30px;margin:24px 0}.financial-preview-lines>div{display:grid;grid-template-columns:1fr auto;gap:8px;padding:12px 0;border-bottom:1px solid #ddd;break-inside:avoid}.financial-preview-lines small{grid-column:1}.financial-preview-lines b{grid-column:2;grid-row:1/3;align-self:center}.financial-totals{display:grid;grid-template-columns:1fr auto;gap:10px;max-width:350px;margin:24px 0 24px auto;padding:16px;background:#f1f5f2;break-inside:avoid}dd{text-align:right;margin:0;font-weight:bold}footer{border-top:1px solid #ddd;padding-top:16px;font-size:11px}button{margin-bottom:20px;padding:10px 16px}@media print{button{display:none}body{margin:0}@page{margin:16mm}}</style></head><body></body></html>');
 preview.document.close();preview.document.title=title;
 const button=preview.document.createElement('button');button.textContent='Print / save as PDF';button.onclick=()=>preview.print();preview.document.body.appendChild(button);
 preview.document.body.appendChild(element.cloneNode(true));preview.focus();
 return true;
}
