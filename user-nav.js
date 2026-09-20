// ============================================
// KMCA USER PANEL — NAVIGATION SYSTEM v2.0
// Header + Side Menu + Notifications
// ============================================

// ============================================
// STATE
// ============================================
let navNotificationsData = [];
let navNotificationSub = null;
let navCurrentUser = null;

// ============================================
// INITIALIZE
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    navCurrentUser = getCurrentUser();
    if (!navCurrentUser) return;
    
    // Build header
    kmcaBuildTopHeader();
    
    // Build side menu
    kmcaBuildSideMenu();
    
    // Build notifications modal
    kmcaBuildNotificationsModal();
    
    // Load notifications
    await kmcaLoadNotifications();
    
    // Subscribe to realtime
    kmcaSubscribeToNotifications();
});

// ============================================
// BUILD TOP HEADER
// ============================================
function kmcaBuildTopHeader() {
    const header = document.getElementById('userHeader');
    if (!header) return;
    
    const initials = kmcaNavInitials(navCurrentUser.jina);
    const hasPicture = navCurrentUser.profile_picture && 
                       navCurrentUser.profile_picture !== 'null' && 
                       navCurrentUser.profile_picture.trim() !== '';
    
    const avatarHtml = hasPicture
        ? `<img src="${navCurrentUser.profile_picture}" alt="${navCurrentUser.jina}" onerror="this.parentElement.innerHTML='${initials}'">`
        : initials;
    
    header.innerHTML = `
        <div class="user-header-content">
            <button class="menu-btn" id="navMenuBtn">
                <i class="fas fa-bars"></i>
            </button>
            
            <div class="header-logo" onclick="window.location.href='home.html'">
                <i class="fas fa-church"></i>
                <span>KMCA</span>
            </div>
            
            <button class="notification-btn" id="navNotificationBtn">
                <i class="fas fa-bell"></i>
                <span class="notification-badge" id="navNotificationBadge" style="display:none;">0</span>
            </button>
        </div>
        
        <div class="user-nav-tabs">
            <div class="nav-tab active" data-page="home">
                <i class="fas fa-home"></i>
                <span>Home</span>
            </div>
            <div class="nav-tab" data-page="chat">
                <i class="fas fa-comments"></i>
                <span>Chat</span>
            </div>
            <div class="nav-tab" data-page="profile">
                <i class="fas fa-user"></i>
                <span>Profile</span>
            </div>
            <div class="nav-tab" data-page="settings">
                <i class="fas fa-cog"></i>
                <span>Settings</span>
            </div>
        </div>
    `;
    
    // Setup events
    const menuBtn = document.getElementById('navMenuBtn');
    if (menuBtn) menuBtn.addEventListener('click', kmcaOpenSideMenu);
    
    const notifBtn = document.getElementById('navNotificationBtn');
    if (notifBtn) notifBtn.addEventListener('click', kmcaOpenNotifications);
    
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const page = this.getAttribute('data-page');
            kmcaNavigateTo(page);
        });
    });
}

// ============================================
// NAVIGATE
// ============================================
function kmcaNavigateTo(page) {
    if (page === 'home') {
        window.location.href = 'home.html';
        return;
    }
    
    const pages = {
        'chat': 'chat.html',
        'profile': 'profile.html',
        'settings': 'settings.html'
    };
    
    if (pages[page]) {
        window.location.href = pages[page];
    }
}

// ============================================
// BUILD SIDE MENU
// ============================================
function kmcaBuildSideMenu() {
    let menu = document.getElementById('sideMenu');
    
    if (!menu) {
        menu = document.createElement('div');
        menu.id = 'sideMenu';
        menu.className = 'side-menu';
        document.body.appendChild(menu);
    }
    
    const initials = kmcaNavInitials(navCurrentUser.jina);
    const hasPicture = navCurrentUser.profile_picture && 
                       navCurrentUser.profile_picture !== 'null' && 
                       navCurrentUser.profile_picture.trim() !== '';
    
    const avatarHtml = hasPicture
        ? `<img src="${navCurrentUser.profile_picture}" alt="${navCurrentUser.jina}" onerror="this.parentElement.innerHTML='${initials}'">`
        : initials;
    
    menu.innerHTML = `
        <div class="side-menu-header">
            <div class="side-menu-avatar">${avatarHtml}</div>
            <div class="side-menu-info">
                <h3>${kmcaNavEscape(navCurrentUser.jina)}</h3>
                <p>${kmcaNavEscape(navCurrentUser.parokia || 'Mwanakwaya')}</p>
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
            <div class="side-menu-item" data-page="history">
                <i class="fas fa-history"></i>
                <span>History</span>
            </div>
            <div class="side-menu-item" data-page="about">
                <i class="fas fa-info-circle"></i>
                <span>About</span>
            </div>
            <div class="side-menu-item" data-page="settings">
                <i class="fas fa-cog"></i>
                <span>Settings</span>
            </div>
            <div class="side-menu-divider"></div>
            <div class="side-menu-item danger" data-page="logout">
                <i class="fas fa-sign-out-alt"></i>
                <span>Log Out</span>
            </div>
        </div>
        
        <div class="side-menu-footer">
            <p>© 2026 KMCA</p>
            <p style="margin-top: 4px;">Version 1.0.0</p>
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
    
    overlay.addEventListener('click', kmcaCloseSideMenu);
    
    menu.querySelectorAll('.side-menu-item').forEach(item => {
        item.addEventListener('click', function() {
            const page = this.getAttribute('data-page');
            kmcaHandleSideMenuClick(page);
        });
    });
}

// ============================================
// HANDLE SIDE MENU CLICK
// ============================================
function kmcaHandleSideMenuClick(page) {
    kmcaCloseSideMenu();
    
    const pages = {
        'home': 'home.html',
        'profile': 'profile.html',
        'history': 'history.html',
        'about': 'about.html',
        'settings': 'settings.html'
    };
    
    if (page === 'logout') {
        kmcaShowLogoutConfirm();
    } else if (pages[page]) {
        window.location.href = pages[page];
    }
}

// ============================================
// OPEN/CLOSE SIDE MENU
// ============================================
function kmcaOpenSideMenu() {
    const menu = document.getElementById('sideMenu');
    const overlay = document.getElementById('sideMenuOverlay');
    
    if (menu) menu.classList.add('open');
    if (overlay) overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function kmcaCloseSideMenu() {
    const menu = document.getElementById('sideMenu');
    const overlay = document.getElementById('sideMenuOverlay');
    
    if (menu) menu.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
}

// ============================================
// LOGOUT CONFIRM
// ============================================
function kmcaShowLogoutConfirm() {
    const modal = document.createElement('div');
    modal.className = 'confirm-modal active';
    modal.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.7);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        backdrop-filter: blur(5px);
    `;
    
    modal.innerHTML = `
        <div style="background: var(--bg-card); border-radius: 16px; padding: 28px 24px; max-width: 380px; width: 100%; text-align: center;">
            <div style="width: 64px; height: 64px; margin: 0 auto 16px; background: rgba(239, 68, 68, 0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px; color: var(--error);">
                <i class="fas fa-sign-out-alt"></i>
            </div>
            <h3 style="font-size: 20px; font-weight: 800; color: var(--text-light); margin-bottom: 10px;">Log Out?</h3>
            <p style="font-size: 14px; color: var(--text-muted); line-height: 1.6; margin-bottom: 24px;">Una uhakika unataka kutoka kwenye app?</p>
            <div style="display: flex; gap: 10px;">
                <button id="navCancelLogout" style="flex: 1; padding: 13px; border-radius: 12px; border: none; background: var(--bg-input); color: var(--text-light); font-size: 15px; font-weight: 700; cursor: pointer; font-family: inherit;">Ghairi</button>
                <button id="navConfirmLogout" style="flex: 1; padding: 13px; border-radius: 12px; border: none; background: var(--error); color: white; font-size: 15px; font-weight: 700; cursor: pointer; font-family: inherit;">Ndio, Toka</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('navCancelLogout').addEventListener('click', () => modal.remove());
    document.getElementById('navConfirmLogout').addEventListener('click', () => {
        modal.remove();
        kmcaPerformLogout();
    });
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.remove();
    });
}

// ============================================
// PERFORM LOGOUT
// ============================================
function kmcaPerformLogout() {
    if (typeof logoutUser === 'function') {
        logoutUser();
    } else {
        localStorage.removeItem('kmca_user');
        localStorage.removeItem('kmca_user_id');
        localStorage.removeItem('kmca_user_saved_at');
        sessionStorage.clear();
        window.location.href = 'index.html';
    }
}

// ============================================
// BUILD NOTIFICATIONS MODAL
// ============================================
function kmcaBuildNotificationsModal() {
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
                    <button class="btn-mark-read" id="navMarkAllReadBtn" title="Mark all as read">
                        <i class="fas fa-check-double"></i>
                    </button>
                    <button class="notifications-close" id="navNotificationsClose">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            
            <div class="notifications-list" id="navNotificationsList">
                <div class="notifications-empty">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Inapakia...</p>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('navNotificationsClose').addEventListener('click', kmcaCloseNotifications);
    document.getElementById('navMarkAllReadBtn').addEventListener('click', kmcaMarkAllAsRead);
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) kmcaCloseNotifications();
    });
}

// ============================================
// LOAD NOTIFICATIONS (Safe)
// ============================================
async function kmcaLoadNotifications() {
    if (!supabaseClient) {
        console.warn('⚠️ supabaseClient haipo — skip notifications');
        return;
    }
    
    if (!navCurrentUser) return;
    
    try {
        const { data, error } = await supabaseClient
            .from('notifications')
            .select('*')
            .eq('user_id', navCurrentUser.id)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false })
            .limit(50);
        
        if (error) throw error;
        
        navNotificationsData = data || [];
        kmcaRenderNotifications();
        kmcaUpdateNotificationBadge();
    } catch (error) {
        console.error('Load notifications error:', error);
    }
}

// ============================================
// RENDER NOTIFICATIONS
// ============================================
function kmcaRenderNotifications() {
    const list = document.getElementById('navNotificationsList');
    if (!list) return;
    
    if (navNotificationsData.length === 0) {
        list.innerHTML = `
            <div class="notifications-empty">
                <i class="fas fa-bell-slash"></i>
                <p>Hakuna notifications</p>
            </div>
        `;
        return;
    }
    
    const icons = {
        'post_mpya': 'fa-newspaper',
        'post_created': 'fa-newspaper',
        'post': 'fa-newspaper',
        'poll': 'fa-vote-yea',
        'tangazo': 'fa-bullhorn',
        'announcement': 'fa-bullhorn',
        'event': 'fa-calendar',
        'jumuiko': 'fa-calendar',
        'matokeo_ya_poll': 'fa-chart-bar',
        'bible_verse': 'fa-bible',
        'wimbo': 'fa-music',
        'daily_wimbo': 'fa-music',
        'masomo': 'fa-book-open',
        'mtakatifu': 'fa-cross',
        'daily_verse': 'fa-bible',
        'system': 'fa-info-circle',
        'pwa_update': 'fa-sync',
        'like': 'fa-heart',
        'comment': 'fa-comment',
        'share': 'fa-share',
        'message': 'fa-comment-dots'
    };
    
    list.innerHTML = navNotificationsData.map(notif => {
        const icon = icons[notif.type] || 'fa-bell';
        const link = kmcaGetNotificationLink(notif);
        const timeAgo = kmcaNavGetTimeAgo(notif.created_at);
        
        return `
            <div class="notification-item ${!notif.is_read ? 'unread' : ''}" 
                 data-id="${notif.id}" 
                 data-link="${link || ''}">
                <div class="notification-item-icon">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="notification-item-body">
                    <strong>${kmcaNavEscape(notif.title || 'Notification')}</strong>
                    <p>${kmcaNavEscape(notif.message || notif.content || '')}</p>
                    <span>${timeAgo}</span>
                </div>
            </div>
        `;
    }).join('');
    
    list.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            const link = this.getAttribute('data-link');
            
            kmcaMarkAsRead(id);
            
            if (link) {
                kmcaCloseNotifications();
                setTimeout(() => window.location.href = link, 200);
            }
        });
    });
}

// ============================================
// GET NOTIFICATION LINK
// ============================================
function kmcaGetNotificationLink(notif) {
    const type = notif.type || '';
    const id = notif.post_id || notif.poll_id || notif.event_id || 
               notif.verse_id || notif.wimbo_id || notif.somo_id || notif.saint_id ||
               notif.announcement_id;
    
    if (!id) return null;
    
    const links = {
        'post': `home.html`,
        'post_mpya': `home.html`,
        'post_created': `home.html`,
        'poll': `home.html`,
        'event': `matukio.html?id=${id}`,
        'announcement': `announcements.html?id=${id}`,
        'tangazo': `announcements.html?id=${id}`,
        'bible_verse': `bible.html?id=${id}`,
        'daily_verse': `bible.html?id=${id}`,
        'wimbo': `wimbo.html?id=${id}`,
        'daily_wimbo': `wimbo.html?id=${id}`,
        'masomo': `masomo.html?id=${id}`,
        'mtakatifu': `watakatifu.html?id=${id}`
    };
    
    return links[type] || null;
}

// ============================================
// MARK AS READ
// ============================================
async function kmcaMarkAsRead(notificationId) {
    if (!supabaseClient) return;
    
    try {
        await supabaseClient
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId);
        
        const notif = navNotificationsData.find(n => n.id === notificationId);
        if (notif) notif.is_read = true;
        
        kmcaRenderNotifications();
        kmcaUpdateNotificationBadge();
    } catch (error) {
        console.error('Mark as read error:', error);
    }
}

// ============================================
// MARK ALL AS READ
// ============================================
async function kmcaMarkAllAsRead() {
    if (!supabaseClient || !navCurrentUser) return;
    
    try {
        await supabaseClient
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', navCurrentUser.id)
            .eq('is_read', false);
        
        navNotificationsData.forEach(n => n.is_read = true);
        kmcaRenderNotifications();
        kmcaUpdateNotificationBadge();
        
        if (typeof showToast === 'function') {
            showToast('Notifications zote zimesomwa', 'success');
        }
    } catch (error) {
        console.error('Mark all error:', error);
    }
}

// ============================================
// UPDATE NOTIFICATION BADGE
// ============================================
function kmcaUpdateNotificationBadge() {
    const unreadCount = navNotificationsData.filter(n => !n.is_read).length;
    const badge = document.getElementById('navNotificationBadge');
    
    if (!badge) return;
    
    if (unreadCount > 0) {
        badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

// ============================================
// OPEN/CLOSE NOTIFICATIONS
// ============================================
function kmcaOpenNotifications() {
    const modal = document.getElementById('notificationsModal');
    if (modal) modal.classList.add('active');
    kmcaLoadNotifications();
}

function kmcaCloseNotifications() {
    const modal = document.getElementById('notificationsModal');
    if (modal) modal.classList.remove('active');
}

// ============================================
// SUBSCRIBE TO NOTIFICATIONS (Safe)
// ============================================
function kmcaSubscribeToNotifications() {
    if (!supabaseClient) {
        console.warn('⚠️ supabaseClient haipo — retry baada ya 500ms');
        setTimeout(kmcaSubscribeToNotifications, 500);
        return;
    }
    
    if (!navCurrentUser) return;
    
    if (navNotificationSub) {
        navNotificationSub.unsubscribe();
    }
    
    navNotificationSub = supabaseClient
        .channel('nav-notifications')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${navCurrentUser.id}`
        }, (payload) => {
            console.log('New notification:', payload.new);
            navNotificationsData.unshift(payload.new);
            kmcaRenderNotifications();
            kmcaUpdateNotificationBadge();
            
            if (typeof showToast === 'function') {
                showToast('🔔 ' + (payload.new.title || 'Notification mpya'), 'info');
            }
        })
        .subscribe();
}

// ============================================
// HELPERS
// ============================================
function kmcaNavInitials(jina) {
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

function kmcaNavEscape(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function kmcaNavGetTimeAgo(dateString) {
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
// EXPORT GLOBAL
// ============================================
window.kmcaOpenSideMenu = kmcaOpenSideMenu;
window.kmcaCloseSideMenu = kmcaCloseSideMenu;
window.kmcaOpenNotifications = kmcaOpenNotifications;
window.kmcaCloseNotifications = kmcaCloseNotifications;

console.log('✅ USER_NAV v2.0 loaded');