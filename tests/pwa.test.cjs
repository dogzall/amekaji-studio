const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const base = 'https://dogzall.github.io/amekaji-studio/';
function worker({ failInstall = false } = {}) {
  const handlers = {}, stores = new Map(), requests = [];
  let claims = 0, network = 0;
  const caches = {
    keys: async () => [...stores.keys()],
    delete: async name => stores.delete(name),
    open: async name => {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        addAll: async assets => {
          if (failInstall) throw new Error('asset unavailable');
          for (const request of assets) {
            requests.push(request);
            assert(fs.existsSync(path.join(root, new URL(request.url).pathname.replace('/amekaji-studio/', '') || 'index.html')));
            store.set(request.url, new Response('cached:' + request.url));
          }
        },
        match: async key => store.get(key)?.clone()
      };
    }
  };
  const self = { location: { href: base + 'sw.js' }, clients: { claim: async () => claims++ }, addEventListener: (type, fn) => handlers[type] = fn };
  vm.runInNewContext(read('sw.js'), { self, caches, URL, Request, Set, fetch: async () => { network++; throw new Error('offline'); } });
  return { handlers, stores, requests, claims: () => claims, network: () => network,
    lifecycle(type) { let pending; handlers[type]({ waitUntil: p => pending = p }); return pending; },
    fetch(url, method = 'GET') { let response; handlers.fetch({ request: new Request(url, { method }), respondWith: p => response = p }); return response; }
  };
}
test('manifest names, standalone mode, scope and real PNG dimensions', () => {
  const m = JSON.parse(read('manifest.webmanifest'));
  assert.equal(m.name, 'AMEKAJI STUDIO'); assert.equal(m.short_name, 'AMEKAJI');
  assert.equal(m.display, 'standalone'); assert.equal(m.start_url, '/amekaji-studio/'); assert.equal(m.scope, m.start_url);
  for (const icon of m.icons) {
    const png = fs.readFileSync(path.join(root, icon.src));
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    assert.equal(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`, icon.sizes);
    assert.equal(new URL(icon.src, base).pathname.startsWith(m.scope), true);
  }
  const html = read('index.html');
  assert(html.includes('rel="manifest" href="./manifest.webmanifest"'));
  assert(html.includes('name="theme-color" content="' + m.theme_color + '"'));
  assert(html.includes('src="app.js"')); assert(html.includes('src="pwa.js"'));
});
test('all shell files, query URLs and both entry documents work offline', async () => {
  const w = worker(); await w.lifecycle('install'); await w.lifecycle('activate');
  assert.equal(w.requests.length, 9); assert(w.requests.every(r => r.cache === 'reload'));
  for (const r of w.requests) assert((await (await w.fetch(r.url)).text()).startsWith('cached:'));
  assert((await (await w.fetch(base + '?source=home')).text()).startsWith('cached:'));
  assert((await (await w.fetch(base + 'app.js?v=1')).text()).startsWith('cached:'));
  assert.equal(w.network(), 0);
});
test('activation removes only this app’s old cache and never touches saved drafts', async () => {
  const w = worker(); w.stores.set('amekaji-studio-shell-v0', new Map()); w.stores.set('other-app-v1', new Map());
  await w.lifecycle('install'); await w.lifecycle('activate');
  assert(!w.stores.has('amekaji-studio-shell-v0')); assert(w.stores.has('other-app-v1')); assert(w.stores.has('amekaji-studio-shell-v1'));
  assert.equal(w.claims(), 1); assert(!read('sw.js').includes('localStorage')); assert(!read('sw.js').includes('skipWaiting('));
});
test('unrelated routes, origins and non-GET requests are untouched', () => {
  const w = worker();
  for (const url of ['https://example.com/app.js', 'https://dogzall.github.io/other/', base + 'missing.html']) assert.equal(w.fetch(url), undefined);
  assert.equal(w.fetch(base, 'POST'), undefined);
});
test('a failed install rejects and preserves the previous cache', async () => {
  const w = worker({ failInstall: true }); w.stores.set('amekaji-studio-shell-v0', new Map());
  await assert.rejects(w.lifecycle('install'), /asset unavailable/); assert(w.stores.has('amekaji-studio-shell-v0'));
});
test('registration is secure, scoped, separate and failure tolerant', async () => {
  for (const [supported, secure, expected] of [[true,true,1],[true,false,0],[false,true,0]]) {
    let calls = 0, load;
    const navigator = supported ? { serviceWorker: { register: async (url, options) => { calls++; assert.equal(url, './sw.js'); assert.equal(options.scope, './'); assert.equal(options.updateViaCache, 'none'); throw new Error('blocked'); } } } : {};
    vm.runInNewContext(read('pwa.js'), { navigator, window: { isSecureContext: secure, addEventListener: (_, fn) => load = fn }, console: { warn() {} } });
    if (load) load(); await new Promise(r => setImmediate(r)); assert.equal(calls, expected);
  }
});
test('existing generator still returns all four materials for 21 combinations', () => {
  const context = vm.createContext({ document: {} });
  vm.runInContext(read('app.js').split("$('#form').addEventListener")[0], context);
  for (const theme of ['デニム','ブーツ','ネルシャツ','スウェット','白T','ミリタリー','夏の着こなし']) for (const tone of ['guide','story','tips']) {
    context.theme = theme; context.tone = tone;
    const s = vm.runInContext("makeState(theme,tone,'アメカジ初心者')", context);
    assert.equal(s.scenes.length, 6); assert(s.subtitle.includes('00:00:30,000')); assert(s.narration.includes(theme)); assert.equal((s.prompt.match(/【CUT/g)||[]).length, 6);
  }
});
