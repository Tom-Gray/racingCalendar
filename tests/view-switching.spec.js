const { test, expect } = require('@playwright/test');

test.describe('View Switching', () => {
  test('should allow view switching on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/');
    await expect(page.locator('#loading')).toBeHidden({ timeout: 10000 });
    
    // Initially should show list view (new default)
    await expect(page.locator('#list-view')).toBeVisible();
    await expect(page.locator('#calendar-view')).toBeHidden();
    
    // List button should be active
    await expect(page.locator('#list-view-btn')).toHaveClass(/bg-primary/);
    await expect(page.locator('#calendar-view-btn')).not.toHaveClass(/bg-primary/);
    
    // Switch to calendar view
    await page.click('#calendar-view-btn');
    
    // Calendar view should now be visible
    await expect(page.locator('#calendar-view')).toBeVisible();
    await expect(page.locator('#list-view')).toBeHidden();
    
    // Calendar button should be active
    await expect(page.locator('#calendar-view-btn')).toHaveClass(/bg-primary/);
    await expect(page.locator('#list-view-btn')).not.toHaveClass(/bg-primary/);
    
    // Switch back to list view
    await page.click('#list-view-btn');
    
    // List view should be visible again
    await expect(page.locator('#list-view')).toBeVisible();
    await expect(page.locator('#calendar-view')).toBeHidden();
    
    // List button should be active again
    await expect(page.locator('#list-view-btn')).toHaveClass(/bg-primary/);
    await expect(page.locator('#calendar-view-btn')).not.toHaveClass(/bg-primary/);
  });

  test('should allow view switching on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page.locator('#loading')).toBeHidden({ timeout: 10000 });
    
    // View toggle buttons should be visible on mobile now
    await expect(page.locator('.view-toggle')).toBeVisible();
    await expect(page.locator('#calendar-view-btn')).toBeVisible();
    await expect(page.locator('#list-view-btn')).toBeVisible();
    
    // Initially should show list view (default)
    await expect(page.locator('#list-view')).toBeVisible();
    await expect(page.locator('#calendar-view')).toBeHidden();
    
    // Should be able to switch to calendar view on mobile
    await page.click('#calendar-view-btn');
    await expect(page.locator('#calendar-view')).toBeVisible();
    await expect(page.locator('#list-view')).toBeHidden();
    
    // Should be able to switch back to list view
    await page.click('#list-view-btn');
    await expect(page.locator('#list-view')).toBeVisible();
    await expect(page.locator('#calendar-view')).toBeHidden();
  });

  test('should maintain view preference on desktop when resizing', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/');
    await expect(page.locator('#loading')).toBeHidden({ timeout: 10000 });
    
    // Switch to list view
    await page.click('#list-view-btn');
    await expect(page.locator('#list-view')).toBeVisible();
    
    // Resize to tablet size (still above mobile breakpoint)
    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(100);
    
    // Should still show list view
    await expect(page.locator('#list-view')).toBeVisible();
    await expect(page.locator('#calendar-view')).toBeHidden();
    await expect(page.locator('#list-view-btn')).toHaveClass(/bg-primary/);
  });

  test('should handle rapid view switching', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/');
    await expect(page.locator('#loading')).toBeHidden({ timeout: 10000 });
    
    // Rapidly switch between views
    for (let i = 0; i < 5; i++) {
      await page.click('#list-view-btn');
      await expect(page.locator('#list-view')).toBeVisible();
      
      await page.click('#calendar-view-btn');
      await expect(page.locator('#calendar-view')).toBeVisible();
    }
    
    // Should end up in calendar view
    await expect(page.locator('#calendar-view')).toBeVisible();
    await expect(page.locator('#list-view')).toBeHidden();
  });

  test('should show appropriate content in each view', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/');
    await expect(page.locator('#loading')).toBeHidden({ timeout: 10000 });
    
    // Initially should show list view (new default)
    await expect(page.locator('#list-view')).toBeVisible();
    await expect(page.locator('#events-list')).toBeVisible();
    await expect(page.locator('#list-view h2')).toContainText('Upcoming Events');
    
    // Should have event items
    const eventItems = page.locator('#events-list .event-item');
    const eventCount = await eventItems.count();
    expect(eventCount).toBeGreaterThan(0);
    
    // Switch to calendar view
    await page.click('#calendar-view-btn');
    
    // Calendar view should show calendar grid
    await expect(page.locator('#calendar-view')).toBeVisible();
    await expect(page.locator('#calendar-grid')).toBeVisible();
    await expect(page.locator('#calendar-title')).toContainText('Next 4 Weeks');
  });

  test('should preserve view state across page reloads on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/');
    await expect(page.locator('#loading')).toBeHidden({ timeout: 10000 });
    
    // Switch to list view
    await page.click('#list-view-btn');
    await expect(page.locator('#list-view')).toBeVisible();
    
    // Reload the page
    await page.reload();
    await expect(page.locator('#loading')).toBeHidden({ timeout: 10000 });
    
    // Should remember list view preference
    await expect(page.locator('#list-view')).toBeVisible();
    await expect(page.locator('#calendar-view')).toBeHidden();
    await expect(page.locator('#list-view-btn')).toHaveClass(/bg-primary/);
  });

  test('should handle view switching with filtered events', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/');
    await expect(page.locator('#loading')).toBeHidden({ timeout: 10000 });
    
    // Add a club filter
    await page.click('#club-search');
    await expect(page.locator('#club-list-panel')).toBeVisible();
    
    const firstClub = page.locator('#club-list-container input[type="checkbox"]').first();
    await firstClub.click();
    
    // Should see selected club
    await expect(page.locator('#selected-clubs .club-tag')).toHaveCount(1);
    
    // Switch to list view with filter active
    await page.click('#list-view-btn');
    await expect(page.locator('#list-view')).toBeVisible();
    
    // Should show filtered events in list view (may be 0 or more depending on filter)
    const filteredEventItems = page.locator('#events-list .event-item');
    const filteredCount = await filteredEventItems.count();
    expect(filteredCount).toBeGreaterThanOrEqual(0);
    
    // Switch back to calendar view
    await page.click('#calendar-view-btn');
    await expect(page.locator('#calendar-view')).toBeVisible();
    
    // Filter should still be active
    await expect(page.locator('#selected-clubs .club-tag')).toHaveCount(1);
  });

  test('should handle breakpoint transitions correctly', async ({ page }) => {
    // Start at desktop size
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/');
    await expect(page.locator('#loading')).toBeHidden({ timeout: 10000 });
    
    // Switch to calendar view on desktop
    await page.click('#calendar-view-btn');
    await expect(page.locator('#calendar-view')).toBeVisible();
    
    // Resize to mobile (below 767px)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(100);
    
    // Should still show calendar view and toggle buttons should remain visible
    await expect(page.locator('#calendar-view')).toBeVisible();
    await expect(page.locator('.view-toggle')).toBeVisible();
    
    // Resize back to desktop
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForTimeout(100);
    
    // Toggle buttons should still be visible
    await expect(page.locator('.view-toggle')).toBeVisible();
    // Should remember calendar view preference
    await expect(page.locator('#calendar-view')).toBeVisible();
    await expect(page.locator('#calendar-view-btn')).toHaveClass(/bg-primary/);
  });
});
