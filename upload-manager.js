// ============================================
// SMART UPLOAD MANAGER v2.0
// ============================================

const UPLOAD_LIMITS = {
    image: { maxSize: 25 * 1024 * 1024, types: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] }, // 25MB
    video: { maxSize: 500 * 1024 * 1024, types: ['video/mp4', 'video/webm', 'video/quicktime'] }, // 500MB
    audio: { maxSize: 100 * 1024 * 1024, types: ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/aac', 'audio/ogg'] }, // 100MB
    file: { maxSize: 50 * 1024 * 1024, types: ['application/pdf', 'application/zip', 'application/vnd.rar', 'application/vnd.android.package-archive'] } // 50MB
};

// ============ MAIN UPLOAD FUNCTION ============
async function uploadFileSmart(file, options = {}) {
    const {
        onProgress = null,
        compress = true,
        maxRetries = 3
    } = options;
    
    try {
        // Validate file
        const validation = validateFile(file);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }
        
        console.log('📤 Uploading:', file.name, '| Size:', (file.size / (1024 * 1024)).toFixed(2) + 'MB', '| Type:', file.type);
        
        // Process file (compression if needed)
        let processedFile = file;
        
        if (compress) {
            processedFile = await processFileWithCompression(file);
        }
        
        // Route to correct service
        let result = null;
        
        if (file.type.startsWith('image/')) {
            // PICHA → Cloudinary
            console.log('→ Cloudinary (picha)');
            result = await uploadToCloudinaryWithRetry(processedFile, onProgress, maxRetries);
        } else if (file.type.startsWith('video/')) {
            // VIDEO → Cloudinary
            console.log('→ Cloudinary (video)');
            result = await uploadToCloudinaryWithRetry(processedFile, onProgress, maxRetries);
        } else if (file.type.startsWith('audio/')) {
            // AUDIO → Uploadcare
            console.log('→ Uploadcare (audio)');
            result = await uploadToUploadcareWithRetry(processedFile, onProgress, maxRetries);
        } else {
            // OTHER FILES → Uploadcare
            console.log('→ Uploadcare (file)');
            result = await uploadToUploadcareWithRetry(processedFile, onProgress, maxRetries);
        }
        
        if (result.success) {
            console.log('✅ Upload successful:', result.url);
        }
        
        return result;
    } catch (error) {
        console.error('❌ Upload error:', error);
        return { success: false, error: error.message };
    }
}

// ============ FILE VALIDATION ============
function validateFile(file) {
    const fileType = file.type;
    const fileSize = file.size;
    
    // Check file type
    let category = '';
    if (fileType.startsWith('image/')) category = 'image';
    else if (fileType.startsWith('video/')) category = 'video';
    else if (fileType.startsWith('audio/')) category = 'audio';
    else category = 'file';
    
    const limit = UPLOAD_LIMITS[category];
    
    if (!limit) {
        return { valid: false, error: 'File type haijulikani' };
    }
    
    // Check file size
    if (fileSize > limit.maxSize) {
        const maxMB = (limit.maxSize / (1024 * 1024)).toFixed(0);
        return { valid: false, error: `File ni kubwa mno. Max: ${maxMB}MB` };
    }
    
    // Check if file type is allowed
    if (!limit.types.includes(fileType) && limit.types.length > 0) {
        return { valid: false, error: `File type "${fileType}" hairuhusiwi` };
    }
    
    return { valid: true, category: category };
}

// ============ COMPRESSION ============
async function processFileWithCompression(file) {
    const fileType = file.type;
    
    // Image compression
    if (fileType.startsWith('image/')) {
        return await compressImage(file);
    }
    
    // Video compression (using browser native)
    if (fileType.startsWith('video/')) {
        return await compressVideo(file);
    }
    
    // Audio compression
    if (fileType.startsWith('audio/')) {
        return await compressAudio(file);
    }
    
    // No compression for other files
    return file;
}

// ============ IMAGE COMPRESSION ============
async function compressImage(file) {
    try {
        // Skip compression if image is small
        if (file.size < 1 * 1024 * 1024) { // < 1MB
            return file;
        }
        
        console.log('🗜️ Compressing image...');
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = await createImageBitmap(file);
        
        // Maintain aspect ratio
        const maxWidth = 1920;
        const maxHeight = 1080;
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
        }
        if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to blob with quality preservation
        const blob = await new Promise(resolve => {
            canvas.toBlob(resolve, file.type, 0.85);
        });
        
        const compressedFile = new File([blob], file.name, { type: file.type });
        
        console.log('📉 Compression:', (file.size / (1024 * 1024)).toFixed(2) + 'MB →', (compressedFile.size / (1024 * 1024)).toFixed(2) + 'MB');
        
        return compressedFile;
    } catch (e) {
        console.warn('Image compression failed, using original:', e);
        return file;
    }
}

// ============ VIDEO COMPRESSION ============
async function compressVideo(file) {
    try {
        // Skip compression if video is small
        if (file.size < 10 * 1024 * 1024) { // < 10MB
            return file;
        }
        
        console.log('🗜️ Processing video...');
        
        // Video compression requires MediaRecorder API
        const videoElement = document.createElement('video');
        videoElement.src = URL.createObjectURL(file);
        await videoElement.play();
        
        const stream = videoElement.captureStream();
        const mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp9',
            videoBitsPerSecond: 2000000 // 2Mbps - maintains quality
        });
        
        const chunks = [];
        mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
        
        const compressedBlob = await new Promise((resolve) => {
            mediaRecorder.onstop = () => {
                resolve(new Blob(chunks, { type: 'video/webm' }));
            };
            mediaRecorder.start();
            videoElement.onended = () => mediaRecorder.stop();
        });
        
        const compressedFile = new File([compressedBlob], file.name.replace(/\.[^.]+$/, '.webm'), { type: 'video/webm' });
        
        console.log('📉 Video compression:', (file.size / (1024 * 1024)).toFixed(2) + 'MB →', (compressedFile.size / (1024 * 1024)).toFixed(2) + 'MB');
        
        URL.revokeObjectURL(videoElement.src);
        
        return compressedFile;
    } catch (e) {
        console.warn('Video compression failed, using original:', e);
        return file;
    }
}

// ============ AUDIO COMPRESSION ============
async function compressAudio(file) {
    try {
        // Skip compression if audio is small
        if (file.size < 5 * 1024 * 1024) { // < 5MB
            return file;
        }
        
        console.log('🗜️ Processing audio...');
        
        // Audio compression using AudioContext
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // Convert to mono if stereo
        const numChannels = Math.min(audioBuffer.numberOfChannels, 2);
        const offlineContext = new OfflineAudioContext(
            numChannels,
            audioBuffer.length,
            Math.min(audioBuffer.sampleRate, 44100)
        );
        
        const source = offlineContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(offlineContext.destination);
        source.start();
        
        const renderedBuffer = await offlineContext.startRendering();
        
        // Convert to WAV or compressed format
        const compressedBlob = bufferToWave(renderedBuffer);
        const compressedFile = new File([compressedBlob], file.name.replace(/\.[^.]+$/, '.wav'), { type: 'audio/wav' });
        
        console.log('📉 Audio compression:', (file.size / (1024 * 1024)).toFixed(2) + 'MB →', (compressedFile.size / (1024 * 1024)).toFixed(2) + 'MB');
        
        await audioContext.close();
        
        return compressedFile;
    } catch (e) {
        console.warn('Audio compression failed, using original:', e);
        return file;
    }
}

// ============ AUDIO BUFFER TO WAVE ============
function bufferToWave(audioBuffer) {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;
    const buffer = new ArrayBuffer(44 + length * numChannels * 2);
    const view = new DataView(buffer);
    
    // Write WAV header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + length * numChannels * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, length * numChannels * 2, true);
    
    // Write audio data
    let offset = 44;
    for (let i = 0; i < length; i++) {
        for (let channel = 0; channel < numChannels; channel++) {
            const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
            view.setInt16(offset, sample * 0x7FFF, true);
            offset += 2;
        }
    }
    
    return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

// ============ CLOUDINARY UPLOAD ============
async function uploadToCloudinaryWithRetry(file, onProgress = null, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await uploadToCloudinary(file, onProgress);
        } catch (error) {
            console.warn(`Cloudinary upload attempt ${attempt} failed:`, error);
            if (attempt === maxRetries) throw error;
            await delay(1000 * attempt); // Exponential backoff
        }
    }
}

async function uploadToCloudinary(file, onProgress = null) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', HOSTING_CONFIG.cloudinary.uploadPreset);
    
    // Add optimization parameters
    formData.append('quality', 'auto:good'); // Maintains quality while optimizing
    formData.append('fetch_format', 'auto');
    formData.append('flags', 'progressive');
    
    const xhr = new XMLHttpRequest();
    
    const promise = new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', function(e) {
            if (e.lengthComputable && onProgress) {
                const percent = Math.round((e.loaded / e.total) * 100);
                onProgress(percent);
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
                            publicId: data.public_id,
                            format: data.format,
                            size: data.bytes
                        });
                    } else {
                        reject(new Error(data.error?.message || 'Cloudinary upload failed'));
                    }
                } catch (e) {
                    reject(e);
                }
            } else {
                reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
            }
        });
        
        xhr.addEventListener('error', function() {
            reject(new Error('Network error during upload'));
        });
        
        xhr.addEventListener('timeout', function() {
            reject(new Error('Upload timeout'));
        });
        
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${HOSTING_CONFIG.cloudinary.cloudName}/auto/upload`);
        xhr.timeout = 300000; // 5 minutes
        xhr.send(formData);
    });
    
    return promise;
}

// ============ UPLOADCARE UPLOAD ============
async function uploadToUploadcareWithRetry(file, onProgress = null, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await uploadToUploadcare(file, onProgress);
        } catch (error) {
            console.warn(`Uploadcare upload attempt ${attempt} failed:`, error);
            if (attempt === maxRetries) throw error;
            await delay(1000 * attempt);
        }
    }
}

async function uploadToUploadcare(file, onProgress = null) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('UPLOADCARE_PUB_KEY', HOSTING_CONFIG.uploadcare.publicKey);
    formData.append('UPLOADCARE_STORE', 'auto');
    
    const xhr = new XMLHttpRequest();
    
    const promise = new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', function(e) {
            if (e.lengthComputable && onProgress) {
                const percent = Math.round((e.loaded / e.total) * 100);
                onProgress(percent);
            }
        });
        
        xhr.addEventListener('load', function() {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    if (data.file) {
                        resolve({ 
                            success: true, 
                            url: `https://ucarecdn.com/${data.file}/`,
                            host: 'uploadcare',
                            uuid: data.file
                        });
                    } else {
                        reject(new Error('Uploadcare upload failed'));
                    }
                } catch (e) {
                    reject(e);
                }
            } else {
                reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
            }
        });
        
        xhr.addEventListener('error', function() {
            reject(new Error('Network error during upload'));
        });
        
        xhr.addEventListener('timeout', function() {
            reject(new Error('Upload timeout'));
        });
        
        xhr.open('POST', 'https://upload.uploadcare.com/base/');
        xhr.timeout = 300000; // 5 minutes
        xhr.send(formData);
    });
    
    return promise;
}

// ============ UTILITY FUNCTIONS ============
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============ MULTI-FILE UPLOAD ============
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
                    percent: percent
                });
            }
        };
        
        const result = await uploadFileSmart(file, {
            ...options,
            onProgress: progressCallback
        });
        
        results.push(result);
        
        if (!result.success && options.stopOnError) {
            break;
        }
    }
    
    return results;
}

// ============ FILE HELPERS ============
function getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileCategory(file) {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return 'file';
}