/* Registro do Service Worker — externalizado para compatibilidade com CSP sem unsafe-inline */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .catch(err => console.warn('SW não registrado:', err));
    });
}