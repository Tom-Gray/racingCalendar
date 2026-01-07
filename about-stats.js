// About page statistics functionality
let statsData = {
    events: [],
    clubs: [],
    loaded: false
};

async function initAboutStats() {
    try {
        showStatsLoading();
        
        // Check if we're running from file:// protocol
        const isFileProtocol = window.location.protocol === 'file:';
        
        if (isFileProtocol) {
            console.warn('Running from file:// protocol. Using fallback statistics.');
            await loadFallbackStats();
            return;
        }
        
        // Fetch with timeout and better error handling
        const fetchWithTimeout = async (url, timeout = 10000) => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            try {
                const response = await fetch(url, {
                    signal: controller.signal,
                    cache: 'no-cache',
                    headers: {
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache'
                    }
                });
                clearTimeout(timeoutId);
                return response;
            } catch (error) {
                clearTimeout(timeoutId);
                throw error;
            }
        };
        
        // Load events and clubs data
        const [eventsResponse, clubsResponse] = await Promise.all([
            fetchWithTimeout('./events.json').catch(() => null),
            fetchWithTimeout('./clubs.json').catch(() => null)
        ]);
        
        // Parse events data
        if (eventsResponse && eventsResponse.ok) {
            try {
                statsData.events = await eventsResponse.json();
            } catch (error) {
                console.warn('Failed to parse events.json:', error);
                statsData.events = [];
            }
        }
        
        // Parse clubs data
        if (clubsResponse && clubsResponse.ok) {
            try {
                statsData.clubs = await clubsResponse.json();
            } catch (error) {
                console.warn('Failed to parse clubs.json:', error);
                // Extract clubs from events if clubs.json fails
                if (statsData.events.length > 0) {
                    const uniqueClubs = [...new Set(statsData.events.map(event => event.clubName))];
                    statsData.clubs = uniqueClubs.map(name => ({ clubName: name }));
                }
            }
        } else if (statsData.events.length > 0) {
            // Extract clubs from events if clubs.json is not available
            const uniqueClubs = [...new Set(statsData.events.map(event => event.clubName))];
            statsData.clubs = uniqueClubs.map(name => ({ clubName: name }));
        }
        
        statsData.loaded = true;
        updateStatisticsDisplay();
        
    } catch (error) {
        console.error('Failed to load statistics:', error);
        await loadFallbackStats();
    }
}

async function loadFallbackStats() {
    // Fallback statistics when data can't be loaded
    statsData.events = Array(220).fill({ eventName: 'Sample Event' }); // Approximate count
    statsData.clubs = Array(37).fill({ clubName: 'Sample Club', lastSeen: '2025-06-30T12:09:22Z' });   // Approximate count
    statsData.loaded = true;
    updateStatisticsDisplay();
    showFallbackNotice();
}

function showStatsLoading() {
    const statsContainer = document.getElementById('statistics-container');
    if (statsContainer) {
        statsContainer.innerHTML = `
            <div class="flex items-center justify-center py-8">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span class="ml-3 text-gray-600">Loading statistics...</span>
            </div>
        `;
    }
}

function updateStatisticsDisplay() {
    const statsContainer = document.getElementById('statistics-container');
    if (!statsContainer) return;
    
    const eventCount = statsData.events.length;
    const clubCount = statsData.clubs.length;
    
    // Get the most recent lastSeen date from clubs data
    let lastUpdated = 'Recently';
    if (statsData.clubs.length > 0 && statsData.clubs[0].lastSeen) {
        try {
            const dates = statsData.clubs
                .map(club => club.lastSeen)
                .filter(date => date)
                .map(date => new Date(date))
                .sort((a, b) => b - a);
            
            if (dates.length > 0) {
                lastUpdated = dates[0].toLocaleDateString('en-AU', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            }
        } catch (error) {
            console.warn('Error parsing lastSeen dates:', error);
        }
    }
    
    statsContainer.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- Events Count -->
            <div class="bg-gradient-to-br from-primary to-secondary text-white rounded-xl p-6 text-center shadow-lg hover:shadow-xl transition-shadow">
                <div class="text-3xl font-bold mb-2">${eventCount.toLocaleString()}</div>
                <div class="text-lg opacity-90">Events Tracked</div>
                <div class="text-sm opacity-75 mt-2">Across Victoria</div>
            </div>
            
            <!-- Clubs Count -->
            <div class="bg-gradient-to-br from-secondary to-primary text-white rounded-xl p-6 text-center shadow-lg hover:shadow-xl transition-shadow">
                <div class="text-3xl font-bold mb-2">${clubCount}</div>
                <div class="text-lg opacity-90">Cycling Clubs</div>
                <div class="text-sm opacity-75 mt-2">Victorian clubs</div>
            </div>
            
            <!-- Data Freshness -->
            <div class="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-6 text-center shadow-lg hover:shadow-xl transition-shadow">
                <div class="text-2xl font-bold mb-2">Daily Updates</div>
                <div class="text-lg opacity-90">Newest Event Posted:</div>
                <div class="text-sm opacity-75 mt-2">${lastUpdated}</div>
            </div>
        </div>
    `;
}


function showFallbackNotice() {
    // Check if fallback notice already exists
    if (document.getElementById('stats-fallback-notice')) return;
    
    const notice = document.createElement('div');
    notice.id = 'stats-fallback-notice';
    notice.className = 'bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mt-4';
    notice.innerHTML = `
        <div class="flex items-center">
            <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
            </svg>
            <span><strong>Demo Mode:</strong> Using approximate statistics. For live data, run with a local server.</span>
        </div>
    `;
    
    const statsContainer = document.getElementById('statistics-container');
    if (statsContainer && statsContainer.parentNode) {
        statsContainer.parentNode.insertBefore(notice, statsContainer.nextSibling);
    }
}
