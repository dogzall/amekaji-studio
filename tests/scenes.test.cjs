const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Studio=require('../materials.js');
const SceneKit=require('../scene-kit.js');
const {zip}=require('../zip.js');
const clone=v=>JSON.parse(JSON.stringify(v));
const theme='ChampionのスウェットとDickies 874';
function make(mode='multi'){return Studio.makeState(theme,'guide','40代男性','adult',mode);}
test('six unique models and six unique complete outfits in all 4 styles',()=>{
 for(const style of Object.keys(Studio.styles)) {
  const s=Studio.makeState(theme,'guide','40代男性',style);
  assert.equal(s.mode,'multi'); assert.equal(s.scenes.length,6);
  assert.equal(new Set(s.scenes.map(x=>JSON.stringify(x.model))).size,6);
  assert.equal(new Set(s.scenes.map(x=>JSON.stringify([x.outer,x.top,x.pants,x.shoes]))).size,6);
  s.scenes.forEach(x=>{assert.equal(x.top.brand,'Champion');assert(x.top.type.includes('スウェット'));assert.equal(x.pants.brand,'Dickies');assert.equal(x.pants.type,'874ワークパンツ');assert(!x.outer.type.includes('874'));});
 }
});
test('brand, item and explicit color constraints are kept with varied outfits',()=>{
 for(const [t,group,brand,item] of [['Carharttのダブルニー','pants','Carhartt','ダブルニー'],["Levi’s 501",'pants',"Levi's",'501'],['古着のネルシャツ','outer','','ネルシャツ'],['Championのパーカ','top','Champion','パーカ']]) {
  Studio.makeState(t).scenes.forEach(s=>{assert.equal(s[group].brand,brand);assert(s[group].type.includes(item));});
 }
 const s=Studio.makeState('Championの白TとDickiesのブラック874');
 s.scenes.forEach(x=>{assert.equal(x.top.color,'白');assert.equal(x.pants.color,'黒');});
 assert.equal(new Set(s.scenes.map(x=>JSON.stringify([x.outer,x.top,x.pants,x.shoes]))).size,6);
 const mixed=Studio.makeState("CarharttのダブルニーとLevi's 501とDickies 874");
 assert.equal(new Set(mixed.scenes.map(x=>x.pants.brand)).size,3);
});
test('editing one scene is immutable and leaves scenes 2–6 byte-for-byte unchanged',()=>{
 const s=make(),before=clone(s),draft=clone(s.scenes[0]);draft.model.hair='オールバック';draft.top.color='サーモンピンク';draft.outer.brand='任意ブランド';draft.background.place='港の遊歩道';draft.pose='全身の斜め後ろ姿';draft.subtitle='新しい字幕';draft.narration='新しい原稿';draft.text='新しい台本';
 const updated=Studio.saveScene(s,0,draft);
 assert.deepEqual(s,before);assert.deepEqual(updated.scenes.slice(1),before.scenes.slice(1));
 for(const word of ['オールバック','サーモンピンク','任意ブランド','港の遊歩道','全身の斜め後ろ姿'])assert(updated.scenes[0].prompt.includes(word));
 assert(updated.subtitle.includes('新しい字幕'));assert(updated.narration.includes('新しい原稿'));assert(Studio.files(updated)['script.txt'].includes('新しい台本'));
});
test('multi prompts never contain same-person/same-outfit directive',()=>{
 const s=make();s.scenes.forEach((scene,i)=>{
  for(const text of ['縦型9:16','人物全身','顔と靴先を切らない','画面上部','文字・透かし','明るく自然'])assert(scene.prompt.includes(text));
  assert(!/同一人物|同一服装/.test(scene.prompt));assert(scene.prompt.includes(scene.model.hair));
  assert(scene.prompt.includes(scene.top.color));assert(scene.prompt.includes(scene.pants.type));
 });
 const draft=clone(s.scenes[2]);draft.top.color='黄色';assert(!/同一人物|同一服装/.test(Studio.saveScene(s,2,draft).prompt));
});
test('reset restores initial proposal and independent saved editing survives normalization',()=>{
 const s=make(),draft=clone(s.scenes[0]);draft.model.body='細身';draft.top.type='カーディガン';draft.subtitle='編集';
 const updated=Studio.normalize(Studio.saveScene(s,0,draft));
 assert.equal(updated.scenes[0].top.type,'カーディガン');assert.equal(updated.scenes[0].subtitle,'編集');
 const reset=Studio.resetScene(updated,0);assert.deepEqual(reset.scenes[0],s.scenes[0]);assert.deepEqual(reset.scenes.slice(1),s.scenes.slice(1));
});
test('same mode shares model and clothes but preserves per-scene background, pose and words',()=>{
 const s=make('same');assert.equal(new Set(s.scenes.map(x=>JSON.stringify(x.model))).size,1);assert.equal(new Set(s.scenes.map(x=>JSON.stringify([x.top,x.outer,x.pants,x.shoes]))).size,1);
 assert(new Set(s.scenes.map(x=>x.pose)).size>1);
 const d=clone(s.scenes[3]);d.top.color='赤';d.background.place='海辺';d.subtitle='字幕4';d.model.hair='ロングヘア';
 const updated=Studio.saveScene(s,3,d);
 updated.scenes.forEach(x=>{assert.equal(x.top.color,'赤');assert.equal(x.model.hair,'ロングヘア');assert(x.prompt.includes('同一人物・同一服装'));});
 assert.equal(updated.scenes[0].background.place,s.scenes[0].background.place);assert.equal(updated.scenes[0].subtitle,s.scenes[0].subtitle);assert.equal(updated.scenes[3].background.place,'海辺');
 assert.equal(Studio.resetScene(updated,3).scenes[0].top.color,s.scenes[0].top.color);
});
test('edited data reaches all TXT/SRT/ZIP exports and last-ten history',async()=>{
 const s=make(),d=clone(s.scenes[0]);d.top.brand='テストブランド';d.subtitle='出力字幕';d.narration='出力原稿';
 const u=Studio.saveScene(s,0,d),f=Studio.files(u);
 assert(f['script.txt'].includes('テストブランド'));assert(f['image-prompts.txt'].includes('テストブランド'));assert(f['subtitles.srt'].includes('出力字幕'));assert(f['narration.txt'].includes('出力原稿'));assert(f['posting.txt'].includes('TikTok'));
 const archive=Buffer.from(await zip(f).arrayBuffer());for(const word of ['テストブランド','出力字幕','出力原稿'])assert(archive.includes(Buffer.from(word)));
 let list=[];for(let i=0;i<12;i++)list=Studio.addHistory(list,u,i);assert.equal(list.length,10);
 const restored=Studio.normalize(JSON.parse(JSON.stringify(list[0].state)));assert.deepEqual(restored.scenes,u.scenes);assert.equal(restored.prompt,u.prompt);
});
test('Ver.2 migration preserves edited aggregates, scenes and reset baseline',()=>{
 const v2=make('same');delete v2.version;delete v2.mode;v2.scenes=v2.scenes.map(({initial,model,outer,top,pants,shoes,background,pose,...rest})=>rest);
 v2.subtitle=v2.subtitle.replace(v2.scenes[1].subtitle,'旧字幕編集');v2.narration=v2.narration.replace(v2.scenes[1].narration,'旧原稿編集');v2.prompt=v2.prompt.replace('明るく自然','以前の編集');
 const restored=Studio.normalize(v2);assert.equal(restored.mode,'same');for(const k of ['subtitle','narration','prompt','outfit'])assert.equal(restored[k],v2[k]);
 assert.equal(restored.scenes[1].subtitle,'旧字幕編集');assert.equal(restored.scenes[1].narration,'旧原稿編集');
 const d=clone(restored.scenes[0]);d.subtitle='新版字幕';const u=Studio.saveScene(restored,0,d);assert(u.subtitle.includes('旧字幕編集'));assert(u.narration.includes('旧原稿編集'));assert(Studio.resetScene(u,0));
});
test('invalid legacy records fail safely and unstructured v1 scene captions get usable defaults',()=>{
 assert.equal(Studio.normalize(null),null);assert.equal(Studio.normalize({theme:'x',scenes:[null]}),null);
 const legacy={theme:'昔の台本',scenes:Array.from({length:6},()=>({text:'旧台本',shot:'全身'})),subtitle:'旧自由編集字幕',narration:'旧自由編集原稿',prompt:'旧自由編集プロンプト'};
 const s=Studio.normalize(legacy);assert.equal(s.subtitle,legacy.subtitle);assert(s.scenes.every(x=>typeof x.subtitle==='string' && SceneKit.validConfig(x)));assert(Studio.saveScene(s,0,clone(s.scenes[0])));
});
test('scene logic runs with no network globals; PWA cache owns its version only',()=>{
 const sw=fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8');assert(sw.includes("VERSION = 'v3.1-brands-1'"));assert(sw.includes("'scene-kit.js'"));assert(!sw.includes('localStorage'));assert(!sw.includes('skipWaiting('));
 for(const name of ['scene-kit.js','materials.js','app.js','zip.js'])assert(!/\bfetch\s*\(|XMLHttpRequest|https?:\/\//.test(fs.readFileSync(path.join(__dirname,'..',name),'utf8')));
 const css=fs.readFileSync(path.join(__dirname,'../style.css'),'utf8');assert(css.includes('@media(max-width:680px){.scene-fields{grid-template-columns:minmax(0,1fr)}'));assert(css.includes('min-height:48px'));assert(css.includes('font-size:16px'));
});
