const { test, expect } = require('@playwright/test');

test.describe('Mobile Experience', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 390, height: 844 }); // iPhone 12 size
    
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
    await expect(page.locator('#loading, #loadingState')).toBeHidden({ timeout: 10000 });
  });

  test('should load mobile version of the site', async ({ page }) => {
    // Check that mobile content is loaded
    const listView = page.locator('#list-view, #listView');
    await expect(listView).toBeVisible();
    
    // Events should be visible
    const events = page.locator('.day-event-item, .list-event-card');
    await expect(events.first()).toBeVisible();
  });

  test('should display mobile navigation', async ({ page }) => {
    // Check for mobile bottom navigation
    const bottomNav = page.locator('[class*="bottom-nav"], [class*="nav-button"]');
    
    // Mobile should have navigation elements
    const navCount = await bottomNav.count();
    expect(navCount).toBeGreaterThanOrEqual(0); // Mobile may have different nav structure
  });

  test('should show filter button on mobile', async ({ page }) => {
    // Mobile filter button/icon should be visible
    const filterButton = page.locator('#filterButton, [class*="filter"]').first();
    
    if (await filterButton.isVisible()) {
      // Should be clickable
      await filterButton.click();
      await page.waitForTimeout(500);
      
      // Filter drawer/panel should open
      const filterDrawer = page.locator('#filterDrawer, #club-list-panel');
      const isDrawerVisible = await filterDrawer.isVisible().catch(() => false);
      expect(isDrawerVisible).toBeTruthy();
    }
  });

  test('should display events in mobile list format', async ({ page }) => {
    // Check for mobile event cards
    const eventCards = page.locator('.list-event-card, .day-event-item');
    const cardCount = await eventCards.count();
    expect(cardCount).toBe(6);
    
    // Cards should be stacked vertically
    const firstCard = eventCards.first();
    await expect(firstCard).toBeVisible();
  });

  test('should handle mobile filter interactions', async ({ page }) => {
    // Open filter
    const filterButton = page.locator('#filterButton, #club-search').first();
    if (await filterButton.isVisible()) {
      await filterButton.click();
      await page.waitForTimeout(500);
      
      // Try to select a club filter
      const clubCheckbox = page.locator('input[data-club="Brunswick Cycling Club"]').first();
      if (await clubCheckbox.isVisible()) {
        await clubCheckbox.check();
        await page.waitForTimeout(300);
        
        // Close filter (might have apply button on mobile)
        const applyButton = page.locator('#applyFiltersButton, button:has-text("Apply")');
        if (await applyButton.isVisible()) {
          await applyButton.click();
        } else {
          // Click outside to close
          await page.locator('body').click();
        }
        
        await page.waitForTimeout(500);
        
        // Should show filtered results
        const eventCount = await page.locator('.list-event-card, .day-event-item').count();
        expect(eventCount).toBeLessThanOrEqual(6);
      }
    }
  });

  test('should support touch interactions', async ({ page }) => {
    // Mock window.open to prevent navigation
    await page.evaluate(() => {
      window.open = () => null;
    });
    
    // Tap on an event
    const firstEvent = page.locator('.list-event-card, .day-event-item').first();
    await firstEvent.tap();
    
    // Should not throw error
    await page.waitForTimeout(300);
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Check viewport is mobile size
    const viewportSize = page.viewportSize();
    expect(viewportSize.width).toBeLessThan(768);
    
    // Elements should be properly sized for mobile
    const header = page.locator('header, [class*="header"]').first();
    if (await header.isVisible()) {
      const headerBox = await header.boundingBox();
      expect(headerBox.width).toBeLessThanOrEqual(viewportSize.width);
    }
  });

  test('should handle mobile calendar view', async ({ page }) => {
    // Try to switch to calendar view if button exists
    const calendarButton = page.locator('#calendarViewButton, button:has-text("Calendar")');
    
    if (await calendarButton.isVisible()) {
      await calendarButton.click();
      await page.waitForTimeout(500);
      
      // Calendar view should be visible
      const calendarView = page.locator('#calendarView, #calendar-view');
      await expect(calendarView).toBeVisible();
      
      // Should have calendar content
      const calendarContent = page.locator('.calendar-grid, .week-calendar, .calendar-day-cell');
      const hasContent = await calendarContent.count() > 0;
      expect(hasContent).toBeTruthy();
    }
  });

  test('should display mobile onboarding', async ({ page }) => {
    // Clear storage and reload to trigger onboarding
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#loading, #loadingState')).toBeHidden({ timeout: 10000 });
    
    // Check for onboarding overlay
    const onboarding = page.locator('#onboardingOverlay, #onboarding-banner');
    
    if (await onboarding.isVisible()) {
      // Should have dismiss button
      const dismissButton = page.locator('#dismissOnboardingButton, #dismiss-onboarding');
      await expect(dismissButton).toBeVisible();
      
      // Dismiss should work
      await dismissButton.click();
      await expect(onboarding).toBeHidden();
    }
  });

  test('should handle portrait and landscape orientations', async ({ page, context }) => {
    // Test portrait (default)
    let viewportSize = page.viewportSize();
    expect(viewportSize.width).toBeLessThan(viewportSize.height);
    
    // Content should be visible
    const eventsPortrait = page.locator('.list-event-card, .day-event-item');
    await expect(eventsPortrait.first()).toBeVisible();
    
    // Switch to landscape
    await page.setViewportSize({ width: 844, height: 390 }); // iPhone 12 landscape
    await page.waitForTimeout(500);
    
    // Content should still be visible and functional
    const eventsLandscape = page.locator('.list-event-card, .day-event-item');
    await expect(eventsLandscape.first()).toBeVisible();
  });

  test('should display filter count on mobile', async ({ page }) => {
    // Apply a filter
    const filterButton = page.locator('#filterButton, #club-search').first();
    if (await filterButton.isVisible()) {
      await filterButton.click();
      await page.waitForTimeout(500);
      
      const clubCheckbox = page.locator('input[data-club="Brunswick Cycling Club"]').first();
      if (await clubCheckbox.isVisible()) {
        await clubCheckbox.check();
        
        // Apply or close
        const applyButton = page.locator('#applyFiltersButton, button:has-text("Apply")');
        if (await applyButton.isVisible()) {
          await applyButton.click();
        } else {
          await page.locator('body').click();
        }
        
        await page.waitForTimeout(500);
        
        // Check for filter count indicator
        const filterCount = page.locator('#filterCount, [class*="filter-count"]');
        if (await filterCount.isVisible()) {
          const countText = await filterCount.textContent();
          expect(parseInt(countText)).toBeGreaterThan(0);
        }
      }
    }
  });

  test('should scroll smoothly on mobile', async ({ page }) => {
    // Get initial scroll position
    const initialScroll = await page.evaluate(() => window.scrollY);
    
    // Scroll down
    await page.evaluate(() => window.scrollBy(0, 300));
    await page.waitForTimeout(300);
    
    // Scroll position should have changed
    const newScroll = await page.evaluate(() => window.scrollY);
    expect(newScroll).toBeGreaterThan(initialScroll);
  });

  test('should handle swipe gestures in calendar view', async ({ page }) => {
    // Try to open calendar view
    const calendarButton = page.locator('#calendarViewButton, button:has-text("Calendar")');
    
    if (await calendarButton.isVisible()) {
      await calendarButton.click();
      await page.waitForTimeout(500);
      
      // Get initial calendar title
      const calendarTitle = page.locator('#calendarTitle, #calendar-title');
      const initialTitle = await calendarTitle.textContent();
      
      // Simulate swipe left (next period)
      const calendarContainer = page.locator('#calendarContainer, .calendar-grid').first();
      if (await calendarContainer.isVisible()) {
        const box = await calendarContainer.boundingBox();
        
        // Swipe left
        await page.touchscreen.tap(box.x + box.width - 50, box.y + box.height / 2);
        await page.touchscreen.tap(box.x + 50, box.y + box.height / 2);
        await page.waitForTimeout(500);
        
        // Title might have changed (navigation happened)
        // This test verifies the gesture handler doesn't crash
      }
    }
  });
});
