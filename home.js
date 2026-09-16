// ============================================
// KMCA USER PANEL - HOME.JS v8.0 PRO
// Clean version — bila buttons za ziada
// Systems: Like + Share + Comments + Download
// ============================================

// ============================================================
// SECTION 1: STATE
// ============================================================
let kmcaHomeSettings = {};
let kmcaActiveVideo = null;
let kmcaActiveAudio = null;
let kmcaViewedPosts = new Set();
let kmcaVideoThumbCache = new Map();
let kmcaHomeChatSub = null;
let kmcaHomeNotificationSub = null;
let kmcaPollVotesCache = new Map();
let kmcaCommentsCache = {};
let kmcaCurrentCommentType = null;
let kmcaCurrentCommentContentId = null;
let kmcaPollTimers = new Map();

// Like System
let kmcaUserReactions = new Map();
let kmcaReactionsCache = new Map();

// Comments System
let kmcaCommentSortMode = 'newest';
let kmcaReplyingTo = null;

// ============================================================
// SECTION 2: INITIALIZE
// ============================================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🏠 Home v8.0 PRO - Initializing');
    
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    
    kmcaHomeSettings = await kmcaLoadSettings();
    
    await kmcaLoadFeed();
    await kmcaLoadFooter();
    
    kmcaSetupScrollListener();
    kmcaSetupVisibilityListener();
    kmcaSetupRealtimeListeners();
    
    kmcaTrackPageView();
    kmcaUpdateChatBadge();
    kmcaUpdateNotificationBadge();
});

// ============================================================
// SECTION 3: LOAD SETTINGS
// ============================================================
async function kmcaLoadSettings() {
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
        console.error('Settings error:', e);
        return {};
    }
}

// ============================================================
// SECTION 4: LOAD FEED
// ============================================================
async function kmcaLoadFeed() {
    const container = document.getElementById('mainContent');
    const startTime = Date.now();
    const MAX_LOADING = 2000;
    
    kmcaShowSkeleton(container);
    
    try {
        const today = new Date().toISOString().split('T')[0];
        
        const [dailyCards, matukio, polls, posts] = await Promise.all([
            kmcaLoadDailyCards(today),
            kmcaLoadMatukio(today),
            kmcaLoadPolls(today),
            kmcaLoadPosts()
        ]);
        
        const elapsed = Date.now() - startTime;
        if (elapsed < MAX_LOADING) {
            await new Promise(r => setTimeout(r, MAX_LOADING - elapsed));
        }
        
        let html = '';
        
        if (dailyCards.length > 0) {
            html += kmcaRenderStories(dailyCards);
        }
        
        if (dailyCards.length > 0) {
            html += `
                <div class="daily-cards-section">
                    <div class="section-title">
                        <i class="fas fa-star"></i> Leo
                    </div>
                    <div class="daily-cards-scroll">
                        ${dailyCards.map(c => kmcaRenderDailyCard(c)).join('')}
                    </div>
                </div>
            `;
        }
        
        if (matukio.length > 0) {
            html += `
                <div class="matukio-section">
                    <div class="section-title">
                        <i class="fas fa-calendar-alt"></i> Matukio (${matukio.length})
                    </div>
                    ${matukio.map(m => kmcaRenderMatukio(m)).join('')}
                </div>
            `;
        }
        
        if (polls.length > 0) {
            html += `
                <div class="polls-section">
                    <div class="section-title">
                        <i class="fas fa-vote-yea"></i> Polls (${polls.length})
                    </div>
                    ${polls.map(p => kmcaRenderPoll(p)).join('')}
                </div>
            `;
        }
        
        if (posts.length > 0) {
            html += `
                <div class="posts-section">
                    <div class="section-header-posts">
                        <i class="fas fa-newspaper"></i> Posts
                    </div>
                    ${posts.map(p => kmcaRenderPost(p)).join('')}
                </div>
            `;
        }
        
        if (html === '') {
            html = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>Hakuna kitu bado</p>
                    <p style="font-size: 13px; margin-top: 8px;">Endelea kufuata kwaya yetu!</p>
                </div>
            `;
        }
        
        container.style.opacity = '0';
        setTimeout(() => {
            container.innerHTML = html;
            container.style.transition = 'opacity 0.3s ease-out';
            container.style.opacity = '1';
            
            kmcaSetupFeedEvents();
            kmcaLoadAllCounts();
            kmcaLoadUserLikes();
            kmcaLoadUserPollVotes();
            kmcaGenerateAllVideoThumbnails();
            kmcaStartPollCountdowns();
            kmcaStartMatukioCountdowns();
        }, 50);
        
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

// ============================================================
// SECTION 5: SKELETON
// ============================================================
function kmcaShowSkeleton(container) {
    container.innerHTML = `
        <div class="stories-bar">
            <div class="stories-scroll">
                ${[1,2,3,4,5].map(() => `
                    <div class="story-item">
                        <div class="skeleton skeleton-circle" style="width: 66px; height: 66px;"></div>
                        <div class="skeleton skeleton-text" style="width: 50px; height: 10px;"></div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="daily-cards-section">
            <div class="section-title">
                <div class="skeleton skeleton-text" style="width: 80px; height: 14px;"></div>
            </div>
            <div class="daily-cards-scroll">
                ${[1,2,3].map(() => `
                    <div class="daily-card">
                        <div class="skeleton skeleton-circle" style="width: 56px; height: 56px; margin-bottom: 14px;"></div>
                        <div class="skeleton skeleton-text" style="width: 80%; height: 16px; margin-bottom: 8px;"></div>
                        <div class="skeleton skeleton-text" style="width: 60%; height: 12px; margin-bottom: 16px;"></div>
                        <div class="skeleton skeleton-button" style="width: 100px; height: 32px;"></div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        ${[1, 2].map(() => `
            <div class="post-skeleton">
                <div class="skeleton-header">
                    <div class="skeleton skeleton-circle" style="width: 44px; height: 44px;"></div>
                    <div style="flex: 1;">
                        <div class="skeleton skeleton-text" style="width: 40%; height: 14px; margin-bottom: 6px;"></div>
                        <div class="skeleton skeleton-text" style="width: 25%; height: 11px;"></div>
                    </div>
                </div>
                <div class="skeleton skeleton-text" style="width: 90%; height: 14px; margin-bottom: 8px;"></div>
                <div class="skeleton skeleton-image" style="width: 100%; height: 280px;"></div>
            </div>
        `).join('')}
    `;
}

// ============================================================
// SECTION 6: STORIES
// ============================================================
function kmcaRenderStories(cards) {
    if (!cards || cards.length === 0) return '';
    
    return `
        <div class="stories-bar">
            <div class="stories-scroll">
                ${cards.map(card => {
                    let iconHtml = '';
                    if (card.icon === 'image' && card.image) {
                        iconHtml = `<img src="${card.image}" alt="${kmcaEscape(card.title)}" onerror="this.parentElement.innerHTML='📌'">`;
                    } else if (card.icon === 'number') {
                        iconHtml = card.number;
                    } else {
                        iconHtml = card.icon || '📌';
                    }
                    
                    return `
                        <div class="story-item" onclick="window.location.href='${card.link}'">
                            <div class="story-circle">
                                <div class="story-inner">${iconHtml}</div>
                            </div>
                            <div class="story-label">${kmcaEscape(card.title.substring(0, 12))}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

// ============================================================
// SECTION 7: DAILY CARDS
// ============================================================
async function kmcaLoadDailyCards(today) {
    const cards = [];
    
    try {
        const { data } = await supabaseClient.from('watakatifu').select('*').eq('sikukuu', today).limit(1);
        if (data && data[0]) {
            cards.push({
                type: 'saint',
                icon: data[0].picha_file ? 'image' : '🕊️',
                image: data[0].picha_file,
                title: data[0].jina,
                subtitle: data[0].historia ? data[0].historia.substring(0, 60) + '...' : 'Mtakatifu wa Leo',
                buttonText: 'Soma Zaidi',
                buttonIcon: 'fa-book-open',
                link: `watakatifu.html?id=${data[0].id}`
            });
        }
    } catch (e) {}
    
    try {
        const { data } = await supabaseClient.from('nyimbo_za_siku').select('*').eq('tarehe', today).limit(1);
        if (data && data[0]) {
            cards.push({
                type: 'song',
                icon: '🎵',
                title: data[0].jina,
                subtitle: data[0].maelezo || 'Wimbo wa Siku',
                buttonText: 'Sikiliza',
                buttonIcon: 'fa-play',
                link: `wimbo.html?id=${data[0].id}`
            });
        }
    } catch (e) {}
    
    try {
        const todayDate = new Date(today);
        const dayOfWeek = todayDate.getDay();
        const daysToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
        const nextSunday = new Date(todayDate);
        nextSunday.setDate(todayDate.getDate() + daysToSunday);
        const sundayDate = nextSunday.toISOString().split('T')[0];
        
        const { data } = await supabaseClient.from('masomo_dominica').select('*').eq('tarehe_jumapili', sundayDate).limit(1);
        if (data && data[0]) {
            const jinaDominika = data[0].jina_dominika || '';
            const numberMatch = jinaDominika.match(/\d+/);
            const number = numberMatch ? numberMatch[0] : null;
            
            cards.push({
                type: 'masomo',
                icon: number ? 'number' : 'text',
                number: number,
                textIcon: number ? null : '📚',
                title: jinaDominika,
                subtitle: 'Masomo ya Dominica',
                buttonText: 'Soma',
                buttonIcon: 'fa-book-open',
                link: `masomo.html?id=${data[0].id}`
            });
        }
    } catch (e) {}
    
    try {
        const { data } = await supabaseClient.from('bible_verses').select('*').eq('tarehe', today).limit(1);
        if (data && data[0]) {
            cards.push({
                type: 'bible',
                icon: '📖',
                title: data[0].kichwa,
                subtitle: data[0].reference || 'Bible Verse',
                buttonText: 'Soma',
                buttonIcon: 'fa-book-reader',
                link: `bible.html?id=${data[0].id}`
            });
        }
    } catch (e) {}
    
    return cards;
}

function kmcaRenderDailyCard(card) {
    let iconHtml = '';
    
    if (card.icon === 'image' && card.image) {
        iconHtml = `<img src="${card.image}" alt="${kmcaEscape(card.title)}" onerror="this.parentElement.innerHTML='🕊️'">`;
    } else if (card.icon === 'number') {
        iconHtml = card.number;
    } else if (card.icon === 'text') {
        iconHtml = card.textIcon;
    } else {
        iconHtml = card.icon || '📌';
    }
    
    const isNumber = card.icon === 'number';
    
    return `
        <div class="daily-card ${card.type}" onclick="window.location.href='${card.link}'">
            <div class="daily-card-icon ${isNumber ? 'number-icon' : ''}">${iconHtml}</div>
            <div class="daily-card-title">${kmcaEscape(card.title)}</div>
            <div class="daily-card-subtitle">${kmcaEscape(card.subtitle)}</div>
            <button class="daily-card-btn">
                <i class="fas ${card.buttonIcon}"></i>
                ${card.buttonText}
            </button>
        </div>
    `;
}

// ============================================================
// SECTION 8: MATUKIO
// ============================================================
async function kmcaLoadMatukio(today) {
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

function kmcaRenderMatukio(m) {
    const logoHtml = kmcaHomeSettings.intro_logo
        ? `<img src="${kmcaHomeSettings.intro_logo}" alt="KMCA">`
        : '⛪';
    
    const tarehe = m.tarehe_tukio 
        ? new Date(m.tarehe_tukio).toLocaleDateString('sw-TZ', { 
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
        }) : '';
    
    const countdown = kmcaGetMatukioCountdown(m.tarehe_tukio);
    
    const imageHtml = m.picha_file 
        ? `<div class="matukio-image">
             <img src="${m.picha_file}" alt="${kmcaEscape(m.jina)}" loading="lazy" 
                  onerror="this.parentElement.style.display='none'">
           </div>`
        : '';
    
    return `
        <div class="matukio-card" data-matukio-id="${m.id}" data-tarehe="${m.tarehe_tukio || ''}">
            <div class="post-header">
                <div class="post-owner-logo">${logoHtml}</div>
                <div class="post-owner-info">
                    <div class="post-owner-name">
                        KMCA 
                        <i class="fas fa-check-circle verified-badge"></i>
                    </div>
                    <div class="post-owner-time">
                        📅 Tukio
                        ${countdown ? ` • <span style="color: var(--primary); font-weight: 700;">${countdown}</span>` : ''}
                    </div>
                </div>
            </div>
            
            ${imageHtml}
            
            <div class="matukio-content">
                <div class="matukio-title">🎉 ${kmcaEscape(m.jina)}</div>
                
                ${tarehe ? `
                    <div class="matukio-detail-row">
                        <i class="fas fa-calendar"></i>
                        <span>${tarehe}</span>
                    </div>
                ` : ''}
                
                ${m.muda ? `
                    <div class="matukio-detail-row">
                        <i class="fas fa-clock"></i>
                        <span>${kmcaEscape(m.muda)}</span>
                    </div>
                ` : ''}
                
                ${m.mahali ? `
                    <div class="matukio-detail-row">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${kmcaEscape(m.mahali)}</span>
                    </div>
                ` : ''}
                
                ${m.maelezo ? `
                    <div class="matukio-description">${kmcaEscape(m.maelezo)}</div>
                ` : ''}
                
                <div class="matukio-actions" style="display: flex; gap: 8px; margin-top: 16px;">
                    <button class="matukio-btn" style="flex: 1;" onclick="kmcaViewMatukio(${m.id})">
                        <i class="fas fa-eye"></i> Details
                    </button>
                    <button class="matukio-btn-share" onclick="kmcaShareMatukio(${m.id}, '${kmcaEscapeAttr(m.jina)}')" 
                            style="background: var(--bg-input); color: var(--text-light); border: 1px solid var(--border); padding: 12px 16px; border-radius: 10px; cursor: pointer; font-weight: 700; display: flex; align-items: center; gap: 6px;">
                        <i class="fas fa-share"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function kmcaGetMatukioCountdown(tareheTukio) {
    if (!tareheTukio) return '';
    
    try {
        const eventDate = new Date(tareheTukio + 'T00:00:00');
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        
        const diff = eventDate - now;
        const days = Math.round(diff / (1000 * 60 * 60 * 24));
        
        if (days < 0) return 'Iliyopita';
        if (days === 0) return '🔥 Leo!';
        if (days === 1) return '⏰ Kesho';
        if (days <= 7) return `Siku ${days}`;
        return '';
    } catch (e) {
        return '';
    }
}

function kmcaStartMatukioCountdowns() {
    setInterval(() => {
        document.querySelectorAll('.matukio-card[data-tarehe]').forEach(card => {
            const tarehe = card.getAttribute('data-tarehe');
            if (!tarehe) return;
            
            const countdown = kmcaGetMatukioCountdown(tarehe);
            const timeEl = card.querySelector('.post-owner-time');
            
            if (timeEl && countdown) {
                timeEl.innerHTML = `📅 Tukio • <span style="color: var(--primary); font-weight: 700;">${countdown}</span>`;
            }
        });
    }, 60000);
}

function kmcaViewMatukio(id) {
    window.location.href = `matukio.html?id=${id}`;
}

function kmcaShareMatukio(id, title) {
    const url = `${window.location.origin}/matukio.html?id=${id}`;
    kmcaShowShareModal(url, `Tukio: ${title}`);
}

// ============================================================
// SECTION 9: POLLS
// ============================================================
async function kmcaLoadPolls(today) {
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

function kmcaRenderPoll(poll) {
    const logoHtml = kmcaHomeSettings.intro_logo
        ? `<img src="${kmcaHomeSettings.intro_logo}" alt="KMCA">`
        : '⛪';
    
    const options = poll.poll_options || [];
    const countdown = kmcaGetPollCountdown(poll.tarehe_delete);
    
    return `
        <div class="poll-card" data-poll-id="${poll.id}" data-delete="${poll.tarehe_delete || ''}">
            <div class="post-header">
                <div class="post-owner-logo">${logoHtml}</div>
                <div class="post-owner-info">
                    <div class="post-owner-name">
                        KMCA 
                        <i class="fas fa-check-circle verified-badge"></i>
                    </div>
                    <div class="post-owner-time">
                        🗳️ Poll
                        ${countdown ? ` • <span style="color: var(--warning); font-weight: 700;">${countdown}</span>` : ''}
                    </div>
                </div>
            </div>
            
            <div class="poll-question">${kmcaEscape(poll.swali)}</div>
            
            <div class="poll-options" id="poll-options-${poll.id}">
                ${options.map(opt => `
                    <div class="poll-option" data-option-id="${opt.id}" data-poll-id="${poll.id}">
                        <div class="poll-option-radio"></div>
                        <div class="poll-option-text">${kmcaEscape(opt.chaguo)}</div>
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
                <button class="poll-share-btn" onclick="kmcaSharePoll('${poll.id}', '${kmcaEscapeAttr(poll.swali)}')"
                        style="background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; font-size: 14px;"
                        title="Share poll">
                    <i class="fas fa-share"></i>
                </button>
            </div>
        </div>
    `;
}

function kmcaGetPollCountdown(tareheDelete) {
    if (!tareheDelete) return '';
    
    try {
        const endDate = new Date(tareheDelete + 'T23:59:59');
        const now = new Date();
        
        const diff = endDate - now;
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        const hours = Math.ceil(diff / (1000 * 60 * 60));
        
        if (diff < 0) return 'Imeisha';
        if (hours < 1) return '⏰ < 1h';
        if (hours < 24) return `⏰ ${hours}h`;
        if (days === 1) return '⏰ Siku 1';
        return `⏰ Siku ${days}`;
    } catch (e) {
        return '';
    }
}

function kmcaStartPollCountdowns() {
    kmcaPollTimers.forEach(timer => clearInterval(timer));
    kmcaPollTimers.clear();
    
    const timer = setInterval(() => {
        document.querySelectorAll('.poll-card[data-delete]').forEach(card => {
            const tarehe = card.getAttribute('data-delete');
            if (!tarehe) return;
            
            const countdown = kmcaGetPollCountdown(tarehe);
            const timeEl = card.querySelector('.post-owner-time');
            
            if (timeEl) {
                timeEl.innerHTML = `🗳️ Poll • <span style="color: var(--warning); font-weight: 700;">${countdown}</span>`;
            }
        });
    }, 60000);
    
    kmcaPollTimers.set('countdown', timer);
}

function kmcaSharePoll(pollId, question) {
    const url = `${window.location.origin}/share.html?type=poll&id=${pollId}`;
    kmcaShowShareModal(url, `Poll: ${question}`);
}

// ============================================================
// SECTION 10: LOAD POSTS
// ============================================================
async function kmcaLoadPosts() {
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

// ============================================================
// SECTION 11: RENDER POST
// ============================================================
function kmcaRenderPost(post) {
    const logoHtml = kmcaHomeSettings.intro_logo
        ? `<img src="${kmcaHomeSettings.intro_logo}" alt="KMCA">`
        : '⛪';
    
    const timeAgo = kmcaGetTimeAgo(post.created_at);
    const hasContent = post.description && post.description.trim() !== '';
    const type = post.type || '';
    const mediaFiles = Array.isArray(post.media_files) 
        ? post.media_files 
        : (post.media_files ? [post.media_files] : []);
    
    let mediaHtml = '';
    
    if (type === 'maneno') {
        mediaHtml = '';
    } 
    else if (type === 'picha_moja' && mediaFiles[0]) {
        mediaHtml = kmcaRenderImage(mediaFiles[0]);
    } 
    else if (type === 'picha_nyingi' && mediaFiles.length > 0) {
        mediaHtml = kmcaRenderCarousel(mediaFiles, post.id);
    } 
    else if (type === 'video' && mediaFiles[0]) {
        mediaHtml = kmcaRenderVideo(mediaFiles[0], post.id);
    } 
    else if (type === 'picha_music' && mediaFiles[0]) {
        mediaHtml = kmcaRenderImageWithAudio(mediaFiles[0], post);
    } 
    else if (type === 'picha_nyingi_music' && mediaFiles.length > 0) {
        mediaHtml = kmcaRenderCarouselWithAudio(mediaFiles, post);
    } 
    else if (type === 'live_video' && mediaFiles[0]) {
        mediaHtml = kmcaRenderLiveVideo(mediaFiles[0], post.id, true);
    } 
    else if (type === 'auto_fake_live_video' && mediaFiles[0]) {
        mediaHtml = kmcaRenderLiveVideo(mediaFiles[0], post.id, false);
    } 
    else if (type === 'other_file' && mediaFiles[0]) {
        mediaHtml = kmcaRenderFile(mediaFiles[0]);
    } 
    else if (mediaFiles[0]) {
        const url = mediaFiles[0];
        if (kmcaIsYouTubeUrl(url) || kmcaIsVimeoUrl(url)) {
            mediaHtml = kmcaRenderExternalVideo(url, post.id);
        } else if (kmcaIsVideoUrl(url)) {
            mediaHtml = kmcaRenderVideo(url, post.id);
        } else if (kmcaIsImageUrl(url)) {
            mediaHtml = kmcaRenderImage(url);
        } else if (kmcaIsAudioUrl(url)) {
            mediaHtml = kmcaRenderAudioUrl(url);
        } else {
            mediaHtml = kmcaRenderFile(url);
        }
    }
    
    let contentHtml = '';
    if (hasContent) {
        contentHtml = kmcaRenderContent(post.description);
    }
    
    return `
        <div class="post-card" data-post-id="${post.id}" data-type="${type}">
            <div class="post-header">
                <div class="post-owner-logo">${logoHtml}</div>
                <div class="post-owner-info">
                    <div class="post-owner-name">KMCA <i class="fas fa-check-circle verified-badge"></i></div>
                    <div class="post-owner-time">${timeAgo}</div>
                </div>
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
                <button class="post-action post-share-btn" data-content-type="post" data-content-id="${post.id}" data-title="${kmcaEscapeAttr(post.title || 'KMCA Post')}">
                    <i class="fas fa-share"></i>
                    <span class="post-action-count share-count">0</span>
                </button>
                <button class="post-action post-download-btn" data-content-type="post" data-content-id="${post.id}" data-url="${mediaFiles[0] || ''}" data-title="${kmcaEscapeAttr(post.title || 'KMCA Post')}">
                    <i class="fas fa-download"></i>
                    <span class="post-action-count download-count">0</span>
                </button>
            </div>
        </div>
    `;
}

// ============================================================
// SECTION 12: MEDIA RENDER
// ============================================================

function kmcaRenderImage(url) {
    return `
        <div class="post-media">
            <img src="${url}" alt="Post" loading="lazy" 
                 onerror="this.parentElement.innerHTML='<div style=\\'padding:40px;text-align:center;color:#64748b;font-size:14px;\\'>Picha haipatikani</div>'">
        </div>
    `;
}

function kmcaRenderImageWithAudio(url, post) {
    return `
        <div class="post-media" style="position: relative;">
            <img src="${url}" alt="Post" loading="lazy" 
                 onerror="this.parentElement.innerHTML='<div style=\\'padding:40px;text-align:center;color:#64748b;\\'>Picha haipatikani</div>'">
            ${kmcaRenderAudioButton(post)}
        </div>
    `;
}

function kmcaRenderCarousel(urls, postId) {
    return `
        <div class="post-media">
            <div class="post-carousel" data-carousel-id="${postId}">
                ${urls.map((url, i) => `
                    <div class="post-carousel-slide">
                        <img src="${url}" alt="Post ${i + 1}" loading="lazy">
                    </div>
                `).join('')}
            </div>
            ${urls.length > 1 ? `
                <div class="post-carousel-dots">
                    ${urls.map((_, i) => `<div class="carousel-dot ${i === 0 ? 'active' : ''}"></div>`).join('')}
                </div>
            ` : ''}
        </div>
    `;
}

function kmcaRenderCarouselWithAudio(urls, post) {
    return `
        <div class="post-media" style="position: relative;">
            <div class="post-carousel" data-carousel-id="${post.id}">
                ${urls.map((url, i) => `
                    <div class="post-carousel-slide">
                        <img src="${url}" alt="Post ${i + 1}" loading="lazy">
                    </div>
                `).join('')}
            </div>
            ${urls.length > 1 ? `
                <div class="post-carousel-dots">
                    ${urls.map((_, i) => `<div class="carousel-dot ${i === 0 ? 'active' : ''}"></div>`).join('')}
                </div>
            ` : ''}
            ${kmcaRenderAudioButton(post)}
        </div>
    `;
}

// ============================================
// AUDIO BUTTON — Kona ya chini-kulia ya picha
// ============================================
function kmcaRenderAudioButton(post) {
    if (!post.audio_file) return '';
    
    return `
        <audio class="post-audio" data-audio-id="${post.id}" src="${post.audio_file}" loop preload="none"></audio>
        <button class="post-music-btn" data-audio-id="${post.id}" data-muted="true" title="Washa muziki">
            <i class="fas fa-volume-mute"></i>
        </button>
    `;
}

function kmcaRenderVideo(url, postId) {
    return `
        <div class="post-media">
            <div class="post-video-container" data-video-id="${postId}" data-src="${url}" data-type="video">
                <div class="video-thumbnail-skeleton" id="thumb-skeleton-${postId}">
                    <i class="fas fa-spinner fa-spin" style="font-size: 32px; color: var(--text-muted);"></i>
                </div>
                <div class="post-video-overlay">
                    <i class="fas fa-play"></i>
                </div>
            </div>
        </div>
    `;
}

function kmcaRenderLiveVideo(url, postId, isReal) {
    return `
        <div class="post-media">
            <div class="post-video-container" data-video-id="${postId}" data-src="${url}" data-live="${isReal}">
                <div class="video-thumbnail-skeleton" id="thumb-skeleton-${postId}">
                    <i class="fas fa-spinner fa-spin" style="font-size: 32px; color: var(--text-muted);"></i>
                </div>
                <div class="post-video-overlay">
                    <i class="fas fa-play"></i>
                </div>
                <div class="live-badge">
                    <span class="live-dot"></span>
                    ${isReal ? 'LIVE' : 'AUTO LIVE'}
                </div>
            </div>
        </div>
    `;
}

// ============================================
// EXTERNAL VIDEO — Thumbnail + link
// ============================================
function kmcaRenderExternalVideo(url, postId) {
    let videoId = null;
    let embedUrl = url;
    let thumbnailUrl = null;
    let platform = 'unknown';
    
    if (kmcaIsYouTubeUrl(url)) {
        videoId = kmcaExtractYouTubeId(url);
        if (videoId) {
            embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1&showinfo=0&iv_load_policy=3&fs=1&autoplay=0`;
            thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
            platform = 'youtube';
        }
    }
    else if (kmcaIsVimeoUrl(url)) {
        const match = url.match(/vimeo\.com\/(\d+)/);
        if (match) {
            embedUrl = `https://player.vimeo.com/video/${match[1]}?byline=0&portrait=0&title=0&playsinline=1`;
            thumbnailUrl = `https://vumbnail.com/${match[1]}.jpg`;
            platform = 'vimeo';
        }
    }
    
    const thumbnailHtml = thumbnailUrl ? `
        <img src="${thumbnailUrl}" 
             class="post-video-thumbnail" 
             alt="Video"
             loading="lazy"
             onerror="this.parentElement.innerHTML='<div style=\\'aspect-ratio:16/9;background:#000;display:flex;align-items:center;justify-content:center;\\'><i class=\\'fab fa-youtube\\' style=\\'font-size:80px;color:#ff0000;\\'></i></div>'">
    ` : `
        <div class="video-thumbnail-skeleton" style="aspect-ratio: 16/9; background: #000; display: flex; align-items: center; justify-content: center;">
            <i class="fas fa-play" style="font-size: 60px; color: #d4af37;"></i>
        </div>
    `;
    
    return `
        <div class="post-media">
            <div class="post-video-container" 
                 data-video-id="${postId}" 
                 data-src="${url}" 
                 data-type="external"
                 data-embed="${embedUrl}"
                 data-platform="${platform}">
                ${thumbnailHtml}
                <div class="post-video-overlay">
                    <i class="fas fa-play"></i>
                </div>
            </div>
        </div>
    `;
}

function kmcaRenderAudioUrl(url) {
    return `
        <div class="post-media" style="padding: 20px;">
            <audio controls style="width: 100%; border-radius: 8px;" src="${url}"></audio>
        </div>
    `;
}

function kmcaRenderFile(url) {
    const ext = url.split('.').pop().toLowerCase().split('?')[0];
    
    const fileIcons = {
        'pdf': 'fa-file-pdf',
        'doc': 'fa-file-word',
        'docx': 'fa-file-word',
        'xls': 'fa-file-excel',
        'xlsx': 'fa-file-excel',
        'zip': 'fa-file-archive',
        'rar': 'fa-file-archive',
        'apk': 'fa-android'
    };
    
    const icon = fileIcons[ext] || 'fa-file';
    
    return `
        <div class="post-media" style="padding: 40px 20px; text-align: center; background: var(--bg-input);">
            <i class="fas ${icon}" style="font-size: 64px; color: var(--primary); margin-bottom: 16px; display: block;"></i>
            <a href="${url}" target="_blank" download
               style="color: var(--primary); font-weight: 700; text-decoration: none; font-size: 14px;">
                <i class="fas fa-download"></i> Pakua File
            </a>
        </div>
    `;
}

// ============================================================
// SECTION 13: URL DETECTION
// ============================================================
function kmcaIsImageUrl(url) {
    if (!url) return false;
    const clean = url.split('?')[0].toLowerCase();
    return /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(clean)
        || clean.includes('cloudinary.com/image/upload')
        || (clean.includes('ucarecdn.com') && !clean.includes('.mp4') && !clean.includes('.webm'));
}

function kmcaIsVideoUrl(url) {
    if (!url) return false;
    const clean = url.split('?')[0].toLowerCase();
    return /\.(mp4|webm|mov|avi|mkv|m4v)$/i.test(clean)
        || clean.includes('/video/upload');
}

function kmcaIsAudioUrl(url) {
    if (!url) return false;
    const clean = url.split('?')[0].toLowerCase();
    return /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(clean);
}

function kmcaIsYouTubeUrl(url) {
    return url && (url.includes('youtube.com') || url.includes('youtu.be'));
}

function kmcaIsVimeoUrl(url) {
    return url && url.includes('vimeo.com');
}

function kmcaExtractYouTubeId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /youtube\.com\/shorts\/([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

// ============================================================
// SECTION 14: POST CONTENT
// ============================================================
function kmcaRenderContent(text) {
    const lines = text.split('\n').filter(l => l.trim() !== '');
    const lineCount = lines.length;
    const charCount = text.length;
    
    const hash = text.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const random = (hash % 3);
    
    let style = 'plain';
    if (charCount < 100 && lineCount <= 2) {
        style = random === 0 ? 'gradient' : 'quote';
    } else if (charCount < 200 && lineCount <= 5) {
        style = 'quote';
    }
    
    if (style === 'gradient') {
        return `<div class="post-content post-content-gradient">${kmcaEscape(text)}</div>`;
    } else if (style === 'quote') {
        return `<div class="post-content post-content-quote">${kmcaEscape(text)}</div>`;
    } else {
        return `<div class="post-content">${kmcaEscape(text)}</div>`;
    }
}

// ============================================================
// SECTION 15: VIDEO THUMBNAILS
// ============================================================
async function kmcaGenerateAllVideoThumbnails() {
    const containers = document.querySelectorAll('.post-video-container[data-type="video"]');
    if (containers.length === 0) return;
    
    const promises = Array.from(containers).map(async (container) => {
        const postId = container.getAttribute('data-video-id');
        const src = container.getAttribute('data-src');
        
        if (!src || !postId) return;
        
        try {
            const thumbnail = await kmcaGenerateVideoThumbnail(src, postId);
            if (thumbnail) {
                const skeleton = container.querySelector('.video-thumbnail-skeleton');
                if (skeleton) {
                    skeleton.outerHTML = `<img src="${thumbnail}" class="post-video-thumbnail" alt="Video" loading="lazy">`;
                }
            }
        } catch (e) {
            const skeleton = container.querySelector('.video-thumbnail-skeleton');
            if (skeleton) {
                skeleton.style.background = 'linear-gradient(135deg, #1e293b, #0f172a)';
                skeleton.innerHTML = '<i class="fas fa-video" style="font-size: 60px; color: #475569;"></i>';
            }
        }
    });
    
    await Promise.allSettled(promises);
}

async function kmcaGenerateVideoThumbnail(videoUrl, cacheKey) {
    if (kmcaVideoThumbCache.has(cacheKey)) {
        return kmcaVideoThumbCache.get(cacheKey);
    }
    
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
        }, 8000);
        
        video.addEventListener('loadeddata', () => {
            try {
                video.currentTime = Math.min(1, video.duration / 2);
            } catch (e) {
                video.currentTime = 1;
            }
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
                kmcaVideoThumbCache.set(cacheKey, thumbnailUrl);
                
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
            reject(new Error('Load error'));
        });
        
        video.load();
    });
}

// ============================================================
// SECTION 16: LOAD COUNTS
// ============================================================
async function kmcaLoadAllCounts() {
    const posts = document.querySelectorAll('.post-card');
    if (posts.length === 0) return;
    
    const postIds = Array.from(posts).map(p => p.getAttribute('data-post-id'));
    
    try {
        const [likes, comments, shares, downloads] = await Promise.all([
            supabaseClient.from('content_likes').select('content_id, reaction_type').in('content_id', postIds).eq('content_type', 'post'),
            supabaseClient.from('comments').select('content_id').in('content_id', postIds).eq('content_type', 'post'),
            supabaseClient.from('content_shares').select('content_id').in('content_id', postIds).eq('content_type', 'post'),
            supabaseClient.from('content_downloads').select('content_id').in('content_id', postIds).eq('content_type', 'post')
        ]);
        
        const counts = {};
        postIds.forEach(id => {
            counts[id] = { likes: 0, comments: 0, shares: 0, downloads: 0, reactions: {} };
        });
        
        (likes.data || []).forEach(x => {
            if (counts[x.content_id]) {
                counts[x.content_id].likes++;
                const r = x.reaction_type || 'like';
                counts[x.content_id].reactions[r] = (counts[x.content_id].reactions[r] || 0) + 1;
            }
        });
        
        (comments.data || []).forEach(x => { if (counts[x.content_id]) counts[x.content_id].comments++; });
        (shares.data || []).forEach(x => { if (counts[x.content_id]) counts[x.content_id].shares++; });
        (downloads.data || []).forEach(x => { if (counts[x.content_id]) counts[x.content_id].downloads++; });
        
        posts.forEach(postCard => {
            const postId = postCard.getAttribute('data-post-id');
            const c = counts[postId];
            if (!c) return;
            
            const likeEl = postCard.querySelector('.like-count');
            if (likeEl) likeEl.textContent = kmcaFormatCount(c.likes);
            
            const commentEl = postCard.querySelector('.comment-count');
            if (commentEl) commentEl.textContent = kmcaFormatCount(c.comments);
            
            const shareEl = postCard.querySelector('.share-count');
            if (shareEl) shareEl.textContent = kmcaFormatCount(c.shares);
            
            const downloadEl = postCard.querySelector('.download-count');
            if (downloadEl) downloadEl.textContent = kmcaFormatCount(c.downloads);
            
            kmcaReactionsCache.set(postId, c.reactions);
        });
    } catch (e) {
        console.error('Counts error:', e);
    }
}

function kmcaFormatCount(num) {
    if (!num || num === 0) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace('.0', '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace('.0', '') + 'K';
    return num.toString();
}

function kmcaParseCount(str) {
    if (!str) return 0;
    str = str.toString().trim();
    if (str.endsWith('K')) return parseFloat(str) * 1000;
    if (str.endsWith('M')) return parseFloat(str) * 1000000;
    return parseInt(str) || 0;
}

// ============================================================
// SECTION 17: USER LIKES + REACTIONS
// ============================================================
async function kmcaLoadUserLikes() {
    const user = getCurrentUser();
    if (!user) return;
    
    try {
        const { data: likes } = await supabaseClient
            .from('content_likes')
            .select('content_id, reaction_type')
            .eq('user_id', user.id)
            .eq('content_type', 'post');
        
        (likes || []).forEach(l => {
            kmcaUserReactions.set(l.content_id, l.reaction_type || 'like');
        });
        
        document.querySelectorAll('.post-like-btn').forEach(btn => {
            const contentId = btn.getAttribute('data-content-id');
            const reaction = kmcaUserReactions.get(contentId);
            
            if (reaction) {
                btn.classList.add('liked');
                btn.dataset.reaction = reaction;
                
                const icon = btn.querySelector('i');
                if (reaction === 'like') icon.className = 'fas fa-thumbs-up';
                else if (reaction === 'love') icon.className = 'fas fa-heart';
                else if (reaction === 'haha') icon.className = 'fas fa-laugh';
                else if (reaction === 'wow') icon.className = 'fas fa-surprise';
                else if (reaction === 'sad') icon.className = 'fas fa-sad-tear';
                else if (reaction === 'angry') icon.className = 'fas fa-angry';
                else if (reaction === 'pray') icon.className = 'fas fa-praying-hands';
                else if (reaction === 'amen') icon.className = 'fas fa-hands';
                else icon.className = 'fas fa-heart';
            }
        });
    } catch (e) {}
}

// ============================================================
// SECTION 18: USER POLL VOTES
// ============================================================
async function kmcaLoadUserPollVotes() {
    const user = getCurrentUser();
    if (!user) return;
    
    try {
        const { data: votes } = await supabaseClient
            .from('poll_votes')
            .select('poll_id, option_id')
            .eq('user_id', user.id);
        
        (votes || []).forEach(vote => {
            kmcaPollVotesCache.set(vote.poll_id, vote.option_id);
            const pollCard = document.querySelector(`.poll-card[data-poll-id="${vote.poll_id}"]`);
            if (pollCard) kmcaShowPollResults(pollCard, vote.poll_id, vote.option_id);
        });
    } catch (e) {}
}

async function kmcaShowPollResults(pollCard, pollId, userVoteId = null) {
    try {
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
            
            const percentEl = opt.querySelector('.poll-option-percent');
            if (percentEl) {
                percentEl.style.display = 'block';
                percentEl.textContent = `${percent}%`;
            }
            
            const barEl = opt.querySelector('.poll-option-bar');
            if (barEl) {
                barEl.style.width = percent + '%';
                barEl.className = 'poll-option-bar' + (isUserVote ? ' user-vote' : '');
            }
            
            let countEl = opt.querySelector('.poll-option-count');
            if (!countEl) {
                countEl = document.createElement('div');
                countEl.className = 'poll-option-count';
                opt.appendChild(countEl);
            }
            countEl.textContent = `${count} kura`;
            
            if (isUserVote) {
                opt.classList.add('selected', 'disabled');
                
                if (!opt.querySelector('.poll-change-btn')) {
                    const changeBtn = document.createElement('button');
                    changeBtn.className = 'poll-change-btn';
                    changeBtn.innerHTML = '<i class="fas fa-edit"></i> Badilisha';
                    changeBtn.onclick = (e) => {
                        e.stopPropagation();
                        kmcaEnablePollChange(pollId);
                    };
                    opt.appendChild(changeBtn);
                }
            } else {
                opt.classList.add('disabled');
            }
        });
        
        const totalEl = document.getElementById(`poll-total-${pollId}`);
        if (totalEl) totalEl.textContent = `👥 ${totalVotes} kura`;
        
        const badge = document.getElementById(`poll-voted-${pollId}`);
        if (badge) badge.style.display = 'flex';
    } catch (e) {}
}

function kmcaEnablePollChange(pollId) {
    const pollCard = document.querySelector(`.poll-card[data-poll-id="${pollId}"]`);
    if (!pollCard) return;
    
    pollCard.querySelectorAll('.poll-option').forEach(opt => {
        opt.classList.remove('selected', 'disabled');
        
        const percentEl = opt.querySelector('.poll-option-percent');
        if (percentEl) percentEl.style.display = 'none';
        
        const barEl = opt.querySelector('.poll-option-bar');
        if (barEl) barEl.style.width = '0%';
        
        const countEl = opt.querySelector('.poll-option-count');
        if (countEl) countEl.remove();
        
        const changeBtn = opt.querySelector('.poll-change-btn');
        if (changeBtn) changeBtn.remove();
    });
    
    const badge = document.getElementById(`poll-voted-${pollId}`);
    if (badge) badge.style.display = 'none';
    
    kmcaToast('Chagua jibu jipya', 'info');
}

async function kmcaVotePoll(option) {
    const user = getCurrentUser();
    if (!user) {
        kmcaToast('Ingia ili kupiga kura', 'warning');
        return;
    }
    
    const pollId = option.getAttribute('data-poll-id');
    const optionId = option.getAttribute('data-option-id');
    const existingVote = kmcaPollVotesCache.get(pollId);
    
    try {
        if (existingVote) {
            await supabaseClient
                .from('poll_votes')
                .update({ option_id: optionId, created_at: new Date().toISOString() })
                .eq('user_id', user.id)
                .eq('poll_id', pollId);
        } else {
            await supabaseClient.from('poll_votes').insert([{
                user_id: user.id,
                poll_id: pollId,
                option_id: optionId
            }]);
        }
        
        kmcaPollVotesCache.set(pollId, optionId);
        
        const pollCard = option.closest('.poll-card');
        await kmcaShowPollResults(pollCard, pollId, optionId);
        
        kmcaToast(existingVote ? 'Kura imebadilishwa!' : 'Kura yako imepokelewa!', 'success');
    } catch (e) {
        console.error('Vote error:', e);
        kmcaToast('Imeshindikana kupiga kura', 'error');
    }
}

// ============================================================
// SECTION 19: SETUP FEED EVENTS
// ============================================================
function kmcaSetupFeedEvents() {
    // LIKE (with long-press for reactions)
    document.querySelectorAll('.post-like-btn').forEach(btn => {
        let pressTimer = null;
        let isLongPress = false;
        
        btn.addEventListener('touchstart', function(e) {
            isLongPress = false;
            pressTimer = setTimeout(() => {
                isLongPress = true;
                kmcaShowReactionsPicker(this);
            }, 500);
        }, { passive: true });
        
        btn.addEventListener('touchend', function(e) {
            clearTimeout(pressTimer);
            if (!isLongPress) {
                e.preventDefault();
                kmcaToggleLike(this);
            }
        });
        
        btn.addEventListener('touchmove', function() {
            clearTimeout(pressTimer);
        }, { passive: true });
        
        btn.addEventListener('click', function(e) {
            if (e.pointerType !== 'touch') {
                kmcaToggleLike(this);
            }
        });
    });
    
    // DOUBLE-TAP on images
    document.querySelectorAll('.post-media img').forEach(img => {
        let lastTap = 0;
        img.addEventListener('click', function(e) {
            const now = Date.now();
            if (now - lastTap < 300) {
                const postCard = this.closest('.post-card');
                if (postCard) {
                    const likeBtn = postCard.querySelector('.post-like-btn');
                    if (likeBtn) {
                        if (!likeBtn.classList.contains('liked')) {
                            kmcaToggleLike(likeBtn, 'love');
                        }
                        kmcaShowHeartAnimation(this);
                    }
                }
                lastTap = 0;
            } else {
                lastTap = now;
            }
        });
    });
    
    // COMMENTS
    document.querySelectorAll('.post-comment-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const contentId = this.getAttribute('data-content-id');
            kmcaOpenCommentsModal('post', contentId);
        });
    });
    
    // SHARE
    document.querySelectorAll('.post-share-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            kmcaSharePost(this,
                this.getAttribute('data-content-type'),
                this.getAttribute('data-content-id'),
                this.getAttribute('data-title')
            );
        });
    });
    
    // DOWNLOAD
    document.querySelectorAll('.post-download-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            kmcaShowDownloadOptions(this,
                this.getAttribute('data-content-type'),
                this.getAttribute('data-content-id'),
                this.getAttribute('data-url'),
                this.getAttribute('data-title')
            );
        });
    });
    
    // VIDEO PLAY
    document.querySelectorAll('.post-video-container').forEach(container => {
        container.addEventListener('click', function() {
            kmcaPlayVideo(this);
        });
    });
    
    // MUSIC
    document.querySelectorAll('.post-music-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            kmcaToggleMusic(this);
        });
    });
    
    // CAROUSEL
    document.querySelectorAll('.post-carousel').forEach(carousel => {
        carousel.addEventListener('scroll', function() {
            kmcaUpdateCarouselDots(this);
        });
    });
    
    // POLL OPTIONS
    document.querySelectorAll('.poll-option').forEach(option => {
        option.addEventListener('click', function() {
            if (this.classList.contains('disabled')) return;
            kmcaVotePoll(this);
        });
    });
}

// ============================================================
// SECTION 20: LIKE SYSTEM
// ============================================================
async function kmcaToggleLike(btn, reactionType = 'like') {
    const user = getCurrentUser();
    if (!user) {
        kmcaToast('Ingia ili ku-like', 'warning');
        return;
    }
    
    const contentType = btn.getAttribute('data-content-type');
    const contentId = btn.getAttribute('data-content-id');
    const existing = kmcaUserReactions.get(contentId);
    const countEl = btn.querySelector('.like-count');
    const icon = btn.querySelector('i');
    
    if (existing) {
        kmcaUserReactions.delete(contentId);
        btn.classList.remove('liked');
        delete btn.dataset.reaction;
        icon.className = 'far fa-heart';
        
        const currentCount = kmcaParseCount(countEl.textContent);
        countEl.textContent = kmcaFormatCount(Math.max(0, currentCount - 1));
    } else {
        kmcaUserReactions.set(contentId, reactionType);
        btn.classList.add('liked');
        btn.dataset.reaction = reactionType;
        
        if (reactionType === 'like') icon.className = 'fas fa-thumbs-up';
        else if (reactionType === 'love') icon.className = 'fas fa-heart';
        else if (reactionType === 'haha') icon.className = 'fas fa-laugh';
        else if (reactionType === 'wow') icon.className = 'fas fa-surprise';
        else if (reactionType === 'sad') icon.className = 'fas fa-sad-tear';
        else if (reactionType === 'angry') icon.className = 'fas fa-angry';
        else if (reactionType === 'pray') icon.className = 'fas fa-praying-hands';
        else if (reactionType === 'amen') icon.className = 'fas fa-hands';
        else icon.className = 'fas fa-heart';
        
        const currentCount = kmcaParseCount(countEl.textContent);
        countEl.textContent = kmcaFormatCount(currentCount + 1);
        
        if (navigator.vibrate) navigator.vibrate(20);
    }
    
    btn.style.animation = 'heartBeat 0.5s';
    setTimeout(() => btn.style.animation = '', 500);
    
    try {
        if (existing) {
            await supabaseClient
                .from('content_likes')
                .delete()
                .eq('user_id', user.id)
                .eq('content_type', contentType)
                .eq('content_id', contentId);
        } else {
            await supabaseClient.from('content_likes').insert([{
                user_id: user.id,
                content_type: contentType,
                content_id: contentId,
                reaction_type: reactionType
            }]);
        }
        
        const { count } = await supabaseClient
            .from('content_likes')
            .select('*', { count: 'exact', head: true })
            .eq('content_type', contentType)
            .eq('content_id', contentId);
        
        if (countEl) countEl.textContent = kmcaFormatCount(count || 0);
    } catch (e) {
        console.error('Like error:', e);
    }
}

function kmcaShowReactionsPicker(btn) {
    const existing = document.getElementById('kmcaReactionsPicker');
    if (existing) existing.remove();
    
    const rect = btn.getBoundingClientRect();
    const picker = document.createElement('div');
    picker.id = 'kmcaReactionsPicker';
    picker.style.cssText = `
        position: fixed;
        bottom: ${window.innerHeight - rect.top + 10}px;
        left: ${Math.max(10, rect.left - 100)}px;
        display: flex;
        gap: 4px;
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: 30px;
        padding: 8px 12px;
        z-index: 9999;
        box-shadow: var(--shadow-lg);
        animation: reactionsPop 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `;
    
    const reactions = [
        { type: 'like', emoji: '👍' },
        { type: 'love', emoji: '❤️' },
        { type: 'haha', emoji: '😂' },
        { type: 'wow', emoji: '😮' },
        { type: 'sad', emoji: '😢' },
        { type: 'angry', emoji: '😡' },
        { type: 'pray', emoji: '🙏' },
        { type: 'amen', emoji: '🙌' }
    ];
    
    reactions.forEach(r => {
        const btnEl = document.createElement('button');
        btnEl.style.cssText = `
            background: transparent;
            border: none;
            font-size: 28px;
            cursor: pointer;
            padding: 4px;
            border-radius: 50%;
            transition: transform 0.2s;
        `;
        btnEl.textContent = r.emoji;
        btnEl.title = r.type;
        btnEl.onmouseover = () => btnEl.style.transform = 'scale(1.3) translateY(-4px)';
        btnEl.onmouseout = () => btnEl.style.transform = 'scale(1)';
        btnEl.onclick = () => {
            picker.remove();
            kmcaToggleLike(btn, r.type);
        };
        picker.appendChild(btnEl);
    });
    
    document.body.appendChild(picker);
    
    setTimeout(() => {
        const closeHandler = (e) => {
            if (!picker.contains(e.target)) {
                picker.remove();
                document.removeEventListener('click', closeHandler);
            }
        };
        document.addEventListener('click', closeHandler);
    }, 100);
}

function kmcaShowHeartAnimation(element) {
    const rect = element.getBoundingClientRect();
    const heart = document.createElement('div');
    heart.innerHTML = '❤️';
    heart.style.cssText = `
        position: fixed;
        left: ${rect.left + rect.width / 2}px;
        top: ${rect.top + rect.height / 2}px;
        transform: translate(-50%, -50%) scale(0);
        font-size: 100px;
        pointer-events: none;
        z-index: 9999;
        animation: heartPop 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        filter: drop-shadow(0 4px 20px rgba(0,0,0,0.4));
    `;
    document.body.appendChild(heart);
    
    setTimeout(() => heart.remove(), 800);
}

// Add CSS for animations
(function() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes reactionsPop {
            from { transform: scale(0.5) translateY(20px); opacity: 0; }
            to { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes heartPop {
            0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
            50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
            100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
        }
        @keyframes heartBeat {
            0%, 100% { transform: scale(1); }
            25% { transform: scale(1.3); }
            50% { transform: scale(1); }
            75% { transform: scale(1.2); }
        }
    `;
    document.head.appendChild(style);
})();

// ============================================================
// SECTION 21: COMMENTS SYSTEM
// ============================================================
async function kmcaOpenCommentsModal(contentType, contentId) {
    kmcaCurrentCommentType = contentType;
    kmcaCurrentCommentContentId = contentId;
    
    const existing = document.getElementById('homeCommentsModal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'homeCommentsModal';
    modal.className = 'comments-modal active';
    modal.dataset.contentId = contentId;
    modal.dataset.contentType = contentType;
    
    modal.innerHTML = `
        <div class="comments-modal-content">
            <div class="comments-modal-header">
                <h3>
                    <i class="fas fa-comments"></i>
                    Comments
                    <span id="homeCommentCount" style="color: var(--text-muted); font-weight: 600;">(0)</span>
                </h3>
                <button class="comments-modal-close" id="homeCommentsClose" aria-label="Funga">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="comments-modal-body" id="homeCommentsBody">
                <div class="loading-container">
                    <div class="loading-bar"></div>
                    <div class="loading-text">Inapakia comments...</div>
                </div>
            </div>
            <div class="comments-modal-footer" id="homeCommentsFooter"></div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('homeCommentsClose').onclick = () => {
        modal.remove();
        document.body.style.overflow = '';
    };
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
            document.body.style.overflow = '';
        }
    });
    
    document.body.style.overflow = 'hidden';
    
    await kmcaLoadAndRenderComments(contentType, contentId);
}

async function kmcaLoadAndRenderComments(contentType, contentId) {
    const body = document.getElementById('homeCommentsBody');
    const footer = document.getElementById('homeCommentsFooter');
    const countSpan = document.getElementById('homeCommentCount');
    const user = getCurrentUser();
    
    if (!body) return;
    
    try {
        body.innerHTML = `
            <div class="loading-container">
                <div class="loading-bar"></div>
                <div class="loading-text">Inapakia comments...</div>
            </div>
        `;
        
        const { data: comments, error } = await supabaseClient
            .from('comments')
            .select('*, users(jina, profile_picture)')
            .eq('content_type', contentType)
            .eq('content_id', contentId)
            .is('parent_id', null)
            .order('created_at', { ascending: false })
            .limit(100);
        
        if (error) throw error;
        
        // Load replies for each comment
        const commentsWithReplies = await Promise.all(
            (comments || []).map(async (c) => {
                const { data: replies } = await supabaseClient
                    .from('comments')
                    .select('*, users(jina, profile_picture)')
                    .eq('parent_id', c.id)
                    .order('created_at', { ascending: true });
                
                return { ...c, replies: replies || [] };
            })
        );
        
        kmcaCommentsCache[`${contentType}-${contentId}`] = commentsWithReplies;
        
        if (countSpan) countSpan.textContent = `(${commentsWithReplies.length})`;
        
        const sorted = kmcaSortComments(commentsWithReplies);
        
        if (!sorted || sorted.length === 0) {
            body.innerHTML = `
                <div class="no-comments">
                    <i class="fas fa-comments"></i>
                    <p>Hakuna comments bado</p>
                    <p style="font-size: 12px; opacity: 0.7; margin-top: 6px;">Kuwa wa kwanza ku-comment!</p>
                </div>
            `;
        } else {
            body.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <div style="font-size: 12px; color: var(--text-muted);">${sorted.length} comments</div>
                    <select id="kmcaCommentSort" 
                            style="background: var(--bg-input); border: 1px solid var(--border); color: var(--text-light); border-radius: 8px; padding: 4px 8px; font-size: 12px; font-family: inherit; cursor: pointer;">
                        <option value="newest" ${kmcaCommentSortMode === 'newest' ? 'selected' : ''}>🆕 Mpya</option>
                        <option value="oldest" ${kmcaCommentSortMode === 'oldest' ? 'selected' : ''}>📅 Za zamani</option>
                        <option value="liked" ${kmcaCommentSortMode === 'liked' ? 'selected' : ''}>❤️ Zinazopendwa</option>
                    </select>
                </div>
                <div class="comments-list">
                    ${sorted.map(c => kmcaRenderComment(c, user)).join('')}
                </div>
            `;
            
            const sortSelect = document.getElementById('kmcaCommentSort');
            if (sortSelect) {
                sortSelect.onchange = () => {
                    kmcaCommentSortMode = sortSelect.value;
                    kmcaLoadAndRenderComments(contentType, contentId);
                };
            }
        }
        
        if (user) {
            footer.innerHTML = `
                <div style="position: relative;">
                    <div id="kmcaEmojiPicker" style="display: none; position: absolute; bottom: 100%; left: 0; right: 0; background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 8px; grid-template-columns: repeat(8, 1fr); gap: 4px; margin-bottom: 8px; box-shadow: var(--shadow); z-index: 10;">
                        ${['❤️','😂','😮','😢','👍','🙏','🔥','✨','👏','🎉','😍','🤗','💪','🌟','💯','⚡'].map(e => `<button type="button" onclick="kmcaInsertEmoji('${e}')" style="background: transparent; border: none; font-size: 20px; cursor: pointer; padding: 4px; border-radius: 6px; transition: transform 0.15s;">${e}</button>`).join('')}
                    </div>
                    <div class="comment-input-container">
                        <button type="button" onclick="kmcaToggleEmojiPicker()" style="background: var(--bg-input); border: none; border-radius: 50%; width: 42px; height: 42px; color: var(--text-muted); font-size: 18px; cursor: pointer; flex-shrink: 0;">
                            😊
                        </button>
                        <input type="text" class="comment-input" id="homeCommentInput" 
                               placeholder="${kmcaReplyingTo ? 'Andika jibu...' : 'Andika comment...'}" 
                               maxlength="500" autocomplete="off">
                        <button class="btn-send-comment" id="homeSendComment" aria-label="Tuma">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                    <div style="text-align: right; padding: 4px 8px 0;">
                        <span id="kmcaCharCounter" style="font-size: 11px; color: var(--text-muted);">0/500</span>
                    </div>
                </div>
            `;
            
            const send = () => kmcaSendComment(contentType, contentId);
            document.getElementById('homeSendComment').onclick = send;
            
            const input = document.getElementById('homeCommentInput');
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                }
            });
            
            input.addEventListener('input', () => {
                kmcaUpdateCharCounter('homeCommentInput', 'kmcaCharCounter', 500);
            });
            
            setTimeout(() => input.focus(), 300);
        } else {
            footer.innerHTML = `
                <div class="login-prompt">
                    <i class="fas fa-user-circle"></i>
                    <p>Ingia ili ku-comment</p>
                    <button class="btn-login-prompt" onclick="window.location.href='index.html'">
                        <i class="fas fa-sign-in-alt"></i> Ingia
                    </button>
                </div>
            `;
        }
    } catch (e) {
        console.error('Comments error:', e);
        body.innerHTML = `
            <div class="no-comments">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Imeshindikana kupakia</p>
            </div>
        `;
    }
}

function kmcaSortComments(comments) {
    const sorted = [...comments];
    
    if (kmcaCommentSortMode === 'newest') {
        sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (kmcaCommentSortMode === 'oldest') {
        sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (kmcaCommentSortMode === 'liked') {
        sorted.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
    }
    
    return sorted;
}

function kmcaRenderComment(comment, currentUser) {
    const user = comment.users || {};
    const initials = kmcaInitials(user.jina);
    
    const avatarHtml = user.profile_picture
        ? `<img src="${user.profile_picture}" alt="${kmcaEscape(user.jina)}" onerror="this.parentElement.innerHTML='${initials}'">`
        : initials;
    
    const isOwn = currentUser && comment.user_id === currentUser.id;
    const hasReplies = comment.replies && comment.replies.length > 0;
    
    return `
        <div class="comment-item" data-comment-id="${comment.id}">
            <div class="comment-avatar">${avatarHtml}</div>
            <div class="comment-body">
                <div class="comment-header">
                    <span class="comment-author">
                        ${kmcaEscape(user.jina || 'Mtumiaji')}
                        ${isOwn ? '<span style="color: var(--primary); font-size: 11px; margin-left: 6px;">(Wewe)</span>' : ''}
                    </span>
                    <span class="comment-time">${kmcaGetTimeAgo(comment.created_at)}</span>
                </div>
                <div class="comment-text">${kmcaEscape(comment.content)}</div>
                <div class="comment-actions" style="display: flex; gap: 12px; margin-top: 6px; font-size: 12px;">
                    <button onclick="kmcaReplyToComment('${comment.id}', '${kmcaEscapeAttr(user.jina || '')}')" 
                            style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-weight: 600; padding: 4px 0;">
                        <i class="fas fa-reply"></i> Reply
                    </button>
                    <button onclick="kmcaCopyComment('${kmcaEscapeAttr(comment.content)}')" 
                            style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-weight: 600; padding: 4px 0;">
                        <i class="fas fa-copy"></i> Copy
                    </button>
                    ${isOwn ? `
                        <button onclick="kmcaDeleteComment('${comment.id}')" 
                                style="background: none; border: none; color: var(--error); cursor: pointer; font-weight: 600; padding: 4px 0;">
                            <i class="fas fa-trash"></i> Futa
                        </button>
                    ` : ''}
                </div>
                ${hasReplies ? `
                    <div class="comment-replies" style="margin-top: 10px; padding-left: 16px; border-left: 2px solid var(--border); display: flex; flex-direction: column; gap: 10px;">
                        ${comment.replies.map(r => kmcaRenderReply(r, currentUser)).join('')}
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

function kmcaRenderReply(comment, currentUser) {
    const user = comment.users || {};
    const initials = kmcaInitials(user.jina);
    
    const avatarHtml = user.profile_picture
        ? `<img src="${user.profile_picture}" alt="${kmcaEscape(user.jina)}" onerror="this.parentElement.innerHTML='${initials}'">`
        : initials;
    
    const isOwn = currentUser && comment.user_id === currentUser.id;
    
    return `
        <div class="comment-item" data-comment-id="${comment.id}" style="font-size: 13px;">
            <div class="comment-avatar" style="width: 30px; height: 30px; font-size: 11px;">${avatarHtml}</div>
            <div class="comment-body">
                <div class="comment-header">
                    <span class="comment-author">${kmcaEscape(user.jina || 'Mtumiaji')}</span>
                    <span class="comment-time">${kmcaGetTimeAgo(comment.created_at)}</span>
                </div>
                <div class="comment-text">${kmcaEscape(comment.content)}</div>
                ${isOwn ? `
                    <button onclick="kmcaDeleteComment('${comment.id}')" 
                            style="background: none; border: none; color: var(--error); cursor: pointer; font-size: 11px; font-weight: 600; padding: 2px 0;">
                        <i class="fas fa-trash"></i> Futa
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

function kmcaReplyToComment(commentId, userName) {
    kmcaReplyingTo = commentId;
    
    const input = document.getElementById('homeCommentInput');
    if (input) {
        input.placeholder = `Jibu ${userName}...`;
        input.focus();
    }
}

async function kmcaSendComment(contentType, contentId) {
    const user = getCurrentUser();
    if (!user) {
        kmcaToast('Ingia ili ku-comment', 'warning');
        return;
    }
    
    const input = document.getElementById('homeCommentInput');
    const btn = document.getElementById('homeSendComment');
    
    if (!input || !btn) return;
    
    const content = input.value.trim();
    
    if (!content) {
        kmcaToast('Andika comment kwanza', 'warning');
        input.focus();
        return;
    }
    
    if (content.length > 500) {
        kmcaToast('Comment ni ndefu mno', 'error');
        return;
    }
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    try {
        const insertData = {
            user_id: user.id,
            content_type: contentType,
            content_id: contentId,
            content: content
        };
        
        if (kmcaReplyingTo) {
            insertData.parent_id = kmcaReplyingTo;
        }
        
        const { error } = await supabaseClient
            .from('comments')
            .insert([insertData]);
        
        if (error) throw error;
        
        input.value = '';
        kmcaReplyingTo = null;
        input.placeholder = 'Andika comment...';
        
        await kmcaLoadAndRenderComments(contentType, contentId);
        
        const postCard = document.querySelector(`.post-card[data-post-id="${contentId}"]`);
        if (postCard) {
            const countEl = postCard.querySelector('.comment-count');
            if (countEl) {
                const current = kmcaParseCount(countEl.textContent);
                countEl.textContent = kmcaFormatCount(current + 1);
            }
        }
        
        kmcaToast('Comment imetumwa!', 'success');
    } catch (e) {
        console.error('Send comment error:', e);
        kmcaToast('Imeshindikana: ' + (e.message || 'error'), 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i>';
    }
}

async function kmcaDeleteComment(commentId) {
    const user = getCurrentUser();
    if (!user) return;
    
    if (!confirm('Futa comment hii?')) return;
    
    try {
        const { error } = await supabaseClient
            .from('comments')
            .delete()
            .eq('id', commentId)
            .eq('user_id', user.id);
        
        if (error) throw error;
        
        kmcaToast('Comment imefutwa', 'success');
        
        if (kmcaCurrentCommentType && kmcaCurrentCommentContentId) {
            await kmcaLoadAndRenderComments(kmcaCurrentCommentType, kmcaCurrentCommentContentId);
        }
    } catch (e) {
        console.error('Delete comment error:', e);
        kmcaToast('Imeshindikana kufuta', 'error');
    }
}

function kmcaToggleEmojiPicker() {
    const picker = document.getElementById('kmcaEmojiPicker');
    if (!picker) return;
    picker.style.display = picker.style.display === 'none' ? 'grid' : 'none';
}

function kmcaInsertEmoji(emoji) {
    const input = document.getElementById('homeCommentInput');
    if (input) {
        input.value += emoji;
        input.focus();
    }
    kmcaToggleEmojiPicker();
}

async function kmcaCopyComment(content) {
    try {
        await navigator.clipboard.writeText(content);
        kmcaToast('Comment imecopywa!', 'success');
    } catch (e) {
        kmcaToast('Imeshindikana', 'error');
    }
}

function kmcaUpdateCharCounter(inputId, counterId, max) {
    const input = document.getElementById(inputId);
    const counter = document.getElementById(counterId);
    
    if (!input || !counter) return;
    
    const current = input.value.length;
    counter.textContent = `${current}/${max}`;
    
    if (current > max * 0.9) counter.style.color = '#ef4444';
    else if (current > max * 0.7) counter.style.color = '#f59e0b';
    else counter.style.color = 'var(--text-muted)';
}

// ============================================================
// SECTION 22: SHARE SYSTEM
// ============================================================
async function kmcaSharePost(btn, contentType, contentId, title) {
    const user = getCurrentUser();
    if (!user) return;
    
    try {
        const baseUrl = kmcaHomeSettings.share_link || window.location.origin;
        const pagePath = kmcaHomeSettings.share_page_path || '/share.html';
        const shareUrl = `${baseUrl}${pagePath}?type=${contentType}&id=${contentId}`;
        
        if (navigator.share && /Mobi|Android|iPhone/i.test(navigator.userAgent)) {
            try {
                await navigator.share({
                    title: title,
                    text: title,
                    url: shareUrl
                });
                await kmcaTrackShare(user, contentType, contentId, btn);
                return;
            } catch (e) {}
        }
        
        await kmcaTrackShare(user, contentType, contentId, btn);
        kmcaShowShareModal(shareUrl, title);
    } catch (e) {
        console.error('Share error:', e);
    }
}

async function kmcaTrackShare(user, contentType, contentId, btn) {
    try {
        await supabaseClient.from('content_shares').insert([{
            user_id: user.id,
            content_type: contentType,
            content_id: contentId
        }]);
        
        const { count } = await supabaseClient
            .from('content_shares')
            .select('*', { count: 'exact', head: true })
            .eq('content_type', contentType)
            .eq('content_id', contentId);
        
        const countEl = btn.querySelector('.share-count');
        if (countEl) countEl.textContent = kmcaFormatCount(count || 0);
    } catch (e) {}
}

function kmcaShowShareModal(shareUrl, title) {
    const existing = document.getElementById('shareOptionsModal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'shareOptionsModal';
    modal.className = 'share-modal';
    modal.innerHTML = `
        <div class="share-modal-content">
            <div class="share-modal-header">
                <h3>Share kwa</h3>
                <button class="share-modal-close"><i class="fas fa-times"></i></button>
            </div>
            <div class="share-options-grid" style="grid-template-columns: repeat(3, 1fr);">
                <button class="share-option copy" onclick="kmcaCopyShareLink('${kmcaEscapeAttr(shareUrl)}')">
                    <i class="fas fa-link"></i><span>Copy Link</span>
                </button>
                <a href="https://wa.me/?text=${encodeURIComponent(title + ' - ' + shareUrl)}" target="_blank" class="share-option whatsapp">
                    <i class="fab fa-whatsapp"></i><span>WhatsApp</span>
                </a>
                <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}" target="_blank" class="share-option facebook">
                    <i class="fab fa-facebook"></i><span>Facebook</span>
                </a>
                <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}" target="_blank" class="share-option twitter">
                    <i class="fab fa-twitter"></i><span>Twitter</span>
                </a>
                <a href="https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}" target="_blank" class="share-option telegram">
                    <i class="fab fa-telegram"></i><span>Telegram</span>
                </a>
                <button class="share-option" onclick="kmcaShareAsText('${kmcaEscapeAttr(title)}', '${kmcaEscapeAttr(shareUrl)}')">
                    <i class="fas fa-file-alt" style="color: var(--info);"></i><span>Text</span>
                </button>
            </div>
            <div class="share-url-preview">
                <input type="text" value="${shareUrl}" readonly onclick="this.select()">
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('.share-modal-close').onclick = () => modal.remove();
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.remove();
    });
}

function kmcaShareAsText(title, url) {
    const text = `${title}\n\n${url}`;
    navigator.clipboard.writeText(text).then(() => {
        kmcaToast('Text imecopywa!', 'success');
    });
    document.getElementById('shareOptionsModal')?.remove();
}

async function kmcaCopyShareLink(url) {
    try {
        await navigator.clipboard.writeText(url);
        kmcaToast('Link imecopywa!', 'success');
        document.getElementById('shareOptionsModal')?.remove();
    } catch (e) {
        kmcaToast('Imeshindikana', 'error');
    }
}

// ============================================================
// SECTION 23: DOWNLOAD SYSTEM
// ============================================================
function kmcaShowDownloadOptions(btn, contentType, contentId, url, title = '') {
    const existing = document.getElementById('downloadOptionsModal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'downloadOptionsModal';
    modal.className = 'share-modal';
    modal.innerHTML = `
        <div class="share-modal-content" style="max-height: 85vh; overflow-y: auto;">
            <div class="share-modal-header">
                <h3><i class="fas fa-download"></i> Download</h3>
                <button class="share-modal-close"><i class="fas fa-times"></i></button>
            </div>
            
            <div style="display: grid; gap: 16px; padding: 8px 0;">
                <div>
                    <label style="font-size: 12px; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 8px;">Aina ya File</label>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
                        <button class="download-type-btn active" data-type="media" style="padding: 12px; border-radius: 10px; border: 2px solid var(--primary); background: rgba(212, 175, 55, 0.1); color: var(--text-light); cursor: pointer; font-weight: 700; display: flex; flex-direction: column; align-items: center; gap: 4px; font-family: inherit;">
                            <i class="fas fa-image" style="font-size: 18px; color: var(--primary);"></i>
                            <span style="font-size: 11px;">Media</span>
                        </button>
                        <button class="download-type-btn" data-type="cover" style="padding: 12px; border-radius: 10px; border: 2px solid var(--border); background: transparent; color: var(--text-light); cursor: pointer; font-weight: 700; display: flex; flex-direction: column; align-items: center; gap: 4px; font-family: inherit;">
                            <i class="fas fa-image" style="font-size: 18px; color: var(--success);"></i>
                            <span style="font-size: 11px;">Cover</span>
                        </button>
                        <button class="download-type-btn" data-type="text" style="padding: 12px; border-radius: 10px; border: 2px solid var(--border); background: transparent; color: var(--text-light); cursor: pointer; font-weight: 700; display: flex; flex-direction: column; align-items: center; gap: 4px; font-family: inherit;">
                            <i class="fas fa-file-alt" style="font-size: 18px; color: var(--info);"></i>
                            <span style="font-size: 11px;">Text</span>
                        </button>
                    </div>
                </div>
                
                <div>
                    <label style="font-size: 12px; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 8px;">Quality</label>
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;">
                        <button class="download-quality-btn" data-quality="original" style="padding: 8px; border-radius: 8px; border: 2px solid var(--border); background: transparent; color: var(--text-light); cursor: pointer; font-weight: 600; font-size: 11px; font-family: inherit;">Original</button>
                        <button class="download-quality-btn active" data-quality="hd" style="padding: 8px; border-radius: 8px; border: 2px solid var(--primary); background: rgba(212, 175, 55, 0.1); color: var(--text-light); cursor: pointer; font-weight: 600; font-size: 11px; font-family: inherit;">HD</button>
                        <button class="download-quality-btn" data-quality="sd" style="padding: 8px; border-radius: 8px; border: 2px solid var(--border); background: transparent; color: var(--text-light); cursor: pointer; font-weight: 600; font-size: 11px; font-family: inherit;">SD</button>
                        <button class="download-quality-btn" data-quality="low" style="padding: 8px; border-radius: 8px; border: 2px solid var(--border); background: transparent; color: var(--text-light); cursor: pointer; font-weight: 600; font-size: 11px; font-family: inherit;">Low</button>
                    </div>
                </div>
                
                <div>
                    <label style="font-size: 12px; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 8px;">Format</label>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">
                        <button class="download-format-btn active" data-format="jpg" style="padding: 8px; border-radius: 8px; border: 2px solid var(--primary); background: rgba(212, 175, 55, 0.1); color: var(--text-light); cursor: pointer; font-weight: 600; font-size: 11px; font-family: inherit;">JPG</button>
                        <button class="download-format-btn" data-format="png" style="padding: 8px; border-radius: 8px; border: 2px solid var(--border); background: transparent; color: var(--text-light); cursor: pointer; font-weight: 600; font-size: 11px; font-family: inherit;">PNG</button>
                        <button class="download-format-btn" data-format="webp" style="padding: 8px; border-radius: 8px; border: 2px solid var(--border); background: transparent; color: var(--text-light); cursor: pointer; font-weight: 600; font-size: 11px; font-family: inherit;">WEBP</button>
                    </div>
                </div>
                
                <div>
                    <label style="font-size: 12px; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 8px;">Watermark</label>
                    <div style="display: flex; align-items: center; gap: 10px; padding: 12px; background: var(--bg-input); border-radius: 10px;">
                        <input type="checkbox" id="downloadWatermark" checked style="width: 20px; height: 20px; accent-color: var(--primary); cursor: pointer;">
                        <label for="downloadWatermark" style="flex: 1; font-size: 14px; cursor: pointer;">Washa watermark</label>
                    </div>
                </div>
                
                <div>
                    <label style="font-size: 12px; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 8px;">Filename</label>
                    <input type="text" id="downloadFilename" value="${kmcaEscapeAttr(kmcaGenerateFilename(title, 'jpg'))}" style="width: 100%; background: var(--bg-input); border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; color: var(--text-light); font-size: 13px; font-family: inherit; outline: none;">
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 16px;">
                <button class="share-modal-close" style="padding: 12px; border-radius: 10px; border: none; background: var(--bg-input); color: var(--text-light); cursor: pointer; font-weight: 700; font-family: inherit;">
                    Ghairi
                </button>
                <button id="downloadStartBtn" style="padding: 12px; border-radius: 10px; border: none; background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: var(--bg-dark); cursor: pointer; font-weight: 700; font-family: inherit;">
                    <i class="fas fa-download"></i> Anza
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    kmcaSetupDownloadModal(modal, btn, contentType, contentId, url, title);
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.remove();
    });
}

function kmcaSetupDownloadModal(modal, btn, contentType, contentId, url, title) {
    modal.querySelectorAll('.download-type-btn').forEach(b => {
        b.onclick = () => {
            modal.querySelectorAll('.download-type-btn').forEach(x => {
                x.style.borderColor = 'var(--border)';
                x.style.background = 'transparent';
            });
            b.style.borderColor = 'var(--primary)';
            b.style.background = 'rgba(212, 175, 55, 0.1)';
        };
    });
    
    modal.querySelectorAll('.download-quality-btn').forEach(b => {
        b.onclick = () => {
            modal.querySelectorAll('.download-quality-btn').forEach(x => {
                x.style.borderColor = 'var(--border)';
                x.style.background = 'transparent';
            });
            b.style.borderColor = 'var(--primary)';
            b.style.background = 'rgba(212, 175, 55, 0.1)';
        };
    });
    
    modal.querySelectorAll('.download-format-btn').forEach(b => {
        b.onclick = () => {
            modal.querySelectorAll('.download-format-btn').forEach(x => {
                x.style.borderColor = 'var(--border)';
                x.style.background = 'transparent';
            });
            b.style.borderColor = 'var(--primary)';
            b.style.background = 'rgba(212, 175, 55, 0.1)';
            
            const format = b.getAttribute('data-format');
            const filenameInput = document.getElementById('downloadFilename');
            if (filenameInput) {
                filenameInput.value = kmcaGenerateFilename(title, format);
            }
        };
    });
    
    modal.querySelector('#downloadStartBtn').onclick = async () => {
        const typeBtn = modal.querySelector('.download-type-btn[style*="primary"]') || modal.querySelector('.download-type-btn.active');
        const qualityBtn = modal.querySelector('.download-quality-btn[style*="primary"]') || modal.querySelector('.download-quality-btn.active');
        const formatBtn = modal.querySelector('.download-format-btn[style*="primary"]') || modal.querySelector('.download-format-btn.active');
        
        const type = typeBtn?.getAttribute('data-type') || 'media';
        const quality = qualityBtn?.getAttribute('data-quality') || 'hd';
        const format = formatBtn?.getAttribute('data-format') || 'jpg';
        const watermark = document.getElementById('downloadWatermark')?.checked !== false;
        const filename = document.getElementById('downloadFilename')?.value || kmcaGenerateFilename(title, format);
        
        modal.remove();
        
        await kmcaPerformDownload({
            btn, contentType, contentId, url, title,
            type, quality, format, watermark, filename
        });
    };
}

function kmcaGenerateFilename(title, format) {
    const safeTitle = (title || 'KMCA-post').toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 40);
    
    const date = new Date().toISOString().split('T')[0];
    return `KMCA-${safeTitle}-${date}.${format}`;
}

async function kmcaPerformDownload(options) {
    const { btn, contentType, contentId, url, title, type, quality, format, watermark, filename } = options;
    
    if (!url) {
        kmcaToast('Hakuna file ya download', 'warning');
        return;
    }
    
    const user = getCurrentUser();
    if (!user) return;
    
    const progressModal = kmcaShowDownloadProgress(filename);
    
    try {
        await supabaseClient.from('content_downloads').insert([{
            user_id: user.id,
            content_type: contentType,
            content_id: contentId
        }]);
        
        const { count } = await supabaseClient
            .from('content_downloads')
            .select('*', { count: 'exact', head: true })
            .eq('content_type', contentType)
            .eq('content_id', contentId);
        
        const countEl = btn?.querySelector('.download-count');
        if (countEl) countEl.textContent = kmcaFormatCount(count || 0);
        
        // Text download
        if (type === 'text') {
            const postCard = document.querySelector(`.post-card[data-post-id="${contentId}"]`);
            let text = `${title}\n\n`;
            
            if (postCard) {
                const contentEl = postCard.querySelector('.post-content');
                if (contentEl) text += contentEl.textContent + '\n\n';
            }
            
            text += `\n© 2026 KMCA - Kwaya ya Vijana Mtakatifu Carlo Acutis`;
            
            const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
            kmcaUpdateDownloadProgress(progressModal, 100);
            kmcaTriggerDownload(blob, filename.replace(/\.\w+$/, '.txt'));
        }
        // Image download with watermark
        else if (kmcaIsImageUrl(url)) {
            await kmcaDownloadImageWithWatermark(url, filename, watermark, progressModal);
        }
        // Video/audio download
        else {
            await kmcaDownloadWithProgress(url, filename, progressModal);
        }
        
        progressModal.remove();
        kmcaToast('Download imekamilika!', 'success');
    } catch (e) {
        console.error('Download error:', e);
        progressModal.remove();
        kmcaToast('Imeshindikana ku-download', 'error');
    }
}

function kmcaShowDownloadProgress(filename) {
    const modal = document.createElement('div');
    modal.id = 'downloadProgressModal';
    modal.className = 'share-modal';
    modal.innerHTML = `
        <div class="share-modal-content" style="max-width: 400px;">
            <div style="text-align: center; padding: 20px 0;">
                <h3 style="margin-bottom: 20px;"><i class="fas fa-download"></i> Inapakua...</h3>
                
                <div style="width: 100%; height: 8px; background: var(--bg-input); border-radius: 4px; overflow: hidden; margin-bottom: 12px;">
                    <div id="downloadProgressBar" style="width: 0%; height: 100%; background: linear-gradient(90deg, var(--primary), var(--primary-light)); border-radius: 4px; transition: width 0.3s;"></div>
                </div>
                
                <div id="downloadProgressText" style="font-size: 24px; font-weight: 800; color: var(--primary); margin-bottom: 8px;">0%</div>
                <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px; word-break: break-all;">${filename}</div>
                <div id="downloadProgressInfo" style="font-size: 11px; color: var(--text-muted);">Inaanza...</div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    return modal;
}

async function kmcaDownloadWithProgress(url, filename, progressModal) {
    const response = await fetch(url);
    const contentLength = response.headers.get('content-length');
    const total = parseInt(contentLength, 10);
    
    const reader = response.body.getReader();
    let receivedLength = 0;
    const chunks = [];
    const startTime = Date.now();
    
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        chunks.push(value);
        receivedLength += value.length;
        
        if (total) {
            const percent = Math.round((receivedLength / total) * 100);
            kmcaUpdateDownloadProgress(progressModal, percent, receivedLength, total, startTime);
        }
    }
    
    const blob = new Blob(chunks);
    kmcaTriggerDownload(blob, filename);
}

async function kmcaDownloadImageWithWatermark(url, filename, addWatermark, progressModal) {
    kmcaUpdateDownloadProgress(progressModal, 30);
    
    const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.crossOrigin = 'anonymous';
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = url;
    });
    
    kmcaUpdateDownloadProgress(progressModal, 60);
    
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(img, 0, 0);
    
    if (addWatermark) {
        kmcaAddWatermarkToCanvas(ctx, canvas.width, canvas.height);
    }
    
    kmcaUpdateDownloadProgress(progressModal, 90);
    
    const format = filename.split('.').pop().toLowerCase();
    const mimeType = format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg';
    
    await new Promise(resolve => {
        canvas.toBlob(blob => {
            kmcaTriggerDownload(blob, filename);
            resolve();
        }, mimeType, 0.92);
    });
    
    kmcaUpdateDownloadProgress(progressModal, 100);
}

function kmcaUpdateDownloadProgress(modal, percent, received = 0, total = 0, startTime = Date.now()) {
    const bar = modal.querySelector('#downloadProgressBar');
    const text = modal.querySelector('#downloadProgressText');
    const info = modal.querySelector('#downloadProgressInfo');
    
    if (bar) bar.style.width = percent + '%';
    if (text) text.textContent = percent + '%';
    
    if (info && total > 0) {
        const elapsed = (Date.now() - startTime) / 1000;
        const speed = received / elapsed / 1024 / 1024;
        const remaining = (total - received) / (received / elapsed) / 1000;
        
        const receivedMB = (received / 1024 / 1024).toFixed(1);
        const totalMB = (total / 1024 / 1024).toFixed(1);
        
        info.textContent = `${receivedMB} MB / ${totalMB} MB · ${speed.toFixed(1)} MB/s · Sekunde ${Math.round(remaining)} zimebaki`;
    }
}

function kmcaTriggerDownload(blob, filename) {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}

function kmcaAddWatermarkToCanvas(ctx, width, height) {
    const padding = 20;
    const fontSize1 = Math.min(width, height) * 0.025;
    const fontSize2 = Math.min(width, height) * 0.035;
    
    const text1 = kmcaHomeSettings.watermark_text_1 || 'Kwaya ya Mtakatifu Carlo Acutis';
    const text2 = kmcaHomeSettings.watermark_text_2 || 'KMCA';
    
    const boxWidth = Math.max(200, text1.length * fontSize1 * 0.6 + 60);
    const boxHeight = fontSize1 + fontSize2 + 40;
    const boxX = width - boxWidth - padding;
    const boxY = height - boxHeight - padding;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    kmcaRoundRect(ctx, boxX, boxY, boxWidth, boxHeight, 10);
    ctx.fill();
    
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)';
    ctx.lineWidth = 2;
    kmcaRoundRect(ctx, boxX, boxY, boxWidth, boxHeight, 10);
    ctx.stroke();
    
    const textX = boxX + 20;
    const textY = boxY + boxHeight / 2;
    
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    
    ctx.fillStyle = '#f0d060';
    ctx.font = `bold ${fontSize1}px -apple-system, sans-serif`;
    ctx.fillText(text1.substring(0, 30), textX, textY - fontSize2 / 2);
    
    ctx.fillStyle = '#d4af37';
    ctx.font = `900 ${fontSize2}px -apple-system, sans-serif`;
    ctx.fillText(text2, textX, textY + fontSize1 / 2);
}

function kmcaRoundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

// ============================================================
// SECTION 24: VIDEO + AUDIO
// ============================================================
function kmcaPlayVideo(container) {
    const videoId = container.getAttribute('data-video-id');
    const src = container.getAttribute('data-src');
    const isLive = container.getAttribute('data-live') === 'true';
    const isExternal = container.getAttribute('data-type') === 'external';
    const embedUrl = container.getAttribute('data-embed');
    
    if (isExternal && embedUrl) {
        kmcaStopActiveVideo();
        kmcaStopActiveAudio();
        
        const overlay = container.querySelector('.post-video-overlay');
        const thumbnail = container.querySelector('.post-video-thumbnail');
        const skeleton = container.querySelector('.video-thumbnail-skeleton');
        
        if (overlay) overlay.remove();
        if (thumbnail) thumbnail.remove();
        if (skeleton) skeleton.remove();
        
        const iframeContainer = document.createElement('div');
        iframeContainer.style.cssText = 'position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; background: #000;';
        
        const iframe = document.createElement('iframe');
        iframe.src = embedUrl + '&autoplay=1';
        iframe.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;';
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';
        iframe.allowFullscreen = true;
        
        iframeContainer.appendChild(iframe);
        container.appendChild(iframeContainer);
        kmcaActiveVideo = iframeContainer;
        return;
    }
    
    const existingVideo = container.querySelector('video');
    if (existingVideo) {
        if (existingVideo.paused) existingVideo.play();
        else existingVideo.pause();
        return;
    }
    
    kmcaStopActiveVideo();
    kmcaStopActiveAudio();
    
    const video = document.createElement('video');
    video.src = src;
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    video.className = 'post-video-active';
    video.style.cssText = 'width: 100%; display: block; max-height: 700px; background: #000;';
    
    const overlay = container.querySelector('.post-video-overlay');
    const thumbnail = container.querySelector('.post-video-thumbnail');
    const skeleton = container.querySelector('.video-thumbnail-skeleton');
    
    if (overlay) overlay.remove();
    if (thumbnail) thumbnail.remove();
    if (skeleton) skeleton.remove();
    
    container.appendChild(video);
    kmcaActiveVideo = video;
    
    if (videoId && isLive !== null) kmcaTrackLiveView(videoId);
}

function kmcaStopActiveVideo() {
    if (kmcaActiveVideo) {
        if (kmcaActiveVideo.pause) kmcaActiveVideo.pause();
        if (kmcaActiveVideo.remove) kmcaActiveVideo.remove();
        kmcaActiveVideo = null;
    }
    
    document.querySelectorAll('video').forEach(v => {
        if (!v.paused) v.pause();
    });
}

function kmcaToggleMusic(btn) {
    const audioId = btn.getAttribute('data-audio-id');
    const audio = document.querySelector(`audio[data-audio-id="${audioId}"]`);
    if (!audio) return;
    
    const isMuted = btn.getAttribute('data-muted') === 'true';
    
    if (isMuted) {
        kmcaStopActiveVideo();
        kmcaStopActiveAudio();
        
        audio.play();
        btn.setAttribute('data-muted', 'false');
        btn.querySelector('i').className = 'fas fa-volume-up';
        btn.classList.remove('muted');
        btn.classList.add('playing');
        kmcaActiveAudio = audio;
    } else {
        audio.pause();
        btn.setAttribute('data-muted', 'true');
        btn.querySelector('i').className = 'fas fa-volume-mute';
        btn.classList.add('muted');
        btn.classList.remove('playing');
        kmcaActiveAudio = null;
    }
}

function kmcaStopActiveAudio() {
    if (kmcaActiveAudio) {
        kmcaActiveAudio.pause();
        kmcaActiveAudio = null;
    }
    
    document.querySelectorAll('.post-audio').forEach(audio => {
        if (!audio.paused) audio.pause();
    });
    
    document.querySelectorAll('.post-music-btn').forEach(btn => {
        btn.setAttribute('data-muted', 'true');
        btn.querySelector('i').className = 'fas fa-volume-mute';
        btn.classList.add('muted');
        btn.classList.remove('playing');
    });
}

// ============================================================
// SECTION 25: SCROLL & VISIBILITY
// ============================================================
function kmcaSetupScrollListener() {
    let scrollTimeout;
    
    window.addEventListener('scroll', function() {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            if (document.hidden) return;
            
            document.querySelectorAll('video').forEach(video => {
                if (video === kmcaActiveVideo) {
                    const rect = video.getBoundingClientRect();
                    const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
                    if (!isVisible && !video.paused) video.pause();
                }
            });
        }, 200);
    });
}

function kmcaSetupVisibilityListener() {
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            kmcaStopActiveVideo();
            kmcaStopActiveAudio();
        }
    });
}

// ============================================================
// SECTION 26: TRACKING & BADGES
// ============================================================
async function kmcaTrackPageView() {
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

async function kmcaTrackLiveView(postId) {
    const user = getCurrentUser();
    if (!user) return;
    
    const key = `live-${postId}`;
    if (kmcaViewedPosts.has(key)) return;
    kmcaViewedPosts.add(key);
    
    try {
        await supabaseClient.from('content_views').insert([{
            user_id: user.id,
            content_type: 'live',
            content_id: postId
        }]);
    } catch (e) {}
}

async function kmcaUpdateChatBadge() {
    const user = getCurrentUser();
    if (!user) return;
    
    try {
        const { count } = await supabaseClient
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('to_user_id', user.id)
            .eq('is_read', false);
        
        kmcaUpdateBadge('chatBadge', count || 0);
    } catch (e) {}
}

async function kmcaUpdateNotificationBadge() {
    const user = getCurrentUser();
    if (!user) return;
    
    try {
        const { count } = await supabaseClient
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_read', false)
            .eq('is_deleted', false);
        
        kmcaUpdateBadge('notificationBadge', count || 0);
    } catch (e) {}
}

function kmcaUpdateBadge(badgeId, count) {
    const badge = document.getElementById(badgeId);
    if (!badge) return;
    
    if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

// ============================================================
// SECTION 27: REALTIME
// ============================================================
function kmcaSetupRealtimeListeners() {
    const user = getCurrentUser();
    if (!user) return;
    
    if (kmcaHomeChatSub) kmcaHomeChatSub.unsubscribe();
    
    kmcaHomeChatSub = supabaseClient
        .channel('home-chat-badge')
        .on('postgres_changes', {
            event: 'INSERT', schema: 'public', table: 'messages',
            filter: `to_user_id=eq.${user.id}`
        }, () => kmcaUpdateChatBadge())
        .subscribe();
    
    if (kmcaHomeNotificationSub) kmcaHomeNotificationSub.unsubscribe();
    
    kmcaHomeNotificationSub = supabaseClient
        .channel('home-notification-badge')
        .on('postgres_changes', {
            event: 'INSERT', schema: 'public', table: 'notifications',
            filter: `user_id=eq.${user.id}`
        }, () => {
            kmcaUpdateNotificationBadge();
            kmcaToast('🔔 Notification mpya!', 'info');
        })
        .subscribe();
}

// ============================================================
// SECTION 28: CAROUSEL
// ============================================================
function kmcaUpdateCarouselDots(carousel) {
    const slideWidth = carousel.clientWidth;
    const scrollLeft = carousel.scrollLeft;
    const activeIndex = Math.round(scrollLeft / slideWidth);
    
    const dots = carousel.parentElement.querySelectorAll('.carousel-dot');
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === activeIndex);
    });
}

// ============================================================
// SECTION 29: LOAD FOOTER
// ============================================================
async function kmcaLoadFooter() {
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
                    ${data.mawasiliano ? `<p>${kmcaEscape(data.mawasiliano)}</p>` : ''}
                    ${data.email ? `<p>📧 ${kmcaEscape(data.email)}</p>` : ''}
                    ${data.phone ? `<p>📞 ${kmcaEscape(data.phone)}</p>` : ''}
                    <p class="copyright">
                        <i class="fas fa-church"></i>
                        ${kmcaEscape(data.copyright || '© 2026 KMCA - Kwaya ya Vijana Mtakatifu Carlo Acutis')}
                    </p>
                </div>
            `;
        } else {
            footer.innerHTML = `
                <div class="footer-content">
                    <p class="copyright">
                        <i class="fas fa-church"></i>
                        © 2026 KMCA - Kwaya ya Vijana Mtakatifu Carlo Acutis
                    </p>
                </div>
            `;
        }
    } catch (e) {}
}

// ============================================================
// SECTION 30: HELPERS
// ============================================================
function kmcaEscape(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function kmcaEscapeAttr(text) {
    if (!text) return '';
    return String(text)
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .substring(0, 500);
}

function kmcaInitials(jina) {
    if (!jina) return '??';
    const names = jina.trim().replace(/\s+/g, ' ').split(' ');
    if (names.length >= 2) return (names[0].charAt(0) + names[1].charAt(0)).toUpperCase();
    if (names.length === 1 && names[0].length >= 2) return names[0].substring(0, 2).toUpperCase();
    return '??';
}

function kmcaGetTimeAgo(dateString) {
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

function kmcaToast(message, type = 'success') {
    if (typeof showToast === 'function') {
        showToast(message, type);
        return;
    }
    
    const oldToast = document.querySelector('.kmca-home-toast');
    if (oldToast) oldToast.remove();
    
    const colors = { success: '#10b981', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
    
    const toast = document.createElement('div');
    toast.className = 'kmca-home-toast';
    toast.style.cssText = `
        position: fixed;
        top: 70px;
        left: 50%;
        transform: translateX(-50%) translateY(-100px);
        background: ${colors[type] || colors.info};
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
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i> ${message}`;
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

// ============================================================
// SECTION 31: EXPORT GLOBAL
// ============================================================
window.kmcaToast = kmcaToast;
window.kmcaDeleteComment = kmcaDeleteComment;
window.kmcaLoadAndRenderComments = kmcaLoadAndRenderComments;
window.kmcaViewMatukio = kmcaViewMatukio;
window.kmcaShareMatukio = kmcaShareMatukio;
window.kmcaSharePoll = kmcaSharePoll;
window.kmcaCopyComment = kmcaCopyComment;
window.kmcaCopyShareLink = kmcaCopyShareLink;
window.kmcaShareAsText = kmcaShareAsText;
window.kmcaInsertEmoji = kmcaInsertEmoji;
window.kmcaToggleEmojiPicker = kmcaToggleEmojiPicker;
window.kmcaReplyToComment = kmcaReplyToComment;