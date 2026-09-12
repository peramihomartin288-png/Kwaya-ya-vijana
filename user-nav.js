// ============================================
// KMCA USER PANEL - NAVIGATION SYSTEM v1.0
// Top Nav Bar + Side Menu + Notifications
// ============================================

let notificationsData = [];
let notificationSubscription = null;
let currentUser = null;

// ============ INITIALIZE NAV ============
document.addEventListener('DOMContentLoaded', async function() {
    currentUser = getCurrentUser();
    if (!currentUser) return;
    
    // Build nav
    buildTopNav();
    buildSideMenu();
    buildNotificationsModal();
    
    // Load notifications
    loadNotifications();
    
    // Subscribe to realtime notifications
    subscribeToNotifications();
});

// ============ BUILD TOP NAV ============
function buildTopNav() {
    const header = document.getElementById('userHeader');
    if (!header) return;
    
    const notificationCount = notificationsData.filter(n => !n.is_read).length;
    
    header.innerHTML = `
        <div class="user-header-content">
            <button class="menu-btn" id="menuBtn">
                <i class="fas fa-bars"></i>
            </button>
            
            <div class="header-logo">
                <i class="fas fa-church"></i>
                <span>KMCA</span>
            </div>
            
            <button class="notification-btn" id="notificationBtn">
                <i class="fas fa-bell"></i>
                ${notificationCount > 0 ? `<span class="notification-badge">${notificationCount > 99 ? '99+' : notificationCount}</span>` : ''}
            </button>
        </div>
        
        <div class="user-nav-tabs">
            <div class="nav-tab active" data-tab="home">
                <i class="fas fa-home"></i>
                <span>Home</span>
            </div>
            <div class="nav-tab" data-tab="chat">
                <i class="fas fa-comments"></i>
                <span>Chat</span>
            </div>
            <div class="nav-tab" data-tab="profile">
                <i class="fas fa-user"></i>
                <span>Profile</span>
            </div>
            <div class="nav-tab" data-tab="settings">
                <i class="fas fa-cog"></i>
                <span>Settings</span>
            </div>
        </div>
    `;
    
    // Setup events
    document.getElementById('menuBtn').addEventListener('click', openSideMenu);
    document.getElementById('notificationBtn').addEventListener('click', openNotifications);
    
    // Nav tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const page = this.getAttribute('data-tab');
            navigateTo(page);
        });
    });
}

// ============ NAVIGATE TO ============
function navigateTo(page) {
    // Home = refresh page
    if (page === 'home') {
        window.location.reload();
        return;
    }
    
    // Other pages
    const pages = {
        'chat': 'chat.html',
        'profile': 'profile.html',
        'settings': 'settings.html'
    };
    
    if (pages[page]) {
        window.location.href = pages[page];
    }
}

// ============ BUILD SIDE MENU ============
function buildSideMenu() {
    let menu = document.getElementById('sideMenu');
    
    if (!menu) {
        menu = document.createElement('div');
        menu.id = 'sideMenu';
        menu.className = 'side-menu';
        document.body.appendChild(menu);
    }
    
    const initials = generateInitials(currentUser.jina);
    const avatarHtml = currentUser.profile_picture
        ? `<img src="${currentUser.profile_picture}" alt="${currentUser.jina}">`
        : initials;
    
    menu.innerHTML = `
        <div class="side-menu-header">
            <div class="side-menu-avatar">
                ${avatarHtml}
            </div>
            <div class="side-menu-info">
                <h3>${currentUser.jina}</h3>
                <p>${currentUser.parokia || 'Mwanakwaya'}</p>
            </div>
        </div>
        
        <div class="side-menu-items">
            <div class="side-menu-item" data-page="home">
                <i class="fas fa-home"></i>
                <span>Home</span>
            </div>
            <div class="side-menu-item" data-page="profile">
                <i class="fas fa-user"></i>
                <span>Profile</span>
            </div>
            <div class="side-menu-item" data-page="about">
                <i class="fas fa-info-circle"></i>
                <span>About</span>
            </div>
            <div class="side-menu-item" data-page="settings">
                <i class="fas fa-cog"></i>
                <span>Settings</span>
            </div>
            <div class="side-menu-item" data-page="history">
                <i class="fas fa-history"></i>
                <span>History</span>
            </div>
            <div class="side-menu-divider"></div>
            <div class="side-menu-item danger" data-page="logout">
                <i class="fas fa-sign-out-alt"></i>
                <span>Log Out</span>
            </div>
        </div>
        
        <div class="side-menu-footer">
            <p>© 2026 KMCA</p>
        </div>
    `;
    
    // Overlay
    let overlay = document.getElementById('sideMenuOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'sideMenuOverlay';
        overlay.className = 'side-menu-overlay';
        document.body.appendChild(overlay);
    }
    
    overlay.addEventListener('click', closeSideMenu);
    
    // Setup events
    menu.querySelectorAll('.side-menu-item').forEach(item => {
        item.addEventListener('click', function() {
            const page = this.getAttribute('data-page');
            handleSideMenuClick(page);
        });
    });
}

// ============ HANDLE SIDE MENU CLICK ============
function handleSideMenuClick(page) {
    closeSideMenu();
    
    const pages = {
        'home': null,
        'profile': 'profile.html',
        'about': 'about.html',
        'settings': 'settings.html',
        'history': 'history.html',
        'logout': 'logout'
    };
    
    if (page === 'home') {
        window.location.reload();
    } else if (page === 'logout') {
        showLogoutConfirm();
    } else if (pages[page]) {
        window.location.href = pages[page];
    }
}

// ============ OPEN/CLOSE SIDE MENU ============
function openSideMenu() {
    document.getElementById('sideMenu').classList.add('open');
    document.getElementById('sideMenuOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeSideMenu() {
    document.getElementById('sideMenu').classList.remove('open');
    document.getElementById('sideMenuOverlay').classList.remove('active');
    document.body.style.overflow = '';
}

// ============ SHOW LOGOUT CONFIRM ============
function showLogoutConfirm() {
    const modal = document.createElement('div');
    modal.className = 'confirm-modal active';
    modal.innerHTML = `
        <div class="confirm-content">
            <div class="confirm-icon danger">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h3>Una uhakika?</h3>
            <p>Account yako yote na data zote zitafutwa. Hili haliwezi kurudishwa.</p>
            <div class="confirm-actions">
                <button class="btn-cancel" id="cancelLogout">Ghairi</button>
                <button class="btn-confirm danger" id="confirmLogout">Ndio, Futa</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('cancelLogout').addEventListener('click', () => modal.remove());
    document.getElementById('confirmLogout').addEventListener('click', () => {
        modal.remove();
        performLogout();
    });
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.remove();
    });
}

// ============ PERFORM LOGOUT (Hard Delete) ============
async function performLogout() {
    try {
        showLoading('Inafuta account...');
        
        // 1. Delete user data (CASCADE itafuta data zote)
        const { error } = await supabaseClient
            .from('users')
            .delete()
            .eq('id', currentUser.id);
        
        if (error) throw error;
        
        // 2. Clear localStorage
        clearUser();
        
        // 3. Redirect
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
        
    } catch (error) {
        console.error('Logout error:', error);
        hideLoading();
        showToast('Imeshindikana kufuta account: ' + error.message, 'error');
    }
}

// ============ BUILD NOTIFICATIONS MODAL ============
function buildNotificationsModal() {
    let modal = document.getElementById('notificationsModal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'notificationsModal';
        modal.className = 'notifications-modal';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="notifications-content">
            <div class="notifications-header">
                <h3>
                    <i class="fas fa-bell"></i>
                    Notifications
                </h3>
                <div class="notifications-actions">
                    <button class="btn-mark-read" id="markAllReadBtn" title="Mark all as read">
                        <i class="fas fa-check-double"></i>
                    </button>
                    <button class="notifications-close" id="notificationsClose">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            
            <div class="notifications-list" id="notificationsList">
                <div class="notifications-loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Inapakia...</p>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('notificationsClose').addEventListener('click', closeNotifications);
    document.getElementById('markAllReadBtn').addEventListener('click', markAllAsRead);
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) closeNotifications();
    });
}

// ============ LOAD NOTIFICATIONS ============
async function loadNotifications() {
    try {
        const { data, error } = await supabaseClient
            .from('notifications')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false })
            .limit(50);
        
        if (error) throw error;
        
        notificationsData = data || [];
        renderNotifications();
        updateNotificationBadge();
    } catch (error) {
        console.error('Load notifications error:', error);
    }
}

// ============ RENDER NOTIFICATIONS ============
function renderNotifications() {
    const list = document.getElementById('notificationsList');
    if (!list) return;
    
    if (notificationsData.length === 0) {
        list.innerHTML = `
            <div class="notifications-empty">
                <i class="fas fa-bell-slash"></i>
                <p>Hakuna notifications</p>
            </div>
        `;
        return;
    }
    
    list.innerHTML = notificationsData.map(notif => {
        const icons = {
            'post': 'fa-newspaper',
            'poll': 'fa-vote-yea',
            'event': 'fa-calendar',
            'announcement': 'fa-bullhorn',
            'bible_verse': 'fa-bible',
            'wimbo': 'fa-music',
            'masomo': 'fa-book-open',
            'mtakatifu': 'fa-cross'
        };
        
        const icon = icons[notif.type] || 'fa-bell';
        
        return `
            <div class="notification-item ${!notif.is_read ? 'unread' : ''}" data-id="${notif.id}" data-type="${notif.type || ''}" data-link="${getNotificationLink(notif)}">
                <div class="notification-item-icon">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="notification-item-body">
                    <strong>${notif.title || 'Notification'}</strong>
                    <p>${notif.content || ''}</p>
                    <span>${timeAgo(notif.created_at)}</span>
                </div>
                ${!notif.is_read ? '<div class="notification-dot"></div>' : ''}
            </div>
        `;
    }).join('');
    
    // Setup click events
    list.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            const link = this.getAttribute('data-link');
            
            markAsRead(id);
            
            if (link) {
                closeNotifications();
                setTimeout(() => window.location.href = link, 300);
            }
        });
    });
}

// ============ GET NOTIFICATION LINK ============
function getNotificationLink(notif) {
    const type = notif.type || '';
    const id = notif.post_id || notif.poll_id || notif.event_id || 
               notif.verse_id || notif.wimbo_id || notif.somo_id || notif.saint_id;
    
    if (!id) return null;
    
    const links = {
        'post': `posts.html?id=${id}`,
        'poll': `polls.html?id=${id}`,
        'event': `matukio.html?id=${id}`,
        'bible_verse': `bible.html?id=${id}`,
        'wimbo': `wimbo.html?id=${id}`,
        'masomo': `masomo.html?id=${id}`,
        'mtakatifu': `watakatifu.html?id=${id}`
    };
    
    return links[type] || null;
}

// ============ MARK AS READ ============
async function markAsRead(notificationId) {
    try {
        await supabaseClient
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId);
        
        const notif = notificationsData.find(n => n.id === notificationId);
        if (notif) notif.is_read = true;
        
        renderNotifications();
        updateNotificationBadge();
    } catch (error) {
        console.error('Mark as read error:', error);
    }
}

// ============ MARK ALL AS READ ============
async function markAllAsRead() {
    try {
        await supabaseClient
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', currentUser.id)
            .eq('is_read', false);
        
        notificationsData.forEach(n => n.is_read = true);
        renderNotifications();
        updateNotificationBadge();
        showToast('Notifications zote zimesomwa', 'success');
    } catch (error) {
        console.error('Mark all error:', error);
        showToast('Imeshindikana', 'error');
    }
}

// ============ UPDATE NOTIFICATION BADGE ============
function updateNotificationBadge() {
    const unreadCount = notificationsData.filter(n => !n.is_read).length;
    const btn = document.getElementById('notificationBtn');
    if (!btn) return;
    
    const existing = btn.querySelector('.notification-badge');
    if (existing) existing.remove();
    
    if (unreadCount > 0) {
        const badge = document.createElement('span');
        badge.className = 'notification-badge';
        badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        btn.appendChild(badge);
    }
}

// ============ OPEN/CLOSE NOTIFICATIONS ============
function openNotifications() {
    document.getElementById('notificationsModal').classList.add('active');
    loadNotifications();
}

function closeNotifications() {
    document.getElementById('notificationsModal').classList.remove('active');
}

// ============ SUBSCRIBE TO NOTIFICATIONS ============
function subscribeToNotifications() {
    if (notificationSubscription) {
        notificationSubscription.unsubscribe();
    }
    
    notificationSubscription = supabaseClient
        .channel('user-notifications')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${currentUser.id}`
        }, (payload) => {
            console.log('New notification:', payload.new);
            notificationsData.unshift(payload.new);
            renderNotifications();
            updateNotificationBadge();
            
            // Show toast
            showToast('🔔 ' + payload.new.title, 'info');
        })
        .subscribe();
}

// ============ HELPERS ============
function timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Sasa hivi';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h';
    if (seconds < 604800) return Math.floor(seconds / 86400) + 'd';
    
    return date.toLocaleDateString('sw-TZ', { day: 'numeric', month: 'short' });
}

function generateInitials(jina) {
    if (!jina) return '??';
    const cleaned = jina.trim().replace(/\s+/g, ' ');
    const names = cleaned.split(' ');
    
    if (names.length >= 2) {
        return (names[0].charAt(0) + names[1].charAt(0)).toUpperCase();
    }
    if (names.length === 1 && names[0].length >= 2) {
        return names[0].substring(0, 2).toUpperCase();
    }
    return '??';
}

function showLoading(text = 'Inapakia...') {
    let overlay = document.getElementById('loadingOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-overlay-text" id="loadingOverlayText">${text}</div>
        `;
        document.body.appendChild(overlay);
    }
    document.getElementById('loadingOverlayText').textContent = text;
    overlay.classList.add('active');
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.remove('active');
}