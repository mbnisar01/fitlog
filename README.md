# FitLog

A phone-first, installable PWA to track daily **macros**, **workouts**, and **vitamins**.
No build step, no backend, no dependencies — plain HTML/CSS/ES-module JavaScript, with all
data stored on-device in `localStorage`.

## Features

- **Today** — log the day's macro totals (calories/protein/carbs/fat) against your goals
  (progress bars), add/delete workouts (name · minutes · notes), and tick off your vitamins.
- **History** — a list of logged days with a quick summary; tap one to open it.
- **Settings** — edit macro goals, manage your vitamin list, and export/import a JSON backup.
- **Installable & offline** — add to your home screen; a service worker caches the app shell.

## Run locally

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>. (Serving over HTTP is required — ES modules and the
service worker do not work from `file://`.)

## Tests

Pure-logic unit tests (storage + logic) run two ways from the same test files:

- Headless: `sh tests/run.sh` — prints `RESULT: N passed, M failed` (exit non-zero on failure).
- In a browser: open <http://localhost:8000/tests.html>.

## Icons

App icons are generated with a dependency-free script:

```sh
python3 tools/make_icons.py
```

## Deploy

Static site — host the repository root on **GitHub Pages** (branch `main`, folder `/`).
The included `.nojekyll` file tells Pages to serve the files as-is.
