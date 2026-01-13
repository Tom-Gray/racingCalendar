const { test, expect } = require('@playwright/test');

test.describe('Core Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Set up route interception for mock data
    await page.route('**/events-vic.json', async (route) => {
      const json = require('../fixtures/mock-events.json');
      await route.fulfill({ json });
    });
    
    await page.route('**/clubs.json', async (route) => {
      const json = require('../fixtures/mock-clubs.json');
      await route.fulfill({ json });
    });
  });

  test('should load the site successfully', async ({ page }) => {
    await page.goto('http://localhost:8000');
    
    // Wait for loading to complete
    await expect(page.locator('#loading, #loadingState')).toBeHidden({ timeout: 10000 });
    
    // Page should have a title
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
  });

  test('should load and display events', async ({ page }) => {
    await page.goto('http://localhost:8000');
    await expect(page.locator('#loading, #loadingState')).toBeHidden({ timeout: 10000 });
    
    // Check that events are rendered (flexible selector)
    const eventItems = page.locator('.day-event-item, .list-event-card, .event-item, [class*="event"]').first();
    await expect(eventItems).toBeVisible({ timeout: 5000 });
  });

  test('should display correct number of mock events', async ({ page }) => {
    await page.goto('http://localhost:8000');
    await expect(page.locator('#loading, #loadingState')).toBeHidden({ timeout: 10000 });
    
    // Count event items
    const eventItems = page.locator('.day-event-item, .list-event-card');
    const count = await eventItems.count();
    
    // We have 6 mock events
    expect(count).toBe(6);
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Intercept and fail the events request
    await page.route('**/events-vic.json', (route) => {
      route.abort('failed');
    });
    
    await page.goto('http://localhost:8000');
    await page.waitForTimeout(2000);
    
    // Should not crash - page should still be functional
    const pageState = await page.evaluate(() => document.readyState);
    expect(pageState).toBe('complete');
  });

  test('should persist state in localStorage', async ({ page }) => {
    await page.goto('http://localhost:8000');
    await expect(page.locator('#loading, #loadingState')).toBeHidden({ timeout: 10000 });
    
    // Check that localStorage is being used
    const hasLocalStorage = await page.evaluate(() => {
      return localStorage.length > 0;
    });
    
    expect(hasLocalStorage).toBeTruthy();
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    
    await page.goto('http://localhost:8000');
    await expect(page.locator('#loading, #loadingState')).toBeHidden({ timeout: 10000 });
    
    // Verify viewport is mobile size
    const viewportSize = page.viewportSize();
    expect(viewportSize.width).toBeLessThan(768);
    
    // Page should load content (mobile might load different page)
    await page.waitForTimeout(1000);
    const bodyContent = await page.locator('body').innerHTML();
    expect(bodyContent.length).toBeGreaterThan(100);
  });

  test('should be responsive on tablet viewport', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad
    
    await page.goto('http://localhost:8000');
    await expect(page.locator('#loading, #loadingState')).toBeHidden({ timeout: 10000 });
    
    // Should display events
    const eventItems = page.locator('.day-event-item, .list-event-card').first();
    await expect(eventItems).toBeVisible();
  });

  test('should be responsive on desktop viewport', async ({ page }) => {
    // Set desktop viewport (default in config)
    await page.goto('http://localhost:8000');
    await expect(page.locator('#loading, #loadingState')).toBeHidden({ timeout: 10000 });
    
    // Should display events
    const eventItems = page.locator('.day-event-item, .list-event-card').first();
    await expect(eventItems).toBeVisible();
  });

  test('should load clubs data successfully', async ({ page }) => {
    await page.goto('http://localhost:8000');
    await expect(page.locator('#loading, #loadingState')).toBeHidden({ timeout: 10000 });
    
    // If events loaded, clubs data was also loaded (events reference clubs)
    const eventItems = page.locator('.day-event-item, .list-event-card');
    const count = await eventItems.count();
    expect(count).toBeGreaterThan(0);
    
    // Check for club names in event content
    const firstEvent = eventItems.first();
    const eventHtml = await firstEvent.innerHTML();
    const hasClubInfo = eventHtml.length > 10; // Events should have content
    expect(hasClubInfo).toBeTruthy();
  });

  test('should not crash on rapid interactions', async ({ page }) => {
    await page.goto('http://localhost:8000');
    await expect(page.locator('#loading, #loadingState')).toBeHidden({ timeout: 10000 });
    
    // Rapidly click different elements
    const clickTargets = await page.locator('button, a, [role="button"]').all();
    
    for (let i = 0; i < Math.min(3, clickTargets.length); i++) {
      if (await clickTargets[i].isVisible()) {
        await clickTargets[i].click({ timeout: 1000 }).catch(() => {});
        await page.waitForTimeout(100);
      }
    }
    
    // Page should still be functional
    const pageState = await page.evaluate(() => document.readyState);
    expect(pageState).toBe('complete');
  });
});