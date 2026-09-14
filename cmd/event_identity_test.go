package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"

	"github.com/PuerkitoBio/goquery"
)

func TestEventOwnerUsesHeadingNotNavigation(t *testing.T) {
	clubs := []Club{
		{ClubName: "Footscray Cycling Club", ClubURL: "https://entryboss.cc/calendar/fcc", State: "VIC"},
		{ClubName: "Geelong Cycling Club", ClubURL: "https://entryboss.cc/calendar/geelong", State: "VIC"},
		{ClubName: "Geelong & Surfcoast Cycling Club", ClubURL: "https://entryboss.cc/calendar/gscc", State: "VIC"},
	}
	for _, owner := range clubs[1:] {
		html := `<nav><a href="/calendar/fcc">Footscray Cycling Club</a></nav><h3 class="race-title"><small><a href="` + owner.ClubURL + `">` + owner.ClubName + `</a></small><br>Race</h3>`
		doc, _ := goquery.NewDocumentFromReader(strings.NewReader(html))
		got, err := parseEventOwner(doc, clubs)
		if err != nil || got != owner {
			t.Fatalf("owner = %+v, %v; want %+v", got, err, owner)
		}
	}
	for _, html := range []string{
		`<nav><a href="/calendar/fcc">Footscray Cycling Club</a></nav>`,
		`<h3 class="race-title"><small><a href="/calendar/unknown">Unknown</a></small></h3>`,
		`<h3 class="race-title"><small><a href="/calendar/fcc">FCC</a><a href="/calendar/geelong">GCC</a></small></h3>`,
	} {
		doc, _ := goquery.NewDocumentFromReader(strings.NewReader(html))
		if _, err := parseEventOwner(doc, clubs); err == nil {
			t.Fatal("unresolved owner must fail, not guess")
		}
	}
}

func TestReconcileLegacyAndCrossListedEvents(t *testing.T) {
	legacy := Event{EventURL: "http://www.entryboss.cc/races/31703/?ref=fcc", EventName: "Old title", EventDate: "2026-01-01", ClubName: "Footscray Cycling Club"}
	fresh := Event{EventURL: "https://entryboss.cc/races/31703", EventName: "Heritage Handicap", EventDate: "2026-09-19", ClubName: "Geelong Cycling Club", Source: "EntryBoss"}
	crossListed := fresh
	crossListed.ClubName = "Footscray Cycling Club"
	calls := 0
	resolver := func(url string) (Event, error) {
		calls++
		return Event{EventName: "Heritage Handicap", EventDate: "2026-09-19", ClubName: "Geelong Cycling Club"}, nil
	}
	got, err := reconcileEvents([]Event{legacy, crossListed, fresh}, resolver)
	if err != nil || len(got) != 1 || got[0] != fresh || calls != 1 {
		t.Fatalf("result=%+v calls=%d err=%v", got, calls, err)
	}
	again, err := reconcileEvents(got, resolver)
	if err != nil || !reflect.DeepEqual(got, again) || calls != 1 {
		t.Fatal("cleanup must be idempotent")
	}
	reversed, err := reconcileEvents([]Event{fresh, crossListed, legacy}, resolver)
	if err != nil || !reflect.DeepEqual(got, reversed) {
		t.Fatal("result must not depend on club scrape order")
	}
}

func TestSingleListingDoesNotFetchEventPage(t *testing.T) {
	e := Event{EventURL: "https://entryboss.cc/races/31994", ClubName: "Footscray Cycling Club"}
	got, err := reconcileEvents([]Event{e}, func(string) (Event, error) { return Event{}, fmt.Errorf("event page should not be fetched") })
	if err != nil || got[0].ClubName != "Footscray Cycling Club" {
		t.Fatalf("%+v %v", got, err)
	}
}

func TestIdentityDoesNotMergeDifferentRaces(t *testing.T) {
	events := []Event{
		{EventURL: "https://entryboss.cc/races/1", EventName: "Gate Practice"},
		{EventURL: "https://entryboss.cc/races/2", EventName: "Gate Practice"},
		{EventURL: "https://www.buncheur.com/race", EventName: "Gate Practice", Source: "Buncheur"},
	}
	got, err := reconcileEvents(events, nil)
	if err != nil || len(got) != 3 {
		t.Fatalf("%+v %v", got, err)
	}
	if !isEntryBossEvent(events[0]) || isEntryBossEvent(events[2]) || isEntryBossURL("https://entryboss.cc.evil.example/races/1") {
		t.Fatal("source detection failed")
	}
}

func TestConflictingCalendarDetailsUseCanonicalEvent(t *testing.T) {
	first := Event{EventURL: "https://entryboss.cc/races/1", EventName: "Listing title", EventDate: "2026-09-19", ClubName: "First Club", Source: "EntryBoss"}
	second := first
	second.EventName = "Other listing title"
	second.EventDate = "2026-09-20"
	second.ClubName = "Second Club"
	got, err := reconcileEvents([]Event{first, second}, func(string) (Event, error) {
		return Event{EventName: "Canonical title", EventDate: "2026-09-21T00:00:00Z", ClubName: "Canonical Club"}, nil
	})
	if err != nil || len(got) != 1 || got[0].EventName != "Canonical title" || got[0].EventDate != "2026-09-21T00:00:00Z" || got[0].ClubName != "Canonical Club" {
		t.Fatalf("got %+v, %v", got, err)
	}
}

func TestCanonicalEventParsesTitleDateAndOwner(t *testing.T) {
	clubs := []Club{{ClubName: "Geelong Cycling Club", ClubURL: "https://entryboss.cc/calendar/geelong"}}
	doc, _ := goquery.NewDocumentFromReader(strings.NewReader(`<h3 class="race-title"><small><a href="/calendar/geelong">Geelong Cycling Club</a></small><br>The Heritage Handicap</h3><dl class="dl-horizontal"><dt>Date</dt><dd>Sat, 19 Sep 2026</dd></dl>`))
	got, err := parseCanonicalEvent(doc, clubs)
	want := Event{EventName: "The Heritage Handicap", EventDate: "2026-09-19T00:00:00Z", ClubName: "Geelong Cycling Club"}
	if err != nil || got != want {
		t.Fatalf("got %+v, %v; want %+v", got, err, want)
	}
}

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

func TestFailedClubFetchPreservesSnapshot(t *testing.T) {
	dir := t.TempDir()
	previous, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	if err := os.Chdir(dir); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { os.Chdir(previous) })
	originalClient := entryBossClient
	t.Cleanup(func() { entryBossClient = originalClient })
	entryBossClient = &http.Client{Transport: roundTripFunc(func(*http.Request) (*http.Response, error) {
		return &http.Response{StatusCode: 503, Body: io.NopCloser(strings.NewReader("unavailable"))}, nil
	})}
	clubs, _ := json.Marshal([]Club{{ClubName: "FCC", ClubURL: "https://entryboss.cc/calendar/fcc", State: "VIC"}})
	if err := os.WriteFile(filepath.Join(dir, "clubs.json"), clubs, 0644); err != nil {
		t.Fatal(err)
	}
	snapshot := []byte(`[{"eventUrl":"https://entryboss.cc/races/1","clubName":"FCC"}]`)
	if err := os.WriteFile("events-vic.json", snapshot, 0644); err != nil {
		t.Fatal(err)
	}
	if err := updateEvents("VIC"); err == nil {
		t.Fatal("expected failed update")
	}
	got, err := os.ReadFile("events-vic.json")
	if err != nil || string(got) != string(snapshot) {
		t.Fatal("failed refresh changed existing snapshot")
	}
}
