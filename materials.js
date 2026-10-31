/* Local, deterministic templates. No network requests or AI service. */
(function (root) {
  'use strict';
  const styles = {
    classic: { name: '王道アメカジ', top: '白のヘビーウェイトTシャツ', outer: 'Carharttのブラウンのダックジャケット', pants: "Levi’s 501のインディゴデニム", shoes: '茶色のレザーブーツ', fit: 'ジャストサイズの上半身とストレートパンツ', bg: '赤レンガ倉庫の前、午後の自然光', tip: '茶とインディゴで、王道の配色に。', tag: '王道アメカジ' },
    hiphop: { name: '90年代HIPHOP', top: 'Championのグレーのオーバーサイズスウェット', outer: 'ネイビーのゆったりしたナイロンジャケット', pants: 'Dickiesのベージュのワイドワークパンツ', shoes: '白のハイカットスニーカー', fit: '身幅を広く、パンツはゆったりしたシルエット', bg: '90年代の街角を思わせるコンクリート壁の前、柔らかな曇天光', tip: '身幅と足元に、ゆとりを残そう。', tag: '90年代HIPHOP' },
    street: { name: '古着ストリート', top: 'フェードした黒のヴィンテージプリントTシャツ', outer: '赤系チェックの古着ネルシャツ', pants: "Levi’sの色落ちしたルーズデニム", shoes: '黒のローテクスニーカー', fit: 'ゆるい上半身とストレートのボトム', bg: '古着屋の木製ドアの前、夕方の柔らかな光', tip: '色を拾って、古着の柄をなじませよう。', tag: '古着ストリート' },
    adult: { name: '40代の大人アメカジ', top: '無地のアイボリーのTシャツ', outer: 'オリーブの落ち着いたワークジャケット', pants: "Levi’sの濃紺ストレートデニム", shoes: 'ダークブラウンの革靴', fit: '肩と丈を合わせた、すっきりしたシルエット', bg: '落ち着いたカフェの外壁の前、午前の自然光', tip: '色数を絞って、丈をすっきり整えよう。', tag: '大人アメカジ' }
  };
  const clone = value => JSON.parse(JSON.stringify(value));
  function outfitFor(theme, style) {
    const s = Object.hasOwn(styles, style) ? styles[style] : styles.classic;
    const look = { top: s.top, outer: s.outer, pants: s.pants, shoes: s.shoes };
    const brands = [];
    if (/carhartt|カーハート/i.test(theme)) {
      brands.push('Carhartt');
      if (/パンツ|ペインター|ダブルニー/.test(theme)) look.pants = 'Carharttのブラウンのダブルニーワークパンツ';
      else if (/Tシャツ|白T/.test(theme)) look.top = 'Carharttの白のポケットTシャツ';
      else look.outer = 'Carharttのブラウンのダックジャケット';
    }
    if (/levi[’']?s|リーバイス|501|505/i.test(theme)) { brands.push("Levi's"); look.pants = /黒|ブラック/.test(theme) ? "Levi'sのブラックストレートデニム" : "Levi's 501のインディゴデニム"; }
    else if (/デニム|ジーンズ/.test(theme) && !/carhartt|カーハート/i.test(theme)) look.pants = "Levi'sのインディゴストレートデニム";
    if (/dickies|ディッキーズ/i.test(theme)) { brands.push('Dickies'); look.pants = /黒|ブラック/.test(theme) ? 'Dickiesの黒のワークパンツ' : 'Dickies 874のベージュのワークパンツ'; }
    if (/champion|チャンピオン/i.test(theme)) { brands.push('Champion'); look.top = /Tシャツ|白T/.test(theme) ? 'Championの白のTシャツ' : 'Championのグレーのクルーネックスウェット'; }
    if (/ヴィンテージ|ビンテージ|古着/.test(theme)) { brands.push('ヴィンテージ古着'); if (/ネル|シャツ/.test(theme)) look.outer = 'ヴィンテージ古着の赤系チェックネルシャツ'; else if (/スウェット/.test(theme) && !/champion|チャンピオン/i.test(theme)) look.top = 'ヴィンテージ古着のフェードネイビーのスウェット'; else if (!/champion|チャンピオン/i.test(theme)) look.top = 'ヴィンテージ古着のフェードした黒のプリントTシャツ'; }
    if (/ネルシャツ/.test(theme) && !/ヴィンテージ|ビンテージ|古着/.test(theme)) look.outer = '赤系チェックのコットンネルシャツ';
    if (/スウェット|パーカ/.test(theme) && !/champion|チャンピオン|古着|ヴィンテージ|ビンテージ/i.test(theme)) look.top = 'グレーのコットンスウェット';
    if (/ミリタリー|軍|カーゴ|MA-1|M65/i.test(theme)) look.outer = 'オリーブのミリタリージャケット';
    if (/白T/.test(theme)) look.top = '白のヘビーウェイトTシャツ';
    if (/ブーツ/.test(theme)) look.shoes = 'ブラウンのレザーワークブーツ';
    const name = brands.length ? brands.join(' × ') : '素材とシルエット';
    return { ...look, brands, focus: name, text: `トップス：${look.top}\n羽織り：${look.outer}\nパンツ：${look.pants}\n靴：${look.shoes}\nバランス：${s.fit}` };
  }
  const srt = scenes => scenes.map((s, i) => `${i + 1}\n00:00:${String(i * 5).padStart(2, '0')},000 --> 00:00:${String((i + 1) * 5).padStart(2, '0')},000\n${s.subtitle}`).join('\n\n');
  function makeState(theme, tone = 'guide', audience = 'アメカジ初心者', style = 'classic') {
    theme = String(theme).trim().slice(0, 120);
    if (!theme) throw new Error('テーマを入力してください');
    if (!Object.hasOwn(styles, style)) style = 'classic';
    const s = styles[style], look = outfitFor(theme, style);
    const brief = theme.length > 22 ? theme.slice(0, 22) + '…' : theme;
    const lines = [
      tone === 'story' ? `「${brief}」。好きな服で、今日を変える。` : tone === 'tips' ? `「${brief}」。合わせ方のコツは？` : `「${brief}」。30秒で着こなしのヒント。`,
      'まずは全身。色と形のバランスを見よう。',
      tone === 'story' ? '素材の表情が、いつもの服に奥行きをくれる。' : '次は素材。質感とディテールに注目。',
      s.tip,
      tone === 'tips' ? '袖と裾を整えたら、全身をもう一度チェック。' : '足元まで整えて、自分らしい着こなしに。',
      'あなたならどう着る？ 保存して、次のコーデに。'
    ];
    const shots = ['全身正面、両足を入れた引きの構図', '全身を斜め45度から、羽織りを軽く開く', '全身を画面に収め、片手で素材の裾を示す', '全身正面、腕を自然に下ろし上下のバランスを見せる', '全身の横姿、靴とパンツの丈が分かる構図', '全身正面、自然な立ち姿で締める'];
    const scenes = lines.map((text, i) => ({ text, subtitle: [brief, '全身のバランスから', '素材とディテール', s.tip, '足元と丈を整える', '保存して次のコーデへ'][i], narration: text, shot: shots[i], prompt: `【SCENE ${i + 1} / ${i * 5}–${(i + 1) * 5}秒】\nテーマ：${theme}\nスタイル：${s.name}。対象：${audience}。\n縦型9:16、実写のファッション写真。${style === 'adult' ? '40代の成人モデル' : '成人モデル'}一人。全シーンで同一人物・同一服装。頭から靴先まで人物全身を収め、頭上と足元に余白を残す。\n服装：${look.top}、${look.outer}、${look.pants}、${look.shoes}。${s.fit}。\n背景：${s.bg}。構図：${shots[i]}。カメラは腰の高さ、自然な遠近感、服の質感が見える明るさ。${tone === 'story' ? 'フィルム映画のような落ち着いた色調。' : '服の色と形がはっきり分かる自然な色調。'}\n字幕用に上部に余白。文字・透かし・ブランドロゴの描画なし。顔や足先を切らない。` }));
    const tags = [...new Set(['#アメカジ', '#' + s.tag, '#コーデ', ...look.brands.map(b => '#' + b.replace(/[^\p{L}\p{N}_]/gu, ''))])].join(' ');
    const title = `${theme}｜${s.name}の着こなし`.slice(0, 90);
    return { theme, tone, audience, style, outfit: look.text, scenes, subtitle: srt(scenes), narration: scenes.map((s,i) => `【${i * 5}–${(i + 1) * 5}秒】\n${s.narration}`).join('\n\n'), prompt: scenes.map(s => s.prompt).join('\n\n'), posting: `【YouTube Shorts】\nタイトル：${title}\n投稿文：${theme}を${s.name}で。素材・配色・シルエットを6シーンで紹介。次のコーデ用に保存してみてください。\n${tags} #Shorts\n\n【TikTok】\nタイトル：${title}\n投稿文：今日のテーマは「${theme}」。${s.name}なら、あなたはどう合わせる？ お気に入りの合わせ方をコメントで教えてください。\n${tags} #TikTok\n\n※ローカルテンプレートで作成した下書きです。実際の着用品に合わせて編集してください。`, createdAt: new Date().toISOString() };
  }
  function normalize(value) {
    if (!value || typeof value.theme !== 'string' || !value.theme.trim() || !Array.isArray(value.scenes) || value.scenes.length !== 6 || !value.scenes.every(s => s && typeof s.text === 'string' && typeof s.shot === 'string')) return null;
    const defaults = makeState(value.theme, value.tone, value.audience, value.style);
    return { ...defaults, ...value, style: Object.hasOwn(styles, value.style) ? value.style : 'classic', tone: ['guide','story','tips'].includes(value.tone) ? value.tone : 'guide', audience: typeof value.audience === 'string' ? value.audience : 'アメカジ初心者', posting: typeof value.posting === 'string' ? value.posting : defaults.posting, outfit: typeof value.outfit === 'string' ? value.outfit : defaults.outfit, ...Object.fromEntries(['subtitle','narration','prompt'].map(k => [k, typeof value[k] === 'string' ? value[k] : defaults[k]])) };
  }
  function files(state) {
    const script = state.scenes.map((s,i) => `SCENE ${i + 1} / ${i * 5}–${(i + 1) * 5}秒\n${s.text}\n映像：${s.shot}`).join('\n\n');
    return { 'script.txt': `テーマ：${state.theme}\nスタイル：${styles[state.style]?.name || styles.classic.name}\n\n${state.outfit}\n\n${script}`, 'subtitles.srt': state.subtitle, 'narration.txt': state.narration, 'image-prompts.txt': state.prompt, 'posting.txt': state.posting };
  }
  function allText(state) { return Object.entries(files(state)).map(([name,text]) => `【${name}】\n${text}`).join('\n\n'); }
  function addHistory(list, state, now = Date.now()) {
    return [{ id: String(now) + '-' + Math.random().toString(36).slice(2,8), savedAt: new Date(now).toISOString(), state: clone(state) }, ...list].slice(0, 10);
  }
  const api = { styles, makeState, normalize, outfitFor, files, allText, addHistory };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Studio = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
