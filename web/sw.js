/* ════════════════════════════════════════
   SERVICE WORKER — Calculadora de Figurinhas
   Estratégia:
     • HTML        → Network First  (atualiza sempre que online)
     • WASM / JS / CSS / imagens → Cache First (assets estáticos)
   ════════════════════════════════════════ */

const CACHE_NAME = 'figurinhas-v1';

/* Assets que entram no cache na instalação */
const ASSETS_PRECACHE = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './wasm/calculadora.js',
    './wasm/calculadora.wasm',
    './logo_figurinhas.svg',
    './logo_96h.png',
    './logo_192h.png',
    './banner.jpg',
];

/* ── Instalação: pré-cacheia todos os assets ── */
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache =>
            Promise.allSettled(
                ASSETS_PRECACHE.map(url =>
                    cache.add(url).catch(err =>
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
        ).then(() => self.clients.claim())    // assume controle das abas abertas
    );
});

/* ── Fetch: intercepta requisições ── */
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Ignora requisições externas (ex: analytics, CDNs de terceiros)
    if (url.origin !== location.origin) return;

    const isHTML = event.request.headers.get('accept')?.includes('text/html');

    if (isHTML) {
        // Network First para HTML: tenta rede, cai para cache se offline
        event.respondWith(networkFirst(event.request));
    } else {
        // Cache First para assets: serve do cache, atualiza em background
        event.respondWith(cacheFirst(event.request));
    }
});

/* ── Network First ── */
async function networkFirst(request) {
    try {
        const response = await fetch(request);
        const cache    = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
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

    // Não estava no cache (ex: asset novo): busca na rede e guarda
    try {
        const response = await fetch(request);
        const cache    = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
        return response;
    } catch {
        return new Response('Recurso indisponível offline.', { status: 503 });
    }
}