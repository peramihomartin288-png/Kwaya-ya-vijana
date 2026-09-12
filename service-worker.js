// ============================================
// KMCA USER PANEL - SERVICE WORKER v1.0
// Cache + Push Notifications + Offline
// ============================================

const CACHE_NAME = 'kmca-user-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/welcome.html',
    '/home.html',
    '/manifest.json'
];

// ============================================
// INSTALL
// ============================================
self.addEventListener('install', function(event) {
    console.log('🔧 Service Worker: Installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                console.log('📦 Service Worker: Caching files');
                return cache.addAll(urlsToCache).catch(function(error) {
                    console.warn('⚠️ Some files failed to cache:', error);
                });
            })
            .then(function() {
                console.log('✅ Service Worker: Installed');
                return self.skipWaiting();
            })
    );
});

// ============================================
// ACTIVATE
// ============================================
self.addEventListener('activate', function(event) {
    console.log('🚀 Service Worker: Activating...');
    
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(function() {
            console.log('✅ Service Worker: Activated');
            return self.clients.claim();
        })
    );
});

// ============================================
// FETCH (Offline Support)
// ============================================
self.addEventListener('fetch', function(event) {
    // Skip cross-origin
    if (!event.request.url.startsWith(self.location.origin)) return;
    
    // Skip non-GET
    if (event.request.method !== 'GET') return;
    
    // Skip Supabase API
    if (event.request.url.includes('supabase.co')) return;
    
    // Skip CDN
    if (event.request.url.includes('cdn.jsdelivr') || 
        event.request.url.includes('cdnjs.cloudflare') ||
        event.request.url.includes('uploadcare') ||
        event.request.url.includes('cloudinary')) return;
    
    event.respondWith(
        caches.match(event.request)
            .then(function(response) {
                if (response) return response;
                
                return fetch(event.request)
                    .then(function(response) {
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then(function(cache) {
                            cache.put(event.request, responseToCache);
                        });
                        
                        return response;
                    })
                    .catch(function() {
                        if (event.request.mode === 'navigate') {
                            return caches.match('/index.html');
                        }
                        
                        if (event.request.destination === 'image') {
                            return new Response(
                                '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="#1e293b" width="200" height="200"/><text x="50%" y="50%" fill="#64748b" text-anchor="middle" dy=".3em" font-family="sans-serif" font-size="14">Offline</text></svg>',
                                { headers: { 'Content-Type': 'image/svg+xml' } }
                            );
                        }
                    });
            })
    );
});

// ============================================
// PUSH NOTIFICATIONS
// ============================================
self.addEventListener('push', function(event) {
    console.log('🔔 Service Worker: Push received');
    
    let data = {
        title: 'KMCA',
        body: 'Una notification mpya',
        icon: '/user-icon-192.png',
        badge: '/badge-72.png',
        url: '/',
        tag: 'kmca-notification',
        vibrate: [200, 100, 200]
    };
    
    if (event.data) {
        try {
            const parsed = event.data.json();
            data = { ...data, ...parsed };
        } catch (e) {
            data.body = event.data.text();
        }
    }
    
    const options = {
        body: data.body,
        icon: data.icon || '/user-icon-192.png',
        badge: data.badge || '/badge-72.png',
        vibrate: data.vibrate || [200, 100, 200],
        tag: data.tag || 'kmca-notification',
        renotify: true,
        requireInteraction: false,
        silent: false,
        data: {
            url: data.url || '/',
            dateOfArrival: Date.now(),
            primaryKey: Date.now(),
            ...data.data
        },
        actions: [
            {
                action: 'open',
                title: 'Fungua App'
            },
            {
                action: 'close',
                title: 'Funga'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// ============================================
// NOTIFICATION CLICK
// ============================================
self.addEventListener('notificationclick', function(event) {
    console.log('👆 Service Worker: Notification clicked');
    
    event.notification.close();
    
    if (event.action === 'close') return;
    
    const urlToOpen = event.notification.data?.url || '/';
    
    event.waitUntil(
        clients.matchAll({ 
            type: 'window', 
            includeUncontrolled: true 
        }).then(function(clientList) {
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                const clientUrl = new URL(client.url);
                const targetUrl = new URL(urlToOpen, self.location.origin);
                
                if (clientUrl.origin === targetUrl.origin) {
                    client.focus();
                    if ('navigate' in client) {
                        client.navigate(urlToOpen);
                    }
                    return;
                }
            }
            
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

// ============================================
// NOTIFICATION CLOSE
// ============================================
self.addEventListener('notificationclose', function(event) {
    console.log('❌ Service Worker: Notification closed');
});

// ============================================
// PUSH SUBSCRIPTION CHANGE
// ============================================
self.addEventListener('pushsubscriptionchange', function(event) {
    console.log('🔄 Service Worker: Push subscription changed');
    
    event.waitUntil(
        self.registration.pushManager.subscribe(event.oldSubscription.options)
            .then(function(subscription) {
                return fetch('/api/update-subscription', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        oldEndpoint: event.oldSubscription.endpoint,
                        newSubscription: subscription.toJSON()
                    })
                }).catch(function(error) {
                    console.error('Failed to update subscription:', error);
                });
            })
    );
});

// ============================================
// MESSAGE FROM CLIENT
// ============================================
self.addEventListener('message', function(event) {
    console.log('💬 Service Worker: Message received', event.data);
    
    if (!event.data) return;
    
    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
        return;
    }
    
    if (event.data.type === 'TEST_NOTIFICATION') {
        self.registration.showNotification(
            event.data.title || 'Test Notification',
            {
                body: event.data.body || 'Hii ni test notification',
                icon: '/user-icon-192.png',
                badge: '/badge-72.png',
                vibrate: [200, 100, 200]
            }
        );
        return;
    }
    
    if (event.data.type === 'CLEAR_CACHE') {
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    return caches.delete(cacheName);
                })
            );
        });
        return;
    }
    
    if (event.data.type === 'FORCE_REFRESH') {
        self.skipWaiting();
        self.clients.matchAll().then(function(clients) {
            clients.forEach(function(client) {
                client.navigate(client.url);
            });
        });
        return;
    }
});

console.log('✅ KMCA User Service Worker loaded');