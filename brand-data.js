/* Styling catalogue, not a stock/SKU database. Colours are outfit suggestions. */
(function(root){
 'use strict';
 const categories={work:'デニム・ワーク系',casual:'スウェット・カジュアル系',outdoor:'アウター・アウトドア系'};
 const palettes={top:['グレー','ネイビー','白','バーガンディ','オートミール','ダークグリーン'],pants:['ベージュ','チャコール','カーキ','黒','ネイビー','サンド'],denim:['インディゴ','淡いブルー','ブラック','濃紺','グレー','色落ちブルー'],outer:['ブラウン','ネイビー','オリーブ','黒','ベージュ','生成り']};
 const item=(id,type,category,options={})=>({id,type,category,kind:'category',aliases:[],colors:palettes[category]||palettes.outer,silhouettes:category==='pants'?['ストレート','ゆったりストレート']:['標準','ゆったり'],seasons:['spring','summer','autumn','winter'],...options});
 const denim=(id,type,aliases,silhouettes)=>item(id,type,'pants',{kind:'model',aliases,colors:palettes.denim,silhouettes});
 const jacket=(id,type,aliases=[])=>item(id,type,'outer',{aliases,seasons:['spring','autumn','winter']});
 const sweat=(id,type,aliases=[])=>item(id,type,'top',{aliases,seasons:['spring','autumn','winter']});
 const shirt=(id,type,aliases=[])=>item(id,type,'top',{aliases});
 const pants=(id,type,aliases=[])=>item(id,type,'pants',{aliases});
 const brand=(id,name,group,styles,aliases,items)=>({id,name,group,styles,aliases,items});
 const brands=[
  brand('levis',"Levi's",'work',['classic','hiphop','street','adult'],["Levi's",'Levi’s','Levis','リーバイス'],[denim('501','501デニム',['501'],['ストレート']),denim('505','505デニム',['505'],['レギュラーストレート']),denim('550','550デニム',['550'],['リラックステーパード']),jacket('denim-jacket','デニムジャケット',['デニムジャケット','トラッカージャケット'])]),
  brand('lee','Lee','work',['classic','hiphop','street','adult'],['Lee','リー'],[denim('101','101デニム',['101'],['ストレート']),jacket('denim-jacket','デニムジャケット',['デニムジャケット']),pants('work-pants','ワークパンツ',['ワークウェア','ワークパンツ'])]),
  brand('wrangler','Wrangler','work',['classic','hiphop','street','adult'],['Wrangler','ラングラー'],[item('denim','デニム','pants',{aliases:['デニム','ジーンズ'],colors:palettes.denim}),shirt('western','ウエスタンシャツ',['ウエスタンシャツ'])]),
  brand('carhartt','Carhartt','work',['classic','hiphop','street'],['Carhartt','カーハート'],[jacket('duck-jacket','ダックジャケット',['ダックジャケット','ジャケット']),pants('double-knee','ダブルニーワークパンツ',['ダブルニー']),pants('work-pants','ワークパンツ',['ワークパンツ']),pants('painter','ペインターパンツ',['ペインター']),shirt('pocket-tee','ポケットTシャツ',['ポケットTシャツ','Tシャツ','白T'])]),
  brand('dickies','Dickies','work',['classic','hiphop','street','adult'],['Dickies','ディッキーズ'],[item('874','874ワークパンツ','pants',{kind:'model',aliases:['874'],silhouettes:['ストレート','ゆったりストレート']}),pants('double-knee','ダブルニーパンツ',['ダブルニー']),shirt('work-shirt','ワークシャツ',['ワークシャツ'])]),
  brand('ben-davis','Ben Davis','work',['classic','hiphop','street'],['Ben Davis','ベンデイビス','ベンデービス'],[pants('work-pants','ワークパンツ',['ワークパンツ']),shirt('work-shirt','ワークシャツ',['ワークシャツ'])]),
  brand('red-kap','Red Kap','work',['classic','street','adult'],['Red Kap','レッドキャップ'],[shirt('work-shirt','ワークシャツ',['ワークシャツ']),pants('work-pants','ワークパンツ',['ワークパンツ'])]),
  brand('champion','Champion','casual',['classic','hiphop','street','adult'],['Champion','チャンピオン'],[sweat('crew','クルーネックスウェット',['スウェット','クルーネック']),sweat('reverse-weave','リバースウィーブ スウェット',['リバースウィーブ','Reverse Weave']),sweat('hoodie','スウェットパーカ',['パーカー','パーカ','フーディ']),shirt('tee','Tシャツ',['Tシャツ','白T'])]),
  brand('russell','Russell Athletic','casual',['classic','hiphop','street'],['Russell Athletic','ラッセルアスレティック'],[sweat('sweat','スウェット',['スウェット']),sweat('hoodie','パーカー',['パーカー','パーカ'])]),
  brand('hanes','Hanes','casual',['classic','hiphop','street','adult'],['Hanes','ヘインズ'],[shirt('tee','Tシャツ',['Tシャツ','白T']),sweat('sweat','スウェット',['スウェット'])]),
  brand('gap','GAP','casual',['classic','hiphop','street','adult'],['GAP','ギャップ'],[sweat('sweat','スウェット',['スウェット']),pants('chino','チノパン',['チノパン']),item('denim','デニム','pants',{aliases:['デニム','ジーンズ'],colors:palettes.denim})]),
  brand('ralph-lauren','Ralph Lauren','casual',['classic','adult'],['Ralph Lauren','ラルフローレン'],[shirt('oxford','オックスフォードシャツ',['オックスフォードシャツ']),pants('chino','チノパン',['チノパン']),sweat('knit','ニット',['ニット','セーター'])]),
  brand('schott','Schott','outdoor',['classic','street','adult'],['Schott','ショット'],[jacket('leather','レザージャケット',['レザージャケット','ライダース'])]),
  brand('alpha','Alpha Industries','outdoor',['classic','hiphop','street'],['Alpha Industries','アルファインダストリーズ'],[jacket('ma1','MA-1フライトジャケット',['MA-1','MA1']),jacket('flight','フライトジャケット',['フライトジャケット'])]),
  brand('llbean','L.L.Bean','outdoor',['classic','street','adult'],['L.L.Bean','LLBean','エルエルビーン'],[jacket('outdoor','アウトドアジャケット',['アウトドアジャケット']),shirt('flannel','フランネルシャツ',['フランネルシャツ','ネルシャツ'])]),
  brand('eddie-bauer','Eddie Bauer','outdoor',['classic','adult'],['Eddie Bauer','エディーバウアー'],[jacket('outdoor','アウトドアジャケット',['アウトドアジャケット']),jacket('down-vest','ダウンベスト',['ダウンベスト'])])
 ];
 brands.find(b=>b.id==='llbean').items.find(i=>i.id==='flannel').seasons=['spring','autumn','winter'];
 brands.find(b=>b.id==='champion').items.find(i=>i.id==='reverse-weave').kind='line';
 const api={brands,categories,palettes};
 if(typeof module!=='undefined'&&module.exports) module.exports=api; else root.BrandData=api;
})(typeof globalThis!=='undefined'?globalThis:this);
