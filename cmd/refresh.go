package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
	_ "time/tzdata"
)

var stateTimezones = map[string]string{
	"ACT": "Australia/Sydney", "NSW": "Australia/Sydney", "NT": "Australia/Darwin",
	"QLD": "Australia/Brisbane", "SA": "Australia/Adelaide", "TAS": "Australia/Hobart",
	"VIC": "Australia/Melbourne", "WA": "Australia/Perth",
}

func upcomingEvents(events []Event, state string, now time.Time) ([]Event, error) {
	zone, ok := stateTimezones[state]
	if !ok {
		return nil, fmt.Errorf("unsupported state %q", state)
	}
	location, err := time.LoadLocation(zone)
	if err != nil {
		return nil, err
	}
	today := now.In(location).Format("2006-01-02")
	result := []Event{}
	for _, event := range events {
		// Event dates encode the scheduled calendar day, not a UTC start time.
		day := event.EventDate
		if len(day) > 10 {
			if _, err := time.Parse(time.RFC3339, day); err != nil {
				return nil, fmt.Errorf("invalid date for %s: %w", event.EventURL, err)
			}
			day = day[:10]
		}
		if _, err := time.Parse("2006-01-02", day); err != nil {
			return nil, fmt.Errorf("invalid date for %s: %w", event.EventURL, err)
		}
		if day >= today {
			result = append(result, event)
		}
	}
	return result, nil
}

type stateFetcher func(string) ([]Event, error)

// No existing event data is read. Every requested snapshot is built and
// validated before any file is replaced, including successful empty results.
func refreshSnapshots(states []string, now time.Time, entryBoss, buncheur stateFetcher, resolve ownerResolver) error {
	outputs := map[string][]byte{}
	for _, state := range states {
		eb, err := entryBoss(state)
		if err != nil {
			return fmt.Errorf("%s EntryBoss refresh failed: %w", state, err)
		}
		bc, err := buncheur(state)
		if err != nil {
			return fmt.Errorf("%s Buncheur refresh failed: %w", state, err)
		}
		fresh, err := upcomingEvents(append(eb, bc...), state, now)
		if err != nil {
			return err
		}
		fresh, err = reconcileEvents(fresh, resolve, true)
		if err != nil {
			return fmt.Errorf("%s validation failed: %w", state, err)
		}
		data, err := json.MarshalIndent(fresh, "", "  ")
		if err != nil {
			return err
		}
		file := fmt.Sprintf("events-%s.json", strings.ToLower(state))
		outputs[file] = data
		fmt.Printf("Prepared %s: %d upcoming events\n", file, len(fresh))
	}
	return replaceSnapshots(outputs)
}

// Stage on the same filesystem so readers see either the old complete file or
// the new complete file. A fetch/validation/staging failure leaves all old files.
// Renames are atomic per file, not a transaction across all state files.
func replaceSnapshots(outputs map[string][]byte) error {
	files := make([]string, 0, len(outputs))
	staged := map[string]string{}
	defer func() {
		for _, temporary := range staged {
			os.Remove(temporary)
		}
	}()
	for file := range outputs {
		files = append(files, file)
	}
	sort.Strings(files)
	for _, file := range files {
		temporary, err := os.CreateTemp(filepath.Dir(file), ".events-*.tmp")
		if err != nil {
			return err
		}
		staged[file] = temporary.Name()
		if err := temporary.Chmod(0644); err != nil {
			temporary.Close()
			return err
		}
		if _, err := temporary.Write(outputs[file]); err != nil {
			temporary.Close()
			return err
		}
		if err := temporary.Sync(); err != nil {
			temporary.Close()
			return err
		}
		if err := temporary.Close(); err != nil {
			return err
		}
	}
	for _, file := range files {
		if err := os.Rename(staged[file], file); err != nil {
			return err
		}
	}
	return nil
}

func updateEvents(state string) error {
	states := []string{}
	if state != "" {
		if _, ok := stateTimezones[state]; !ok {
			return fmt.Errorf("unsupported state %q", state)
		}
		states = append(states, state)
	} else {
		for code := range stateTimezones {
			states = append(states, code)
		}
		sort.Strings(states)
	}
	data, err := os.ReadFile("clubs.json")
	if err != nil {
		return err
	}
	var clubs []Club
	if err := json.Unmarshal(data, &clubs); err != nil {
		return err
	}
	if clubs == nil {
		return fmt.Errorf("clubs.json must contain an array")
	}
	return refreshSnapshots(states, time.Now(), func(state string) ([]Event, error) { return fetchEntryBossEvents(state, clubs) }, fetchBuncheurEvents, newOwnerResolver(clubs))
}
