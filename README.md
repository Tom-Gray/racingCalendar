# Race Calendar. An EntryBoss Discovery Tool

A tool that aggregates upcoming cycling events from EntryBoss and presents them in a clean, filterable, and intuitive interface.

## 🚴‍♀️ Features

- **Calendar View**: Visual 4-week calendar showing upcoming events
- **List View**: Chronological list of all upcoming events  
- **Club Filtering**: Multi-select dropdown with fuzzy search to filter by favorite clubs
- **Color-Coded Clubs**: Each selected club gets a unique color for easy identification
- **State Persistence**: Your filter preferences and club colors are saved in browser cookies
- **Responsive Design**: Works seamlessly on mobile, tablet, and desktop
- **Direct Links**: All events link directly to EntryBoss for registration

## 🧪 Testing

This project includes comprehensive end-to-end tests using [Playwright](https://playwright.dev/) to ensure the UI works correctly across different browsers and devices.

### Running Tests Locally

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Install Playwright browsers:**
   ```bash
   npm run test:install
   ```

3. **Run all tests:**
   ```bash
   npm test
   ```

4. **Run tests with browser UI visible:**
   ```bash
   npm run test:headed
   ```

5. **Debug tests step-by-step:**
   ```bash
   npm run test:debug
   ```

6. **View test report:**
   ```bash
   npm run test:report
   ```

### What Gets Tested

- ✅ Page loading and basic UI elements
- ✅ Event data loading and error handling
- ✅ Club search and filtering functionality
- ✅ Club selection with color coding
- ✅ View switching (Calendar ↔ List)
- ✅ State persistence (cookies)
- ✅ Responsive design (mobile/desktop)
- ✅ Event interaction (clicking to open EntryBoss)
- ✅ Cross-browser compatibility (Chrome, Firefox, Safari)

### Continuous Integration & Deployment

- **Tests** automatically run on every push and pull request via GitHub Actions
- **Deployment** to GitHub Pages happens automatically after tests pass on the main branch
- Tests run across multiple browsers (Chrome, Firefox, Safari) and viewports (desktop/mobile)

The workflow ensures your site is only deployed when all tests pass, giving you confidence that the live site works correctly.

For detailed testing documentation, see [tests/README.md](tests/README.md).
