package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
	"github.com/spf13/cobra"
)

var entryBossClient = &http.Client{Timeout: 20 * time.Second}

func isEntryBossURL(raw string) bool {
	u, err := url.Parse(raw)
	return err == nil && (strings.EqualFold(u.Hostname(), "entryboss.cc") || strings.EqualFold(u.Hostname(), "www.entryboss.cc"))
}

func absoluteEntryBossURL(raw string) string {
	base, _ := url.Parse("https://entryboss.cc")
	ref, err := url.Parse(raw)
	if err != nil {
		return raw
	}
	return base.ResolveReference(ref).String()
}

// Race identity excludes tracking parameters and trailing slashes, but never
// merges distinct race IDs, even when their names and dates match.
func eventIdentity(raw string) string {
	if !isEntryBossURL(raw) {
		return strings.TrimSpace(raw)
	}
	u, _ := url.Parse(raw)
	return "https://entryboss.cc" + strings.TrimRight(u.Path, "/")
}

func isEntryBossEvent(e Event) bool {
	return e.Source == "EntryBoss" || isEntryBossURL(e.EventURL)
}

type ownerResolver func(string) (Club, error)

func parseEventOwner(doc *goquery.Document, clubs []Club) (Club, error) {
	// Do not search the navigation menu: it contains every club on the site.
	links := doc.Find(".race-title small a[href]")
	if links.Length() != 1 {
		return Club{}, fmt.Errorf("expected one event club heading, found %d", links.Length())
	}
	href, _ := links.Attr("href")
	ownerURL := eventIdentity(absoluteEntryBossURL(href))
	u, _ := url.Parse(ownerURL)
	if !isEntryBossURL(ownerURL) || !strings.HasPrefix(u.Path, "/calendar/") {
		return Club{}, fmt.Errorf("invalid event club link %q", href)
	}
	for _, club := range clubs {
		if eventIdentity(club.ClubURL) == ownerURL {
			return club, nil
		}
	}
	return Club{}, fmt.Errorf("event owner %q (%s) is absent from clubs.json", strings.TrimSpace(links.Text()), ownerURL)
}

func newOwnerResolver(clubs []Club) ownerResolver {
	cache := map[string]Club{}
	return func(raw string) (Club, error) {
		key := eventIdentity(raw)
		if club, ok := cache[key]; ok {
			return club, nil
		}
		resp, err := entryBossClient.Get(key)
		if err != nil {
			return Club{}, err
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			return Club{}, fmt.Errorf("event page returned HTTP %d", resp.StatusCode)
		}
		doc, err := goquery.NewDocumentFromReader(resp.Body)
		if err != nil {
			return Club{}, err
		}
		club, err := parseEventOwner(doc, clubs)
		if err != nil {
			return Club{}, err
		}
		cache[key] = club
		time.Sleep(100 * time.Millisecond)
		return club, nil
	}
}

// verifyAll is used for fresh imports: a race may only be discovered on another
// club's calendar. Cleanup resolves conflicts while preserving unique records.
func reconcileEvents(events []Event, resolve ownerResolver, verifyAll bool) ([]Event, error) {
	groups := map[string][]Event{}
	keys := make([]string, 0)
	for _, e := range events {
		key := eventIdentity(e.EventURL)
		if key == "" {
			return nil, fmt.Errorf("event %q has no URL", e.EventName)
		}
		e.EventURL = key
		if _, exists := groups[key]; !exists {
			keys = append(keys, key)
		}
		groups[key] = append(groups[key], e)
	}
	if verifyAll {
		sort.Strings(keys)
	}
	result := make([]Event, 0, len(keys))
	for _, key := range keys {
		group := groups[key]
		// Explicit source records are fresher than pre-source-migration copies.
		sort.SliceStable(group, func(i, j int) bool { return group[i].Source != "" && group[j].Source == "" })
		chosen := group[0]
		clubs := map[string]bool{}
		for _, e := range group {
			clubs[e.ClubName] = true
		}
		if isEntryBossEvent(chosen) {
			chosen.Source = "EntryBoss"
			if verifyAll || len(clubs) > 1 {
				owner, err := resolve(key)
				if err != nil {
					return nil, fmt.Errorf("cannot resolve owner of %s: %w", key, err)
				}
				chosen.ClubName = owner.ClubName
				// State files remain discovery calendars; ownership does not move an
				// event out of a state where it was listed.
			}
		}
		for _, e := range group[1:] {
			if e.Source != "" && group[0].Source != "" && (e.EventDate != chosen.EventDate || e.EventName != chosen.EventName) {
				return nil, fmt.Errorf("conflicting current event details for %s", key)
			}
		}
		result = append(result, chosen)
	}
	sort.SliceStable(result, func(i, j int) bool {
		if result[i].EventDate != result[j].EventDate {
			return result[i].EventDate < result[j].EventDate
		}
		return verifyAll && result[i].EventURL < result[j].EventURL
	})
	return result, nil
}

var cleanEventsCmd = &cobra.Command{
	Use:   "clean-events",
	Short: "Purge past events and deduplicate existing state files",
	RunE: func(cmd *cobra.Command, args []string) error {
		data, err := os.ReadFile("clubs.json")
		if err != nil {
			return err
		}
		var clubs []Club
		if err := json.Unmarshal(data, &clubs); err != nil {
			return err
		}
		resolve := newOwnerResolver(clubs)
		files, err := filepath.Glob("events-*.json")
		if err != nil {
			return err
		}
		// Validate every file and resolve all conflicts before writing any changes.
		outputs := map[string][]byte{}
		for _, file := range files {
			data, err := os.ReadFile(file)
			if err != nil {
				return err
			}
			var events []Event
			if err := json.Unmarshal(data, &events); err != nil {
				return err
			}
			state := strings.ToUpper(strings.TrimSuffix(strings.TrimPrefix(file, "events-"), ".json"))
			upcoming, err := upcomingEvents(events, state, time.Now())
			if err != nil {
				return fmt.Errorf("%s: %w", file, err)
			}
			clean, err := reconcileEvents(upcoming, resolve, false)
			if err != nil {
				return fmt.Errorf("%s: %w", file, err)
			}
			outputs[file], err = json.MarshalIndent(clean, "", "  ")
			if err != nil {
				return err
			}
			fmt.Printf("%s: %d -> %d events\n", file, len(events), len(clean))
		}
		return replaceSnapshots(outputs)
	},
}
