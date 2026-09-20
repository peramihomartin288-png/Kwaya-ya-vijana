// ============================================
// HOSTING CONFIGURATION — KMCA USER PANEL
// Version: 3.3
// APIs: Cloudinary (4) + Uploadcare (1) + Supabase (1)
// ============================================

window.HOSTING_CONFIG = {
    // ============================================
    // SUPABASE
    // ============================================
    supabase: {
        url: 'https://ctzdiiyzoocxmlmeagtt.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0emRpaXl6b29jeG1sbWVhZ3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMjI1NTEsImV4cCI6MjEwMjY5ODU1MX0.Jy_T5XaI5CI4qfFVH7b53MDCurR2olh0a6Tx9BzDOGw'
    },
    
    // ============================================
    // CLOUDINARY — 4 Accounts
    // ============================================
    cloudinary: {
        // 📷 Primary Image — Kmca 2
        image: {
            name: 'Kmca 2 (Images)',
            cloudName: 'fuik0cav',
            apiKey: '783519223459641',
            uploadPreset: 'Kwaya ya kmca',
            folder: 'Kmca/Images',
            mode: 'unsigned'
        },
        
        // 🎥 Primary Video — Old
        video: {
            name: 'Old (Videos)',
            cloudName: 'pv88ocpt',
            apiKey: null,
            uploadPreset: 'kmca_preset',
            folder: 'Videos',
            mode: 'unsigned'
        },
        
        // 🚨 Emergency — Zote mbili zina function moja
        emergency: [
            {
                name: 'Kmca 5 (Emergency)',
                cloudName: 'evxn8kjr',
                apiKey: '433863743122169',
                uploadPreset: 'kwaya ya vijana mombo',
                folder: 'Emergency',
                mode: 'unsigned'
            },
            {
                name: 'kmca (Emergency)',
                cloudName: 'bnq4lifd',
                apiKey: '857985187173484',
                uploadPreset: 'kwaya ya vijana',
                folder: 'Emergency',
                mode: 'unsigned'
            }
        ],
        
        settings: {
            useFallback: true,
            maxRetries: 3,
            timeout: 300000,
            autoOptimize: true
        }
    },
    
    // ============================================
    // UPLOADCARE — Audio + Files
    // ============================================
    uploadcare: {
        name: 'Uploadcare',
        publicKey: 'b69fa8f92a2bd382c0b4',
        cdnBase: 'https://ucarecdn.com/',
        settings: {
            store: 'auto',
            maxRetries: 3,
            timeout: 300000
        }
    },
    
    // ============================================
    // VAPID (Web Push)
    // ============================================
    vapid: {
        publicKey: 'BKNmfI7QOo1GE2kXwHIUHPTEMoKFNF2FjKWE5-9Wes7YYgmuEF8eYmzp4YscPtyVbg0So4j3wpeMvBsQm1hyVrw'
    },
    
    // ============================================
    // ROUTING
    // ============================================
    routing: {
        'image/jpeg': 'cloudinary.image',
        'image/png': 'cloudinary.image',
        'image/webp': 'cloudinary.image',
        'image/gif': 'cloudinary.image',
        'image/svg+xml': 'cloudinary.image',
        'video/mp4': 'cloudinary.video',
        'video/webm': 'cloudinary.video',
        'video/quicktime': 'cloudinary.video',
        'audio/mpeg': 'uploadcare',
        'audio/mp3': 'uploadcare',
        'audio/wav': 'uploadcare',
        'audio/mp4': 'uploadcare',
        'audio/aac': 'uploadcare',
        'audio/ogg': 'uploadcare',
        'application/pdf': 'uploadcare',
        'application/msword': 'uploadcare',
        'application/zip': 'uploadcare',
        'application/x-rar-compressed': 'uploadcare',
        'application/vnd.android.package-archive': 'uploadcare'
    },
    
    // ============================================
    // LIMITS
    // ============================================
    limits: {
        image: {
            maxSize: 25 * 1024 * 1024,
            types: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
        },
        video: {
            maxSize: 500 * 1024 * 1024,
            types: ['video/mp4', 'video/webm', 'video/quicktime']
        },
        audio: {
            maxSize: 100 * 1024 * 1024,
            types: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/mp4', 'audio/aac', 'audio/ogg']
        },
        file: {
            maxSize: 50 * 1024 * 1024,
            types: ['application/pdf', 'application/msword', 'application/zip', 'application/x-rar-compressed', 'application/vnd.android.package-archive']
        }
    },
    
    // ============================================
    // COMPRESSION
    // ============================================
    compression: {
        image: {
            enabled: true,
            quality: 0.85,
            maxWidth: 1920,
            maxHeight: 1080
        },
        video: {
            enabled: true,
            bitrate: 2000000,
            format: 'video/webm'
        },
        audio: {
            enabled: true,
            sampleRate: 44100,
            channels: 2
        }
    },
    
    // ============================================
    // TRANSFORMATIONS
    // ============================================
    transformations: {
        thumbnail: 'w_400,h_300,c_fill,q_auto,f_auto',
        small: 'w_800,q_auto,f_auto',
        medium: 'w_1200,q_auto,f_auto',
        large: 'w_1920,q_auto,f_auto',
        original: 'q_100'
    }
};

console.log('✅ HOSTING_CONFIG v3.3 loaded');