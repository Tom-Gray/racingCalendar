const { test, expect } = require('@playwright/test');

const NOW = new Date('2026-09-14T02:00:00Z');

const events = [
  { eventName: 'Alpha Road Race', eventDate: '2026-09-19T00:00:00Z', clubName: 'Alpha Cycling Club', eventUrl: 'https://example.com/alpha' },
  { eventName: 'Beta Criterium', eventDate: '2026-09-20T00:00:00Z', clubName: 'Beta Cycling Club', eventUrl: 'https://example.com/beta' },
  { eventName: 'BMX Open', eventDate: '2026-09-21T00:00:00Z', clubName: 'Neutral Cycling Club', eventUrl: 'https://example.com/bmx' },
  { eventName: 'Mountain Bike Challenge', eventDate: '2026-09-22T00:00:00Z', clubName: 'Trail Cycling Club', eventUrl: 'https://example.com/mtb' },
];

async function prepareDesktop(page, routeEvents = events) {
  await page.clock.setFixedTime(NOW);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem('hasSeenStateSelector', 'true');
    localStorage.setItem('hasSeenv2Announcement', 'true');
    if (!localStorage.getItem('selectedState')) localStorage.setItem('selectedState', 'VIC');
    if (!localStorage.getItem('currentView')) localStorage.setItem('currentView', 'list');
  });
  await page.route('**/events-vic.json', route => route.fulfill({ json: routeEvents }));
  await page.goto('/');
  await expect(page.locator('#events-list .day-event-item')).toHaveCount(routeEvents.length);
}

async function prepareMobile(page, routeEvents = events) {
  await page.clock.setFixedTime(NOW);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => {
    if (!localStorage.getItem('mobileAppState')) {
      localStorage.setItem('mobileAppState', JSON.stringify({
        selectedState: 'VIC',
        currentView: 'list',
        isFirstTime: false,
        statePreferences: {},
      }));
    }
  });
  await page.route('**/events-vic.json', route => route.fulfill({ json: routeEvents }));
  await page.goto('/');
  await expect(page.locator('.list-event-card')).toHaveCount(routeEvents.length);
}

test.describe('Core filtering flows', () => {
  test('desktop club selection filters events and survives reload', async ({ page }) => {
    await prepareDesktop(page);

    await page.getByLabel(/Alpha Cycling Club/).check();
    await expect(page.locator('#events-list .day-event-item')).toHaveCount(1);
    await expect(page.locator('#events-list')).toContainText('Alpha Road Race');
    await expect(page.locator('#events-list')).not.toContainText('Beta Criterium');

    await page.reload();
    await expect(page.getByLabel(/Alpha Cycling Club/)).toBeChecked();
    await expect(page.locator('#events-list .day-event-item')).toHaveCount(1);

    await page.locator('#selected-clubs button').click();
    await expect(page.locator('#events-list .day-event-item')).toHaveCount(events.length);
  });

  test('mobile club selection filters events, persists, and can be cleared', async ({ page }) => {
    await prepareMobile(page);

    await page.locator('#filterButton').click();
    const alpha = page.locator('.club-filter-item').filter({ hasText: 'Alpha Cycling Club' });
    await alpha.locator('input').check();
    await page.locator('#applyFiltersButton').click();

    await expect(page.locator('.list-event-card')).toHaveCount(1);
    await expect(page.locator('.list-event-card')).toContainText('Alpha Road Race');
    await expect(page.locator('#filterCount')).toHaveText('1');

    await page.reload();
    await expect(page.locator('.list-event-card')).toHaveCount(1);
    await page.locator('#filterButton').click();
    await expect(page.locator('.club-filter-item').filter({ hasText: 'Alpha Cycling Club' }).locator('input')).toBeChecked();

    await page.locator('#clearAllClubsButton').click();
    await page.locator('#applyFiltersButton').click();
    await expect(page.locator('.list-event-card')).toHaveCount(events.length);
    await expect(page.locator('#filterCount')).toBeHidden();
  });

  test('desktop BMX and MTB filters hide events by event name and persist', async ({ page }) => {
    await prepareDesktop(page);

    await page.locator('#hide-bmx-checkbox').check();
    await page.locator('#hide-mtb-checkbox').check();
    await expect(page.locator('#events-list')).not.toContainText('BMX Open');
    await expect(page.locator('#events-list')).not.toContainText('Mountain Bike Challenge');
    await expect(page.locator('#events-list .day-event-item')).toHaveCount(2);

    await page.reload();
    await expect(page.locator('#hide-bmx-checkbox')).toBeChecked();
    await expect(page.locator('#hide-mtb-checkbox')).toBeChecked();
    await expect(page.locator('#events-list .day-event-item')).toHaveCount(2);
  });

  test('mobile BMX and MTB filters hide events and persist', async ({ page }) => {
    await prepareMobile(page);

    await page.locator('#filterButton').click();
    await page.locator('#hideBMXCheckbox').check();
    await page.locator('#hideMTBCheckbox').check();
    await page.locator('#applyFiltersButton').click();

    await expect(page.locator('.list-event-card')).toHaveCount(2);
    await expect(page.locator('#listContainer')).not.toContainText('BMX Open');
    await expect(page.locator('#listContainer')).not.toContainText('Mountain Bike Challenge');
    await expect(page.locator('#filterCount')).toHaveText('2');

    await page.reload();
    await expect(page.locator('.list-event-card')).toHaveCount(2);
    await page.locator('#filterButton').click();
    await expect(page.locator('#hideBMXCheckbox')).toBeChecked();
    await expect(page.locator('#hideMTBCheckbox')).toBeChecked();
  });
});

test.describe('State data and preferences', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(NOW);
    await page.route('**/events-*.json', route => {
      const stateCode = route.request().url().match(/events-([a-z]+)\.json/i)[1].toUpperCase();
      return route.fulfill({ json: [{
        eventName: `${stateCode} Championship`,
        eventDate: '2026-09-25T00:00:00Z',
        clubName: `${stateCode} Cycling Club`,
        eventUrl: `https://example.com/${stateCode.toLowerCase()}`,
      }] });
    });
  });

  test('desktop state switching replaces the event data and survives reload', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.addInitScript(() => {
      localStorage.setItem('hasSeenStateSelector', 'true');
      localStorage.setItem('hasSeenv2Announcement', 'true');
      if (!localStorage.getItem('selectedState')) localStorage.setItem('selectedState', 'VIC');
      if (!localStorage.getItem('currentView')) localStorage.setItem('currentView', 'list');
    });
    await page.goto('/');
    await expect(page.locator('#events-list')).toContainText('VIC Championship');

    await page.locator('#state-selector-btn').click();
    await page.locator('.state-option[data-state="NSW"]').click();
    await expect(page.locator('#events-list')).toContainText('NSW Championship');
    await expect(page.locator('#events-list')).not.toContainText('VIC Championship');

    await page.reload();
    await expect(page.locator('#current-state-label')).toHaveText('NSW');
    await expect(page.locator('#events-list')).toContainText('NSW Championship');
  });

  test('mobile state switching replaces data and keeps preferences state-specific', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.addInitScript(() => {
      if (!localStorage.getItem('mobileAppState')) {
        localStorage.setItem('mobileAppState', JSON.stringify({
          selectedState: 'VIC', currentView: 'list', isFirstTime: false, statePreferences: {},
        }));
      }
    });
    await page.goto('/');
    await expect(page.locator('#listContainer')).toContainText('VIC Championship');

    await page.locator('#filterButton').click();
    await page.locator('#hideBMXCheckbox').check();
    await page.locator('#applyFiltersButton').click();

    await page.locator('#stateSelectorButton').click();
    await page.locator('#stateOptionsContainer button').filter({ hasText: 'New South Wales' }).click();
    await expect(page.locator('#listContainer')).toContainText('NSW Championship');
    await expect(page.locator('#listContainer')).not.toContainText('VIC Championship');
    await page.locator('#filterButton').click();
    await expect(page.locator('#hideBMXCheckbox')).not.toBeChecked();
    await page.locator('#closeFilterButton').click();

    await page.locator('#stateSelectorButton').click();
    await page.locator('#stateOptionsContainer button').filter({ hasText: 'Victoria' }).click();
    await page.locator('#filterButton').click();
    await expect(page.locator('#hideBMXCheckbox')).toBeChecked();
  });
});

test.describe('Retry recovery', () => {
  test('desktop recovers after a failed event request', async ({ page }) => {
    let attempts = 0;
    await page.clock.setFixedTime(NOW);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.addInitScript(() => {
      localStorage.setItem('hasSeenStateSelector', 'true');
      localStorage.setItem('hasSeenv2Announcement', 'true');
      if (!localStorage.getItem('selectedState')) localStorage.setItem('selectedState', 'VIC');
      if (!localStorage.getItem('currentView')) localStorage.setItem('currentView', 'list');
    });
    await page.route('**/events-vic.json', route => {
      attempts += 1;
      return attempts === 1
        ? route.fulfill({ status: 500 })
        : route.fulfill({ json: [events[0]] });
    });
    await page.goto('/');
    await expect(page.locator('#error')).toBeVisible();

    await page.locator('#error .retry-btn').click();
    await expect(page.locator('#error')).toBeHidden();
    await expect(page.locator('#events-list')).toContainText('Alpha Road Race');
  });

  test('mobile recovers after a failed event request', async ({ page }) => {
    let attempts = 0;
    await page.clock.setFixedTime(NOW);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.addInitScript(() => {
      if (!localStorage.getItem('mobileAppState')) {
        localStorage.setItem('mobileAppState', JSON.stringify({
          selectedState: 'VIC', currentView: 'list', isFirstTime: false, statePreferences: {},
        }));
      }
    });
    await page.route('**/events-vic.json', route => {
      attempts += 1;
      return attempts === 1
        ? route.fulfill({ status: 500 })
        : route.fulfill({ json: [events[0]] });
    });
    await page.goto('/');
    await expect(page.locator('#errorState')).toBeVisible();

    await page.locator('#retryButton').click();
    await expect(page.locator('#errorState')).toBeHidden();
    await expect(page.locator('#listContainer')).toContainText('Alpha Road Race');
  });
});
