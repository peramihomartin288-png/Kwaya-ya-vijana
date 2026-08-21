// ============================================
// KMCA - SERVICE WORKER
// App Flow + Push Notifications + Offline + Badge
// ============================================

const CACHE_NAME = 'kmca-cache-v7';
const urlsToCache = [
    './',
    './index.html',
    './register.html',
    './welcome.html',
    './share.html',
    './home.html',
    './history.html',
    './css/style.css',
    './css/responsive.css',
    './js/supabase.js',
    './js/auth.js',
    './js/dark-mode.js',
    './js/home.js',
    './js/history.js',
    './manifest.json',
    './logo.png'
];

// ========== INSTALL ==========
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                console.log('KMCA - Caching app files...');
                return Promise.all(
                    urlsToCache.map(function(url) {
                        return cache.add(url).catch(function(err) {
                            console.log('Failed to cache:', url, err);
                        });
                    })
                );
            })
            .then(function() {
                return self.skipWaiting();
            })
    );
});

// ========== ACTIVATE ==========
self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(function() {
            return self.clients.claim();
        })
    );
});

// ========== FETCH (App Flow + Offline) ==========
self.addEventListener('fetch', function(event) {
    if (event.request.method !== 'GET') return;
    if (event.request.url.includes('supabase.co')) return;
    if (event.request.url.startsWith('chrome-extension://')) return;
    
    event.respondWith(
        caches.match(event.request)
            .then(function(response) {
                // Return cached response first (app flow)
                if (response) {
                    // Update cache in background
                    fetch(event.request).then(function(freshResponse) {
                        if (freshResponse && freshResponse.status === 200) {
                            caches.open(CACHE_NAME).then(function(cache) {
                                cache.put(event.request, freshResponse);
                            });
                        }
                    }).catch(function() {});
                    
                    return response;
                }
                
                // If not cached, fetch and cache
                return fetch(event.request).then(function(fetchResponse) {
                    if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
                        return fetchResponse;
                    }
                    
                    var responseToCache = fetchResponse.clone();
                    caches.open(CACHE_NAME).then(function(cache) {
                        cache.put(event.request, responseToCache);
                    });
                    
                    return fetchResponse;
                }).catch(function() {
                    // Offline fallback
                    if (event.request.mode === 'navigate') {
                        return caches.match('./index.html');
                    }
                    return caches.match(event.request);
                });
            })
    );
});

// ========== PUSH NOTIFICATIONS ==========
self.addEventListener('push', function(event) {
    let data = {
        title: 'KMCA',
        body: 'Kuna taarifa mpya!',
        icon: './logo.png',
        badge: './logo.png'
    };
    
    if (event.data) {
        try {
            const jsonData = event.data.json();
            data = Object.assign(data, jsonData);
        } catch (e) {
            data.body = event.data.text();
        }
    }
    
    const options = {
        body: data.body,
        icon: data.icon || './logo.png',
        badge: data.badge || './logo.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || './home.html'
        },
        actions: [
            { action: 'open', title: 'Fungua' },
            { action: 'close', title: 'Funga' }
        ],
        tag: 'kmca-' + Date.now(),
        renotify: true
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// ========== NOTIFICATION CLICK ==========
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    if (event.action === 'close') return;
    
    const url = event.notification.data.url || './home.html';
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(function(clientList) {
                // Check kama app tayari iko wazi
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        return client.focus();
                    }
                }
                
                // Fungua app mpya
                if (clients.openWindow) {
                    return clients.openWindow(url);
                }
            })
    );
});

// ========== MESSAGE HANDLER ==========
self.addEventListener('message', function(event) {
    // Skip waiting
    if (event.data === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    // Set badge
    if (event.data && event.data.type === 'SET_BADGE') {
        if ('setAppBadge' in self.registration) {
            event.waitUntil(
                self.registration.setAppBadge(event.data.count || 1).catch(function() {})
            );
        }
    }
    
    // Clear badge
    if (event.data && event.data.type === 'CLEAR_BADGE') {
        if ('clearAppBadge' in self.registration) {
            event.waitUntil(
                self.registration.clearAppBadge().catch(function() {})
            );
        }
    }
    
    // Show notification
    if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
        const title = event.data.title || 'KMCA';
        const body = event.data.body || '';
        const url = event.data.url || './home.html';
        
        event.waitUntil(
            self.registration.showNotification(title, {
                body: body,
                icon: './logo.png',
                badge: './logo.png',
                vibrate: [100, 50, 100],
                data: { url: url }
            })
        );
    }
});

// ========== BACKGROUND SYNC (App Flow) ==========
self.addEventListener('sync', function(event) {
    if (event.tag === 'sync-notifications') {
        event.waitUntil(
            clients.matchAll().then(function(clientList) {
                clientList.forEach(function(client) {
                    client.postMessage({
                        type: 'SYNC_NOTIFICATIONS'
                    });
                });
            })
        );
    }
});

// ========== PERIODIC SYNC (Kama inapatikana) ==========
self.addEventListener('periodicsync', function(event) {
    if (event.tag === 'check-new-content') {
        event.waitUntil(
            clients.matchAll().then(function(clientList) {
                clientList.forEach(function(client) {
                    client.postMessage({
                        type: 'CHECK_NEW_CONTENT'
                    });
                });
            })
        );
    }
});