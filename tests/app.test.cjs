const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const Studio=require('../materials.js');
const StudioZip=require('../zip.js');
// Small event/DOM harness for integration of the app with storage, copy and downloads.
// It does not emulate browser layout, installation or native permission dialogs.
class Element {
  constructor() { this.value=''; this.dataset={}; this.children=[]; this.events={}; this.textContent=''; this.attrs={}; this.classList={add(){},remove(){},toggle(){}}; }
  addEventListener(type, fn) { this.events[type]=fn; }
  async emit(type) { return this.events[type]?.({preventDefault(){}}); }
  click() { return this.emit('click'); }
  append(...elements) { this.children.push(...elements); }
  replaceChildren(...elements) { this.children=elements; }
  setAttribute(k,v) { this.attrs[k]=v; }
  setCustomValidity(value) { this.validity=value; }
  reportValidity() {} focus() {} select() {} remove() {} scrollIntoView() {}
}
function app({store=new Map(),deny=false,browserScripts=false}={}) {
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'), els={};
  for(const id of html.matchAll(/id="([^"]+)"/g)) els['#'+id[1]]=new Element();
  els['.result']=new Element();
  els['#theme'].value='白Tとデニム'; els['#tone'].value='guide'; els['#audience'].value='アメカジ初心者'; els['#style'].value='classic';
  const tabs=[...html.matchAll(/data-tab="([^"]+)"/g)].map(m=>{const e=new Element();e.dataset.tab=m[1];return e;});
  const examples=[...html.matchAll(/data-example="([^"]+)"/g)].map(m=>{const e=new Element();e.dataset.example=m[1];return e;});
  const downloads=[],copied=[],localStorage={getItem:k=>{if(deny)throw Error('blocked');return store.get(k)||null;},setItem:(k,v)=>{if(deny)throw Error('quota');store.set(k,v);}};
  const context=vm.createContext({Studio,StudioZip,document:{querySelector:s=>{assert(els[s],`Missing selector ${s}`);return els[s];},querySelectorAll:s=>s==='[data-tab]'?tabs:examples,createElement:()=>new Element(),body:new Element(),execCommand:()=>true},localStorage,innerWidth:393,navigator:{clipboard:{writeText:async text=>copied.push(text)}},Blob,URL:{createObjectURL:b=>{downloads.push(b);return 'blob:fake';},revokeObjectURL(){}},setTimeout:()=>0,clearTimeout(){},console});
  if(browserScripts) { delete context.Studio; delete context.StudioZip; for(const name of ['scene-kit.js','materials.js','zip.js']) vm.runInContext(fs.readFileSync(path.join(__dirname,'..',name),'utf8'),context); }
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../app.js'),'utf8'),context);
  return {els,tabs,store,downloads,copied,context,submit:()=>els['#form'].emit('submit'),tab:async name=>tabs.find(t=>t.dataset.tab===name).click()};
}
test('generate, switch all five tabs and copy the selected material',async()=>{
  const a=app(); a.els['#theme'].value='ChampionとDickies';a.els['#style'].value='hiphop'; await a.submit();
  assert.equal(a.els['#panel'].children.length,6); assert.equal(a.els['#concept'].textContent,'ChampionとDickies'); assert.equal(a.els['#tone-label'].textContent,'90年代HIPHOP');
  for(const tab of ['script','subtitle','narration','prompt','posting']) {await a.tab(tab);await a.els['#copy-tab'].click(); assert(a.copied.at(-1).length>0);}
  assert(a.copied.at(-1).includes('【TikTok】')); await a.els['#all-copy'].click(); assert(a.copied.at(-1).includes('subtitles.srt'));
});
test('edited output persists across reload and history reuse without duplicate entries',async()=>{
  const a=app();await a.submit();await a.tab('narration');a.els['#panel'].children[0].value='編集済み原稿';await a.els['#panel'].children[0].emit('input');
  a.els['#theme'].value='別のテーマ';await a.submit();
  const b=app({store:a.store});assert.equal(b.els['#concept'].textContent,'別のテーマ');
  await b.els['#history-list'].children[1].click();await b.tab('narration');assert.equal(b.els['#panel'].children[0].value,'編集済み原稿');
  assert.equal(JSON.parse(b.store.get('amekaji-history-v2')).length,2);
});
test('editing a scene and outfit is reflected in text and ZIP exports',async()=>{
  const a=app();await a.submit();
  const t=a.els['#panel'].children[0].children[1].children[1];t.value='独自のシーン';await t.emit('input');
  a.els['#outfit'].value='独自のコーデ';await a.els['#outfit'].emit('input');
  await a.els['#copy-tab'].click();assert(a.copied[0].includes('独自のシーン'));assert(a.copied[0].includes('独自のコーデ'));
  await a.els['#zip-download'].click();assert.equal(a.downloads[0].type,'application/zip');assert((await a.downloads[0].text()).includes('独自のシーン'));
  await a.tab('subtitle');await a.els['#download'].click();assert((await a.downloads[1].text()).includes('00:00:30,000'));
});
test('storage failure leaves generation, copy and ZIP available with a visible warning',async()=>{
  const a=app({deny:true});await a.submit();assert.equal(a.els['#panel'].children.length,6);assert(a.els['#storage-note'].textContent.includes('保存できません'));
  await a.els['#copy-tab'].click();assert(a.copied.length);await a.els['#zip-download'].click();assert(a.downloads.length);
});
test('legacy saved draft is restored and malformed storage falls back safely',async()=>{
  const old=Studio.makeState('以前のテーマ');delete old.style;delete old.posting;delete old.outfit;old.narration='以前の編集';
  const store=new Map([['amekaji-v1',JSON.stringify({state:old})],['amekaji-history-v2','broken JSON']]);
  const a=app({store});assert.equal(a.els['#concept'].textContent,'以前のテーマ');await a.tab('narration');assert.equal(a.els['#panel'].children[0].value,'以前の編集');
  const b=app({store:new Map([['amekaji-v1','{broken'],['amekaji-history-v2','[null,{},1]']])});assert.equal(b.els['#panel'].children.length,6);
});
test('blank input does not replace the current result and HTML-like input remains text',async()=>{
  const a=app();const before=a.els['#concept'].textContent;a.els['#theme'].value=' ';await a.submit();assert.equal(a.els['#concept'].textContent,before);
  a.els['#theme'].value='<img src=x onerror=alert(1)>';await a.submit();assert.equal(a.els['#concept'].textContent,'<img src=x onerror=alert(1)>');assert.equal(a.els['#concept'].children.length,0);
});
function control(element,aria){
 if(element.attrs?.['aria-label']===aria)return element;
 for(const child of element.children||[]){const found=control(child,aria);if(found)return found;}
}
test('Ver.3 collapsible panel edits are drafts until saved, update copy/history, and reset',async()=>{
 const a=app();await a.submit();
 let first=a.els['#panel'].children[0],other=JSON.stringify(a.context.Studio.normalize(JSON.parse(a.store.get('amekaji-v1')).state).scenes.slice(1));
 const baseline=JSON.parse(a.store.get('amekaji-v1')).state.scenes[0].top.color;
 const input=control(first,'シーン1 色'); // first color control belongs to outer
 input.value='金色';await input.emit('input');
 await a.els['#copy-tab'].click();assert(!a.copied.at(-1).includes('金色'));
 await control(first,'シーン1を保存').click();await a.tab('prompt');await a.els['#copy-tab'].click();assert(a.copied.at(-1).includes('金色'));
 const saved=JSON.parse(a.store.get('amekaji-v1')).state;
 assert.equal(JSON.stringify(saved.scenes.slice(1)),other);assert.equal(saved.scenes[0].outer.color,'金色');
 const b=app({store:a.store});first=b.els['#panel'].children[0];await control(first,'シーン1を初期提案に戻す').click();
 assert.notEqual(JSON.parse(b.store.get('amekaji-v1')).state.scenes[0].outer.color,'金色');assert.equal(JSON.parse(b.store.get('amekaji-v1')).state.scenes[0].top.color,baseline);
});
test('Ver.3 same mode shares model/clothes and keeps per-scene subtitle edits independent',async()=>{
 const a=app();a.els['#mode'].value='same';await a.submit();
 let first=a.els['#panel'].children[0];const hair=control(first,'シーン1 髪型');hair.value='変更した髪型';await hair.emit('input');
 const sub=control(first,'シーン1 字幕');sub.value='個別字幕';await sub.emit('input');
 await control(first,'シーン1を保存').click();
 const s=JSON.parse(a.store.get('amekaji-v1')).state;assert(s.scenes.every(x=>x.model.hair==='変更した髪型'));assert.equal(s.scenes[0].subtitle,'個別字幕');assert.notEqual(s.scenes[1].subtitle,'個別字幕');
 await a.tab('subtitle');await a.els['#download'].click();assert((await a.downloads.at(-1).text()).includes('個別字幕'));
});
test('Ver.3 saving settings does not undo an inline script edit',async()=>{
 const a=app();await a.submit();const card=a.els['#panel'].children[0];
 const inline=card.children[1].children[1];inline.value='残したい台本';await inline.emit('input');
 await control(card,'シーン1を保存').click();assert.equal(JSON.parse(a.store.get('amekaji-v1')).state.scenes[0].text,'残したい台本');
});
test('Ver.3 scene panels use native collapsed details and accessible text controls',async()=>{
 const a=app();await a.submit();const panels=a.els['#panel'].children.map(c=>c.children[2]);assert.equal(panels.length,6);
 panels.forEach((p,i)=>{assert.equal(p.open,false);for(const title of ['年代','髪型','ひげ','体型','雰囲気','場所','時間帯','ポーズ・カメラアングル','字幕','ナレーション'])assert(control(p,`シーン${i+1} ${title}`));assert(control(p,`シーン${i+1}を保存`));assert(control(p,`シーン${i+1}を初期提案に戻す`));});
});

test('real browser script order initializes Ver.3 globals and six editing panels',async()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const scripts=[...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(scripts,['scene-kit.js','materials.js','zip.js','app.js','pwa.js']);
 assert(html.includes('id="mode"'));assert(html.includes('LOCAL TEMPLATES / V.03'));
 const a=app({browserScripts:true});await a.submit();
 assert.equal(a.els['#panel'].children.length,6);assert(control(a.els['#panel'].children[0],'シーン1を保存'));
 assert.equal(JSON.parse(a.store.get('amekaji-v1')).state.mode,'multi');
});
