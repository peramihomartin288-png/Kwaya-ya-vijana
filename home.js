// ============================================
// KMCA PRO - HOME PAGE
// Push Notifications + Badge + Real-time
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const user = getCurrentUser();
    
    if (!user) {
        window.location.href = 'register.html';
        return;
    }
    
    initializeHome(user);
});

let currentMtakatifu = null;
let currentShareData = null;
let isPageVisible = true;

async function initializeHome(user) {
    updateMenuUserInfo(user);
    
    await loadAppLogo();
    await loadAppName();
    await loadMtakatifuWaSiku();
    await loadBibleVerse();
    await loadWimboWaSiku();
    await loadMasomoDominica();
    await loadEvents();
    await loadPolls(user);
    await loadPosts(user);
    await loadNotifications();
    await loadFooter();
    
    setupHomeEventListeners(user);
    subscribeToNotifications();
    
    // Request notification permission
    await requestNotificationPermission();
    
    // Auto-archive
    runAutoArchive();
    
    trackUserActivity('login', 'User ameingia');
}

async function runAutoArchive() {
    try {
        await supabaseClient.rpc('run_all_daily_cycles');
    } catch (e) {}
}

async function trackUserActivity(activityType, activityDetails) {
    const user = getCurrentUser();
    if (!user) return;
    
    try {
        await supabaseClient
            .from('user_activities')
            .insert([{
                user_id: user.id,
                activity_type: activityType,
                activity_details: activityDetails || null
            }]);
    } catch (error) {}
}

// ============================================
// PUSH NOTIFICATIONS FUNCTIONS
// ============================================

async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.log('Notifications not supported');
        return 'unsupported';
    }
    
    if (Notification.permission === 'granted') {
        console.log('Notification permission already granted');
        return 'granted';
    }
    
    if (Notification.permission === 'denied') {
        console.log('Notification permission denied');
        return 'denied';
    }
    
    try {
        const permission = await Notification.requestPermission();
        console.log('Notification permission:', permission);
        return permission;
    } catch (error) {
        console.error('Error requesting permission:', error);
        return 'denied';
    }
}

function showPushNotification(title, body, url) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
        return;
    }
    
    const options = {
        body: body || '',
        icon: './logo.png',
        badge: './logo.png',
        vibrate: [100, 50, 100],
        data: { url: url || './home.html' },
        tag: 'kmca-' + Date.now(),
        renotify: true
    };
    
    // Try service worker notification
    if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then(function(registration) {
            registration.showNotification(title, options);
        }).catch(function() {
            // Fallback
            try {
                new Notification(title, options);
            } catch (e) {}
        });
    } else {
        try {
            new Notification(title, options);
        } catch (e) {}
    }
}

function setAppBadge(count) {
    if ('setAppBadge' in navigator) {
        navigator.setAppBadge(count).catch(function() {});
    }
    
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            type: 'SET_BADGE',
            count: count
        });
    }
}

function clearAppBadge() {
    if ('clearAppBadge' in navigator) {
        navigator.clearAppBadge().catch(function() {});
    }
    
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            type: 'CLEAR_BADGE'
        });
    }
}

// ============================================
// UPDATE MENU USER INFO
// ============================================
function updateMenuUserInfo(user) {
    const avatarText = generateAvatar(user.jina);
    document.getElementById('menuAvatar').textContent = avatarText;
    document.getElementById('menuUserName').textContent = user.jina.split(' ')[0];
    
    document.getElementById('profileAvatar').textContent = avatarText;
    document.getElementById('profileName').textContent = user.jina;
    document.getElementById('profilePhone').textContent = user.phone;
    document.getElementById('profileMiaka').textContent = user.miaka ? 'Miaka: ' + user.miaka : 'Miaka: N/A';
    document.getElementById('profileParokia').textContent = user.parokia ? 'Parokia: ' + user.parokia : 'Parokia: N/A';
    document.getElementById('profileJimbo').textContent = user.jimbo ? 'Jimbo: ' + user.jimbo : 'Jimbo: N/A';
    
    loadUserBadgeAndPoints(user.id);
}

function generateAvatar(jina) {
    const names = jina.trim().split(/\s+/);
    if (names.length >= 2) return (names[0][0] + names[1][0]).toUpperCase();
    if (names.length === 1 && names[0].length >= 2) return names[0].substring(0, 2).toUpperCase();
    return '??';
}

// ============================================
// LOAD FUNCTIONS
// ============================================

async function loadAppLogo() {
    try {
        const { data } = await supabaseClient
            .from('app_settings')
            .select('*')
            .eq('setting_key', 'intro_logo');
        
        if (data && data.length > 0 && data[0].setting_value) {
            document.getElementById('headerLogo').src = data[0].setting_value;
            document.getElementById('headerLogo').style.display = 'block';
        }
    } catch (e) {}
}

async function loadAppName() {
    try {
        const { data } = await supabaseClient
            .from('app_settings')
            .select('*')
            .eq('setting_key', 'app_name');
        
        if (data && data.length > 0) {
            document.getElementById('headerAppName').textContent = data[0].setting_value;
        }
    } catch (e) {}
}

async function loadMtakatifuWaSiku() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const { data } = await supabaseClient
            .from('watakatifu')
            .select('*')
            .eq('sikukuu', today)
            .limit(1);
        
        const card = document.getElementById('mtakatifuCard');
        
        if (data && data.length > 0) {
            const mtakatifu = data[0];
            currentMtakatifu = mtakatifu;
            
            document.getElementById('mtakatifuJina').textContent = mtakatifu.jina;
            document.getElementById('mtakatifuSikukuu').textContent = 'Sikukuu: ' + formatDate(mtakatifu.sikukuu);
            document.getElementById('mtakatifuHistoria').textContent = mtakatifu.historia ? mtakatifu.historia.substring(0, 80) + '...' : '';
            
            const icon = document.getElementById('mtakatifuIcon');
            if (mtakatifu.picha_file) {
                icon.innerHTML = '<img src="' + mtakatifu.picha_file + '" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" loading="lazy">';
            } else {
                icon.innerHTML = '<i class="fas fa-cross"></i>';
            }
            
            document.getElementById('somaZaidiBtn').style.display = 'block';
            card.style.display = 'block';
            
            trackUserActivity('view_mtakatifu', 'Amesoma mtakatifu');
        } else {
            card.style.display = 'none';
        }
    } catch (e) {}
}

function openMtakatifuFullImage() {
    if (!currentMtakatifu || !currentMtakatifu.picha_file) return;
    
    document.getElementById('fullscreenCarousel').innerHTML = '<div class="fullscreen-slide"><img src="' + currentMtakatifu.picha_file + '"></div>';
    document.getElementById('fullscreenPrev').style.display = 'none';
    document.getElementById('fullscreenNext').style.display = 'none';
    document.getElementById('fullscreenImageModal').style.display = 'flex';
}

function openMtakatifuDetails() {
    if (!currentMtakatifu) return;
    const mtakatifu = currentMtakatifu;
    
    document.getElementById('mtakatifuDetailsContent').innerHTML = '' +
        '<div class="mtakatifu-details-jina">' + mtakatifu.jina + '</div>' +
        (mtakatifu.historia ? '<div class="mtakatifu-section"><div class="mtakatifu-section-heading"><i class="fas fa-scroll"></i> HISTORIA</div><div class="mtakatifu-section-content">' + mtakatifu.historia + '</div></div>' : '') +
        (mtakatifu.sala ? '<div class="mtakatifu-section"><div class="mtakatifu-section-heading"><i class="fas fa-praying-hands"></i> SALA</div><div class="mtakatifu-section-content">' + mtakatifu.sala + '</div></div>' : '') +
        (mtakatifu.miujiza ? '<div class="mtakatifu-section"><div class="mtakatifu-section-heading"><i class="fas fa-star"></i> MIUJIZA</div><div class="mtakatifu-section-content">' + mtakatifu.miujiza + '</div></div>' : '');
    
    document.getElementById('mtakatifuDetailsModal').style.display = 'flex';
}

async function loadBibleVerse() {
    try {
        const { data } = await supabaseClient
            .from('bible_verses')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);
        
        if (data && data.length > 0) {
            document.getElementById('bibleKichwa').textContent = data[0].kichwa;
            document.getElementById('bibleText').textContent = data[0].verse_text;
            document.getElementById('bibleReference').textContent = data[0].reference;
            document.getElementById('bibleFunzo').textContent = data[0].funzo;
        }
    } catch (e) {}
}

async function loadWimboWaSiku() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const { data } = await supabaseClient
            .from('nyimbo_za_siku')
            .select('*')
            .eq('tarehe', today)
            .limit(1);
        
        const card = document.getElementById('wimboCard');
        
        if (data && data.length > 0) {
            const wimbo = data[0];
            document.getElementById('wimboJina').textContent = wimbo.jina;
            document.getElementById('wimboMaelezo').textContent = wimbo.maelezo || '';
            
            const mediaDiv = document.getElementById('wimboMedia');
            if (wimbo.media_type === 'video') {
                mediaDiv.innerHTML = '<video controls style="width: 100%; border-radius: 12px;" preload="metadata"><source src="' + wimbo.media_file + '" type="video/mp4"></video>';
            } else {
                mediaDiv.innerHTML = '<audio controls style="width: 100%;" preload="metadata"><source src="' + wimbo.media_file + '" type="audio/mpeg"></audio>';
            }
            
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    } catch (e) {}
}

async function loadMasomoDominica() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const { data } = await supabaseClient
            .from('masomo_dominica')
            .select('*')
            .or('tarehe_jumapili.eq.' + today + ',tarehe_jumapili.eq.' + tomorrow)
            .limit(1);
        
        const button = document.getElementById('masomoButton');
        const card = document.getElementById('masomoCard');
        
        if (data && data.length > 0) {
            const somo = data[0];
            document.getElementById('masomoButtonIcon').textContent = getDominikaIcon(somo.jina_dominika);
            document.getElementById('masomoButtonText').textContent = somo.jina_dominika;
            
            button.style.display = 'flex';
            card.style.display = 'none';
            
            document.getElementById('masomoContent').innerHTML = '' +
                '<div class="mtakatifu-section"><div class="mtakatifu-section-heading"><i class="fas fa-book"></i> SOMO LA 1</div><div class="mtakatifu-section-content">' + somo.somo_1 + '</div></div>' +
                (somo.wimbo_katikati ? '<div class="mtakatifu-section"><div class="mtakatifu-section-heading"><i class="fas fa-music"></i> WIMBO WA KATIKATI</div><div class="mtakatifu-section-content">' + somo.wimbo_katikati + '</div></div>' : '') +
                '<div class="mtakatifu-section"><div class="mtakatifu-section-heading"><i class="fas fa-book"></i> SOMO LA 2</div><div class="mtakatifu-section-content">' + somo.somo_2 + '</div></div>' +
                (somo.shangilio ? '<div class="mtakatifu-section"><div class="mtakatifu-section-heading"><i class="fas fa-pray"></i> SHANGILIO</div><div class="mtakatifu-section-content">' + somo.shangilio + '</div></div>' : '') +
                '<div class="mtakatifu-section"><div class="mtakatifu-section-heading"><i class="fas fa-cross"></i> INJILI</div><div class="mtakatifu-section-content">' + somo.injili + '</div></div>';
        } else {
            button.style.display = 'none';
            card.style.display = 'none';
        }
    } catch (e) {}
}

function getDominikaIcon(jina) {
    const match = jina.match(/\d+/);
    if (match) return match[0];
    if (jina.includes('Pasaka')) return '✝️';
    if (jina.includes('Pentekoste')) return '🕊️';
    if (jina.includes('Kristo Mfalme')) return '👑';
    return '📖';
}

function toggleMasomo() {
    const card = document.getElementById('masomoCard');
    const chevron = document.getElementById('masomoChevron');
    
    if (card.style.display === 'none' || card.style.display === '') {
        card.style.display = 'block';
        chevron.className = 'fas fa-chevron-up';
    } else {
        card.style.display = 'none';
        chevron.className = 'fas fa-chevron-down';
    }
}

async function loadEvents() {
    try {
        const { data } = await supabaseClient
            .from('matukio')
            .select('*')
            .order('tarehe', { ascending: true });
        
        if (data && data.length > 0) {
            document.getElementById('eventsSection').style.display = 'block';
            const list = document.getElementById('eventsList');
            list.innerHTML = '';
            
            data.forEach(function(event) {
                const card = document.createElement('div');
                card.className = 'event-card';
                card.innerHTML = '<div class="event-date">' + formatDate(event.tarehe) + '</div><div class="event-info"><h4>' + event.jina + '</h4></div>';
                list.appendChild(card);
            });
        }
    } catch (e) {}
}

async function loadPolls(user) {
    // Poll code ilivyo
}

async function loadPosts(user) {
    try {
        const { data } = await supabaseClient
            .from('posts')
            .select('*')
            .order('created_at', { ascending: false });
        
        const feed = document.getElementById('postsFeed');
        feed.innerHTML = '';
        
        if (!data || data.length === 0) {
            feed.innerHTML = '<p class="no-data">Hakuna posts bado</p>';
            return;
        }
        
        for (const post of data) {
            const card = await createPostCard(post, user);
            feed.appendChild(card);
        }
    } catch (e) {}
}

function openFullscreenImage(images, index) {
    const modal = document.getElementById('fullscreenImageModal');
    const carousel = document.getElementById('fullscreenCarousel');
    let current = index || 0;
    
    function render() {
        carousel.innerHTML = '';
        images.forEach(function(img, i) {
            const slide = document.createElement('div');
            slide.className = 'fullscreen-slide';
            slide.innerHTML = '<img src="' + img + '" loading="lazy">';
            carousel.appendChild(slide);
        });
        update();
    }
    
    function update() {
        const slides = carousel.querySelectorAll('.fullscreen-slide');
        slides.forEach(function(slide, i) {
            slide.style.display = i === current ? 'block' : 'none';
        });
    }
    
    render();
    
    document.getElementById('fullscreenPrev').style.display = images.length > 1 ? 'block' : 'none';
    document.getElementById('fullscreenNext').style.display = images.length > 1 ? 'block' : 'none';
    
    document.getElementById('fullscreenPrev').onclick = function() {
        current = current > 0 ? current - 1 : images.length - 1;
        update();
    };
    
    document.getElementById('fullscreenNext').onclick = function() {
        current = current < images.length - 1 ? current + 1 : 0;
        update();
    };
    
    modal.style.display = 'flex';
}

function openShareModal(title, text, url) {
    currentShareData = { title: title, text: text, url: url };
    document.getElementById('shareModalText').textContent = title;
    document.getElementById('shareModal').style.display = 'flex';
}

function shareToWhatsApp(title, text, url) {
    window.open('https://wa.me/?text=' + encodeURIComponent(title + '\n\n' + (text || '') + '\n\n' + url), '_blank');
}

function shareToFacebook(title, text, url) {
    window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url), '_blank');
}

function shareToInstagram(title, text, url) {
    navigator.clipboard.writeText(title + ' ' + url).then(function() {
        alert('Link imenakiliwa! Bandika kwenye Instagram');
    });
}

async function createPostCard(post, user) {
    const card = document.createElement('div');
    card.className = 'post-card';
    card.id = 'post-' + post.id;
    
    let mediaHTML = '';
    
    if (post.type === 'picha_moja' || post.type === 'picha_music') {
        if (post.media_files && post.media_files.length > 0) {
            mediaHTML = '<div class="full-width-media"><img src="' + post.media_files[0] + '" class="clickable-image" data-images=\'' + JSON.stringify(post.media_files) + '\' data-index="0" loading="lazy">' +
                (post.audio_file ? '<button class="music-icon-btn" id="music-btn-' + post.id + '"><i class="fas fa-music"></i></button><audio id="audio-' + post.id + '" src="' + post.audio_file + '" loop style="display:none;"></audio>' : '') + '</div>';
        }
    } else if (post.type === 'picha_nyingi' || post.type === 'picha_nyingi_music') {
        if (post.media_files && post.media_files.length > 0) {
            let imagesHTML = '';
            post.media_files.forEach(function(img, i) {
                imagesHTML += '<div class="carousel-slide"><img src="' + img + '" class="clickable-image" data-images=\'' + JSON.stringify(post.media_files) + '\' data-index="' + i + '" loading="lazy"></div>';
            });
            mediaHTML = '<div class="carousel"><div class="carousel-container">' + imagesHTML + '</div>' +
                '<button class="carousel-prev"><i class="fas fa-chevron-left"></i></button>' +
                '<button class="carousel-next"><i class="fas fa-chevron-right"></i></button>' +
                (post.audio_file ? '<button class="music-icon-btn" id="music-btn-' + post.id + '"><i class="fas fa-music"></i></button><audio id="audio-' + post.id + '" src="' + post.audio_file + '" loop style="display:none;"></audio>' : '') + '</div>';
        }
    } else if (post.type === 'video') {
        if (post.media_files && post.media_files.length > 0) {
            mediaHTML = '<div class="full-width-media"><video controls src="' + post.media_files[0] + '" preload="metadata"></video></div>';
        }
    } else if (post.type === 'maneno') {
        mediaHTML = '<div class="text-only preserve-format">' + (post.link_file ? '<a href="' + post.link_file + '" target="_blank">' + post.link_file + '</a>' : '') + '</div>';
    } else if (post.type === 'other_file') {
        mediaHTML = '<div class="file-post"><i class="fas fa-file"></i><span>' + post.title + '</span><button class="btn-download-file" data-url="' + (post.media_files ? post.media_files[0] : '') + '"><i class="fas fa-download"></i> Download</button></div>';
    }
    
    const likesCount = await getCount('likes', post.id);
    const commentsCount = await getCount('comments', post.id);
    const sharesCount = await getCount('shares', post.id);
    const downloadsCount = await getCount('downloads', post.id);
    
    const { data: likedData } = await supabaseClient
        .from('likes')
        .select('id')
        .eq('user_id', user.id)
        .eq('post_id', post.id);
    
    const isLiked = likedData && likedData.length > 0;
    
    card.innerHTML = '' +
        '<div class="post-card-header"><div class="post-author-avatar">KM</div><div class="post-author-info"><h4>KMCA</h4><span>' + formatDate(post.created_at) + '</span></div></div>' +
        '<div class="post-card-body"><h3 class="post-title">' + post.title + '</h3>' +
        (post.description ? '<p class="post-description preserve-format">' + post.description + '</p>' : '') + mediaHTML + '</div>' +
        '<div class="post-card-actions">' +
        '<button class="action-btn like-btn ' + (isLiked ? 'liked' : '') + '"><i class="' + (isLiked ? 'fas' : 'far') + ' fa-heart"></i><span>' + likesCount + '</span></button>' +
        '<button class="action-btn comment-btn"><i class="far fa-comment"></i><span>' + commentsCount + '</span></button>' +
        '<button class="action-btn share-btn"><i class="far fa-share-square"></i><span>' + sharesCount + '</span></button>' +
        '<button class="action-btn download-btn"><i class="fas fa-download"></i><span>' + downloadsCount + '</span></button>' +
        '</div>' +
        '<div class="post-comments-section" id="comments-section-' + post.id + '" style="display:none;"><div id="comments-list-' + post.id + '"></div>' +
        '<div class="comment-input"><input type="text" id="comment-input-' + post.id + '" placeholder="Andika maoni..."><button class="comment-submit"><i class="fas fa-paper-plane"></i></button></div></div>';
    
    // Clickable images
    card.querySelectorAll('.clickable-image').forEach(function(img) {
        img.addEventListener('click', function() {
            openFullscreenImage(JSON.parse(this.getAttribute('data-images')), parseInt(this.getAttribute('data-index')));
        });
    });
    
    // Music
    if (post.audio_file) {
        const musicBtn = card.querySelector('#music-btn-' + post.id);
        const audio = card.querySelector('#audio-' + post.id);
        
        musicBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            if (audio.paused) {
                audio.play();
                musicBtn.style.background = '#d4af37';
                musicBtn.style.animation = 'pulse 1s infinite';
            } else {
                audio.pause();
                musicBtn.style.background = 'rgba(0,0,0,0.6)';
                musicBtn.style.animation = 'none';
            }
        });
    }
    
    // Like
    card.querySelector('.like-btn').addEventListener('click', async function() {
        const btn = this;
        const icon = btn.querySelector('i');
        const count = btn.querySelector('span');
        btn.disabled = true;
        
        const { data: liked } = await supabaseClient
            .from('likes')
            .select('id')
            .eq('user_id', user.id)
            .eq('post_id', post.id);
        
        if (liked && liked.length > 0) {
            await supabaseClient.from('likes').delete().eq('user_id', user.id).eq('post_id', post.id);
            btn.classList.remove('liked');
            icon.className = 'far fa-heart';
            count.textContent = Math.max(0, parseInt(count.textContent) - 1);
        } else {
            await supabaseClient.from('likes').insert([{ user_id: user.id, post_id: post.id }]);
            await supabaseClient.from('user_points').insert([{ user_id: user.id, action: 'like', points: 1 }]);
            btn.classList.add('liked');
            icon.className = 'fas fa-heart';
            count.textContent = parseInt(count.textContent) + 1;
        }
        
        btn.disabled = false;
    });
    
    // Comment
    card.querySelector('.comment-btn').addEventListener('click', async function() {
        const section = document.getElementById('comments-section-' + post.id);
        
        if (section.style.display === 'none' || section.style.display === '') {
            section.style.display = 'block';
            
            const { data: comments } = await supabaseClient
                .from('comments')
                .select('*, users(jina)')
                .eq('post_id', post.id)
                .order('created_at', { ascending: true });
            
            const list = document.getElementById('comments-list-' + post.id);
            list.innerHTML = '';
            
            if (comments && comments.length > 0) {
                comments.forEach(function(c) {
                    const item = document.createElement('div');
                    item.className = 'comment-item';
                    item.innerHTML = '<div class="comment-avatar">' + generateAvatar(c.users ? c.users.jina : '??') + '</div><div class="comment-content"><strong>' + (c.users ? c.users.jina : 'Unknown') + '</strong><p>' + c.content + '</p></div>';
                    list.appendChild(item);
                });
            } else {
                list.innerHTML = '<p class="no-comments">Hakuna maoni bado</p>';
            }
        } else {
            section.style.display = 'none';
        }
    });
    
    // Share
    card.querySelector('.share-btn').addEventListener('click', async function() {
        const count = this.querySelector('span');
        
        await supabaseClient.from('shares').insert([{ user_id: user.id, post_id: post.id }]);
        await supabaseClient.from('user_points').insert([{ user_id: user.id, action: 'share', points: 3 }]);
        count.textContent = parseInt(count.textContent) + 1;
        
        const shareLink = await getShareLink();
        openShareModal(post.title, post.description || '', shareLink);
    });
    
    // Download
    card.querySelector('.download-btn').addEventListener('click', async function() {
        const count = this.querySelector('span');
        
        await supabaseClient.from('downloads').insert([{ user_id: user.id, post_id: post.id }]);
        await supabaseClient.from('user_points').insert([{ user_id: user.id, action: 'download', points: 2 }]);
        count.textContent = parseInt(count.textContent) + 1;
        
        if (post.media_files && post.media_files.length > 0) {
            post.media_files.forEach(function(file) {
                const link = document.createElement('a');
                link.href = file;
                link.download = 'KMCA-' + post.title;
                link.click();
            });
        }
    });
    
    return card;
}

// ============================================
// AUTO-STOP MUSIC
// ============================================
window.addEventListener('scroll', function() {
    document.querySelectorAll('audio[id^="audio-"]').forEach(function(audio) {
        const postCard = audio.closest('.post-card');
        if (postCard) {
            const rect = postCard.getBoundingClientRect();
            if (rect.bottom < 0 || rect.top > window.innerHeight) {
                audio.pause();
                const postId = audio.id.replace('audio-', '');
                const btn = document.getElementById('music-btn-' + postId);
                if (btn) { btn.style.background = 'rgba(0,0,0,0.6)'; btn.style.animation = 'none'; }
            }
        }
    });
});

// ============================================
// VISIBILITY CHANGE
// ============================================
document.addEventListener('visibilitychange', function() {
    isPageVisible = !document.hidden;
    
    if (!isPageVisible) {
        document.querySelectorAll('audio').forEach(function(audio) {
            audio.pause();
        });
    }
});

// ============================================
// UTILITY FUNCTIONS
// ============================================
async function getShareLink() {
    try {
        const { data } = await supabaseClient
            .from('app_settings')
            .select('*')
            .eq('setting_key', 'share_link');
        if (data && data.length > 0 && data[0].setting_value) return data[0].setting_value;
    } catch (e) {}
    return window.location.origin;
}

async function getCount(table, postId) {
    try {
        const { count } = await supabaseClient
            .from(table)
            .select('*', { count: 'exact', head: true })
            .eq('post_id', postId);
        return count || 0;
    } catch (e) { return 0; }
}

async function loadNotifications() {
    try {
        const { data } = await supabaseClient
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
        
        const badge = document.getElementById('notificationBadge');
        if (data && data.length > 0) {
            badge.style.display = 'flex';
            badge.textContent = data.length;
            setAppBadge(data.length);
        } else {
            badge.style.display = 'none';
            clearAppBadge();
        }
    } catch (e) {}
}

async function loadFooter() {
    try {
        const { data } = await supabaseClient
            .from('footer')
            .select('*')
            .limit(1);
        
        if (data && data.length > 0) {
            document.getElementById('footerMawasiliano').textContent = 'Mawasiliano: ' + (data[0].mawasiliano || 'N/A');
            document.getElementById('footerEmail').textContent = 'Email: ' + (data[0].email || 'N/A');
            document.getElementById('footerCopyright').textContent = data[0].copyright || '';
        }
    } catch (e) {}
}

async function loadUserBadgeAndPoints(userId) {
    try {
        const { data: pointsData } = await supabaseClient
            .from('user_points')
            .select('points')
            .eq('user_id', userId);
        
        const total = pointsData ? pointsData.reduce(function(sum, p) { return sum + p.points; }, 0) : 0;
        document.getElementById('profilePoints').textContent = 'Pointi: ' + total;
    } catch (e) {}
}

// ============================================
// SETUP EVENTS
// ============================================
function setupHomeEventListeners(user) {
    document.getElementById('menuBtn').addEventListener('click', function() { document.getElementById('menuOverlay').style.display = 'flex'; });
    document.getElementById('menuClose').addEventListener('click', function() { document.getElementById('menuOverlay').style.display = 'none'; });
    
    document.getElementById('mtakatifuIcon').addEventListener('click', openMtakatifuFullImage);
    document.getElementById('somaZaidiBtn').addEventListener('click', openMtakatifuDetails);
    document.getElementById('mtakatifuDetailsClose').addEventListener('click', function() { document.getElementById('mtakatifuDetailsModal').style.display = 'none'; });
    
    document.getElementById('masomoButton').addEventListener('click', toggleMasomo);
    
    document.getElementById('fullscreenClose').addEventListener('click', function() { document.getElementById('fullscreenImageModal').style.display = 'none'; });
    
    document.getElementById('shareModalClose').addEventListener('click', function() { document.getElementById('shareModal').style.display = 'none'; });
    document.getElementById('shareModalWhatsApp').addEventListener('click', function() {
        if (currentShareData) { shareToWhatsApp(currentShareData.title, currentShareData.text, currentShareData.url); document.getElementById('shareModal').style.display = 'none'; }
    });
    document.getElementById('shareModalFacebook').addEventListener('click', function() {
        if (currentShareData) { shareToFacebook(currentShareData.title, currentShareData.text, currentShareData.url); document.getElementById('shareModal').style.display = 'none'; }
    });
    document.getElementById('shareModalInstagram').addEventListener('click', function() {
        if (currentShareData) { shareToInstagram(currentShareData.title, currentShareData.text, currentShareData.url); document.getElementById('shareModal').style.display = 'none'; }
    });
    
    // Notifications
    document.getElementById('notificationBtn').addEventListener('click', async function() {
        document.getElementById('notificationsOverlay').style.display = 'flex';
        
        const { data } = await supabaseClient
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
        
        const list = document.getElementById('notificationsList');
        list.innerHTML = '';
        
        if (data && data.length > 0) {
            data.forEach(function(n) {
                const item = document.createElement('div');
                item.className = 'notification-item';
                item.innerHTML = '<i class="fas fa-bell"></i><div><strong>' + n.title + '</strong><p>' + (n.content || '') + '</p><span>' + formatDate(n.created_at) + '</span></div>';
                list.appendChild(item);
            });
            
            for (const n of data) {
                await supabaseClient.from('notifications').delete().eq('id', n.id);
            }
            
            document.getElementById('notificationBadge').style.display = 'none';
            clearAppBadge();
        } else {
            list.innerHTML = '<p class="no-data">Hakuna notifications</p>';
            document.getElementById('notificationBadge').style.display = 'none';
            clearAppBadge();
        }
    });
    document.getElementById('notificationsClose').addEventListener('click', function() { document.getElementById('notificationsOverlay').style.display = 'none'; });
    
    // Menu
    document.getElementById('menuProfile').addEventListener('click', function() { document.getElementById('menuOverlay').style.display = 'none'; document.getElementById('profileModal').style.display = 'flex'; });
    document.getElementById('menuSettings').addEventListener('click', function() { document.getElementById('menuOverlay').style.display = 'none'; document.getElementById('settingsModal').style.display = 'flex'; });
    document.getElementById('menuHistory').addEventListener('click', function() { window.location.href = 'history.html'; });
    document.getElementById('menuQuestion').addEventListener('click', function() { document.getElementById('menuOverlay').style.display = 'none'; document.getElementById('questionModal').style.display = 'flex'; });
    document.getElementById('menuAbout').addEventListener('click', async function() { document.getElementById('menuOverlay').style.display = 'none'; document.getElementById('aboutModal').style.display = 'flex'; await loadAbout(); });
    document.getElementById('menuWatakatifu').addEventListener('click', async function() { document.getElementById('menuOverlay').style.display = 'none'; document.getElementById('watakatifuModal').style.display = 'flex'; await loadWatakatifuList(); });
    document.getElementById('menuLeaderboard').addEventListener('click', async function() { document.getElementById('menuOverlay').style.display = 'none'; document.getElementById('leaderboardModal').style.display = 'flex'; await loadLeaderboard(); });
    document.getElementById('menuLogout').addEventListener('click', function() { localStorage.removeItem('kmca_user'); window.location.href = 'index.html'; });
    
    // Modal close
    document.getElementById('profileClose').addEventListener('click', function() { document.getElementById('profileModal').style.display = 'none'; });
    document.getElementById('settingsClose').addEventListener('click', function() { document.getElementById('settingsModal').style.display = 'none'; });
    document.getElementById('questionClose').addEventListener('click', function() { document.getElementById('questionModal').style.display = 'none'; });
    document.getElementById('aboutClose').addEventListener('click', function() { document.getElementById('aboutModal').style.display = 'none'; });
    document.getElementById('watakatifuClose').addEventListener('click', function() { document.getElementById('watakatifuModal').style.display = 'none'; });
    document.getElementById('leaderboardClose').addEventListener('click', function() { document.getElementById('leaderboardModal').style.display = 'none'; });
}

// ============================================
// SUBSCRIBE TO NOTIFICATIONS (REAL-TIME)
// ============================================
function subscribeToNotifications() {
    supabaseClient
        .channel('notifications-realtime')
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'notifications' 
        }, function(payload) {
            const notification = payload.new;
            
            // Update badge
            loadNotifications();
            
            // Show push notification
            showPushNotification(
                notification.title,
                notification.content || '',
                './home.html'
            );
            
            // Set badge
            setAppBadge(1);
        })
        .subscribe();
}

// ============================================
// FORMAT DATE
// ============================================
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('sw-TZ', { day: 'numeric', month: 'short', year: 'numeric' });
}