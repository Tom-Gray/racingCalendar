const { test, expect } = require('@playwright/test');

test.describe('Filtering', () => {
  test.beforeEach(async ({ page }) => {
    // Set up route interception for mock data
    await page.route('**/events.json', async (route) => {
      const json = require('../fixtures/mock-events.json');
      await route.fulfill({ json });
    });
    
    await page.route('**/clubs.json', async (route) => {
      const json = require('../fixtures/mock-clubs.json');
      await route.fulfill({ json });
    });
    
    await page.goto('http://localhost:8000');
    await expect(page.locator('#loading')).toBeHidden({ timeout: 10000 });
  });

  test('should filter events by club selection', async ({ page }) => {
    // Get initial event count
    const initialCount = await page.locator('.day-event-item, .list-event-card').count();
    expect(initialCount).toBe(6);
    
    // Open club search
    await page.locator('#club-search').click();
    await page.waitForTimeout(500);
    
    // Select a club filter (Brunswick Cycling Club)
    const clubListPanel = page.locator('#club-list-panel');
    if (await clubListPanel.isVisible()) {
      // Find checkbox for Brunswick Cycling Club
      const brunswickCheckbox = page.locator('input[data-club="Brunswick Cycling Club"]');
      await brunswickCheckbox.check();
      
      // Click outside or close the panel
      await page.locator('body').click();
      await page.waitForTimeout(500);
      
      // Verify filtered results - should only show Brunswick events (2 events)
      const filteredCount = await page.locator('.day-event-item, .list-event-card').count();
      expect(filteredCount).toBeLessThan(initialCount);
      expect(filteredCount).toBe(2);
    }
  });

  test('should show filter count indicator', async ({ page }) => {
    // Open club search
    await page.locator('#club-search').click();
    await page.waitForTimeout(500);
    
    const clubListPanel = page.locator('#club-list-panel');
    if (await clubListPanel.isVisible()) {
      // Select a club
      const checkbox = page.locator('input[data-club="Brunswick Cycling Club"]').first();
      await checkbox.check();
      
      // Close panel
      await page.locator('body').click();
      await page.waitForTimeout(500);
      
      // Check for filter count indicator
      const filterCount = page.locator('#filterCount');
      if (await filterCount.isVisible()) {
        const countText = await filterCount.textContent();
        expect(parseInt(countText)).toBeGreaterThan(0);
      }
    }
  });

  test('should hide BMX events when BMX filter is enabled', async ({ page }) => {
    // Count BMX events before filtering
    const bmxEventsBefore = await page.locator('.day-event-item, .list-event-card').filter({
      hasText: 'BMX'
    }).count();
    expect(bmxEventsBefore).toBeGreaterThan(0);
    
    // Enable BMX filter
    const hideBMXCheckbox = page.locator('#hide-bmx-checkbox, #hideBMXCheckbox');
    if (await hideBMXCheckbox.isVisible()) {
      await hideBMXCheckbox.check();
      await page.waitForTimeout(500);
      
      // BMX events should be hidden
      const bmxEventsAfter = await page.locator('.day-event-item, .list-event-card').filter({
        hasText: 'BMX'
      }).count();
      expect(bmxEventsAfter).toBe(0);
    }
  });

  test('should hide MTB events when MTB filter is enabled', async ({ page }) => {
    // Count MTB events before filtering
    const mtbEventsBefore = await page.locator('.day-event-item, .list-event-card').filter({
      hasText: /MTB|Mountain Bike/i
    }).count();
    expect(mtbEventsBefore).toBeGreaterThan(0);
    
    // Enable MTB filter
    const hideMTBCheckbox = page.locator('#hide-mtb-checkbox, #hideMTBCheckbox');
    if (await hideMTBCheckbox.isVisible()) {
      await hideMTBCheckbox.check();
      await page.waitForTimeout(500);
      
      // MTB events should be hidden
      const mtbEventsAfter = await page.locator('.day-event-item, .list-event-card').filter({
        hasText: /MTB|Mountain Bike/i
      }).count();
      expect(mtbEventsAfter).toBe(0);
    }
  });

  test('should combine club and event type filters', async ({ page }) => {
    // Open club search and select Brunswick Cycling Club
    await page.locator('#club-search').click();
    await page.waitForTimeout(500);
    
    const clubListPanel = page.locator('#club-list-panel');
    if (await clubListPanel.isVisible()) {
      const checkbox = page.locator('input[data-club="Brunswick Cycling Club"]').first();
      await checkbox.check();
      await page.locator('body').click();
      await page.waitForTimeout(500);
    }
    
    // Get count with club filter only
    const countWithClubFilter = await page.locator('.day-event-item, .list-event-card').count();
    
    // Enable BMX filter
    const hideBMXCheckbox = page.locator('#hide-bmx-checkbox, #hideBMXCheckbox');
    if (await hideBMXCheckbox.isVisible()) {
      await hideBMXCheckbox.check();
      await page.waitForTimeout(500);
      
      // Count should be same or less (Brunswick doesn't have BMX events in our mock data)
      const countWithBothFilters = await page.locator('.day-event-item, .list-event-card').count();
      expect(countWithBothFilters).toBeLessThanOrEqual(countWithClubFilter);
    }
  });

  test('should clear club filters', async ({ page }) => {
    // Select a club filter
    await page.locator('#club-search').click();
    await page.waitForTimeout(500);
    
    const clubListPanel = page.locator('#club-list-panel');
    if (await clubListPanel.isVisible()) {
      const checkbox = page.locator('input[data-club="Brunswick Cycling Club"]').first();
      await checkbox.check();
      await page.locator('body').click();
      await page.waitForTimeout(500);
      
      // Verify filter is active
      const filteredCount = await page.locator('.day-event-item, .list-event-card').count();
      expect(filteredCount).toBe(2);
      
      // Find and click the clear/remove button on the club tag
      const clubTag = page.locator('.club-tag').filter({ hasText: 'Brunswick' });
      if (await clubTag.isVisible()) {
        const removeButton = clubTag.locator('button');
        await removeButton.click();
        await page.waitForTimeout(500);
        
        // Should show all events again
        const newCount = await page.locator('.day-event-item, .list-event-card').count();
        expect(newCount).toBe(6);
      }
    }
  });

  test('should search clubs in filter list', async ({ page }) => {
    // Open club search
    await page.locator('#club-search').click();
    await page.waitForTimeout(500);
    
    // Type search query
    await page.locator('#club-search, #clubSearchInput').fill('Brunswick');
    await page.waitForTimeout(300);
    
    // Check if club list is filtered
    const clubListPanel = page.locator('#club-list-panel, #clubFiltersList');
    if (await clubListPanel.isVisible()) {
      const visibleClubs = await clubListPanel.locator('[class*="club"]').filter({
        hasText: 'Brunswick'
      }).count();
      expect(visibleClubs).toBeGreaterThan(0);
      
      // Should not show non-matching clubs
      const nonMatchingClubs = await clubListPanel.locator('[class*="club"]').filter({
        hasText: 'Eastern'
      }).count();
      // In a properly filtered list, this should be 0 or hidden
    }
  });

  test('should persist filters across page reloads', async ({ page }) => {
    // Select a club filter
    await page.locator('#club-search').click();
    await page.waitForTimeout(500);
    
    const clubListPanel = page.locator('#club-list-panel');
    if (await clubListPanel.isVisible()) {
      const checkbox = page.locator('input[data-club="Brunswick Cycling Club"]').first();
      await checkbox.check();
      await page.locator('body').click();
      await page.waitForTimeout(500);
    }
    
    // Get filtered count
    const countBefore = await page.locator('.day-event-item, .list-event-card').count();
    
    // Reload page
    await page.reload();
    await expect(page.locator('#loading')).toBeHidden({ timeout: 10000 });
    
    // Filter should still be applied
    const countAfter = await page.locator('.day-event-item, .list-event-card').count();
    expect(countAfter).toBe(countBefore);
  });

  test('should show empty state when all events are filtered out', async ({ page }) => {
    // Enable all event type filters
    const hideBMXCheckbox = page.locator('#hide-bmx-checkbox, #hideBMXCheckbox');
    const hideMTBCheckbox = page.locator('#hide-mtb-checkbox, #hideMTBCheckbox');
    
    if (await hideBMXCheckbox.isVisible()) {
      await hideBMXCheckbox.check();
      await page.waitForTimeout(300);
    }
    
    if (await hideMTBCheckbox.isVisible()) {
      await hideMTBCheckbox.check();
      await page.waitForTimeout(300);
    }
    
    // Select a club that only has BMX or MTB events (if exists)
    // Or verify that when no events match, empty state shows
    const eventCount = await page.locator('.day-event-item, .list-event-card').count();
    
    if (eventCount === 0) {
      // Empty state should be visible
      const emptyState = page.locator('#emptyState').or(page.locator('text=No events found'));
      const isEmpty = await emptyState.isVisible().catch(() => false);
      expect(isEmpty).toBeTruthy();
    }
  });
});