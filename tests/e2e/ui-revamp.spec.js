const { test, expect } = require('@playwright/test');

test.describe('UI Revamp & Features', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept state files to return mock data
    await page.route('**/events-vic.json', async (route) => {
      const mockEvents = [
        { eventName: "Brunswick Road Race", eventDate: "2026-01-15T09:00:00Z", clubName: "Brunswick Cycling Club", eventUrl: "https://mock.com" }
      ];
      await route.fulfill({ json: mockEvents });
    });
  });

  test('desktop: should toggle dark mode and persist state', async ({ page }) => {
    await page.goto('http://localhost:8000');
    
    // Bypass onboarding modal
    await page.evaluate(() => {
      localStorage.setItem('hasSeenStateSelector', 'true');
      localStorage.setItem('selectedState', 'VIC');
    });
    await page.reload();

    const html = page.locator('html');
    
    // 1. Initial state (should be light mode by default in most cases, or follow system)
    // We'll explicitly check the toggle
    const darkModeToggle = page.locator('#dark-mode-toggle');
    await expect(darkModeToggle).toBeVisible();

    // 2. Toggle to dark mode
    await darkModeToggle.click();
    await expect(html).toHaveClass(/dark/);
    await expect(html).toHaveAttribute('data-theme', 'dark');

    // 3. Reload and verify persistence
    await page.reload();
    await expect(html).toHaveClass(/dark/);
    
    // 4. Toggle back to light mode
    await darkModeToggle.click();
    await expect(html).not.toHaveClass(/dark/);
  });

  test('desktop: should show announcement toast on first visit and dismiss it', async ({ page }) => {
    await page.goto('http://localhost:8000');
    
    // Bypass onboarding modal but NOT the announcement
    await page.evaluate(() => {
      localStorage.setItem('hasSeenStateSelector', 'true');
      localStorage.setItem('selectedState', 'VIC');
      localStorage.removeItem('hasSeenv2Announcement');
    });
    await page.reload();

    const toast = page.locator('#v2-announcement-toast');
    
    // 1. Toast should appear after a delay (we set 1500ms in script.js)
    await expect(toast).toBeVisible({ timeout: 5000 });
    await expect(toast).toContainText('Race Calendar Updates');

    // 2. Click "Got it" to dismiss
    await page.click('#dismiss-announcement');
    await expect(toast).toBeHidden();

    // 3. Reload and verify it doesn't reappear
    await page.reload();
    await expect(toast).toBeHidden();
  });

  test('desktop: club list should be always visible in sidebar', async ({ page }) => {
    await page.goto('http://localhost:8000');
    
    await page.evaluate(() => {
      localStorage.setItem('hasSeenStateSelector', 'true');
      localStorage.setItem('selectedState', 'VIC');
    });
    await page.reload();

    const clubListPanel = page.locator('#club-list-panel');
    
    // 1. Verify club list is visible immediately without clicking search
    await expect(clubListPanel).toBeVisible();
    
    const clubListContainer = page.locator('#club-list-container');
    await expect(clubListContainer.locator('label')).toHaveCount(1);
  });

  test('about page: should have working dark mode toggle', async ({ page }) => {
    await page.goto('http://localhost:8000');
    
    // Set dark mode on main page first
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
      localStorage.setItem('hasSeenStateSelector', 'true');
    });
    
    // Go to About page
    await page.goto('http://localhost:8000/about.html');
    
    const html = page.locator('html');
    
    // 1. Verify dark mode is applied from localStorage
    await expect(html).toHaveClass(/dark/);

    // 2. Toggle to light mode on About page
    const darkModeToggle = page.locator('#dark-mode-toggle');
    await darkModeToggle.click();
    await expect(html).not.toHaveClass(/dark/);
    
    // 3. Go back to main page and verify it's also light
    await page.goto('http://localhost:8000');
    await expect(html).not.toHaveClass(/dark/);
  });
});
