/* Bump VERSION whenever an app-shell file changes. A new worker waits until
 * all old app windows close, so an editing session is never forcibly reloaded. */
const VERSION = 'v1';
const CACHE_PREFIX = 'amekaji-studio-shell-';
const CACHE_NAME = CACHE_PREFIX + VERSION;
const BASE = new URL('./', self.location.href);
const SHELL = [
  './', 'index.html', 'style.css', 'app.js', 'pwa.js',
  'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png',
  'icons/icon-maskable-512.png'
].map(path => new URL(path, BASE).href);
const SHELL_URLS = new Set(SHELL);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
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
  const key = url.href;
  if (!SHELL_URLS.has(key)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(key);
    return response || fetch(request);
  })());
});
