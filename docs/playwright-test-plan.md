# Playwright test plan

This plan tracks user-facing browser coverage for the desktop and mobile racing calendars. Tests should use intercepted event files and a fixed browser clock so they remain deterministic as real events and dates change.

## Implemented coverage

- Event identity: one rendered event per canonical URL, correct cross-listed owner, and consistent club colours.
- Date filtering: past events are excluded while events occurring today remain visible in each state's timezone.
- Initial loading errors: desktop and mobile show an error when an event file is unavailable.
- Club search: desktop sidebar and mobile filter drawer search their available clubs.
- State onboarding and basic preference separation.
- Desktop dark mode, announcement dismissal, and About-page contact links.
- Core filter flows: club selection changes the rendered events, persists after reload, and can be removed or cleared.
- Discipline filters: BMX and MTB filters change rendered events and persist after reload on desktop and mobile.
- State data loading: switching state replaces the displayed events and retains the selected state after reload.
- Mobile state preferences: filters remain independent between states.
- Retry recovery: an event request can fail once and recover through the visible Retry control.

## Next priority

### State request ordering

- Delay one state's response, quickly select another state, and confirm the most recently selected state wins.
- Repeat the request-ordering scenario on desktop and mobile.
- Confirm a failed request from a previously selected state cannot replace or hide the current state's successful result.

### Calendar behaviour

- Switch between list and calendar views and confirm the selected view persists after reload.
- Confirm events appear in the correct desktop calendar day around month, year, daylight-saving, and timezone boundaries.
- Confirm a desktop day with more than three events shows the correct `+N more` indicator.
- Navigate forward and backward through mobile months and verify the title and event placement.
- Select a populated mobile calendar day, verify its event details, then clear the selection.
- Swipe between mobile months using a touch-capable Playwright device profile.

### Loading and data failures

- Return malformed JSON and confirm both layouts show their error state.
- Abort the network request and confirm both layouts recover through Retry.
- Fail a state switch after an earlier state loaded successfully and verify the stale events are not presented as belonging to the new state.
- Return a valid empty event array and confirm the normal empty state appears instead of an error.
- Fail loading of the desktop or mobile HTML fragment and provide coverage for the bootstrap-level failure experience.
- Fail loading of shared scripts such as club colours or upcoming-event filtering and cover the bootstrap-level failure experience.

### Event links

- Click an event in the desktop list and verify the correct URL opens in a new tab.
- Click an event in the desktop calendar and verify the correct URL opens.
- Repeat link checks for the mobile list and selected-day calendar cards.
- Confirm a missing event URL does not open a blank or invalid tab.

### Data rendering and safety

- Render long names, Unicode, ampersands, apostrophes, and quotation marks in event and club names.
- Confirm HTML-looking event and club names render as text and cannot execute markup or script.
- Confirm missing or invalid required fields produce an intentional error or are safely omitted, according to the chosen data contract.
- Confirm multiple events on one date are grouped and ordered consistently.
- Confirm event files containing duplicate URLs do not produce duplicate visible cards if frontend defence is retained as a requirement.

### Responsive and device coverage

- Add iPhone and Android Playwright projects so mobile behaviour runs with real mobile user-agent, touch, and viewport settings.
- Test the layout boundary at 767 and 768 pixels.
- Resize across the desktop/mobile boundary, reload, and confirm only the correct interface initializes.
- Check the principal flows in Chromium, Firefox, and WebKit, with deeper interaction coverage allowed to run in Chromium if CI duration becomes excessive.

### Drawers, modals, and navigation

- Close mobile drawers using the close button and backdrop, verifying body scrolling is restored.
- Decide whether closing the filter drawer should apply or discard pending changes, then lock that behaviour in a test.
- Verify Clear All updates the rendered events, filter count, persistence, and checkbox state.
- Verify desktop selected-club tags remove the intended club when several are selected.
- Verify onboarding state choices cover every configured state.
- Verify the About and Feedback navigation paths from the main interface.

### Accessibility and operational checks

- Exercise primary controls with keyboard navigation and visible focus.
- Check meaningful labels and accessible names for state, filter, view, retry, and close controls.
- Add a shared fixture that fails a test on unexpected browser exceptions and serious console errors.
- Add a small set of stable visual snapshots for the main desktop and mobile layouts if visual regressions become frequent.

## Test-suite maintenance

- Centralise fixed-time setup, event fixtures, local-storage state, and desktop/mobile preparation helpers.
- Prefer assertions against visible behaviour over direct calls to browser globals.
- Move JSON-file identity checks to Go or another data-level test so they do not repeat for every browser project.
- Add dedicated mobile device projects to `playwright.config.js`.
- Repair or remove the `test:data` and `test:deploy` package scripts; they currently reference a missing `tests/data-loading.spec.js` file.
