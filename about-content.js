// Shared About Page Content
const aboutContent = {
    whatIsThis: [
        "We love EntryBoss but we struggled to keep track of upcoming races across different clubs.",
        "This site aggregates race information from EntryBoss and presents them in a more discoverable format.",
        "We'll remember your favourite clubs and show you every posted event so you won't miss a thing. Click through to the event page to register directly on EntryBoss."
    ],
    contact: {
        intro: "Have a question or suggestion?",
        email: "hello@racingcalendar.app"
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
                <p class="mb-4">${aboutContent.contact.intro}</p>
                <p class="mb-4">
                    Drop me a note: <a href="mailto:${aboutContent.contact.email}" class="text-blue-500 hover:underline font-bold">${aboutContent.contact.email}</a>
                </p>
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
                <p class="text-sm text-gray-700 leading-relaxed mb-3">
                    ${aboutContent.contact.intro}
                </p>
                <a href="mailto:${aboutContent.contact.email}" class="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium active:bg-blue-700 transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                    <span>Email us</span>
                </a>
            `;
        }
    }
}
