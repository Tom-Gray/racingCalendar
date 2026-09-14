const { test, expect } = require('@playwright/test');

for (const mobile of [false, true]) {
  test(`${mobile ? 'mobile' : 'desktop'} list excludes yesterday and retains today`, async ({ page }) => {
    // Melbourne is already on 15 September while UTC is still on the 14th.
    await page.clock.setFixedTime(new Date('2026-09-14T14:30:00Z'));
    await page.setViewportSize({ width: mobile ? 375 : 1280, height: 900 });
    await page.addInitScript(() => {
      localStorage.setItem('selectedState', 'VIC');
      localStorage.setItem('currentView', 'list');
      localStorage.setItem('hasSeenStateSelector', 'true');
      localStorage.setItem('hasSeenv2Announcement', 'true');
      localStorage.setItem('mobileAppState', JSON.stringify({ selectedState: 'VIC', currentView: 'list', isFirstTime: false }));
    });
    await page.route('**/events-vic.json', route => route.fulfill({ json: [
      { eventName: 'Old April race', eventDate: '2026-04-11T00:00:00Z', clubName: 'Club', eventUrl: 'https://example.com/1' },
      { eventName: 'Yesterday race', eventDate: '2026-09-14T00:00:00Z', clubName: 'Club', eventUrl: 'https://example.com/2' },
      { eventName: 'Today race', eventDate: '2026-09-15T00:00:00Z', clubName: 'Club', eventUrl: 'https://example.com/3' },
      { eventName: 'Tomorrow race', eventDate: '2026-09-16T00:00:00Z', clubName: 'Club', eventUrl: 'https://example.com/4' }
    ] }));
    await page.goto('/');
    const cards = page.locator(mobile ? '.list-event-card' : '#events-list .day-event-item');
    await expect(cards).toHaveCount(2);
    await expect(cards.filter({ hasText: 'Today race' })).toHaveCount(1);
    await expect(cards.filter({ hasText: 'Tomorrow race' })).toHaveCount(1);
    expect(await page.evaluate(() => window.RaceCalendarDates.upcoming([
      { eventDate: '2026-09-14T00:00:00Z' }, { eventDate: '2026-09-15T00:00:00Z' }
    ], 'WA').length)).toBe(2);
  });
}
