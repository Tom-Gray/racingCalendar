# Testing Guide for Victorian Cycling Races

This directory contains end-to-end (E2E) tests for the Victorian Cycling Races calendar application using Playwright.

## Test Structure

```
tests/
├── e2e/                           # End-to-end tests
│   ├── data-loading.spec.js      # Tests for data loading and error handling
│   ├── filtering.spec.js         # Tests for club and event type filtering
│   ├── views.spec.js             # Tests for view switching (list/calendar)
│   ├── mobile.spec.js            # Tests for mobile-specific features
│   └── calendar-navigation.spec.js # Tests for calendar navigation
├── fixtures/                      # Test data
│   ├── mock-events.json          # Mock event data
│   └── mock-clubs.json           # Mock club data
└── README.md                      # This file
```

## Prerequisites

1. **Node.js and npm** must be installed
2. **Playwright** is already configured in `package.json`
3. The site must be served locally (the tests will start a server automatically)

## Setup

Install Playwright browsers (only needed once):

```bash
npm run test:install
```

This will download the necessary browser binaries for Chrome, Firefox, and Safari.

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in headed mode (see browser)
```bash
npm run test:headed
```

### Run tests in debug mode
```bash
npm run test:debug
```

### Run specific test file
```bash
npx playwright test tests/e2e/data-loading.spec.js
```

### Run tests for specific browser
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Run mobile tests only
```bash
npx playwright test --project="Mobile Chrome"
npx playwright test --project="Mobile Safari"
```

### View test report
```bash
npm run test:report
```

## Test Coverage

### 1. Data Loading Tests (`data-loading.spec.js`)
- ✅ Loads and displays events successfully
- ✅ Displays correct number of events
- ✅ Handles data loading errors gracefully
- ✅ Loads clubs data
- ✅ Dismisses onboarding banner
- ✅ Persists state in localStorage
- ✅ Displays events in list view by default

### 2. Filtering Tests (`filtering.spec.js`)
- ✅ Filters events by club selection
- ✅ Shows filter count indicator
- ✅ Hides BMX events when BMX filter is enabled
- ✅ Hides MTB events when MTB filter is enabled
- ✅ Combines club and event type filters
- ✅ Clears club filters
- ✅ Searches clubs in filter list
- ✅ Persists filters across page reloads
- ✅ Shows empty state when all events are filtered out

### 3. View Switching Tests (`views.spec.js`)
- ✅ Starts in list view by default on desktop
- ✅ Switches to calendar view on desktop
- ✅ Switches back to list view from calendar view
- ✅ Persists view preference across page reloads
- ✅ Displays events in list view with day sections
- ✅ Displays events in calendar view with calendar grid
- ✅ Shows calendar title in calendar view
- ✅ Highlights active view button
- ✅ Handles event clicks
- ✅ Handles empty event list gracefully
- ✅ Displays event details correctly

### 4. Mobile Tests (`mobile.spec.js`)
- ✅ Loads mobile version of the site
- ✅ Displays mobile navigation
- ✅ Shows filter button on mobile
- ✅ Displays events in mobile list format
- ✅ Handles mobile filter interactions
- ✅ Supports touch interactions
- ✅ Is responsive on mobile viewport
- ✅ Handles mobile calendar view
- ✅ Displays mobile onboarding
- ✅ Handles portrait and landscape orientations
- ✅ Displays filter count on mobile
- ✅ Scrolls smoothly on mobile
- ✅ Handles swipe gestures in calendar view

### 5. Calendar Navigation Tests (`calendar-navigation.spec.js`)
- ✅ Displays calendar with current month
- ✅ Navigates to next month
- ✅ Navigates to previous month
- ✅ Displays calendar grid with day cells
- ✅ Shows events in calendar cells
- ✅ Highlights today in calendar
- ✅ Displays event details when clicking calendar cell
- ✅ Switches between month and week views
- ✅ Displays correct number of weeks in month view
- ✅ Handles navigation across multiple months
- ✅ Shows day names header in calendar
- ✅ Preserves filters when navigating calendar
- ✅ Handles rapid navigation clicks

## Test Data

The tests use mock data located in `tests/fixtures/`:
- **mock-events.json**: Contains 6 test events with various dates and clubs
- **mock-clubs.json**: Contains 5 test clubs

This mock data is automatically injected during tests via Playwright's route interception, ensuring tests are fast and don't depend on external APIs.

## Continuous Integration

The tests are configured to run on CI with the following settings:
- Tests retry twice on failure
- Tests run sequentially (not in parallel)
- HTML and list reporters are used
- Screenshots and videos are captured on failure

## Troubleshooting

### Port 8000 already in use
If you get an error about port 8000 being in use:
```bash
# Find and kill the process using port 8000
lsof -ti:8000 | xargs kill -9
```

### Playwright browsers not installed
```bash
npm run test:install
```

### Tests failing locally
1. Make sure no local server is running on port 8000
2. Clear browser cache and localStorage
3. Run tests in headed mode to see what's happening:
   ```bash
   npm run test:headed
   ```

### Debugging a specific test
```bash
npx playwright test --debug tests/e2e/data-loading.spec.js
```

## Writing New Tests

When adding new tests:

1. Create a new spec file in `tests/e2e/`
2. Follow the existing pattern:
   ```javascript
   const { test, expect } = require('@playwright/test');
   
   test.describe('Feature Name', () => {
     test.beforeEach(async ({ page }) => {
       // Setup mock data
       // Navigate to page
     });
     
     test('should do something', async ({ page }) => {
       // Test implementation
     });
   });
   ```

3. Use the mock data from `tests/fixtures/`
4. Run your new tests locally before committing
5. Update this README with new test coverage

## Best Practices

- ✅ Use data attributes or IDs for selecting elements (more stable than CSS classes)
- ✅ Wait for elements to be visible before interacting
- ✅ Use `page.locator()` instead of deprecated selectors
- ✅ Mock external API calls for consistent test results
- ✅ Test both desktop and mobile viewports
- ✅ Handle cases where elements might not exist (optional features)
- ✅ Add descriptive test names that explain what is being tested
- ✅ Group related tests using `test.describe()`

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)