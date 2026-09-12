// ============================================
// KMCA USER PANEL - SERVICE WORKER REGISTER
// Auto-register + PWA install prompt
// ============================================

let deferredInstallPrompt = null;
let installPromptShown = false;

// ============================================
// REGISTER SERVICE WORKER
// ============================================
function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        console.log('❌ Service Worker haitumiki');
        return;
    }
    
    if (window.location.protocol === 'file:') {
        console.log('⚠️ Service Worker inahitaji HTTPS');
        return;
    }
    
    navigator.serviceWorker.register('/service-worker.js')
        .then(function(registration) {
            console.log('✅ Service Worker registered:', registration.scope);
        })
        .catch(function(error) {
            console.error('❌ Service Worker registration failed:', error);
        });
}

// ============================================
// PWA INSTALL PROMPT
// ============================================
window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    deferredInstallPrompt = e;
    window.deferredInstallPrompt = e;
    console.log('✅ PWA install prompt captured');
});

window.addEventListener('appinstalled', function() {
    localStorage.setItem('kmca_user_pwa_installed', '1');
    deferredInstallPrompt = null;
    window.deferredInstallPrompt = null;
    console.log('✅ PWA installed');
});

// ============================================
// CHECK PWA INSTALLED
// ============================================
function isPwaInstalled() {
    return localStorage.getItem('kmca_user_pwa_installed') === '1' ||
           window.matchMedia('(display-mode: standalone)').matches;
}

// ============================================
// SHOW INSTALL PROMPT
// ============================================
function showInstallPrompt() {
    if (isPwaInstalled()) return;
    if (!deferredInstallPrompt) return;
    
    // Tumia modal kutoka index.html
    const modal = document.getElementById('installModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

// ============================================
// INITIALIZE
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    registerServiceWorker();
});