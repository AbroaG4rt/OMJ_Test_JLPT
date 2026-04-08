// assets/js/auth.js

document.addEventListener('DOMContentLoaded', () => {
    // Determine language-aware redirect target
    // login_id.html / login_en.html set window.__loginSuccessTarget before this script loads
    const successTarget = window.__loginSuccessTarget || 'dashboard.html';

    // If user is already logged in, send to the correct dashboard
    const currentUser = localStorage.getItem('omoshiroi_user');
    if (currentUser) {
        window.location.href = successTarget;
        return;
    }

    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const usernameInput = document.getElementById('username').value.trim();
            const passwordInput = document.getElementById('password').value.trim();

            if (!usernameInput) return;

            try {
                const response = await fetch('data/users.json');
                const users = await response.json();
                const matchedUser = users.find(u =>
                    u.name.toLowerCase() === usernameInput.toLowerCase() &&
                    u.password === passwordInput
                );

                if (matchedUser) {
                    createSession(matchedUser.name, 'registered');
                } else {
                    loginError.classList.remove('hidden');
                    // Show message in correct language
                    const lang = localStorage.getItem('lang') || 'id';
                    loginError.textContent = lang === 'id'
                        ? 'Akun tidak ditemukan. Membuat sesi tamu...'
                        : 'Account not found. Starting temporary session...';
                    setTimeout(() => createSession(usernameInput, 'guest'), 1500);
                }
            } catch (error) {
                console.error('Error fetching users.json:', error);
                createSession(usernameInput, 'guest');
            }
        });
    }

    function createSession(name, role) {
        const sessionData = {
            name: name,
            role: role,
            loginTime: new Date().getTime(),
            password: (document.getElementById('password').value || '').trim()
        };
        localStorage.setItem('omoshiroi_user', JSON.stringify(sessionData));
        window.location.href = successTarget;
    }
});
