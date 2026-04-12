document.addEventListener('DOMContentLoaded', () => {
    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');
    const tabAdmin = document.getElementById('tab-admin');
    
    const formLogin = document.getElementById('login-form');
    const formSignup = document.getElementById('signup-form');
    const formAdmin = document.getElementById('admin-form');
    
    const errLogin = document.getElementById('login-error');
    const errSignup = document.getElementById('signup-error');
    const errAdmin = document.getElementById('admin-error');

    const switchTab = (activeTab, activeForm) => {
        [tabLogin, tabSignup, tabAdmin].forEach(t => {
            t.classList.remove('active');
            t.style.background = 'transparent';
            t.style.borderColor = 'var(--border-color)';
            t.style.color = 'var(--text-muted)';
        });
        [formLogin, formSignup, formAdmin].forEach(f => f.classList.add('hidden'));
        
        activeTab.classList.add('active');
        activeTab.style.background = 'var(--primary-color)';
        activeTab.style.borderColor = 'var(--primary-color)';
        activeTab.style.color = '#fff';
        
        activeForm.classList.remove('hidden');
        [errLogin, errSignup, errAdmin].forEach(e => { e.style.display = 'none'; e.innerText = ""; });
    };

    if(tabLogin) tabLogin.addEventListener('click', () => switchTab(tabLogin, formLogin));
    if(tabSignup) tabSignup.addEventListener('click', () => switchTab(tabSignup, formSignup));
    if(tabAdmin) tabAdmin.addEventListener('click', () => switchTab(tabAdmin, formAdmin));

    if(formSignup) {
        formSignup.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('signup-name').value.trim();
            const email = document.getElementById('signup-email').value.trim();
            const password = document.getElementById('signup-password').value;

            try {
                const res = await window.api.request('/auth/signup', {
                    method: 'POST',
                    body: JSON.stringify({ username: name, email, password })
                });
                
                localStorage.setItem('nexus_token', res.token);
                localStorage.setItem('nexus_user', JSON.stringify(res.user));
                window.location.href = 'app.html';
            } catch(err) {
                errSignup.innerText = err.message;
                errSignup.style.display = 'block';
            }
        });
    }

    if(formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            
            try {
                const res = await window.api.request('/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({ email, password })
                });
                
                localStorage.setItem('nexus_token', res.token);
                localStorage.setItem('nexus_user', JSON.stringify(res.user));
                window.location.href = 'app.html';
            } catch(err) {
                errLogin.innerText = err.message;
                errLogin.style.display = 'block';
            }
        });
    }

    if(formAdmin) {
        formAdmin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('admin-email').value.trim();
            const password = document.getElementById('admin-password').value;
            
            try {
                const res = await window.api.request('/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({ email, password })
                });
                
                localStorage.setItem('nexus_token', res.token);
                localStorage.setItem('nexus_user', JSON.stringify(res.user));
                window.location.href = 'app.html';
            } catch(err) {
                errAdmin.innerText = err.message || "Invalid admin credentials.";
                errAdmin.style.display = 'block';
            }
        });
    }
});
