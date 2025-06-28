const CACHE_NAME = 'heroframe-cache-v9'; // Increased cache version to force update after CORS fix
const urlsToCache = [
    '/HeroFrame-CharSheet-0.1/', // Base path for your PWA on GitHub Pages
    '/HeroFrame-CharSheet-0.1/index.html',
    '/HeroFrame-CharSheet-0.1/management.html',
    '/HeroFrame-CharSheet-0.1/manifest.json',
    '/HeroFrame-CharSheet-0.1/icons/icon-192x192.png',
    '/HeroFrame-CharSheet-0.1/icons/icon-512x512.png',
    // Removed external CDN links from here.
    // These will now load directly from the network when needed by the browser,
    // and the Service Worker will not attempt to cache them, avoiding CORS issues.
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
                console.error('Service Worker install failed during caching:', error);
                // Log the error but still try to activate to proceed if possible
            })
    );
});

self.addEventListener('fetch', event => {
    // Determine if the request URL is for one of our explicitly cached assets
    const url = new URL(event.request.url);
    // Pathname starts with '/' for absolute path from domain root
    // We need to check if it matches our base path + any specific file
    const isOurAsset = urlsToCache.some(cachedUrl => {
        // For the root path '/HeroFrame-CharSheet-0.1/', also match if just '/HeroFrame-CharSheet-0.1' (without trailing slash)
        if (cachedUrl === '/HeroFrame-CharSheet-0.1/') {
            return url.pathname === '/HeroFrame-CharSheet-0.1/' || url.pathname === '/HeroFrame-CharSheet-0.1';
        }
        return url.pathname === cachedUrl;
    });

    if (isOurAsset) {
        event.respondWith(
            caches.match(event.request).then(response => {
                // If found in cache, return it
                if (response) {
                    return response;
                }
                // Otherwise, fetch from network and try to cache
                return fetch(event.request).then(netResponse => {
                    // Only cache successful responses and same-origin ('basic' type)
                    // or explicitly CORS-allowed resources IF they were intended to be cached
                    if (netResponse && netResponse.status === 200 && netResponse.type === 'basic') {
                        const responseToCache = netResponse.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return netResponse;
                }).catch(error => {
                    console.warn('Fetch and cache for local asset failed (network or other issue):', event.request.url, error);
                    // You might return a fallback response here for offline if needed
                    throw error;
                });
            })
        );
    } else {
        // For all other resources (especially external CDNs), just let them go to the network directly.
        // The Service Worker will not intercept them or try to cache them.
        event.respondWith(fetch(event.request).catch(error => {
            console.warn('Direct network fetch for external resource failed:', event.request.url, error);
            // This catch handles network errors for non-cached external assets.
            // It will not produce a CORS error related to the Service Worker trying to cache them.
            throw error; // Re-throw to propagate the network error if it happens
        }));
    }
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
