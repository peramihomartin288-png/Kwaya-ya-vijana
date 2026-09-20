// ============================================
// UPLOAD MANAGER — KMCA
// Version: 3.3
// ============================================

// ============================================
// MAIN UPLOAD
// ============================================
async function uploadFileSmart(file, options = {}) {
    const {
        onProgress = null,
        compress = true,
        maxRetries = 3,
        forceApi = null
    } = options;
    
    try {
        const validation = validateFile(file);
        if (!validation.valid) return { success: false, error: validation.error };
        
        console.log('📤 Uploading:', file.name, '| Size:', formatFileSize(file.size));
        
        let processedFile = file;
        if (compress) processedFile = await processFileWithCompression(file);
        
        const api = forceApi || getApiForFile(file);
        console.log('🎯 Target API:', api);
        
        let result = null;
        
        if (api === 'cloudinary.image') {
            result = await uploadToCloudinaryImage(processedFile, onProgress, maxRetries);
        } else if (api === 'cloudinary.video') {
            result = await uploadToCloudinaryVideo(processedFile, onProgress, maxRetries);
        } else {
            result = await uploadToUploadcare(processedFile, onProgress, maxRetries);
        }
        
        if (result.success) console.log('✅ Upload success:', result.url);
        return result;
    } catch (error) {
        console.error('❌ Upload error:', error);
        return { success: false, error: error.message };
    }
}

function getApiForFile(file) {
    const type = file.type;
    if (type.startsWith('image/')) return 'cloudinary.image';
    if (type.startsWith('video/')) return 'cloudinary.video';
    return 'uploadcare';
}

// ============================================
// CLOUDINARY — IMAGE
// ============================================
async function uploadToCloudinaryImage(file, onProgress = null, maxRetries = 3) {
    const primary = window.HOSTING_CONFIG.cloudinary.image;
    const emergencies = window.HOSTING_CONFIG.cloudinary.emergency || [];
    
    // 1. Primary
    try {
        console.log('📷 Primary image:', primary.name);
        const result = await uploadToCloudinary(file, primary, onProgress, maxRetries);
        if (result.success) return result;
    } catch (e) {
        console.warn('⚠️ Primary image failed:', e.message);
    }
    
    // 2. Emergencies
    for (let i = 0; i < emergencies.length; i++) {
        try {
            console.log(`🚨 Emergency [${i + 1}]:`, emergencies[i].name);
            const result = await uploadToCloudinary(file, emergencies[i], onProgress, maxRetries);
            if (result.success) return result;
        } catch (e) {
            console.warn(`⚠️ Emergency [${i + 1}] failed:`, e.message);
        }
    }
    
    // 3. Uploadcare fallback
    try {
        console.log('📦 Fallback Uploadcare');
        return await uploadToUploadcare(file, onProgress, maxRetries);
    } catch (e) {
        return { success: false, error: 'All image upload methods failed' };
    }
}

// ============================================
// CLOUDINARY — VIDEO
// ============================================
async function uploadToCloudinaryVideo(file, onProgress = null, maxRetries = 3) {
    const primary = window.HOSTING_CONFIG.cloudinary.video;
    const emergencies = window.HOSTING_CONFIG.cloudinary.emergency || [];
    
    try {
        console.log('🎥 Primary video:', primary.name);
        const result = await uploadToCloudinary(file, primary, onProgress, maxRetries);
        if (result.success) return result;
    } catch (e) {
        console.warn('⚠️ Primary video failed:', e.message);
    }
    
    for (let i = 0; i < emergencies.length; i++) {
        try {
            console.log(`🚨 Emergency [${i + 1}]:`, emergencies[i].name);
            const result = await uploadToCloudinary(file, emergencies[i], onProgress, maxRetries);
            if (result.success) return result;
        } catch (e) {
            console.warn(`⚠️ Emergency [${i + 1}] failed:`, e.message);
        }
    }
    
    try {
        console.log('📦 Fallback Uploadcare');
        return await uploadToUploadcare(file, onProgress, maxRetries);
    } catch (e) {
        return { success: false, error: 'All video upload methods failed' };
    }
}

// ============================================
// CLOUDINARY — RAW
// ============================================
async function uploadToCloudinary(file, account, onProgress = null, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await uploadToCloudinaryRaw(file, account, onProgress);
        } catch (error) {
            console.warn(`Cloudinary attempt ${attempt}/${maxRetries}:`, error.message);
            if (attempt === maxRetries) throw error;
            await delay(1000 * attempt);
        }
    }
}

async function uploadToCloudinaryRaw(file, account, onProgress = null) {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', account.uploadPreset);
        
        if (account.folder) formData.append('folder', account.folder);
        if (window.HOSTING_CONFIG.cloudinary.settings.autoOptimize) {
            formData.append('quality', 'auto:good');
            formData.append('fetch_format', 'auto');
        }
        
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', function(e) {
            if (e.lengthComputable && onProgress) {
                onProgress(Math.round((e.loaded / e.total) * 100));
            }
        });
        
        xhr.addEventListener('load', function() {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    if (data.secure_url) {
                        resolve({
                            success: true,
                            url: data.secure_url,
                            host: 'cloudinary',
                            account: account.name,
                            publicId: data.public_id,
                            format: data.format,
                            size: data.bytes,
                            width: data.width,
                            height: data.height,
                            duration: data.duration
                        });
                    } else {
                        reject(new Error(data.error?.message || 'Upload failed'));
                    }
                } catch (e) {
                    reject(e);
                }
            } else {
                reject(new Error(`HTTP ${xhr.status}`));
            }
        });
        
        xhr.addEventListener('error', () => reject(new Error('Network error')));
        xhr.addEventListener('timeout', () => reject(new Error('Timeout')));
        
        const endpoint = `https://api.cloudinary.com/v1_1/${account.cloudName}/auto/upload`;
        xhr.open('POST', endpoint);
        xhr.timeout = window.HOSTING_CONFIG.cloudinary.settings.timeout || 300000;
        xhr.send(formData);
    });
}

// ============================================
// UPLOADCARE
// ============================================
async function uploadToUploadcare(file, onProgress = null, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await uploadToUploadcareRaw(file, onProgress);
        } catch (error) {
            console.warn(`Uploadcare attempt ${attempt}/${maxRetries}:`, error.message);
            if (attempt === maxRetries) throw error;
            await delay(1000 * attempt);
        }
    }
}

async function uploadToUploadcareRaw(file, onProgress = null) {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('UPLOADCARE_PUB_KEY', window.HOSTING_CONFIG.uploadcare.publicKey);
        formData.append('UPLOADCARE_STORE', 'auto');
        
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', function(e) {
            if (e.lengthComputable && onProgress) {
                onProgress(Math.round((e.loaded / e.total) * 100));
            }
        });
        
        xhr.addEventListener('load', function() {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    if (data.file) {
                        resolve({
                            success: true,
                            url: `${window.HOSTING_CONFIG.uploadcare.cdnBase}${data.file}/`,
                            host: 'uploadcare',
                            uuid: data.file
                        });
                    } else {
                        reject(new Error('Upload failed'));
                    }
                } catch (e) {
                    reject(e);
                }
            } else {
                reject(new Error(`HTTP ${xhr.status}`));
            }
        });
        
        xhr.addEventListener('error', () => reject(new Error('Network error')));
        xhr.addEventListener('timeout', () => reject(new Error('Timeout')));
        
        xhr.open('POST', 'https://upload.uploadcare.com/base/');
        xhr.timeout = window.HOSTING_CONFIG.uploadcare.settings.timeout || 300000;
        xhr.send(formData);
    });
}

// ============================================
// VALIDATION
// ============================================
function validateFile(file) {
    const type = file.type;
    const size = file.size;
    
    let category = 'file';
    if (type.startsWith('image/')) category = 'image';
    else if (type.startsWith('video/')) category = 'video';
    else if (type.startsWith('audio/')) category = 'audio';
    
    const limits = window.HOSTING_CONFIG.limits[category];
    if (!limits) return { valid: false, error: 'File type haijulikani' };
    
    if (size > limits.maxSize) {
        return { valid: false, error: `File ni kubwa mno. Max: ${formatFileSize(limits.maxSize)}` };
    }
    
    if (limits.types && limits.types.length > 0 && !limits.types.includes(type)) {
        return { valid: false, error: `File type "${type}" hairuhusiwi` };
    }
    
    return { valid: true, category };
}

// ============================================
// COMPRESSION
// ============================================
async function processFileWithCompression(file) {
    const type = file.type;
    if (type.startsWith('image/')) return await compressImage(file);
    if (type.startsWith('video/')) return await compressVideo(file);
    if (type.startsWith('audio/')) return await compressAudio(file);
    return file;
}

async function compressImage(file) {
    try {
        const settings = window.HOSTING_CONFIG.compression.image;
        if (!settings.enabled || file.size < 500 * 1024) return file;
        
        console.log('🗜️ Compressing image...');
        
        const img = await createImageBitmap(file);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        let width = img.width, height = img.height;
        
        if (width > settings.maxWidth) {
            height = (height * settings.maxWidth) / width;
            width = settings.maxWidth;
        }
        if (height > settings.maxHeight) {
            width = (width * settings.maxHeight) / height;
            height = settings.maxHeight;
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        const blob = await new Promise(resolve => canvas.toBlob(resolve, file.type, settings.quality));
        const compressed = new File([blob], file.name, { type: file.type });
        
        console.log('📉', formatFileSize(file.size), '→', formatFileSize(compressed.size));
        return compressed;
    } catch (e) {
        console.warn('Image compression failed:', e);
        return file;
    }
}

async function compressVideo(file) {
    return file;
}

async function compressAudio(file) {
    return file;
}

// ============================================
// MULTIPLE FILES
// ============================================
async function uploadMultipleFiles(files, options = {}) {
    const results = [];
    const total = files.length;
    
    for (let i = 0; i < total; i++) {
        const file = files[i];
        
        const progressCallback = (percent) => {
            if (options.onProgress) {
                options.onProgress({
                    fileIndex: i,
                    totalFiles: total,
                    fileName: file.name,
                    percent
                });
            }
        };
        
        const result = await uploadFileSmart(file, { ...options, onProgress: progressCallback });
        results.push(result);
        
        if (!result.success && options.stopOnError) break;
    }
    
    return results;
}

// ============================================
// HELPERS
// ============================================
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
}

function getFileCategory(file) {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return 'file';
}

// Cloudinary URL helpers
function getCloudinaryThumbnail(publicId, account = null) {
    const acc = account || window.HOSTING_CONFIG.cloudinary.image;
    return `https://res.cloudinary.com/${acc.cloudName}/image/upload/${window.HOSTING_CONFIG.transformations.thumbnail}/${publicId}`;
}

function getCloudinarySmall(publicId, account = null) {
    const acc = account || window.HOSTING_CONFIG.cloudinary.image;
    return `https://res.cloudinary.com/${acc.cloudName}/image/upload/${window.HOSTING_CONFIG.transformations.small}/${publicId}`;
}

function getCloudinaryMedium(publicId, account = null) {
    const acc = account || window.HOSTING_CONFIG.cloudinary.image;
    return `https://res.cloudinary.com/${acc.cloudName}/image/upload/${window.HOSTING_CONFIG.transformations.medium}/${publicId}`;
}

function getCloudinaryLarge(publicId, account = null) {
    const acc = account || window.HOSTING_CONFIG.cloudinary.image;
    return `https://res.cloudinary.com/${acc.cloudName}/image/upload/${window.HOSTING_CONFIG.transformations.large}/${publicId}`;
}

function getCloudinaryOriginal(publicId, account = null) {
    const acc = account || window.HOSTING_CONFIG.cloudinary.image;
    return `https://res.cloudinary.com/${acc.cloudName}/image/upload/${window.HOSTING_CONFIG.transformations.original}/${publicId}`;
}

function getUploadStats() {
    return {
        cloudinary: {
            image_primary: window.HOSTING_CONFIG.cloudinary.image,
            video_primary: window.HOSTING_CONFIG.cloudinary.video,
            emergencies: window.HOSTING_CONFIG.cloudinary.emergency
        },
        uploadcare: window.HOSTING_CONFIG.uploadcare,
        routing: window.HOSTING_CONFIG.routing
    };
}

// ============================================
// EXPORT
// ============================================
window.uploadFileSmart = uploadFileSmart;
window.uploadToCloudinaryImage = uploadToCloudinaryImage;
window.uploadToCloudinaryVideo = uploadToCloudinaryVideo;
window.uploadToUploadcare = uploadToUploadcare;
window.uploadMultipleFiles = uploadMultipleFiles;
window.validateFile = validateFile;
window.getApiForFile = getApiForFile;
window.getUploadStats = getUploadStats;
window.formatFileSize = formatFileSize;
window.getFileCategory = getFileCategory;
window.getCloudinaryThumbnail = getCloudinaryThumbnail;
window.getCloudinarySmall = getCloudinarySmall;
window.getCloudinaryMedium = getCloudinaryMedium;
window.getCloudinaryLarge = getCloudinaryLarge;
window.getCloudinaryOriginal = getCloudinaryOriginal;

console.log('✅ UPLOAD_MANAGER v3.3 loaded');