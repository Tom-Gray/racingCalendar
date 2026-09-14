# Duplicate events and club attribution

## Implemented plan

1. Identify EntryBoss events by canonical race URL, independent of the calendar that lists them.
2. Replace legacy EntryBoss records (including empty source fields) on refresh and deduplicate across all clubs in a state.
3. Read the event page's `.race-title small a` club link and match its calendar URL to `clubs.json`. Never infer ownership from the discovery calendar, page navigation, or title.
4. Use one deterministic club-colour function for desktop and mobile.
5. Clean existing duplicates and add scraper, data-integrity, and browser regression coverage.

## Behaviour

Each event retains a single `clubName`. Club filters, labels, and colours use that owner. Cross-promotion on FCC's calendar does not make GCC or GSCC events FCC events. State files remain discovery calendars; an event listed in multiple states can appear once in each state.

Fresh imports verify every unique EntryBoss event, including events discovered on only one club calendar. Owner lookups are cached within a run and use a 20-second request timeout. This adds one request per unique event and therefore increases refresh time. Missing, ambiguous, or unknown club headings stop the affected state refresh rather than guessing ownership. Failed club requests also stop the refresh; the affected state's previous file is retained. Earlier states may already have been updated.

The shared colour function replaces the previous desktop/mobile algorithms. Existing colours may change once on upgrade, but thereafter adding/removing other clubs does not change a club's colour. The finite palette can be reused by different clubs.

## Existing data cleanup

Run from the repository root:

```sh
go run ./cmd clean-events
```

Cleanup validates all state files before writing. It resolves conflicting club assignments against live event pages, prefers explicit-source records over legacy duplicates, and rejects conflicts between current records' dates/titles. It normalises legacy source fields and preserves distinct registration URLs. Unique records are retained without refetching all their event pages; this is not a full calendar refresh or a repair of historical date errors.

The initial cleanup removed 78 extra records: ACT 29, QLD 4, SA 11, VIC 33, WA 1. NSW, NT and TAS had no duplicate URLs. The Heritage Handicap (31703) is assigned to Geelong Cycling Club; Layard Park Open (31994) to Geelong & Surfcoast Cycling Club.

The CLI now spans multiple Go files. Use `go run ./cmd ...`, not `go run cmd/main.go ...`; scheduled workflows have been updated accordingly.

## Validation

```sh
go test ./... -cover
npm test
```

Regression tests cover legacy replacement, cross-calendar merging, authoritative heading extraction, scrape-order independence, distinct race identities, unresolved owners, failed refresh preservation, data uniqueness, owning-club filtering, and stable colours across desktop/mobile. Go tests now also run in CI.

Verified locally: Go tests passed (24.0% statement coverage); all 39 Playwright cases passed across Chromium, Firefox, and WebKit. A before/after data audit confirmed that every unique event URL was retained and no within-state duplicate URL remains. A second cleanup left event counts unchanged. No full live refresh was run.
