const { test, expect } = require('@playwright/test');

test('desktop calendar can expand one day or every day', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-14T02:00:00Z'));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem('hasSeenStateSelector', 'true');
    localStorage.setItem('hasSeenv2Announcement', 'true');
    localStorage.setItem('selectedState', 'VIC');
    localStorage.setItem('currentView', 'calendar');
  });
  const events = Array.from({ length: 9 }, (_, index) => ({
    eventName: `Race ${index + 1}`,
    eventDate: index < 5 ? '2026-09-19T00:00:00Z' : '2026-09-20T00:00:00Z',
    clubName: 'Example Cycling Club',
    eventUrl: `https://example.com/race-${index + 1}`,
  }));
  await page.route('**/events-vic.json', route => route.fulfill({ json: events }));
  await page.goto('/');

  const firstDay = page.locator('#calendar-grid [data-date="2026-09-19"]');
  const secondDay = page.locator('#calendar-grid [data-date="2026-09-20"]');
  await expect(firstDay.locator('.day-event-item:visible')).toHaveCount(3);
  await expect(secondDay.locator('.day-event-item:visible')).toHaveCount(3);

  await firstDay.getByRole('button', { name: 'Show 2 more events for 19 September 2026' }).click();
  await expect(firstDay.locator('.day-event-item:visible')).toHaveCount(5);
  await expect(secondDay.locator('.day-event-item:visible')).toHaveCount(3);
  await firstDay.getByRole('button', { name: 'Show fewer events for 19 September 2026' }).click();
  await expect(firstDay.locator('.day-event-item:visible')).toHaveCount(3);

  await page.getByRole('button', { name: 'Show all events' }).click();
  await expect(firstDay.locator('.day-event-item:visible')).toHaveCount(5);
  await expect(secondDay.locator('.day-event-item:visible')).toHaveCount(4);
  await expect(page.locator('#calendar-expand-btn')).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: 'Show fewer events' }).click();
  await expect(firstDay.locator('.day-event-item:visible')).toHaveCount(3);
  await expect(secondDay.locator('.day-event-item:visible')).toHaveCount(3);
  await expect(firstDay.getByRole('button', { name: 'Show 2 more events for 19 September 2026' })).toBeVisible();
});
