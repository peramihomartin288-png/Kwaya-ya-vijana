// ============================================
// KMCA - APP NAVIGATION
// ============================================

// Check user flow and redirect
function checkUserFlow() {
    const user = getCurrentUser();
    
    // Get current page
    const currentPage = window.location.pathname.split('/').pop();
    
    // If no user and not on register/index
    if (!user && currentPage !== 'register.html' && currentPage !== 'index.html') {
        window.location.href = 'register.html';
        return;
    }
    
    // If user exists
    if (user) {
        // If on index, redirect to welcome
        if (currentPage === 'index.html' || currentPage === '') {
            window.location.href = 'welcome.html';
            return;
        }
        
        // If on register, check if already registered
        if (currentPage === 'register.html') {
            window.location.href = 'welcome.html';
            return;
        }
    }
}

// Handle referral link
function handleReferralLink() {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    
    if (ref) {
        // Save referral to localStorage
        localStorage.setItem('kmca_ref', ref);
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    // Handle referral link first
    handleReferralLink();
    
    // Check user flow
    checkUserFlow();
});