const { test, expect } = require('@playwright/test');

test.describe('Multi-State and Persistence', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept all state files to return mock data
    await page.route('**/events-*.json', async (route) => {
      const url = route.request().url();
      const stateCode = url.split('events-')[1].split('.json')[0].toUpperCase();
      
      // Create simple mock data unique to each state
      const mockEvents = [
        {
          eventName: `${stateCode} Championship Race`,
          eventDate: new Date().toISOString(),
          clubName: `${stateCode} Racing Club`,
          eventUrl: "https://entryboss.cc/races/mock"
        }
      ];
      await route.fulfill({ json: mockEvents });
    });
  });

  test('should show onboarding and persist selected state on desktop', async ({ page }) => {
    // 1. Start with clean storage to trigger onboarding
    await page.goto('http://localhost:8000');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // 2. Verify state selection modal is visible
    const modal = page.locator('#state-selection-modal');
    await expect(modal).toBeVisible();

    // 3. Select NSW
    await page.click('.state-selection-option[data-state="NSW"]');
    await expect(modal).toBeHidden();

    // 4. Verify UI updated
    await expect(page.locator('#site-title')).toContainText('New South Wales');
    await expect(page.locator('#current-state-label')).toHaveText('NSW');

    // 5. Reload and verify it remembered NSW
    await page.reload();
    await expect(page.locator('#current-state-label')).toHaveText('NSW');
  });

  test('should remember filters independently per state', async ({ page }) => {
    // Bypass onboarding modal
    await page.goto('http://localhost:8000');
    await page.evaluate(() => {
      localStorage.setItem('hasSeenStateSelector', 'true');
      localStorage.setItem('selectedState', 'VIC');
    });
    await page.reload();
    
    // Ensure we are in VIC (using the header selector)
    await page.click('#state-selector-btn');
    await page.click('.state-option[data-state="VIC"]');
    
    // 1. Set a filter in VIC
    const bmxCheckbox = page.locator('#hide-bmx-checkbox');
    await bmxCheckbox.check();
    await expect(bmxCheckbox).toBeChecked();

    // 2. Switch to NSW
    await page.click('#state-selector-btn');
    await page.click('.state-option[data-state="NSW"]');
    
    // 3. Verify filter is NOT set in NSW
    await expect(bmxCheckbox).not.toBeChecked();

    // 4. Switch back to VIC
    await page.click('#state-selector-btn');
    await page.click('.state-option[data-state="VIC"]');

    // 5. Verify filter IS remembered for VIC
    await expect(bmxCheckbox).toBeChecked();
  });

  test('mobile: should show onboarding and handle drawer interactions', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone 13
    
    // 1. Clear storage and load mobile view (via index.html redirect logic)
    await page.goto('http://localhost:8000');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // 2. Verify Onboarding Overlay
    const onboarding = page.locator('#onboardingOverlay');
    await expect(onboarding).toBeVisible();

    // 3. Select QLD from onboarding grid
    await page.click('#onboardingStateOptions button:has-text("QLD")');
    await expect(onboarding).toBeHidden();

    // 4. Verify Header updated
    await expect(page.locator('#headerTitle')).toHaveText('QLD Cycling');

    // 5. Test State Drawer (clicking header title)
    await page.click('#stateSelectorButton');
    const stateDrawer = page.locator('#stateDrawerContent');
    await expect(stateDrawer).toBeVisible();

    // 6. Switch to WA
    await page.click('#stateOptionsContainer button:has-text("Western Australia")');
    await expect(stateDrawer).toBeHidden();
    await expect(page.locator('#headerTitle')).toHaveText('WA Cycling');
  });
});
