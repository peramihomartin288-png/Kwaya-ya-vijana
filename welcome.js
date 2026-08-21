// ============================================
// KMCA - WELCOME PAGE
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const user = getCurrentUser();
    
    if (!user) {
        window.location.href = 'register.html';
        return;
    }
    
    // Generate avatar
    const avatarText = generateAvatar(user.jina);
    document.getElementById('welcomeAvatar').textContent = avatarText;
    
    // Display first name
    const firstName = user.jina.split(' ')[0];
    document.getElementById('welcomeName').textContent = firstName;
    
    // Continue button
    const continueBtn = document.getElementById('welcomeContinue');
    
    if (continueBtn) {
        continueBtn.addEventListener('click', function() {
            if (user.has_shared) {
                window.location.href = 'home.html';
            } else {
                window.location.href = 'share.html';
            }
        });
    }
});