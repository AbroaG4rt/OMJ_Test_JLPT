// assets/js/utils.js
// Shared utilities for Omoshiroi Japan App

window.OmoshiroiUtils = {
    getUser: function() {
        const user = localStorage.getItem('omoshiroi_user');
        return user ? JSON.parse(user) : null;
    },
    
    logout: function() {
        localStorage.removeItem('omoshiroi_user');
        window.location.href = 'login.html';
    },

    formatTime: function(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);

        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    },

    requireAuth: function() {
        if (!this.getUser()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }
};

// Global Security Settings
document.addEventListener('contextmenu', event => event.preventDefault()); // Disable right click
