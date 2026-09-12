// ============================================
// KMCA USER PANEL - AUTHENTICATION SYSTEM v1.0
// Simple Auth - No PIN, No Password
// ============================================

const USER_TIMEOUT_MS = 30 * 24 * 60 * 60 * 1000; // Siku 30

// Initialize Supabase
const supabaseClient = window.supabase?.createClient(
    'https://ctzdiiyzoocxmlmeagtt.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0emRpaXl6b29jeG1sbWVhZ3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMjI1NTEsImV4cCI6MjEwMjY5ODU1MX0.Jy_T5XaI5CI4qfFVH7b53MDCurR2olh0a6Tx9BzDOGw'
);

// ============ SESSION MANAGEMENT ============
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
    
    const timeDiff = Date.now() - new Date(savedAt).getTime();
    return timeDiff < USER_TIMEOUT_MS;
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

// ============ GENERATE INITIALS ============
function generateInitials(jina) {
    if (!jina) return '??';
    const names = jina.trim().split(/\s+/);
    if (names.length >= 2) {
        return (names[0][0] + names[1][0]).toUpperCase();
    }
    if (names.length === 1 && names[0].length >= 2) {
        return names[0].substring(0, 2).toUpperCase();
    }
    return '??';
}

// ============ VALIDATE PHONE ============
function validatePhone(phone) {
    if (!phone) return { valid: true, value: null }; // Optional
    
    // Remove spaces, dashes, +
    const cleaned = phone.replace(/[\s\-\+]/g, '');
    
    // Lazima iwe 10 digits
    if (cleaned.length !== 10) {
        return { 
            valid: false, 
            error: 'Namba lazima iwe na tarakimu 10 (mfano: 0712345678)' 
        };
    }
    
    // Lazima ianze na 07 au 06
    if (!cleaned.startsWith('07') && !cleaned.startsWith('06')) {
        return { 
            valid: false, 
            error: 'Namba lazima ianze na 07 au 06' 
        };
    }
    
    // Lazima iwe na tarakimu pekee
    if (!/^\d{10}$/.test(cleaned)) {
        return { 
            valid: false, 
            error: 'Namba lazima iwe na tarakimu pekee' 
        };
    }
    
    return { valid: true, value: cleaned };
}

// ============ LOAD SETTINGS ============
async function loadSettings() {
    try {
        const { data } = await supabaseClient
            .from('app_settings')
            .select('setting_key, setting_value')
            .in('setting_key', [
                'app_name',
                'app_subtitle',
                'intro_logo',
                'intro_duration',
                'intro_title',
                'intro_subtitle',
                'install_prompt_enabled'
            ]);
        
        const settings = {};
        (data || []).forEach(s => {
            settings[s.setting_key] = s.setting_value;
        });
        
        return settings;
    } catch (e) {
        console.error('Load settings error:', e);
        return {};
    }
}

// ============ LOAD WELCOME ============
async function loadWelcome() {
    try {
        const { data } = await supabaseClient
            .from('welcome')
            .select('*')
            .eq('is_active', true)
            .order('order_index', { ascending: true })
            .limit(1);
        
        return data && data[0] ? data[0] : null;
    } catch (e) {
        console.error('Load welcome error:', e);
        return null;
    }
}

// ============ LOAD WELCOME SLIDES ============
async function loadWelcomeSlides(welcomeId) {
    if (!welcomeId) return [];
    
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

// ============ PROFILE PICTURE UPLOAD ============
async function uploadProfilePicture(file) {
    try {
        console.log('Uploading profile picture:', file.name);
        
        // Compress picha (80% quality)
        const compressedFile = await compressImage(file, 0.8);
        console.log('Compressed:', compressedFile.size, 'vs', file.size);
        
        // Upload kwa Uploadcare
        const result = await uploadToUploadcare(compressedFile);
        
        if (result.success) {
            return { success: true, url: result.url };
        }
        
        return { success: false, error: result.error };
    } catch (e) {
        console.error('Upload error:', e);
        return { success: false, error: e.message };
    }
}

// ============ COMPRESS IMAGE ============
async function compressImage(file, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const img = new Image();
            
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Natural size (bila resize)
                canvas.width = img.width;
                canvas.height = img.height;
                
                // Draw
                ctx.drawImage(img, 0, 0);
                
                // Compress
                canvas.toBlob(
                    function(blob) {
                        const compressedFile = new File(
                            [blob], 
                            file.name, 
                            { type: 'image/jpeg', lastModified: Date.now() }
                        );
                        resolve(compressedFile);
                    },
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

// ============ UPLOAD TO UPLOADCARE ============
async function uploadToUploadcare(file) {
    try {
        const HOSTING_CONFIG = {
            uploadcare: {
                publicKey: 'b69fa8f92a2bd382c0b4'
            }
        };
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('UPLOADCARE_PUB_KEY', HOSTING_CONFIG.uploadcare.publicKey);
        formData.append('UPLOADCARE_STORE', 'auto');
        
        const response = await fetch('https://upload.uploadcare.com/base/', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.file) {
            const url = 'https://ucarecdn.com/' + data.file + '/';
            return { success: true, url: url };
        }
        
        return { success: false, error: 'Upload failed' };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ============ REGISTER USER ============
async function registerUser(userData) {
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .insert([userData])
            .select();
        
        if (error) throw error;
        
        return { success: true, user: data[0] };
    } catch (e) {
        console.error('Register error:', e);
        return { success: false, error: e.message };
    }
}

// ============ FORMAT DATE ============
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('sw-TZ', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

// ============ TOAST ============
function showToast(message, type = 'success') {
    // Ondoa toast ya zamani
    const oldToast = document.querySelector('.kmca-toast');
    if (oldToast) oldToast.remove();
    
    const toast = document.createElement('div');
    toast.className = 'kmca-toast';
    
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
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
    `;
    
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i> ${message}`;
    
    document.body.appendChild(toast);
    
    // Slide in
    setTimeout(() => {
        toast.style.transform = 'translateX(-50%) translateY(0)';
        toast.style.opacity = '1';
    }, 100);
    
    // Slide out
    setTimeout(() => {
        toast.style.transform = 'translateX(-50%) translateY(-100px)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}