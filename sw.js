/* Bump VERSION whenever an app-shell file changes. A new worker waits until
 * all old app windows close, so an editing session is never forcibly reloaded. */
const VERSION = 'v3.1-brands-1';
const CACHE_PREFIX = 'amekaji-studio-shell-';
const CACHE_NAME = CACHE_PREFIX + VERSION;
const BASE = new URL('./', self.location.href);
const SHELL = [
  'index.html', 'style.css', 'app.js', 'pwa.js', 'materials.js', 'zip.js', 'scene-kit.js', 'brand-data.js', 'brand-rules.js',
  'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png',
  'icons/icon-maskable-512.png'
].map(path => new URL(path, BASE).href);
const SHELL_URLS = new Set(SHELL);
const DOCUMENT_URL = new URL('index.html', BASE).href;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Only fetch index.html for the entry document. A directory URL 404 must
    // not reject the entire update and strand an installed app on an old shell.
    // Reload bypasses the HTTP cache, preventing stale files in a new version.
    await cache.addAll(SHELL.map(url => new Request(url, { cache: 'reload' })));
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== BASE.origin || !url.pathname.startsWith(BASE.pathname)) return;
  // Only the root document and index.html are app navigations. Leave unrelated
  // Pages routes, other apps on the origin, and non-shell requests untouched.
  url.search = '';
  // Root and index.html share one cached document, including launch queries.
  // This also makes the controlled root work when the server directory URL fails.
  const key = url.href === BASE.href ? DOCUMENT_URL : url.href;
  if (!SHELL_URLS.has(key)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(key);
    return response || fetch(request);
  })());
});
