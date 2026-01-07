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
    // Render "What is this?" section
    const whatIsThisContainer = document.querySelector('.prose.prose-lg');
    if (whatIsThisContainer) {
        whatIsThisContainer.innerHTML = aboutContent.whatIsThis
            .map(paragraph => `<p class="text-gray-700 mb-4">${paragraph}</p>`)
            .join('');
    }

    // Render contact section
    const contactContainer = document.querySelectorAll('.prose.prose-lg')[1];
    if (contactContainer) {
        contactContainer.innerHTML = `
            <p class="text-gray-700 mb-4">${aboutContent.contact.intro}</p>
            <p class="text-gray-700 mb-4">
                Drop me a note: <a href="mailto:${aboutContent.contact.email}" class="text-primary hover:underline">${aboutContent.contact.email}</a>
            </p>
        `;
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
