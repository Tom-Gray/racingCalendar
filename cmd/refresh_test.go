package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func inTempDirectory(t *testing.T) {
	t.Helper()
	previous, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	if err := os.Chdir(t.TempDir()); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { os.Chdir(previous) })
}

func TestUpcomingEventsUsesStateCalendarDay(t *testing.T) {
	// Just after midnight in Melbourne, still yesterday in Perth (DST active).
	now := time.Date(2026, 10, 4, 13, 30, 0, 0, time.UTC)
	events := []Event{
		{EventDate: "2026-10-03T00:00:00Z"},
		{EventDate: "2026-10-04T00:00:00Z"},
		{EventDate: "2026-10-05T00:00:00Z"},
		{EventDate: "2026-10-06T09:00:00+11:00"},
	}
	for state, want := range map[string]int{"VIC": 2, "WA": 3, "QLD": 3, "SA": 2, "NT": 3} {
		got, err := upcomingEvents(events, state, now)
		if err != nil || len(got) != want {
			t.Fatalf("%s: got %v, %v, want %d events", state, got, err, want)
		}
	}
	for _, date := range []string{"", "2026-02-30", "not-a-date", "2026-10-05Tbad"} {
		if _, err := upcomingEvents([]Event{{EventDate: date}}, "VIC", now); err == nil {
			t.Fatalf("accepted invalid date %q", date)
		}
	}
}

func TestRefreshReplacesBothSourcesWithoutReadingOldRecords(t *testing.T) {
	inTempDirectory(t)
	// Even malformed old data cannot contaminate a complete fresh snapshot.
	os.WriteFile("events-vic.json", []byte("old stale data"), 0644)
	now := time.Date(2026, 9, 14, 2, 0, 0, 0, time.UTC)
	eb := func(string) ([]Event, error) {
		return []Event{
			{EventURL: "https://entryboss.cc/races/1", EventName: "Today", EventDate: "2026-09-14T00:00:00Z", Source: "EntryBoss"},
			{EventURL: "https://entryboss.cc/races/2", EventName: "Yesterday", EventDate: "2026-09-13T00:00:00Z", Source: "EntryBoss"},
		}, nil
	}
	bc := func(string) ([]Event, error) {
		return []Event{
			{EventURL: "https://www.buncheur.com/new", EventName: "Upcoming", EventDate: "2026-09-15", Source: "Buncheur"},
			{EventURL: "https://www.buncheur.com/old", EventName: "Past", EventDate: "2026-04-11", Source: "Buncheur"},
		}, nil
	}
	calls := 0
	owner := func(string) (Club, error) { calls++; return Club{ClubName: "Correct club"}, nil }
	if err := refreshSnapshots([]string{"VIC"}, now, eb, bc, owner); err != nil {
		t.Fatal(err)
	}
	data, _ := os.ReadFile("events-vic.json")
	var got []Event
	if err := json.Unmarshal(data, &got); err != nil {
		t.Fatal(err)
	}
	if len(got) != 2 || got[0].ClubName != "Correct club" || got[1].Source != "Buncheur" || calls != 1 {
		t.Fatalf("%+v owner lookups=%d", got, calls)
	}
	if err := refreshSnapshots([]string{"VIC"}, now, eb, bc, owner); err != nil {
		t.Fatal(err)
	}
	again, _ := os.ReadFile("events-vic.json")
	if string(data) != string(again) {
		t.Fatal("refresh is not repeatable")
	}
}

func TestSuccessfulEmptyRefreshWritesArray(t *testing.T) {
	inTempDirectory(t)
	os.WriteFile("events-vic.json", []byte(`[ {"eventUrl":"stale"} ]`), 0644)
	empty := func(string) ([]Event, error) { return nil, nil }
	if err := refreshSnapshots([]string{"VIC"}, time.Now(), empty, empty, nil); err != nil {
		t.Fatal(err)
	}
	data, _ := os.ReadFile("events-vic.json")
	if string(data) != "[]" {
		t.Fatalf("expected [], got %s", data)
	}
}

func TestSourceOrValidationFailureLeavesAllSnapshots(t *testing.T) {
	for _, failure := range []string{"EntryBoss", "Buncheur", "invalid date", "owner"} {
		t.Run(failure, func(t *testing.T) {
			inTempDirectory(t)
			const original = "previous complete snapshot"
			for _, state := range []string{"vic", "wa"} {
				os.WriteFile("events-"+state+".json", []byte(original), 0644)
			}
			eb := func(state string) ([]Event, error) {
				if state == "WA" && failure == "EntryBoss" {
					return nil, fmt.Errorf("offline")
				}
				if state == "WA" && failure == "invalid date" {
					return []Event{{EventDate: "invalid"}}, nil
				}
				if state == "WA" && failure == "owner" {
					return []Event{{EventURL: "https://entryboss.cc/races/1", EventDate: "2099-01-01"}}, nil
				}
				return nil, nil
			}
			bc := func(state string) ([]Event, error) {
				if state == "WA" && failure == "Buncheur" {
					return nil, fmt.Errorf("offline")
				}
				return nil, nil
			}
			owner := func(string) (Club, error) { return Club{}, fmt.Errorf("missing heading") }
			if err := refreshSnapshots([]string{"VIC", "WA"}, time.Now(), eb, bc, owner); err == nil {
				t.Fatal("expected failure")
			}
			for _, state := range []string{"vic", "wa"} {
				data, _ := os.ReadFile("events-" + state + ".json")
				if string(data) != original {
					t.Fatalf("%s changed on failure", state)
				}
			}
			files, _ := filepath.Glob(".events-*.tmp")
			if len(files) != 0 {
				t.Fatal("temporary files leaked")
			}
		})
	}
}

func TestBuncheurRejectsMalformedResponsesAndAcceptsEmptyArray(t *testing.T) {
	old := entryBossClient
	t.Cleanup(func() { entryBossClient = old })
	for _, body := range []string{"null", `{"error":"offline"}`, `[{"state":"VIC","title":"Incomplete"}]`, "[]"} {
		entryBossClient = &http.Client{Transport: roundTripFunc(func(*http.Request) (*http.Response, error) {
			return &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader(body))}, nil
		})}
		events, err := fetchBuncheurEvents("VIC")
		if body == "[]" {
			if err != nil || len(events) != 0 {
				t.Fatalf("empty response: %v %v", events, err)
			}
		} else if err == nil {
			t.Fatalf("accepted %s", body)
		}
	}
}

func TestBuncheurFiltersGlobalFeedAndPreservesAbsoluteURLs(t *testing.T) {
	old := entryBossClient
	t.Cleanup(func() { entryBossClient = old })
	body := `[
  {"state":"","url":"/unclassified"},
  {"state":"NSW","title":"Other state","club":"NSW club","url":"/nsw","start":"2026-09-15"},
  {"state":"VIC","title":"Local race","club":"VIC club","url":"https://www.buncheur.com/vic","start":"2026-09-15"}
 ]`
	entryBossClient = &http.Client{Transport: roundTripFunc(func(*http.Request) (*http.Response, error) {
		return &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader(body))}, nil
	})}
	events, err := fetchBuncheurEvents("VIC")
	if err != nil || len(events) != 1 || events[0].EventURL != "https://www.buncheur.com/vic" || events[0].EventDate != "2026-09-15T00:00:00Z" {
		t.Fatalf("%+v %v", events, err)
	}
}
