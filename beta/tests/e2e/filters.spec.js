const { test, expect } = require('@playwright/test');

test.describe('Club Search Filters', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept state files to return mock data
    await page.route('**/events-vic.json', async (route) => {
      const mockEvents = [
        { eventName: "Brunswick Road Race", eventDate: "2026-01-15T09:00:00Z", clubName: "Brunswick Cycling Club", eventUrl: "https://mock.com" },
        { eventName: "Eastern Vets Track", eventDate: "2026-01-18T18:30:00Z", clubName: "Eastern Cycling Club", eventUrl: "https://mock.com" },
        { eventName: "Hawthorn MTB", eventDate: "2026-01-20T10:00:00Z", clubName: "Hawthorn Cycling Club", eventUrl: "https://mock.com" },
        { eventName: "BMX Race", eventDate: "2026-01-22T08:00:00Z", clubName: "BMX Victoria", eventUrl: "https://mock.com" }
      ];
      await route.fulfill({ json: mockEvents });
    });
  });

  test('desktop: should filter club list based on search input', async ({ page }) => {
    // Bypass onboarding modal
    await page.goto('http://localhost:8000');
    await page.evaluate(() => {
      localStorage.setItem('hasSeenStateSelector', 'true');
      localStorage.setItem('selectedState', 'VIC');
    });
    await page.reload();

    // 1. Check initial state (club list should be visible immediately)
    const clubList = page.locator('#club-list-container');
    await expect(clubList).toBeVisible();

    // 2. Check initial count (should see all 4 mock clubs)
    await expect(clubList.locator('label')).toHaveCount(4);

    // 3. Type "Bruns" into search
    await page.fill('#club-search', 'Bruns');
    
    // 4. Verify only Brunswick is visible
    await expect(clubList.locator('label')).toHaveCount(1);
    await expect(clubList.locator('label')).toContainText('Brunswick Cycling Club');

    // 5. Type something that matches nothing
    await page.fill('#club-search', 'NonExistentClub');
    await expect(page.locator('text=No clubs found')).toBeVisible();
  });

  test('mobile: should filter club list in filter drawer', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    
    await page.goto('http://localhost:8000');
    
    // Bypass onboarding by clicking a state
    await page.click('#onboardingStateOptions button:has-text("VIC")');
    await expect(page.locator('#onboardingOverlay')).toBeHidden();

    // 1. Open Filter Drawer
    await page.click('#filterButton');
    const filterDrawer = page.locator('#filterDrawerContent');
    await expect(filterDrawer).toBeVisible();

    // 2. Initial count in mobile drawer (using .club-filter-item)
    const clubItems = page.locator('.club-filter-item');
    await expect(clubItems).toHaveCount(4);

    // 3. Search for "Hawthorn"
    await page.fill('#clubSearchInput', 'Hawthorn');

    // 4. Verify only Hawthorn is visible (other items should be display: none)
    const visibleClubs = clubItems.filter({ hasText: 'Hawthorn Cycling Club' });
    await expect(visibleClubs).toBeVisible();
    
    const hiddenClubs = clubItems.filter({ hasText: 'Brunswick Cycling Club' });
    await expect(hiddenClubs).not.toBeVisible();

    // 5. Clear search
    await page.fill('#clubSearchInput', '');
    await expect(clubItems.filter({ hasText: 'Brunswick Cycling Club' })).toBeVisible();
  });
});
