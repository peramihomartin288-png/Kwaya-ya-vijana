// ============================================
// KMCA USER PANEL - PUSH NOTIFICATIONS v1.0
// VAPID Web Push
// ============================================

// VAPID Public Key (kutoka settings, default fallback)
let VAPID_PUBLIC_KEY = 'BKNmfI7QOo1GE2kXwHIUHPTEMoKFNF2FjKWE5-9Wes7YYgmuEF8eYmzp4YscPtyVbg0So4j3wpeMvBsQm1hyVrw';

// ============================================
// URL BASE64 TO UINT8ARRAY
// ============================================
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

// ============================================
// CHECK SUPPORT
// ============================================
function isPushSupported() {
    return 'serviceWorker' in navigator && 
           'PushManager' in window && 
           'Notification' in window;
}

// ============================================
// GET DEVICE TYPE
// ============================================
function getDeviceType() {
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) return 'android';
    if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
    return 'desktop';
}

// ============================================
// LOAD VAPID KEY FROM SETTINGS
// ============================================
async function loadVapidKey() {
    try {
        const { data } = await supabaseClient
            .from('app_settings')
            .select('setting_value')
            .eq('setting_key', 'vapid_public_key')
            .single();
        
        if (data && data.setting_value) {
            VAPID_PUBLIC_KEY = data.setting_value;
            console.log('✅ VAPID key loaded from settings');
        }
    } catch (e) {
        console.log('Using default VAPID key');
    }
}

// ============================================
// REGISTER SERVICE WORKER
// ============================================
async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        console.log('Service Worker haitumiki');
        return null;
    }
    
    try {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        console.log('✅ Service Worker registered:', registration.scope);
        return registration;
    } catch (error) {
        console.error('❌ Service Worker registration failed:', error);
        return null;
    }
}

// ============================================
// GET PUSH SUBSCRIPTION
// ============================================
async function getPushSubscription() {
    try {
        if (!('serviceWorker' in navigator)) return null;
        
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        return subscription;
    } catch (error) {
        console.error('Get subscription error:', error);
        return null;
    }
}

// ============================================
// SUBSCRIBE TO PUSH
// ============================================
async function subscribeToPush(userId) {
    try {
        // 1. Check support
        if (!isPushSupported()) {
            return { 
                success: false, 
                error: 'Push notifications hazitumiki kwenye browser hii' 
            };
        }
        
        // 2. Load VAPID key
        await loadVapidKey();
        
        // 3. Register SW
        const registration = await navigator.serviceWorker.ready;
        
        // 4. Check permission
        let permission = Notification.permission;
        
        if (permission === 'denied') {
            return { 
                success: false, 
                error: 'Umezima notifications. Ruhusu kwenye browser settings.' 
            };
        }
        
        if (permission === 'default') {
            permission = await Notification.requestPermission();
        }
        
        if (permission !== 'granted') {
            return { 
                success: false, 
                error: 'Hukubali notifications' 
            };
        }
        
        // 5. Subscribe
        let subscription = await registration.pushManager.getSubscription();
        
        if (!subscription) {
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });
        }
        
        console.log('✅ Push subscription:', subscription.endpoint);
        
        // 6. Convert keys
        const p256dhKey = subscription.getKey('p256dh');
        const authKey = subscription.getKey('auth');
        
        const subscriptionData = {
            user_id: userId,
            endpoint: subscription.endpoint,
            p256dh: btoa(String.fromCharCode(...new Uint8Array(p256dhKey))),
            auth: btoa(String.fromCharCode(...new Uint8Array(authKey))),
            device_type: getDeviceType(),
            user_agent: navigator.userAgent,
            is_active: true
        };
        
        // 7. Save to Supabase
        const { error } = await supabaseClient
            .from('push_subscriptions')
            .upsert(subscriptionData, { 
                onConflict: 'user_id,endpoint' 
            });
        
        if (error) throw error;
        
        console.log('✅ Push subscription saved to DB');
        
        return { 
            success: true, 
            subscription: subscription,
            deviceType: getDeviceType()
        };
        
    } catch (error) {
        console.error('❌ Push subscription error:', error);
        return { 
            success: false, 
            error: error.message 
        };
    }
}

// ============================================
// UNSUBSCRIBE FROM PUSH
// ============================================
async function unsubscribeFromPush(userId) {
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
            const endpoint = subscription.endpoint;
            await subscription.unsubscribe();
            
            await supabaseClient
                .from('push_subscriptions')
                .delete()
                .eq('user_id', userId)
                .eq('endpoint', endpoint);
            
            console.log('✅ Push unsubscribed');
        }
        
        return { success: true };
    } catch (error) {
        console.error('❌ Unsubscribe error:', error);
        return { 
            success: false, 
            error: error.message 
        };
    }
}

// ============================================
// CHECK PUSH STATUS
// ============================================
async function checkPushStatus() {
    if (!isPushSupported()) {
        return { 
            supported: false, 
            subscribed: false,
            permission: 'unsupported'
        };
    }
    
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        const permission = Notification.permission;
        
        return {
            supported: true,
            subscribed: !!subscription,
            permission: permission,
            subscription: subscription
        };
    } catch (error) {
        return { 
            supported: true, 
            subscribed: false, 
            permission: 'error',
            error: error.message 
        };
    }
}

// ============================================
// SHOW TEST NOTIFICATION (Local)
// ============================================
async function showTestNotification() {
    if (Notification.permission !== 'granted') {
        alert('Kwanza ruhusu notifications');
        return;
    }
    
    try {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification('Test Notification 🔔', {
            body: 'Hii ni test notification kutoka KMCA',
            icon: '/user-icon-192.png',
            badge: '/badge-72.png',
            vibrate: [200, 100, 200],
            data: { url: '/' }
        });
        
        console.log('✅ Test notification sent');
    } catch (error) {
        console.error('❌ Test notification error:', error);
        alert('Imeshindikana kutuma: ' + error.message);
    }
}

// ============================================
// SEND TEST PUSH VIA EDGE FUNCTION
// ============================================
async function sendTestPushViaFunction(userId) {
    try {
        const { data, error } = await supabaseClient.functions.invoke('send-push', {
            body: {
                user_id: userId,
                title: 'Test Push 🔔',
                message: 'Hii ni test push kutoka KMCA',
                url: '/',
                icon: '/user-icon-192.png',
                tag: 'test-' + Date.now()
            }
        });
        
        if (error) throw error;
        
        return { 
            success: true, 
            result: data 
        };
    } catch (error) {
        console.error('❌ Test push error:', error);
        return { 
            success: false, 
            error: error.message 
        };
    }
}

// ============================================
// AUTO REGISTER ON PAGE LOAD
// ============================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        registerServiceWorker();
    });
}