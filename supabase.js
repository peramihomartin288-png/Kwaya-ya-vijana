// ============================================
// SUPABASE CONFIGURATION
// ============================================

const SUPABASE_URL = 'https://ctzdiiyzoocxmlmeagtt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0emRpaXl6b29jeG1sbWVhZ3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMjI1NTEsImV4cCI6MjEwMjY5ODU1MX0.Jy_T5XaI5CI4qfFVH7b53MDCurR2olh0a6Tx9BzDOGw';

// Initialize Supabase client (only if not already initialized)
if (typeof supabaseClient === 'undefined') {
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// ============================================
// AUTH FUNCTIONS
// ============================================

function getCurrentUser() {
    const userData = localStorage.getItem('kmca_user');
    return userData ? JSON.parse(userData) : null;
}

function saveUser(user) {
    localStorage.setItem('kmca_user', JSON.stringify(user));
}

function clearUser() {
    localStorage.removeItem('kmca_user');
}

function hasUserShared() {
    const user = getCurrentUser();
    return user && user.has_shared === true;
}

// ============================================
// DATABASE FUNCTIONS
// ============================================

async function fetchPosts() {
    try {
        const { data, error } = await supabaseClient
            .from('posts')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error fetching posts:', error);
        return { success: false, error };
    }
}

async function fetchBibleVerse() {
    try {
        const { data, error } = await supabaseClient
            .from('bible_verses')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);
        
        if (error) throw error;
        return { success: true, data: data[0] || null };
    } catch (error) {
        console.error('Error fetching bible verse:', error);
        return { success: false, error };
    }
}

async function fetchEvents() {
    try {
        const { data, error } = await supabaseClient
            .from('matukio')
            .select('*')
            .order('tarehe', { ascending: true });
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error fetching events:', error);
        return { success: false, error };
    }
}

async function fetchPolls() {
    try {
        const { data, error } = await supabaseClient
            .from('polls')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error fetching polls:', error);
        return { success: false, error };
    }
}

async function fetchPollOptions(pollId) {
    try {
        const { data, error } = await supabaseClient
            .from('poll_options')
            .select('*')
            .eq('poll_id', pollId);
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error fetching poll options:', error);
        return { success: false, error };
    }
}

async function fetchNotifications() {
    try {
        const { data, error } = await supabaseClient
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return { success: false, error };
    }
}

async function fetchLeaderboard() {
    try {
        const { data, error } = await supabaseClient
            .from('user_points')
            .select(`
                user_id,
                points,
                users (jina)
            `)
            .order('points', { ascending: false });
        
        if (error) throw error;
        
        const leaderboard = {};
        data.forEach(item => {
            if (leaderboard[item.user_id]) {
                leaderboard[item.user_id].total_points += item.points;
            } else {
                leaderboard[item.user_id] = {
                    user_id: item.user_id,
                    jina: item.users?.jina || 'Unknown',
                    total_points: item.points
                };
            }
        });
        
        const sortedLeaderboard = Object.values(leaderboard)
            .sort((a, b) => b.total_points - a.total_points);
        
        return { success: true, data: sortedLeaderboard };
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        return { success: false, error };
    }
}

async function fetchWatakatifu() {
    try {
        const { data, error } = await supabaseClient
            .from('watakatifu')
            .select('*')
            .order('jina', { ascending: true });
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error fetching watakatifu:', error);
        return { success: false, error };
    }
}

// Like functions
async function likePost(postId, userId) {
    try {
        const { data, error } = await supabaseClient
            .from('likes')
            .insert([{ user_id: userId, post_id: postId }]);
        
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error liking post:', error);
        return { success: false, error };
    }
}

async function unlikePost(postId, userId) {
    try {
        const { data, error } = await supabaseClient
            .from('likes')
            .delete()
            .eq('user_id', userId)
            .eq('post_id', postId);
        
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error unliking post:', error);
        return { success: false, error };
    }
}

async function checkIfLiked(postId, userId) {
    try {
        const { data, error } = await supabaseClient
            .from('likes')
            .select('id')
            .eq('user_id', userId)
            .eq('post_id', postId);
        
        if (error) throw error;
        return { success: true, liked: data.length > 0 };
    } catch (error) {
        console.error('Error checking like:', error);
        return { success: false, error };
    }
}

// Comment functions
async function addComment(postId, userId, content) {
    try {
        const { data, error } = await supabaseClient
            .from('comments')
            .insert([{ user_id: userId, post_id: postId, content: content }]);
        
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error adding comment:', error);
        return { success: false, error };
    }
}

async function fetchComments(postId) {
    try {
        const { data, error } = await supabaseClient
            .from('comments')
            .select(`
                id,
                content,
                created_at,
                users (jina)
            `)
            .eq('post_id', postId)
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error fetching comments:', error);
        return { success: false, error };
    }
}

// Share functions
async function sharePost(postId, userId) {
    try {
        const { data, error } = await supabaseClient
            .from('shares')
            .insert([{ user_id: userId, post_id: postId }]);
        
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error sharing post:', error);
        return { success: false, error };
    }
}

// Download functions
async function trackDownload(postId, userId) {
    try {
        const { data, error } = await supabaseClient
            .from('downloads')
            .insert([{ user_id: userId, post_id: postId }]);
        
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error tracking download:', error);
        return { success: false, error };
    }
}

// User functions
async function registerUser(userData) {
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .insert([userData])
            .select();
        
        if (error) throw error;
        return { success: true, data: data[0] };
    } catch (error) {
        console.error('Error registering user:', error);
        return { success: false, error };
    }
}

async function getUserByPhone(phone) {
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('phone', phone);
        
        if (error) throw error;
        return { success: true, data: data[0] || null };
    } catch (error) {
        console.error('Error getting user:', error);
        return { success: false, error };
    }
}

async function updateShareStatus(userId) {
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .update({ has_shared: true })
            .eq('id', userId);
        
        if (error) throw error;
        
        const user = getCurrentUser();
        if (user) {
            user.has_shared = true;
            saveUser(user);
        }
        
        return { success: true };
    } catch (error) {
        console.error('Error updating share status:', error);
        return { success: false, error };
    }
}