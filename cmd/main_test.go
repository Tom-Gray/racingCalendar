package main

import (
	"encoding/json"
	"os"
	"testing"
	"time"
)

func TestDateParsing(t *testing.T) {
	testCases := []string{
		"Sat, 5 Jul 2025",
		"5 Jul 2025",
		"2025-07-05",
		"Sunday, 13 July 2025",
	}

	for _, tc := range testCases {
		result := parseDateFromText(tc)
		if result == "" {
			t.Errorf("parseDateFromText(%q) returned empty string", tc)
		}
	}
}

func TestEventStructure(t *testing.T) {
	// Test that Event struct can be marshaled to JSON correctly with state field
	event := Event{
		EventName: "Test Race",
		EventDate: "2025-07-05T00:00:00Z",
		ClubName:  "Test Club",
		State:     "VIC",
		EventURL:  "https://entryboss.cc/races/12345",
	}

	data, err := json.Marshal(event)
	if err != nil {
		t.Fatalf("Failed to marshal event: %v", err)
	}

	var unmarshaled Event
	if err := json.Unmarshal(data, &unmarshaled); err != nil {
		t.Fatalf("Failed to unmarshal event: %v", err)
	}

	if unmarshaled != event {
		t.Errorf("Event marshal/unmarshal failed: got %+v, want %+v", unmarshaled, event)
	}
}

func TestClubsJSONStructure(t *testing.T) {
	// Test clubs.json structure with State and LastSeen fields
	currentTime := time.Now().Format(time.RFC3339)
	clubs := []Club{
		{
			ClubName: "Brunswick Cycling Club",
			ClubURL:  "https://entryboss.cc/calendar/brunswick",
			State:    "VIC",
			LastSeen: currentTime,
		},
		{
			ClubName: "Sydney Cycling Club",
			ClubURL:  "https://entryboss.cc/calendar/sydney",
			State:    "NSW",
			LastSeen: currentTime,
		},
	}

	data, err := json.MarshalIndent(clubs, "", "  ")
	if err != nil {
		t.Fatalf("Failed to marshal clubs: %v", err)
	}

	var unmarshaled []Club
	if err := json.Unmarshal(data, &unmarshaled); err != nil {
		t.Fatalf("Failed to unmarshal clubs: %v", err)
	}

	if len(unmarshaled) != 2 {
		t.Errorf("Expected 2 clubs, got %d", len(unmarshaled))
	}

	// Verify State and LastSeen fields are preserved
	for i, club := range unmarshaled {
		if club.State == "" {
			t.Errorf("Club %d missing State field", i)
		}
		if club.LastSeen == "" {
			t.Errorf("Club %d missing LastSeen field", i)
		}
		if club.LastSeen != currentTime {
			t.Errorf("Club %d LastSeen mismatch: got %q, want %q", i, club.LastSeen, currentTime)
		}
	}
}

func TestEventsJSONStructure(t *testing.T) {
	// Test events.json structure with state field
	now := time.Now()
	events := []Event{
		{
			EventName: "Winter Criterium",
			EventDate: now.Add(24 * time.Hour).Format("2006-01-02T15:04:05Z"),
			ClubName:  "Brunswick Cycling Club",
			State:     "VIC",
			EventURL:  "https://entryboss.cc/races/12345",
		},
		{
			EventName: "Road Race Championship",
			EventDate: now.Add(48 * time.Hour).Format("2006-01-02T15:04:05Z"),
			ClubName:  "Sydney Cycling Club",
			State:     "NSW",
			EventURL:  "https://entryboss.cc/races/12346",
		},
	}

	data, err := json.MarshalIndent(events, "", "  ")
	if err != nil {
		t.Fatalf("Failed to marshal events: %v", err)
	}

	// Write test events file for frontend testing
	if err := os.WriteFile("events-vic.json", data, 0644); err != nil {
		t.Logf("Could not write test events-vic.json: %v", err)
	}

	var unmarshaled []Event
	if err := json.Unmarshal(data, &unmarshaled); err != nil {
		t.Fatalf("Failed to unmarshal events: %v", err)
	}

	if len(unmarshaled) != 2 {
		t.Errorf("Expected 2 events, got %d", len(unmarshaled))
	}

	// Verify state field is preserved
	for i, event := range unmarshaled {
		if event.State == "" {
			t.Errorf("Event %d missing State field", i)
		}
	}
}

func TestConvertToISO8601(t *testing.T) {
	testCases := []struct {
		input    string
		layout   string
		expected string
	}{
		{"Sat, 5 Jul 2025", "Mon, 2 Jan 2006", "2025-07-05T00:00:00Z"},
		{"5 Jul 2025", "2 Jan 2006", "2025-07-05T00:00:00Z"},
		{"2025-07-05", "2006-01-02", "2025-07-05T00:00:00Z"},
		{"Sunday, 13 July 2025", "Monday, 2 January 2006", "2025-07-13T00:00:00Z"},
	}

	for _, tc := range testCases {
		result := convertToISO8601(tc.input, tc.layout)
		if result != tc.expected {
			t.Errorf("convertToISO8601(%q, %q) = %q, want %q", tc.input, tc.layout, result, tc.expected)
		}
	}
}

func TestExtractDateComponents(t *testing.T) {
	testCases := []struct {
		input         string
		expectedYear  int
		expectedMonth int
		expectedDay   int
	}{
		{"5 July 2025", 2025, 7, 5},
		{"13 Jan 2025", 2025, 1, 13},
		{"December 25 2025", 2025, 12, 25},
		{"Mar 15 2025", 2025, 3, 15},
	}

	for _, tc := range testCases {
		year, month, day := extractDateComponents(tc.input)
		if year != tc.expectedYear || month != tc.expectedMonth || day != tc.expectedDay {
			t.Errorf("extractDateComponents(%q) = (%d, %d, %d), want (%d, %d, %d)",
				tc.input, year, month, day, tc.expectedYear, tc.expectedMonth, tc.expectedDay)
		}
	}
}

func TestEnhancedDateParsing(t *testing.T) {
	// Test the enhanced date parsing with more patterns
	testCases := []struct {
		input       string
		shouldParse bool
	}{
		{"Sat, 5 Jul 2025", true},
		{"Sunday, 13 July 2025", true},
		{"5 Jul 2025", true},
		{"2025-07-05", true},
		{"Sun 6 Jul 2025", true},
		{"invalid date", false},
		{"", false},
		{"just some text", false},
	}

	for _, tc := range testCases {
		result := parseDateFromText(tc.input)
		if tc.shouldParse && result == "" {
			t.Errorf("parseDateFromText(%q) should have parsed a date but returned empty", tc.input)
		}
		if !tc.shouldParse && result != "" {
			t.Errorf("parseDateFromText(%q) should not have parsed but returned %q", tc.input, result)
		}
	}
}

func TestClubStateAndLastSeenFields(t *testing.T) {
	// Test that Club struct properly handles State and LastSeen fields
	currentTime := time.Now().Format(time.RFC3339)

	club := Club{
		ClubName: "Test Club",
		ClubURL:  "https://entryboss.cc/calendar/test",
		State:    "VIC",
		LastSeen: currentTime,
	}

	// Test JSON marshaling
	data, err := json.Marshal(club)
	if err != nil {
		t.Fatalf("Failed to marshal club with State and LastSeen: %v", err)
	}

	// Test JSON unmarshaling
	var unmarshaled Club
	if err := json.Unmarshal(data, &unmarshaled); err != nil {
		t.Fatalf("Failed to unmarshal club with State and LastSeen: %v", err)
	}

	if unmarshaled.State != "VIC" {
		t.Errorf("State field not preserved: got %q, want %q", unmarshaled.State, "VIC")
	}

	if unmarshaled.LastSeen != currentTime {
		t.Errorf("LastSeen field not preserved: got %q, want %q", unmarshaled.LastSeen, currentTime)
	}

	// Test that empty fields are handled
	clubWithoutFields := Club{
		ClubName: "Test Club 2",
		ClubURL:  "https://entryboss.cc/calendar/test2",
	}

	data2, err := json.Marshal(clubWithoutFields)
	if err != nil {
		t.Fatalf("Failed to marshal club without State/LastSeen: %v", err)
	}

	var unmarshaled2 Club
	if err := json.Unmarshal(data2, &unmarshaled2); err != nil {
		t.Fatalf("Failed to unmarshal club without State/LastSeen: %v", err)
	}

	if unmarshaled2.State != "" {
		t.Errorf("Empty State should remain empty, got %q", unmarshaled2.State)
	}

	if unmarshaled2.LastSeen != "" {
		t.Errorf("Empty LastSeen should remain empty, got %q", unmarshaled2.LastSeen)
	}
}

func TestMultiStateSupport(t *testing.T) {
	// Test that we can handle clubs from multiple states
	states := []string{"VIC", "NSW", "QLD", "SA", "WA", "TAS", "ACT", "NT"}
	currentTime := time.Now().Format(time.RFC3339)

	var clubs []Club
	for i, state := range states {
		clubs = append(clubs, Club{
			ClubName: "Test Club " + state,
			ClubURL:  "https://entryboss.cc/calendar/test-" + state,
			State:    state,
			LastSeen: currentTime,
		})

		// Verify each club has correct state
		if clubs[i].State != state {
			t.Errorf("Club %d state mismatch: got %q, want %q", i, clubs[i].State, state)
		}
	}

	// Test marshaling all clubs
	data, err := json.MarshalIndent(clubs, "", "  ")
	if err != nil {
		t.Fatalf("Failed to marshal multi-state clubs: %v", err)
	}

	var unmarshaled []Club
	if err := json.Unmarshal(data, &unmarshaled); err != nil {
		t.Fatalf("Failed to unmarshal multi-state clubs: %v", err)
	}

	if len(unmarshaled) != len(states) {
		t.Errorf("Expected %d clubs, got %d", len(states), len(unmarshaled))
	}
}
