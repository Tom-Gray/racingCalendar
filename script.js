// App State
let events = [];
let clubs = [];
let selectedClubs = new Set();
let clubColors = new Map(); // New: track assigned colors for clubs
let currentView = 'calendar';
let isFirstTime = true;

// Color palette for clubs
const CLUB_COLOR_PALETTE = [
    '#667eea', // Original blue
    '#e74c3c', // Red
    '#f39c12', // Orange
    '#27ae60', // Green
    '#9b59b6', // Purple
    '#1abc9c', // Turquoise
    '#e67e22', // Dark orange
    '#3498db', // Light blue
    '#2ecc71', // Light green
    '#f1c40f', // Yellow
    '#e91e63', // Pink
    '#ff6b6b', // Light red
    '#4ecdc4', // Mint
    '#45b7d1', // Sky blue
    '#96ceb4', // Sage green
    '#ffeaa7', // Light yellow
    '#fab1a0', // Peach
    '#fd79a8', // Rose
    '#fdcb6e', // Gold
    '#6c5ce7'  // Lavender
];

// DOM Elements
let calendarViewBtn, listViewBtn, clubSearchInput, clubDropdown;
let selectedClubsContainer, calendarView, listView, calendarGrid, eventsList;
let loadingElement, errorElement, onboardingBanner;
let toggleClubListBtn, clubListPanel, clubListContainer;

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    loadState();
    setupEventListeners();
    loadEvents();
    
    // Show onboarding if first time
    if (isFirstTime) {
        showOnboarding();
    }
});

function initializeElements() {
    calendarViewBtn = document.getElementById('calendar-view-btn');
    listViewBtn = document.getElementById('list-view-btn');
    clubSearchInput = document.getElementById('club-search');
    selectedClubsContainer = document.getElementById('selected-clubs');
    calendarView = document.getElementById('calendar-view');
    listView = document.getElementById('list-view');
    calendarGrid = document.getElementById('calendar-grid');
    eventsList = document.getElementById('events-list');
    loadingElement = document.getElementById('loading');
    errorElement = document.getElementById('error');
    onboardingBanner = document.getElementById('onboarding-banner');
    clubListPanel = document.getElementById('club-list-panel');
    clubListContainer = document.getElementById('club-list-container');
}

function setupEventListeners() {
    // View toggle
    calendarViewBtn.addEventListener('click', () => switchView('calendar'));
    listViewBtn.addEventListener('click', () => switchView('list'));
    
    // Club search - unified behavior
    clubSearchInput.addEventListener('input', handleClubSearch);
    clubSearchInput.addEventListener('focus', showClubList);
    clubSearchInput.addEventListener('blur', (e) => {
        // Only hide if the new focus target is not within the club list panel
        setTimeout(() => {
            const activeElement = document.activeElement;
            if (!clubListPanel.contains(activeElement) && 
                !clubSearchInput.contains(activeElement)) {
                hideClubList();
            }
        }, 400); // Increased delay for Chrome compatibility
    });
    
    // Onboarding dismiss
    const dismissBtn = document.getElementById('dismiss-onboarding');
    if (dismissBtn) {
        dismissBtn.addEventListener('click', dismissOnboarding);
    }
    
    // Click outside to close club list - improved detection
    document.addEventListener('mousedown', (e) => {
        if (!clubSearchInput.contains(e.target) && !clubListPanel.contains(e.target)) {
            hideClubList();
        }
    });
}

// State Management
function loadState() {
    const savedFilters = getCookie('selectedClubs');
    const savedView = getCookie('currentView');
    const savedColors = getCookie('clubColors');
    const hasSeenOnboarding = getCookie('hasSeenOnboarding');
    
    if (savedFilters) {
        selectedClubs = new Set(JSON.parse(savedFilters));
    }
    
    if (savedView) {
        currentView = savedView;
    }
    
    if (savedColors) {
        const colorData = JSON.parse(savedColors);
        clubColors = new Map(colorData);
    }
    
    // Ensure all selected clubs have colors assigned
    selectedClubs.forEach(club => assignClubColor(club));
    
    isFirstTime = !hasSeenOnboarding && selectedClubs.size === 0;
}

function saveState() {
    setCookie('selectedClubs', JSON.stringify([...selectedClubs]), 365);
    setCookie('currentView', currentView, 365);
    setCookie('clubColors', JSON.stringify([...clubColors]), 365);
}

// Cookie utilities
function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

// Data Loading
async function loadEvents() {
    try {
        showLoading();
        
        // Check if we're running from file:// protocol
        const isFileProtocol = window.location.protocol === 'file:';
        
        if (isFileProtocol) {
            console.warn('Running from file:// protocol. CORS restrictions may prevent data loading.');
            console.log('To run properly, please use a local server:');
            console.log('1. Run: python3 -m http.server 8000');
            console.log('2. Open: http://localhost:8000');
            
            // Use fallback data for file:// protocol
            await loadFallbackData();
            return;
        }
        
        // Load both events and clubs data
        const [eventsResponse, clubsResponse] = await Promise.all([
            fetch('./events.json'),
            fetch('./clubs.json')
        ]);
        
        if (!eventsResponse.ok) {
            throw new Error(`Failed to load events: ${eventsResponse.status}`);
        }
        
        events = await eventsResponse.json();
        console.log(`Loaded ${events.length} events`);
        
        // Try to load clubs from clubs.json, fallback to extracting from events
        if (clubsResponse.ok) {
            try {
                const clubsData = await clubsResponse.json();
                clubs = clubsData.map(club => club.clubName).sort();
                console.log(`Loaded ${clubs.length} clubs from clubs.json`);
            } catch (clubsError) {
                console.warn('Failed to parse clubs.json, extracting from events:', clubsError);
                clubs = [...new Set(events.map(event => event.clubName))].sort();
                console.log(`Extracted ${clubs.length} clubs from events`);
            }
        } else {
            console.warn('clubs.json not found, extracting clubs from events');
            clubs = [...new Set(events.map(event => event.clubName))].sort();
            console.log(`Extracted ${clubs.length} clubs from events`);
        }
        
        // Assign colors to clubs
        assignClubColors();
        
        hideLoading();
        updateDisplay();
        
    } catch (error) {
        console.error('Failed to load data:', error);
        
        // If fetch fails (likely due to CORS), try fallback data
        if (error.message.includes('fetch') || error.name === 'TypeError') {
            console.log('Fetch failed, trying fallback data...');
            await loadFallbackData();
        } else {
            showError();
        }
    }
}

function assignClubColors() {
    console.log('Assigning colors to clubs...');
    
    // Reset club colors
    clubColors.clear();
    
    // Assign a color from the palette to each club
    clubs.forEach((club, index) => {
        const color = CLUB_COLOR_PALETTE[index % CLUB_COLOR_PALETTE.length];
        clubColors.set(club, color);
    });
    
    console.log(`Assigned colors to ${clubColors.size} clubs`);
}

async function loadFallbackData() {
    console.log('Loading fallback data...');
    
    // Fallback data when files can't be loaded
    events = [
        {
            eventName: "Tuesday Night Track Racing - Winter Championship - at DISC",
            eventDate: "2025-07-01T00:00:00Z",
            clubName: "Brunswick Cycling Club",
            eventUrl: "https://entryboss.cc/races/25059"
        },
        {
            eventName: "Thursday Motorpacing [with Intro Session]",
            eventDate: "2025-07-03T00:00:00Z",
            clubName: "Brunswick Cycling Club", 
            eventUrl: "https://entryboss.cc/races/25038"
        },
        {
            eventName: "Criterium - Graded scratch races @ Casey",
            eventDate: "2025-07-05T00:00:00Z",
            clubName: "Eastern Cycling Club",
            eventUrl: "https://entryboss.cc/races/25496"
        },
        {
            eventName: "Race 9 - CCC & VETS Combined Winter Series - Race 3",
            eventDate: "2025-07-05T00:00:00Z",
            clubName: "Colac Cycling Club",
            eventUrl: "https://entryboss.cc/races/26266"
        },
        {
            eventName: "Victorian Cyclo-cross Series Round 1 - Fruits of the Valley",
            eventDate: "2025-07-05T00:00:00Z",
            clubName: "AusCycling (Victoria)",
            eventUrl: "https://entryboss.cc/races/24312"
        },
        {
            eventName: "Tuesday Night Track Endurance Racing - Winter Championship - at DISC",
            eventDate: "2025-07-08T00:00:00Z",
            clubName: "Brunswick Cycling Club",
            eventUrl: "https://entryboss.cc/races/25060"
        },
        {
            eventName: "Hamilton Wheelers Championship Road Race",
            eventDate: "2025-07-12T00:00:00Z",
            clubName: "Hamilton Wheelers Cycling Club",
            eventUrl: "https://entryboss.cc/races/26100"
        },
        {
            eventName: "Race 11 - CCC & VETS Combined Winter Series - Race 5", 
            eventDate: "2025-07-19T00:00:00Z",
            clubName: "Colac Cycling Club",
            eventUrl: "https://entryboss.cc/races/26268"
        },
        {
            eventName: "Kermesse - Graded scratch races @ Yarra Glen",
            eventDate: "2025-07-19T00:00:00Z",
            clubName: "Eastern Cycling Club",
            eventUrl: "https://entryboss.cc/races/26159"
        },
        {
            eventName: "Victorian Cyclo-cross Series Round 2 - Castlemaine",
            eventDate: "2025-07-26T00:00:00Z",
            clubName: "AusCycling (Victoria)",
            eventUrl: "https://entryboss.cc/races/24344"
        }
    ];
    
    clubs = [...new Set(events.map(event => event.clubName))].sort();
    
    // Assign colors to clubs in fallback data
    assignClubColors();
    
    console.log(`Loaded ${events.length} fallback events and ${clubs.length} clubs`);
    
    // Show a notice about using fallback data
    showFallbackNotice();
    
    hideLoading();
    updateDisplay();
}

function showFallbackNotice() {
    // Create or update notice
    let notice = document.getElementById('fallback-notice');
    if (!notice) {
        notice = document.createElement('div');
        notice.id = 'fallback-notice';
        notice.style.cssText = `
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 1rem;
            margin: 1rem 0;
            border-radius: 8px;
            text-align: center;
        `;
        notice.innerHTML = `
            <strong>Demo Mode:</strong> Using fallback data. 
            For full functionality, please run: <code>python3 -m http.server 8000</code> 
            and open <a href="http://localhost:8000" target="_blank">http://localhost:8000</a>
        `;
        document.querySelector('.container').insertBefore(notice, document.querySelector('.controls'));
    }
}

function showLoading() {
    loadingElement.classList.remove('hidden');
    calendarView.classList.add('hidden');
    listView.classList.add('hidden');
    errorElement.classList.add('hidden');
}

function hideLoading() {
    loadingElement.classList.add('hidden');
}

function showError() {
    errorElement.classList.remove('hidden');
    calendarView.classList.add('hidden');
    listView.classList.add('hidden');
    loadingElement.classList.add('hidden');
    
    // Add retry button to error message
    if (!errorElement.querySelector('.retry-btn')) {
        const retryBtn = document.createElement('button');
        retryBtn.className = 'retry-btn';
        retryBtn.textContent = 'Retry';
        retryBtn.style.cssText = 'margin-top: 1rem; padding: 0.5rem 1rem; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer;';
        retryBtn.addEventListener('click', loadEvents);
        errorElement.appendChild(retryBtn);
    }
}

// View Management
function switchView(view) {
    currentView = view;
    
    if (view === 'calendar') {
        calendarViewBtn.classList.add('bg-primary', 'text-white', 'shadow-sm');
        calendarViewBtn.classList.remove('text-gray-600', 'hover:text-gray-800');
        listViewBtn.classList.remove('bg-primary', 'text-white', 'shadow-sm');
        listViewBtn.classList.add('text-gray-600', 'hover:text-gray-800');
        calendarView.classList.remove('hidden');
        listView.classList.add('hidden');
    } else {
        listViewBtn.classList.add('bg-primary', 'text-white', 'shadow-sm');
        listViewBtn.classList.remove('text-gray-600', 'hover:text-gray-800');
        calendarViewBtn.classList.remove('bg-primary', 'text-white', 'shadow-sm');
        calendarViewBtn.classList.add('text-gray-600', 'hover:text-gray-800');
        listView.classList.remove('hidden');
        calendarView.classList.add('hidden');
    }
    
    saveState();
    updateDisplay();
}

// Club Filtering
function handleClubSearch(e) {
    const query = e.target.value.toLowerCase();
    
    // Always show the club list when typing (unified behavior)
    if (clubListPanel.classList.contains('hidden')) {
        showClubList();
    } else {
        // Update the existing club list with filtered results
        renderClubList();
    }
}


// Assign a color to a club if it doesn't have one
function assignClubColor(club) {
    if (!clubColors.has(club)) {
        const colorIndex = clubColors.size % CLUB_COLOR_PALETTE.length;
        clubColors.set(club, CLUB_COLOR_PALETTE[colorIndex]);
    }
    return clubColors.get(club);
}

function addClubFilter(club) {
    selectedClubs.add(club);
    assignClubColor(club); // Assign color when club is selected
    // Keep search text for continued filtering - don't clear the search box
    updateSelectedClubsDisplay();
    updateClubList(); // Update the club list checkboxes
    updateDisplay();
    saveState();
}

function removeClubFilter(club) {
    selectedClubs.delete(club);
    // Keep the color assigned even after removal for consistency
    updateSelectedClubsDisplay();
    updateClubList(); // Update the club list checkboxes
    updateDisplay();
    saveState();
}

// Club List Management

function showClubList() {
    clubListPanel.classList.remove('hidden');
    renderClubList();
}

function hideClubList() {
    clubListPanel.classList.add('hidden');
}

function renderClubList() {
    clubListContainer.innerHTML = '';
    
    const query = clubSearchInput.value.toLowerCase();
    const filteredClubs = query.length > 0 
        ? clubs.filter(club => club.toLowerCase().includes(query))
        : clubs;
    
    filteredClubs.forEach(club => {
        const clubItem = document.createElement('div');
        clubItem.className = 'flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `club-${club.replace(/\s+/g, '-').toLowerCase()}`;
        checkbox.className = 'w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2';
        checkbox.checked = selectedClubs.has(club);
        checkbox.addEventListener('change', (e) => {
            e.stopPropagation(); // Prevent event bubbling
            handleClubCheckbox(club, checkbox.checked);
        });
        
        const label = document.createElement('label');
        label.htmlFor = checkbox.id;
        label.className = 'flex-1 text-sm text-gray-700 cursor-pointer';
        label.textContent = club;
        label.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Prevent focus loss on label click
        });
        
        clubItem.appendChild(checkbox);
        clubItem.appendChild(label);
        clubListContainer.appendChild(clubItem);
    });
    
    if (filteredClubs.length === 0) {
        const noClubs = document.createElement('div');
        noClubs.className = 'px-3 py-4 text-center text-gray-500 text-sm';
        noClubs.textContent = 'No clubs found';
        clubListContainer.appendChild(noClubs);
    }
}

function updateClubList() {
    // Only update if the club list is currently visible
    if (!clubListPanel.classList.contains('hidden')) {
        renderClubList();
    }
}

function handleClubCheckbox(club, isChecked) {
    if (isChecked) {
        selectedClubs.add(club);
        assignClubColor(club);
    } else {
        selectedClubs.delete(club);
    }
    
    updateSelectedClubsDisplay();
    updateDisplay();
    saveState();
    
    // Keep the club list open for continued multi-selection
    // Do not close the list or clear the search box
}

function updateSelectedClubsDisplay() {
    selectedClubsContainer.innerHTML = '';
    
    [...selectedClubs].sort().forEach(club => {
        const tag = document.createElement('div');
        tag.className = 'inline-flex items-center gap-2 px-4 py-2 rounded-full text-white font-medium text-sm border-2 border-white/30 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all';
        
        // Apply the club's assigned color
        const clubColor = assignClubColor(club);
        tag.style.backgroundColor = clubColor;
        
        const name = document.createElement('span');
        name.textContent = club;
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'w-5 h-5 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors text-sm';
        removeBtn.innerHTML = '×';
        removeBtn.addEventListener('click', () => removeClubFilter(club));
        
        tag.appendChild(name);
        tag.appendChild(removeBtn);
        selectedClubsContainer.appendChild(tag);
    });
}

// Display Updates
function updateDisplay() {
    const filteredEvents = getFilteredEvents();
    updateSelectedClubsDisplay();
    
    if (currentView === 'calendar') {
        renderCalendar(filteredEvents);
    } else {
        renderEventsList(filteredEvents);
    }
}

function getFilteredEvents() {
    if (selectedClubs.size === 0) {
        return events;
    }
    
    return events.filter(event => selectedClubs.has(event.clubName));
}

// Calendar Rendering
function renderCalendar(events) {
    calendarGrid.innerHTML = '';
    
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - today.getDay()); // Start of current week
    
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 28); // 4 weeks
    
    // Create day headers
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayNames.forEach(day => {
        const header = document.createElement('div');
        header.className = 'bg-gray-100 p-3 text-center font-semibold text-gray-700 text-sm';
        header.textContent = day;
        calendarGrid.appendChild(header);
    });
    
    // Create calendar days
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        const dayElement = createCalendarDay(currentDate, events);
        calendarGrid.appendChild(dayElement);
        currentDate.setDate(currentDate.getDate() + 1);
    }
}

function createCalendarDay(date, events) {
    const dayElement = document.createElement('div');
    dayElement.className = 'bg-white p-3 min-h-[120px] border border-gray-100';
    
    const dayNumber = document.createElement('div');
    dayNumber.className = 'font-semibold mb-2 text-gray-800';
    dayNumber.textContent = date.getDate();
    dayElement.appendChild(dayNumber);
    
    // Find events for this day
    const dayEvents = events.filter(event => {
        const eventDate = new Date(event.eventDate);
        return eventDate.toDateString() === date.toDateString();
    });
    
    // Add events to day
    dayEvents.slice(0, 3).forEach(event => { // Limit to 3 events per day for space
        const eventElement = document.createElement('div');
        eventElement.className = 'text-white px-2 py-1 mb-1 rounded text-xs cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 border-l-2 border-white/30';
        eventElement.textContent = truncateText(event.eventName, 20);
        eventElement.title = `${event.eventName} - ${event.clubName}`;
        
        // Apply club color if the club is selected
        if (selectedClubs.has(event.clubName)) {
            const clubColor = assignClubColor(event.clubName);
            eventElement.style.backgroundColor = clubColor;
        } else {
            eventElement.style.backgroundColor = '#667eea';
        }
        
        eventElement.addEventListener('click', () => openEvent(event));
        dayElement.appendChild(eventElement);
    });
    
    // Show "+X more" if there are more events
    if (dayEvents.length > 3) {
        const moreElement = document.createElement('div');
        moreElement.className = 'text-white px-2 py-1 mb-1 rounded text-xs bg-gray-500';
        moreElement.textContent = `+${dayEvents.length - 3} more`;
        dayElement.appendChild(moreElement);
    }
    
    return dayElement;
}

// List Rendering
function renderEventsList(events) {
    eventsList.innerHTML = '';
    
    if (events.length === 0) {
        const noEvents = document.createElement('div');
        noEvents.className = 'px-6 py-8 text-center text-gray-500';
        noEvents.innerHTML = '<div class="text-lg">No events found</div>';
        eventsList.appendChild(noEvents);
        return;
    }
    
    events.forEach(event => {
        const eventElement = createEventListItem(event);
        eventsList.appendChild(eventElement);
    });
}

function createEventListItem(event) {
    const eventElement = document.createElement('div');
    eventElement.className = 'px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors';
    eventElement.addEventListener('click', () => openEvent(event));
    
    const eventName = document.createElement('div');
    eventName.className = 'text-lg font-semibold text-gray-900 mb-2';
    eventName.textContent = event.eventName;
    
    const eventDetails = document.createElement('div');
    eventDetails.className = 'flex items-center gap-4 text-sm text-gray-600';
    
    const eventDate = document.createElement('span');
    eventDate.className = 'font-medium';
    eventDate.textContent = formatDate(event.eventDate);
    
    const eventClub = document.createElement('span');
    eventClub.className = 'px-3 py-1 rounded-full text-sm';
    eventClub.textContent = event.clubName;
    
    // Apply club color if the club is selected
    if (selectedClubs.has(event.clubName)) {
        const clubColor = assignClubColor(event.clubName);
        eventClub.style.backgroundColor = clubColor;
        eventClub.style.color = 'white';
        eventClub.classList.add('font-medium');
    } else {
        eventClub.classList.add('bg-gray-200', 'text-gray-700');
    }
    
    eventDetails.appendChild(eventDate);
    eventDetails.appendChild(eventClub);
    
    eventElement.appendChild(eventName);
    eventElement.appendChild(eventDetails);
    
    return eventElement;
}

// Event Interaction
function openEvent(event) {
    window.open(event.eventUrl, '_blank', 'noopener,noreferrer');
}

// Onboarding
function showOnboarding() {
    onboardingBanner.classList.remove('hidden');
}

function dismissOnboarding() {
    onboardingBanner.classList.add('hidden');
    setCookie('hasSeenOnboarding', 'true', 365);
}

// Utility Functions
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    };
    return date.toLocaleDateString('en-AU', options);
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}

// Initialize view state
document.addEventListener('DOMContentLoaded', function() {
    // Set initial view state
    if (currentView === 'list') {
        switchView('list');
    } else {
        switchView('calendar');
    }
});
