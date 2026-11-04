/* Deterministic, catalogue-bound brand planning. No API calls. */
(function(root){
 'use strict';
 const data=typeof module!=='undefined'&&module.exports?require('./brand-data.js'):root.BrandData;
 const {brands}=data, byId=new Map(brands.map(b=>[b.id,b]));
 const clone=v=>JSON.parse(JSON.stringify(v));
 const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const styles={classic:['levis','lee','wrangler','champion','dickies','ben-davis','carhartt','hanes','red-kap','llbean'],hiphop:['champion','russell','dickies','ben-davis','levis','gap','lee','wrangler','carhartt'],street:['lee','wrangler','gap','russell','red-kap','champion','ben-davis','alpha'],adult:['ralph-lauren','llbean','eddie-bauer','levis','lee','wrangler','schott','hanes','gap']};
 const wardrobe={outer:['ダックジャケット','ナイロンジャケット','チェックネルシャツ','デニムジャケット','ワークジャケット','ワークベスト'],top:['ヘビーウェイトTシャツ','クルーネックスウェット','プリントTシャツ','長袖Tシャツ','オックスフォードシャツ','サーマルTシャツ'],pants:['ストレートデニム','チノパン','ワークパンツ','ルーズデニム','コーデュロイパンツ','ペインターパンツ'],shoes:['ワークブーツ','ローテクスニーカー','キャンバススニーカー','レザーブーツ','スエードスニーカー','レザーシューズ']};
 function settings(value){
  const selected=Array.isArray(value?.selected)?[...new Set(value.selected.filter(id=>byId.has(id)))]:[];
  return {mode:value?.mode==='selected'?'selected':'auto',selected};
 }
 function aliasPattern(alias){
  const jp=/[ァ-ヿ]/.test(alias);
  const before=jp?'(?<![ァ-ヿーA-Za-z0-9_])':'(?<![A-Za-z0-9_])';
  const after=jp?'(?![ァ-ヿー])':'(?![A-Za-z_])';
  // Japanese aliases may run directly into common garment words.
  return new RegExp(before+esc(alias)+(jp?'(?=$|[^ァ-ヿー]|スウェット|デニム|ジャケット|パーカー|パンツ|シャツ)':after),'gi');
 }
 function numeric(text,number){return new RegExp('(?<![A-Za-z0-9])'+number+'(?![A-Za-z0-9])').test(text);}
 function recognize(theme){
  theme=String(theme).normalize('NFKC');
  const found=[];
  for(const brand of brands) for(const alias of brand.aliases) {
   for(const match of theme.matchAll(aliasPattern(alias))) found.push({brand:brand.id,start:match.index,end:match.index+match[0].length});
  }
  found.sort((a,b)=>a.start-b.start||b.end-a.end);
  const mentions=found.filter((m,i)=>!found.slice(0,i).some(p=>p.start===m.start&&p.brand===m.brand));
  const unknown=[];
  let remaining=theme;
  for(const m of [...mentions].reverse()) remaining=remaining.slice(0,m.start)+' '.repeat(m.end-m.start)+remaining.slice(m.end);
  const unknownPattern=/([A-Za-z][A-Za-z.'-]*(?: [A-Za-z][A-Za-z.'-]*)*|[ァ-ヿー]{2,})(?:の|製)(?=デニム|ジーンズ|パンツ|スウェット|シャツ|Tシャツ|ジャケット|パーカー|コーデ)/g;
  for(const m of remaining.matchAll(unknownPattern)) if(!/^(?:ヴィンテージ|ビンテージ|アメカジ|ストリート|カジュアル|大人|ブラック|グレー|ネイビー)$/i.test(m[1])) unknown.push(m[1].trim());
  const leadingNumberBrand=remaining.match(/\b([A-Za-z][A-Za-z.'-]*)\s+(?:501|505|550|101|874)\b/);
  if(leadingNumberBrand)unknown.push(leadingNumberBrand[1]);
  // Bare known model numbers are allowed only when not attributed to another brand.
  if(!mentions.length&&!unknown.length) for(const [id,number] of [['levis','501'],['levis','505'],['levis','550'],['lee','101'],['dickies','874']]) {
   if(numeric(theme,number)) mentions.push({brand:id,start:0,end:0,inferred:true});
  }
  const requests=[];
  mentions.forEach((m,index)=>{
   const brand=byId.get(m.brand), next=mentions[index+1];
   const segment=m.inferred?theme:theme.slice(m.end,next?.start??theme.length);
   let items=brand.items.filter(it=>it.aliases.some(a=>/^\d+$/.test(a)?numeric(segment,a):segment.toLowerCase().includes(a.toLowerCase())));
   if(items.length){const longest=Math.max(...items.map(it=>Math.max(...it.aliases.filter(a=>segment.toLowerCase().includes(a.toLowerCase())).map(a=>a.length),0)));items=items.filter(it=>it.aliases.some(a=>a.length===longest&&segment.toLowerCase().includes(a.toLowerCase())));}
   const noun=segment.match(/Tシャツ|白T|スウェット|パーカー|パーカ|フーディ|ウエスタンシャツ|オックスフォードシャツ|フランネルシャツ|ネルシャツ|ワークシャツ|ワークパンツ|チノパン|デニム|ジーンズ|パンツ|ジャケット|ベスト|ニット|アウター/)?.[0];
   if(!items.length&&noun)items=brand.items.filter(it=>noun==='パンツ'?it.category==='pants':noun==='アウター'?it.category==='outer':it.type.includes(noun==='ジーンズ'?'デニム':noun==='白T'?'Tシャツ':noun==='フーディ'?'パーカ':noun));
   const unsupported=noun&&!items.length?noun:'';
   const unknownModels=[...segment.matchAll(/(?<![A-Za-z0-9])\d{3,4}(?![A-Za-z0-9])/g)].map(m=>m[0]).filter(n=>!new RegExp(n+'(?:年|年代|秒)').test(segment)&&!brand.items.some(it=>it.kind==='model'&&it.id===n));
   requests.push({brand:m.brand,items:items.map(it=>it.id),segment,unknownModels,unsupported});
  });
  return {requests,unknown:[...new Set(unknown)]};
 }
 function season(theme){return /真夏|夏|summer/i.test(theme)?'summer':/冬|winter/i.test(theme)?'winter':/春|spring/i.test(theme)?'spring':'autumn';}
 function analyze(theme,value,style='classic'){
  const config=settings(value), detected=recognize(theme), warnings=[];
  if(config.mode==='selected'&&!config.selected.length)return {settings:config,warnings,error:'ブランド指定モードでは、1つ以上のブランドを選択してください。'};
  const conflicts=detected.requests.filter(r=>config.mode==='selected'&&!config.selected.includes(r.brand));
  if(conflicts.length)warnings.push(`テーマの ${[...new Set(conflicts.map(r=>byId.get(r.brand).name))].join('・')} は選択外です。選択ブランドを優先し、これらの指定は採用しません。`);
  if(detected.unknown.length)warnings.push(`未登録の名称 ${detected.unknown.join('・')} は既存ブランドに置き換えません。該当のブランド指定は自動解釈しません。`);
  const requests=detected.requests.filter(r=>config.mode!=='selected'||config.selected.includes(r.brand));
  for(const r of requests)if(r.unsupported)return {settings:config,warnings,error:`${byId.get(r.brand).name} の「${r.unsupported}」は登録アイテムにありません。テーマを調整し、必要なら生成後に手動編集してください。`};
  for(const r of requests)if(r.unknownModels.length)warnings.push(`${byId.get(r.brand).name} の未登録品番 ${r.unknownModels.join('・')} は使わず、一般カテゴリで提案します。`);
  const priority=Object.hasOwn(styles,style)?styles[style]:styles.classic;
  const pool=config.mode==='selected'?config.selected:requests.length?[...new Set(requests.map(r=>r.brand))]:detected.unknown.length?[]:priority;
  const s=season(theme);
  for(const r of requests)if(r.items.length && !byId.get(r.brand).items.some(it=>r.items.includes(it.id)&&it.seasons.includes(s)))return {settings:config,warnings,error:`指定の ${byId.get(r.brand).name} のアイテムは${s==='summer'?'夏':'指定季節'}向け登録がありません。季節かアイテムを変更してください。`};
  const active=pool.filter(id=>byId.get(id).items.some(it=>it.seasons.includes(s)));
  const excluded=pool.filter(id=>!active.includes(id));
  if(excluded.length)warnings.push(`${excluded.map(id=>byId.get(id).name).join('・')} は季節に適した登録アイテムがないため自動提案から除外します。`);
  if(config.mode==='selected'&&!active.length)return {settings:config,warnings,error:'季節に適した登録アイテムがありません。テーマの季節か選択ブランドを変更してください。'};
  let generationTheme=conflicts.length||(config.mode==='selected'&&detected.unknown.length)?`${active.map(id=>byId.get(id).name).join('・')}を使ったコーデ`:String(theme).normalize('NFKC');
  for(const number of new Set(requests.flatMap(r=>r.unknownModels)))generationTheme=generationTheme.replace(new RegExp('(?<![A-Za-z0-9])'+number+'(?![A-Za-z0-9])','g'),'（未登録品番除外）');
  return {settings:config,warnings,requests,pool:active,season:s,generationTheme};
 }
 function plain(theme,style,i,s){
  const result={};
  for(const category of ['outer','top','pants','shoes']) result[category]={brand:'',type:wardrobe[category][i],color:(data.palettes[category]||['ブラウン','白','黒','黒','茶','ダークブラウン'])[i]};
  result.pants.silhouette=style==='hiphop'?'ゆったりワイド':style==='adult'?'すっきりストレート':'ストレート';
  if(s==='summer'){result.outer.type='なし';result.outer.color='';result.top.type=i%2?'半袖シャツ':'Tシャツ';result.pants.type=i%2?'ワークパンツ':'チノパン';result.shoes.type=i%2?'キャンバススニーカー':'ローテクスニーカー';}
  if(s==='winter'){result.outer.type=['中綿ワークジャケット','ウールジャケット','裏地付きデニムジャケット','中綿ベスト','厚手ワークジャケット','ウールコート'][i];result.top.type=i%2?'ニット':'クルーネックスウェット';}
  if(/白T/.test(theme)){result.top.type='Tシャツ';result.top.color='白';}
  if(/ヴィンテージ|ビンテージ|古着/.test(theme)){if(/ネル/.test(theme)&&s!=='summer')result.outer.type='ヴィンテージ古着のチェックネルシャツ';else if(/スウェット/.test(theme)&&s!=='summer')result.top.type='ヴィンテージ古着のスウェット';else result.top.type='ヴィンテージ古着のプリントTシャツ';}
  if(/ブーツ/.test(theme)&&s!=='summer')result.shoes.type=i%2?'レースアップブーツ':'ワークブーツ';
  return result;
 }
 function plan(theme,style,value,mode='multi'){
  const info=analyze(theme,value,style);if(info.error)throw new Error(info.error);
  const counts=new Map(info.pool.map(id=>[id,0])), outfits=[];let lastPrimary='';
  const requestItems=category=>info.requests.flatMap(r=>{
   const b=byId.get(r.brand);let its=r.items.length?b.items.filter(it=>r.items.includes(it.id)):b.items.filter(it=>it.category===category);
   if(r.unknownModels.length&&!r.items.length)its=its.filter(it=>it.kind!=='model'&&it.kind!=='line');
   return its.filter(it=>it.category===category&&it.seasons.includes(info.season)).map(it=>({brand:b,item:it,segment:r.segment}));
  });
  for(let i=0;i<(mode==='same'?1:6);i++){
   const look=plain(info.generationTheme,style,i,info.season), used=new Set();
   for(const category of ['outer','top','pants']){
    if(category==='outer'&&info.season==='summer')continue;
    // A generic vintage/white-T garment is kept unbranded unless explicitly attributed.
    let explicit=requestItems(category);
    if(category==='outer'&&/古着.*ネル|ヴィンテージ.*ネル|ビンテージ.*ネル/.test(theme)&&!info.requests.some(r=>r.items.length))continue;
    if(category==='top'&&/白T/.test(theme))explicit=explicit.filter(x=>/Tシャツ/.test(x.item.type));
    let options=explicit.length?explicit:info.pool.flatMap(id=>byId.get(id).items.filter(it=>it.category===category&&it.seasons.includes(info.season)&&(!/白T/.test(theme)||category!=='top'||/Tシャツ/.test(it.type))).map(it=>({brand:byId.get(id),item:it,segment:''})));
    // Explicit item requests occupy their proper category; do not assign the
    // same brand to a different category merely to satisfy a requested number.
    if(!explicit.length)options=options.filter(x=>!info.requests.some(r=>r.brand===x.brand.id&&r.items.length));
    if(!options.length)continue;
    const ids=[...new Set(options.map(x=>x.brand.id))];
    ids.sort((a,b)=> (counts.get(a)-counts.get(b)) || (used.has(a)-used.has(b)) || ((a===lastPrimary)-(b===lastPrimary)) || info.pool.indexOf(a)-info.pool.indexOf(b));
    const id=ids[0], candidates=options.filter(x=>x.brand.id===id), chosen=candidates[i%candidates.length];
    const it=chosen.item;
    look[category]={brand:chosen.brand.name,type:it.type,color:it.colors[i%it.colors.length]};
    if(category==='pants')look.pants.silhouette=it.silhouettes[(style==='hiphop'?it.silhouettes.length-1:i)%it.silhouettes.length];
    const segment=chosen.segment;
    if(/白T/.test(segment)&&category==='top')look.top.color='白';
    if(/黒|ブラック/.test(segment))look[category].color='黒';
    // With a single known item, an unqualified black request applies to that item.
    if(info.requests.length===1&&/黒|ブラック/.test(theme))look[category].color='黒';
    used.add(id);counts.set(id,counts.get(id)+1);
   }
   if(/白T/.test(theme)&&!look.top.brand)look.top.color='白';
   lastPrimary=[...used][0]||'';
   outfits.push(look);
  }
  if(mode==='same')while(outfits.length<6)outfits.push(clone(outfits[0]));
  const usedBrands=[...new Set(outfits.flatMap(o=>['outer','top','pants'].map(c=>o[c].brand)).filter(Boolean))];
  return {...info,outfits,usedBrands};
 }
 const api={brands,categories:data.categories,settings,recognize,analyze,plan};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BrandRules=api;
})(typeof globalThis!=='undefined'?globalThis:this);
