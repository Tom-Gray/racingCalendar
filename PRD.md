Product Requirements Document: EntryBoss Discovery Tool V1
Version: 1.1
Date: 29 June 2025
Status: Scoping Complete

1. Introduction & Vision
1.1. Problem Statement
Entryboss.cc is a widely used event management system for cycling clubs in Australia. However, its interface for discovering upcoming events is not optimal. Users cannot easily filter events by preferred clubs or get a quick overview of the race calendar across multiple organizations, making it cumbersome to plan their race season.

1.2. Project Vision
To create a lightweight, fast, and user-centric web tool that aggregates upcoming cycling events from EntryBoss and presents them in a clean, filterable, and intuitive interface. The tool will provide a superior discovery experience, acting as a specialized "event calendar" that links directly back to EntryBoss for entries.

1.3. Scope (Version 1.0)
The initial version of this tool will focus exclusively on scraping and displaying events from cycling clubs based in Victoria, Australia.

2. Architecture & Technology
2.1. Backend
Language: Go

Framework: None. A standard Go command-line interface (CLI) application.

Responsibilities: Scraping event and club data from entryboss.cc and generating a static data file.

2.2. Frontend
Technology: Simple static website (HTML, CSS, JavaScript). No complex frameworks (like React or Vue) are required for this version to ensure simplicity and fast load times.

Responsibilities: Fetching the static data file and rendering the event calendar and list views for the user.

2.3. Data Storage & Flow
Primary Data Store: A single static JSON file named events.json, which will reside in the project's Git repository. This file will serve as the database for the frontend application.

Data Flow:

The Go CLI runs on a schedule.

It scrapes EntryBoss and generates the events.json file.

The automation pipeline commits the updated events.json file back to the Git repository.

The frontend, on user load, fetches this events.json file to populate its views.

2.4. Automation & Deployment
Platform: GitHub Actions.

Workflows:

A scheduled workflow will run the Go CLI daily to update event data.

A manually triggered workflow will allow for on-demand updates to the club list.

The workflows will handle committing the data file and deploying the static frontend to a hosting provider (e.g., GitHub Pages, Netlify, Vercel).

3. Backend Requirements (Go CLI)
The backend application must be implemented as a CLI with two distinct commands.

3.1. Command: update-clubs
Purpose: To build and refresh the master list of Victorian clubs.

Trigger: Manually, via a GitHub Actions workflow_dispatch trigger. This is not expected to be run frequently.

Logic:

Perform an HTTP GET request on https://entryboss.cc.

Parse the HTML response to locate the main event listings (often found in a "What's on" or "Listings" section).

From these listings, identify and scrape the main page for Victorian events (e.g., the "AusCycling (Victoria)" calendar page).

On the Victorian events page, extract a unique list of all clubs hosting events, capturing each club's name and its specific calendar URL.

Write the list of clubs as a JSON array to a local file named clubs.json. Each object in the array should have the format: { "clubName": "Some Club", "clubUrl": "https://entryboss.cc/calendar/someclub" }.

3.2. Command: update-events
Purpose: The primary, automated job to scrape the latest events for all known clubs.

Trigger: Scheduled, via a GitHub Actions schedule cron trigger.

Configuration: The schedule frequency should be configurable. Default: Once per day.

Logic:

Read and parse the clubs.json file to get the list of all Victorian clubs and their URLs.

Iterate through the list of clubs. For each club, perform an HTTP GET request on its clubUrl.

Parse the club's event calendar page and extract all upcoming events.

For each event, capture the following data points:

eventName: The full name of the event (string).

eventDate: The date of the event (string, formatted as ISO 8601 e.g., "2025-08-23T00:00:00Z").

clubName: The name of the host club (string).

eventUrl: The direct URL to the specific event page on EntryBoss (string).

Aggregate the events from all clubs into a single list.

Overwrite the events.json file with the complete, updated list of events.

3.3. Error Handling
If any scrape operation (for clubs or events) fails due to a non-200 status code, network error, or parsing failure, the CLI must:

Log a detailed error message to stderr.

Exit with a non-zero status code.

The application should not implement any internal retry logic. The automation pipeline will handle running the job on its next schedule.

4. Frontend Requirements (Static Web App)
4.1. Core Views & Functionality
Data Loading: On page load, the application must fetch the events.json file.

Default View: The primary view is a calendar that displays events for the next 4 weeks.

Alternate View: A chronological list of all upcoming events fetched from the JSON file.

View Toggle: A prominent, clearly-labeled button must allow the user to instantly switch between the calendar and list views without a page reload.

Event Interaction: When a user clicks on an event in either view, the eventUrl must be opened in a new browser tab. The application will not have its own event detail pages.

4.2. Club Filtering
Control: A multi-select dropdown component with a fuzzy-search input field.

Interaction:

User types in the input field to search for clubs.

The dropdown shows a list of matching clubs.

When a user clicks a club, it is added to the active filter set and displayed as a removable "tag" in the filter bar.

The calendar/list view must update instantly to reflect the filtered set of clubs.

State Persistence: The user's selected filters must be stored in a browser cookie. When a user returns, their previous filter selection should be automatically applied.

4.3. First-Time User Experience
Default State: If no filter cookie is present, the site will show events from all scraped Victorian clubs.

Onboarding Cue: To manage the initial "busy" view, a dismissible, one-time graphical cue (e.g., a banner or tooltip with an arrow) will point to the filter control.

Onboarding Text: The cue will contain the text: "To get started, Filter by your favourite clubs!"

5. Testing Plan
5.1. Backend Testing (Go)
Unit Tests:

Create a test to parse a saved, static HTML file of an EntryBoss club page to verify the event data extractor works correctly.

Create a test to parse a saved, static HTML file of the main EntryBoss calendar page to verify the Victoria club list extractor works correctly.

Integration Tests:

Create a test that executes the full update-events command using a mock clubs.json file and saved local HTML files, verifying that the output events.json is structured correctly.

5.2. Frontend Testing (Manual)
View & Interaction:

Verify calendar is the default view and shows 4 weeks.

Verify toggle switches to the list view and back.

Click multiple events to ensure they open the correct URLs in new tabs.

Filtering & State:

Test fuzzy search for various clubs.

Verify adding and removing club filter "tags".

Verify the event display updates correctly as filters are manipulated.

Apply a filter, close and reopen the browser, and verify the filter is reapplied from the cookie.

First-Time UX:

Clear all cookies/site data.

Reload the page and verify all events are shown by default and the onboarding message is present.

Verify the onboarding message can be dismissed.

Responsiveness:

Verify the layout and usability on mobile, tablet, and desktop screen sizes. The calendar view, in particular, must be usable on a small screen.
