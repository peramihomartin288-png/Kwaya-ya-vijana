// ============================================
// KMCA USER PANEL — AUTHENTICATION v2.3
// Bila delay — supabaseClient inapatikana mara moja
// ============================================

// ============================================
// CONSTANTS
// ============================================
const KMCA_USER_TIMEOUT_MS = 30 * 24 * 60 * 60 * 1000;

// ============================================
// INIT SUPABASE (Mara moja, bila delay)
// ============================================
let supabaseClient = null;

function initSupabaseClient() {
    if (supabaseClient) return supabaseClient;
    
    // Check CDN
    if (typeof window.supabase === 'undefined') {
        console.error('❌ window.supabase haipo — CDN haijapakiwa');
        return null;
    }
    
    // Check HOSTING_CONFIG
    if (typeof window.HOSTING_CONFIG === 'undefined') {
        console.error('❌ HOSTING_CONFIG haipo');
        return null;
    }
    
    try {
        supabaseClient = window.supabase.createClient(
            window.HOSTING_CONFIG.supabase.url,
            window.HOSTING_CONFIG.supabase.anonKey
        );
        
        console.log('✅ Supabase client initialized');
        console.log('   URL:', window.HOSTING_CONFIG.supabase.url);
        return supabaseClient;
    } catch (e) {
        console.error('❌ Supabase init error:', e.message);
        return null;
    }
}

// ⚠️ INIT MARA MOJA (bila delay)
initSupabaseClient();

// ============================================
// SESSION MANAGEMENT
// ============================================
function getCurrentUser() {
    const userData = localStorage.getItem('kmca_user');
    return userData ? JSON.parse(userData) : null;
}

function saveUser(user) {
    localStorage.setItem('kmca_user', JSON.stringify(user));
    localStorage.setItem('kmca_user_id', user.id);
    localStorage.setItem('kmca_user_saved_at', new Date().toISOString());
}

function clearUser() {
    localStorage.removeItem('kmca_user');
    localStorage.removeItem('kmca_user_id');
    localStorage.removeItem('kmca_user_saved_at');
    localStorage.removeItem('kmca_intro_seen');
}

function isUserValid() {
    const user = getCurrentUser();
    if (!user) return false;
    
    const savedAt = localStorage.getItem('kmca_user_saved_at');
    if (!savedAt) return false;
    
    return (Date.now() - new Date(savedAt).getTime()) < KMCA_USER_TIMEOUT_MS;
}

function requireUserAuth() {
    const user = getCurrentUser();
    if (!user || !isUserValid()) {
        clearUser();
        window.location.href = 'index.html';
        return null;
    }
    return user;
}

function logoutUser() {
    clearUser();
    window.location.href = 'index.html';
}

// ============================================
// HELPERS
// ============================================
function generateInitials(jina) {
    if (!jina) return '??';
    const names = jina.trim().split(/\s+/);
    if (names.length >= 2) return (names[0][0] + names[1][0]).toUpperCase();
    if (names.length === 1 && names[0].length >= 2) return names[0].substring(0, 2).toUpperCase();
    return '??';
}

function validatePhone(phone) {
    if (!phone) return { valid: true, value: null };
    
    const cleaned = phone.replace(/[\s\-\+]/g, '');
    
    if (cleaned.length !== 10) return { valid: false, error: 'Namba lazima iwe na tarakimu 10' };
    if (!cleaned.startsWith('07') && !cleaned.startsWith('06')) return { valid: false, error: 'Namba ianze na 07 au 06' };
    if (!/^\d{10}$/.test(cleaned)) return { valid: false, error: 'Namba iwe na tarakimu pekee' };
    
    return { valid: true, value: cleaned };
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('sw-TZ', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showToast(message, type = 'success') {
    const oldToast = document.querySelector('.kmca-toast');
    if (oldToast) oldToast.remove();
    
    const colors = { success: '#10b981', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
    
    const toast = document.createElement('div');
    toast.className = 'kmca-toast';
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%) translateY(-100px);
        background: ${colors[type]};
        color: white;
        padding: 14px 24px;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 600;
        z-index: 99999;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        gap: 10px;
        opacity: 0;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        max-width: 90%;
        font-family: inherit;
    `;
    toast.innerHTML = `<i class="fas ${icons[type]}"></i> ${message}`;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.transform = 'translateX(-50%) translateY(0)';
        toast.style.opacity = '1';
    }, 100);
    
    setTimeout(() => {
        toast.style.transform = 'translateX(-50%) translateY(-100px)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================
// LOAD DATA (Safe — check supabaseClient)
// ============================================
async function loadSettings() {
    if (!supabaseClient) {
        console.warn('⚠️ supabaseClient haipo');
        return {};
    }
    
    try {
        const { data } = await supabaseClient
            .from('app_settings')
            .select('setting_key, setting_value')
            .in('setting_key', [
                'app_name', 'app_subtitle', 'intro_logo', 'intro_duration',
                'intro_title', 'intro_subtitle', 'install_prompt_enabled',
                'push_notifications_enabled', 'vapid_public_key'
            ]);
        
        const settings = {};
        (data || []).forEach(s => { settings[s.setting_key] = s.setting_value; });
        return settings;
    } catch (e) {
        console.error('Load settings error:', e);
        return {};
    }
}

async function loadWelcome() {
    if (!supabaseClient) return null;
    
    try {
        const { data } = await supabaseClient
            .from('welcome')
            .select('*')
            .eq('is_active', true)
            .order('order_index', { ascending: true })
            .limit(1);
        
        return data && data[0] ? data[0] : null;
    } catch (e) {
        return null;
    }
}

async function loadWelcomeSlides(welcomeId) {
    if (!welcomeId || !supabaseClient) return [];
    
    try {
        const { data } = await supabaseClient
            .from('welcome_slides')
            .select('*')
            .eq('welcome_id', welcomeId)
            .eq('is_active', true)
            .order('order_index', { ascending: true });
        
        return data || [];
    } catch (e) {
        return [];
    }
}

// ============================================
// UPLOAD PROFILE PICTURE
// ============================================
async function uploadProfilePicture(file) {
    try {
        console.log('📷 Uploading profile:', file.name);
        
        const compressed = await compressImage(file, 0.8);
        console.log('Compressed:', formatFileSize(compressed.size));
        
        const result = await uploadToUploadcareDirect(compressed);
        
        if (result.success) return { success: true, url: result.url };
        return { success: false, error: result.error };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function uploadToUploadcareDirect(file) {
    return new Promise((resolve) => {
        if (!window.HOSTING_CONFIG || !window.HOSTING_CONFIG.uploadcare) {
            resolve({ success: false, error: 'HOSTING_CONFIG haipo' });
            return;
        }
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('UPLOADCARE_PUB_KEY', window.HOSTING_CONFIG.uploadcare.publicKey);
        formData.append('UPLOADCARE_STORE', 'auto');
        
        const xhr = new XMLHttpRequest();
        
        xhr.addEventListener('load', function() {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    if (data.file) {
                        resolve({
                            success: true,
                            url: `${window.HOSTING_CONFIG.uploadcare.cdnBase}${data.file}/`
                        });
                    } else {
                        resolve({ success: false, error: 'Upload failed' });
                    }
                } catch (e) {
                    resolve({ success: false, error: e.message });
                }
            } else {
                resolve({ success: false, error: `HTTP ${xhr.status}` });
            }
        });
        
        xhr.addEventListener('error', () => resolve({ success: false, error: 'Network error' }));
        xhr.open('POST', 'https://upload.uploadcare.com/base/');
        xhr.send(formData);
    });
}

async function compressImage(file, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                canvas.toBlob(
                    (blob) => resolve(new File([blob], file.name, { type: 'image/jpeg' })),
                    'image/jpeg',
                    quality
                );
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ============================================
// REGISTER
// ============================================
async function registerUser(userData) {
    if (!supabaseClient) {
        return { success: false, error: 'Supabase haipo' };
    }
    
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .insert([userData])
            .select();
        
        if (error) throw error;
        return { success: true, user: data[0] };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// ============================================
// PUSH NOTIFICATIONS
// ============================================
async function subscribeToPushNotifications(userId) {
    try {
        if (window.location.protocol === 'file:') {
            return { success: false, error: 'Push hazitumiki kwenye file://' };
        }
        
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            return { success: false, error: 'Push hazitumiki' };
        }
        
        let permission = Notification.permission;
        
        if (permission === 'denied') return { success: false, error: 'Umezima notifications' };
        if (permission === 'default') permission = await Notification.requestPermission();
        if (permission !== 'granted') return { success: false, error: 'Hukubali notifications' };
        
        const registration = await navigator.serviceWorker.ready;
        let subscription = await registration.pushManager.getSubscription();
        
        if (!subscription) {
            if (!window.HOSTING_CONFIG || !window.HOSTING_CONFIG.vapid) {
                return { success: false, error: 'VAPID haipo' };
            }
            
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(window.HOSTING_CONFIG.vapid.publicKey)
            });
        }
        
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
        
        if (!supabaseClient) {
            return { success: false, error: 'Supabase haipo' };
        }
        
        const { error } = await supabaseClient
            .from('push_subscriptions')
            .upsert(subscriptionData, { onConflict: 'user_id,endpoint' });
        
        if (error) throw error;
        return { success: true, subscription };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function unsubscribeFromPushNotifications(userId) {
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
            const endpoint = subscription.endpoint;
            await subscription.unsubscribe();
            
            if (supabaseClient) {
                await supabaseClient.from('push_subscriptions').delete()
                    .eq('user_id', userId).eq('endpoint', endpoint);
            }
        }
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function checkPushStatus() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        return { supported: false, subscribed: false, permission: 'unsupported' };
    }
    
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        return {
            supported: true,
            subscribed: !!subscription,
            permission: Notification.permission,
            subscription: subscription
        };
    } catch (error) {
        return { supported: true, subscribed: false, permission: 'error' };
    }
}

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

function getDeviceType() {
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) return 'android';
    if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
    return 'desktop';
}

// ============================================
// EXPORT GLOBAL
// ============================================
window.supabaseClient = supabaseClient;
window.initSupabaseClient = initSupabaseClient;
window.getCurrentUser = getCurrentUser;
window.saveUser = saveUser;
window.clearUser = clearUser;
window.isUserValid = isUserValid;
window.requireUserAuth = requireUserAuth;
window.logoutUser = logoutUser;
window.generateInitials = generateInitials;
window.validatePhone = validatePhone;
window.loadSettings = loadSettings;
window.loadWelcome = loadWelcome;
window.loadWelcomeSlides = loadWelcomeSlides;
window.uploadProfilePicture = uploadProfilePicture;
window.registerUser = registerUser;
window.formatDate = formatDate;
window.formatFileSize = formatFileSize;
window.showToast = showToast;
window.subscribeToPushNotifications = subscribeToPushNotifications;
window.unsubscribeFromPushNotifications = unsubscribeFromPushNotifications;
window.checkPushStatus = checkPushStatus;

console.log('✅ USER_AUTH v2.3 loaded');
console.log('   supabaseClient:', supabaseClient ? 'OK' : 'null');