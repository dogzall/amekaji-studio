const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { makeState, styles, normalize, files, allText, addHistory } = require('../materials.js');
const { zip, crc32 } = require('../zip.js');
test('all 4 styles × 3 tones × 6 item themes have six timed scenes and 5 exports', () => {
  for (const style of Object.keys(styles)) for (const tone of ['guide','story','tips']) for (const theme of ['Carharttダックジャケット',"Levi's 501",'Dickies 874','Championスウェット','ヴィンテージ古着','夏の着こなし']) {
    const s=makeState(theme,tone,'アメカジ初心者',style);
    assert.equal(s.scenes.length,6); assert.equal(Object.keys(files(s)).length,5);
    const cues=s.subtitle.split('\n\n'); assert.equal(cues.length,6);
    cues.forEach((cue,i) => assert(cue.includes(`00:00:${String(i*5).padStart(2,'0')},000 --> 00:00:${String((i+1)*5).padStart(2,'0')},000`)));
    s.scenes.forEach((scene,i) => { assert(scene.prompt.includes('縦型9:16')); assert(scene.prompt.includes('人物全身')); assert(scene.prompt.includes('服装：')); assert(scene.prompt.includes('背景：')); assert(scene.prompt.includes('構図：')); assert(scene.narration); assert(scene.subtitle); assert(s.narration.includes(`【${i*5}–${(i+1)*5}秒】`)); });
    assert(s.posting.includes('【YouTube Shorts】')); assert(s.posting.includes('【TikTok】')); assert(s.posting.includes('#Shorts')); assert(s.posting.includes('AI')===false); assert(allText(s).includes(theme));
  }
});
test('styles change outfit, narration and background, not just a label', () => {
  const all=Object.keys(styles).map(style=>makeState('春のコーデ','guide','服好き',style));
  assert.equal(new Set(all.map(s=>s.outfit)).size,4); assert.equal(new Set(all.map(s=>s.scenes[3].narration)).size,4);
  all.forEach(s=>assert(s.prompt.includes(styles[s.style].bg)));
});
test('brand and item combinations produce concrete outfits', () => {
  const s=makeState("CarharttとLevi'sとChampionのコーデ");
  assert(s.outfit.includes('Carhartt')); assert(s.outfit.includes("Levi's")); assert(s.outfit.includes('Champion'));
  assert(makeState('Dickies ブラックのパンツ').outfit.includes('Dickiesの黒'));
  assert(makeState('Carharttのダブルニー').outfit.includes('ダブルニーワークパンツ'));
  assert(makeState('古着のネルシャツ').outfit.includes('チェックネルシャツ'));
});
test('empty input is rejected and title length stays below platform limit', () => {
  assert.throws(()=>makeState('  '));
  const s=makeState('長いテーマ'.repeat(30));
  const title=s.posting.split('\n').find(l=>l.startsWith('タイトル：')).slice(5);
  assert(title.length<=90); assert.equal(s.style,'classic'); assert.equal(makeState('テーマ','guide','初心者','__proto__').style,'classic');
});
test('legacy draft migration preserves every edited output', () => {
  const old={theme:'以前のテーマ',tone:'story',audience:'服好き',scenes:Array.from({length:6},()=>({text:'編集済み',shot:'古い映像'})),subtitle:'編集字幕',narration:'編集ナレーション',prompt:'編集プロンプト'};
  const s=normalize(old);
  assert.equal(s.subtitle,old.subtitle); assert.equal(s.narration,old.narration); assert.equal(s.prompt,old.prompt); assert.equal(s.scenes[0].text,'編集済み'); assert.equal(s.style,'classic'); assert.equal(makeState('テーマ','guide','初心者','__proto__').style,'classic'); assert(s.posting); assert(s.outfit);
  assert.equal(normalize({}),null); assert.equal(normalize({...old,theme:' '}),null); assert.equal(normalize({...old,scenes:[null]}),null);
});
test('history holds latest ten snapshots without sharing mutable scene objects', () => {
  let history=[]; const s=makeState('履歴');
  for(let i=0;i<15;i++) history=addHistory(history,{...s,theme:String(i)},1000+i);
  assert.equal(history.length,10); assert.equal(history[0].state.theme,'14'); assert.equal(history[9].state.theme,'5');
  s.scenes[0].text='別の編集'; assert.notEqual(history[0].state.scenes[0].text,s.scenes[0].text);
  assert.equal(new Set(history.map(e=>e.id)).size,10);
});
test('ZIP central directory points to exact UTF-8, BOM and CRC32 content', async () => {
  const content=files(makeState('日本語のZIP')); content['日本語.txt']='保存テスト';
  const bytes=Buffer.from(await zip(content).arrayBuffer());
  assert.equal(bytes.readUInt32LE(bytes.length-22),0x06054b50);
  assert.equal(bytes.readUInt16LE(bytes.length-12),6);
  let pos=bytes.readUInt32LE(bytes.length-6);
  for(const [name,text] of Object.entries(content)) {
    assert.equal(bytes.readUInt32LE(pos),0x02014b50); assert.equal(bytes.readUInt16LE(pos+8),0x800);
    const nameLen=bytes.readUInt16LE(pos+28), offset=bytes.readUInt32LE(pos+42), len=bytes.readUInt32LE(pos+24);
    assert.equal(bytes.subarray(pos+46,pos+46+nameLen).toString('utf8'),name);
    assert.equal(bytes.readUInt32LE(offset),0x04034b50);
    const data=bytes.subarray(offset+30+nameLen,offset+30+nameLen+len);
    assert.equal(data.toString('utf8'),'\ufeff'+text); assert.equal(crc32(data),bytes.readUInt32LE(pos+16));
    pos+=46+nameLen;
  }
  assert.equal(crc32(new TextEncoder().encode('123456789')),0xcbf43926);
});
test('runtime resources are all local, with template disclosure in the UI', () => {
  const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
  assert(html.includes('AI生成ではありません')); assert(html.indexOf('src="materials.js"')<html.indexOf('src="app.js"')); assert(html.includes('data-tab="posting"'));
  for(const name of ['app.js','materials.js','zip.js']) assert(!/\bfetch\s*\(|XMLHttpRequest|https?:\/\//.test(fs.readFileSync(require('node:path').join(__dirname,'..',name),'utf8')));
});
