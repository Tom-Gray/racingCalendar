// Keep stale downloaded snapshots from showing past dates in either interface.
window.RaceCalendarDates = (() => {
    const zones = {
        ACT: 'Australia/Sydney', NSW: 'Australia/Sydney', NT: 'Australia/Darwin',
        QLD: 'Australia/Brisbane', SA: 'Australia/Adelaide', TAS: 'Australia/Hobart',
        VIC: 'Australia/Melbourne', WA: 'Australia/Perth'
    };
    return {
        upcoming(events, state, now = new Date()) {
            const parts = new Intl.DateTimeFormat('en-AU', {
                timeZone: zones[state] || zones.VIC,
                year: 'numeric', month: '2-digit', day: '2-digit'
            }).formatToParts(now);
            const fields = Object.fromEntries(parts.map(part => [part.type, part.value]));
            const today = `${fields.year}-${fields.month}-${fields.day}`;
            return events.filter(event => {
                const day = typeof event.eventDate === 'string' ? event.eventDate.slice(0, 10) : '';
                return /^\d{4}-\d{2}-\d{2}$/.test(day) && day >= today;
            });
        }
    };
})();
