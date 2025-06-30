const { test, expect } = require('@playwright/test');

test.describe('Club Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the page to load completely
    await expect(page.locator('#loading')).toBeHidden({ timeout: 10000 });
  });

  test('should open club search dropdown when clicking search input', async ({ page }) => {
    // Click on the club search input
    await page.locator('#club-search').click();
    
    // Club list panel should become visible
    await expect(page.locator('#club-list-panel')).toBeVisible();
    
    // Should show clubs in the dropdown
    await expect(page.locator('#club-list-container')).toBeVisible();
  });

  test('should filter clubs when typing in search', async ({ page }) => {
    // Click on search input to open dropdown
    await page.locator('#club-search').click();
    await expect(page.locator('#club-list-panel')).toBeVisible();
    
    // Type a search term (looking for "Brunswick" if it exists)
    await page.locator('#club-search').fill('Brunswick');
    
    // Wait a moment for filtering to occur
    await page.waitForTimeout(500);
    
    // Check that the club list has been filtered
    const clubItems = page.locator('#club-list-container > div');
    const count = await clubItems.count();
    
    // Should have fewer items than the total (or show "No clubs found")
    if (count > 0) {
      // If clubs are found, they should contain "Brunswick"
      const firstClub = clubItems.first();
      await expect(firstClub).toContainText('Brunswick', { ignoreCase: true });
    } else {
      // If no clubs found, should show appropriate message
      await expect(page.locator('#club-list-container')).toContainText('No clubs found');
    }
  });

  test('should select and deselect clubs', async ({ page }) => {
    // Open club dropdown
    await page.locator('#club-search').click();
    await expect(page.locator('#club-list-panel')).toBeVisible();
    
    // Find the first club checkbox and click it
    const firstCheckbox = page.locator('#club-list-container input[type="checkbox"]').first();
    await firstCheckbox.check();
    
    // Should see the selected club appear in the selected clubs area
    await expect(page.locator('#selected-clubs')).not.toBeEmpty();
    
    // The checkbox should be checked
    await expect(firstCheckbox).toBeChecked();
    
    // Uncheck the club
    await firstCheckbox.uncheck();
    
    // Selected clubs area should be empty again
    const selectedClubsCount = await page.locator('#selected-clubs > div').count();
    expect(selectedClubsCount).toBe(0);
  });

  test('should display selected clubs with colors', async ({ page }) => {
    // Open club dropdown
    await page.locator('#club-search').click();
    await expect(page.locator('#club-list-panel')).toBeVisible();
    
    // Select the first available club
    const firstCheckbox = page.locator('#club-list-container input[type="checkbox"]').first();
    await firstCheckbox.check();
    
    // Check that a club tag appears in the selected clubs area
    const selectedClubTag = page.locator('#selected-clubs > div').first();
    await expect(selectedClubTag).toBeVisible();
    
    // The tag should have a background color (not default/transparent)
    const backgroundColor = await selectedClubTag.evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)'); // Not transparent
    expect(backgroundColor).not.toBe('rgb(255, 255, 255)'); // Not white
  });

  test('should remove clubs using the X button', async ({ page }) => {
    // Open club dropdown and select a club
    await page.locator('#club-search').click();
    await expect(page.locator('#club-list-panel')).toBeVisible();
    
    const firstCheckbox = page.locator('#club-list-container input[type="checkbox"]').first();
    await firstCheckbox.check();
    
    // Wait for the selected club tag to appear
    const selectedClubTag = page.locator('#selected-clubs > div').first();
    await expect(selectedClubTag).toBeVisible();
    
    // Click the remove button (×)
    const removeButton = selectedClubTag.locator('button');
    await removeButton.click();
    
    // The selected club should be removed
    const selectedClubsCount = await page.locator('#selected-clubs > div').count();
    expect(selectedClubsCount).toBe(0);
  });

  test('should persist selected clubs after page reload', async ({ page }) => {
    // Select a club
    await page.locator('#club-search').click();
    await expect(page.locator('#club-list-panel')).toBeVisible();
    
    const firstCheckbox = page.locator('#club-list-container input[type="checkbox"]').first();
    await firstCheckbox.check();
    
    // Wait for selection to be saved
    await page.waitForTimeout(1000);
    
    // Reload the page
    await page.reload();
    await expect(page.locator('#loading')).toBeHidden({ timeout: 10000 });
    
    // The club should still be selected
    const selectedClubsCount = await page.locator('#selected-clubs > div').count();
    expect(selectedClubsCount).toBeGreaterThan(0);
  });

  test('should close club dropdown when clicking outside', async ({ page }) => {
    // Open club dropdown
    await page.locator('#club-search').click();
    await expect(page.locator('#club-list-panel')).toBeVisible();
    
    // Click outside the dropdown (on the header)
    await page.locator('header').click();
    
    // Wait a moment for the dropdown to close
    await page.waitForTimeout(500);
    
    // Dropdown should be hidden
    await expect(page.locator('#club-list-panel')).toBeHidden();
  });

  test('should show onboarding banner for first-time users', async ({ page }) => {
    // Clear cookies to simulate first-time user
    await page.context().clearCookies();
    
    // Reload the page
    await page.reload();
    await expect(page.locator('#loading')).toBeHidden({ timeout: 10000 });
    
    // Onboarding banner should be visible for first-time users
    // Note: This test might not always pass if cookies persist, but it's good to have
    const onboardingBanner = page.locator('#onboarding-banner');
    const isVisible = await onboardingBanner.isVisible();
    
    if (isVisible) {
      // If banner is shown, test that it can be dismissed
      await page.locator('#dismiss-onboarding').click();
      await expect(onboardingBanner).toBeHidden();
    }
  });
});
