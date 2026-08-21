// ============================================
// KMCA - SHARE PAGE
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const user = getCurrentUser();
    
    if (!user) {
        window.location.href = 'register.html';
        return;
    }
    
    // Generate share link
    const shareLink = window.location.origin + '/index.html?ref=' + user.id;
    
    // WhatsApp share
    const whatsAppBtn = document.getElementById('shareWhatsApp');
    if (whatsAppBtn) {
        whatsAppBtn.addEventListener('click', function() {
            const text = encodeURIComponent('Jiunge nasi kwenye KMCA - Kwaya ya Vijana Mt. Carlo Acutis! ' + shareLink);
            window.open('https://wa.me/?text=' + text, '_blank');
        });
    }
    
    // Facebook share
    const facebookBtn = document.getElementById('shareFacebook');
    if (facebookBtn) {
        facebookBtn.addEventListener('click', function() {
            window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(shareLink), '_blank');
        });
    }
    
    // Instagram share
    const instagramBtn = document.getElementById('shareInstagram');
    if (instagramBtn) {
        instagramBtn.addEventListener('click', function() {
            // Instagram doesn't support direct share, copy link
            navigator.clipboard.writeText(shareLink).then(() => {
                alert('Link imenakiliwa! Bandika kwenye Instagram');
            });
        });
    }
    
    // Share done button
    const shareDoneBtn = document.getElementById('shareDone');
    if (shareDoneBtn) {
        shareDoneBtn.addEventListener('click', async function() {
            await updateShareStatus(user.id);
            window.location.href = 'home.html';
        });
    }
    
    // Skip share button
    const skipBtn = document.getElementById('skipShare');
    if (skipBtn) {
        skipBtn.addEventListener('click', function() {
            window.location.href = 'home.html';
        });
    }
});