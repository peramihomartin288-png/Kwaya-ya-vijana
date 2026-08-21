// ============================================
// KMCA - SERVICE WORKER REGISTRATION
// App Flow + Push Notifications + Offline
// ============================================

function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        console.log('Service Worker not supported');
        return;
    }
    
    if (window.location.protocol === 'file:') {
        console.log('Service Worker skipped (file://)');
        return;
    }
    
    navigator.serviceWorker.register('service-worker.js')
        .then(function(registration) {
            console.log('Service Worker registered:', registration.scope);
            
            // Request notification permission
            requestNotificationPermission();
            
            // Listen for updates
            registration.addEventListener('updatefound', function() {
                const newWorker = registration.installing;
                
                newWorker.addEventListener('statechange', function() {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        console.log('New version available');
                        
                        if (confirm('Toleo jipya linapatikana! Unataka ku-refresh?')) {
                            window.location.reload();
                        }
                    }
                });
            });
            
            return registration;
        })
        .catch(function(error) {
            console.log('Service Worker registration failed:', error);
        });
}

// ========== REQUEST NOTIFICATION PERMISSION ==========
async function requestNotificationPermission() {
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
        console.log('Notification permission already granted');
        return;
    }
    
    if (Notification.permission === 'denied') {
        console.log('Notification permission denied');
        return;
    }
    
    try {
        const permission = await Notification.requestPermission();
        console.log('Notification permission:', permission);
    } catch (error) {
        console.error('Error requesting permission:', error);
    }
}

// ========== LISTEN FOR MESSAGES FROM SERVICE WORKER ==========
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'SYNC_NOTIFICATIONS') {
            console.log('Sync notifications requested');
            if (typeof loadNotifications === 'function') {
                loadNotifications();
            }
        }
        
        if (event.data && event.data.type === 'CHECK_NEW_CONTENT') {
            console.log('Check new content requested');
            if (typeof initializeHome === 'function') {
                const user = getCurrentUser();
                if (user) {
                    initializeHome(user);
                }
            }
        }
    });
}

// ========== ONLINE/OFFLINE HANDLING ==========
window.addEventListener('online', function() {
    console.log('App is online');
    document.body.classList.remove('offline-mode');
});

window.addEventListener('offline', function() {
    console.log('App is offline');
    document.body.classList.add('offline-mode');
});

// ========== INITIALIZE ==========
document.addEventListener('DOMContentLoaded', function() {
    registerServiceWorker();
});

// Request permission on first interaction
document.addEventListener('click', function requestOnce() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
    document.removeEventListener('click', requestOnce);
});