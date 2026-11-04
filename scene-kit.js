/* Ver.3: structured model/outfit data and local image prompt generation. */
(function(root) {
  'use strict';
  const brandRules=typeof module!=='undefined'&&module.exports?require('./brand-rules.js'):root.BrandRules;
  const copy = value => JSON.parse(JSON.stringify(value));
  const models = [
    { age:'40代', hair:'短髪', beard:'なし', body:'標準体型', mood:'落ち着いた男性' },
    { age:'30代', hair:'長髪を後ろで結ぶ', beard:'なし', body:'細身体型', mood:'リラックスした男性' },
    { age:'40代', hair:'短い刈り上げ', beard:'短いひげ', body:'がっしり体型', mood:'渋い男性' },
    { age:'30代', hair:'パーマ', beard:'薄いひげ', body:'標準体型', mood:'親しみやすい男性' },
    { age:'50代', hair:'白髪混じりの短髪', beard:'なし', body:'ややふくよか', mood:'眼鏡をかけた穏やかな男性' },
    { age:'40代', hair:'ミディアムヘア', beard:'口ひげ', body:'すらっとした体型', mood:'自然体の男性' }
  ];
  const fields = {
    model: { age:'年代', hair:'髪型', beard:'ひげ', body:'体型', mood:'雰囲気' },
    outer: { brand:'ブランド', type:'種類', color:'色' },
    top: { brand:'ブランド', type:'種類', color:'色' },
    pants: { brand:'ブランド', type:'種類', color:'色', silhouette:'シルエット' },
    shoes: { brand:'ブランド', type:'種類', color:'色' },
    background: { place:'場所', time:'時間帯', mood:'雰囲気' }
  };
  const groupNames = { model:'モデル', outer:'アウター', top:'トップス', pants:'パンツ', shoes:'靴', background:'背景' };
  const topColors=['グレー','ネイビー','ブラック','バーガンディ','オートミール','ダークグリーン'];
  const pantColors=['ベージュ','チャコール','カーキ','ブラック','ネイビー','サンド'];
  const outerColors=['ブラウン','ネイビー','赤系チェック','インディゴ','オリーブ','生成り'];
  const topTypes=['ヘビーウェイトTシャツ','クルーネックスウェット','プリントTシャツ','長袖Tシャツ','オックスフォードシャツ','サーマルTシャツ'];
  const outerTypes=['ダックジャケット','ナイロンジャケット','ネルシャツ','デニムジャケット','ワークジャケット','ワークベスト'];
  function garment(brand,type,color) { return { brand,type,color }; }
  // A brand is assigned only to supported garment categories. Product numbers
  // stay attached to pants, never to unrelated jackets, tops or shoes.
  function outfit(theme, style, i) {
    const hip = style==='hiphop', street=style==='street', adult=style==='adult';
    const result = {
      outer:garment('',outerTypes[i],outerColors[i]),
      top:garment(street ? 'ヴィンテージ古着' : '',hip ? 'オーバーサイズスウェット' : topTypes[i],adult ? ['アイボリー','ネイビー','グレー','白','ベージュ','ダークグリーン'][i] : topColors[i]),
      pants:{...garment('',hip ? 'ワークパンツ' : 'ストレートデニム',hip ? pantColors[i] : ['インディゴ','淡いブルー','ブラック','濃紺','グレー','色落ちブルー'][i]),silhouette:hip ? 'ゆったりワイド' : adult ? 'すっきりストレート' : 'ストレート'},
      shoes:garment('', ['ワークブーツ','ローテクスニーカー','キャンバススニーカー','レザーブーツ','スエードスニーカー','レザーシューズ'][i],['ブラウン','白','黒','黒','茶','ダークブラウン'][i])
    };
    // Bind an item to the words following its brand, before the next brand.
    const segment = re => (theme.match(re)?.[1] || '').split(/Carhartt|カーハート|Levi[’']?s|リーバイス|Dickies|ディッキーズ|Champion|チャンピオン/i)[0];
    const pantsChoices=[];
    const c=segment(/(?:Carhartt|カーハート)(.*)/i);
    if (/Carhartt|カーハート/i.test(theme)) {
      if (/パンツ|ペインター|ダブルニー/.test(c)) { result.pants={...garment('Carhartt',/ペインター/.test(c)?'ペインターパンツ':'ダブルニーワークパンツ',pantColors[i]),silhouette:result.pants.silhouette}; pantsChoices.push(copy(result.pants)); }
      else if (/Tシャツ|白T/.test(c)) result.top=garment('Carhartt','ポケットTシャツ',topColors[i]);
      else result.outer=garment('Carhartt',/ベスト/.test(c)?'ダックベスト':'ダックジャケット',outerColors[i]);
    }
    const l=segment(/(?:Levi[’']?s|リーバイス)(.*)/i);
    if (/Levi[’']?s|リーバイス|501|505/i.test(theme)) {
      if (/ジャケット|トラッカー/.test(l) && !/501|505/.test(l)) result.outer=garment("Levi's",'デニムジャケット',outerColors[i]);
      else { result.pants={...garment("Levi's",/505/.test(theme)?'505デニム':'501デニム',['インディゴ','淡いブルー','ブラック','濃紺','グレー','色落ちブルー'][i]),silhouette:result.pants.silhouette}; pantsChoices.push(copy(result.pants)); }
    }
    if (/Dickies|ディッキーズ|874/i.test(theme)) {result.pants={...garment('Dickies','874ワークパンツ',pantColors[i]),silhouette:result.pants.silhouette}; pantsChoices.push(copy(result.pants));}
    if(pantsChoices.length>1) result.pants=pantsChoices[i%pantsChoices.length];
    const ch=segment(/(?:Champion|チャンピオン)(.*)/i);
    if (/Champion|チャンピオン/i.test(theme)) result.top=garment('Champion',/Tシャツ|白T/.test(ch)?'Tシャツ':/パーカ|フーディ/.test(ch)?'スウェットパーカ':'クルーネックスウェット',topColors[i]);
    if (/ヴィンテージ|ビンテージ|古着/.test(theme)) {
      if (/ネル/.test(theme)) result.outer=garment('ヴィンテージ古着','チェックネルシャツ',outerColors[i]);
      else if (!/Champion|チャンピオン|Carhartt|カーハート/i.test(theme)) result.top=garment('ヴィンテージ古着',/スウェット/.test(theme)?'クルーネックスウェット':'プリントTシャツ',topColors[i]);
    }
    if (/ネルシャツ/.test(theme) && !/Carhartt|カーハート|Levi[’']?s|リーバイス/i.test(theme)) result.outer.type='チェックネルシャツ';
    if (/スウェット/.test(theme) && !result.top.brand) result.top.type='クルーネックスウェット';
    if (/白T/.test(theme)) { result.top.type=result.top.brand==='Carhartt'?'ポケットTシャツ':'Tシャツ'; result.top.color='白'; }
    if (/ブーツ/.test(theme)) result.shoes.type=i%2?'レースアップブーツ':'ワークブーツ';
    if (/黒|ブラック/.test(theme)) {
      if (/パンツ|874|501|505|デニム/.test(theme)) result.pants.color='黒';
      else result.top.color='ブラック';
    }
    return result;
  }
  function describe(value) { return value.type!==undefined ? `${value.brand ? value.brand+'の' : ''}${value.color}${value.type}${value.silhouette?'・'+value.silhouette:''}` : Object.values(value).filter(Boolean).join('・'); }
  function summary(scene) {
    return `モデル：${describe(scene.model)}\nアウター：${describe(scene.outer)}\nトップス：${describe(scene.top)}\nパンツ：${describe(scene.pants)}\n靴：${describe(scene.shoes)}`;
  }
  function prompt(scene, i, state) {
    return `【SCENE ${i+1} / ${i*5}–${(i+1)*5}秒】\nテーマ：${state.generationTheme??state.theme}\n縦型9:16、明るく自然な実写風ファッション写真。成人モデル一人。\n${state.mode==='same'?'全シーンで同一人物・同一服装を使用し、ポーズとカメラアングルを変える。':'このシーン固有のモデルとコーディネート。他のシーンのモデル・服装とは区別する。'}\n服装：\n${summary(scene)}\n背景：${scene.background.place}、${scene.background.time}、${scene.background.mood}\n構図：ポーズ・カメラアングル：${scene.pose}\n頭から靴先まで人物全身を収め、顔と靴先を切らない。字幕用に画面上部に十分な余白。自然光、服の色と素材が分かる明るさ、自然な遠近感。文字・透かし・不要なブランドロゴを描画しない。`;
  }
  function aggregates(state) {
    state.subtitle=state.scenes.map((s,i)=>`${i+1}\n00:00:${String(i*5).padStart(2,'0')},000 --> 00:00:${String((i+1)*5).padStart(2,'0')},000\n${s.subtitle}`).join('\n\n');
    state.narration=state.scenes.map((s,i)=>`【${i*5}–${(i+1)*5}秒】\n${s.narration}`).join('\n\n');
    state.prompt=state.scenes.map(s=>s.prompt).join('\n\n');
  }
  function baseline(scene) {
    const { initial, ...rest }=scene; return copy(rest);
  }
  function build(state, mode='multi', brandSettings=null) {
    const plan=brandSettings?brandRules.plan(state.theme,state.style,brandSettings,mode):null;
    if(plan){state.brandSettings=plan.settings;state.brandWarnings=plan.warnings;state.generationTheme=plan.generationTheme;state.release='3.1';}
    state.version=3; state.mode=mode==='same'?'same':'multi';
    state.scenes=state.scenes.map((s,i)=>{
      const k=state.mode==='same'?0:i;
      const configured={...s, subtitle:typeof s.subtitle==='string'?s.subtitle:s.text, narration:typeof s.narration==='string'?s.narration:s.text, model:copy(models[k]), ...(plan?plan.outfits[k]:outfit(state.theme,state.style,k)), background:{place:i===0&&state.backgroundHint?state.backgroundHint.split('、')[0]:['赤レンガ倉庫の前','コンクリート壁の街角','古着屋の木製ドアの前','並木道','静かなカフェの外壁','公園の遊歩道'][i],time:i===0&&state.backgroundHint?.includes('、')?state.backgroundHint.split('、').slice(1).join('、'):i%2?'午前の自然光':'午後の自然光',mood:'明るく落ち着いた雰囲気'},pose:s.shot};
      configured.prompt=prompt(configured,i,state); configured.initial=baseline(configured); return configured;
    });
    state.outfit=state.scenes.map((s,i)=>`SCENE ${i+1}\n${summary(s)}`).join('\n\n');
    aggregates(state); return state;
  }
  function validConfig(scene) {
    return Object.entries(fields).every(([group,keys])=>scene[group] && Object.keys(keys).every(key=>typeof scene[group][key]==='string')) && typeof scene.pose==='string';
  }
  function migrate(state) {
    // Existing aggregates remain byte-for-byte intact until an affected scene is saved.
    const original=copy(state); const mode=state.mode==='multi'?'multi':'same';
    if (state.version===3 && state.scenes.every(s=>validConfig(s) && s.initial && validConfig(s.initial))) {
      state.scenes=copy(state.scenes); state.mode=mode; return state;
    }
    build(state,mode);
    for (const key of ['outfit','subtitle','narration','prompt']) if(typeof original[key]==='string') state[key]=original[key];
    const captions=typeof original.subtitle==='string'?original.subtitle.split(/\n\s*\n/):[];
    const narrations=typeof original.narration==='string'?original.narration.split(/【\d+–\d+秒】\n/).slice(1):[];
    const prompts=typeof original.prompt==='string'?original.prompt.split(/(?=【SCENE \d+ \/)/):[];
    state.scenes.forEach((s,i)=>{
      const old=original.scenes[i];
      if(captions.length===6 && captions[i].includes('-->')) s.subtitle=captions[i].split('\n').slice(2).join('\n');
      else if(typeof old.subtitle==='string') s.subtitle=old.subtitle;
      if(narrations.length===6) s.narration=narrations[i].trimEnd(); else s.narration=typeof old.narration==='string'?old.narration:old.text;
      if(prompts.length===6) s.prompt=prompts[i].trimEnd(); else if(typeof old.prompt==='string') s.prompt=old.prompt;
      s.initial=baseline(s);
    });
    return state;
  }
  function saveScene(state,index,draft) {
    if(!Number.isInteger(index)||index<0||index>5) throw new Error('シーン番号が不正です');
    if(!validConfig(draft)||!['text','subtitle','narration'].every(k=>typeof draft[k]==='string')) throw new Error('編集項目が不正です');
    const next=copy(state), current=next.scenes[index];
    for(const group of Object.keys(fields)) current[group]=copy(draft[group]);
    for(const key of ['pose','text','subtitle','narration']) current[key]=draft[key];
    current.shot=current.pose;
    if(next.mode==='same') next.scenes.forEach(s=>{for(const group of ['model','outer','top','pants','shoes']) s[group]=copy(current[group]);});
    next.scenes.forEach((s,i)=>{if(i===index||next.mode==='same') s.prompt=prompt(s,i,next);});
    // Only the edited cue/block is replaced; manual edits in other scenes stay intact.
    const oldCaption=next.subtitle, oldNarration=next.narration, oldPrompt=next.prompt;
    aggregates(next);
    const replaceBlock=(old,fresh,separator)=>{
      const before=old.split(separator), after=fresh.split(separator);
      if(before.length===6 && after.length===6) {before[index]=after[index];return before.join('\n\n');} return fresh;
    };
    next.subtitle=replaceBlock(oldCaption,next.subtitle,/\n\s*\n/);
    const blocks=(text,re)=>text.split(re).filter(Boolean);
    const ns=blocks(oldNarration,/(?=【\d+–\d+秒】)/), nf=blocks(next.narration,/(?=【\d+–\d+秒】)/);
    if(ns.length===6 && nf.length===6){ns[index]=nf[index];next.narration=ns.join('');}
    const ps=blocks(oldPrompt,/(?=【SCENE \d+ \/)/), pf=blocks(next.prompt,/(?=【SCENE \d+ \/)/);
    if(next.mode!=='same' && ps.length===6 && pf.length===6){ps[index]=pf[index];next.prompt=ps.join('');}
    next.outfit=next.scenes.map((s,i)=>`SCENE ${i+1}\n${summary(s)}`).join('\n\n');
    return next;
  }
  function resetScene(state,index) { return saveScene(state,index,copy(state.scenes[index].initial)); }
  const api={models,fields,groupNames,outfit,summary,prompt,build,migrate,saveScene,resetScene,validConfig};
  if(typeof module!=='undefined'&&module.exports) module.exports=api; else root.SceneKit=api;
})(typeof globalThis!=='undefined'?globalThis:this);
