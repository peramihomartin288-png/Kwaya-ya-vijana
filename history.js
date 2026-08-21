// ============================================
// KMCA PRO - HISTORY PAGE
// With Auto-Archive + All Content Types
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const user = getCurrentUser();
    
    if (!user) {
        window.location.href = 'register.html';
        return;
    }
    
    // Run auto-archive kwanza
    runAutoArchive();
    
    // Load default tab
    loadHistory('watakatifu');
    
    // Setup events
    setupHistoryEvents();
});

// ========== RUN AUTO ARCHIVE ==========
async function runAutoArchive() {
    try {
        await supabaseClient.rpc('run_all_daily_cycles');
        console.log('Auto-archive completed');
    } catch (e) {
        console.log('Auto-archive skipped or not available');
    }
}

// ========== SETUP EVENTS ==========
function setupHistoryEvents() {
    // Back button
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', function() {
            window.location.href = 'home.html';
        });
    }
    
    // Tabs
    document.querySelectorAll('.history-tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.history-tab').forEach(function(t) {
                t.classList.remove('active');
            });
            this.classList.add('active');
            
            const tabType = this.getAttribute('data-tab');
            loadHistory(tabType);
        });
    });
}

// ========== LOAD HISTORY ==========
async function loadHistory(type) {
    try {
        const { data, error } = await supabaseClient
            .from('history_archives')
            .select('*')
            .eq('content_type', type)
            .order('tarehe', { ascending: false });
        
        if (error) throw error;
        
        const content = document.getElementById('historyContent');
        content.innerHTML = '';
        
        if (!data || data.length === 0) {
            content.innerHTML = '<p class="no-data">Hakuna history bado</p>';
            return;
        }
        
        data.forEach(function(item) {
            const card = document.createElement('div');
            card.className = 'history-card';
            
            const contentData = item.content_data;
            
            if (type === 'watakatifu' || type === 'mtakatifu') {
                card.innerHTML = '' +
                    '<div class="history-card-header">' +
                    '<i class="fas fa-cross"></i>' +
                    '<strong>' + (contentData.jina || 'N/A') + '</strong>' +
                    '</div>' +
                    '<p class="history-date">' + formatDate(item.tarehe) + '</p>' +
                    (contentData.historia ? '<h4 style="color:#d4af37; font-size:13px; margin-bottom:5px;">HISTORIA</h4><p class="history-text">' + contentData.historia + '</p>' : '') +
                    (contentData.sala ? '<h4 style="color:#d4af37; font-size:13px; margin-bottom:5px;">SALA</h4><p class="history-text">' + contentData.sala + '</p>' : '') +
                    (contentData.miujiza ? '<h4 style="color:#d4af37; font-size:13px; margin-bottom:5px;">MIUJIZA</h4><p class="history-text">' + contentData.miujiza + '</p>' : '');
            } else if (type === 'bible' || type === 'bible_verse') {
                card.innerHTML = '' +
                    '<div class="history-card-header">' +
                    '<i class="fas fa-bible"></i>' +
                    '<strong>' + (contentData.kichwa || 'N/A') + '</strong>' +
                    '</div>' +
                    '<p class="history-date">' + formatDate(item.tarehe) + '</p>' +
                    '<p class="history-text" style="font-style: italic;">' + (contentData.verse_text || '') + '</p>' +
                    '<p class="history-reference">' + (contentData.reference || '') + '</p>' +
                    (contentData.funzo ? '<h4 style="color:#d4af37; font-size:13px; margin-bottom:5px;">FUNZO</h4><p class="history-text">' + contentData.funzo + '</p>' : '');
            } else if (type === 'nyimbo' || type === 'wimbo') {
                card.innerHTML = '' +
                    '<div class="history-card-header">' +
                    '<i class="fas fa-music"></i>' +
                    '<strong>' + (contentData.jina || 'N/A') + '</strong>' +
                    '</div>' +
                    '<p class="history-date">' + formatDate(item.tarehe) + ' | Type: ' + (contentData.media_type || 'N/A') + '</p>' +
                    (contentData.maelezo ? '<p class="history-text">' + contentData.maelezo + '</p>' : '');
            } else if (type === 'masomo' || type === 'masomo_dominica') {
                card.innerHTML = '' +
                    '<div class="history-card-header">' +
                    '<i class="fas fa-book-open"></i>' +
                    '<strong>' + (contentData.jina_dominika || 'N/A') + '</strong>' +
                    '</div>' +
                    '<p class="history-date">' + formatDate(item.tarehe) + '</p>' +
                    '<h4 style="color:#d4af37; font-size:13px; margin-bottom:5px;">SOMO LA 1</h4>' +
                    '<p class="history-text">' + (contentData.somo_1 || 'N/A') + '</p>' +
                    (contentData.wimbo_katikati ? '<h4 style="color:#d4af37; font-size:13px; margin-bottom:5px;">WIMBO WA KATIKATI</h4><p class="history-text">' + contentData.wimbo_katikati + '</p>' : '') +
                    '<h4 style="color:#d4af37; font-size:13px; margin-bottom:5px;">SOMO LA 2</h4>' +
                    '<p class="history-text">' + (contentData.somo_2 || 'N/A') + '</p>' +
                    (contentData.shangilio ? '<h4 style="color:#d4af37; font-size:13px; margin-bottom:5px;">SHANGILIO</h4><p class="history-text">' + contentData.shangilio + '</p>' : '') +
                    '<h4 style="color:#d4af37; font-size:13px; margin-bottom:5px;">INJILI</h4>' +
                    '<p class="history-text">' + (contentData.injili || 'N/A') + '</p>';
            }
            
            content.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading history:', error);
        document.getElementById('historyContent').innerHTML = '<p class="no-data">Imeshindikana kupakia history</p>';
    }
}

// ========== FORMAT DATE ==========
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('sw-TZ', options);
}