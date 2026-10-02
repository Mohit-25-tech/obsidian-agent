function protectText(value){
 const text=String(value);
 return /^[\t\r ]*[=+\-@]/.test(text)?"'"+text:text;
}
function cell(value){
 if(value===null||value===undefined)return '';
 const text=typeof value==='number'&&Number.isFinite(value)?String(value):protectText(value);
 return /[",\r\n]/.test(text)?'"'+text.replaceAll('"','""')+'"':text;
}
function serialize(headers,rows){
 return [headers,...rows].map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';
}
module.exports={cell,serialize};
