// ============================================
// KMCA - LEADERBOARD PAGE
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    loadLeaderboard();
});

// ========== LOAD LEADERBOARD ==========
async function loadLeaderboard() {
    const result = await fetchLeaderboard();
    
    if (result.success && result.data) {
        const leaderboardList = document.getElementById('leaderboardList');
        leaderboardList.innerHTML = '';
        
        if (result.data.length === 0) {
            leaderboardList.innerHTML = '<p class="no-data">Hakuna watumiaji bado</p>';
            return;
        }
        
        result.data.forEach((entry, index) => {
            const rank = index + 1;
            const leaderboardItem = document.createElement('div');
            leaderboardItem.className = 'leaderboard-item';
            
            let rankIcon = '';
            if (rank === 1) rankIcon = '<i class="fas fa-crown crown-gold"></i>';
            if (rank === 2) rankIcon = '<i class="fas fa-crown crown-silver"></i>';
            if (rank === 3) rankIcon = '<i class="fas fa-crown crown-bronze"></i>';
            
            leaderboardItem.innerHTML = `
                <div class="rank">${rankIcon || rank}</div>
                <div class="leaderboard-avatar">${generateAvatar(entry.jina)}</div>
                <div class="leaderboard-info">
                    <strong>${entry.jina}</strong>
                    <span>${entry.total_points} pointi</span>
                </div>
            `;
            
            // Click to view user profile
            leaderboardItem.addEventListener('click', () => {
                alert(`Mtumiaji: ${entry.jina}\nPointi: ${entry.total_points}`);
            });
            
            leaderboardList.appendChild(leaderboardItem);
        });
    }
}