// assets/js/dashboard.js

document.addEventListener('DOMContentLoaded', () => {
    if (!OmoshiroiUtils.requireAuth()) return;

    const user = OmoshiroiUtils.getUser();
    document.getElementById('userNameDisplay').textContent = `Welcome, ${user.name}`;

    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        OmoshiroiUtils.logout();
    });

    const quotes = [
        `"千里の道も一歩から" - A journey of a thousand miles begins with a single step.`,
        `"七転び八起き" - Fall down seven times, stand up eight.`,
        `"継続は力なり" - Perseverance is power.`,
        `"猿も木から落ちる" - Even monkeys fall from trees (Everyone makes mistakes).`
    ];
    document.getElementById('quoteDisplay').textContent = quotes[Math.floor(Math.random() * quotes.length)];

    loadHistory();
});

function selectLevel(level) {
    // Clear any existing test active session strictly for fresh start
    localStorage.removeItem('omoshiroi_active_test');
    
    // Pass the selected level via URL to the preparation page
    window.location.href = `level.html?level=${level}`;
}

function loadHistory() {
    const historyContainer = document.getElementById('historyContainer');
    let history = JSON.parse(localStorage.getItem('omoshiroi_history') || '[]');

    const now = new Date().getTime();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

    // Filter out expired history
    history = history.filter(item => (now - item.timestamp) < TWENTY_FOUR_HOURS);
    localStorage.setItem('omoshiroi_history', JSON.stringify(history));

    if (history.length > 0) {
        historyContainer.innerHTML = '';
        history.forEach(item => {
            const dateStr = new Date(item.timestamp).toLocaleString();
            let badgeClass = 'badge-fail';
            if (item.score >= 80) badgeClass = 'badge-master';
            else if (item.score >= 50) badgeClass = 'badge-pass';

            const div = document.createElement('div');
            div.style.padding = '1rem 0';
            div.style.borderBottom = '1px solid var(--border-color)';
            div.innerHTML = `
                <div class="flex justify-between items-center">
                    <div>
                        <strong>${item.level}</strong> - Score: ${item.score.toFixed(1)}%
                        <div style="font-size: 0.8rem; color: var(--text-secondary);">${dateStr}</div>
                    </div>
                    <span class="badge ${badgeClass}">${getBadgeText(item.score)}</span>
                </div>
            `;
            historyContainer.appendChild(div);
        });
    }
}

function getBadgeText(score) {
    if (score >= 80) return "JLPT Master";
    if (score >= 50) return "Keep Going";
    return "Don't Give Up";
}
