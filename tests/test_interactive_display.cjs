const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const core=require('../shared/obsidian_ui/plugin-src/core.js');
const cfg=JSON.parse(fs.readFileSync('config/obsidian_ui.en.yaml.example'));cfg.locale='en';
class Element {
 constructor(tag,opts={}){this.tag=tag;this.textContent=opts.text;this.children=[];this.attrs={};}
 createEl(tag,opts){const e=new Element(tag,opts);this.children.push(e);return e;}
 createDiv(opts){return this.createEl('div',opts);}
 setAttribute(k,v){this.attrs[k]=v;}
 empty(){this.children=[];}
 all(tag){return this.children.flatMap(e=>[...(e.tag===tag?[e]:[]),...e.all(tag)]);}
}
let persisted=JSON.stringify({page:{preset:'custom',from:'2026-09-01',to:'2026-09-03',filters:{}},cards:{expense:{table:true,grain:'day'}}});
let active=0;
const sandbox={chartCore:core,Intl,console,app:{vault:{getName:()=> 'Test'}},localStorage:{getItem:()=>persisted,setItem:(k,v)=>persisted=v},getComputedStyle:()=>({getPropertyValue:()=> '#000'}),ResizeObserver:class{observe(){}disconnect(){}},echarts:{init:()=>{active++;return {setOption(){},on(){},resize(){},dispose(){active--;}}}}};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync('shared/obsidian_ui/plugin-src/dashboard.js','utf8'),sandbox);
const container=new Element('div'),dv={container,component:{register(){}}};
const data={charts:[{id:'expense',title:'Expense',type:'bar',method:'sum',rows:[{date:'2026-09-01',value:10,series:'Food'}]}]};
const close=sandbox.renderInteractive(dv,cfg,'test',data);
assert.equal(active,1,'old persisted table state must not hide the chart');
assert.equal(container.all('table').length,0);
container.all('button').find(b=>b.textContent===cfg.labels.show_table).onclick();
assert.equal(active,1,'opening a table must keep the chart');
assert.equal(container.all('table').length,1);
container.all('button').find(b=>b.textContent===cfg.labels.hide_table).onclick();
assert.equal(active,1);assert.equal(container.all('table').length,0);
assert.equal(JSON.parse(persisted).cards.expense.grain,'day');
close();assert.equal(active,0,'chart listeners must be disposed');
console.log('Display regression: persisted table, table toggle and cleanup passed');
let deadlineOption,deadlineClick;
sandbox.echarts.init=()=>({setOption(o){deadlineOption=o;},on(_,fn){deadlineClick=fn;},resize(){},dispose(){}});
const deadlineContainer=new Element('div');
const stop=sandbox.renderInteractive({container:deadlineContainer,component:{register(){}}},cfg,'progress',{charts:[{id:'deadline_dates',title:'Deadlines',type:'categorical',horizontal:true,snapshot:'2026-09-03',filter_fields:['category'],rows:[{date:'2026-10-01',x:'2026-10-01',series:'Later',value:1,category:'Work',description:'Future task'}]}]});
assert.equal(deadlineOption.yAxis.inverse,true);
assert.equal(deadlineOption.yAxis.data[0],'2026-10-01','snapshot includes future deadlines outside past page range');
assert.equal(deadlineOption.xAxis.minInterval,1);
deadlineClick({name:'2026-10-01'});
assert.ok(deadlineContainer.all('td').some(e=>e.textContent==='Future task'));
stop();console.log('Deadline snapshot: future dates, horizontal axis and task drilldown passed');

// A chart reset must preserve page controls and a neighboring chart's overrides.
persisted=JSON.stringify({
 page:{preset:'custom',from:'2026-09-01',to:'2026-09-03',filters:{category:'Health'}},
 cards:{
  first:{own:true,from:'2026-09-02',to:'2026-09-03',grain:'week',compare:true,smooth:'7'},
  second:{own:true,from:'2026-09-01',to:'2026-09-02',grain:'day',compare:true,smooth:'7'},
 },
});
const chartRows=[{date:'2026-09-01',value:1,series:'Steps',category:'Health'},
 {date:'2026-09-02',value:2,series:'Steps',category:'Health'},
 {date:'2026-09-03',value:3,series:'Steps',category:'Health'}];
const resetData={filters:['category'],charts:[
 {id:'first',title:'First',type:'line',method:'sum',smooth:true,filter_fields:['category'],rows:chartRows},
 {id:'second',title:'Second',type:'line',method:'sum',smooth:true,filter_fields:['category'],rows:chartRows},
]};
const resetContainer=new Element('div');
const resetClose=sandbox.renderInteractive({container:resetContainer,component:{register(){}}},cfg,'reset-test',resetData);
const firstCard=resetContainer.all('section').find(s=>s.all('h3')[0]?.textContent==='First');
const resetButton=firstCard.all('button').find(b=>b.textContent===cfg.labels.reset_chart);
assert.equal(resetButton.tag,'button','native button supports Enter and Space activation');
assert.equal(resetButton.type,'button');
resetButton.onclick();
let resetState=JSON.parse(persisted);
assert.deepEqual(resetState.page.filters,{category:'Health'});
assert.equal(resetState.page.from,'2026-09-01');assert.equal(resetState.page.to,'2026-09-03');
assert.equal(resetState.cards.first.own,false,'reset chart inherits page dates');
assert.equal(resetState.cards.first.grain,'auto');
assert.equal(resetState.cards.first.compare,false);
assert.equal(resetState.cards.first.smooth,'0');
assert.equal(resetState.cards.first.from,resetState.page.from);
assert.equal(resetState.cards.first.to,resetState.page.to);
assert.equal(resetState.cards.second.own,true);
assert.equal(resetState.cards.second.grain,'day');
assert.equal(resetState.cards.second.compare,true);
assert.equal(resetState.cards.second.smooth,'7');
resetClose();
const reopened=new Element('div');
const reopenClose=sandbox.renderInteractive({container:reopened,component:{register(){}}},cfg,'reset-test',resetData);
resetState=JSON.parse(persisted);
assert.equal(resetState.cards.first.own,false,'reset remains saved after reopening');
assert.equal(resetState.cards.second.own,true,'other chart survives reopening');
reopenClose();console.log('Per-chart reset: keyboard control, isolation and persistence passed');
