// ===================================
// Mobile Beta Site - JavaScript
// ===================================

// Color Palette for Club Color Coding (20 colors)
const COLOR_PALETTE = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
    '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e', '#fb7185', '#fb923c', '#fbbf24'
];

// Global State
const state = {
    events: [],
    clubs: [],
    selectedClubs: new Set(),
    clubColors: new Map(),
    currentView: 'list', // 'list' or 'calendar'
    calendarMode: 'month', // 'month' or 'week'
    hideBMXEvents: false,
    hideMTBEvents: false,
    isFirstTime: true,
    currentDate: new Date(),
    selectedDate: null, // Track selected calendar date
    touchStartX: 0,
    touchStartY: 0,
    touchEndX: 0,
    touchEndY: 0
};

// DOM Elements (cached for performance)
const elements = {};

// ===================================
// Initialization
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    console.log('Initializing mobile beta app...');
    
    // Cache DOM elements
    initializeElements();
    
    // Load saved state
    loadState();
    
    // Set up event listeners
    setupEventListeners();
    
    // Set up touch gestures
    setupTouchGestures();
    
    // Load data
    await loadData();
    
    // Show onboarding for first-time users
    if (state.isFirstTime) {
        showOnboarding();
    }
    
    // Initial render
    updateDisplay();
}

function initializeElements() {
    // Header elements
    elements.filterButton = document.getElementById('filterButton');
    elements.filterCount = document.getElementById('filterCount');
    elements.activeFiltersContainer = document.getElementById('activeFiltersContainer');
    elements.activeFiltersChips = document.getElementById('activeFiltersChips');
    
    // State elements
    elements.loadingState = document.getElementById('loadingState');
    elements.errorState = document.getElementById('errorState');
    elements.emptyState = document.getElementById('emptyState');
    elements.retryButton = document.getElementById('retryButton');
    
    // View containers
    elements.listView = document.getElementById('listView');
    elements.calendarView = document.getElementById('calendarView');
    elements.listContainer = document.getElementById('listContainer');
    elements.calendarContainer = document.getElementById('calendarContainer');
    
    // Calendar controls
    elements.calendarTitle = document.getElementById('calendarTitle');
    elements.prevPeriodButton = document.getElementById('prevPeriodButton');
    elements.nextPeriodButton = document.getElementById('nextPeriodButton');
    elements.monthModeButton = document.getElementById('monthModeButton');
    elements.weekModeButton = document.getElementById('weekModeButton');
    
    // Bottom navigation
    elements.listViewButton = document.getElementById('listViewButton');
    elements.calendarViewButton = document.getElementById('calendarViewButton');
    
    // Filter drawer
    elements.filterDrawer = document.getElementById('filterDrawer');
    elements.filterBackdrop = document.getElementById('filterBackdrop');
    elements.filterDrawerContent = document.getElementById('filterDrawerContent');
    elements.closeFilterButton = document.getElementById('closeFilterButton');
    elements.applyFiltersButton = document.getElementById('applyFiltersButton');
    elements.hideBMXCheckbox = document.getElementById('hideBMXCheckbox');
    elements.hideMTBCheckbox = document.getElementById('hideMTBCheckbox');
    elements.clubSearchInput = document.getElementById('clubSearchInput');
    elements.clubFiltersList = document.getElementById('clubFiltersList');
    elements.clearAllClubsButton = document.getElementById('clearAllClubsButton');
    
    // Onboarding
    elements.onboardingOverlay = document.getElementById('onboardingOverlay');
    elements.dismissOnboardingButton = document.getElementById('dismissOnboardingButton');
    
    // Selected date events
    elements.selectedDateEvents = document.getElementById('selectedDateEvents');
    elements.selectedDateTitle = document.getElementById('selectedDateTitle');
    elements.selectedDateEventsList = document.getElementById('selectedDateEventsList');
    elements.clearSelectedDateButton = document.getElementById('clearSelectedDateButton');
}

function setupEventListeners() {
    // Filter button
    elements.filterButton.addEventListener('click', showFilterDrawer);
    
    // Filter drawer
    elements.closeFilterButton.addEventListener('click', hideFilterDrawer);
    elements.filterBackdrop.addEventListener('click', hideFilterDrawer);
    elements.applyFiltersButton.addEventListener('click', applyFilters);
    
    // Event type filters
    elements.hideBMXCheckbox.addEventListener('change', (e) => {
        state.hideBMXEvents = e.target.checked;
    });
    elements.hideMTBCheckbox.addEventListener('change', (e) => {
        state.hideMTBEvents = e.target.checked;
    });
    
    // Club search
    elements.clubSearchInput.addEventListener('input', filterClubList);
    
    // Clear all clubs
    elements.clearAllClubsButton.addEventListener('click', clearAllClubs);
    
    // Bottom navigation
    elements.listViewButton.addEventListener('click', () => switchView('list'));
    elements.calendarViewButton.addEventListener('click', () => switchView('calendar'));
    
    // Calendar navigation
    elements.prevPeriodButton.addEventListener('click', () => navigatePeriod(-1));
    elements.nextPeriodButton.addEventListener('click', () => navigatePeriod(1));
    
    // Calendar mode toggle
    elements.monthModeButton.addEventListener('click', () => switchCalendarMode('month'));
    elements.weekModeButton.addEventListener('click', () => switchCalendarMode('week'));
    
    // Onboarding
    elements.dismissOnboardingButton.addEventListener('click', dismissOnboarding);
    
    // Retry button
    elements.retryButton.addEventListener('click', loadData);
    
    // Clear selected date button
    elements.clearSelectedDateButton.addEventListener('click', clearSelectedDate);
}

function setupTouchGestures() {
    const container = elements.calendarContainer;
    
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
}

// ===================================
// Data Loading
// ===================================

async function loadData() {
    try {
        elements.loadingState.classList.remove('hidden');
        elements.errorState.classList.add('hidden');
        
        const [eventsData, clubsData] = await Promise.all([
            loadEvents(),
            loadClubs()
        ]);
        
        state.events = eventsData;
        state.clubs = clubsData;
        
        // Assign colors to clubs
        assignClubColors();
        
        elements.loadingState.classList.add('hidden');
        
        console.log(`Loaded ${state.events.length} events and ${state.clubs.length} clubs`);
        
        // Render club filters
        renderClubFilters();
        
        // Update display
        updateDisplay();
        
    } catch (error) {
        console.error('Error loading data:', error);
        elements.loadingState.classList.add('hidden');
        elements.errorState.classList.remove('hidden');
    }
}

async function loadEvents() {
    try {
        const response = await fetch('events.json');
        if (!response.ok) throw new Error('Failed to fetch events');
        return await response.json();
    } catch (error) {
        console.error('Error loading events:', error);
        return loadFallbackData().events;
    }
}

async function loadClubs() {
    try {
        const response = await fetch('clubs.json');
        if (!response.ok) throw new Error('Failed to fetch clubs');
        return await response.json();
    } catch (error) {
        console.error('Error loading clubs:', error);
        return loadFallbackData().clubs;
    }
}

function loadFallbackData() {
    return {
        events: [],
        clubs: []
    };
}

function assignClubColors() {
    state.clubs.forEach((club, index) => {
        const colorIndex = index % COLOR_PALETTE.length;
        state.clubColors.set(club.clubName, COLOR_PALETTE[colorIndex]);
    });
}

// ===================================
// State Management
// ===================================

function loadState() {
    try {
        const savedState = localStorage.getItem('betaAppState');
        if (savedState) {
            const parsed = JSON.parse(savedState);
            state.selectedClubs = new Set(parsed.selectedClubs || []);
            state.currentView = parsed.currentView || 'list';
            state.calendarMode = parsed.calendarMode || 'month';
            state.hideBMXEvents = parsed.hideBMXEvents || false;
            state.hideMTBEvents = parsed.hideMTBEvents || false;
            state.isFirstTime = parsed.isFirstTime !== false;
            
            // Update checkboxes
            elements.hideBMXCheckbox.checked = state.hideBMXEvents;
            elements.hideMTBCheckbox.checked = state.hideMTBEvents;
        }
    } catch (error) {
        console.error('Error loading state:', error);
    }
}

function saveState() {
    try {
        const stateToSave = {
            selectedClubs: Array.from(state.selectedClubs),
            currentView: state.currentView,
            calendarMode: state.calendarMode,
            hideBMXEvents: state.hideBMXEvents,
            hideMTBEvents: state.hideMTBEvents,
            isFirstTime: state.isFirstTime
        };
        localStorage.setItem('betaAppState', JSON.stringify(stateToSave));
    } catch (error) {
        console.error('Error saving state:', error);
    }
}

// ===================================
// Filtering
// ===================================

function getFilteredEvents() {
    return state.events.filter(event => {
        // Club filter
        if (state.selectedClubs.size > 0 && !state.selectedClubs.has(event.clubName)) {
            return false;
        }
        
        // BMX filter
        if (state.hideBMXEvents && event.eventName.toLowerCase().includes('bmx')) {
            return false;
        }
        
        // MTB filter
        if (state.hideMTBEvents && (
            event.eventName.toLowerCase().includes('mtb') ||
            event.eventName.toLowerCase().includes('mountain bike')
        )) {
            return false;
        }
        
        return true;
    });
}

function toggleClubFilter(clubName) {
    if (state.selectedClubs.has(clubName)) {
        state.selectedClubs.delete(clubName);
    } else {
        state.selectedClubs.add(clubName);
    }
    updateClubCheckbox(clubName);
}

function updateClubCheckbox(clubName) {
    const checkbox = document.querySelector(`input[data-club="${clubName}"]`);
    if (checkbox) {
        checkbox.checked = state.selectedClubs.has(clubName);
    }
}

function clearAllClubs() {
    state.selectedClubs.clear();
    renderClubFilters();
}

function filterClubList() {
    const searchTerm = elements.clubSearchInput.value.toLowerCase();
    const clubItems = elements.clubFiltersList.querySelectorAll('.club-filter-item');
    
    clubItems.forEach(item => {
        const clubName = item.dataset.club.toLowerCase();
        if (clubName.includes(searchTerm)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

// ===================================
// Filter Drawer
// ===================================

function showFilterDrawer() {
    elements.filterDrawer.classList.remove('hidden');
    elements.filterDrawer.classList.add('drawer-open');
    elements.filterDrawer.classList.remove('drawer-closing');
    document.body.style.overflow = 'hidden';
}

function hideFilterDrawer() {
    elements.filterDrawer.classList.add('drawer-closing');
    elements.filterDrawer.classList.remove('drawer-open');
    
    setTimeout(() => {
        elements.filterDrawer.classList.add('hidden');
        elements.filterDrawer.classList.remove('drawer-closing');
        document.body.style.overflow = '';
    }, 250);
}

function applyFilters() {
    hideFilterDrawer();
    saveState();
    updateSelectedClubsDisplay();
    updateDisplay();
}

function renderClubFilters() {
    elements.clubFiltersList.innerHTML = '';
    
    state.clubs.forEach(club => {
        const item = document.createElement('div');
        item.className = 'club-filter-item';
        item.dataset.club = club.clubName;
        
        const isSelected = state.selectedClubs.has(club.clubName);
        const color = state.clubColors.get(club.clubName);
        
        item.innerHTML = `
            <label class="club-filter-label">
                <div class="club-color-indicator" style="background-color: ${color}"></div>
                <span class="club-filter-name">${club.clubName}</span>
            </label>
            <input 
                type="checkbox" 
                ${isSelected ? 'checked' : ''} 
                data-club="${club.clubName}"
                class="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary"
            >
        `;
        
        const checkbox = item.querySelector('input');
        checkbox.addEventListener('change', () => toggleClubFilter(club.clubName));
        
        item.addEventListener('click', (e) => {
            if (e.target !== checkbox) {
                toggleClubFilter(club.clubName);
            }
        });
        
        elements.clubFiltersList.appendChild(item);
    });
}

function updateSelectedClubsDisplay() {
    if (state.selectedClubs.size === 0) {
        elements.activeFiltersContainer.classList.add('hidden');
        elements.filterCount.classList.add('hidden');
        return;
    }
    
    elements.activeFiltersContainer.classList.remove('hidden');
    elements.filterCount.classList.remove('hidden');
    elements.filterCount.textContent = state.selectedClubs.size;
    
    elements.activeFiltersChips.innerHTML = '';
    
    state.selectedClubs.forEach(clubName => {
        const color = state.clubColors.get(clubName);
        const chip = document.createElement('div');
        chip.className = 'filter-chip';
        chip.style.backgroundColor = color;
        chip.innerHTML = `
            <span>${clubName}</span>
            <button data-club="${clubName}">
                <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
        `;
        
        chip.querySelector('button').addEventListener('click', () => {
            state.selectedClubs.delete(clubName);
            saveState();
            updateSelectedClubsDisplay();
            renderClubFilters();
            updateDisplay();
        });
        
        elements.activeFiltersChips.appendChild(chip);
    });
}

// ===================================
// View Management
// ===================================

function switchView(viewType) {
    state.currentView = viewType;
    saveState();
    updateDisplay();
    
    // Update navigation active state
    if (viewType === 'list') {
        elements.listViewButton.classList.add('nav-active');
        elements.calendarViewButton.classList.remove('nav-active');
    } else {
        elements.listViewButton.classList.remove('nav-active');
        elements.calendarViewButton.classList.add('nav-active');
    }
}

function switchCalendarMode(mode) {
    state.calendarMode = mode;
    saveState();
    updateDisplay();
    
    // Update mode toggle active state
    if (mode === 'month') {
        elements.monthModeButton.classList.add('calendar-mode-active');
        elements.weekModeButton.classList.remove('calendar-mode-active');
    } else {
        elements.monthModeButton.classList.remove('calendar-mode-active');
        elements.weekModeButton.classList.add('calendar-mode-active');
    }
}

function updateDisplay() {
    const filteredEvents = getFilteredEvents();
    
    // Hide all views first
    elements.listView.classList.add('hidden');
    elements.calendarView.classList.add('hidden');
    elements.emptyState.classList.add('hidden');
    
    // Show empty state if no events
    if (filteredEvents.length === 0) {
        elements.emptyState.classList.remove('hidden');
        return;
    }
    
    // Show appropriate view
    if (state.currentView === 'list') {
        elements.listView.classList.remove('hidden');
        renderEventsList(filteredEvents);
    } else {
        elements.calendarView.classList.remove('hidden');
        if (state.calendarMode === 'month') {
            renderMonthCalendar(filteredEvents);
        } else {
            renderWeekCalendar(filteredEvents);
        }
    }
}

// ===================================
// List View Rendering
// ===================================

function renderEventsList(events) {
    const grouped = groupEventsByDate(events);
    elements.listContainer.innerHTML = '';
    
    Object.keys(grouped).sort().forEach(dateKey => {
        const dayEvents = grouped[dateKey];
        const daySection = createDayPanel(dateKey, dayEvents);
        elements.listContainer.appendChild(daySection);
    });
}

function groupEventsByDate(events) {
    const grouped = {};
    
    events.forEach(event => {
        // Extract date directly from the ISO string to avoid timezone issues
        const dateKey = event.eventDate.split('T')[0];
        
        if (!grouped[dateKey]) {
            grouped[dateKey] = [];
        }
        grouped[dateKey].push(event);
    });
    
    return grouped;
}

function createDayPanel(dateKey, events) {
    const date = new Date(dateKey);
    const section = document.createElement('div');
    section.className = 'list-day-section';
    
    const header = document.createElement('div');
    header.className = 'list-day-header';
    header.innerHTML = `
        <div class="list-day-title">${formatDateLong(date)}</div>
        <div class="list-day-subtitle">${events.length} event${events.length !== 1 ? 's' : ''}</div>
    `;
    
    const listContainer = document.createElement('div');
    listContainer.className = 'list-events';
    
    events.forEach(event => {
        const eventItem = createEventListItem(event);
        listContainer.appendChild(eventItem);
    });
    
    section.appendChild(header);
    section.appendChild(listContainer);
    
    return section;
}

function createEventListItem(event) {
    const color = state.clubColors.get(event.clubName) || '#6b7280';
    const card = document.createElement('div');
    card.className = 'list-event-card';
    card.style.borderLeftColor = color;
    
    card.innerHTML = `
        <div class="list-event-name">${event.eventName}</div>
        <div class="list-event-details">
            <div class="list-event-detail">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                <span>${formatDateShort(new Date(event.eventDate))}</span>
            </div>
            <div class="list-event-detail">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                </svg>
                <span>${event.clubName}</span>
            </div>
        </div>
        <div class="list-event-club" style="background-color: ${color}20; color: ${color}">
            ${event.clubName}
        </div>
    `;
    
    card.addEventListener('click', () => openEvent(event));
    
    return card;
}

// ===================================
// Calendar Rendering - Month View
// ===================================

function renderMonthCalendar(events) {
    const year = state.currentDate.getFullYear();
    const month = state.currentDate.getMonth();
    
    // Update title
    elements.calendarTitle.textContent = formatMonthYear(state.currentDate);
    
    // Generate calendar grid
    const grid = generateMonthGrid(year, month, events);
    
    // Render calendar
    elements.calendarContainer.innerHTML = '';
    
    // Add day headers
    const headerDiv = document.createElement('div');
    headerDiv.className = 'calendar-header';
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayNames.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        headerDiv.appendChild(header);
    });
    elements.calendarContainer.appendChild(headerDiv);
    
    // Add calendar grid
    const gridDiv = document.createElement('div');
    gridDiv.className = 'calendar-grid';
    
    grid.forEach(dayData => {
        const cell = createMonthDayCell(dayData);
        gridDiv.appendChild(cell);
    });
    
    elements.calendarContainer.appendChild(gridDiv);
}

function generateMonthGrid(year, month, events) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const grid = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Group events by date for quick lookup
    const eventsByDate = {};
    events.forEach(event => {
        // Extract date directly from ISO string to avoid timezone issues
        const dateKey = event.eventDate.split('T')[0];
        if (!eventsByDate[dateKey]) {
            eventsByDate[dateKey] = [];
        }
        eventsByDate[dateKey].push(event);
    });
    
    // Generate 42 days (6 weeks)
    for (let i = 0; i < 42; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        
        // Create date key in local timezone to match event dates
        const dateYear = date.getFullYear();
        const dateMonth = String(date.getMonth() + 1).padStart(2, '0');
        const dateDay = String(date.getDate()).padStart(2, '0');
        const dateKey = `${dateYear}-${dateMonth}-${dateDay}`;
        const dayEvents = eventsByDate[dateKey] || [];
        
        grid.push({
            date: date,
            events: dayEvents,
            isCurrentMonth: date.getMonth() === month,
            isToday: isSameDay(date, today)
        });
    }
    
    return grid;
}

function createMonthDayCell(dayData) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day-cell';
    
    // Store the full date as a data attribute for accurate selection
    cell.dataset.date = dayData.date.toISOString().split('T')[0];
    
    if (!dayData.isCurrentMonth) {
        cell.classList.add('other-month');
    }
    if (dayData.isToday) {
        cell.classList.add('today');
    }
    
    const dayNumber = document.createElement('div');
    dayNumber.className = 'calendar-day-number';
    dayNumber.textContent = dayData.date.getDate();
    cell.appendChild(dayNumber);
    
    if (dayData.events.length > 0) {
        const eventsContainer = document.createElement('div');
        eventsContainer.className = 'calendar-day-events';
        
        // Show up to 3 event dots
        const displayEvents = dayData.events.slice(0, 3);
        displayEvents.forEach(event => {
            const dot = document.createElement('div');
            dot.className = 'calendar-event-dot';
            const color = state.clubColors.get(event.clubName) || '#6b7280';
            dot.style.backgroundColor = color;
            eventsContainer.appendChild(dot);
        });
        
        // Show count if more than 3 events
        if (dayData.events.length > 3) {
            const count = document.createElement('div');
            count.className = 'calendar-event-count';
            count.textContent = `+${dayData.events.length - 3}`;
            eventsContainer.appendChild(count);
        }
        
        cell.appendChild(eventsContainer);
    }
    
    // Click to show events for this day
    if (dayData.events.length > 0) {
        cell.addEventListener('click', () => showDayEvents(dayData));
    }
    
    return cell;
}

// ===================================
// Calendar Rendering - Week View
// ===================================

function renderWeekCalendar(events) {
    const weekStart = getWeekStart(state.currentDate);
    const weekData = generateWeekData(weekStart, events);
    
    // Update title
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    elements.calendarTitle.textContent = `${formatDateShort(weekStart)} - ${formatDateShort(weekEnd)}`;
    
    // Render week
    elements.calendarContainer.innerHTML = '';
    const weekDiv = document.createElement('div');
    weekDiv.className = 'week-calendar';
    
    weekData.forEach(dayData => {
        const card = createWeekDayCard(dayData);
        weekDiv.appendChild(card);
    });
    
    elements.calendarContainer.appendChild(weekDiv);
}

function generateWeekData(weekStart, events) {
    const weekData = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Group events by date
    const eventsByDate = {};
    events.forEach(event => {
        // Extract date directly from ISO string to avoid timezone issues
        const dateKey = event.eventDate.split('T')[0];
        if (!eventsByDate[dateKey]) {
            eventsByDate[dateKey] = [];
        }
        eventsByDate[dateKey].push(event);
    });
    
    // Generate 7 days
    for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        
        const dateKey = date.toISOString().split('T')[0];
        const dayEvents = eventsByDate[dateKey] || [];
        
        weekData.push({
            date: date,
            events: dayEvents,
            isToday: isSameDay(date, today)
        });
    }
    
    return weekData;
}

function createWeekDayCard(dayData) {
    const card = document.createElement('div');
    card.className = 'week-day-card';
    
    if (dayData.isToday) {
        card.classList.add('today');
    }
    
    const header = document.createElement('div');
    header.className = 'week-day-header';
    header.innerHTML = `
        <div class="week-day-name">${formatDayName(dayData.date)}</div>
        <div class="week-day-date">${formatDateShort(dayData.date)}</div>
    `;
    card.appendChild(header);
    
    if (dayData.events.length > 0) {
        const eventsContainer = document.createElement('div');
        eventsContainer.className = 'week-day-events';
        
        dayData.events.forEach(event => {
            const eventItem = document.createElement('div');
            eventItem.className = 'week-event-item';
            const color = state.clubColors.get(event.clubName) || '#6b7280';
            eventItem.style.borderLeftColor = color;
            eventItem.innerHTML = `
                <div style="flex: 1;">
                    <div style="font-size: 0.8125rem; font-weight: 600; color: #111827; margin-bottom: 0.125rem;">
                        ${truncateText(event.eventName, 40)}
                    </div>
                    <div style="font-size: 0.75rem; color: #6b7280;">
                        ${event.clubName}
                    </div>
                </div>
            `;
            eventItem.addEventListener('click', () => openEvent(event));
            eventsContainer.appendChild(eventItem);
        });
        
        card.appendChild(eventsContainer);
    } else {
        const noEvents = document.createElement('div');
        noEvents.style.cssText = 'text-align: center; padding: 1rem; color: #9ca3af; font-size: 0.875rem;';
        noEvents.textContent = 'No events';
        card.appendChild(noEvents);
    }
    
    return card;
}

// ===================================
// Calendar Navigation
// ===================================

function navigatePeriod(direction) {
    if (state.calendarMode === 'month') {
        state.currentDate.setMonth(state.currentDate.getMonth() + direction);
    } else {
        state.currentDate.setDate(state.currentDate.getDate() + (direction * 7));
    }
    updateDisplay();
}

// ===================================
// Touch Gesture Handling
// ===================================

function handleTouchStart(e) {
    state.touchStartX = e.touches[0].clientX;
    state.touchStartY = e.touches[0].clientY;
    state.touchEndX = e.touches[0].clientX;
    state.touchEndY = e.touches[0].clientY;
}

function handleTouchMove(e) {
    state.touchEndX = e.touches[0].clientX;
    state.touchEndY = e.touches[0].clientY;
}

function handleTouchEnd(e) {
    const deltaX = state.touchEndX - state.touchStartX;
    const deltaY = state.touchEndY - state.touchStartY;
    
    // Calculate total distance moved
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // Only process as swipe if moved more than 50px and mostly horizontal
    if (distance > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 2) {
        // Prevent default to stop click events from firing
        e.preventDefault();
        
        if (deltaX > 0) {
            // Swipe right - go to previous period
            navigatePeriod(-1);
        } else {
            // Swipe left - go to next period
            navigatePeriod(1);
        }
    }
    
    // Reset touch coordinates
    state.touchStartX = 0;
    state.touchStartY = 0;
    state.touchEndX = 0;
    state.touchEndY = 0;
}

// ===================================
// Utility Functions
// ===================================

function formatDateLong(date) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-AU', options);
}

function formatDateShort(date) {
    const options = { month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-AU', options);
}

function formatMonthYear(date) {
    const options = { year: 'numeric', month: 'long' };
    return date.toLocaleDateString('en-AU', options);
}

function formatDayName(date) {
    const options = { weekday: 'long' };
    return date.toLocaleDateString('en-AU', options);
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
}

function openEvent(event) {
    if (event.eventUrl) {
        window.open(event.eventUrl, '_blank');
    }
}

function showDayEvents(dayData) {
    // Store selected date
    state.selectedDate = dayData.date.toISOString().split('T')[0];
    
    // Update the title
    elements.selectedDateTitle.textContent = formatDateLong(dayData.date);
    
    // Render events for this date
    renderSelectedDateEvents(dayData.events);
    
    // Show the section
    elements.selectedDateEvents.classList.remove('hidden');
    
    // Update calendar cell highlighting
    updateCalendarSelection();
    
    // Scroll to the events section smoothly
    setTimeout(() => {
        elements.selectedDateEvents.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
}

function renderSelectedDateEvents(events) {
    elements.selectedDateEventsList.innerHTML = '';
    
    if (events.length === 0) {
        elements.selectedDateEventsList.innerHTML = '<p class="text-center text-gray-500 py-4">No events on this date</p>';
        return;
    }
    
    events.forEach(event => {
        const color = state.clubColors.get(event.clubName) || '#6b7280';
        const eventCard = document.createElement('div');
        eventCard.className = 'mb-3 last:mb-0';
        eventCard.innerHTML = `
            <div class="bg-gray-50 rounded-lg p-3 border-l-4 cursor-pointer hover:bg-gray-100 active:bg-gray-200 transition-colors" style="border-left-color: ${color}">
                <div class="font-semibold text-gray-900 text-sm mb-1">${event.eventName}</div>
                <div class="flex items-center gap-2 text-xs text-gray-600">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                    </svg>
                    <span>${event.clubName}</span>
                </div>
                <div class="mt-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium" style="background-color: ${color}20; color: ${color}">
                    ${event.clubName}
                </div>
            </div>
        `;
        
        eventCard.addEventListener('click', () => openEvent(event));
        elements.selectedDateEventsList.appendChild(eventCard);
    });
}

function clearSelectedDate() {
    state.selectedDate = null;
    elements.selectedDateEvents.classList.add('hidden');
    updateCalendarSelection();
}

function updateCalendarSelection() {
    // Remove 'selected' class from all calendar cells
    const allCells = document.querySelectorAll('.calendar-day-cell');
    allCells.forEach(cell => cell.classList.remove('selected'));
    
    // If there's a selected date, add 'selected' class to that cell
    if (state.selectedDate && state.currentView === 'calendar') {
        allCells.forEach(cell => {
            // Compare the stored date attribute directly with the selected date
            if (cell.dataset.date === state.selectedDate) {
                cell.classList.add('selected');
            }
        });
    }
}

// ===================================
// Onboarding
// ===================================

function showOnboarding() {
    elements.onboardingOverlay.classList.remove('hidden');
    elements.onboardingOverlay.classList.add('show');
}

function dismissOnboarding() {
    elements.onboardingOverlay.classList.remove('show');
    elements.onboardingOverlay.classList.add('hidden');
    state.isFirstTime = false;
    saveState();
}

console.log('Mobile beta app loaded');
