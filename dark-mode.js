// ============================================
// KMCA USER PANEL - DARK MODE AUTO
// 6 AM - 6 PM: Light | 6 PM - 6 AM: Dark
// ============================================

const DARK_MODE_KEY = 'kmca_dark_mode';
const DARK_START_HOUR = 18; // 6 PM
const LIGHT_START_HOUR = 6;  // 6 AM

// ============ GET PREFERENCE ============
function getDarkModePreference() {
    const pref = localStorage.getItem(DARK_MODE_KEY);
    if (pref === 'auto') return 'auto';
    if (pref === 'dark') return 'dark';
    if (pref === 'light') return 'light';
    return 'auto'; // Default
}

// ============ SHOULD BE DARK? ============
function shouldBeDark() {
    const pref = getDarkModePreference();
    
    if (pref === 'dark') return true;
    if (pref === 'light') return false;
    
    // Auto mode
    const hour = new Date().getHours();
    return hour >= DARK_START_HOUR || hour < LIGHT_START_HOUR;
}

// ============ APPLY DARK MODE ============
function applyDarkMode() {
    const isDark = shouldBeDark();
    
    if (isDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.body.classList.add('dark-mode');
        document.body.classList.remove('light-mode');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        document.body.classList.add('light-mode');
        document.body.classList.remove('dark-mode');
    }
    
    // Update meta theme-color
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
        meta.setAttribute('content', isDark ? '#020617' : '#f8fafc');
    }
}

// ============ SET PREFERENCE ============
function setDarkModePreference(pref) {
    localStorage.setItem(DARK_MODE_KEY, pref);
    applyDarkMode();
}

// ============ TOGGLE DARK MODE ============
function toggleDarkMode() {
    const current = getDarkModePreference();
    const next = current === 'dark' ? 'light' : 'dark';
    setDarkModePreference(next);
    return next;
}

// ============ INITIALIZE ============
function initDarkMode() {
    applyDarkMode();
    
    // Check every 5 minutes for auto change
    setInterval(() => {
        if (getDarkModePreference() === 'auto') {
            applyDarkMode();
        }
    }, 5 * 60 * 1000);
}

// Auto-run on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDarkMode);
} else {
    initDarkMode();
}