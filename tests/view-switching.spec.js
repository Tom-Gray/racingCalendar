const { test, expect } = require('@playwright/test');

test.describe('View Switching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the page to load completely
    await expect(page.locator('#loading')).toBeHidden({ timeout: 10000 });
  });

  test('should start with calendar view by default', async ({ page }) => {
    // Calendar view should be visible by default
    await expect(page.locator('#calendar-view')).toBeVisible();
    await expect(page.locator('#list-view')).toBeHidden();
    
    // Calendar button should be active (have primary styling)
    await expect(page.locator('#calendar-view-btn')).toHaveClass(/bg-primary/);
    await expect(page.locator('#list-view-btn')).not.toHaveClass(/bg-primary/);
  });

  test('should switch to list view when clicking list button', async ({ page }) => {
    // Click the list view button
    await page.locator('#list-view-btn').click();
    
    // List view should now be visible, calendar hidden
    await expect(page.locator('#list-view')).toBeVisible();
    await expect(page.locator('#calendar-view')).toBeHidden();
    
    // List button should now be active
    await expect(page.locator('#list-view-btn')).toHaveClass(/bg-primary/);
    await expect(page.locator('#calendar-view-btn')).not.toHaveClass(/bg-primary/);
  });

  test('should switch back to calendar view', async ({ page }) => {
    // First switch to list view
    await page.locator('#list-view-btn').click();
    await expect(page.locator('#list-view')).toBeVisible();
    
    // Then switch back to calendar view
    await page.locator('#calendar-view-btn').click();
    
    // Calendar view should be visible again
    await expect(page.locator('#calendar-view')).toBeVisible();
    await expect(page.locator('#list-view')).toBeHidden();
    
    // Calendar button should be active again
    await expect(page.locator('#calendar-view-btn')).toHaveClass(/bg-primary/);
    await expect(page.locator('#list-view-btn')).not.toHaveClass(/bg-primary/);
  });

  test('should display events in calendar view', async ({ page }) => {
    // Ensure we're in calendar view
    await page.locator('#calendar-view-btn').click();
    await expect(page.locator('#calendar-view')).toBeVisible();
    
    // Calendar should have a grid structure
    await expect(page.locator('#calendar-grid')).toBeVisible();
    
    // Should have day headers (Sun, Mon, Tue, etc.)
    const dayHeaders = page.locator('#calendar-grid > div').first();
    await expect(dayHeaders).toBeVisible();
    
    // Calendar title should be visible
    await expect(page.locator('#calendar-title')).toContainText('Next 4 Weeks');
  });

  test('should display events in list view', async ({ page }) => {
    // Switch to list view
    await page.locator('#list-view-btn').click();
    await expect(page.locator('#list-view')).toBeVisible();
    
    // List view should have events container
    await expect(page.locator('#events-list')).toBeVisible();
    
    // Should have a title
    const listTitle = page.locator('#list-view h2');
    await expect(listTitle).toContainText('Upcoming Events');
  });

  test('should show events in both views when clubs are selected', async ({ page }) => {
    // First select a club to ensure we have events to display
    await page.locator('#club-search').click();
    await expect(page.locator('#club-list-panel')).toBeVisible();
    
    const firstCheckbox = page.locator('#club-list-container input[type="checkbox"]').first();
    await firstCheckbox.check();
    
    // Wait for events to filter
    await page.waitForTimeout(1000);
    
    // Test calendar view shows events
    await page.locator('#calendar-view-btn').click();
    await expect(page.locator('#calendar-view')).toBeVisible();
    
    // Calendar should have some content (events or empty days)
    const calendarContent = page.locator('#calendar-grid');
    await expect(calendarContent).toBeVisible();
    
    // Test list view shows events
    await page.locator('#list-view-btn').click();
    await expect(page.locator('#list-view')).toBeVisible();
    
    // List should either have events or show "No events found"
    const eventsList = page.locator('#events-list');
    await expect(eventsList).toBeVisible();
  });

  test('should persist view selection after page reload', async ({ page }) => {
    // Switch to list view
    await page.locator('#list-view-btn').click();
    await expect(page.locator('#list-view')).toBeVisible();
    
    // Wait for state to be saved
    await page.waitForTimeout(1000);
    
    // Reload the page
    await page.reload();
    await expect(page.locator('#loading')).toBeHidden({ timeout: 10000 });
    
    // Should still be in list view
    await expect(page.locator('#list-view')).toBeVisible();
    await expect(page.locator('#calendar-view')).toBeHidden();
    await expect(page.locator('#list-view-btn')).toHaveClass(/bg-primary/);
  });

  test('should handle view switching with filtered events', async ({ page }) => {
    // Select a club first
    await page.locator('#club-search').click();
    await expect(page.locator('#club-list-panel')).toBeVisible();
    
    const firstCheckbox = page.locator('#club-list-container input[type="checkbox"]').first();
    await firstCheckbox.check();
    
    // Close the dropdown
    await page.locator('header').click();
    await page.waitForTimeout(500);
    
    // Switch between views and ensure filtering persists
    await page.locator('#list-view-btn').click();
    await expect(page.locator('#list-view')).toBeVisible();
    
    // Selected club should still be visible
    await expect(page.locator('#selected-clubs > div')).toHaveCount(1);
    
    // Switch back to calendar
    await page.locator('#calendar-view-btn').click();
    await expect(page.locator('#calendar-view')).toBeVisible();
    
    // Selected club should still be there
    await expect(page.locator('#selected-clubs > div')).toHaveCount(1);
  });

  test('should handle empty state in list view', async ({ page }) => {
    // Clear any existing selections by reloading
    await page.context().clearCookies();
    await page.reload();
    await expect(page.locator('#loading')).toBeHidden({ timeout: 10000 });
    
    // Select a club that might not have events, or clear all selections
    // This test checks that the list view handles empty states gracefully
    await page.locator('#list-view-btn').click();
    await expect(page.locator('#list-view')).toBeVisible();
    
    // List should be visible even if empty
    await expect(page.locator('#events-list')).toBeVisible();
  });

  test('should maintain responsive design in both views', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Test calendar view on mobile
    await page.locator('#calendar-view-btn').click();
    await expect(page.locator('#calendar-view')).toBeVisible();
    await expect(page.locator('#calendar-grid')).toBeVisible();
    
    // Test list view on mobile
    await page.locator('#list-view-btn').click();
    await expect(page.locator('#list-view')).toBeVisible();
    await expect(page.locator('#events-list')).toBeVisible();
    
    // View toggle buttons should still be accessible
    await expect(page.locator('#calendar-view-btn')).toBeVisible();
    await expect(page.locator('#list-view-btn')).toBeVisible();
  });
});
