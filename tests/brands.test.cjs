const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const R=require('../brand-rules'),S=require('../materials'),{zip}=require('../zip');
const clone=v=>JSON.parse(JSON.stringify(v));
const selected=ids=>({mode:'selected',selected:ids});
const make=(theme='秋のアメカジ',ids=['champion'],style='classic',mode='multi')=>S.makeState(theme,'guide','大人のカジュアル派',style,mode,selected(ids));
const garments=s=>s.scenes.flatMap(x=>['outer','top','pants','shoes'].map(k=>[k,x[k]]));
const named=s=>[...new Set(garments(s).map(([,x])=>x.brand).filter(Boolean))];
const shape=s=>['outer','top','pants','shoes'].map(k=>`${s[k].brand}/${s[k].type}/${s[k].silhouette||''}`).join('|');
test('catalogue has all 16 brands and distinguishes user-supplied models/line from categories',()=>{
 assert.equal(R.brands.length,16);assert.equal(new Set(R.brands.map(b=>b.id)).size,16);
 assert.deepEqual(R.brands.map(b=>b.name),["Levi's",'Lee','Wrangler','Carhartt','Dickies','Ben Davis','Red Kap','Champion','Russell Athletic','Hanes','GAP','Ralph Lauren','Schott','Alpha Industries','L.L.Bean','Eddie Bauer']);
 for(const b of R.brands){assert(b.styles.length);assert(b.aliases.length);for(const i of b.items){assert(['outer','top','pants'].includes(i.category));assert(['model','line','category'].includes(i.kind));assert(i.colors.length);assert(i.silhouettes.length);assert(i.seasons.length);}}
 assert.deepEqual(R.brands.flatMap(b=>b.items.filter(i=>i.kind==='model').map(i=>i.id)).sort(),['101','501','505','550','874']);
});
test('each single selected brand produces six distinct, catalogue-compatible looks in all styles',()=>{
 for(const b of R.brands)for(const style of Object.keys(S.styles)){
  const s=make('秋のコーデ',[b.id],style);assert.deepEqual(named(s),[b.name]);
  assert.equal(new Set(s.scenes.map(x=>JSON.stringify([x.outer,x.top,x.pants,x.shoes]))).size,6);
  for(const [category,g] of garments(s))if(g.brand){const it=b.items.find(i=>i.category===category&&i.type===g.type);assert(it);assert(it.colors.includes(g.color));if(category==='pants')assert(it.silhouettes.includes(g.silhouette));}
  for(let i=1;i<6;i++)assert.notEqual(shape(s.scenes[i]),shape(s.scenes[i-1]));
 }
});
test('multiple selected brands are used fairly and no non-selected brand enters any garment',()=>{
 for(const ids of [['champion','dickies'],['lee','wrangler','ben-davis'],R.brands.map(b=>b.id)]){
  const s=make('秋のコーデ',ids),allowed=ids.map(id=>R.brands.find(b=>b.id===id).name);
  assert(named(s).every(n=>allowed.includes(n)));assert.equal(named(s).length,ids.length);
 }
 const s=make('秋のコーデ',R.brands.map(b=>b.id)),counts=R.brands.map(b=>garments(s).filter(([,g])=>g.brand===b.name).length);
 assert(Math.max(...counts)-Math.min(...counts)<=1);
});
test('selected mode requires at least one registered selection and deduplicates ids',()=>{
 assert.throws(()=>make('休日',[]),/選択/);assert.throws(()=>make('休日',['not-registered']),/選択/);
 assert.deepEqual(R.settings(selected(['lee','lee','not-registered'])),selected(['lee']));
});
test('auto mode proposes multiple deterministic brands with four style-specific results',()=>{
 const outputs=[];for(const style of Object.keys(S.styles)){
  const a=R.plan('休日のコーデ',style,{mode:'auto'}),b=R.plan('休日のコーデ',style,{mode:'auto'});
  assert(a.usedBrands.length>=6);assert.deepEqual(a.outfits,b.outfits);outputs.push(JSON.stringify(a.outfits));
 }
 assert.equal(new Set(outputs).size,4);
});
test('Carhartt is neither a fixed first brand nor present in every automatic style',()=>{
 const adult=S.makeState('休日のコーデ','guide','大人','adult');assert(!named(adult).includes('Carhartt'));
 const street=S.makeState('休日のコーデ','guide','大人','street');assert(!named(street).includes('Carhartt'));
 const classic=S.makeState('休日のコーデ');assert.notEqual(classic.scenes[0].outer.brand,'Carhartt');assert(garments(classic).filter(([,g])=>g.brand==='Carhartt').length<=2);
});
test('theme brands and known model numbers take priority and stay in their categories',()=>{
 for(const [theme,id,product] of [["Levi's 501",'levis','501'],['リーバイス505','levis','505'],['Levis550','levis','550'],['Lee 101','lee','101'],['874','dickies','874']]){
  const r=R.recognize(theme);assert(r.requests.some(x=>x.brand===id&&x.items.includes(product)));
  S.makeState(theme).scenes.forEach(x=>{assert(x.pants.type.includes(product));assert(!x.outer.type.includes(product));});
 }
 const s=S.makeState('ChampionのスウェットとDickies 874');assert.deepEqual(named(s),['Champion','Dickies']);
 s.scenes.forEach(x=>{assert.equal(x.top.brand,'Champion');assert.equal(x.pants.brand,'Dickies');});
});
test('English and Japanese partial matches and adjacent invalid numbers are not treated as registered names',()=>{
 for(const text of ['sleeve GAPing Championish Leeann','ラリーグのスウェット','5010','1550','Red Kaptain','Alpha IndustriesX','LLBeanery'])assert.equal(R.recognize(text).requests.length,0,text);
 for(const text of ['Leeの101','リーの101','L.L.Beanのフランネルシャツ','エルエルビーンのネルシャツ','Alpha Industries MA-1','Ben Davisのワークパンツ'])assert(R.recognize(text).requests.length>0,text);
});
test('UI selection wins conflicts, warns, and excludes rejected names from proposals and prompts',()=>{
 const s=make('CarharttのジャケットとDickies 874',['champion']);
 assert.deepEqual(named(s),['Champion']);assert(s.brandWarnings.some(w=>w.includes('選択外')));
 assert(!s.prompt.includes('Carhartt'));assert(!s.prompt.includes('Dickies'));assert(!s.posting.includes('Carhartt'));assert(s.prompt.includes('Champion'));
});
test('unknown names are not relabelled or used to infer a known product',()=>{
 for(const theme of ['SuperBrandのデニム','Unknown 501','ユニクロのパンツ']){
  const r=R.recognize(theme);assert.equal(r.requests.length,0);assert(r.unknown.length>0);
  const s=S.makeState(theme);assert.equal(named(s).length,0);assert(s.brandWarnings.some(w=>w.includes('置き換えません')));
 }
});
test('unknown product codes are never synthesized and known codes survive irrelevant numbers',()=>{
 const s=S.makeState('Lee 999のワークパンツ');assert(s.brandWarnings.some(w=>w.includes('999')));assert(!s.prompt.includes('999'));assert(!s.posting.includes('999'));assert(garments(s).every(([,g])=>!g.type.includes('999')));
 const known=S.makeState("Levi's 501 2026年のコーデ");known.scenes.forEach(x=>assert(x.pants.type.includes('501')));assert(!known.brandWarnings.some(w=>w.includes('2026')));
 const withUnknown=S.makeState("Levi's 501と999");withUnknown.scenes.forEach(x=>assert(x.pants.type.includes('501')));
});
test('six distinct people and structural outfit variety survive narrow selections',()=>{
 for(const id of ['levis','champion','schott']){
  const s=make('秋のコーデ',[id]);assert.equal(new Set(s.scenes.map(x=>JSON.stringify(x.model))).size,6);
  assert.equal(new Set(s.scenes.map(shape)).size,6);
 }
});
test('same-person mode shares a single selected-brand outfit and varies poses',()=>{
 const s=make('秋のコーデ',['champion','dickies'],'hiphop','same');
 assert.equal(new Set(s.scenes.map(shape)).size,1);assert.equal(new Set(s.scenes.map(x=>JSON.stringify(x.model))).size,1);assert(new Set(s.scenes.map(x=>x.pose)).size>1);
 assert(s.scenes.every(x=>x.prompt.includes('同一人物・同一服装')));
});
test('manual edits may introduce non-selected brands and only change the edited scene and prompt',()=>{
 const s=make(),d=clone(s.scenes[0]);d.top.brand='手動指定ブランド';d.top.type='任意のシャツ';d.top.color='黄色';
 const u=S.saveScene(s,0,d);assert.deepEqual(u.scenes.slice(1),s.scenes.slice(1));assert(u.scenes[0].prompt.includes('手動指定ブランドの黄色任意のシャツ'));
 assert.deepEqual(u.brandSettings,s.brandSettings);assert.deepEqual(S.resetScene(u,0).scenes[0],s.scenes[0]);
});
test('selected brands and edited captions are present in TXT/SRT/ZIP outputs',async()=>{
 const s=make('ChampionのスウェットとDickies 874',['champion','dickies']),d=clone(s.scenes[0]);d.subtitle='ブランド確認字幕';d.narration='ブランド確認原稿';
 const f=S.files(S.saveScene(s,0,d));assert.equal(Object.keys(f).length,5);assert(f['script.txt'].includes('ブランド設定：指定／Champion・Dickies'));assert(f['subtitles.srt'].includes('ブランド確認字幕'));assert(f['narration.txt'].includes('ブランド確認原稿'));assert(f['image-prompts.txt'].includes('Champion'));
 const bytes=Buffer.from(await zip(f).arrayBuffer());assert(bytes.includes(Buffer.from('ブランド確認字幕')));assert(bytes.includes(Buffer.from('Champion')));
});
test('history retains selections and exact edited scenes, with a maximum of ten snapshots',()=>{
 const s=make('秋のコーデ',['lee','gap']),d=clone(s.scenes[2]);d.outer.brand='手動';const u=S.saveScene(s,2,d);
 let h=[];for(let i=0;i<12;i++)h=S.addHistory(h,u,i);assert.equal(h.length,10);
 const restored=S.normalize(JSON.parse(JSON.stringify(h[0].state)));assert.deepEqual(restored.brandSettings,u.brandSettings);assert.deepEqual(restored.scenes,u.scenes);assert.equal(restored.prompt,u.prompt);
});
test('Ver.3 history with no brand settings is not regenerated, even if new seasonal rules reject its theme',()=>{
 const legacy=make();delete legacy.brandSettings;delete legacy.release;delete legacy.generationTheme;legacy.theme='夏のSchottのレザージャケット';legacy.posting='旧投稿文';legacy.scenes[0].top.brand='旧手動ブランド';
 const restored=S.normalize(legacy);assert.deepEqual(restored.brandSettings,{mode:'auto',selected:[]});assert.deepEqual(restored.scenes,legacy.scenes);
 for(const k of ['prompt','narration','subtitle','posting','outfit'])assert.equal(restored[k],legacy[k]);
});
test('Ver.2 draft text remains byte-for-byte intact with safe default brand settings',()=>{
 const v2={theme:'夏のChampionスウェット',scenes:Array.from({length:6},()=>({text:'旧台本',shot:'全身'})),subtitle:'旧字幕',narration:'旧原稿',prompt:'旧プロンプト',outfit:'旧コーデ',posting:'旧投稿'};
 const r=S.normalize(v2);assert.deepEqual(r.brandSettings,{mode:'auto',selected:[]});for(const k of ['subtitle','narration','prompt','outfit','posting'])assert.equal(r[k],v2[k]);
});
test('summer excludes heavy outerwear and unavailable selected items are explained rather than invented',()=>{
 const s=S.makeState('真夏の休日');s.scenes.forEach(x=>{assert.equal(x.outer.type,'なし');assert(!/スウェット|ニット/.test(x.top.type));});
 assert.throws(()=>make('真夏の休日',['schott']),/季節/);assert.throws(()=>make('真夏のChampionスウェット',['champion']),/季節|夏/);
});
test('brand database and rules are offline assets and root/index document alias is retained',()=>{
 const sw=fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8');for(const name of ['brand-data.js','brand-rules.js'])assert(sw.includes(`'${name}'`));assert(sw.includes("VERSION = 'v3.1-brands-1'"));assert(sw.includes('url.href === BASE.href ? DOCUMENT_URL'));assert(!/['"]\.\/['"]\s*,\s*['"]index.html/.test(sw));
 for(const name of ['brand-data.js','brand-rules.js'])assert(!/\bfetch\s*\(|XMLHttpRequest|https?:\/\//.test(fs.readFileSync(path.join(__dirname,'..',name),'utf8')));
});
test('unsupported brand/item pairings are explained instead of reassigned to an unrelated category',()=>{
 assert.throws(()=>S.makeState('SchottのTシャツ'),/登録アイテム/);
 assert.throws(()=>S.makeState('Championのレザージャケット'),/登録アイテム/);
 const pants=S.makeState('Carharttのパンツ');pants.scenes.forEach(s=>{assert.equal(s.pants.brand,'Carhartt');assert.equal(s.outer.brand,'');});
});
