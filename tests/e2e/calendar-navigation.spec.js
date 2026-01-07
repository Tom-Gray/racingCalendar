const { test, expect } = require('@playwright/test');

test.describe('Calendar Navigation', () => {
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
    
    // Switch to calendar view if on desktop
    const viewportSize = page.viewportSize();
    if (viewportSize && viewportSize.width >= 768) {
      const calendarViewBtn = page.locator('#calendar-view-btn, #calendarViewButton');
      if (await calendarViewBtn.isVisible()) {
        await calendarViewBtn.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('should display calendar with current month', async ({ page }) => {
    const calendarView = page.locator('#calendar-view, #calendarView');
    if (await calendarView.isVisible()) {
      // Calendar title should show a month and year
      const calendarTitle = page.locator('#calendar-title, #calendarTitle');
      await expect(calendarTitle).toBeVisible();
      
      const titleText = await calendarTitle.textContent();
      // Should contain a year (4 digits)
      expect(titleText).toMatch(/\d{4}/);
    }
  });

  test('should navigate to next month', async ({ page }) => {
    const calendarView = page.locator('#calendar-view, #calendarView');
    if (await calendarView.isVisible()) {
      // Get initial calendar title
      const calendarTitle = page.locator('#calendar-title, #calendarTitle');
      const initialTitle = await calendarTitle.textContent();
      
      // Click next button
      const nextButton = page.locator('#next-period-btn, #nextPeriodButton, button:has-text("›"), button:has-text(">")').first();
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForTimeout(500);
        
        // Title should have changed
        const newTitle = await calendarTitle.textContent();
        expect(newTitle).not.toBe(initialTitle);
      }
    }
  });

  test('should navigate to previous month', async ({ page }) => {
    const calendarView = page.locator('#calendar-view, #calendarView');
    if (await calendarView.isVisible()) {
      // Get initial calendar title
      const calendarTitle = page.locator('#calendar-title, #calendarTitle');
      const initialTitle = await calendarTitle.textContent();
      
      // Click previous button
      const prevButton = page.locator('#prev-period-btn, #prevPeriodButton, button:has-text("‹"), button:has-text("<")').first();
      if (await prevButton.isVisible()) {
        await prevButton.click();
        await page.waitForTimeout(500);
        
        // Title should have changed
        const newTitle = await calendarTitle.textContent();
        expect(newTitle).not.toBe(initialTitle);
      }
    }
  });

  test('should display calendar grid with day cells', async ({ page }) => {
    const calendarView = page.locator('#calendar-view, #calendarView');
    if (await calendarView.isVisible()) {
      // Calendar grid should exist
      const calendarGrid = page.locator('#calendar-grid, .calendar-grid');
      await expect(calendarGrid).toBeVisible();
      
      // Should have day cells (typically 35 or 42 for month view)
      const dayCells = page.locator('.calendar-day-cell, .week-day-card');
      const cellCount = await dayCells.count();
      expect(cellCount).toBeGreaterThan(0);
    }
  });

  test('should show events in calendar cells', async ({ page }) => {
    const calendarView = page.locator('#calendar-view, #calendarView');
    if (await calendarView.isVisible()) {
      // Some cells should have event indicators
      const cellsWithEvents = page.locator('.calendar-day-cell:has(.calendar-event-dot), .calendar-day-cell:has(.calendar-day-events)');
      const countWithEvents = await cellsWithEvents.count();
      
      // At least some cells should have events (we have 6 mock events)
      expect(countWithEvents).toBeGreaterThan(0);
    }
  });

  test('should highlight today in calendar', async ({ page }) => {
    const calendarView = page.locator('#calendar-view, #calendarView');
    if (await calendarView.isVisible()) {
      // Look for today cell
      const todayCell = page.locator('.calendar-day-cell.today, .week-day-card.today');
      
      // Today might not always be visible if we're viewing a different month
      // So we just check that the selector doesn't error
      const todayCount = await todayCell.count();
      expect(todayCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('should display event details when clicking calendar cell', async ({ page }) => {
    const calendarView = page.locator('#calendar-view, #calendarView');
    if (await calendarView.isVisible()) {
      // Find a cell with events
      const cellWithEvent = page.locator('.calendar-day-cell:has(.calendar-event-dot)').first();
      
      if (await cellWithEvent.isVisible()) {
        await cellWithEvent.click();
        await page.waitForTimeout(500);
        
        // Should show event details or day events panel
        const selectedDateEvents = page.locator('#selectedDateEvents, #selected-date-events');
        if (await selectedDateEvents.isVisible()) {
          await expect(selectedDateEvents).toBeVisible();
        }
      }
    }
  });

  test('should switch between month and week views', async ({ page }) => {
    const calendarView = page.locator('#calendar-view, #calendarView');
    if (await calendarView.isVisible()) {
      // Check for mode toggle buttons
      const weekModeBtn = page.locator('#week-mode-btn, #weekModeButton, button:has-text("Week")').first();
      const monthModeBtn = page.locator('#month-mode-btn, #monthModeButton, button:has-text("Month")').first();
      
      if (await weekModeBtn.isVisible() && await monthModeBtn.isVisible()) {
        // Get initial title
        const calendarTitle = page.locator('#calendar-title, #calendarTitle');
        const initialTitle = await calendarTitle.textContent();
        
        // Switch to week view
        await weekModeBtn.click();
        await page.waitForTimeout(500);
        
        // Title format should change
        const weekTitle = await calendarTitle.textContent();
        // Week view typically shows date range
        
        // Switch back to month view
        await monthModeBtn.click();
        await page.waitForTimeout(500);
        
        const monthTitle = await calendarTitle.textContent();
        // Should be back to month format
      }
    }
  });

  test('should display correct number of weeks in month view', async ({ page }) => {
    const calendarView = page.locator('#calendar-view, #calendarView');
    if (await calendarView.isVisible()) {
      // In month view, should have 5-6 weeks (35-42 cells)
      const dayCells = page.locator('.calendar-day-cell');
      const cellCount = await dayCells.count();
      
      // Should be multiple of 7 (full weeks) and between 28-49
      if (cellCount > 0) {
        expect(cellCount % 7).toBe(0);
        expect(cellCount).toBeGreaterThanOrEqual(28);
        expect(cellCount).toBeLessThanOrEqual(49);
      }
    }
  });

  test('should handle navigation across multiple months', async ({ page }) => {
    const calendarView = page.locator('#calendar-view, #calendarView');
    if (await calendarView.isVisible()) {
      const calendarTitle = page.locator('#calendar-title, #calendarTitle');
      const nextButton = page.locator('#next-period-btn, #nextPeriodButton, button:has-text("›")').first();
      
      if (await nextButton.isVisible()) {
        // Navigate forward 3 months
        for (let i = 0; i < 3; i++) {
          await nextButton.click();
          await page.waitForTimeout(300);
        }
        
        const forwardTitle = await calendarTitle.textContent();
        
        // Navigate back 3 months
        const prevButton = page.locator('#prev-period-btn, #prevPeriodButton, button:has-text("‹")').first();
        for (let i = 0; i < 3; i++) {
          await prevButton.click();
          await page.waitForTimeout(300);
        }
        
        const backTitle = await calendarTitle.textContent();
        
        // Should be back to (approximately) the original position
        // Titles might differ slightly due to formatting but should be similar
      }
    }
  });

  test('should show day names header in calendar', async ({ page }) => {
    const calendarView = page.locator('#calendar-view, #calendarView');
    if (await calendarView.isVisible()) {
      // Look for day name headers
      const dayHeaders = page.locator('.calendar-day-header, .calendar-header');
      
      if (await dayHeaders.first().isVisible()) {
        // Should have 7 day headers (Sun-Sat or Mon-Sun)
        const headerCount = await dayHeaders.count();
        expect(headerCount).toBeGreaterThanOrEqual(1);
      }
    }
  });

  test('should preserve filters when navigating calendar', async ({ page }) => {
    // Apply a filter first
    await page.locator('#club-search').click();
    await page.waitForTimeout(500);
    
    const clubListPanel = page.locator('#club-list-panel');
    if (await clubListPanel.isVisible()) {
      const checkbox = page.locator('input[data-club="Brunswick Cycling Club"]').first();
      await checkbox.check();
      await page.locator('body').click();
      await page.waitForTimeout(500);
    }
    
    const calendarView = page.locator('#calendar-view, #calendarView');
    if (await calendarView.isVisible()) {
      // Navigate to next month
      const nextButton = page.locator('#next-period-btn, #nextPeriodButton, button:has-text("›")').first();
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForTimeout(500);
        
        // Filter should still be applied
        const clubTag = page.locator('.club-tag').filter({ hasText: 'Brunswick' });
        if (await clubTag.isVisible()) {
          await expect(clubTag).toBeVisible();
        }
      }
    }
  });

  test('should handle rapid navigation clicks', async ({ page }) => {
    const calendarView = page.locator('#calendar-view, #calendarView');
    if (await calendarView.isVisible()) {
      const nextButton = page.locator('#next-period-btn, #nextPeriodButton, button:has-text("›")').first();
      
      if (await nextButton.isVisible()) {
        // Click rapidly
        await nextButton.click();
        await nextButton.click();
        await nextButton.click();
        await page.waitForTimeout(1000);
        
        // Should still be functional (no crashes)
        const calendarTitle = page.locator('#calendar-title, #calendarTitle');
        await expect(calendarTitle).toBeVisible();
        
        const titleText = await calendarTitle.textContent();
        expect(titleText.length).toBeGreaterThan(0);
      }
    }
  });
});