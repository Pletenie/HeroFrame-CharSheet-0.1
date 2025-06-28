const CACHE_NAME = 'heroframe-cache-v8'; // Increased cache version to force update after CORS fix
const urlsToCache = [
    '/HeroFrame-CharSheet-0.1/', // Base path for your PWA on GitHub Pages
    '/HeroFrame-CharSheet-0.1/index.html',
    '/HeroFrame-CharSheet-0.1/management.html',
    '/HeroFrame-CharSheet-0.1/manifest.json',
    '/HeroFrame-CharSheet-0.1/icons/icon-192x192.png',
    '/HeroFrame-CharSheet-0.1/icons/icon-512x512.png',
    // Removed external CDN links from here to avoid CORS issues during pre-caching
    // These will still load directly from the network when needed by the browser.
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                // Only cache local assets to avoid CORS issues
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting()) // Activates the new service worker immediately
            .catch(error => {
                console.error('Service Worker install failed:', error);
                // Log the error but still try to activate to proceed if possible
            })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                // No cache hit - fetch from network
                return fetch(event.request).then(
                    function(response) {
                        // Check if we received a valid response and it's a same-origin resource
                        // Only cache successful responses for same-origin or CORS-allowed resources
                        const shouldCache = response.status === 200 && (response.type === 'basic' || response.type === 'cors');

                        if(shouldCache) {
                            var responseToCache = response.clone();
                            caches.open(CACHE_NAME)
                                .then(function(cache) {
                                    cache.put(event.request, responseToCache);
                                });
                        }
                        return response;
                    }
                ).catch(error => {
                    console.warn('Fetch failed (network error or CORS for non-cached asset):', event.request.url, error);
                    // You might return a fallback response here for offline if needed
                    // For now, simply log and let the browser handle it (e.g., show network error)
                    throw error; // Re-throw the error to ensure the fetch promise is rejected
                });
            })
    );
});

self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Takes control of already open pages
    );
});
