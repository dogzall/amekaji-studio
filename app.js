'use strict';
const $ = s => document.querySelector(s);
const labels = { script:'台本', subtitle:'字幕', narration:'ナレーション', prompt:'画像プロンプト', posting:'投稿文' };
const filenames = { script:'script.txt', subtitle:'subtitles.srt', narration:'narration.txt', prompt:'image-prompts.txt', posting:'posting.txt' };
const descriptions = {
  script:'各5秒・全6シーン。台本はタップして編集できます。',
  subtitle:'6シーンのSRT字幕。タイムコードも編集できます。',
  narration:'シーンごとの読み上げ原稿。30秒に収まるよう読み速度を調整してください。',
  prompt:'9:16・全身・服装・背景・構図を指定。画像自体は生成しません。',
  posting:'YouTube Shorts・TikTokのタイトル、投稿文、ハッシュタグ。'
};
let active = 'script', state, history = [], activeHistoryId = null;
function toast(message) {
  $('#toast').textContent = message; $('#toast').classList.add('show');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => $('#toast').classList.remove('show'), 3600);
}
function readStorage(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }
function save() {
  if (activeHistoryId) {
    const entry = history.find(h => h.id === activeHistoryId);
    if (entry) entry.state = JSON.parse(JSON.stringify(state));
  }
  try {
    localStorage.setItem('amekaji-v1', JSON.stringify({ state, theme:state.theme, tone:state.tone, audience:state.audience, activeHistoryId }));
    localStorage.setItem('amekaji-history-v2', JSON.stringify(history));
    $('#storage-note').textContent = 'この端末のブラウザに自動保存。直近10件を履歴から再利用できます。';
    return true;
  } catch {
    $('#storage-note').textContent = '端末に保存できません。閉じる前にZIPまたはTXTで保存してください。';
    return false;
  }
}
function edited() { if (!save()) toast('端末への保存ができません。ZIPまたはTXTで保存してください。'); }
function syncForm() { $('#theme').value=state.theme; $('#tone').value=state.tone; $('#audience').value=state.audience; $('#style').value=state.style; }
function currentText() { return Studio.files(state)[filenames[active]]; }
function download(blob, name) {
  const a=document.createElement('a'), url=URL.createObjectURL(blob);
  a.href=url; a.download=name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000); toast('ダウンロードを開始しました');
}
async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast('コピーしました'); }
  catch {
    const t=document.createElement('textarea'); t.value=text; document.body.append(t); t.select();
    let ok=false; try { ok=document.execCommand('copy'); } catch {} t.remove();
    toast(ok ? 'コピーしました' : 'コピーできませんでした。TXT保存をご利用ください。');
  }
}
function renderHistory() {
  const list=$('#history-list'); list.replaceChildren();
  $('#history-empty').hidden=history.length > 0;
  history.forEach(entry => {
    const b=document.createElement('button'); b.type='button'; b.className='history-item';
    const name=document.createElement('strong'); name.textContent=entry.state.theme;
    const note=document.createElement('span'); note.textContent=`${Studio.styles[entry.state.style].name} ／ ${new Date(entry.savedAt).toLocaleString('ja-JP')}`;
    b.append(name,note);
    b.addEventListener('click', () => {
      state=Studio.normalize(JSON.parse(JSON.stringify(entry.state))); activeHistoryId=entry.id;
      syncForm(); const saved=save(); render(); $('#status').textContent='履歴から復元';
      toast(saved ? '編集内容を含めて履歴から復元しました' : '復元しました。端末に保存できないためファイルで保存してください。');
      if(innerWidth<681) $('.result').scrollIntoView({behavior:'smooth',block:'start'});
    }); list.append(b);
  });
}
function render() {
  $('#concept').textContent=state.theme;
  $('#tone-label').textContent=Studio.styles[state.style].name;
  $('#outfit').value=state.outfit;
  $('#panel-description').textContent=descriptions[active];
  $('#download').textContent=active==='subtitle' ? 'SRTで保存 ↓' : `${labels[active]}をTXT保存 ↓`;
  document.querySelectorAll('[data-tab]').forEach(b => {
    const selected=b.dataset.tab===active; b.classList.toggle('active',selected); b.setAttribute('aria-pressed',selected);
  });
  const panel=$('#panel'); panel.replaceChildren();
  if(active==='script') state.scenes.forEach((scene,i) => {
    const card=document.createElement('article'); card.className='scene';
    const meta=document.createElement('div'); meta.className='scene-meta';
    meta.innerHTML=`<strong>${String(i+1).padStart(2,'0')}</strong><span>${String(i*5).padStart(2,'0')}–${String((i+1)*5).padStart(2,'0')}s</span>`;
    const content=document.createElement('div'); content.className='scene-content';
    const label=document.createElement('span'); label.textContent=['HOOK / つかみ','OUTFIT / 全身','DETAIL / 素材','POINT / 合わせ方','STYLING / 足元','CLOSING / 締め'][i];
    const t=document.createElement('textarea'); t.value=scene.text; t.rows=2; t.setAttribute('aria-label',`シーン${i+1}の台本`);
    t.addEventListener('input',() => { scene.text=t.value; edited(); });
    const shot=document.createElement('p'); shot.textContent='映像 ｜ '+scene.shot;
    content.append(label,t,shot); card.append(meta,content); panel.append(card);
  }); else {
    const edit=document.createElement('textarea'); edit.className='editor'; edit.value=state[active]; edit.setAttribute('aria-label',labels[active]);
    edit.addEventListener('input', () => { state[active]=edit.value; edited(); }); panel.append(edit);
  }
  renderHistory();
}
$('#form').addEventListener('submit', event => {
  event.preventDefault(); const theme=$('#theme').value.trim();
  if(!theme) { $('#theme').setCustomValidity('テーマを入力してください'); $('#theme').reportValidity(); return; }
  state=Studio.makeState(theme,$('#tone').value,$('#audience').value,$('#style').value);
  history=Studio.addHistory(history,state); activeHistoryId=history[0].id;
  const saved=save(); active='script'; render(); $('#status').textContent='作成済み';
  toast(saved ? '5種類の素材をテンプレートで作成し、履歴に保存しました' : '素材を作成しました。端末に保存できないためZIPで保存してください。');
  if(innerWidth<681) $('.result').scrollIntoView({behavior:'smooth',block:'start'});
});
$('#theme').addEventListener('input', () => $('#theme').setCustomValidity(''));
$('#outfit').addEventListener('input', () => { state.outfit=$('#outfit').value; edited(); });
document.querySelectorAll('[data-example]').forEach(b => b.addEventListener('click', () => { $('#theme').value=b.dataset.example; $('#theme').setCustomValidity(''); $('#theme').focus(); }));
document.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { active=b.dataset.tab; render(); }));
$('#copy-tab').addEventListener('click', () => copy(currentText()));
$('#all-copy').addEventListener('click', () => copy(Studio.allText(state)));
$('#download').addEventListener('click', () => download(new Blob(['\ufeff'+currentText()], {type:'text/plain;charset=utf-8'}), filenames[active]));
$('#zip-download').addEventListener('click', () => {
  try { download(StudioZip.zip(Studio.files(state)), 'amekaji-materials.zip'); }
  catch { toast('ZIPを作成できませんでした。各素材をTXT/SRTで保存してください。'); }
});
const storedHistory=readStorage('amekaji-history-v2');
if(Array.isArray(storedHistory)) history=storedHistory.filter(e => e && typeof e.id==='string' && !isNaN(Date.parse(e.savedAt)) && Studio.normalize(e.state)).slice(0,10).map(e => ({...e,state:Studio.normalize(e.state)}));
const previous=readStorage('amekaji-v1');
state=Studio.normalize(previous?.state);
if(state) { activeHistoryId=typeof previous.activeHistoryId==='string' ? previous.activeHistoryId : null; $('#status').textContent='保存済み'; syncForm(); }
else state=Studio.makeState($('#theme').value,$('#tone').value,$('#audience').value,$('#style').value);
render();
