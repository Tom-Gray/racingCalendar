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
	LastSeen string `json:"lastSeen"`
}

// Event represents a cycling event
type Event struct {
	EventName string `json:"eventName"`
	EventDate string `json:"eventDate"`
	ClubName  string `json:"clubName"`
	EventURL  string `json:"eventUrl"`
}

var rootCmd = &cobra.Command{
	Use:   "racecalendar",
	Short: "EntryBoss Discovery Tool - scrape cycling events from Victorian clubs",
	Long:  `A CLI tool to scrape cycling events from EntryBoss for Victorian clubs and generate static data files.`,
}

var updateClubsCmd = &cobra.Command{
	Use:   "update-clubs",
	Short: "Update the list of Victorian cycling clubs",
	Long:  `Scrape EntryBoss to find all Victorian cycling clubs and save them to clubs.json`,
	Run: func(cmd *cobra.Command, args []string) {
		if err := updateClubs(); err != nil {
			log.Fatalf("Failed to update clubs: %v", err)
		}
		fmt.Println("Successfully updated clubs.json")
	},
}

var updateEventsCmd = &cobra.Command{
	Use:   "update-events",
	Short: "Update events from all known Victorian clubs",
	Long:  `Read clubs.json and scrape events from each club, saving all events to events.json`,
	Run: func(cmd *cobra.Command, args []string) {
		if err := updateEvents(); err != nil {
			log.Fatalf("Failed to update events: %v", err)
		}
		fmt.Println("Successfully updated events.json")
	},
}

func init() {
	rootCmd.AddCommand(updateClubsCmd)
	rootCmd.AddCommand(updateEventsCmd)
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
		// Handle migration: if existing club doesn't have lastSeen, don't overwrite it yet
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

	// Find Victorian clubs from the dropdown menu
	scrapedClubs := make(map[string]Club)

	// Look for the VIC section in the dropdown
	var inVicSection bool
	doc.Find("li").Each(func(i int, s *goquery.Selection) {
		// Check if this is the VIC header
		if s.HasClass("dropdown-header") && strings.Contains(strings.ToLower(s.Text()), "vic") {
			inVicSection = true
			fmt.Println("Found VIC section in dropdown")
			return
		}

		// Check if we've moved to another section
		if s.HasClass("dropdown-header") && inVicSection && !strings.Contains(strings.ToLower(s.Text()), "vic") {
			inVicSection = false
			return
		}

		// If we're in the VIC section, look for club links
		if inVicSection {
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
						LastSeen: currentTime,
					}
					fmt.Printf("Found Victorian club: %s -> %s\n", clubName, fullURL)
				}
			})
		}
	})

	// Fallback: also look for any links that might be Victorian based on content
	if len(scrapedClubs) == 0 {
		fmt.Println("No clubs found in dropdown, trying fallback method...")

		// Look for calendar links and try to identify Victorian ones
		doc.Find("a[href*='/calendar/']").Each(func(i int, s *goquery.Selection) {
			href, exists := s.Attr("href")
			if !exists {
				return
			}

			clubName := strings.TrimSpace(s.Text())
			if clubName == "" {
				// Try to find club name in parent elements
				clubName = strings.TrimSpace(s.Parent().Text())
			}

			// Clean up the club name
			clubName = cleanClubName(clubName)

			if clubName != "" && isVictorianClub(clubName, href) {
				fullURL := "https://entryboss.cc" + href
				scrapedClubs[fullURL] = Club{
					ClubName: clubName,
					ClubURL:  fullURL,
					LastSeen: currentTime,
				}
				fmt.Printf("Found Victorian club (fallback): %s -> %s\n", clubName, fullURL)
			}
		})
	}

	// Merge scraped clubs with existing clubs
	newClubsCount := 0
	updatedClubsCount := 0

	for clubURL, scrapedClub := range scrapedClubs {
		if existingClub, exists := clubMap[clubURL]; exists {
			// Update existing club with new lastSeen time and potentially updated name
			existingClub.ClubName = scrapedClub.ClubName // Update name in case it changed
			existingClub.LastSeen = currentTime
			clubMap[clubURL] = existingClub
			updatedClubsCount++
		} else {
			// Add new club
			clubMap[clubURL] = scrapedClub
			newClubsCount++
		}
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

	fmt.Printf("Club update summary:\n")
	fmt.Printf("  Total clubs: %d\n", len(clubList))
	fmt.Printf("  New clubs found: %d\n", newClubsCount)
	fmt.Printf("  Existing clubs updated: %d\n", updatedClubsCount)
	if migrationCount > 0 {
		fmt.Printf("  Clubs migrated (added lastSeen): %d\n", migrationCount)
	}
	fmt.Printf("  Clubs preserved from previous runs: %d\n", len(clubList)-len(scrapedClubs))

	return nil
}

func cleanClubName(name string) string {
	// Remove extra whitespace and clean up club names
	name = strings.TrimSpace(name)
	name = regexp.MustCompile(`\s+`).ReplaceAllString(name, " ")

	// Remove common prefixes/suffixes that aren't part of the actual name
	name = strings.TrimPrefix(name, "https://entryboss.cc/calendar/")
	name = strings.TrimSuffix(name, " Open")

	return name
}

func isVictorianClub(clubName, href string) bool {
	lowerName := strings.ToLower(clubName)
	lowerHref := strings.ToLower(href)

	// Check for Victorian indicators
	victorianIndicators := []string{
		"victoria", "vic", "melbourne", "geelong", "ballarat", "bendigo",
		"casey", "eastern", "northern", "western", "southern", "morningside",
		"brunswick", "colac", "hamilton", "frankston", "werribee", "dandenong",
	}

	for _, indicator := range victorianIndicators {
		if strings.Contains(lowerName, indicator) || strings.Contains(lowerHref, indicator) {
			return true
		}
	}

	return false
}

func updateEvents() error {
	// Read clubs.json
	data, err := os.ReadFile("clubs.json")
	if err != nil {
		return fmt.Errorf("failed to read clubs.json: %w", err)
	}

	var clubs []Club
	if err := json.Unmarshal(data, &clubs); err != nil {
		return fmt.Errorf("failed to unmarshal clubs.json: %w", err)
	}

	var allEvents []Event

	for _, club := range clubs {
		fmt.Printf("Scraping events for %s...\n", club.ClubName)

		events, err := scrapeClubEvents(club)
		if err != nil {
			log.Printf("Failed to scrape events for %s: %v", club.ClubName, err)
			continue
		}

		allEvents = append(allEvents, events...)

		// Small delay to be respectful to the server
		time.Sleep(1 * time.Second)
	}

	// Sort events by date
	sort.Slice(allEvents, func(i, j int) bool {
		return allEvents[i].EventDate < allEvents[j].EventDate
	})

	// Write to events.json
	eventData, err := json.MarshalIndent(allEvents, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal events: %w", err)
	}

	if err := os.WriteFile("events.json", eventData, 0644); err != nil {
		return fmt.Errorf("failed to write events.json: %w", err)
	}

	fmt.Printf("Successfully scraped %d events from %d clubs\n", len(allEvents), len(clubs))
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
	re := regexp.MustCompile(`(\d{1,2})|(\d{4})|(\w+)`)
	matches := re.FindAllString(strings.ToLower(text), -1)

	var numbers []int
	var monthName string

	for _, match := range matches {
		if len(match) == 4 {
			// Check if this is a 4-digit number (likely a year)
			var yearNum int
			if n, err := fmt.Sscanf(match, "%d", &yearNum); n == 1 && err == nil && yearNum >= 1900 && yearNum <= 2100 {
				year = yearNum
			}
		} else if len(match) <= 2 {
			// Check if this is a 1-2 digit number (likely a day)
			var dayNum int
			if n, err := fmt.Sscanf(match, "%d", &dayNum); n == 1 && err == nil && dayNum >= 1 && dayNum <= 31 {
				numbers = append(numbers, dayNum)
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
