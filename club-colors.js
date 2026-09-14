// One deterministic palette for both interfaces. Adding or removing clubs never
// changes an existing club's colour. Palette reuse is expected with many clubs.
window.RaceCalendarColors = (() => {
    const palette = [
        '#2563eb', '#dc2626', '#d97706', '#059669', '#7c3aed',
        '#db2777', '#0891b2', '#ea580c', '#65a30d', '#4f46e5',
        '#c026d3', '#0d9488', '#e11d48', '#0284c7', '#16a34a',
        '#ca8a04', '#9333ea', '#0e7490', '#9f1239', '#1e40af'
    ];
    return {
        forClub(name) {
            let hash = 0;
            for (const character of name.trim().toLowerCase()) {
                hash = (Math.imul(hash, 31) + character.codePointAt(0)) | 0;
            }
            return palette[(hash >>> 0) % palette.length];
        }
    };
})();
