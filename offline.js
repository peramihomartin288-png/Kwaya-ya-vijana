// ============================================
// KMCA - OFFLINE SUPPORT
// ============================================

// Check if online
function isOnline() {
    return navigator.onLine;
}

// Cache post data for offline
async function cachePostForOffline(postId, postData) {
    try {
        const cache = await caches.open('kmca-posts');
        await cache.put(`/post-${postId}`, new Response(JSON.stringify(postData)));
    } catch (error) {
        console.error('Error caching post:', error);
    }
}

// Get cached post
async function getCachedPost(postId) {
    try {
        const cache = await caches.open('kmca-posts');
        const response = await cache.match(`/post-${postId}`);
        
        if (response) {
            return JSON.parse(await response.text());
        }
    } catch (error) {
        console.error('Error getting cached post:', error);
    }
    
    return null;
}

// Cache all posts for offline
async function cacheAllPosts() {
    const result = await fetchPosts();
    
    if (result.success && result.data) {
        for (const post of result.data) {
            await cachePostForOffline(post.id, post);
        }
    }
}

// Load posts from cache (offline mode)
async function loadPostsOffline() {
    try {
        const cache = await caches.open('kmca-posts');
        const keys = await cache.keys();
        
        const posts = [];
        
        for (const key of keys) {
            if (key.url.includes('/post-')) {
                const response = await cache.match(key);
                posts.push(JSON.parse(await response.text()));
            }
        }
        
        return posts;
    } catch (error) {
        console.error('Error loading offline posts:', error);
        return [];
    }
}

// Show offline indicator
function showOfflineIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'offline-indicator';
    indicator.textContent = 'Uko Offline - Unaweza kuona post za zamani';
    document.body.appendChild(indicator);
}

// Remove offline indicator
function removeOfflineIndicator() {
    const indicator = document.querySelector('.offline-indicator');
    if (indicator) {
        indicator.remove();
    }
}

// Initialize offline support
document.addEventListener('DOMContentLoaded', function() {
    window.addEventListener('online', () => {
        removeOfflineIndicator();
    });
    
    window.addEventListener('offline', () => {
        showOfflineIndicator();
    });
    
    if (!isOnline()) {
        showOfflineIndicator();
    }
});