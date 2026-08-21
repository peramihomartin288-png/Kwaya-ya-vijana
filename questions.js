// ============================================
// KMCA - QUESTIONS PAGE
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const user = getCurrentUser();
    
    if (!user) {
        window.location.href = 'register.html';
        return;
    }
    
    loadQuestions(user);
});

// ========== LOAD QUESTIONS ==========
async function loadQuestions(user) {
    await loadUserQuestions(user.id);
    
    // Submit question
    document.getElementById('submitQuestion').addEventListener('click', async function() {
        const input = document.getElementById('questionInput');
        const question = input.value.trim();
        
        if (!question) return;
        
        const { data, error } = await supabase
            .from('questions')
            .insert([{
                user_id: user.id,
                question: question
            }]);
        
        if (error) {
            console.error('Error submitting question:', error);
            alert('Imeshindikana kutuma swali');
        } else {
            input.value = '';
            alert('Swali lako limetumwa!');
            loadUserQuestions(user.id);
        }
    });
}

// ========== LOAD USER QUESTIONS ==========
async function loadUserQuestions(userId) {
    try {
        const { data, error } = await supabase
            .from('questions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const questionsList = document.getElementById('questionsList');
        questionsList.innerHTML = '';
        
        if (data.length === 0) {
            questionsList.innerHTML = '<p class="no-data">Huna maswali bado</p>';
            return;
        }
        
        data.forEach(question => {
            const questionItem = document.createElement('div');
            questionItem.className = 'question-item';
            
            questionItem.innerHTML = `
                <div class="question-content">
                    <p>${question.question}</p>
                    <span>${formatDate(question.created_at)}</span>
                </div>
                ${question.answer ? `
                    <div class="question-answer">
                        <strong>Jibu:</strong>
                        <p>${question.answer}</p>
                    </div>
                ` : `
                    <div class="question-pending">
                        <i class="fas fa-clock"></i> Inasubiri jibu
                    </div>
                `}
            `;
            
            questionsList.appendChild(questionItem);
        });
    } catch (error) {
        console.error('Error loading questions:', error);
    }
}