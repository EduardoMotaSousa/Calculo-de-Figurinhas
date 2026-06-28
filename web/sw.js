/* ════════════════════════════════════════
   SERVICE WORKER — Calculadora de Figurinhas
   Estratégia:
     • HTML        → Network First  (atualiza sempre que online)
     • WASM / JS / CSS / imagens → Cache First (assets estáticos)
   ════════════════════════════════════════ */

const CACHE_NAME = 'figurinhas-v6';

/* Assets que entram no cache na instalação.
   Excluídos intencionalmente do precache:
     - icon_512x512.png (21 KB) — só lido pelo OS ao instalar o PWA, não em navegação
     - banner.jpg      (56 KB) — OG image, nunca carregado pela interface normal
   Ambos ainda são cacheados on-demand pela estratégia Cache First se o OS/browser
   os requisitar depois da instalação. */
const ASSETS_PRECACHE = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './wasm/calculadora.js',
    './wasm/calculadora.wasm',
    './logo_figurinhas.svg',
    './icon_96x96.png',
    './icon_192x192.png',
    './manifest.json',
    './registrar-sw.js',
];

/* ── Instalação: pré-cacheia todos os assets ── */
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache =>
            Promise.allSettled(
                ASSETS_PRECACHE.map(url =>
                    fetch(url).then(res => {
                        /* Só cacheia respostas válidas — evita cache poisoning com 4xx/5xx */
                        if (res.ok) return cache.put(url, res);
                        console.warn('SW: resposta não-ok para', url, res.status);
                    }).catch(err =>
                        console.warn('SW: falha ao cachear', url, err)
                    )
                )
            )
        ).then(() => self.skipWaiting())
    );
});

/* ── Ativação: remove caches antigos ── */
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

/* ── Fetch: intercepta requisições ── */
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    /* Ignora requisições externas (CDNs, analytics etc.) */
    if (url.origin !== location.origin) return;

    const isHTML = event.request.headers.get('accept')?.includes('text/html');

    if (isHTML) {
        event.respondWith(networkFirst(event.request));
    } else {
        event.respondWith(cacheFirst(event.request));
    }
});

/* ── Network First ── */
async function networkFirst(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        const cached = await caches.match(request);
        return cached ?? new Response('Offline — abra o site uma vez com internet.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
    }
}

/* ── Cache First ── */
async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        return new Response('Recurso indisponível offline.', { status: 503 });
    }
}