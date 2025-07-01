# Testing Guide for Victorian Cycling Events

This project uses [Playwright](https://playwright.dev/) for end-to-end testing of the UI. The tests simulate real user interactions and verify that the application works correctly across different browsers and devices.

## Test Structure

### Test Files
- `basic-functionality.spec.js` - Tests core app functionality (loading, navigation, error handling)
- `club-filtering.spec.js` - Tests club search, selection, and filtering features
- `view-switching.spec.js` - Tests calendar/list view switching and persistence

### What Gets Tested
- ✅ Page loading and basic UI elements
- ✅ Event data loading and error handling
- ✅ Club search and filtering functionality
- ✅ Club selection with color coding
- ✅ View switching (Calendar ↔ List)
- ✅ State persistence (cookies)
- ✅ Responsive design (mobile/desktop)
- ✅ Event interaction (clicking to open EntryBoss)
- ✅ Onboarding flow for new users
- ✅ Cross-browser compatibility

## Running Tests Locally

### Prerequisites
1. Node.js (version 14 or higher)
2. npm or yarn package manager

### Setup
1. Install dependencies:
   ```bash
   npm install
   ```

2. Install Playwright browsers:
   ```bash
   npm run test:install
   ```

### Running Tests

#### Run all tests (headless mode):
```bash
npm test
```

#### Run tests with browser UI visible:
```bash
npm run test:headed
```

#### Debug tests step-by-step:
```bash
npm run test:debug
```

#### View test report:
```bash
npm run test:report
```

#### Run specific test file:
```bash
npx playwright test basic-functionality.spec.js
```

#### Run tests in specific browser:
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Test Configuration

The tests are configured in `playwright.config.js` to:
- Run on multiple browsers (Chrome, Firefox, Safari)
- Test both desktop and mobile viewports
- Automatically start your local server before testing
- Take screenshots and videos on test failures
- Generate detailed HTML reports

## GitHub Actions Integration

Tests automatically run on:
- Every push to main/master branch
- Every pull request
- Multiple operating systems (Ubuntu, Windows, macOS)

### Viewing Test Results in GitHub
1. Go to the "Actions" tab in your GitHub repository
2. Click on the latest workflow run
3. Download test artifacts to see detailed reports and screenshots

## Writing New Tests

### Basic Test Structure
```javascript
const { test, expect } = require('@playwright/test');

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#loading')).toBeHidden({ timeout: 10000 });
  });

  test('should do something', async ({ page }) => {
    // Your test code here
    await page.locator('#some-button').click();
    await expect(page.locator('#result')).toBeVisible();
  });
});
```

### Common Patterns

#### Waiting for elements:
```javascript
await expect(page.locator('#element')).toBeVisible();
await expect(page.locator('#element')).toBeHidden();
```

#### Interacting with elements:
```javascript
await page.locator('#button').click();
await page.locator('#input').fill('text');
await page.locator('#checkbox').check();
```

#### Testing responsive design:
```javascript
await page.setViewportSize({ width: 375, height: 667 }); // Mobile
await page.setViewportSize({ width: 1200, height: 800 }); // Desktop
```

## Troubleshooting

### Common Issues

#### Tests fail with "Server not ready"
- Make sure your local server is running on port 8000
- Check that `npm run serve` works correctly
- Verify the `serve.sh` script is executable

#### Tests are flaky or timing out
- Increase timeout values in test assertions
- Add `await page.waitForTimeout(500)` for animations
- Use `await expect().toBeVisible()` instead of `isVisible()`

#### Browser installation issues
```bash
# Reinstall browsers
npx playwright install --with-deps

# Install system dependencies (Linux)
npx playwright install-deps
```

#### Tests pass locally but fail in CI
- Check that all dependencies are installed in CI
- Verify the server starts correctly in the CI environment
- Look at uploaded screenshots/videos for debugging

### Debug Mode
Use debug mode to step through tests interactively:
```bash
npm run test:debug
```

This opens a browser where you can:
- Step through each test action
- Inspect elements
- See what the test is doing in real-time

## Best Practices

1. **Wait for elements properly** - Use `await expect().toBeVisible()` instead of `waitForTimeout()`
2. **Test user workflows** - Focus on what users actually do, not implementation details
3. **Keep tests independent** - Each test should work on its own
4. **Use descriptive test names** - Make it clear what each test is checking
5. **Handle async operations** - Always await promises and use proper timeouts
6. **Test error states** - Include tests for when things go wrong
7. **Keep tests maintainable** - Use page object patterns for complex interactions

## Performance Testing

Basic performance checks are included in the tests:
- Page load times
- JavaScript error detection
- Console warning monitoring

For more detailed performance testing, consider adding:
- Lighthouse CI integration
- Core Web Vitals monitoring
- Bundle size tracking

## Accessibility Testing

Consider adding accessibility tests using `@axe-core/playwright`:
```bash
npm install --save-dev @axe-core/playwright
```

Then add accessibility checks to your tests:
```javascript
const { injectAxe, checkA11y } = require('@axe-core/playwright');

test('should be accessible', async ({ page }) => {
  await page.goto('/');
  await injectAxe(page);
  await checkA11y(page);
});
