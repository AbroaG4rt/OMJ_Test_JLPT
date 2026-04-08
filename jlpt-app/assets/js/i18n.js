// assets/js/i18n.js

const I18n = {
    currentLang: localStorage.getItem("lang") || "id",
    translations: {},

    async init() {
        // apply global transition class for smooth fade switch
        document.body.style.transition = "opacity 0.2s ease-in-out";

        await this.loadLang('id'); // Load default dictionary
        await this.loadLang(this.currentLang); // Load preferred dictionary

        this.renderLanguageToggle();
        
        if (window.location.pathname.endsWith('test.html')) {
            // Rule: DO NOT apply translation on test.html
            return;
        }
        this.translatePage();
    },

    async loadLang(lang) {
        try {
            if (this.translations[lang]) return; // memory catch
            
            const res = await fetch(`lang/${lang}.json`);
            if (res.ok) {
                const data = await res.json();
                this.translations[lang] = data;
            }
        } catch (err) {
            console.error("Failed to fetch translation mapping:", err);
        }
    },

    translatePage() {
        const dict = this.translations[this.currentLang] || {};
        const defaultDict = this.translations["id"] || {};

        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (dict[key]) {
                el.innerText = dict[key];
            } else if (defaultDict[key]) {
                el.innerText = defaultDict[key];
            }
        });
    },

    async switchLang(lang) {
        if (this.currentLang === lang) return;
        this.currentLang = lang;
        localStorage.setItem("lang", lang);

        await this.loadLang(lang);

        if (!window.location.pathname.endsWith('test.html')) {
            document.body.style.opacity = '0';
            setTimeout(() => {
                this.translatePage();
                this.updateToggleState();
                document.body.style.opacity = '1';
            }, 150);
        } else {
            this.updateToggleState();
        }
    },

    renderLanguageToggle() {
        const nav = document.querySelector('nav.nav-links');
        if (!nav) return;

        const toggleWrapper = document.createElement('div');
        toggleWrapper.className = "lang-toggle";
        toggleWrapper.style.display = "inline-flex";
        toggleWrapper.style.alignItems = "center";
        toggleWrapper.style.marginLeft = "1rem";
        toggleWrapper.style.cursor = "pointer";
        toggleWrapper.style.fontWeight = "bolder";
        toggleWrapper.style.fontSize = "0.95rem";

        const idBtn = document.createElement('span');
        idBtn.innerText = "ID";
        idBtn.id = "lang-btn-id";
        idBtn.onclick = () => this.switchLang('id');

        const separator = document.createElement('span');
        separator.innerText = " | ";
        separator.style.margin = "0 0.35rem";
        separator.style.color = "var(--border-color)";

        const enBtn = document.createElement('span');
        enBtn.innerText = "EN";
        enBtn.id = "lang-btn-en";
        enBtn.onclick = () => this.switchLang('en');

        toggleWrapper.appendChild(idBtn);
        toggleWrapper.appendChild(separator);
        toggleWrapper.appendChild(enBtn);

        nav.appendChild(toggleWrapper);
        this.updateToggleState();
    },

    updateToggleState() {
        const idBtn = document.getElementById('lang-btn-id');
        const enBtn = document.getElementById('lang-btn-en');
        if (!idBtn || !enBtn) return;
        
        idBtn.style.color = this.currentLang === "id" ? "var(--primary-color)" : "var(--text-secondary)";
        enBtn.style.color = this.currentLang === "en" ? "var(--primary-color)" : "var(--text-secondary)";
    }
};

// Initialize system early on document read
document.addEventListener('DOMContentLoaded', () => I18n.init());
