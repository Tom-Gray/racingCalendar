const { test, expect } = require('@playwright/test');

test.describe('Basic Functionality', () => {
  test('should load the page successfully', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Check that the page title is correct
    await expect(page).toHaveTitle(/Victorian Cycling Races/);
    
    // Check that the main header is visible
    await expect(page.locator('h1')).toContainText('Victorian Cycling Races');
    
    // Check that the subtitle is visible
    await expect(page.locator('header p')).toContainText('Discover upcoming cycling races across Victoria');
  });

  test('should load events data', async ({ page }) => {
    await page.goto('/');
    
    // Wait for loading to complete
    await expect(page.locator('#loading')).toBeHidden({ timeout: 10000 });
    
    // Check that either calendar or list view is visible (not both hidden)
    const calendarVisible = await page.locator('#calendar-view').isVisible();
    const listVisible = await page.locator('#list-view').isVisible();
    
    expect(calendarVisible || listVisible).toBe(true);
  });

  test('should not show error state on successful load', async ({ page }) => {
    await page.goto('/');
    
    // Wait for loading to complete
    await expect(page.locator('#loading')).toBeHidden({ timeout: 10000 });
    
    // Error element should be hidden
    await expect(page.locator('#error')).toBeHidden();
  });

  test('should have working navigation buttons on desktop', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/');
    
    // Wait for page to load
    await expect(page.locator('#loading')).toBeHidden({ timeout: 10000 });
    
    // Check that view toggle buttons exist and are clickable on desktop
    await expect(page.locator('#calendar-view-btn')).toBeVisible();
    await expect(page.locator('#list-view-btn')).toBeVisible();
    await expect(page.locator('.view-toggle')).toBeVisible();
    
    // Check that club search input exists
    await expect(page.locator('#club-search')).toBeVisible();
  });

  test('should show navigation buttons on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Wait for page to load
    await expect(page.locator('#loading')).toBeHidden({ timeout: 10000 });
    
    // View toggle buttons should be visible on mobile now
    await expect(page.locator('.view-toggle')).toBeVisible();
    
    // Club search should still be visible
    await expect(page.locator('#club-search')).toBeVisible();
  });

  test('should handle desktop responsive design', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/');
    await expect(page.locator('#loading')).toBeHidden({ timeout: 10000 });
    
    // Check that controls are visible in desktop layout
    await expect(page.locator('.lg\\:flex-row')).toBeVisible();
    
    // Both view toggle buttons should be visible
    await expect(page.locator('.view-toggle')).toBeVisible();
    
    // User should be able to switch between views
    await page.click('#list-view-btn');
    await expect(page.locator('#list-view')).toBeVisible();
    await expect(page.locator('#calendar-view')).toBeHidden();
    
    await page.click('#calendar-view-btn');
    await expect(page.locator('#calendar-view')).toBeVisible();
    await expect(page.locator('#list-view')).toBeHidden();
  });

  test('should show list view by default on mobile', async ({ page }) => {
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page.locator('#loading')).toBeHidden({ timeout: 10000 });
    
    // Page should still be functional on mobile
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('#club-search')).toBeVisible();
    
    // View toggle should be visible on mobile now
    await expect(page.locator('.view-toggle')).toBeVisible();
    
    // List view should be the default view (but not forced)
    await expect(page.locator('#list-view')).toBeVisible();
    await expect(page.locator('#calendar-view')).toBeHidden();
    
    // Should be able to switch to calendar view on mobile
    await page.click('#calendar-view-btn');
    await expect(page.locator('#calendar-view')).toBeVisible();
    await expect(page.locator('#list-view')).toBeHidden();
  });

  test('should not have console errors', async ({ page }) => {
    const consoleErrors = [];
    
    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.goto('/');
    await expect(page.locator('#loading')).toBeHidden({ timeout: 10000 });
    
    // Filter out known acceptable errors (like CORS warnings in development)
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('CORS') && 
      !error.includes('file://') &&
      !error.includes('favicon.ico')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });
});
