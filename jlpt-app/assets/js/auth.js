// assets/js/auth.js

document.addEventListener('DOMContentLoaded', () => {
    // Check if user is already logged in
    const currentUser = localStorage.getItem('omoshiroi_user');
    if (currentUser) {
        window.location.href = 'dashboard.html';
        return;
    }

    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const usernameInput = document.getElementById('username').value.trim();
            const passwordInput = document.getElementById('password').value.trim();
            
            if (!usernameInput || !passwordInput) return;

            try {
                // Fetch the mock database
                const response = await fetch('data/users.json');
                const users = await response.json();

                const matchedUser = users.find(u => u.name.toLowerCase() === usernameInput.toLowerCase() && u.password === passwordInput);
                
                if (matchedUser) {
                    // Success Login
                    createSession(matchedUser.name, 'registered');
                } else {
                    // Fail to find user - Temp Session
                    loginError.classList.remove('hidden');
                    loginError.textContent = "Account not found. Starting temporary session...";
                    
                    setTimeout(() => {
                        createSession(usernameInput, 'guest');
                    }, 1500);
                }
            } catch (error) {
                console.error("Error fetching users.json:", error);
                // Fallback if fetch fails (e.g., file protocol block)
                createSession(usernameInput, 'guest');
            }
        });
    }

    function createSession(name, role) {
        const sessionData = {
            name: name,
            role: role,
            loginTime: new Date().getTime(),
            password: document.getElementById('password').value.trim() // Required for Worker Email payload later
        };
        localStorage.setItem('omoshiroi_user', JSON.stringify(sessionData));
        window.location.href = 'dashboard.html';
    }
});
