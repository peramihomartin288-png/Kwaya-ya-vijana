// ============================================
// KMCA - REALTIME UPDATES
// ============================================

// Subscribe to realtime updates
function subscribeToRealtime() {
    // Posts realtime
    supabase
        .channel('posts-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, payload => {
            console.log('Post change:', payload);
            
            // Reload posts
            const user = getCurrentUser();
            if (user && document.getElementById('postsFeed')) {
                loadPosts(user);
            }
        })
        .subscribe();
    
    // Comments realtime
    supabase
        .channel('comments-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, payload => {
            console.log('Comment change:', payload);
            
            // Reload comments if on home page
            const user = getCurrentUser();
            if (user && document.getElementById('postsFeed')) {
                loadPosts(user);
            }
        })
        .subscribe();
    
    // Likes realtime
    supabase
        .channel('likes-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, payload => {
            console.log('Like change:', payload);
            
            // Reload posts
            const user = getCurrentUser();
            if (user && document.getElementById('postsFeed')) {
                loadPosts(user);
            }
        })
        .subscribe();
    
    // Notifications realtime
    supabase
        .channel('notifications-changes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, payload => {
            console.log('New notification:', payload);
            
            // Show notification
            const notification = payload.new;
            showNotification(notification.title, notification.content || '');
            
            // Update badge
            loadNotifications();
        })
        .subscribe();
    
    // Polls realtime
    supabase
        .channel('polls-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'polls' }, payload => {
            console.log('Poll change:', payload);
            
            // Reload polls
            if (document.getElementById('pollsList')) {
                loadPolls();
            }
        })
        .subscribe();
    
    // Matukio realtime
    supabase
        .channel('matukio-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'matukio' }, payload => {
            console.log('Event change:', payload);
            
            // Reload events
            if (document.getElementById('eventsList')) {
                loadEvents();
            }
        })
        .subscribe();
}

// Initialize realtime on home page
document.addEventListener('DOMContentLoaded', function() {
    const user = getCurrentUser();
    
    if (user && document.getElementById('postsFeed')) {
        subscribeToRealtime();
    }
});