const assert=require('node:assert/strict');
const CSV=require('../shared/obsidian_ui/plugin-src/csv.js');

const output=CSV.serialize(
 ['Name','Amount','Note','Missing'],
 [
  ['Shop, Inc.',-12.5,'He said "hello"',null],
  ['Line break',0,'first\nsecond',undefined],
  ['Formula','=SUM(A1:A2)','+cmd','@user'],
  ['Text negative','-10',' safe','plain'],
 ],
);
assert.equal(output,
 'Name,Amount,Note,Missing\r\n'+
 '"Shop, Inc.",-12.5,"He said ""hello""",\r\n'+
 'Line break,0,"first\nsecond",\r\n'+
 "Formula,'=SUM(A1:A2),'+cmd,'@user\r\n"+
 "Text negative,'-10, safe,plain\r\n");
assert.equal(CSV.cell(-4),'-4','typed negative numbers stay numeric');
assert.equal(CSV.cell('-4'),"'-4",'spreadsheet-sensitive text is neutralized');
console.log('Dashboard CSV: escaping, nulls, numeric values and formula protection passed');
