// ============================================
// KMCA - PROFILE PAGE
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const user = getCurrentUser();
    
    if (!user) {
        window.location.href = 'register.html';
        return;
    }
    
    loadProfile(user);
});

// ========== LOAD PROFILE ==========
async function loadProfile(user) {
    // Generate avatar
    const avatarText = generateAvatar(user.jina);
    document.getElementById('profileAvatar').textContent = avatarText;
    
    // Display user info
    document.getElementById('profileName').textContent = user.jina;
    document.getElementById('profilePhone').textContent = user.phone;
    document.getElementById('profileMiaka').textContent = user.miaka || 'N/A';
    document.getElementById('profileParokia').textContent = user.parokia || 'N/A';
    document.getElementById('profileJimbo').textContent = user.jimbo || 'N/A';
    
    // Fetch user points
    await loadUserPoints(user.id);
    
    // Fetch user badge
    await loadUserBadge(user.id);
    
    // Fetch user stats
    await loadUserStats(user.id);
}

// ========== LOAD USER POINTS ==========
async function loadUserPoints(userId) {
    try {
        const { data, error } = await supabase
            .from('user_points')
            .select('points')
            .eq('user_id', userId);
        
        if (error) throw error;
        
        const totalPoints = data.reduce((sum, item) => sum + item.points, 0);
        document.getElementById('profilePoints').textContent = totalPoints;
    } catch (error) {
        console.error('Error loading points:', error);
        document.getElementById('profilePoints').textContent = '0';
    }
}

// ========== LOAD USER BADGE ==========
async function loadUserBadge(userId) {
    try {
        const pointsResult = await supabase
            .from('user_points')
            .select('points')
            .eq('user_id', userId);
        
        const totalPoints = pointsResult.data.reduce((sum, item) => sum + item.points, 0);
        
        const badgesResult = await supabase
            .from('badges')
            .select('*')
            .order('min_points', { ascending: false });
        
        if (badgesResult.error) throw badgesResult.error;
        
        const badges = badgesResult.data;
        let userBadge = null;
        
        for (const badge of badges) {
            if (totalPoints >= badge.min_points) {
                if (badge.max_points === null || totalPoints <= badge.max_points) {
                    userBadge = badge;
                    break;
                }
            }
        }
        
        if (userBadge) {
            document.getElementById('profileBadge').textContent = userBadge.jina;
            document.getElementById('profileBadge').style.color = userBadge.rangi;
        }
    } catch (error) {
        console.error('Error loading badge:', error);
    }
}

// ========== LOAD USER STATS ==========
async function loadUserStats(userId) {
    try {
        // Get likes count
        const likesResult = await supabase
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);
        
        const likesCount = likesResult.count || 0;
        
        // Get comments count
        const commentsResult = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);
        
        const commentsCount = commentsResult.count || 0;
        
        // Get shares count
        const sharesResult = await supabase
            .from('shares')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);
        
        const sharesCount = sharesResult.count || 0;
        
        // Get downloads count
        const downloadsResult = await supabase
            .from('downloads')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);
        
        const downloadsCount = downloadsResult.count || 0;
        
        // Display stats
        document.getElementById('profileLikes').textContent = likesCount;
        document.getElementById('profileComments').textContent = commentsCount;
        document.getElementById('profileShares').textContent = sharesCount;
        document.getElementById('profileDownloads').textContent = downloadsCount;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}