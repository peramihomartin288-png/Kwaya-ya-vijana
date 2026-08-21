// ============================================
// KMCA - AUTHENTICATION
// Supabase Auth ni optional - haizuii registration
// ============================================

// ========== USER SESSION ==========

function getCurrentUser() {
    const userData = localStorage.getItem('kmca_user');
    return userData ? JSON.parse(userData) : null;
}

function saveUser(user) {
    localStorage.setItem('kmca_user', JSON.stringify(user));
}

function clearUser() {
    localStorage.removeItem('kmca_user');
    localStorage.removeItem('kmca_ref');
}

function hasUserShared() {
    const user = getCurrentUser();
    return user && user.has_shared === true;
}

// ========== REGISTRATION (Simple - No Supabase Auth) ==========

async function registerUser(userData) {
    try {
        // Register directly in database
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

async function phoneExists(phone) {
    const result = await getUserByPhone(phone);
    return result.success && result.data !== null;
}

// ========== LOGIN ==========

async function loginUser(phone) {
    try {
        const result = await getUserByPhone(phone);
        
        if (result.success && result.data) {
            saveUser(result.data);
            return { success: true, data: result.data };
        } else {
            return { success: false, error: 'User not found' };
        }
    } catch (error) {
        console.error('Error logging in:', error);
        return { success: false, error };
    }
}

// ========== LOGOUT ==========

function logoutUser() {
    clearUser();
    window.location.href = 'index.html';
}

// ========== AUTH GUARD ==========

function requireAuth() {
    const user = getCurrentUser();
    
    if (!user) {
        window.location.href = 'register.html';
        return null;
    }
    
    return user;
}

function requireNoAuth() {
    const user = getCurrentUser();
    
    if (user) {
        window.location.href = 'welcome.html';
        return null;
    }
    
    return true;
}

// ========== REFERRAL ==========

function handleReferral() {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    
    if (ref) {
        localStorage.setItem('kmca_ref', ref);
    }
    
    return ref;
}

function getReferral() {
    return localStorage.getItem('kmca_ref');
}

function clearReferral() {
    localStorage.removeItem('kmca_ref');
}

// ========== UPDATE SHARE STATUS ==========

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

// ========== PRIVACY SETTINGS ==========

async function getUserPrivacySettings(userId) {
    try {
        const { data, error } = await supabaseClient
            .from('privacy_settings')
            .select('*')
            .eq('user_id', userId);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
            return { success: true, data: data[0] };
        }
        
        return { success: true, data: null };
    } catch (error) {
        console.error('Error getting privacy settings:', error);
        return { success: false, error };
    }
}

async function updatePrivacySettings(userId, settings) {
    try {
        const { data, error } = await supabaseClient
            .from('privacy_settings')
            .upsert({
                user_id: userId,
                ...settings
            }, { onConflict: 'user_id' });
        
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error updating privacy settings:', error);
        return { success: false, error };
    }
}

// ========== USER POINTS ==========

async function awardPoints(userId, action, points) {
    try {
        const { data, error } = await supabaseClient
            .from('user_points')
            .insert([{
                user_id: userId,
                action: action,
                points: points
            }]);
        
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error awarding points:', error);
        return { success: false, error };
    }
}

async function getUserTotalPoints(userId) {
    try {
        const { data, error } = await supabaseClient
            .from('user_points')
            .select('points')
            .eq('user_id', userId);
        
        if (error) throw error;
        
        const totalPoints = data.reduce((sum, item) => sum + item.points, 0);
        return { success: true, points: totalPoints };
    } catch (error) {
        console.error('Error getting user points:', error);
        return { success: false, error };
    }
}

// ========== USER BADGE ==========

async function getUserBadge(userId) {
    try {
        const pointsResult = await getUserTotalPoints(userId);
        
        if (!pointsResult.success) {
            throw new Error('Failed to get points');
        }
        
        const totalPoints = pointsResult.points;
        
        const { data: badges, error } = await supabaseClient
            .from('badges')
            .select('*')
            .order('min_points', { ascending: false });
        
        if (error) throw error;
        
        let userBadge = null;
        
        for (const badge of badges) {
            if (totalPoints >= badge.min_points) {
                if (badge.max_points === null || totalPoints <= badge.max_points) {
                    userBadge = badge;
                    break;
                }
            }
        }
        
        return { success: true, badge: userBadge, points: totalPoints };
    } catch (error) {
        console.error('Error getting user badge:', error);
        return { success: false, error };
    }
}

// ========== INITIALIZATION ==========

document.addEventListener('DOMContentLoaded', function() {
    handleReferral();
});