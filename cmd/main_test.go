package main

import (
	"encoding/json"
	"os"
	"testing"
	"time"
)

func TestClubParsing(t *testing.T) {
	// Test club name cleaning
	testCases := []struct {
		input    string
		expected string
	}{
		{"Brunswick Cycling Club", "Brunswick Cycling Club"},
		{"Eastern Cycling Club Open", "Eastern Cycling Club"},
		{"  Geelong & Surfcoast Cycling Club  ", "Geelong & Surfcoast Cycling Club"},
		{"https://entryboss.cc/calendar/brunswick", "brunswick"},
	}

	for _, tc := range testCases {
		result := cleanClubName(tc.input)
		if result != tc.expected {
			t.Errorf("cleanClubName(%q) = %q, want %q", tc.input, result, tc.expected)
		}
	}
}

func TestVictorianClubDetection(t *testing.T) {
	testCases := []struct {
		clubName string
		href     string
		expected bool
	}{
		{"Brunswick Cycling Club", "/calendar/brunswick", true},
		{"Eastern Cycling Club", "/calendar/eastern", true},
		{"Geelong & Surfcoast CC", "/calendar/geelong", true},
		{"Sydney CC", "/calendar/sydney", false},
		{"Perth CC", "/calendar/perth", false},
		{"Melbourne Track Club", "/calendar/melbourne", true},
	}

	for _, tc := range testCases {
		result := isVictorianClub(tc.clubName, tc.href)
		if result != tc.expected {
			t.Errorf("isVictorianClub(%q, %q) = %v, want %v", tc.clubName, tc.href, result, tc.expected)
		}
	}
}

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
	// Test that Event struct can be marshaled to JSON correctly
	event := Event{
		EventName: "Test Race",
		EventDate: "2025-07-05T00:00:00Z",
		ClubName:  "Test Club",
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
	// Test clubs.json structure with LastSeen field
	currentTime := time.Now().Format(time.RFC3339)
	clubs := []Club{
		{
			ClubName: "Brunswick Cycling Club",
			ClubURL:  "https://entryboss.cc/calendar/brunswick",
			LastSeen: currentTime,
		},
		{
			ClubName: "Eastern Cycling Club",
			ClubURL:  "https://entryboss.cc/calendar/eastern",
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

	// Verify LastSeen field is preserved
	for i, club := range unmarshaled {
		if club.LastSeen == "" {
			t.Errorf("Club %d missing LastSeen field", i)
		}
		if club.LastSeen != currentTime {
			t.Errorf("Club %d LastSeen mismatch: got %q, want %q", i, club.LastSeen, currentTime)
		}
	}
}

func TestEventsJSONStructure(t *testing.T) {
	// Test events.json structure
	now := time.Now()
	events := []Event{
		{
			EventName: "Winter Criterium",
			EventDate: now.Add(24 * time.Hour).Format("2006-01-02T15:04:05Z"),
			ClubName:  "Brunswick Cycling Club",
			EventURL:  "https://entryboss.cc/races/12345",
		},
		{
			EventName: "Road Race Championship",
			EventDate: now.Add(48 * time.Hour).Format("2006-01-02T15:04:05Z"),
			ClubName:  "Eastern Cycling Club",
			EventURL:  "https://entryboss.cc/races/12346",
		},
	}

	data, err := json.MarshalIndent(events, "", "  ")
	if err != nil {
		t.Fatalf("Failed to marshal events: %v", err)
	}

	// Write test events file for frontend testing
	if err := os.WriteFile("events.json", data, 0644); err != nil {
		t.Logf("Could not write test events.json: %v", err)
	}

	var unmarshaled []Event
	if err := json.Unmarshal(data, &unmarshaled); err != nil {
		t.Fatalf("Failed to unmarshal events: %v", err)
	}

	if len(unmarshaled) != 2 {
		t.Errorf("Expected 2 events, got %d", len(unmarshaled))
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

func TestClubLastSeenField(t *testing.T) {
	// Test that Club struct properly handles LastSeen field
	currentTime := time.Now().Format(time.RFC3339)

	club := Club{
		ClubName: "Test Club",
		ClubURL:  "https://entryboss.cc/calendar/test",
		LastSeen: currentTime,
	}

	// Test JSON marshaling
	data, err := json.Marshal(club)
	if err != nil {
		t.Fatalf("Failed to marshal club with LastSeen: %v", err)
	}

	// Test JSON unmarshaling
	var unmarshaled Club
	if err := json.Unmarshal(data, &unmarshaled); err != nil {
		t.Fatalf("Failed to unmarshal club with LastSeen: %v", err)
	}

	if unmarshaled.LastSeen != currentTime {
		t.Errorf("LastSeen field not preserved: got %q, want %q", unmarshaled.LastSeen, currentTime)
	}

	// Test that empty LastSeen is handled
	clubWithoutLastSeen := Club{
		ClubName: "Test Club 2",
		ClubURL:  "https://entryboss.cc/calendar/test2",
	}

	data2, err := json.Marshal(clubWithoutLastSeen)
	if err != nil {
		t.Fatalf("Failed to marshal club without LastSeen: %v", err)
	}

	var unmarshaled2 Club
	if err := json.Unmarshal(data2, &unmarshaled2); err != nil {
		t.Fatalf("Failed to unmarshal club without LastSeen: %v", err)
	}

	if unmarshaled2.LastSeen != "" {
		t.Errorf("Empty LastSeen should remain empty, got %q", unmarshaled2.LastSeen)
	}
}
