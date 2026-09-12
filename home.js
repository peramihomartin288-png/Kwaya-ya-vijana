// ============================================
// KMCA USER PANEL - HOME.JS v3.0 PRO
// Complete feed with smooth loading, video thumbnails,
// badges, view tracking, media management
// ============================================

// currentUser ipo kwenye user-nav.js
let homeSettings = {};
let feedItems = [];
let activeVideo = null;
let activeAudio = null;
let viewedPosts = new Set();
let videoThumbnailCache = new Map();
let feedLoaded = false;
let chatSubscription = null;
let notificationSubscription = null;
let pollVotesCache = new Map();

// ============================================
// INITIALIZE
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🏠 Home page - Initializing PRO');
    
    // Check user
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    
    // Load settings
    homeSettings = await loadHomeSettings();
    console.log('Settings loaded:', homeSettings);
    
    // Load feed with smooth animation
    await loadFeed();
    
    // Load footer
    await loadHomeFooter();
    
    // Setup listeners
    setupScrollListener();
    setupVisibilityListener();
    setupRealtimeListeners();
    
    // Track page view
    trackPageView();
    
    // Update badges
    updateChatBadge();
    updateNotificationBadge();
});

// ============================================
// LOAD SETTINGS
// ============================================
async function loadHomeSettings() {
    try {
        const { data } = await supabaseClient
            .from('app_settings')
            .select('setting_key, setting_value');
        
        const obj = {};
        (data || []).forEach(s => {
            obj[s.setting_key] = s.setting_value;
        });
        
        return obj;
    } catch (e) {
        console.error('Load settings error:', e);
        return {};
    }
}

// ============================================
// LOAD FEED (with smooth loading)
// ============================================
async function loadFeed() {
    const container = document.getElementById('mainContent');
    
    // Show skeleton loading
    showSkeletonLoading(container);
    
    try {
        const startTime = Date.now();
        const today = new Date().toISOString().split('T')[0];
        
        // Load zote kwa pamoja
        const [dailyCards, matukio, polls, posts] = await Promise.all([
            loadDailyCards(today),
            loadMatukio(today),
            loadPolls(today),
            loadPosts()
        ]);
        
        // Ensure minimum 0.5s loading
        const elapsed = Date.now() - startTime;
        const minLoading = 500;
        if (elapsed < minLoading) {
            await new Promise(r => setTimeout(r, minLoading - elapsed));
        }
        
        // Build HTML
        let html = '';
        
        // 1. Daily Cards Section
        if (dailyCards.length > 0) {
            html += `
                <div class="daily-cards-section">
                    <div class="section-title">
                        <i class="fas fa-star"></i>
                        Leo
                    </div>
                    <div class="daily-cards-scroll">
                        ${dailyCards.map(card => renderDailyCard(card)).join('')}
                    </div>
                </div>
            `;
        }
        
        // 2. Matukio Section
        if (matukio.length > 0) {
            html += `
                <div class="matukio-section">
                    <div class="section-title">
                        <i class="fas fa-calendar-alt"></i>
                        Matukio
                    </div>
                    ${matukio.map(m => renderMatukio(m)).join('')}
                </div>
            `;
        }
        
        // 3. Polls Section
        if (polls.length > 0) {
            html += `
                <div class="polls-section">
                    <div class="section-title">
                        <i class="fas fa-vote-yea"></i>
                        Polls
                    </div>
                    ${polls.map(p => renderPoll(p)).join('')}
                </div>
            `;
        }
        
        // 4. Posts Section
        if (posts.length > 0) {
            html += `
                <div class="posts-section">
                    <div class="section-title">
                        <i class="fas fa-newspaper"></i>
                        Posts
                    </div>
                    ${posts.map(p => renderPost(p)).join('')}
                </div>
            `;
        }
        
        // 5. Empty state
        if (html === '') {
            html = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>Hakuna kitu bado</p>
                    <p style="font-size: 13px; margin-top: 8px;">Endelea kufuata kwaya yetu!</p>
                </div>
            `;
        }
        
        // Smooth transition
        container.style.opacity = '0';
        setTimeout(() => {
            container.innerHTML = html;
            container.style.transition = 'opacity 0.4s ease-out';
            container.style.opacity = '1';
            
            // Setup events
            setupFeedEvents();
            
            // Load counts
            loadAllCounts();
            
            // Load user likes
            loadUserLikes();
            
            // Load user poll votes
            loadUserPollVotes();
            
            // Generate video thumbnails
            generateAllVideoThumbnails();
            
            feedLoaded = true;
        }, 100);
        
    } catch (error) {
        console.error('Load feed error:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Imeshindikana kupakia</p>
                <button class="btn-retry" onclick="window.location.reload()">
                    <i class="fas fa-redo"></i> Jaribu Tena
                </button>
            </div>
        `;
    }
}

// ============================================
// SKELETON LOADING
// ============================================
function showSkeletonLoading(container) {
    container.innerHTML = `
        <!-- Daily Cards Skeleton -->
        <div class="daily-cards-section">
            <div class="section-title">
                <i class="fas fa-star"></i>
                Leo
            </div>
            <div class="daily-cards-scroll">
                ${[1,2,3].map(() => `
                    <div class="daily-card">
                        <div class="skeleton skeleton-circle" style="width: 56px; height: 56px; margin-bottom: 14px;"></div>
                        <div class="skeleton skeleton-text" style="width: 80%; height: 18px; margin-bottom: 8px;"></div>
                        <div class="skeleton skeleton-text" style="width: 60%; height: 14px; margin-bottom: 16px;"></div>
                        <div class="skeleton skeleton-button" style="width: 100px; height: 32px;"></div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <!-- Post Skeleton 1 -->
        <div class="post-skeleton">
            <div class="skeleton-header">
                <div class="skeleton skeleton-circle" style="width: 44px; height: 44px;"></div>
                <div style="flex: 1;">
                    <div class="skeleton skeleton-text" style="width: 40%; height: 14px; margin-bottom: 6px;"></div>
                    <div class="skeleton skeleton-text" style="width: 25%; height: 11px;"></div>
                </div>
            </div>
            <div class="skeleton skeleton-text" style="width: 90%; height: 14px; margin-bottom: 8px;"></div>
            <div class="skeleton skeleton-text" style="width: 70%; height: 14px; margin-bottom: 16px;"></div>
            <div class="skeleton skeleton-image" style="width: 100%; height: 250px;"></div>
            <div class="skeleton-footer">
                ${[1,2,3,4].map(() => `
                    <div class="skeleton skeleton-text" style="width: 50px; height: 20px;"></div>
                `).join('')}
            </div>
        </div>
        
        <!-- Post Skeleton 2 -->
        <div class="post-skeleton">
            <div class="skeleton-header">
                <div class="skeleton skeleton-circle" style="width: 44px; height: 44px;"></div>
                <div style="flex: 1;">
                    <div class="skeleton skeleton-text" style="width: 40%; height: 14px; margin-bottom: 6px;"></div>
                    <div class="skeleton skeleton-text" style="width: 25%; height: 11px;"></div>
                </div>
            </div>
            <div class="skeleton skeleton-text" style="width: 85%; height: 14px; margin-bottom: 8px;"></div>
            <div class="skeleton skeleton-image" style="width: 100%; height: 200px;"></div>
            <div class="skeleton-footer">
                ${[1,2,3,4].map(() => `
                    <div class="skeleton skeleton-text" style="width: 50px; height: 20px;"></div>
                `).join('')}
            </div>
        </div>
    `;
}

// ============================================
// LOAD DAILY CARDS
// ============================================
async function loadDailyCards(today) {
    const cards = [];
    
    // 1. Mtakatifu wa Leo
    try {
        const { data: saints } = await supabaseClient
            .from('watakatifu')
            .select('*')
            .eq('sikukuu', today)
            .limit(1);
        
        if (saints && saints[0]) {
            cards.push({
                type: 'saint',
                icon: saints[0].picha_file ? 'image' : '🕊️',
                image: saints[0].picha_file,
                title: saints[0].jina,
                subtitle: saints[0].historia ? saints[0].historia.substring(0, 60) + '...' : 'Mtakatifu wa Leo',
                buttonText: 'Soma Zaidi',
                buttonIcon: 'fa-book-open',
                link: `watakatifu.html?id=${saints[0].id}`
            });
        }
    } catch (e) {}
    
    // 2. Wimbo wa Leo
    try {
        const { data: songs } = await supabaseClient
            .from('nyimbo_za_siku')
            .select('*')
            .eq('tarehe', today)
            .limit(1);
        
        if (songs && songs[0]) {
            cards.push({
                type: 'song',
                icon: '🎵',
                title: songs[0].jina,
                subtitle: songs[0].maelezo || 'Wimbo wa Siku',
                buttonText: 'Sikiliza',
                buttonIcon: 'fa-play',
                link: `wimbo.html?id=${songs[0].id}`
            });
        }
    } catch (e) {}
    
    // 3. Masomo ya Dominica
    try {
        const todayDate = new Date(today);
        const dayOfWeek = todayDate.getDay();
        const daysToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
        const nextSunday = new Date(todayDate);
        nextSunday.setDate(todayDate.getDate() + daysToSunday);
        const sundayDate = nextSunday.toISOString().split('T')[0];
        
        const { data: masomo } = await supabaseClient
            .from('masomo_dominica')
            .select('*')
            .eq('tarehe_jumapili', sundayDate)
            .limit(1);
        
        if (masomo && masomo[0]) {
            const jinaDominika = masomo[0].jina_dominika || '';
            const numberMatch = jinaDominika.match(/\d+/);
            const dominikaNumber = numberMatch ? numberMatch[0] : null;
            
            cards.push({
                type: 'masomo',
                icon: dominikaNumber ? 'number' : 'text',
                number: dominikaNumber,
                textIcon: dominikaNumber ? null : '📚',
                title: jinaDominika,
                subtitle: 'Masomo ya Dominica',
                buttonText: 'Soma Masomo',
                buttonIcon: 'fa-book-open',
                link: `masomo.html?id=${masomo[0].id}`
            });
        }
    } catch (e) {}
    
    // 4. Bible Verse
    try {
        const { data: verses } = await supabaseClient
            .from('bible_verses')
            .select('*')
            .eq('tarehe', today)
            .limit(1);
        
        if (verses && verses[0]) {
            cards.push({
                type: 'bible',
                icon: '📖',
                title: verses[0].kichwa,
                subtitle: verses[0].reference || 'Bible Verse',
                buttonText: 'Soma',
                buttonIcon: 'fa-book-reader',
                link: `bible.html?id=${verses[0].id}`
            });
        }
    } catch (e) {}
    
    return cards;
}

// ============================================
// RENDER DAILY CARD
// ============================================
function renderDailyCard(card) {
    let iconHtml = '';
    
    if (card.icon === 'image' && card.image) {
        iconHtml = `<img src="${card.image}" alt="${card.title}" onerror="this.parentElement.innerHTML='🕊️'">`;
    } else if (card.icon === 'number' && card.number) {
        iconHtml = card.number;
    } else if (card.icon === 'text' && card.textIcon) {
        iconHtml = card.textIcon;
    } else {
        iconHtml = card.icon || '📌';
    }
    
    const isNumber = card.icon === 'number';
    
    return `
        <div class="daily-card ${card.type}" onclick="window.location.href='${card.link}'">
            <div class="daily-card-icon ${isNumber ? 'number-icon' : ''}">
                ${iconHtml}
            </div>
            <div class="daily-card-title">${escapeHtml(card.title)}</div>
            <div class="daily-card-subtitle">${escapeHtml(card.subtitle)}</div>
            <button class="daily-card-btn">
                <i class="fas ${card.buttonIcon}"></i>
                ${card.buttonText}
            </button>
        </div>
    `;
}

// ============================================
// LOAD MATUKIO
// ============================================
async function loadMatukio(today) {
    try {
        const { data } = await supabaseClient
            .from('matukio')
            .select('*')
            .lte('tarehe_send', today)
            .gte('tarehe_delete', today)
            .order('tarehe_tukio', { ascending: true })
            .limit(10);
        
        return data || [];
    } catch (e) {
        return [];
    }
}

// ============================================
// RENDER MATUKIO (Picha kubwa juu)
// ============================================
function renderMatukio(m) {
    const logoHtml = homeSettings.intro_logo
        ? `<img src="${homeSettings.intro_logo}" alt="KMCA">`
        : '⛪';
    
    const tarehe = m.tarehe_tukio 
        ? new Date(m.tarehe_tukio).toLocaleDateString('sw-TZ', { 
            weekday: 'long',
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        })
        : '';
    
    const imageHtml = m.picha_file 
        ? `<div class="matukio-image">
             <img src="${m.picha_file}" alt="${escapeHtml(m.jina)}" onerror="this.parentElement.style.display='none'">
           </div>`
        : '';
    
    return `
        <div class="matukio-card" onclick="window.location.href='matukio.html?id=${m.id}'">
            <div class="matukio-header">
                <div class="post-owner-logo">${logoHtml}</div>
                <div class="post-owner-info">
                    <div class="post-owner-name">
                        KMCA
                        <i class="fas fa-check-circle verified-badge"></i>
                    </div>
                    <div class="post-owner-time">📅 Tukio</div>
                </div>
            </div>
            
            ${imageHtml}
            
            <div class="matukio-content">
                <div class="matukio-title">🎉 ${escapeHtml(m.jina)}</div>
                
                ${tarehe ? `
                    <div class="matukio-detail-row">
                        <i class="fas fa-calendar"></i>
                        <span>${tarehe}</span>
                    </div>
                ` : ''}
                
                ${m.muda ? `
                    <div class="matukio-detail-row">
                        <i class="fas fa-clock"></i>
                        <span>${escapeHtml(m.muda)}</span>
                    </div>
                ` : ''}
                
                ${m.mahali ? `
                    <div class="matukio-detail-row">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${escapeHtml(m.mahali)}</span>
                    </div>
                ` : ''}
                
                ${m.maelezo ? `
                    <div class="matukio-description">${escapeHtml(m.maelezo)}</div>
                ` : ''}
                
                <button class="matukio-btn">
                    <i class="fas fa-eye"></i>
                    View Details
                </button>
            </div>
        </div>
    `;
}

// ============================================
// LOAD POLLS
// ============================================
async function loadPolls(today) {
    try {
        const { data } = await supabaseClient
            .from('polls')
            .select('*, poll_options(*)')
            .lte('tarehe_send', today)
            .gte('tarehe_delete', today)
            .order('created_at', { ascending: false })
            .limit(10);
        
        return data || [];
    } catch (e) {
        return [];
    }
}

// ============================================
// RENDER POLL (WhatsApp style + Hidden + Change)
// ============================================
function renderPoll(poll) {
    const logoHtml = homeSettings.intro_logo
        ? `<img src="${homeSettings.intro_logo}" alt="KMCA">`
        : '⛪';
    
    const options = poll.poll_options || [];
    
    return `
        <div class="poll-card" data-poll-id="${poll.id}">
            <div class="post-header">
                <div class="post-owner-logo">${logoHtml}</div>
                <div class="post-owner-info">
                    <div class="post-owner-name">
                        KMCA
                        <i class="fas fa-check-circle verified-badge"></i>
                    </div>
                    <div class="post-owner-time">🗳️ Poll</div>
                </div>
            </div>
            
            <div class="poll-question">${escapeHtml(poll.swali)}</div>
            
            <div class="poll-options" id="poll-options-${poll.id}">
                ${options.map(opt => `
                    <div class="poll-option" data-option-id="${opt.id}" data-poll-id="${poll.id}">
                        <div class="poll-option-radio"></div>
                        <div class="poll-option-text">${escapeHtml(opt.chaguo)}</div>
                        <div class="poll-option-percent" style="display: none;">0%</div>
                        <div class="poll-option-bar" style="width: 0%;"></div>
                    </div>
                `).join('')}
            </div>
            
            <div class="poll-footer">
                <div class="poll-total" id="poll-total-${poll.id}">👥 0 kura</div>
                <div class="poll-voted-badge" id="poll-voted-${poll.id}" style="display: none;">
                    <i class="fas fa-check"></i> Umeshapiga
                </div>
            </div>
        </div>
    `;
}

// ============================================
// LOAD POSTS
// ============================================
async function loadPosts() {
    try {
        const { data } = await supabaseClient
            .from('posts')
            .select('*')
            .order('created_at', { ascending: false });
        
        return data || [];
    } catch (e) {
        return [];
    }
}

// ============================================
// RENDER POST (3 text styles)
// ============================================
function renderPost(post) {
    const logoHtml = homeSettings.intro_logo
        ? `<img src="${homeSettings.intro_logo}" alt="KMCA">`
        : '⛪';
    
    const timeAgo = getTimeAgo(post.created_at);
    const hasContent = post.description && post.description.trim() !== '';
    
    let mediaHtml = '';
    const type = post.type || '';
    const mediaFiles = post.media_files || [];
    
    // RENDER MEDIA
    if (type === 'maneno') {
        mediaHtml = '';
    } else if (type === 'picha_moja' && mediaFiles[0]) {
        mediaHtml = `
            <div class="post-media">
                <img src="${mediaFiles[0]}" alt="Post" loading="lazy">
                ${renderWatermark()}
            </div>
        `;
    } else if (type === 'picha_nyingi' && mediaFiles.length > 0) {
        mediaHtml = `
            <div class="post-media">
                <div class="post-carousel" data-carousel-id="${post.id}">
                    ${mediaFiles.map((url, i) => `
                        <div class="post-carousel-slide">
                            <img src="${url}" alt="Post ${i + 1}" loading="lazy">
                        </div>
                    `).join('')}
                </div>
                ${mediaFiles.length > 1 ? `
                    <div class="post-carousel-dots">
                        ${mediaFiles.map((_, i) => `
                            <div class="carousel-dot ${i === 0 ? 'active' : ''}"></div>
                        `).join('')}
                    </div>
                ` : ''}
                ${renderWatermark()}
            </div>
        `;
    } else if (type === 'video' && mediaFiles[0]) {
        const videoId = `video-${post.id}`;
        mediaHtml = `
            <div class="post-media">
                <div class="post-video-container" id="${videoId}" data-video-id="${post.id}" data-src="${mediaFiles[0]}">
                    <div class="video-thumbnail-skeleton" id="thumb-skeleton-${post.id}"></div>
                    <div class="post-video-overlay">
                        <i class="fas fa-play"></i>
                    </div>
                    ${renderWatermark()}
                </div>
            </div>
        `;
    } else if (type === 'picha_music' || type === 'picha_nyingi_music') {
        const image = mediaFiles[0];
        const audio = post.audio_file;
        
        mediaHtml = `
            <div class="post-media">
                ${image ? `<img src="${image}" alt="Post" loading="lazy">` : ''}
                ${audio ? `
                    <audio class="post-audio" data-audio-id="${post.id}" src="${audio}" loop></audio>
                    <button class="post-music-btn" data-audio-id="${post.id}" data-muted="true">
                        <i class="fas fa-volume-mute"></i>
                    </button>
                ` : ''}
                ${renderWatermark()}
            </div>
        `;
    } else if (type === 'live_video' || type === 'auto_fake_live_video') {
        const url = mediaFiles[0];
        mediaHtml = `
            <div class="post-media">
                <div class="post-video-container" data-video-id="${post.id}" data-src="${url}" data-live="${type === 'live_video' ? 'true' : 'false'}">
                    <div class="video-thumbnail-skeleton" id="thumb-skeleton-${post.id}"></div>
                    <div class="post-video-overlay">
                        <i class="fas fa-play"></i>
                    </div>
                    <div class="live-badge">
                        <span class="live-dot"></span>
                        LIVE
                    </div>
                    ${renderWatermark()}
                </div>
            </div>
        `;
    } else if (mediaFiles[0]) {
        mediaHtml = `
            <div class="post-media">
                <img src="${mediaFiles[0]}" alt="Post" loading="lazy">
                ${renderWatermark()}
            </div>
        `;
    }
    
    // RENDER TEXT (3 styles)
    let contentHtml = '';
    if (hasContent) {
        contentHtml = renderPostContent(post.description, type);
    }
    
    // View count for live/fake live
    let viewCountHtml = '';
    if (type === 'live_video' || type === 'auto_fake_live_video') {
        viewCountHtml = `
            <div class="post-view-count" id="view-count-${post.id}">
                <i class="fas fa-eye"></i>
                <span class="view-num">0</span>
            </div>
        `;
    }
    
    return `
        <div class="post-card" data-post-id="${post.id}" data-type="${type}">
            <div class="post-header">
                <div class="post-owner-logo">${logoHtml}</div>
                <div class="post-owner-info">
                    <div class="post-owner-name">
                        KMCA
                        <i class="fas fa-check-circle verified-badge"></i>
                    </div>
                    <div class="post-owner-time">${timeAgo}</div>
                </div>
                ${viewCountHtml}
            </div>
            
            ${contentHtml}
            
            ${mediaHtml}
            
            <div class="post-actions">
                <button class="post-action post-like-btn" data-content-type="post" data-content-id="${post.id}">
                    <i class="far fa-heart"></i>
                    <span class="post-action-count like-count">0</span>
                </button>
                <button class="post-action post-comment-btn" data-content-type="post" data-content-id="${post.id}">
                    <i class="far fa-comment"></i>
                    <span class="post-action-count comment-count">0</span>
                </button>
                <button class="post-action post-share-btn" data-content-type="post" data-content-id="${post.id}" data-title="${escapeAttr(post.title || 'KMCA Post')}">
                    <i class="fas fa-share"></i>
                    <span class="post-action-count share-count">0</span>
                </button>
                <button class="post-action post-download-btn" data-content-type="post" data-content-id="${post.id}" data-url="${mediaFiles[0] || ''}">
                    <i class="fas fa-download"></i>
                    <span class="post-action-count download-count">0</span>
                </button>
            </div>
        </div>
    `;
}

// ============================================
// RENDER POST CONTENT (3 text styles)
// ============================================
function renderPostContent(text, type) {
    const lines = text.split('\n').filter(l => l.trim() !== '');
    const lineCount = lines.length;
    const charCount = text.length;
    
    // Deterministic random based on content
    const hash = text.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const random = (hash % 3);
    
    // Auto-choose style based on length
    let style = 'plain';
    
    if (charCount < 100 && lineCount <= 2) {
        // Fupi → Random (gradient au quote)
        style = random === 0 ? 'gradient' : 'quote';
    } else if (charCount < 200 && lineCount <= 5) {
        // Kati → Quote
        style = 'quote';
    } else {
        // Ndefu → Plain
        style = 'plain';
    }
    
    if (style === 'gradient') {
        return `
            <div class="post-content post-content-gradient">
                ${escapeHtml(text)}
            </div>
        `;
    } else if (style === 'quote') {
        return `
            <div class="post-content post-content-quote">
                ${escapeHtml(text)}
            </div>
        `;
    } else {
        return `
            <div class="post-content">${escapeHtml(text)}</div>
        `;
    }
}

// ============================================
// VIDEO THUMBNAIL GENERATION
// ============================================
async function generateAllVideoThumbnails() {
    const containers = document.querySelectorAll('.post-video-container');
    
    for (const container of containers) {
        const postId = container.getAttribute('data-video-id');
        const src = container.getAttribute('data-src');
        
        if (!src || !postId) continue;
        
        try {
            const thumbnail = await generateVideoThumbnail(src, postId);
            if (thumbnail) {
                const skeleton = container.querySelector('.video-thumbnail-skeleton');
                if (skeleton) {
                    skeleton.outerHTML = `<img src="${thumbnail}" class="post-video-thumbnail" alt="Video">`;
                }
            }
        } catch (e) {
            console.warn('Thumbnail failed for', postId, e);
            const skeleton = container.querySelector('.video-thumbnail-skeleton');
            if (skeleton) {
                skeleton.style.background = 'linear-gradient(135deg, #1e293b, #0f172a)';
                skeleton.innerHTML = '<i class="fas fa-video" style="font-size: 60px; color: #475569;"></i>';
            }
        }
    }
}

async function generateVideoThumbnail(videoUrl, cacheKey) {
    // Check cache (A: memory)
    if (videoThumbnailCache.has(cacheKey)) {
        return videoThumbnailCache.get(cacheKey);
    }
    
    // D: Generate kila mara (no persistent cache)
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.src = videoUrl;
        video.crossOrigin = 'anonymous';
        video.muted = true;
        video.playsInline = true;
        video.preload = 'metadata';
        
        let resolved = false;
        
        const timeout = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                video.remove();
                reject(new Error('Timeout'));
            }
        }, 5000);
        
        video.addEventListener('loadeddata', () => {
            video.currentTime = 1;
        });
        
        video.addEventListener('seeked', () => {
            if (resolved) return;
            resolved = true;
            clearTimeout(timeout);
            
            try {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth || 640;
                canvas.height = video.videoHeight || 360;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.7);
                
                // Cache kwenye memory
                videoThumbnailCache.set(cacheKey, thumbnailUrl);
                
                video.remove();
                resolve(thumbnailUrl);
            } catch (e) {
                video.remove();
                reject(e);
            }
        });
        
        video.addEventListener('error', () => {
            if (resolved) return;
            resolved = true;
            clearTimeout(timeout);
            video.remove();
            reject(new Error('Video load error'));
        });
        
        video.load();
    });
}

// ============================================
// RENDER WATERMARK
// ============================================
function renderWatermark() {
    if (homeSettings.watermark_enabled === 'false') return '';
    
    const logo = homeSettings.watermark_logo;
    const text1 = homeSettings.watermark_text_1 || 'Kwaya ya Mtakatifu Carlo Acutis';
    const text2 = homeSettings.watermark_text_2 || 'KMCA';
    
    const logoHtml = logo ? `<img src="${logo}" class="watermark-logo" alt="KMCA">` : '';
    
    return `
        <div class="watermark">
            ${logoHtml}
            <div class="watermark-text">
                <span>${escapeHtml(text1)}</span>
                <span>${escapeHtml(text2)}</span>
            </div>
        </div>
    `;
}

// ============================================
// LOAD ALL COUNTS
// ============================================
async function loadAllCounts() {
    const posts = document.querySelectorAll('.post-card');
    
    for (const postCard of posts) {
        const postId = postCard.getAttribute('data-post-id');
        
        // Like count
        try {
            const { count: likeCount } = await supabaseClient
                .from('content_likes')
                .select('*', { count: 'exact', head: true })
                .eq('content_type', 'post')
                .eq('content_id', postId);
            
            const likeEl = postCard.querySelector('.like-count');
            if (likeEl) likeEl.textContent = likeCount || 0;
        } catch (e) {}
        
        // Comment count
        try {
            const { count: commentCount } = await supabaseClient
                .from('comments')
                .select('*', { count: 'exact', head: true })
                .eq('content_type', 'post')
                .eq('content_id', postId);
            
            const commentEl = postCard.querySelector('.comment-count');
            if (commentEl) commentEl.textContent = commentCount || 0;
        } catch (e) {}
        
        // Share count
        try {
            const { count: shareCount } = await supabaseClient
                .from('content_shares')
                .select('*', { count: 'exact', head: true })
                .eq('content_type', 'post')
                .eq('content_id', postId);
            
            const shareEl = postCard.querySelector('.share-count');
            if (shareEl) shareEl.textContent = shareCount || 0;
        } catch (e) {}
        
        // Download count
        try {
            const { count: downloadCount } = await supabaseClient
                .from('content_downloads')
                .select('*', { count: 'exact', head: true })
                .eq('content_type', 'post')
                .eq('content_id', postId);
            
            const downloadEl = postCard.querySelector('.download-count');
            if (downloadEl) downloadEl.textContent = downloadCount || 0;
        } catch (e) {}
        
        // View count (kwa live/fake live pekee)
        const viewEl = postCard.querySelector('.view-num');
        if (viewEl) {
            try {
                const { count: viewCount } = await supabaseClient
                    .from('content_views')
                    .select('*', { count: 'exact', head: true })
                    .eq('content_type', 'live')
                    .eq('content_id', postId);
                
                viewEl.textContent = viewCount || 0;
            } catch (e) {}
        }
    }
}

// ============================================
// LOAD USER LIKES
// ============================================
async function loadUserLikes() {
    const user = getCurrentUser();
    if (!user) return;
    
    try {
        const { data: likes } = await supabaseClient
            .from('content_likes')
            .select('content_id')
            .eq('user_id', user.id)
            .eq('content_type', 'post');
        
        const likedIds = new Set((likes || []).map(l => l.content_id));
        
        document.querySelectorAll('.post-like-btn').forEach(btn => {
            const contentId = btn.getAttribute('data-content-id');
            if (likedIds.has(contentId)) {
                btn.classList.add('liked');
                btn.querySelector('i').className = 'fas fa-heart';
            }
        });
    } catch (e) {}
}

// ============================================
// LOAD USER POLL VOTES
// ============================================
async function loadUserPollVotes() {
    const user = getCurrentUser();
    if (!user) return;
    
    try {
        const { data: votes } = await supabaseClient
            .from('poll_votes')
            .select('poll_id, option_id')
            .eq('user_id', user.id);
        
        (votes || []).forEach(vote => {
            pollVotesCache.set(vote.poll_id, vote.option_id);
            
            const pollCard = document.querySelector(`.poll-card[data-poll-id="${vote.poll_id}"]`);
            if (!pollCard) return;
            
            // Show results
            showPollResults(pollCard, vote.poll_id, vote.option_id);
        });
    } catch (e) {}
}

// ============================================
// SHOW POLL RESULTS
// ============================================
async function showPollResults(pollCard, pollId, userVoteId = null) {
    const { data: votes } = await supabaseClient
        .from('poll_votes')
        .select('option_id')
        .eq('poll_id', pollId);
    
    const voteCounts = {};
    (votes || []).forEach(v => {
        voteCounts[v.option_id] = (voteCounts[v.option_id] || 0) + 1;
    });
    
    const totalVotes = votes ? votes.length : 0;
    
    pollCard.querySelectorAll('.poll-option').forEach(opt => {
        const optionId = opt.getAttribute('data-option-id');
        const count = voteCounts[optionId] || 0;
        const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
        const isUserVote = optionId === userVoteId;
        
        // Show percent
        const percentEl = opt.querySelector('.poll-option-percent');
        if (percentEl) {
            percentEl.style.display = 'block';
            percentEl.textContent = `${percent}%`;
        }
        
        // Show bar
        const barEl = opt.querySelector('.poll-option-bar');
        if (barEl) {
            barEl.style.width = percent + '%';
            barEl.className = 'poll-option-bar' + (isUserVote ? ' user-vote' : '');
        }
        
        // Add count
        let countEl = opt.querySelector('.poll-option-count');
        if (!countEl) {
            countEl = document.createElement('div');
            countEl.className = 'poll-option-count';
            opt.appendChild(countEl);
        }
        countEl.textContent = `${count} kura`;
        
        // Add checkmark kwa user vote
        if (isUserVote) {
            opt.classList.add('selected');
            opt.classList.add('disabled');
            
            // Add change button
            if (!opt.querySelector('.poll-change-btn')) {
                const changeBtn = document.createElement('button');
                changeBtn.className = 'poll-change-btn';
                changeBtn.innerHTML = '<i class="fas fa-edit"></i> Badilisha';
                changeBtn.onclick = (e) => {
                    e.stopPropagation();
                    enablePollChange(pollId);
                };
                opt.appendChild(changeBtn);
            }
        } else {
            opt.classList.add('disabled');
        }
    });
    
    // Total
    const totalEl = document.getElementById(`poll-total-${pollId}`);
    if (totalEl) totalEl.textContent = `👥 ${totalVotes} kura`;
    
    // Voted badge
    const badge = document.getElementById(`poll-voted-${pollId}`);
    if (badge) badge.style.display = 'flex';
}

// ============================================
// ENABLE POLL CHANGE
// ============================================
function enablePollChange(pollId) {
    const pollCard = document.querySelector(`.poll-card[data-poll-id="${pollId}"]`);
    if (!pollCard) return;
    
    // Reset UI
    pollCard.querySelectorAll('.poll-option').forEach(opt => {
        opt.classList.remove('selected');
        opt.classList.remove('disabled');
        
        const percentEl = opt.querySelector('.poll-option-percent');
        if (percentEl) percentEl.style.display = 'none';
        
        const barEl = opt.querySelector('.poll-option-bar');
        if (barEl) barEl.style.width = '0%';
        
        const countEl = opt.querySelector('.poll-option-count');
        if (countEl) countEl.remove();
        
        const changeBtn = opt.querySelector('.poll-change-btn');
        if (changeBtn) changeBtn.remove();
    });
    
    // Hide voted badge
    const badge = document.getElementById(`poll-voted-${pollId}`);
    if (badge) badge.style.display = 'none';
    
    // Show options (clickable)
    pollCard.querySelectorAll('.poll-option').forEach(opt => {
        opt.style.cursor = 'pointer';
    });
    
    showToast('Chagua jibu jipya', 'info');
}

// ============================================
// VOTE POLL
// ============================================
async function votePoll(option) {
    const user = getCurrentUser();
    if (!user) return;
    
    const pollId = option.getAttribute('data-poll-id');
    const optionId = option.getAttribute('data-option-id');
    const existingVote = pollVotesCache.get(pollId);
    
    try {
        if (existingVote) {
            // Change vote
            await supabaseClient
                .from('poll_votes')
                .update({ option_id: optionId, created_at: new Date().toISOString() })
                .eq('user_id', user.id)
                .eq('poll_id', pollId);
        } else {
            // New vote
            await supabaseClient.from('poll_votes').insert([{
                user_id: user.id,
                poll_id: pollId,
                option_id: optionId
            }]);
        }
        
        pollVotesCache.set(pollId, optionId);
        
        const pollCard = option.closest('.poll-card');
        await showPollResults(pollCard, pollId, optionId);
        
        showToast(existingVote ? 'Kura imebadilishwa!' : 'Kura yako imepokelewa!', 'success');
    } catch (e) {
        console.error('Vote error:', e);
        showToast('Imeshindikana kupiga kura', 'error');
    }
}

// ============================================
// SETUP FEED EVENTS
// ============================================
function setupFeedEvents() {
    // Like buttons
    document.querySelectorAll('.post-like-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            togglePostLike(this);
        });
    });
    
    // Comment buttons
    document.querySelectorAll('.post-comment-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            showCommentsComingSoon();
        });
    });
    
    // Share buttons
    document.querySelectorAll('.post-share-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const type = this.getAttribute('data-content-type');
            const id = this.getAttribute('data-content-id');
            const title = this.getAttribute('data-title');
            sharePost(this, type, id, title);
        });
    });
    
    // Download buttons
    document.querySelectorAll('.post-download-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const type = this.getAttribute('data-content-type');
            const id = this.getAttribute('data-content-id');
            const url = this.getAttribute('data-url');
            showDownloadOptions(this, type, id, url);
        });
    });
    
    // Video play
    document.querySelectorAll('.post-video-container').forEach(container => {
        container.addEventListener('click', function() {
            playVideo(this);
        });
    });
    
    // Music buttons
    document.querySelectorAll('.post-music-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleMusic(this);
        });
    });
    
    // Carousel dots
    document.querySelectorAll('.post-carousel').forEach(carousel => {
        carousel.addEventListener('scroll', function() {
            updateCarouselDots(this);
        });
    });
    
    // Poll options
    document.querySelectorAll('.poll-option').forEach(option => {
        option.addEventListener('click', function() {
            // Check kama disabled
            if (this.classList.contains('disabled')) return;
            votePoll(this);
        });
    });
}

// ============================================
// TOGGLE POST LIKE
// ============================================
async function togglePostLike(btn) {
    const user = getCurrentUser();
    if (!user) return;
    
    const contentType = btn.getAttribute('data-content-type');
    const contentId = btn.getAttribute('data-content-id');
    
    try {
        const { data: existing } = await supabaseClient
            .from('content_likes')
            .select('id')
            .eq('user_id', user.id)
            .eq('content_type', contentType)
            .eq('content_id', contentId)
            .maybeSingle();
        
        if (existing) {
            await supabaseClient.from('content_likes').delete().eq('id', existing.id);
            btn.classList.remove('liked');
            btn.querySelector('i').className = 'far fa-heart';
        } else {
            await supabaseClient.from('content_likes').insert([{
                user_id: user.id,
                content_type: contentType,
                content_id: contentId
            }]);
            btn.classList.add('liked');
            btn.querySelector('i').className = 'fas fa-heart';
        }
        
        // Update count
        const { count } = await supabaseClient
            .from('content_likes')
            .select('*', { count: 'exact', head: true })
            .eq('content_type', contentType)
            .eq('content_id', contentId);
        
        const countEl = btn.querySelector('.like-count');
        if (countEl) countEl.textContent = count || 0;
    } catch (e) {
        console.error('Like error:', e);
    }
}

// ============================================
// SHOW COMMENTS COMING SOON
// ============================================
function showCommentsComingSoon() {
    // Redirect kwenye chat.html (Coming Soon page)
    window.location.href = 'chat.html';
}

// ============================================
// SHARE POST
// ============================================
async function sharePost(btn, contentType, contentId, title) {
    const user = getCurrentUser();
    if (!user) return;
    
    try {
        const baseUrl = homeSettings.share_link || window.location.origin;
        const pagePath = homeSettings.share_page_path || '/share.html';
        const shareUrl = `${baseUrl}${pagePath}?type=${contentType}&id=${contentId}`;
        
        // Log share
        await supabaseClient.from('content_shares').insert([{
            user_id: user.id,
            content_type: contentType,
            content_id: contentId
        }]);
        
        // Update count
        const { count } = await supabaseClient
            .from('content_shares')
            .select('*', { count: 'exact', head: true })
            .eq('content_type', contentType)
            .eq('content_id', contentId);
        
        const countEl = btn.querySelector('.share-count');
        if (countEl) countEl.textContent = count || 0;
        
        // Show share options
        showShareOptions(shareUrl, title);
    } catch (e) {
        console.error('Share error:', e);
    }
}

// ============================================
// SHOW SHARE OPTIONS
// ============================================
function showShareOptions(shareUrl, title) {
    const existing = document.getElementById('shareOptionsModal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'shareOptionsModal';
    modal.className = 'share-modal';
    modal.innerHTML = `
        <div class="share-modal-content">
            <div class="share-modal-header">
                <h3>Share kwa</h3>
                <button class="share-modal-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="share-options-grid">
                <a href="https://wa.me/?text=${encodeURIComponent(title + ' - ' + shareUrl)}" target="_blank" class="share-option whatsapp">
                    <i class="fab fa-whatsapp"></i>
                    <span>WhatsApp</span>
                </a>
                <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}" target="_blank" class="share-option facebook">
                    <i class="fab fa-facebook"></i>
                    <span>Facebook</span>
                </a>
                <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}" target="_blank" class="share-option twitter">
                    <i class="fab fa-twitter"></i>
                    <span>Twitter</span>
                </a>
                <a href="https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}" target="_blank" class="share-option telegram">
                    <i class="fab fa-telegram"></i>
                    <span>Telegram</span>
                </a>
                <button class="share-option copy">
                    <i class="fas fa-link"></i>
                    <span>Copy Link</span>
                </button>
            </div>
            
            <div class="share-url-preview">
                <input type="text" value="${shareUrl}" readonly onclick="this.select()">
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('.share-modal-close').onclick = () => modal.remove();
    modal.querySelector('.copy').onclick = () => {
        navigator.clipboard.writeText(shareUrl).then(() => {
            showToast('Link imecopywa!', 'success');
            modal.remove();
        });
    };
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.remove();
    });
}

// ============================================
// SHOW DOWNLOAD OPTIONS
// ============================================
function showDownloadOptions(btn, contentType, contentId, url) {
    const existing = document.getElementById('downloadOptionsModal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'downloadOptionsModal';
    modal.className = 'share-modal';
    modal.innerHTML = `
        <div class="share-modal-content">
            <div class="share-modal-header">
                <h3>Download</h3>
                <button class="share-modal-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <button class="share-option" id="downloadMediaBtn" style="padding: 20px 12px;">
                    <i class="fas fa-file-download" style="color: #d4af37;"></i>
                    <span>Media File</span>
                </button>
                <button class="share-option" id="downloadCoverBtn" style="padding: 20px 12px;">
                    <i class="fas fa-image" style="color: #10b981;"></i>
                    <span>Cover Art</span>
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('.share-modal-close').onclick = () => modal.remove();
    
    modal.querySelector('#downloadMediaBtn').onclick = async () => {
        modal.remove();
        await downloadMedia(btn, contentType, contentId, url);
    };
    
    modal.querySelector('#downloadCoverBtn').onclick = async () => {
        modal.remove();
        await downloadCoverArt(btn, contentType, contentId, url);
    };
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.remove();
    });
}

// ============================================
// DOWNLOAD MEDIA
// ============================================
async function downloadMedia(btn, contentType, contentId, url) {
    if (!url) {
        showToast('Hakuna file ya download', 'warning');
        return;
    }
    
    const user = getCurrentUser();
    if (!user) return;
    
    try {
        showToast('Download inaanza...', 'info');
        
        // Log download
        await supabaseClient.from('content_downloads').insert([{
            user_id: user.id,
            content_type: contentType,
            content_id: contentId
        }]);
        
        // Update count
        const { count } = await supabaseClient
            .from('content_downloads')
            .select('*', { count: 'exact', head: true })
            .eq('content_type', contentType)
            .eq('content_id', contentId);
        
        const countEl = btn.querySelector('.download-count');
        if (countEl) countEl.textContent = count || 0;
        
        // Download file
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `KMCA-${contentType}-${Date.now()}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        
        showToast('Download imekamilika!', 'success');
    } catch (e) {
        console.error('Download error:', e);
        showToast('Imeshindikana ku-download', 'error');
    }
}

// ============================================
// DOWNLOAD COVER ART
// ============================================
async function downloadCoverArt(btn, contentType, contentId, url) {
    const user = getCurrentUser();
    if (!user) return;
    
    try {
        showToast('Inaandaa cover...', 'info');
        
        // Log download
        await supabaseClient.from('content_downloads').insert([{
            user_id: user.id,
            content_type: contentType,
            content_id: contentId
        }]);
        
        // Update count
        const { count } = await supabaseClient
            .from('content_downloads')
            .select('*', { count: 'exact', head: true })
            .eq('content_type', contentType)
            .eq('content_id', contentId);
        
        const countEl = btn.querySelector('.download-count');
        if (countEl) countEl.textContent = count || 0;
        
        // Generate cover art kwa canvas
        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1080;
        
        const ctx = canvas.getContext('2d');
        
        // Background
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Load image kama ipo
        if (url) {
            try {
                const img = await loadImage(url);
                const imgSize = 800;
                const imgX = (canvas.width - imgSize) / 2;
                const imgY = (canvas.height - imgSize) / 2 - 100;
                
                ctx.drawImage(img, imgX, imgY, imgSize, imgSize);
            } catch (e) {}
        }
        
        // Watermark
        ctx.fillStyle = 'rgba(212, 175, 55, 0.9)';
        ctx.font = 'bold 28px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Kwaya ya Mtakatifu Carlo Acutis', canvas.width / 2, canvas.height - 100);
        ctx.fillStyle = '#d4af37';
        ctx.font = 'bold 42px -apple-system, sans-serif';
        ctx.fillText('KMCA', canvas.width / 2, canvas.height - 50);
        
        // Download
        canvas.toBlob(function(blob) {
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `KMCA-Cover-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
            
            showToast('Cover imedownloadwa!', 'success');
        }, 'image/png');
    } catch (e) {
        console.error('Cover error:', e);
        showToast('Imeshindikana', 'error');
    }
}

// ============================================
// LOAD IMAGE HELPER
// ============================================
function loadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
    });
}

// ============================================
// PLAY VIDEO (Single play)
// ============================================
function playVideo(container) {
    const videoId = container.getAttribute('data-video-id');
    const src = container.getAttribute('data-src');
    const isLive = container.getAttribute('data-live') === 'true';
    
    // Stop active video
    if (activeVideo && activeVideo.parentElement !== container) {
        stopActiveVideo();
    }
    
    // Stop active audio
    if (activeAudio) stopActiveAudio();
    
    // Create video element
    const video = document.createElement('video');
    video.src = src;
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    video.className = 'post-video-active';
    video.style.width = '100%';
    video.style.display = 'block';
    video.style.maxHeight = '600px';
    
    // Clear container
    const overlay = container.querySelector('.post-video-overlay');
    const thumbnail = container.querySelector('.post-video-thumbnail');
    const skeleton = container.querySelector('.video-thumbnail-skeleton');
    
    if (overlay) overlay.remove();
    if (thumbnail) thumbnail.remove();
    if (skeleton) skeleton.remove();
    
    container.appendChild(video);
    activeVideo = video;
    
    // Track view kwa live/fake live
    if (isLive !== null) {
        trackLiveView(videoId);
    }
}

// ============================================
// STOP ACTIVE VIDEO
// ============================================
function stopActiveVideo() {
    if (activeVideo) {
        activeVideo.pause();
        activeVideo.remove();
        activeVideo = null;
    }
}

// ============================================
// TOGGLE MUSIC
// ============================================
function toggleMusic(btn) {
    const audioId = btn.getAttribute('data-audio-id');
    const audio = document.querySelector(`audio[data-audio-id="${audioId}"]`);
    
    if (!audio) return;
    
    const isMuted = btn.getAttribute('data-muted') === 'true';
    
    if (isMuted) {
        // Unmute
        if (activeVideo) stopActiveVideo();
        if (activeAudio && activeAudio !== audio) stopActiveAudio();
        
        audio.play();
        btn.setAttribute('data-muted', 'false');
        btn.querySelector('i').className = 'fas fa-volume-up';
        btn.classList.remove('muted');
        activeAudio = audio;
    } else {
        // Mute
        audio.pause();
        btn.setAttribute('data-muted', 'true');
        btn.querySelector('i').className = 'fas fa-volume-mute';
        btn.classList.add('muted');
        activeAudio = null;
    }
}

// ============================================
// STOP ACTIVE AUDIO
// ============================================
function stopActiveAudio() {
    if (activeAudio) {
        activeAudio.pause();
        activeAudio = null;
    }
    
    document.querySelectorAll('.post-music-btn').forEach(btn => {
        btn.setAttribute('data-muted', 'true');
        btn.querySelector('i').className = 'fas fa-volume-mute';
        btn.classList.add('muted');
    });
}

// ============================================
// UPDATE CAROUSEL DOTS
// ============================================
function updateCarouselDots(carousel) {
    const slideWidth = carousel.clientWidth;
    const scrollLeft = carousel.scrollLeft;
    const activeIndex = Math.round(scrollLeft / slideWidth);
    
    const dots = carousel.parentElement.querySelectorAll('.carousel-dot');
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === activeIndex);
    });
}

// ============================================
// TRACK LIVE VIEW (unique + total)
// ============================================
async function trackLiveView(postId) {
    const user = getCurrentUser();
    if (!user) return;
    
    const key = `live-${postId}`;
    
    try {
        // Check kama user amesha-view
        if (!viewedPosts.has(key)) {
            viewedPosts.add(key);
            
            // Insert kwenye content_views (unique)
            const { error } = await supabaseClient
                .from('content_views')
                .insert([{
                    user_id: user.id,
                    content_type: 'live',
                    content_id: postId
                }]);
            
            // Ignore duplicate
            if (error && !error.message.includes('duplicate')) {
                console.error('Track view error:', error);
            }
            
            // Increment total count kwenye posts
            try {
                await supabaseClient.rpc('increment_post_viewer_count', {
                    post_id: postId
                });
            } catch (e) {
                // RPC inaweza isiwepo, tumia fallback
                const { data: post } = await supabaseClient
                    .from('posts')
                    .select('viewer_count')
                    .eq('id', postId)
                    .single();
                
                if (post) {
                    await supabaseClient
                        .from('posts')
                        .update({ viewer_count: (post.viewer_count || 0) + 1 })
                        .eq('id', postId);
                }
            }
        }
        
        // Update view count kwenye UI
        const viewEl = document.querySelector(`#view-count-${postId} .view-num`);
        if (viewEl) {
            const { count } = await supabaseClient
                .from('content_views')
                .select('*', { count: 'exact', head: true })
                .eq('content_type', 'live')
                .eq('content_id', postId);
            
            viewEl.textContent = count || 0;
        }
    } catch (e) {
        console.error('Track view error:', e);
    }
}

// ============================================
// TRACK PAGE VIEW
// ============================================
async function trackPageView() {
    const user = getCurrentUser();
    if (!user) return;
    
    try {
        await supabaseClient.from('user_activities').insert([{
            user_id: user.id,
            activity_type: 'view_home',
            activity_details: 'Viewed home page'
        }]);
    } catch (e) {}
}

// ============================================
// UPDATE CHAT BADGE
// ============================================
async function updateChatBadge() {
    const user = getCurrentUser();
    if (!user) return;
    
    try {
        const { count } = await supabaseClient
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('to_user_id', user.id)
            .eq('is_read', false);
        
        updateBadge('chatBadge', count || 0);
    } catch (e) {}
}

// ============================================
// UPDATE NOTIFICATION BADGE
// ============================================
async function updateNotificationBadge() {
    const user = getCurrentUser();
    if (!user) return;
    
    try {
        const { count } = await supabaseClient
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_read', false)
            .eq('is_deleted', false);
        
        updateBadge('notificationBadge', count || 0);
    } catch (e) {}
}

// ============================================
// UPDATE BADGE
// ============================================
function updateBadge(badgeId, count) {
    const badge = document.getElementById(badgeId);
    if (!badge) return;
    
    if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

// ============================================
// SETUP REALTIME LISTENERS
// ============================================
function setupRealtimeListeners() {
    const user = getCurrentUser();
    if (!user) return;
    
    // Chat messages
    if (chatSubscription) chatSubscription.unsubscribe();
    
    chatSubscription = supabaseClient
        .channel('home-chat-badge')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `to_user_id=eq.${user.id}`
        }, () => {
            updateChatBadge();
        })
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: `to_user_id=eq.${user.id}`
        }, () => {
            updateChatBadge();
        })
        .subscribe();
    
    // Notifications
    if (notificationSubscription) notificationSubscription.unsubscribe();
    
    notificationSubscription = supabaseClient
        .channel('home-notification-badge')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
        }, () => {
            updateNotificationBadge();
            showToast('🔔 Notification mpya!', 'info');
        })
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
        }, () => {
            updateNotificationBadge();
        })
        .subscribe();
}

// ============================================
// SETUP SCROLL LISTENER
// ============================================
function setupScrollListener() {
    let scrollTimeout;
    
    window.addEventListener('scroll', function() {
        clearTimeout(scrollTimeout);
        
        scrollTimeout = setTimeout(() => {
            if (document.hidden) return;
            
            // Auto-pause videos zilizo nje ya view
            document.querySelectorAll('.post-video-active').forEach(video => {
                const rect = video.getBoundingClientRect();
                const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
                
                if (!isVisible && !video.paused) {
                    video.pause();
                }
            });
            
            // Auto-pause audios zilizo nje ya view
            document.querySelectorAll('.post-audio').forEach(audio => {
                const rect = audio.getBoundingClientRect();
                const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
                
                if (!isVisible && !audio.paused) {
                    audio.pause();
                    
                    const btn = document.querySelector(`.post-music-btn[data-audio-id="${audio.getAttribute('data-audio-id')}"]`);
                    if (btn) {
                        btn.setAttribute('data-muted', 'true');
                        btn.querySelector('i').className = 'fas fa-volume-mute';
                        btn.classList.add('muted');
                    }
                    
                    if (activeAudio === audio) activeAudio = null;
                }
            });
        }, 150);
    });
}

// ============================================
// SETUP VISIBILITY LISTENER
// ============================================
function setupVisibilityListener() {
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            // Pause all media
            document.querySelectorAll('.post-video-active').forEach(v => v.pause());
            document.querySelectorAll('.post-audio').forEach(a => a.pause());
            
            document.querySelectorAll('.post-music-btn').forEach(btn => {
                btn.setAttribute('data-muted', 'true');
                btn.querySelector('i').className = 'fas fa-volume-mute';
                btn.classList.add('muted');
            });
            
            activeAudio = null;
        }
    });
}

// ============================================
// LOAD FOOTER
// ============================================
async function loadHomeFooter() {
    try {
        const { data } = await supabaseClient
            .from('footer')
            .select('*')
            .limit(1)
            .maybeSingle();
        
        const footer = document.getElementById('userFooter');
        if (!footer) return;
        
        if (data) {
            footer.innerHTML = `
                <div class="footer-content">
                    ${data.mawasiliano ? `<p>${escapeHtml(data.mawasiliano)}</p>` : ''}
                    ${data.email ? `<p>📧 ${escapeHtml(data.email)}</p>` : ''}
                    ${data.phone ? `<p>📞 ${escapeHtml(data.phone)}</p>` : ''}
                    <p class="copyright">${escapeHtml(data.copyright || '© 2026 KMCA - Kwaya ya Vijana Mtakatifu Carlo Acutis')}</p>
                </div>
            `;
        } else {
            footer.innerHTML = `
                <div class="footer-content">
                    <p class="copyright">© 2026 KMCA - Kwaya ya Vijana Mtakatifu Carlo Acutis</p>
                </div>
            `;
        }
    } catch (e) {}
}

// ============================================
// HELPERS
// ============================================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeAttr(text) {
    if (!text) return '';
    return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function getTimeAgo(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Sasa hivi';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h';
    if (seconds < 604800) return Math.floor(seconds / 86400) + 'd';
    
    return date.toLocaleDateString('sw-TZ', { day: 'numeric', month: 'short' });
}

// ============================================
// CSS INJECTION FOR HOME.JS
// ============================================
(function injectHomeStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* Skeleton Loading */
        .skeleton {
            background: linear-gradient(
                90deg,
                var(--bg-input) 25%,
                var(--bg-card) 50%,
                var(--bg-input) 75%
            );
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            border-radius: 6px;
        }
        
        @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
        }
        
        .skeleton-circle { border-radius: 50%; }
        .skeleton-text { border-radius: 4px; }
        .skeleton-button { border-radius: 8px; }
        .skeleton-image { border-radius: 12px; }
        
        .post-skeleton {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 16px;
            margin-bottom: 16px;
        }
        
        .skeleton-header {
            display: flex;
            gap: 12px;
            margin-bottom: 16px;
        }
        
        .skeleton-footer {
            display: flex;
            gap: 12px;
            justify-content: space-around;
            margin-top: 16px;
            padding-top: 12px;
            border-top: 1px solid var(--border);
        }
        
        /* Empty State */
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: var(--text-muted);
        }
        
        .empty-state i {
            font-size: 64px;
            color: var(--border);
            margin-bottom: 16px;
            display: block;
        }
        
        .btn-retry {
            margin-top: 16px;
            padding: 12px 24px;
            background: var(--primary);
            color: var(--bg-dark);
            border: none;
            border-radius: 8px;
            font-weight: 700;
            cursor: pointer;
        }
        
        /* Post Content - 3 styles */
        .post-content {
            padding: 0 16px 16px;
            font-size: 15px;
            color: var(--text-light);
            line-height: 1.7;
            white-space: pre-wrap;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }
        
        .post-content-gradient {
            background: linear-gradient(135deg, #d4af37, #b8962e, #8b6914);
            color: white;
            padding: 24px;
            margin: 0 16px 16px;
            border-radius: 16px;
            font-size: 18px;
            font-weight: 700;
            text-align: center;
            box-shadow: 0 8px 20px rgba(212, 175, 55, 0.3);
            line-height: 1.6;
        }
        
        .post-content-quote {
            background: var(--bg-input);
            padding: 20px;
            margin: 0 16px 16px;
            border-radius: 12px;
            border-left: 4px solid var(--primary);
            font-style: italic;
            font-size: 16px;
            position: relative;
        }
        
        .post-content-quote::before {
            content: '"';
            position: absolute;
            top: -10px;
            left: 12px;
            font-size: 60px;
            color: var(--primary);
            opacity: 0.3;
            font-family: Georgia, serif;
            line-height: 1;
        }
        
        /* Matukio Design */
        .matukio-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 16px;
            margin-bottom: 16px;
            overflow: hidden;
            cursor: pointer;
            transition: all 0.3s;
            animation: fadeInUp 0.4s ease-out;
        }
        
        .matukio-card:hover {
            transform: translateY(-2px);
            border-color: #f97316;
            box-shadow: 0 8px 24px rgba(249, 115, 22, 0.15);
        }
        
        .matukio-image {
            width: 100%;
            aspect-ratio: 16/9;
            background: var(--bg-input);
            overflow: hidden;
        }
        
        .matukio-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }
        
        .matukio-content {
            padding: 16px;
        }
        
        .matukio-title {
            font-size: 18px;
            font-weight: 800;
            color: var(--text-light);
            margin-bottom: 12px;
        }
        
        .matukio-detail-row {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 12px;
            background: var(--bg-input);
            border-radius: 8px;
            margin-bottom: 8px;
            font-size: 13px;
            color: var(--text-light);
        }
        
        .matukio-detail-row i {
            color: #f97316;
            font-size: 14px;
            width: 18px;
        }
        
        .matukio-description {
            font-size: 14px;
            color: var(--text-muted);
            margin-top: 12px;
            line-height: 1.6;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        
        .matukio-btn {
            width: 100%;
            margin-top: 16px;
            padding: 12px;
            background: linear-gradient(135deg, #f97316, #ea580c);
            color: white;
            border: none;
            border-radius: 10px;
            font-weight: 700;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .matukio-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(249, 115, 22, 0.3);
        }
        
        /* Poll Design */
        .poll-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 16px;
            margin-bottom: 16px;
            overflow: hidden;
            animation: fadeInUp 0.4s ease-out;
        }
        
        .poll-question {
            font-size: 16px;
            font-weight: 800;
            color: var(--text-light);
            padding: 0 16px 16px;
            line-height: 1.4;
        }
        
        .poll-options {
            padding: 0 16px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        
        .poll-option {
            background: var(--bg-input);
            border: 2px solid var(--border);
            border-radius: 12px;
            padding: 14px 16px;
            cursor: pointer;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            gap: 12px;
            position: relative;
            overflow: hidden;
        }
        
        .poll-option:hover:not(.disabled) {
            border-color: #f59e0b;
            transform: translateX(4px);
        }
        
        .poll-option.selected {
            border-color: var(--success);
            background: rgba(16, 185, 129, 0.08);
        }
        
        .poll-option.disabled {
            cursor: default;
        }
        
        .poll-option-radio {
            width: 20px;
            height: 20px;
            border: 2px solid var(--border);
            border-radius: 50%;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s;
            position: relative;
            z-index: 1;
        }
        
        .poll-option.selected .poll-option-radio {
            border-color: var(--success);
            background: var(--success);
        }
        
        .poll-option.selected .poll-option-radio::after {
            content: '✓';
            color: white;
            font-size: 12px;
            font-weight: 900;
        }
        
        .poll-option-text {
            flex: 1;
            font-size: 14px;
            font-weight: 600;
            color: var(--text-light);
            position: relative;
            z-index: 1;
        }
        
        .poll-option-percent {
            font-size: 13px;
            font-weight: 800;
            color: var(--primary);
            position: relative;
            z-index: 1;
        }
        
        .poll-option-bar {
            position: absolute;
            top: 0;
            left: 0;
            bottom: 0;
            background: rgba(212, 175, 55, 0.15);
            transition: width 0.6s ease-out;
            border-radius: 12px;
            z-index: 0;
        }
        
        .poll-option-bar.user-vote {
            background: rgba(16, 185, 129, 0.2);
        }
        
        .poll-option-count {
            position: absolute;
            bottom: 4px;
            right: 12px;
            font-size: 11px;
            color: var(--text-muted);
            z-index: 1;
        }
        
        .poll-change-btn {
            position: absolute;
            top: 8px;
            right: 8px;
            padding: 4px 8px;
            background: var(--primary);
            color: var(--bg-dark);
            border: none;
            border-radius: 6px;
            font-size: 10px;
            font-weight: 700;
            cursor: pointer;
            z-index: 2;
        }
        
        .poll-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            margin-top: 12px;
            border-top: 1px solid var(--border);
        }
        
        .poll-total {
            font-size: 13px;
            color: var(--text-muted);
            font-weight: 600;
        }
        
        .poll-voted-badge {
            background: rgba(16, 185, 129, 0.15);
            color: var(--success);
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 4px;
        }
        
        /* Video Thumbnail */
        .video-thumbnail-skeleton {
            width: 100%;
            aspect-ratio: 16/9;
            background: linear-gradient(
                90deg,
                var(--bg-input) 25%,
                var(--bg-card) 50%,
                var(--bg-input) 75%
            );
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .post-video-thumbnail {
            width: 100%;
            display: block;
            max-height: 600px;
            object-fit: cover;
        }
        
        .post-video-active {
            width: 100%;
            display: block;
            max-height: 600px;
            background: #000;
        }
        
        .post-video-overlay {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 70px;
            height: 70px;
            background: rgba(212, 175, 55, 0.95);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            color: var(--bg-dark);
            pointer-events: none;
            animation: playPulse 2s infinite;
            z-index: 2;
        }
        
        /* View Count */
        .post-view-count {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 12px;
            color: var(--text-muted);
            padding: 4px 10px;
            background: var(--bg-input);
            border-radius: 10px;
        }
        
        .post-view-count i {
            color: #ef4444;
        }
        
        .post-view-count .view-num {
            font-weight: 700;
            color: var(--text-light);
        }
        
        /* Fade in animation */
        .post-card, .matukio-card, .poll-card {
            animation: fadeInUp 0.4s ease-out;
        }
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(15px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        /* Share Modal */
        .share-modal {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.85);
            z-index: 5000;
            display: flex;
            align-items: flex-end;
            justify-content: center;
            backdrop-filter: blur(8px);
            animation: fadeIn 0.2s;
        }
        
        .share-modal-content {
            background: var(--bg-card);
            border-radius: 20px 20px 0 0;
            width: 100%;
            max-width: 500px;
            padding: 24px 20px;
            animation: slideUpModal 0.3s ease-out;
        }
        
        .share-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        
        .share-modal-header h3 {
            font-size: 18px;
            font-weight: 800;
            color: var(--text-light);
        }
        
        .share-modal-close {
            width: 36px;
            height: 36px;
            background: var(--bg-input);
            border: none;
            border-radius: 50%;
            color: var(--text-muted);
            cursor: pointer;
            font-size: 16px;
        }
        
        .share-options-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin-bottom: 20px;
        }
        
        .share-option {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            padding: 16px 8px;
            background: var(--bg-input);
            border-radius: 12px;
            border: none;
            color: var(--text-light);
            text-decoration: none;
            cursor: pointer;
            transition: all 0.3s;
            font-family: inherit;
        }
        
        .share-option:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 20px rgba(0,0,0,0.3);
        }
        
        .share-option i { font-size: 28px; }
        .share-option span { font-size: 12px; font-weight: 600; }
        
        .share-option.whatsapp i { color: #25D366; }
        .share-option.facebook i { color: #1877F2; }
        .share-option.twitter i { color: #1DA1F2; }
        .share-option.telegram i { color: #0088cc; }
        .share-option.copy i { color: var(--primary); }
        
        .share-url-preview input {
            width: 100%;
            background: var(--bg-input);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 12px;
            color: var(--text-muted);
            font-size: 12px;
            outline: none;
        }
        
        @keyframes slideUpModal {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
    `;
    document.head.appendChild(style);
})();