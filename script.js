// ============================================
// KMCA - MAIN SCRIPT
// ============================================

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', function() {
    // Check if user exists
    const user = getCurrentUser();
    
    if (!user) {
        window.location.href = 'register.html';
        return;
    }
    
    // Initialize home page
    initializeHomePage();
});

// ========== INITIALIZE HOME PAGE ==========
async function initializeHomePage() {
    const user = getCurrentUser();
    
    // Update menu user info
    updateMenuUserInfo(user);
    
    // Load all data
    await Promise.all([
        loadBibleVerse(),
        loadEvents(),
        loadPolls(),
        loadPosts(),
        loadNotifications(),
        loadFooter()
    ]);
    
    // Setup event listeners
    setupEventListeners();
}

// ========== UPDATE MENU USER INFO ==========
function updateMenuUserInfo(user) {
    // Generate avatar
    const avatarText = generateAvatar(user.jina);
    document.getElementById('menuAvatar').textContent = avatarText;
    document.getElementById('menuUserName').textContent = user.jina.split(' ')[0];
    
    // Set badge (default Mgeni)
    document.getElementById('menuUserBadge').textContent = 'Mgeni';
}

// ========== GENERATE AVATAR ==========
function generateAvatar(jina) {
    const names = jina.trim().split(/\s+/);
    
    if (names.length >= 2) {
        return (names[0][0] + names[1][0]).toUpperCase();
    } else if (names.length === 1 && names[0].length >= 2) {
        return names[0].substring(0, 2).toUpperCase();
    }
    
    return '??';
}

// ========== LOAD BIBLE VERSE ==========
async function loadBibleVerse() {
    const result = await fetchBibleVerse();
    
    if (result.success && result.data) {
        document.getElementById('bibleKichwa').textContent = result.data.kichwa;
        document.getElementById('bibleText').textContent = result.data.verse_text;
        document.getElementById('bibleReference').textContent = result.data.reference;
        document.getElementById('bibleFunzo').textContent = result.data.funzo;
    }
}

// ========== LOAD EVENTS ==========
async function loadEvents() {
    const result = await fetchEvents();
    
    if (result.success && result.data && result.data.length > 0) {
        document.getElementById('eventsSection').style.display = 'block';
        
        const eventsList = document.getElementById('eventsList');
        eventsList.innerHTML = '';
        
        result.data.forEach(event => {
            const eventCard = document.createElement('div');
            eventCard.className = 'event-card';
            
            eventCard.innerHTML = `
                <div class="event-date">
                    <span class="event-day">${formatDate(event.tarehe)}</span>
                </div>
                <div class="event-info">
                    <h4>${event.jina}</h4>
                    <p><i class="fas fa-clock"></i> ${event.muda || 'Muda: N/A'}</p>
                    <p><i class="fas fa-map-marker-alt"></i> ${event.mahali || 'Mahali: N/A'}</p>
                    ${event.maelezo ? `<p class="event-description">${event.maelezo}</p>` : ''}
                </div>
            `;
            
            eventsList.appendChild(eventCard);
        });
    }
}

// ========== FORMAT DATE ==========
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('sw-TZ', options);
}

// ========== LOAD POLLS ==========
async function loadPolls() {
    const result = await fetchPolls();
    
    if (result.success && result.data && result.data.length > 0) {
        document.getElementById('pollsSection').style.display = 'block';
        
        const pollsList = document.getElementById('pollsList');
        pollsList.innerHTML = '';
        
        const activePolls = result.data.filter(poll => new Date(poll.tarehe_ya_mwisho) > new Date());
        
        activePolls.forEach(async poll => {
            const pollCard = document.createElement('div');
            pollCard.className = 'poll-card';
            
            const optionsResult = await fetchPollOptions(poll.id);
            
            let optionsHTML = '';
            
            if (optionsResult.success && optionsResult.data) {
                optionsResult.data.forEach(option => {
                    optionsHTML += `
                        <button class="poll-option" data-poll-id="${poll.id}" data-option-id="${option.id}">
                            ${option.chaguo}
                        </button>
                    `;
                });
            }
            
            pollCard.innerHTML = `
                <h4>${poll.swali}</h4>
                <div class="poll-options">
                    ${optionsHTML}
                </div>
            `;
            
            pollsList.appendChild(pollCard);
        });
        
        // Add event listeners to poll options
        document.querySelectorAll('.poll-option').forEach(button => {
            button.addEventListener('click', function() {
                const pollId = this.dataset.pollId;
                const optionId = this.dataset.optionId;
                votePoll(pollId, optionId);
            });
        });
    }
}

// ========== VOTE POLL ==========
async function votePoll(pollId, optionId) {
    const user = getCurrentUser();
    
    if (!user) {
        window.location.href = 'register.html';
        return;
    }
    
    try {
        const { data, error } = await supabase
            .from('poll_votes')
            .insert([{
                user_id: user.id,
                poll_id: pollId,
                option_id: optionId
            }]);
        
        if (error) {
            if (error.code === '23505') {
                alert('Tayari umeshapiga kura!');
            } else {
                throw error;
            }
        } else {
            alert('Kura yako imepokelewa!');
            loadPolls();
        }
    } catch (error) {
        console.error('Error voting:', error);
    }
}

// ========== LOAD POSTS ==========
async function loadPosts() {
    const result = await fetchPosts();
    
    if (result.success && result.data) {
        const postsFeed = document.getElementById('postsFeed');
        postsFeed.innerHTML = '';
        
        const user = getCurrentUser();
        
        result.data.forEach(async post => {
            const postCard = await createPostCard(post, user);
            postsFeed.appendChild(postCard);
        });
    }
}

// ========== CREATE POST CARD ==========
async function createPostCard(post, user) {
    const postCard = document.createElement('div');
    postCard.className = 'post-card';
    postCard.id = `post-${post.id}`;
    
    // Determine post type
    let mediaHTML = '';
    
    if (post.type === 'picha_moja' || post.type === 'picha_music') {
        if (post.media_files && post.media_files.length > 0) {
            mediaHTML = `
                <div class="post-media single-image">
                    <img src="${post.media_files[0]}" alt="${post.title}">
                    <div class="watermark-name">KMCA</div>
                    <div class="watermark-logo"><i class="fas fa-church"></i></div>
                </div>
            `;
        }
    } else if (post.type === 'picha_nyingi' || post.type === 'picha_nyingi_music') {
        if (post.media_files && post.media_files.length > 0) {
            let imagesHTML = '';
            
            post.media_files.forEach((image, index) => {
                imagesHTML += `
                    <div class="carousel-slide">
                        <img src="${image}" alt="${post.title} - ${index + 1}">
                        <div class="watermark-name">KMCA</div>
                        <div class="watermark-logo"><i class="fas fa-church"></i></div>
                    </div>
                `;
            });
            
            mediaHTML = `
                <div class="post-media carousel">
                    <div class="carousel-container">
                        ${imagesHTML}
                    </div>
                    <button class="carousel-prev"><i class="fas fa-chevron-left"></i></button>
                    <button class="carousel-next"><i class="fas fa-chevron-right"></i></button>
                </div>
            `;
        }
    } else if (post.type === 'video') {
        if (post.media_files && post.media_files.length > 0) {
            mediaHTML = `
                <div class="post-media video">
                    <video controls>
                        <source src="${post.media_files[0]}" type="video/mp4">
                        Your browser does not support the video tag.
                    </video>
                </div>
            `;
        }
    } else if (post.type === 'maneno') {
        mediaHTML = `
            <div class="post-media text-only">
                ${post.link_file ? `<a href="${post.link_file}" target="_blank" class="post-link">${post.link_file}</a>` : ''}
            </div>
        `;
    }
    
    // Audio player
    let audioHTML = '';
    if (post.audio_file) {
        audioHTML = `
            <div class="post-audio">
                <audio controls>
                    <source src="${post.audio_file}" type="audio/mpeg">
                    Your browser does not support the audio tag.
                </audio>
            </div>
        `;
    }
    
    // Get counts
    const likesCount = await getCount('likes', post.id);
    const commentsCount = await getCount('comments', post.id);
    const sharesCount = await getCount('shares', post.id);
    const downloadsCount = await getCount('downloads', post.id);
    
    // Check if user liked
    const likedResult = await checkIfLiked(post.id, user.id);
    const isLiked = likedResult.success && likedResult.liked;
    
    postCard.innerHTML = `
        <div class="post-card-header">
            <div class="post-author-avatar">KM</div>
            <div class="post-author-info">
                <h4>KMCA</h4>
                <span>${formatDate(post.created_at)}</span>
            </div>
        </div>
        
        <div class="post-card-body">
            <h3 class="post-title">${post.title}</h3>
            ${post.description ? `<p class="post-description">${post.description}</p>` : ''}
            ${mediaHTML}
            ${audioHTML}
        </div>
        
        <div class="post-card-actions">
            <button class="action-btn like-btn ${isLiked ? 'liked' : ''}" data-post-id="${post.id}">
                <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>
                <span class="action-count">${likesCount}</span>
            </button>
            
            <button class="action-btn comment-btn" data-post-id="${post.id}">
                <i class="far fa-comment"></i>
                <span class="action-count">${commentsCount}</span>
            </button>
            
            <button class="action-btn share-btn" data-post-id="${post.id}">
                <i class="far fa-share-square"></i>
                <span class="action-count">${sharesCount}</span>
            </button>
            
            <button class="action-btn download-btn" data-post-id="${post.id}">
                <i class="fas fa-download"></i>
                <span class="action-count">${downloadsCount}</span>
            </button>
        </div>
        
        <div class="post-comments-section" id="comments-section-${post.id}" style="display: none;">
            <div class="comments-list" id="comments-list-${post.id}"></div>
            <div class="comment-input">
                <input type="text" id="comment-input-${post.id}" placeholder="Andika maoni...">
                <button class="comment-submit" data-post-id="${post.id}">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
        </div>
    `;
    
    // Add event listeners to post card
    postCard.querySelector('.like-btn').addEventListener('click', () => toggleLike(post.id, user.id));
    postCard.querySelector('.comment-btn').addEventListener('click', () => toggleComments(post.id));
    postCard.querySelector('.share-btn').addEventListener('click', () => sharePostHandler(post.id));
    postCard.querySelector('.download-btn').addEventListener('click', () => downloadPost(post.id, post));
    
    if (postCard.querySelector('.comment-submit')) {
        postCard.querySelector('.comment-submit').addEventListener('click', () => submitComment(post.id, user.id));
    }
    
    // Initialize carousel if multiple images
    if (post.type === 'picha_nyingi' || post.type === 'picha_nyingi_music') {
        initializeCarousel(postCard);
    }
    
    return postCard;
}

// ========== GET COUNT ==========
async function getCount(table, postId) {
    try {
        const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true })
            .eq('post_id', postId);
        
        if (error) throw error;
        return count || 0;
    } catch (error) {
        console.error(`Error getting ${table} count:`, error);
        return 0;
    }
}

// ========== TOGGLE LIKE ==========
async function toggleLike(postId, userId) {
    const likedResult = await checkIfLiked(postId, userId);
    
    if (likedResult.success && likedResult.liked) {
        await unlikePost(postId, userId);
    } else {
        await likePost(postId, userId);
    }
    
    // Reload posts
    loadPosts();
}

// ========== TOGGLE COMMENTS ==========
function toggleComments(postId) {
    const commentsSection = document.getElementById(`comments-section-${postId}`);
    
    if (commentsSection.style.display === 'none') {
        commentsSection.style.display = 'block';
        loadComments(postId);
    } else {
        commentsSection.style.display = 'none';
    }
}

// ========== LOAD COMMENTS ==========
async function loadComments(postId) {
    const result = await fetchComments(postId);
    
    if (result.success && result.data) {
        const commentsList = document.getElementById(`comments-list-${postId}`);
        commentsList.innerHTML = '';
        
        result.data.forEach(comment => {
            const commentItem = document.createElement('div');
            commentItem.className = 'comment-item';
            
            commentItem.innerHTML = `
                <div class="comment-avatar">${generateAvatar(comment.users?.jina || '??')}</div>
                <div class="comment-content">
                    <strong>${comment.users?.jina || 'Unknown'}</strong>
                    <p>${comment.content}</p>
                </div>
            `;
            
            commentsList.appendChild(commentItem);
        });
    }
}

// ========== SUBMIT COMMENT ==========
async function submitComment(postId, userId) {
    const input = document.getElementById(`comment-input-${postId}`);
    const content = input.value.trim();
    
    if (!content) return;
    
    const result = await addComment(postId, userId, content);
    
    if (result.success) {
        input.value = '';
        loadComments(postId);
    }
}

// ========== SHARE POST ==========
async function sharePostHandler(postId) {
    const user = getCurrentUser();
    const postLink = `${window.location.origin}/home.html?post=${postId}`;
    
    // Track share
    await sharePost(postId, user.id);
    
    // Open share options
    const shareText = encodeURIComponent(`Angalia post hii kwenye KMCA! ${postLink}`);
    
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'KMCA Post',
                text: shareText,
                url: postLink
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    } else {
        window.open(`https://wa.me/?text=${shareText}`, '_blank');
    }
}

// ========== DOWNLOAD POST ==========
async function downloadPost(postId, post) {
    const user = getCurrentUser();
    
    // Track download
    await trackDownload(postId, user.id);
    
    // Download media
    if (post.media_files && post.media_files.length > 0) {
        post.media_files.forEach((file, index) => {
            const link = document.createElement('a');
            link.href = file;
            link.download = `KMCA-${post.title}-${index + 1}`;
            link.click();
        });
    } else if (post.type === 'maneno') {
        // Generate PDF for text post
        alert('PDF download itaendelezwa baadaye');
    }
}

// ========== INITIALIZE CAROUSEL ==========
function initializeCarousel(postCard) {
    const carousel = postCard.querySelector('.carousel');
    if (!carousel) return;
    
    const container = carousel.querySelector('.carousel-container');
    const slides = container.querySelectorAll('.carousel-slide');
    const prevBtn = carousel.querySelector('.carousel-prev');
    const nextBtn = carousel.querySelector('.carousel-next');
    
    let currentSlide = 0;
    
    function showSlide(index) {
        if (index < 0) index = slides.length - 1;
        if (index >= slides.length) index = 0;
        
        currentSlide = index;
        container.style.transform = `translateX(-${currentSlide * 100}%)`;
    }
    
    prevBtn.addEventListener('click', () => showSlide(currentSlide - 1));
    nextBtn.addEventListener('click', () => showSlide(currentSlide + 1));
    
    // Initial display
    slides.forEach((slide, index) => {
        slide.style.minWidth = '100%';
    });
}

// ========== LOAD NOTIFICATIONS ==========
async function loadNotifications() {
    const result = await fetchNotifications();
    
    if (result.success && result.data) {
        const badge = document.getElementById('notificationBadge');
        
        if (result.data.length > 0) {
            badge.style.display = 'flex';
            badge.textContent = result.data.length;
        }
    }
}

// ========== LOAD FOOTER ==========
async function loadFooter() {
    try {
        const { data, error } = await supabase
            .from('footer')
            .select('*')
            .limit(1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
            document.getElementById('footerMawasiliano').textContent = data[0].mawasiliano;
            document.getElementById('footerEmail').textContent = `Email: ${data[0].email || 'info@kmca.com'}`;
            document.getElementById('footerCopyright').textContent = data[0].copyright;
        }
    } catch (error) {
        console.error('Error fetching footer:', error);
    }
}

// ========== SETUP EVENT LISTENERS ==========
function setupEventListeners() {
    // Dark mode button
    document.getElementById('darkModeBtn').addEventListener('click', function() {
        toggleDarkMode();
        
        const isDark = getDarkModePreference();
        const icon = this.querySelector('i');
        
        if (isDark) {
            icon.className = 'fas fa-sun';
        } else {
            icon.className = 'fas fa-moon';
        }
    });
    
    // Menu button
    document.getElementById('menuBtn').addEventListener('click', function() {
        document.getElementById('menuOverlay').style.display = 'flex';
    });
    
    // Menu close
    document.getElementById('menuClose').addEventListener('click', function() {
        document.getElementById('menuOverlay').style.display = 'none';
    });
    
    // Notification button
    document.getElementById('notificationBtn').addEventListener('click', function() {
        document.getElementById('notificationsOverlay').style.display = 'flex';
        loadNotificationsList();
    });
    
    // Notifications close
    document.getElementById('notificationsClose').addEventListener('click', function() {
        document.getElementById('notificationsOverlay').style.display = 'none';
    });
    
    // Menu items
    document.getElementById('menuProfile').addEventListener('click', () => openModal('profileModal'));
    document.getElementById('menuSettings').addEventListener('click', () => openModal('settingsModal'));
    document.getElementById('menuQuestion').addEventListener('click', () => openModal('questionModal'));
    document.getElementById('menuAbout').addEventListener('click', () => openModal('aboutModal'));
    document.getElementById('menuWatakatifu').addEventListener('click', () => {
        openModal('watakatifuModal');
        loadWatakatifu();
    });
    document.getElementById('menuLeaderboard').addEventListener('click', () => {
        openModal('leaderboardModal');
        loadLeaderboard();
    });
    
    // Logout
    document.getElementById('menuLogout').addEventListener('click', function() {
        clearUser();
        window.location.href = 'index.html';
    });
    
    // Modal close buttons
    document.getElementById('profileClose').addEventListener('click', () => closeModal('profileModal'));
    document.getElementById('settingsClose').addEventListener('click', () => closeModal('settingsModal'));
    document.getElementById('questionClose').addEventListener('click', () => closeModal('questionModal'));
    document.getElementById('aboutClose').addEventListener('click', () => closeModal('aboutModal'));
    document.getElementById('watakatifuClose').addEventListener('click', () => closeModal('watakatifuModal'));
    document.getElementById('leaderboardClose').addEventListener('click', () => closeModal('leaderboardModal'));
    
    // Question submit
    document.getElementById('submitQuestion').addEventListener('click', async function() {
        const input = document.getElementById('questionInput');
        const question = input.value.trim();
        
        if (!question) return;
        
        const user = getCurrentUser();
        
        const { data, error } = await supabase
            .from('questions')
            .insert([{
                user_id: user.id,
                question: question
            }]);
        
        if (error) {
            console.error('Error submitting question:', error);
            alert('Imeshindikana kutuma swali');
        } else {
            input.value = '';
            alert('Swali lako limetumwa!');
            closeModal('questionModal');
        }
    });
    
    // Settings toggles
    document.getElementById('darkModeToggle').addEventListener('change', function() {
        toggleDarkMode();
    });
}

// ========== LOAD NOTIFICATIONS LIST ==========
async function loadNotificationsList() {
    const result = await fetchNotifications();
    
    if (result.success && result.data) {
        const notificationsList = document.getElementById('notificationsList');
        notificationsList.innerHTML = '';
        
        if (result.data.length === 0) {
            notificationsList.innerHTML = '<p class="no-data">Hakuna notifications</p>';
            return;
        }
        
        result.data.forEach(notification => {
            const notificationItem = document.createElement('div');
            notificationItem.className = 'notification-item';
            
            let icon = 'fa-bell';
            if (notification.type === 'post_mpya') icon = 'fa-newspaper';
            if (notification.type === 'tangazo') icon = 'fa-bullhorn';
            if (notification.type === 'matokeo_ya_poll') icon = 'fa-vote-yea';
            
            notificationItem.innerHTML = `
                <i class="fas ${icon}"></i>
                <div>
                    <strong>${notification.title}</strong>
                    <p>${notification.content || ''}</p>
                    <span>${formatDate(notification.created_at)}</span>
                </div>
            `;
            
            notificationsList.appendChild(notificationItem);
        });
    }
}

// ========== OPEN MODAL ==========
function openModal(modalId) {
    document.getElementById('menuOverlay').style.display = 'none';
    document.getElementById(modalId).style.display = 'flex';
}

// ========== CLOSE MODAL ==========
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// ========== LOAD WATAKATIFU ==========
async function loadWatakatifu() {
    const result = await fetchWatakatifu();
    
    if (result.success && result.data) {
        const watakatifuList = document.getElementById('watakatifuList');
        watakatifuList.innerHTML = '';
        
        result.data.forEach(mtakatifu => {
            const watakatifuCard = document.createElement('div');
            watakatifuCard.className = 'mtakatifu-card';
            
            watakatifuCard.innerHTML = `
                <div class="mtakatifu-avatar">
                    ${mtakatifu.picha_file ? `<img src="${mtakatifu.picha_file}" alt="${mtakatifu.jina}">` : '<i class="fas fa-cross"></i>'}
                </div>
                <div class="mtakatifu-info">
                    <h4>${mtakatifu.jina}</h4>
                    ${mtakatifu.sikukuu ? `<p>Sikukuu: ${formatDate(mtakatifu.sikukuu)}</p>` : ''}
                </div>
            `;
            
            watakatifuList.appendChild(watakatifuCard);
        });
    }
}

// ========== LOAD LEADERBOARD ==========
async function loadLeaderboard() {
    const result = await fetchLeaderboard();
    
    if (result.success && result.data) {
        const leaderboardList = document.getElementById('leaderboardList');
        leaderboardList.innerHTML = '';
        
        result.data.forEach((entry, index) => {
            const rank = index + 1;
            const leaderboardItem = document.createElement('div');
            leaderboardItem.className = 'leaderboard-item';
            
            let rankIcon = '';
            if (rank === 1) rankIcon = '<i class="fas fa-crown crown-gold"></i>';
            if (rank === 2) rankIcon = '<i class="fas fa-crown crown-silver"></i>';
            if (rank === 3) rankIcon = '<i class="fas fa-crown crown-bronze"></i>';
            
            leaderboardItem.innerHTML = `
                <div class="rank">${rankIcon || rank}</div>
                <div class="leaderboard-avatar">${generateAvatar(entry.jina)}</div>
                <div class="leaderboard-info">
                    <strong>${entry.jina}</strong>
                    <span>${entry.total_points} pointi</span>
                </div>
            `;
            
            leaderboardList.appendChild(leaderboardItem);
        });
    }
}
