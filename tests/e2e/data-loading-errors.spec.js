const { test, expect } = require('@playwright/test');

async function failVictoriaEvents(page) {
  await page.route('**/events-vic.json', (route) => route.fulfill({ status: 500 }));
}

test('desktop shows an error when the event file is unavailable', async ({ page }) => {
  await failVictoriaEvents(page);
  await page.addInitScript(() => {
    localStorage.setItem('hasSeenStateSelector', 'true');
    localStorage.setItem('selectedState', 'VIC');
  });

  await page.goto('http://localhost:8000');

  await expect(page.locator('#error')).toBeVisible();
  await expect(page.locator('#calendar-view')).toBeHidden();
});

test('mobile shows an error when the event file is unavailable', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await failVictoriaEvents(page);
  await page.addInitScript(() => {
    localStorage.setItem('mobileAppState', JSON.stringify({
      selectedState: 'VIC',
      selectedClubs: [],
      currentView: 'list',
      isFirstTime: false,
    }));
  });

  await page.goto('http://localhost:8000');

  await expect(page.locator('#errorState')).toBeVisible();
  await expect(page.locator('#loadingState')).toBeHidden();
});
