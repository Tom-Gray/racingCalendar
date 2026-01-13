package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
	"github.com/spf13/cobra"
)

// Club represents a cycling club
type Club struct {
	ClubName string `json:"clubName"`
	ClubURL  string `json:"clubUrl"`
	State    string `json:"state"`
	LastSeen string `json:"lastSeen"`
}

// Event represents a cycling event
type Event struct {
	EventName string `json:"eventName"`
	EventDate string `json:"eventDate"`
	ClubName  string `json:"clubName"`
	State     string `json:"state"`
	EventURL  string `json:"eventUrl"`
}

var rootCmd = &cobra.Command{
	Use:   "racecalendar",
	Short: "EntryBoss Discovery Tool - scrape cycling events from Australian clubs",
	Long:  `A CLI tool to scrape cycling events from EntryBoss for Australian clubs and generate static data files.`,
}

var updateClubsCmd = &cobra.Command{
	Use:   "update-clubs",
	Short: "Update the list of all Australian cycling clubs",
	Long:  `Scrape EntryBoss to find all Australian cycling clubs from all states and save them to clubs.json`,
	Run: func(cmd *cobra.Command, args []string) {
		if err := updateClubs(); err != nil {
			log.Fatalf("Failed to update clubs: %v", err)
		}
		fmt.Println("Successfully updated clubs.json")
	},
}

var stateFlag string

var updateEventsCmd = &cobra.Command{
	Use:   "update-events",
	Short: "Update events from clubs (all states by default, or specific state with --state flag)",
	Long:  `Read clubs.json and scrape events. If no state specified, processes all states. Use --state to process a specific state only.`,
	Run: func(cmd *cobra.Command, args []string) {
		state := strings.ToUpper(stateFlag)
		if err := updateEvents(state); err != nil {
			log.Fatalf("Failed to update events: %v", err)
		}
	},
}

var migrateCmd = &cobra.Command{
	Use:   "migrate",
	Short: "Add state field to existing clubs.json (assumes VIC)",
	Long:  `Migrate existing clubs.json to add state field with default value "VIC"`,
	Run: func(cmd *cobra.Command, args []string) {
		if err := migrateData(); err != nil {
			log.Fatalf("Failed to migrate data: %v", err)
		}
		fmt.Println("Successfully migrated data")
	},
}

func init() {
	updateEventsCmd.Flags().StringVarP(&stateFlag, "state", "s", "", "State code to process (VIC, NSW, QLD, SA, WA, TAS, ACT, NT). If not specified, processes all states.")

	rootCmd.AddCommand(updateClubsCmd)
	rootCmd.AddCommand(updateEventsCmd)
	rootCmd.AddCommand(migrateCmd)
}

func main() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}

func updateClubs() error {
	// Load existing clubs from clubs.json if it exists
	var existingClubs []Club
	if data, err := os.ReadFile("clubs.json"); err == nil {
		if err := json.Unmarshal(data, &existingClubs); err != nil {
			fmt.Printf("Warning: failed to parse existing clubs.json: %v\n", err)
		}
	}

	// Create map using clubURL as key for fast lookup and deduplication
	clubMap := make(map[string]Club)
	for _, club := range existingClubs {
		clubMap[club.ClubURL] = club
	}

	currentTime := time.Now().Format(time.RFC3339)

	// Fetch the main EntryBoss page
	resp, err := http.Get("https://entryboss.cc/")
	if err != nil {
		return fmt.Errorf("failed to fetch main page: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return fmt.Errorf("non-200 status code: %d", resp.StatusCode)
	}

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to parse HTML: %w", err)
	}

	// Define Australian states
	states := []string{"ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"}
	scrapedClubs := make(map[string]Club)
	var currentState string

	// Parse dropdown menu for all state sections
	doc.Find("li").Each(func(i int, s *goquery.Selection) {
		// Check if this is a state header
		if s.HasClass("dropdown-header") {
			headerText := strings.ToUpper(strings.TrimSpace(s.Text()))
			for _, state := range states {
				if strings.Contains(headerText, state) {
					currentState = state
					fmt.Printf("Found %s section in dropdown\n", state)
					return
				}
			}
			// If we hit a non-state header, clear current state
			currentState = ""
		}

		// If we're in a state section, look for club links
		if currentState != "" {
			s.Find("a[href*='/calendar/']").Each(func(j int, link *goquery.Selection) {
				href, exists := link.Attr("href")
				if !exists {
					return
				}

				clubName := strings.TrimSpace(link.Text())
				if clubName != "" {
					fullURL := "https://entryboss.cc" + href
					scrapedClubs[fullURL] = Club{
						ClubName: clubName,
						ClubURL:  fullURL,
						State:    currentState,
						LastSeen: currentTime,
					}
					fmt.Printf("Found %s club: %s -> %s\n", currentState, clubName, fullURL)
				}
			})
		}
	})

	// Merge scraped clubs with existing clubs
	newClubsCount := 0
	updatedClubsCount := 0
	stateStats := make(map[string]int)
	var newClubNames []string

	for clubURL, scrapedClub := range scrapedClubs {
		if existingClub, exists := clubMap[clubURL]; exists {
			// Update existing club with new information
			existingClub.ClubName = scrapedClub.ClubName
			existingClub.State = scrapedClub.State
			existingClub.LastSeen = currentTime
			clubMap[clubURL] = existingClub
			updatedClubsCount++
		} else {
			// Add new club
			clubMap[clubURL] = scrapedClub
			newClubsCount++
			newClubNames = append(newClubNames, fmt.Sprintf("%s (%s)", scrapedClub.ClubName, scrapedClub.State))
		}
		stateStats[scrapedClub.State]++
	}

	// Handle migration: set lastSeen for existing clubs that don't have it
	migrationCount := 0
	for clubURL, club := range clubMap {
		if club.LastSeen == "" {
			club.LastSeen = currentTime
			clubMap[clubURL] = club
			migrationCount++
		}
	}

	// Convert map to slice and sort
	var clubList []Club
	for _, club := range clubMap {
		clubList = append(clubList, club)
	}

	sort.Slice(clubList, func(i, j int) bool {
		if clubList[i].State != clubList[j].State {
			return clubList[i].State < clubList[j].State
		}
		return clubList[i].ClubName < clubList[j].ClubName
	})

	// Write to clubs.json
	data, err := json.MarshalIndent(clubList, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal clubs: %w", err)
	}

	if err := os.WriteFile("clubs.json", data, 0644); err != nil {
		return fmt.Errorf("failed to write clubs.json: %w", err)
	}

	fmt.Printf("\nClub update summary:\n")
	fmt.Printf("  Total clubs: %d\n", len(clubList))
	fmt.Printf("  New clubs found: %d\n", newClubsCount)
	if newClubsCount > 0 {
		sort.Strings(newClubNames)
		for _, name := range newClubNames {
			fmt.Printf("    - %s\n", name)
		}
	}
	fmt.Printf("  Existing clubs updated: %d\n", updatedClubsCount)
	if migrationCount > 0 {
		fmt.Printf("  Clubs migrated (added lastSeen): %d\n", migrationCount)
	}
	fmt.Printf("  Clubs preserved from previous runs: %d\n", len(clubList)-len(scrapedClubs))

	fmt.Printf("\nClubs by state:\n")
	for _, state := range states {
		if count, exists := stateStats[state]; exists {
			fmt.Printf("  %s: %d clubs\n", state, count)
		}
	}

	return nil
}

func updateEvents(state string) error {
	// Determine which states to process
	var statesToProcess []string
	if state == "" {
		// Process all states
		statesToProcess = []string{"ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"}
		fmt.Println("No state specified - processing all states...")
	} else {
		// Process single state
		statesToProcess = []string{state}
	}

	// Read all clubs from clubs.json
	data, err := os.ReadFile("clubs.json")
	if err != nil {
		return fmt.Errorf("failed to read clubs.json: %w", err)
	}

	var allClubs []Club
	if err := json.Unmarshal(data, &allClubs); err != nil {
		return fmt.Errorf("failed to unmarshal clubs.json: %w", err)
	}

	// Track statistics across all states
	totalEvents := 0
	stateResults := make(map[string]int)

	// Process each state
	for stateIndex, stateCode := range statesToProcess {
		if len(statesToProcess) > 1 {
			fmt.Printf("\n=== Processing %s (%d/%d) ===\n", stateCode, stateIndex+1, len(statesToProcess))
		}

		// Filter clubs by state
		var stateClubs []Club
		for _, club := range allClubs {
			if club.State == stateCode {
				stateClubs = append(stateClubs, club)
			}
		}

		if len(stateClubs) == 0 {
			fmt.Printf("No clubs found for state %s, skipping...\n", stateCode)
			continue
		}

		fmt.Printf("Found %d clubs in %s\n", len(stateClubs), stateCode)

		var stateEvents []Event

		for _, club := range stateClubs {
			fmt.Printf("Scraping events for %s...\n", club.ClubName)

			events, err := scrapeClubEvents(club)
			if err != nil {
				log.Printf("Failed to scrape events for %s: %v", club.ClubName, err)
				continue
			}

			// Add state field to each event
			for i := range events {
				events[i].State = club.State
			}

			stateEvents = append(stateEvents, events...)

			// Small delay to be respectful to the server
			time.Sleep(1 * time.Second)
		}

		// Sort events by date
		sort.Slice(stateEvents, func(i, j int) bool {
			return stateEvents[i].EventDate < stateEvents[j].EventDate
		})

		// Write to state-specific events file
		eventsFile := fmt.Sprintf("events-%s.json", strings.ToLower(stateCode))
		eventData, err := json.MarshalIndent(stateEvents, "", "  ")
		if err != nil {
			return fmt.Errorf("failed to marshal events for %s: %w", stateCode, err)
		}

		if err := os.WriteFile(eventsFile, eventData, 0644); err != nil {
			return fmt.Errorf("failed to write %s: %w", eventsFile, err)
		}

		fmt.Printf("Successfully scraped %d events from %d clubs in %s\n", len(stateEvents), len(stateClubs), stateCode)

		totalEvents += len(stateEvents)
		stateResults[stateCode] = len(stateEvents)

		// Delay between states when processing multiple
		if len(statesToProcess) > 1 && stateIndex < len(statesToProcess)-1 {
			fmt.Println("Pausing before next state...")
			time.Sleep(2 * time.Second)
		}
	}

	// Print summary if multiple states were processed
	if len(statesToProcess) > 1 {
		fmt.Printf("\n=== Summary ===\n")
		fmt.Printf("Total events scraped: %d\n", totalEvents)
		fmt.Println("\nEvents by state:")
		for _, stateCode := range statesToProcess {
			if count, exists := stateResults[stateCode]; exists {
				fmt.Printf("  %s: %d events\n", stateCode, count)
			}
		}
	}

	return nil
}

func migrateData() error {
	// Read clubs.json
	data, err := os.ReadFile("clubs.json")
	if err != nil {
		return fmt.Errorf("failed to read clubs.json: %w", err)
	}

	var clubs []Club
	if err := json.Unmarshal(data, &clubs); err != nil {
		return fmt.Errorf("failed to parse clubs.json: %w", err)
	}

	// Add state: "VIC" to all clubs that don't have it
	modified := 0
	for i := range clubs {
		if clubs[i].State == "" {
			clubs[i].State = "VIC"
			modified++
		}
	}

	// Write back to clubs.json
	data, err = json.MarshalIndent(clubs, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal clubs: %w", err)
	}

	if err := os.WriteFile("clubs.json", data, 0644); err != nil {
		return fmt.Errorf("failed to write clubs.json: %w", err)
	}

	fmt.Printf("Successfully added state field to %d clubs\n", modified)

	// Check if events.json exists and needs migration
	if eventData, err := os.ReadFile("events.json"); err == nil {
		var events []Event
		if err := json.Unmarshal(eventData, &events); err != nil {
			return fmt.Errorf("failed to parse events.json: %w", err)
		}

		// Add state: "VIC" to all events that don't have it
		eventsModified := 0
		for i := range events {
			if events[i].State == "" {
				events[i].State = "VIC"
				eventsModified++
			}
		}

		// Write to events-vic.json
		eventData, err = json.MarshalIndent(events, "", "  ")
		if err != nil {
			return fmt.Errorf("failed to marshal events: %w", err)
		}

		if err := os.WriteFile("events-vic.json", eventData, 0644); err != nil {
			return fmt.Errorf("failed to write events-vic.json: %w", err)
		}

		fmt.Printf("Successfully migrated %d events to events-vic.json\n", eventsModified)
		fmt.Println("Note: Original events.json preserved. You may want to remove it after verifying the migration.")
	}

	return nil
}

func scrapeClubEvents(club Club) ([]Event, error) {
	resp, err := http.Get(club.ClubURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch club page: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("non-200 status code: %d", resp.StatusCode)
	}

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to parse HTML: %w", err)
	}

	var events []Event
	now := time.Now()

	// Method 1: Look for event links in standard format
	doc.Find("a[href*='/races/']").Each(func(i int, s *goquery.Selection) {
		href, exists := s.Attr("href")
		if !exists {
			return
		}

		eventName := strings.TrimSpace(s.Text())
		if eventName == "" {
			return
		}

		// Skip obviously non-event links
		if strings.ToLower(eventName) == "enter" ||
			strings.ToLower(eventName) == "register" ||
			strings.ToLower(eventName) == "sign up" ||
			strings.ToLower(eventName) == "view" ||
			strings.ToLower(eventName) == "details" ||
			strings.Contains(strings.ToLower(eventName), "season pass") ||
			strings.Contains(strings.ToLower(eventName), "volunteer") ||
			strings.Contains(strings.ToLower(eventName), "replacement") ||
			strings.Contains(strings.ToLower(eventName), "pre-order") ||
			len(eventName) < 5 {
			return
		}

		// Try to extract date information from nearby elements
		eventDate := extractEventDate(s)

		// Only include future events
		if eventDate != "" {
			if parsedDate, err := time.Parse("2006-01-02T15:04:05Z", eventDate); err == nil {
				if parsedDate.After(now.AddDate(0, 0, -1)) { // Include events from yesterday onwards
					events = append(events, Event{
						EventName: eventName,
						EventDate: eventDate,
						ClubName:  club.ClubName,
						EventURL:  "https://entryboss.cc" + href,
					})
				}
			}
		}
	})

	// Method 2: Look for table-based event listings (like Northern Combine)
	doc.Find("table tr, .fixture-row, .event-row").Each(func(i int, row *goquery.Selection) {
		// Look for date patterns in the row
		rowText := row.Text()
		eventDate := parseDateFromText(rowText)

		if eventDate != "" {
			// Look for race links in this row
			row.Find("a[href*='/races/']").Each(func(j int, link *goquery.Selection) {
				href, exists := link.Attr("href")
				if !exists {
					return
				}

				eventName := strings.TrimSpace(link.Text())
				if eventName == "" {
					return
				}

				// Skip non-event entries
				if strings.ToLower(eventName) == "enter" ||
					strings.ToLower(eventName) == "register" ||
					strings.ToLower(eventName) == "sign up" ||
					strings.ToLower(eventName) == "view" ||
					strings.ToLower(eventName) == "details" ||
					strings.Contains(strings.ToLower(eventName), "season pass") ||
					strings.Contains(strings.ToLower(eventName), "volunteer") ||
					strings.Contains(strings.ToLower(eventName), "replacement") ||
					strings.Contains(strings.ToLower(eventName), "pre-order") ||
					len(eventName) < 5 {
					return
				}

				// Check if this is a future event
				if parsedDate, err := time.Parse("2006-01-02T15:04:05Z", eventDate); err == nil {
					if parsedDate.After(now.AddDate(0, 0, -1)) {
						events = append(events, Event{
							EventName: eventName,
							EventDate: eventDate,
							ClubName:  club.ClubName,
							EventURL:  "https://entryboss.cc" + href,
						})
					}
				}
			})
		}
	})

	// Method 3: Look for events in "Upcoming" sections
	doc.Find("h3, h4, .section-header").Each(func(i int, header *goquery.Selection) {
		headerText := strings.ToLower(strings.TrimSpace(header.Text()))
		if strings.Contains(headerText, "upcoming") || strings.Contains(headerText, "fixture") {
			// Process the next few sibling elements for events
			current := header.Next()
			for j := 0; j < 10 && current.Length() > 0; j++ {
				current.Find("a[href*='/races/']").Each(func(k int, link *goquery.Selection) {
					href, exists := link.Attr("href")
					if !exists {
						return
					}

					eventName := strings.TrimSpace(link.Text())
					if eventName == "" {
						return
					}

					// Skip non-event entries
					if strings.ToLower(eventName) == "enter" ||
						strings.ToLower(eventName) == "register" ||
						strings.ToLower(eventName) == "sign up" ||
						strings.ToLower(eventName) == "view" ||
						strings.ToLower(eventName) == "details" ||
						strings.Contains(strings.ToLower(eventName), "season pass") ||
						strings.Contains(strings.ToLower(eventName), "volunteer") ||
						strings.Contains(strings.ToLower(eventName), "replacement") ||
						strings.Contains(strings.ToLower(eventName), "pre-order") ||
						len(eventName) < 5 {
						return
					}

					eventDate := extractEventDate(link)
					if eventDate != "" {
						if parsedDate, err := time.Parse("2006-01-02T15:04:05Z", eventDate); err == nil {
							if parsedDate.After(now.AddDate(0, 0, -1)) {
								events = append(events, Event{
									EventName: eventName,
									EventDate: eventDate,
									ClubName:  club.ClubName,
									EventURL:  "https://entryboss.cc" + href,
								})
							}
						}
					}
				})
				current = current.Next()
			}
		}
	})

	// Remove duplicates based on event URL
	uniqueEvents := make(map[string]Event)
	for _, event := range events {
		uniqueEvents[event.EventURL] = event
	}

	events = make([]Event, 0, len(uniqueEvents))
	for _, event := range uniqueEvents {
		events = append(events, event)
	}

	return events, nil
}

func extractEventDate(eventLink *goquery.Selection) string {
	// Look for date patterns in the text content and nearby elements

	// First, check the event link text itself
	text := eventLink.Text()
	if date := parseDateFromText(text); date != "" {
		return date
	}

	// Check parent elements for date information
	parent := eventLink.Parent()
	for i := 0; i < 5; i++ {
		parentText := strings.TrimSpace(parent.Text())
		if date := parseDateFromText(parentText); date != "" {
			return date
		}

		// Also check siblings of parent
		parent.Siblings().Each(func(j int, sibling *goquery.Selection) {
			if date := parseDateFromText(sibling.Text()); date != "" {
				return
			}
		})

		parent = parent.Parent()
		if parent.Length() == 0 {
			break
		}
	}

	// Check previous and next siblings
	eventLink.Prev().Each(func(i int, s *goquery.Selection) {
		if date := parseDateFromText(s.Text()); date != "" {
			return
		}
	})

	eventLink.Next().Each(func(i int, s *goquery.Selection) {
		if date := parseDateFromText(s.Text()); date != "" {
			return
		}
	})

	return ""
}

func parseDateFromText(text string) string {
	// Common date patterns found on EntryBoss
	datePatterns := []struct {
		pattern string
		layout  string
	}{
		{`(\w{3}),?\s+(\d{1,2})\s+(\w{3})\s+(\d{4})`, "Mon, 2 Jan 2006"},    // "Sat, 5 Jul 2025"
		{`(\w+),?\s+(\d{1,2})\s+(\w+)\s+(\d{4})`, "Monday, 2 January 2006"}, // "Sunday, 13 July 2025"
		{`(\d{1,2})\s+(\w{3})\s+(\d{4})`, "2 Jan 2006"},                     // "5 Jul 2025"
		{`(\d{4})-(\d{2})-(\d{2})`, "2006-01-02"},                           // "2025-07-05"
		{`(\w{3})\s+(\d{1,2})\s+(\w{3})\s+(\d{4})`, "Mon 2 Jan 2006"},       // "Sun 6 Jul 2025"
	}

	for _, dp := range datePatterns {
		re := regexp.MustCompile(dp.pattern)
		if matches := re.FindStringSubmatch(text); len(matches) > 0 {
			return convertToISO8601(matches[0], dp.layout)
		}
	}

	return ""
}

func convertToISO8601(dateStr, layout string) string {
	// Clean up the date string
	dateStr = strings.TrimSpace(dateStr)

	// Try to parse with the given layout
	if parsedTime, err := time.Parse(layout, dateStr); err == nil {
		return parsedTime.Format("2006-01-02T15:04:05Z")
	}

	// Try common variations
	layouts := []string{
		"Mon, 2 Jan 2006",
		"Monday, 2 January 2006",
		"2 Jan 2006",
		"2006-01-02",
		"Mon 2 Jan 2006",
		"2 January 2006",
		"Jan 2, 2006",
		"January 2, 2006",
	}

	for _, layout := range layouts {
		if parsedTime, err := time.Parse(layout, dateStr); err == nil {
			return parsedTime.Format("2006-01-02T15:04:05Z")
		}
	}

	// If all else fails, try to extract year/month/day with regex
	if year, month, day := extractDateComponents(dateStr); year != 0 {
		date := time.Date(year, time.Month(month), day, 0, 0, 0, 0, time.UTC)
		return date.Format("2006-01-02T15:04:05Z")
	}

	return ""
}

func extractDateComponents(text string) (year, month, day int) {
	// Month name mapping
	monthMap := map[string]int{
		"jan": 1, "january": 1,
		"feb": 2, "february": 2,
		"mar": 3, "march": 3,
		"apr": 4, "april": 4,
		"may": 5,
		"jun": 6, "june": 6,
		"jul": 7, "july": 7,
		"aug": 8, "august": 8,
		"sep": 9, "september": 9,
		"oct": 10, "october": 10,
		"nov": 11, "november": 11,
		"dec": 12, "december": 12,
	}

	// Extract numbers and month names
	re := regexp.MustCompile(`\b(\d{4})\b|\b(\d{1,2})\b|\b(\w+)\b`)
	matches := re.FindAllString(strings.ToLower(text), -1)

	var numbers []int
	var monthName string

	for _, match := range matches {
		// Try to parse as number
		var num int
		if n, err := fmt.Sscanf(match, "%d", &num); n == 1 && err == nil {
			if num >= 1900 && num <= 2100 {
				// This is likely a year
				year = num
			} else if num >= 1 && num <= 31 {
				// This is likely a day
				numbers = append(numbers, num)
			}
		} else if _, exists := monthMap[match]; exists {
			monthName = match
		}
	}

	if monthName != "" {
		month = monthMap[monthName]
	}

	if len(numbers) > 0 {
		day = numbers[0]
	}

	return
}
