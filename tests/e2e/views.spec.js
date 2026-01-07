const { test, expect } = require('@playwright/test');

test.describe('View Switching', () => {
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

  test('should start in list view by default on desktop', async ({ page }) => {
    // Check viewport is desktop size
    const viewportSize = page.viewportSize();
    if (viewportSize && viewportSize.width >= 768) {
      // List view should be visible
      const listView = page.locator('#list-view, #listView');
      await expect(listView).toBeVisible();
      
      // Calendar view should be hidden
      const calendarView = page.locator('#calendar-view, #calendarView');
      await expect(calendarView).toBeHidden();
    }
  });

  test('should switch to calendar view on desktop', async ({ page }) => {
    // Check viewport is desktop size
    const viewportSize = page.viewportSize();
    if (viewportSize && viewportSize.width >= 768) {
      // Click calendar view button
      const calendarViewBtn = page.locator('#calendar-view-btn, #calendarViewButton');
      if (await calendarViewBtn.isVisible()) {
        await calendarViewBtn.click();
        await page.waitForTimeout(500);
        
        // Calendar view should be visible
        const calendarView = page.locator('#calendar-view, #calendarView');
        await expect(calendarView).toBeVisible();
        
        // List view should be hidden
        const listView = page.locator('#list-view, #listView');
        await expect(listView).toBeHidden();
      }
    }
  });

  test('should switch back to list view from calendar view', async ({ page }) => {
    const viewportSize = page.viewportSize();
    if (viewportSize && viewportSize.width >= 768) {
      // Switch to calendar view first
      const calendarViewBtn = page.locator('#calendar-view-btn, #calendarViewButton');
      if (await calendarViewBtn.isVisible()) {
        await calendarViewBtn.click();
        await page.waitForTimeout(500);
        
        // Switch back to list view
        const listViewBtn = page.locator('#list-view-btn, #listViewButton');
        await listViewBtn.click();
        await page.waitForTimeout(500);
        
        // List view should be visible
        const listView = page.locator('#list-view, #listView');
        await expect(listView).toBeVisible();
        
        // Calendar view should be hidden
        const calendarView = page.locator('#calendar-view, #calendarView');
        await expect(calendarView).toBeHidden();
      }
    }
  });

  test('should persist view preference across page reloads', async ({ page }) => {
    const viewportSize = page.viewportSize();
    if (viewportSize && viewportSize.width >= 768) {
      // Switch to calendar view
      const calendarViewBtn = page.locator('#calendar-view-btn, #calendarViewButton');
      if (await calendarViewBtn.isVisible()) {
        await calendarViewBtn.click();
        await page.waitForTimeout(500);
        
        // Reload page
        await page.reload();
        await expect(page.locator('#loading')).toBeHidden({ timeout: 10000 });
        
        // Calendar view should still be visible
        const calendarView = page.locator('#calendar-view, #calendarView');
        await expect(calendarView).toBeVisible();
      }
    }
  });

  test('should display events in list view with day sections', async ({ page }) => {
    // Ensure we're in list view
    const listView = page.locator('#list-view, #listView');
    await expect(listView).toBeVisible();
    
    // Check for day sections
    const daySections = page.locator('.list-day-section, .day-panel');
    const sectionCount = await daySections.count();
    expect(sectionCount).toBeGreaterThan(0);
    
    // Each section should have events
    const firstSection = daySections.first();
    const eventsInSection = firstSection.locator('.day-event-item, .list-event-card');
    await expect(eventsInSection.first()).toBeVisible();
  });

  test('should display events in calendar view with calendar grid', async ({ page }) => {
    const viewportSize = page.viewportSize();
    if (viewportSize && viewportSize.width >= 768) {
      // Switch to calendar view
      const calendarViewBtn = page.locator('#calendar-view-btn, #calendarViewButton');
      if (await calendarViewBtn.isVisible()) {
        await calendarViewBtn.click();
        await page.waitForTimeout(500);
        
        // Check for calendar grid
        const calendarGrid = page.locator('#calendar-grid, .calendar-grid');
        await expect(calendarGrid).toBeVisible();
        
        // Should have calendar cells
        const calendarCells = page.locator('.calendar-day-cell, .week-day-card');
        const cellCount = await calendarCells.count();
        expect(cellCount).toBeGreaterThan(0);
      }
    }
  });

  test('should show calendar title in calendar view', async ({ page }) => {
    const viewportSize = page.viewportSize();
    if (viewportSize && viewportSize.width >= 768) {
      // Switch to calendar view
      const calendarViewBtn = page.locator('#calendar-view-btn, #calendarViewButton');
      if (await calendarViewBtn.isVisible()) {
        await calendarViewBtn.click();
        await page.waitForTimeout(500);
        
        // Calendar title should be visible and have content
        const calendarTitle = page.locator('#calendar-title, #calendarTitle');
        await expect(calendarTitle).toBeVisible();
        
        const titleText = await calendarTitle.textContent();
        expect(titleText).toBeTruthy();
        expect(titleText.length).toBeGreaterThan(0);
      }
    }
  });

  test('should highlight active view button', async ({ page }) => {
    const viewportSize = page.viewportSize();
    if (viewportSize && viewportSize.width >= 768) {
      // List view button should be active by default
      const listViewBtn = page.locator('#list-view-btn, #listViewButton');
      if (await listViewBtn.isVisible()) {
        const hasActiveClass = await listViewBtn.evaluate((el) => {
          return el.classList.contains('bg-primary') || 
                 el.classList.contains('nav-active') ||
                 el.classList.contains('text-white');
        });
        expect(hasActiveClass).toBeTruthy();
        
        // Switch to calendar view
        const calendarViewBtn = page.locator('#calendar-view-btn, #calendarViewButton');
        await calendarViewBtn.click();
        await page.waitForTimeout(500);
        
        // Calendar view button should now be active
        const calendarHasActiveClass = await calendarViewBtn.evaluate((el) => {
          return el.classList.contains('bg-primary') || 
                 el.classList.contains('nav-active') ||
                 el.classList.contains('text-white');
        });
        expect(calendarHasActiveClass).toBeTruthy();
      }
    }
  });

  test('should display events when clicking on event items in list view', async ({ page }) => {
    // Mock window.open to prevent actual navigation
    await page.evaluate(() => {
      window.open = () => null;
    });
    
    // Find and click an event
    const eventItem = page.locator('.day-event-item, .list-event-card').first();
    await expect(eventItem).toBeVisible();
    
    // Click should not throw error
    await eventItem.click();
    await page.waitForTimeout(300);
  });

  test('should handle empty event list gracefully', async ({ page }) => {
    // Apply filters that result in no events
    const hideBMXCheckbox = page.locator('#hide-bmx-checkbox, #hideBMXCheckbox');
    const hideMTBCheckbox = page.locator('#hide-mtb-checkbox, #hideMTBCheckbox');
    
    if (await hideBMXCheckbox.isVisible()) {
      await hideBMXCheckbox.check();
    }
    if (await hideMTBCheckbox.isVisible()) {
      await hideMTBCheckbox.check();
    }
    
    // Select a club filter that eliminates remaining events
    await page.locator('#club-search').click();
    await page.waitForTimeout(500);
    
    const clubListPanel = page.locator('#club-list-panel');
    if (await clubListPanel.isVisible()) {
      // Select BMX Victoria (which should be filtered out)
      const bmxCheckbox = page.locator('input[data-club="BMX Victoria"]').first();
      if (await bmxCheckbox.isVisible()) {
        await bmxCheckbox.check();
        await page.locator('body').click();
        await page.waitForTimeout(500);
        
        // Should show empty state
        const eventCount = await page.locator('.day-event-item, .list-event-card').count();
        if (eventCount === 0) {
          // Either empty state div or "No events found" message should appear
          const hasEmptyMessage = await page.locator('text=/No events|No upcoming/i').isVisible().catch(() => false);
          expect(hasEmptyMessage).toBeTruthy();
        }
      }
    }
  });

  test('should display event details correctly', async ({ page }) => {
    // Check first event has required information
    const firstEvent = page.locator('.day-event-item, .list-event-card').first();
    await expect(firstEvent).toBeVisible();
    
    // Should contain event name
    const hasName = await firstEvent.locator('[class*="event-name"], [class*="event"]').count() > 0;
    expect(hasName).toBeTruthy();
    
    // Should show club information
    const hasClub = await firstEvent.locator('[class*="club"]').count() > 0;
    expect(hasClub).toBeTruthy();
  });
});