# Premier League Manager Prototype

A playable proof of the **Lean v1 Spec** core loop, now using the real
2025-26 Premier League clubs: pick a club, set tactics, hit Continue, watch
a season unfold in results, table, squad condition, and injuries. Zero
dependencies, zero build step, zero cost.

**On the real names:** club names and player names are facts, not
copyrighted expression — this is the same approach every Championship
Manager/FM save editor has used for decades. No crests, kits, badges, or any
other trademarked/licensed assets are used anywhere. Each club's squad
blends a handful of recognizable real first-teamers (see `REAL_STARS` in
`js/data.js`) with generated depth players — it's a snapshot, not a
maintained database, so expect it to drift out of date as transfer windows
happen. This is a personal, non-commercial hobby prototype; if this ever
became something distributed more widely or monetized, real club/player
names would need a fresh look.

## Run it

Just open `index.html` in any modern browser (Chrome, Firefox, Safari, Edge).
No server, no npm install, no build. Double-click the file or drag it into a
browser window.

Your career auto-saves to your browser's local storage after every action —
closing the tab and reopening `index.html` later resumes exactly where you
left off. "New save" on the sidebar wipes it and starts fresh.

## What's actually simulated

- **20 real Premier League clubs**, 22-player squads each. Every squad
  slot a real first-teamer doesn't fill is generated fresh each new game.
- **16 roles** across 8 positions, each scored by one shared weighted-attribute
  formula (Lean v1 Spec §3.3) — not the Bible's ~30 bespoke role formulas.
- **Match engine** is the aggregate team-strength model from §6: attack/defense
  indices → an xG-style curve → Poisson-sampled goals → a readable event feed
  built from commentary templates. Not a possession-by-possession simulation.
- **Tactics**: 6 formation presets + 3 sliders (mentality, pressing, tempo),
  each a flat multiplier on the match formula. One tactical warning rule
  (no natural width → fewer crosses).
- **Progression**: condition, injuries (scaled by a hidden Injury Proneness
  attribute), morale, rolling form, and board confidence vs. a pre-season
  target — all short formulas per §8, updated after every matchday.
- **38-week double round-robin** season (every club plays every other twice
  — same length as a real Premier League season), full league table, inbox
  with match reports / injury news / periodic board check-ins, and a
  season-complete summary.
- Team selection is **automatic** — the engine always fields your best
  available XI for the formation you've chosen. There's no manual lineup
  editor in this slice (see Not included below).

## Not included in this slice

Deliberately deferred, per the Lean v1 Spec §7 and §12 — this prototype was
scoped to "several weeks: fixtures, table, squad, injuries," not the full
season loop:

- Transfers / scouting / contract negotiation (nav item is a stub)
- Manual lineup/substitution editing
- Promotion/relegation (single division only in this build)
- Custom formations, extra tactical sliders, Tactical Coherence Score
- Full hidden-attribute roster (only Consistency + Injury Proneness are modeled)
- Training, age-based development curves, role familiarity

## File structure

```
index.html      — page shell, nav, new-game overlay
style.css        — all styling (single stylesheet, CSS variables for theming)
js/data.js       — static data: attributes, roles, formations, name pools
js/gen.js        — seeded world generation (clubs, players, fixture list)
js/engine.js     — role scoring, team strength, match simulation, progression
js/state.js      — game state orchestration, inbox messages, save/load
js/ui.js         — DOM rendering for every screen
js/main.js       — navigation wiring, Continue button, boot sequence
```

Each file is a plain `<script>` (no ES modules, no bundler) so it runs
straight from the filesystem with no CORS issues. `data.js`, `gen.js`, and
`engine.js` have no DOM dependencies at all — they were sanity-tested
standalone in Node before being wired into the UI.

## If the loop feels fun

The next step is comparing this against the Lean v1 Spec's §12 "what v2 adds
back" list and picking the first 2-3 systems worth deepening — most likely
the match engine (possession phases) and transfers, since those are the two
biggest simplifications here.
