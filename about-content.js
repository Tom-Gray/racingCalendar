// Shared About Page Content
const aboutContent = {
    whatIsThis: [
        "We love EntryBoss but we struggled to keep track of upcoming races across different clubs.",
        "This site aggregates race information from EntryBoss and presents them in a more discoverable format.",
        "We'll remember your favourite clubs and show you every posted event so you won't miss a thing. Click through to the event page to register directly on EntryBoss."
    ],
    contact: {
        intro: "Have a question or suggestion?",
        email: "hello@racingcalendar.app",
        instagram: "tom.gray.ok"
    },
    footer: {
        dataSource: "Data sourced from",
        dataSourceUrl: "https://entryboss.cc",
        dataSourceName: "EntryBoss",
        note: "Events link directly to EntryBoss for registration"
    }
};

// Function to render content into desktop about page
function initDesktopAboutContent() {
    // Initialize dark mode elements and behavior
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const isDarkMode = document.documentElement.classList.contains('dark');
    
    const updateDarkModeUI = () => {
        const icon = document.getElementById('dark-mode-icon');
        if (!icon) return;
        const currentIsDark = document.documentElement.classList.contains('dark');
        if (currentIsDark) {
            icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.243 16.243l.707.707M7.757 7.757l.707.707M15 12a3 3 0 11-6 0 3 3 0 016 0z" />';
            icon.classList.add('text-yellow-400');
        } else {
            icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />';
            icon.classList.remove('text-yellow-400');
        }
    };

    const toggleDarkMode = () => {
        if (document.documentElement.classList.contains('dark')) {
            document.documentElement.classList.remove('dark');
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
        } else {
            document.documentElement.classList.add('dark');
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        }
        updateDarkModeUI();
    };

    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', toggleDarkMode);
    }
    
    updateDarkModeUI();

    // Render "What is this?" section
    const whatIsThisContainer = document.querySelector('[data-section="what-is-this"]');
    if (whatIsThisContainer) {
        const contentDiv = whatIsThisContainer.querySelector('[data-content]');
        if (contentDiv) {
            contentDiv.innerHTML = aboutContent.whatIsThis
                .map(paragraph => `<p class="mb-4">${paragraph}</p>`)
                .join('');
        }
    }

    // Render contact section
    const contactContainer = document.querySelector('[data-section="contact"]');
    if (contactContainer) {
        const contentDiv = contactContainer.querySelector('[data-content]');
        if (contentDiv) {
            contentDiv.innerHTML = `
                <p class="mb-6">${aboutContent.contact.intro}</p>
                <div class="space-y-4">
                    <a href="mailto:${aboutContent.contact.email}" class="flex items-center gap-3 group no-underline">
                        <div class="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                        </div>
                        <div>
                            <div class="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Email</div>
                            <div class="text-sm font-bold text-[var(--text-primary)] group-hover:text-blue-500 transition-colors">${aboutContent.contact.email}</div>
                        </div>
                    </a>
                    <a href="https://ig.me/m/${aboutContent.contact.instagram}" target="_blank" rel="noopener" class="flex items-center gap-3 group no-underline">
                        <div class="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-500 group-hover:bg-pink-500 group-hover:text-white transition-all">
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-5.838 2.435-5.838 5.838s2.435 5.838 5.838 5.838 5.838-2.435 5.838-5.838-2.435-5.838-5.838-5.838zm0 9.513c-2.03 0-3.675-1.645-3.675-3.675 0-2.03 1.645-3.675 3.675-3.675 2.03 0 3.675 1.645 3.675 3.675 0 2.03-1.645 3.675-3.675 3.675zm5.822-10.472c.73 0 1.322.592 1.322 1.322 0 .73-.592 1.322-1.322 1.322-.73 0-1.322-.592-1.322-1.322 0-.73.592-1.322 1.322-1.322z"/></svg>
                        </div>
                        <div>
                            <div class="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Instagram</div>
                            <div class="text-sm font-bold text-[var(--text-primary)] group-hover:text-pink-500 transition-colors">@${aboutContent.contact.instagram}</div>
                        </div>
                    </a>
                </div>
            `;
        }
    }
}

// Function to render content into mobile about page
function initMobileAboutContent() {
    // Render "What is this?" section
    const whatIsThisContainer = document.querySelector('[data-section="what-is-this"]');
    if (whatIsThisContainer) {
        const contentDiv = whatIsThisContainer.querySelector('[data-content]');
        if (contentDiv) {
            contentDiv.innerHTML = aboutContent.whatIsThis
                .map(paragraph => `<p class="text-sm text-gray-700 leading-relaxed">${paragraph}</p>`)
                .join('');
        }
    }

    // Render contact section
    const contactContainer = document.querySelector('[data-section="contact"]');
    if (contactContainer) {
        const contentDiv = contactContainer.querySelector('[data-content]');
        if (contentDiv) {
            contentDiv.innerHTML = `
                <p class="text-sm text-gray-700 leading-relaxed mb-4">
                    ${aboutContent.contact.intro}
                </p>
                <div class="flex flex-col gap-3">
                    <a href="mailto:${aboutContent.contact.email}" class="flex items-center gap-3 px-4 py-3 bg-blue-500 text-white rounded-xl text-sm font-bold active:bg-blue-600 transition-colors shadow-sm">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                        </svg>
                        <span>Email me</span>
                    </a>
                    <a href="https://ig.me/m/${aboutContent.contact.instagram}" target="_blank" rel="noopener" class="flex items-center gap-3 px-4 py-3 bg-pink-500 text-white rounded-xl text-sm font-bold active:bg-pink-600 transition-colors shadow-sm">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-5.838 2.435-5.838 5.838s2.435 5.838 5.838 5.838 5.838-2.435 5.838-5.838-2.435-5.838-5.838-5.838zm0 9.513c-2.03 0-3.675-1.645-3.675-3.675 0-2.03 1.645-3.675 3.675-3.675 2.03 0 3.675 1.645 3.675 3.675 0 2.03-1.645 3.675-3.675 3.675zm5.822-10.472c.73 0 1.322.592 1.322 1.322 0 .73-.592 1.322-1.322 1.322-.73 0-1.322-.592-1.322-1.322 0-.73.592-1.322 1.322-1.322z"/></svg>
                        <span>Instagram DM</span>
                    </a>
                </div>
            `;
        }
    }
}
