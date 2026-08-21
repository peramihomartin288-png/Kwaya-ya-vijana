// ============================================
// KMCA - WATAKATIFU PAGE
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    loadWatakatifu();
});

// ========== LOAD WATAKATIFU ==========
async function loadWatakatifu() {
    const result = await fetchWatakatifu();
    
    if (result.success && result.data) {
        const watakatifuList = document.getElementById('watakatifuList');
        watakatifuList.innerHTML = '';
        
        if (result.data.length === 0) {
            watakatifuList.innerHTML = '<p class="no-data">Hakuna watakatifu bado</p>';
            return;
        }
        
        result.data.forEach(mtakatifu => {
            const watakatifuCard = document.createElement('div');
            watakatifuCard.className = 'mtakatifu-card';
            
            watakatifuCard.innerHTML = `
                <div class="mtakatifu-avatar">
                    ${mtakatifu.picha_file ? `<img src="${mtakatifu.picha_file}" alt="${mtakatifu.jina}">` : '<i class="fas fa-cross"></i>'}
                </div>
                <div class="mtakatifu-info">
                    <h4>${mtakatifu.jina}</h4>
                    ${mtakatifu.sikukuu ? `<p>Sikukuu: ${formatDate(mtakatifu.sikukuu)}</p>` : ''}
                    ${mtakatifu.historia ? `<p class="mtakatifu-historia">${mtakatifu.historia.substring(0, 100)}...</p>` : ''}
                </div>
            `;
            
            // Click to view full details
            watakatifuCard.addEventListener('click', () => {
                showMtakatifuDetails(mtakatifu);
            });
            
            watakatifuList.appendChild(watakatifuCard);
        });
    }
}

// ========== SHOW MTAKATIFU DETAILS ==========
function showMtakatifuDetails(mtakatifu) {
    alert(`
        ${mtakatifu.jina}
        
        ${mtakatifu.historia || 'Hakuna historia'}
        
        Sala: ${mtakatifu.sala || 'Hakuna sala'}
        
        Miujiza: ${mtakatifu.miujiza || 'Hakuna miujiza'}
    `);
}