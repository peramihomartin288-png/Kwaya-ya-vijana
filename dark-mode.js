// ============================================
// KMCA PRO - DARK MODE TOGGLE
// ============================================

function getDarkModePreference() {
    const savedMode = localStorage.getItem('kmca_dark_mode');
    
    if (savedMode !== null) {
        return savedMode === 'true';
    }
    
    // Default: dark mode ON
    return true;
}

function applyDarkMode(isDark) {
    const body = document.body;
    
    if (isDark) {
        body.classList.add('dark-mode');
        body.classList.remove('light-mode');
    } else {
        body.classList.add('light-mode');
        body.classList.remove('dark-mode');
    }
    
    // Save preference
    localStorage.setItem('kmca_dark_mode', isDark);
    
    // Update dark mode toggle if exists
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        darkModeToggle.checked = isDark;
    }
    
    // Update dark mode button icon if exists
    const darkModeBtn = document.getElementById('darkModeBtn');
    if (darkModeBtn) {
        const icon = darkModeBtn.querySelector('i');
        if (icon) {
            if (isDark) {
                icon.className = 'fas fa-sun';
                darkModeBtn.style.color = '#d4af37';
            } else {
                icon.className = 'fas fa-moon';
                darkModeBtn.style.color = '#1a73e8';
            }
        }
    }
}

function toggleDarkMode() {
    const currentMode = getDarkModePreference();
    applyDarkMode(!currentMode);
}

// Initialize dark mode on page load
document.addEventListener('DOMContentLoaded', function() {
    const isDark = getDarkModePreference();
    applyDarkMode(isDark);
});

// Global click handler for dark mode button
document.addEventListener('click', function(e) {
    const darkModeBtn = e.target.closest('#darkModeBtn');
    
    if (darkModeBtn) {
        e.preventDefault();
        e.stopPropagation();
        toggleDarkMode();
    }
});

// Global change handler for dark mode toggle switch
document.addEventListener('change', function(e) {
    if (e.target.id === 'darkModeToggle') {
        applyDarkMode(e.target.checked);
    }
});