# FitLog — MVP Design Spec

**Date:** 2026-06-30
**Status:** Approved (design), pending implementation plan
**Working name:** FitLog (rename anytime)

## 1. Summary

A phone-first, installable web app (PWA) with three lightweight daily trackers —
**Macros**, **Workouts**, and **Vitamins** — organized around a single "Today"
screen. No accounts, no server. All data is stored on-device in the browser.

The guiding principle is **lean daily logging**: every interaction should take a
few taps. Depth (per-food breakdowns, sets/reps, charts) is explicitly deferred.

## 2. Goals & Non-Goals

### Goals
- Log a day's **macro totals** (calories, protein, carbs, fat) against daily goals.
- Log **workouts** as simple entries (name, duration, notes).
- Track **vitamins/supplements** as a daily checklist from a user-defined list.
- Work installed on a phone home screen, offline, with no backend.
- Let the user back up / restore their data (JSON export/import).

### Non-Goals (future iterations)
- Accounts / login / multi-user.
- Cloud sync across devices.
- Food database / barcode scanning / per-food meal breakdown.
- Exercise sets / reps / weight tracking.
- Charts / analytics / trends.
- Reminders / push notifications.

## 3. Tech Approach

**Separated vanilla files, no framework, no build step.**

- Plain HTML / CSS / JS organized into a few focused files, plus `manifest.json`
  and `service-worker.js` for installability and offline support.
- **No dependencies, no Node, no bundler.** Rationale: the dev machine has Python
  and git but no Node; a no-build static app is the fastest reliable path to a
  usable, installable MVP and is trivial to host on GitHub Pages.

**Alternatives considered:**
- *Single inline `index.html`* — simplest to host, but becomes unmaintainable.
- *CDN micro-framework (Alpine.js / petite-vue)* — less boilerplate, but adds a
  runtime dependency and network reliance for an otherwise self-contained app.

Vanilla separated files chosen for: zero dependencies, nothing to install, easy
to host, and maintainable (focused files instead of one blob).

## 4. Screens & Navigation

Bottom tab bar with three tabs: **Today · History · Settings**.

### Today (home)
- Date header showing the selected day, with prev/next controls to step between
  days. Defaults to the current date.
- Three cards:
  - **Macros** — calories / protein / carbs / fat displayed as progress bars
    against the user's goals. Tap to edit the day's totals (simple number inputs).
  - **Workouts** — list of today's workouts; an "Add workout" form with fields:
    name, duration (minutes), optional notes. Each entry can be deleted.
  - **Vitamins** — checklist of the user's configured supplements; tap a row to
    toggle taken/not-taken for the day.

### History
- A scrollable list of recent days (most recent first). Each row is a compact
  summary: date, calories, number of workouts, vitamins taken (X/Y).
- Tapping a day opens it in the Today view (by setting the selected date).

### Settings
- Edit macro **goals**: calories, protein, carbs, fat.
- Manage the **vitamin list**: add / remove supplement names.
- **Export** data to a JSON file and **Import** from a JSON file (backup/restore).

## 5. Data Model

A single `localStorage` entry (key `fitlog:v1`) holding one JSON object. Days are
keyed by `YYYY-MM-DD`, which makes "today" lookups and history listing trivial.

```jsonc
{
  "settings": {
    "goals": { "calories": 2000, "protein": 150, "carbs": 200, "fat": 60 },
    "vitamins": ["Vitamin D", "Omega-3", "Magnesium"]
  },
  "days": {
    "2026-06-30": {
      "macros":   { "calories": 1850, "protein": 140, "carbs": 180, "fat": 55 },
      "workouts": [
        { "id": "w_abc123", "name": "Push day", "duration": 45, "notes": "felt strong" }
      ],
      "vitamins": { "Vitamin D": true, "Omega-3": false, "Magnesium": true }
    }
  }
}
```

Notes:
- Missing days/fields are treated as empty (zero macros, no workouts, nothing
  taken). The app never requires a day to be pre-created.
- Vitamin "taken" state is keyed by vitamin name. If a vitamin is removed from the
  list in Settings, historical day records may still contain its key; the UI only
  renders vitamins currently in `settings.vitamins`.
- `id` for workouts is a generated unique string (e.g. timestamp + random).

## 6. Architecture / Modules

Keep logic separated from DOM so the logic is unit-testable without a browser
framework:

- **storage module** — load/save the root object to `localStorage`, with safe
  defaults and JSON (de)serialization; export/import helpers.
- **logic module (pure functions)** — date helpers (today key, format, step
  day), macro goal-percentage calculation, day summary for History, workout id
  generation, add/remove/toggle operations that take state in and return new
  state out (no DOM, no globals).
- **ui / render module** — reads current state and renders each screen; wires up
  event handlers that call logic functions then re-render and persist.
- **app shell** — `index.html`, styles, tab navigation, manifest, service worker.

## 7. Testing

The pure logic module is covered by a small **in-browser test page**
(`tests.html`) that imports the logic functions and runs assertions, rendering a
pass/fail list. This keeps core calculations (goal %, summaries, date stepping,
add/remove/toggle, serialization round-trip) tested without requiring Node.

Manual verification checklist covers the UI flows: log macros, add/delete a
workout, toggle vitamins, navigate days, edit goals, manage vitamin list, and
export/import.

## 8. Hosting & Deployment

- **Local use/dev:** run `python3 -m http.server` from the project root and open
  `http://localhost:8000`. Service workers are permitted on `localhost`, so PWA
  features work during development.
- **On a phone (installable, HTTPS):** deploy the static files to **GitHub Pages**
  (free static hosting over HTTPS). The project is a git repo in `~/Projects/fitlog`;
  deploy steps will be included with the implementation.

## 9. Open Questions / Risks

- **localStorage durability:** browser data can be cleared by the OS/user; the
  JSON export/import is the mitigation. No cloud backup in MVP (by design).
- **PWA icons:** need at least one app icon (and ideally a maskable variant) for a
  clean home-screen install; will provide simple generated icons.
