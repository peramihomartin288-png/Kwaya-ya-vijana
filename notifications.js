// ============================================
// KMCA - NOTIFICATIONS
// ============================================

// Request notification permission
async function requestNotificationPermission() {
    if ('Notification' in window) {
        try {
            const permission = await Notification.requestPermission();
            
            if (permission === 'granted') {
                console.log('Notification permission granted');
                return true;
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
        }
    }
    
    return false;
}

// Subscribe to push notifications
async function subscribeToPushNotifications() {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
            const registration = await navigator.serviceWorker.ready;
            
            // Request permission first
            const permissionGranted = await requestNotificationPermission();
            
            if (!permissionGranted) {
                console.log('Permission not granted');
                return false;
            }
            
            // Subscribe to push
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array('YOUR_PUBLIC_VAPID_KEY')
            });
            
            console.log('Push notification subscribed:', subscription);
            return true;
        } catch (error) {
            console.error('Error subscribing to push notifications:', error);
        }
    }
    
    return false;
}

// Convert base64 to Uint8Array
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
}

// Show notification
function showNotification(title, body, url = '/home.html') {
    if ('Notification' in window && Notification.permission === 'granted') {
        const options = {
            body: body,
            icon: '/logo.png',
            badge: '/logo.png',
            vibrate: [100, 50, 100],
            data: {
                url: url
            }
        };
        
        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(title, options);
        });
    }
}

// Initialize notifications
document.addEventListener('DOMContentLoaded', function() {
    // Check if notifications enabled
    const notificationsPref = localStorage.getItem('kmca_notifications');
    
    if (notificationsPref !== 'false') {
        requestNotificationPermission();
    }
});