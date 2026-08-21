// ============================================
// KMCA - ABOUT PAGE
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    loadAboutContent();
});

// ========== LOAD ABOUT CONTENT ==========
async function loadAboutContent() {
    try {
        const { data, error } = await supabase
            .from('about')
            .select('*')
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        const aboutContent = document.getElementById('aboutContent');
        aboutContent.innerHTML = '';
        
        if (data.length === 0) {
            aboutContent.innerHTML = '<p class="no-data">Hakuna taarifa bado</p>';
            return;
        }
        
        data.forEach(item => {
            const aboutSection = document.createElement('div');
            aboutSection.className = 'about-section';
            
            aboutSection.innerHTML = `
                <h4>${item.title}</h4>
                <p>${item.content}</p>
                ${item.image_file ? `<img src="${item.image_file}" alt="${item.title}" class="about-image">` : ''}
            `;
            
            aboutContent.appendChild(aboutSection);
        });
    } catch (error) {
        console.error('Error loading about content:', error);
    }
}