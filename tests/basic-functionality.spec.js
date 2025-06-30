const { test, expect } = require('@playwright/test');

test.describe('Basic Functionality', () => {
  test('should load the page successfully', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Check that the page title is correct
    await expect(page).toHaveTitle(/Victorian Cycling Events/);
    
    // Check that the main header is visible
    await expect(page.locator('h1')).toContainText('Victorian Cycling Events');
    
    // Check that the subtitle is visible
    await expect(page.locator('header p')).toContainText('Discover upcoming cycling events across Victoria');
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

  test('should have working navigation buttons', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to load
    await expect(page.locator('#loading')).toBeHidden({ timeout: 10000 });
    
    // Check that view toggle buttons exist and are clickable
    await expect(page.locator('#calendar-view-btn')).toBeVisible();
    await expect(page.locator('#list-view-btn')).toBeVisible();
    
    // Check that club search input exists
    await expect(page.locator('#club-search')).toBeVisible();
  });

  test('should handle responsive design', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/');
    await expect(page.locator('#loading')).toBeHidden({ timeout: 10000 });
    
    // Check that controls are visible in desktop layout
    await expect(page.locator('.lg\\:flex-row')).toBeVisible();
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await expect(page.locator('#loading')).toBeHidden({ timeout: 10000 });
    
    // Page should still be functional on mobile
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('#club-search')).toBeVisible();
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
