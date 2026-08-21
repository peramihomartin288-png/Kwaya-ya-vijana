// ============================================
// KMCA - REGISTER PAGE
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const jina = document.getElementById('jina').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const miaka = document.getElementById('miaka').value.trim();
            const parokia = document.getElementById('parokia').value.trim();
            const jimbo = document.getElementById('jimbo').value.trim();
            
            // Validate
            if (!jina || !phone) {
                alert('Tafadhali jaza jina na namba ya simu');
                return;
            }
            
            // Validate phone (Tanzania format)
            const phoneRegex = /^0[0-9]{9}$/;
            if (!phoneRegex.test(phone)) {
                alert('Tafadhali weka namba sahihi ya simu (mfano: 0712345678)');
                return;
            }
            
            // Disable button
            const submitBtn = registerForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Inajisajili...';
            
            // Check if user exists
            const existingUser = await getUserByPhone(phone);
            
            if (existingUser.success && existingUser.data) {
                // User already exists
                saveUser(existingUser.data);
                
                // Check referral
                const ref = localStorage.getItem('kmca_ref');
                if (ref && ref !== existingUser.data.id) {
                    // Record referral
                    await supabase
                        .from('referrals')
                        .insert([{
                            referrer_id: ref,
                            new_user_id: existingUser.data.id
                        }]);
                }
                
                window.location.href = 'welcome.html';
                return;
            }
            
            // Register new user
            const userData = {
                jina: jina,
                phone: phone,
                miaka: miaka || null,
                parokia: parokia || null,
                jimbo: jimbo || null
            };
            
            const result = await registerUser(userData);
            
            if (result.success) {
                saveUser(result.data);
                
                // Award points for registration
                await supabase
                    .from('user_points')
                    .insert([{
                        user_id: result.data.id,
                        action: 'register',
                        points: 10
                    }]);
                
                // Check referral
                const ref = localStorage.getItem('kmca_ref');
                if (ref && ref !== result.data.id) {
                    // Record referral
                    await supabase
                        .from('referrals')
                        .insert([{
                            referrer_id: ref,
                            new_user_id: result.data.id
                        }]);
                    
                    // Award points for referrer
                    await supabase
                        .from('user_points')
                        .insert([{
                            user_id: ref,
                            action: 'share_link',
                            points: 20
                        }]);
                }
                
                window.location.href = 'welcome.html';
            } else {
                alert('Imeshindikana kujisajili. Tafadhali jaribu tena.');
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Jiunge Sasa';
            }
        });
    }
});