// ============================================
// KMCA - SETTINGS PAGE
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const user = getCurrentUser();
    
    if (!user) {
        window.location.href = 'register.html';
        return;
    }
    
    loadSettings(user);
});

// ========== LOAD SETTINGS ==========
async function loadSettings(user) {
    // Dark mode toggle
    const darkModeToggle = document.getElementById('darkModeToggle');
    darkModeToggle.checked = getDarkModePreference();
    
    // Notifications toggle
    const notificationsToggle = document.getElementById('notificationsToggle');
    const notificationsPref = localStorage.getItem('kmca_notifications');
    notificationsToggle.checked = notificationsPref !== 'false';
    
    // Show phone toggle
    const showPhoneToggle = document.getElementById('showPhoneToggle');
    
    try {
        const { data, error } = await supabase
            .from('privacy_settings')
            .select('*')
            .eq('user_id', user.id);
        
        if (data && data.length > 0) {
            showPhoneToggle.checked = data[0].show_phone;
        }
    } catch (error) {
        console.error('Error loading privacy settings:', error);
    }
    
    // Event listeners
    darkModeToggle.addEventListener('change', function() {
        applyDarkMode(this.checked);
    });
    
    notificationsToggle.addEventListener('change', function() {
        localStorage.setItem('kmca_notifications', this.checked);
    });
    
    showPhoneToggle.addEventListener('change', async function() {
        try {
            const { data, error } = await supabase
                .from('privacy_settings')
                .upsert({
                    user_id: user.id,
                    show_phone: this.checked
                }, { onConflict: 'user_id' });
            
            if (error) throw error;
        } catch (error) {
            console.error('Error saving privacy settings:', error);
        }
    });
}