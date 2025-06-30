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
	// Test clubs.json structure
	clubs := []Club{
		{ClubName: "Brunswick Cycling Club", ClubURL: "https://entryboss.cc/calendar/brunswick"},
		{ClubName: "Eastern Cycling Club", ClubURL: "https://entryboss.cc/calendar/eastern"},
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
