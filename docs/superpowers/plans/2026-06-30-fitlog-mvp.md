# FitLog MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a phone-first, installable PWA that tracks daily macro totals, workouts, and a vitamin checklist, with all data stored on-device.

**Architecture:** No-build static web app — plain HTML/CSS/ES-modules served over HTTP. A pure-logic layer (`logic.js`) and a storage layer (`storage.js`) are unit-tested in the browser via `tests.html`; a DOM render layer (`render.js`) and bootstrap (`app.js`) drive three screens behind a bottom tab bar. A manifest + service worker make it installable and offline-capable.

**Tech Stack:** Vanilla HTML, CSS, JavaScript (ES modules). No frameworks, no bundler, no Node. Python 3's `http.server` for local serving. `localStorage` for persistence. Python stdlib for one-off PNG icon generation.

## Global Constraints

- No build step, no Node, no external runtime dependencies — vanilla HTML/CSS/JS only.
- JS is ES modules, served over HTTP (`python3 -m http.server`), never opened via `file://`.
- All asset URLs are **relative** (no leading `/`) so the app works under a GitHub Pages subpath.
- localStorage key is exactly `fitlog:v1`.
- Day keys are `YYYY-MM-DD` based on **local** date.
- Mobile-first; installable PWA (manifest + service worker); offline-capable.
- Automated tests cover **pure logic only** (`js/storage.js` and `js/logic.js`). The same test files run two ways: headlessly via `sh tests/run.sh` (JavaScriptCore — prints `RESULT: N passed, M failed` and exits non-zero on any failure) and visually in the browser via `tests.html`. UI screens are verified by a manual checklist.
- For Tasks 2–5, run the suite with `sh tests/run.sh`. Wherever a step says to "refresh `tests.html`" and expect "N passed", the headless equivalent is: run `sh tests/run.sh` and confirm `RESULT: N passed, 0 failed` (exit 0). A subagent without a browser must use the headless runner.
- `jsc` lives at `/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc` (present on macOS). The `tests/` dir is dev-only and never cached by the service worker, so it does not ship to the PWA.
- Commit after every task with a clear message.

---

## File Structure

```
~/Projects/fitlog/
├── index.html              # app shell: appbar, #screen container, bottom tab nav
├── styles.css              # mobile-first dark theme, cards, tab bar
├── manifest.json           # PWA manifest
├── service-worker.js       # offline app-shell cache
├── icons/                  # generated PNG icons
├── js/
│   ├── storage.js          # parse/serialize + load/save localStorage (testable)
│   ├── logic.js            # pure functions: dates, calcs, queries, state mutations
│   ├── render.js           # DOM render functions per screen + el() helper
│   └── app.js              # bootstrap: state, handlers, tab nav, SW registration
├── tests.html              # in-browser test runner (browser view of the suite)
├── tests/
│   ├── test-framework.js   # tiny test/assert + results renderer + summary()
│   ├── jsc-prelude.js      # polyfills structuredClone for headless jsc runs
│   ├── jsc-report.js       # prints RESULT line from summary() under jsc
│   ├── run.sh              # headless runner: jsc over existing *.test.js
│   ├── storage.test.js
│   └── logic.test.js
├── tools/
│   └── make_icons.py       # one-off pure-stdlib PNG icon generator
└── docs/superpowers/{specs,plans}/   # spec + this plan
```

---

### Task 1: Scaffold — dev server, test harness, minimal shell

**Files:**
- Create: `index.html`
- Create: `tests/test-framework.js`
- Create: `tests/jsc-prelude.js`
- Create: `tests/jsc-report.js`
- Create: `tests/run.sh`
- Create: `tests/sample.test.js`
- Create: `tests.html`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `test(name, fn)` — registers a test (runs `fn`, records pass/fail).
  - `assert(cond, msg)` — throws `Error(msg)` if `cond` is falsy.
  - `assertEqual(actual, expected, msg)` — throws if `JSON.stringify` differs.
  - `summary()` — returns `{ passed, failed, failures: [{name, error}] }` from recorded results.
  - `renderResults(root)` — appends a pass/fail list + summary to `root` (browser view).
  - `sh tests/run.sh` — headless runner; prints `RESULT: N passed, M failed` and exits non-zero on failure.

- [ ] **Step 1: Create the minimal app shell** (`index.html`)

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>FitLog</title>
</head>
<body>
  <h1>FitLog</h1>
  <p>Dev server is running. Open <a href="tests.html">tests.html</a> to run the test suite.</p>
</body>
</html>
```

- [ ] **Step 2: Create the test framework** (`tests/test-framework.js`)

```js
const results = [];

export function test(name, fn) {
  try {
    fn();
    results.push({ name, pass: true });
  } catch (e) {
    results.push({ name, pass: false, error: e && e.message ? e.message : String(e) });
  }
}

export function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

export function assertEqual(actual, expected, msg) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error((msg ? msg + ': ' : '') + `expected ${e}, got ${a}`);
}

export function summary() {
  const passed = results.filter(r => r.pass).length;
  return { passed, failed: results.length - passed, failures: results.filter(r => !r.pass) };
}

export function renderResults(root) {
  const { passed, failed } = summary();
  const summaryEl = document.createElement('h2');
  summaryEl.textContent = `${passed} passed, ${failed} failed`;
  summaryEl.style.color = failed ? '#c0392b' : '#27ae60';
  root.append(summaryEl);
  const ul = document.createElement('ul');
  for (const r of results) {
    const li = document.createElement('li');
    li.style.color = r.pass ? '#27ae60' : '#c0392b';
    li.textContent = (r.pass ? 'PASS ' : 'FAIL ') + r.name + (r.error ? ' — ' + r.error : '');
    ul.append(li);
  }
  root.append(ul);
}
```

- [ ] **Step 3: Create a sample failing test** (`tests/sample.test.js`)

```js
import { test, assertEqual } from './test-framework.js';

test('harness detects failures', () => {
  assertEqual(1 + 1, 3); // intentionally wrong
});
```

- [ ] **Step 4: Create the test runner page** (`tests.html`)

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>FitLog Tests</title>
</head>
<body>
  <h1>FitLog Tests</h1>
  <div id="results"></div>
  <script type="module">
    import './tests/sample.test.js';
    import { renderResults } from './tests/test-framework.js';
    renderResults(document.getElementById('results'));
  </script>
</body>
</html>
```

- [ ] **Step 5: Create the jsc structuredClone polyfill** (`tests/jsc-prelude.js`)

```js
// JavaScriptCore (jsc) has no structuredClone, which js/logic.js relies on.
// A JSON round-trip is a correct deep clone here because app state is pure JSON
// (no Dates, functions, or cycles). Browsers use their native structuredClone.
globalThis.structuredClone = globalThis.structuredClone || ((x) => JSON.parse(JSON.stringify(x)));
```

- [ ] **Step 6: Create the jsc reporter** (`tests/jsc-report.js`)

```js
import { summary } from './test-framework.js';

const s = summary();
for (const f of s.failures) print('FAIL ' + f.name + (f.error ? ' — ' + f.error : ''));
print('RESULT: ' + s.passed + ' passed, ' + s.failed + ' failed');
```

- [ ] **Step 7: Create the headless runner** (`tests/run.sh`)

```sh
#!/bin/sh
# Headless test runner (macOS JavaScriptCore). Runs every tests/*.test.js through
# the shared framework and prints "RESULT: N passed, M failed". Exits non-zero on
# any failure, or if a jsc/syntax error suppresses the RESULT line.
JSC="/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc"
cd "$(dirname "$0")"
files=""
for f in *.test.js; do
  [ -e "$f" ] && files="$files $f"
done
# Guard: an empty suite must never report success.
[ -z "$files" ] && { echo "No test files found in $(pwd)"; exit 1; }
# $files is intentionally unquoted to word-split into separate jsc arguments
# (filenames here are simple, no spaces).
out=$("$JSC" -m jsc-prelude.js $files jsc-report.js 2>&1)
echo "$out"
# Require at least one passing test and zero failures — `[1-9][0-9]*` rejects the
# "0 passed, 0 failed" false-green that "[0-9]+" would have accepted.
echo "$out" | grep -qE 'RESULT: [1-9][0-9]* passed, 0 failed'
```

- [ ] **Step 8: Run the suite headlessly and verify RED**

Run:
```bash
cd ~/Projects/fitlog && sh tests/run.sh ; echo "exit=$?"
```
Expected: prints `FAIL harness detects failures — expected 3, got 2`, then `RESULT: 0 passed, 1 failed`, and `exit=1`. This proves the runner catches failures.

- [ ] **Step 9: Fix the sample test to GREEN**

Edit `tests/sample.test.js`, change `assertEqual(1 + 1, 3);` to:
```js
  assertEqual(1 + 1, 2);
```
Re-run:
```bash
cd ~/Projects/fitlog && sh tests/run.sh ; echo "exit=$?"
```
Expected: `RESULT: 1 passed, 0 failed` and `exit=0`.

Also confirm the browser view works for the user: start the dev server (leave it running in a background terminal) and open the page:
```bash
cd ~/Projects/fitlog && python3 -m http.server 8000
```
Open `http://localhost:8000/tests.html` → green `PASS harness detects failures` and `1 passed, 0 failed`.

- [ ] **Step 10: Commit**

```bash
cd ~/Projects/fitlog
git add index.html tests.html tests/
git commit -m "chore: scaffold app shell and headless + browser test harness"
```

---

### Task 2: Storage module (parse/serialize/load/save)

**Files:**
- Create: `js/storage.js`
- Create: `tests/storage.test.js`
- Modify: `tests.html` (import storage tests, drop sample)

**Interfaces:**
- Consumes: `test`, `assert`, `assertEqual` from `tests/test-framework.js`.
- Produces (exports from `js/storage.js`):
  - `KEY` — the string `'fitlog:v1'`.
  - `makeDefaultState()` → `{ settings: { goals: {calories,protein,carbs,fat}, vitamins: [] }, days: {} }`.
  - `parseState(json)` → state object; tolerant of `null`/invalid JSON/partial shapes; fills goal defaults.
  - `serialize(state)` → JSON string.
  - `loadState(store = localStorage)` → state from `store.getItem(KEY)`.
  - `saveState(state, store = localStorage)` → void; writes `serialize(state)` to `store.setItem(KEY, ...)`.

- [ ] **Step 1: Write the failing tests** (`tests/storage.test.js`)

```js
import { test, assertEqual } from './test-framework.js';
import { KEY, makeDefaultState, parseState, serialize, loadState, saveState } from '../js/storage.js';

test('KEY is fitlog:v1', () => {
  assertEqual(KEY, 'fitlog:v1');
});

test('parseState(null) returns defaults', () => {
  assertEqual(parseState(null), makeDefaultState());
});

test('parseState(garbage) returns defaults', () => {
  assertEqual(parseState('not json {'), makeDefaultState());
});

test('parseState fills missing goal fields', () => {
  const s = parseState('{"settings":{"goals":{"calories":1800}}}');
  assertEqual(s.settings.goals, { calories: 1800, protein: 150, carbs: 200, fat: 60 });
  assertEqual(s.settings.vitamins, []);
  assertEqual(s.days, {});
});

test('parseState keeps valid days and vitamins', () => {
  const json = JSON.stringify({
    settings: { goals: { calories: 2000, protein: 150, carbs: 200, fat: 60 }, vitamins: ['Vitamin D'] },
    days: { '2026-06-30': { macros: { calories: 100, protein: 0, carbs: 0, fat: 0 }, workouts: [], vitamins: {} } }
  });
  const s = parseState(json);
  assertEqual(s.settings.vitamins, ['Vitamin D']);
  assertEqual(s.days['2026-06-30'].macros.calories, 100);
});

test('saveState then loadState round-trips via a mock store', () => {
  let mem = {};
  const store = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); } };
  const state = makeDefaultState();
  state.settings.vitamins = ['Omega-3'];
  saveState(state, store);
  assertEqual(loadState(store), state);
});

test('loadState on empty store returns defaults', () => {
  const store = { getItem: () => null, setItem: () => {} };
  assertEqual(loadState(store), makeDefaultState());
});
```

- [ ] **Step 2: Point the runner at the storage tests** (`tests.html`)

Replace the `<script type="module">` block in `tests.html` with:
```html
  <script type="module">
    import './tests/storage.test.js';
    import { renderResults } from './tests/test-framework.js';
    renderResults(document.getElementById('results'));
  </script>
```
Then delete `tests/sample.test.js`:
```bash
rm ~/Projects/fitlog/tests/sample.test.js
```

- [ ] **Step 3: Run tests to verify they FAIL**

Refresh `http://localhost:8000/tests.html`.
Expected: failures like `FAIL KEY is fitlog:v1 — ...` because `js/storage.js` does not exist yet (module import error shows as failed load — if the page is blank, check the browser console for the 404 on `storage.js`, which confirms it's missing).

- [ ] **Step 4: Implement the storage module** (`js/storage.js`)

```js
export const KEY = 'fitlog:v1';

export function makeDefaultState() {
  return {
    settings: {
      goals: { calories: 2000, protein: 150, carbs: 200, fat: 60 },
      vitamins: []
    },
    days: {}
  };
}

export function parseState(json) {
  const d = makeDefaultState();
  let obj;
  try {
    obj = JSON.parse(json);
  } catch (e) {
    return d;
  }
  if (!obj || typeof obj !== 'object') return d;
  const goals = (obj.settings && obj.settings.goals) || {};
  const vitamins = obj.settings && obj.settings.vitamins;
  return {
    settings: {
      goals: { ...d.settings.goals, ...goals },
      vitamins: Array.isArray(vitamins) ? vitamins : d.settings.vitamins
    },
    days: (obj.days && typeof obj.days === 'object') ? obj.days : {}
  };
}

export function serialize(state) {
  return JSON.stringify(state);
}

export function loadState(store = localStorage) {
  return parseState(store.getItem(KEY));
}

export function saveState(state, store = localStorage) {
  store.setItem(KEY, serialize(state));
}
```

- [ ] **Step 5: Run tests to verify they PASS**

Refresh `http://localhost:8000/tests.html`.
Expected: **"7 passed, 0 failed"**, all green.

- [ ] **Step 6: Commit**

```bash
cd ~/Projects/fitlog
git add js/storage.js tests/storage.test.js tests.html
git commit -m "feat: add storage module with defaults and round-trip persistence"
```

---

### Task 3: Logic — date & day helpers

**Files:**
- Create: `js/logic.js`
- Create: `tests/logic.test.js`
- Modify: `tests.html` (add logic tests import)

**Interfaces:**
- Consumes: `makeDefaultState` from `js/storage.js`; test helpers.
- Produces (exports from `js/logic.js`):
  - `todayKey(date = new Date())` → `'YYYY-MM-DD'` (local).
  - `formatDateKey(key)` → e.g. `'Tue, Jun 30'`.
  - `stepDay(key, delta)` → key offset by `delta` days.
  - `emptyDay()` → `{ macros: {calories:0,protein:0,carbs:0,fat:0}, workouts: [], vitamins: {} }`.
  - `getDay(state, key)` → existing day or `emptyDay()` (no mutation).
  - `hasData(day)` → boolean (any macro > 0, any workout, or any vitamin true).

- [ ] **Step 1: Write the failing tests** (`tests/logic.test.js`)

```js
import { test, assert, assertEqual } from './test-framework.js';
import { makeDefaultState } from '../js/storage.js';
import {
  todayKey, formatDateKey, stepDay, emptyDay, getDay, hasData
} from '../js/logic.js';

test('todayKey formats a local date as YYYY-MM-DD', () => {
  assertEqual(todayKey(new Date(2026, 5, 30)), '2026-06-30'); // month 5 = June
});

test('todayKey zero-pads month and day', () => {
  assertEqual(todayKey(new Date(2026, 0, 3)), '2026-01-03');
});

test('formatDateKey is human readable', () => {
  assertEqual(formatDateKey('2026-06-30'), 'Tue, Jun 30');
});

test('stepDay moves forward across month boundary', () => {
  assertEqual(stepDay('2026-06-30', 1), '2026-07-01');
});

test('stepDay moves backward across month boundary', () => {
  assertEqual(stepDay('2026-03-01', -1), '2026-02-28');
});

test('emptyDay has zeroed macros and empty collections', () => {
  assertEqual(emptyDay(), { macros: { calories: 0, protein: 0, carbs: 0, fat: 0 }, workouts: [], vitamins: {} });
});

test('getDay returns emptyDay for a missing key without mutating state', () => {
  const state = makeDefaultState();
  assertEqual(getDay(state, '2026-06-30'), emptyDay());
  assertEqual(state.days, {});
});

test('getDay returns the stored day when present', () => {
  const state = makeDefaultState();
  state.days['2026-06-30'] = { macros: { calories: 5, protein: 0, carbs: 0, fat: 0 }, workouts: [], vitamins: {} };
  assertEqual(getDay(state, '2026-06-30').macros.calories, 5);
});

test('hasData is false for an empty day', () => {
  assert(hasData(emptyDay()) === false);
});

test('hasData is true when a macro is set', () => {
  const d = emptyDay(); d.macros.calories = 1;
  assert(hasData(d) === true);
});

test('hasData is true when a workout exists', () => {
  const d = emptyDay(); d.workouts.push({ id: 'w_1', name: 'Run', duration: 20, notes: '' });
  assert(hasData(d) === true);
});

test('hasData is true when a vitamin is taken', () => {
  const d = emptyDay(); d.vitamins['Vitamin D'] = true;
  assert(hasData(d) === true);
});
```

- [ ] **Step 2: Add logic tests to the runner** (`tests.html`)

Update the import lines inside the `<script type="module">` block so both suites load:
```html
  <script type="module">
    import './tests/storage.test.js';
    import './tests/logic.test.js';
    import { renderResults } from './tests/test-framework.js';
    renderResults(document.getElementById('results'));
  </script>
```

- [ ] **Step 3: Run tests to verify they FAIL**

Refresh `http://localhost:8000/tests.html`.
Expected: storage tests still pass; the new logic rows fail (module `logic.js` missing → console 404).

- [ ] **Step 4: Implement the date & day helpers** (`js/logic.js`)

```js
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pad2(n) {
  return String(n).padStart(2, '0');
}

// Parse 'YYYY-MM-DD' to a local Date at noon (noon avoids DST/offset edge cases).
function keyToDate(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function todayKey(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function formatDateKey(key) {
  const d = keyToDate(key);
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function stepDay(key, delta) {
  const d = keyToDate(key);
  d.setDate(d.getDate() + delta);
  return todayKey(d);
}

export function emptyDay() {
  return { macros: { calories: 0, protein: 0, carbs: 0, fat: 0 }, workouts: [], vitamins: {} };
}

export function getDay(state, key) {
  return (state.days && state.days[key]) ? state.days[key] : emptyDay();
}

export function hasData(day) {
  const m = day.macros || {};
  if ((m.calories || 0) > 0 || (m.protein || 0) > 0 || (m.carbs || 0) > 0 || (m.fat || 0) > 0) return true;
  if ((day.workouts || []).length > 0) return true;
  return Object.values(day.vitamins || {}).some(v => v === true);
}
```

- [ ] **Step 5: Run tests to verify they PASS**

Refresh `http://localhost:8000/tests.html`.
Expected: all storage + logic date/day tests green (19 passed, 0 failed).

- [ ] **Step 6: Commit**

```bash
cd ~/Projects/fitlog
git add js/logic.js tests/logic.test.js tests.html
git commit -m "feat: add date and day helpers to logic module"
```

---

### Task 4: Logic — calculations & queries

**Files:**
- Modify: `js/logic.js` (append exports)
- Modify: `tests/logic.test.js` (append tests)

**Interfaces:**
- Consumes: `getDay`, `emptyDay` (same module).
- Produces (additional exports from `js/logic.js`):
  - `goalPercent(value, goal)` → `0` if `goal <= 0`, else `Math.round(value / goal * 100)`.
  - `daySummary(state, key)` → `{ calories, workoutCount, vitaminsTaken, vitaminsTotal }`.
  - `listDays(state)` → array of day keys that satisfy `hasData`, sorted **descending**.

- [ ] **Step 1: Append the failing tests** (`tests/logic.test.js`)

Add these imports to the existing import from `../js/logic.js` (extend the destructured list with `goalPercent, daySummary, listDays`), then append:

```js
test('goalPercent computes a rounded percentage', () => {
  assertEqual(goalPercent(100, 200), 50);
});

test('goalPercent is 0 when the goal is 0', () => {
  assertEqual(goalPercent(5, 0), 0);
});

test('goalPercent can exceed 100', () => {
  assertEqual(goalPercent(250, 200), 125);
});

test('daySummary counts calories, workouts, and vitamins taken', () => {
  const state = makeDefaultState();
  state.settings.vitamins = ['A', 'B', 'C'];
  state.days['2026-06-30'] = {
    macros: { calories: 1850, protein: 0, carbs: 0, fat: 0 },
    workouts: [{ id: 'w_1', name: 'Run', duration: 20, notes: '' }],
    vitamins: { A: true, B: false }
  };
  assertEqual(daySummary(state, '2026-06-30'), {
    calories: 1850, workoutCount: 1, vitaminsTaken: 1, vitaminsTotal: 3
  });
});

test('listDays returns only days with data, newest first', () => {
  const state = makeDefaultState();
  state.days['2026-06-28'] = { macros: { calories: 100, protein: 0, carbs: 0, fat: 0 }, workouts: [], vitamins: {} };
  state.days['2026-06-29'] = emptyDay(); // no data → excluded
  state.days['2026-06-30'] = { macros: { calories: 0, protein: 0, carbs: 0, fat: 0 }, workouts: [{ id: 'w_1', name: 'Run', duration: 5, notes: '' }], vitamins: {} };
  assertEqual(listDays(state), ['2026-06-30', '2026-06-28']);
});
```

- [ ] **Step 2: Run tests to verify they FAIL**

Refresh `http://localhost:8000/tests.html`.
Expected: the 5 new rows fail (`goalPercent is not a function`, etc.); earlier tests stay green.

- [ ] **Step 3: Append the implementation** (`js/logic.js`)

Add to the end of `js/logic.js`:
```js
export function goalPercent(value, goal) {
  if (!goal || goal <= 0) return 0;
  return Math.round((value / goal) * 100);
}

export function daySummary(state, key) {
  const day = getDay(state, key);
  const vitaminNames = (state.settings && state.settings.vitamins) || [];
  const taken = vitaminNames.filter(name => day.vitamins && day.vitamins[name] === true).length;
  return {
    calories: (day.macros && day.macros.calories) || 0,
    workoutCount: (day.workouts || []).length,
    vitaminsTaken: taken,
    vitaminsTotal: vitaminNames.length
  };
}

export function listDays(state) {
  const days = state.days || {};
  return Object.keys(days)
    .filter(key => hasData(days[key]))
    .sort()
    .reverse();
}
```

- [ ] **Step 4: Run tests to verify they PASS**

Refresh `http://localhost:8000/tests.html`.
Expected: 24 passed, 0 failed.

- [ ] **Step 5: Commit**

```bash
cd ~/Projects/fitlog
git add js/logic.js tests/logic.test.js
git commit -m "feat: add macro/summary calculations and day listing"
```

---

### Task 5: Logic — state mutations

**Files:**
- Modify: `js/logic.js` (append exports)
- Modify: `tests/logic.test.js` (append tests)

**Interfaces:**
- Consumes: `structuredClone` (browser global), `getDay` (same module).
- Produces (additional exports from `js/logic.js`) — all return a **new** state, never mutating the input:
  - `genId()` → unique string prefixed `'w_'`.
  - `setMacros(state, key, macros)` → sets `days[key].macros` to numeric-coerced values.
  - `addWorkout(state, key, { name, duration, notes })` → appends `{ id, name, duration, notes }`.
  - `deleteWorkout(state, key, id)` → removes the matching workout.
  - `toggleVitamin(state, key, name)` → flips `days[key].vitamins[name]`.
  - `setGoals(state, goals)` → replaces `settings.goals` with numeric-coerced values.
  - `addVitamin(state, name)` → appends a trimmed name to `settings.vitamins` if not already present.
  - `removeVitamin(state, name)` → removes the name from `settings.vitamins`.

- [ ] **Step 1: Append the failing tests** (`tests/logic.test.js`)

Extend the `../js/logic.js` import list with `genId, setMacros, addWorkout, deleteWorkout, toggleVitamin, setGoals, addVitamin, removeVitamin`, then append:

```js
test('genId returns unique w_-prefixed ids', () => {
  const a = genId();
  const b = genId();
  assert(a.startsWith('w_'), 'should start with w_');
  assert(a !== b, 'ids should differ');
});

test('setMacros stores numeric values without mutating input', () => {
  const state = makeDefaultState();
  const next = setMacros(state, '2026-06-30', { calories: '1850', protein: 140, carbs: 180, fat: 55 });
  assertEqual(next.days['2026-06-30'].macros, { calories: 1850, protein: 140, carbs: 180, fat: 55 });
  assertEqual(state.days, {}); // original untouched
});

test('addWorkout appends an entry with an id and coerced duration', () => {
  const state = makeDefaultState();
  const next = addWorkout(state, '2026-06-30', { name: 'Push day', duration: '45', notes: 'felt strong' });
  const workouts = next.days['2026-06-30'].workouts;
  assertEqual(workouts.length, 1);
  assertEqual(workouts[0].name, 'Push day');
  assertEqual(workouts[0].duration, 45);
  assertEqual(workouts[0].notes, 'felt strong');
  assert(workouts[0].id.startsWith('w_'));
  assertEqual(state.days, {}); // original untouched
});

test('deleteWorkout removes the matching workout', () => {
  let state = addWorkout(makeDefaultState(), '2026-06-30', { name: 'Run', duration: 20, notes: '' });
  const id = state.days['2026-06-30'].workouts[0].id;
  const next = deleteWorkout(state, '2026-06-30', id);
  assertEqual(next.days['2026-06-30'].workouts, []);
});

test('toggleVitamin flips taken state', () => {
  const on = toggleVitamin(makeDefaultState(), '2026-06-30', 'Vitamin D');
  assertEqual(on.days['2026-06-30'].vitamins['Vitamin D'], true);
  const off = toggleVitamin(on, '2026-06-30', 'Vitamin D');
  assertEqual(off.days['2026-06-30'].vitamins['Vitamin D'], false);
});

test('setGoals replaces goals with numeric values', () => {
  const next = setGoals(makeDefaultState(), { calories: '2200', protein: '170', carbs: '210', fat: '70' });
  assertEqual(next.settings.goals, { calories: 2200, protein: 170, carbs: 210, fat: 70 });
});

test('addVitamin appends unique trimmed names', () => {
  let state = addVitamin(makeDefaultState(), '  Omega-3  ');
  state = addVitamin(state, 'Omega-3'); // duplicate ignored
  assertEqual(state.settings.vitamins, ['Omega-3']);
});

test('removeVitamin removes a name from the list', () => {
  let state = addVitamin(makeDefaultState(), 'Magnesium');
  state = removeVitamin(state, 'Magnesium');
  assertEqual(state.settings.vitamins, []);
});
```

- [ ] **Step 2: Run tests to verify they FAIL**

Refresh `http://localhost:8000/tests.html`.
Expected: 8 new failing rows (`genId is not a function`, etc.); prior tests green.

- [ ] **Step 3: Append the implementation** (`js/logic.js`)

Add to the end of `js/logic.js`:
```js
function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// Clone state and ensure days[key] exists as a fresh day object.
function withDay(state, key) {
  const next = structuredClone(state);
  if (!next.days) next.days = {};
  if (!next.days[key]) next.days[key] = emptyDay();
  return next;
}

export function genId() {
  return 'w_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function setMacros(state, key, macros) {
  const next = withDay(state, key);
  next.days[key].macros = {
    calories: num(macros.calories),
    protein: num(macros.protein),
    carbs: num(macros.carbs),
    fat: num(macros.fat)
  };
  return next;
}

export function addWorkout(state, key, { name, duration, notes }) {
  const next = withDay(state, key);
  next.days[key].workouts.push({
    id: genId(),
    name: String(name || '').trim(),
    duration: num(duration),
    notes: String(notes || '')
  });
  return next;
}

export function deleteWorkout(state, key, id) {
  const next = withDay(state, key);
  next.days[key].workouts = next.days[key].workouts.filter(w => w.id !== id);
  return next;
}

export function toggleVitamin(state, key, name) {
  const next = withDay(state, key);
  next.days[key].vitamins[name] = !next.days[key].vitamins[name];
  return next;
}

export function setGoals(state, goals) {
  const next = structuredClone(state);
  next.settings.goals = {
    calories: num(goals.calories),
    protein: num(goals.protein),
    carbs: num(goals.carbs),
    fat: num(goals.fat)
  };
  return next;
}

export function addVitamin(state, name) {
  const trimmed = String(name || '').trim();
  const next = structuredClone(state);
  if (trimmed && !next.settings.vitamins.includes(trimmed)) {
    next.settings.vitamins.push(trimmed);
  }
  return next;
}

export function removeVitamin(state, name) {
  const next = structuredClone(state);
  next.settings.vitamins = next.settings.vitamins.filter(v => v !== name);
  return next;
}
```

- [ ] **Step 4: Run tests to verify they PASS**

Refresh `http://localhost:8000/tests.html`.
Expected: 32 passed, 0 failed. **All pure logic is now covered.**

- [ ] **Step 5: Commit**

```bash
cd ~/Projects/fitlog
git add js/logic.js tests/logic.test.js
git commit -m "feat: add immutable state mutations (macros, workouts, vitamins, goals)"
```

---

### Task 6: Today screen + app shell, navigation, and state wiring

This is the first usable vertical slice: real `index.html`, styles, the render helper + Today screen, and `app.js` wiring state→handlers→render with bottom-tab navigation. Verified manually (DOM rendering is not unit-tested per the spec).

**Files:**
- Modify: `index.html` (full shell)
- Create: `styles.css`
- Create: `js/render.js`
- Create: `js/app.js`

**Interfaces:**
- Consumes: all of `js/logic.js` and `js/storage.js`.
- Produces (exports from `js/render.js`):
  - `el(tag, props, ...children)` → DOM node (hyperscript helper; `class`, `html`, `on*` handlers, attributes).
  - `renderToday(state, selectedKey, handlers)` → DOM node.
- `handlers` object passed by `app.js` (Today subset): `{ onMacros(key, macros), onAddWorkout(key, workout), onDeleteWorkout(key, id), onToggleVitamin(key, name), onPrevDay(), onNextDay() }`.

- [ ] **Step 1: Write the full app shell** (`index.html`) — replace entire file

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#2563eb">
  <title>FitLog</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header id="appbar"><h1>FitLog</h1></header>
  <main id="screen"></main>
  <nav id="tabs">
    <button data-tab="today" class="active" type="button">Today</button>
    <button data-tab="history" type="button">History</button>
    <button data-tab="settings" type="button">Settings</button>
  </nav>
  <script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write the stylesheet** (`styles.css`)

```css
:root {
  --bg: #0b1220;
  --card: #151c2c;
  --card-2: #1c2740;
  --text: #e7ecf5;
  --muted: #9aa7bd;
  --accent: #2563eb;
  --accent-2: #22c55e;
  --danger: #ef4444;
  --radius: 14px;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: var(--bg);
  color: var(--text);
  padding-bottom: 76px; /* room for fixed tab bar */
}

#appbar {
  position: sticky;
  top: 0;
  background: var(--bg);
  padding: 14px 16px calc(14px + env(safe-area-inset-top));
  border-bottom: 1px solid #1f2840;
  z-index: 5;
}
#appbar h1 { margin: 0; font-size: 20px; letter-spacing: 0.3px; }

#screen { padding: 16px; display: flex; flex-direction: column; gap: 16px; }

.card {
  background: var(--card);
  border-radius: var(--radius);
  padding: 16px;
}
.card h2 { margin: 0 0 12px; font-size: 16px; }
.card h2 .sub { color: var(--muted); font-weight: 400; font-size: 13px; }

.date-nav {
  display: flex; align-items: center; justify-content: space-between;
  background: var(--card); border-radius: var(--radius); padding: 10px 14px;
}
.date-nav button {
  background: var(--card-2); color: var(--text); border: 0;
  width: 40px; height: 40px; border-radius: 10px; font-size: 18px;
}
.date-nav .label { font-weight: 600; }

.macro-row { margin-bottom: 12px; }
.macro-row:last-child { margin-bottom: 0; }
.macro-row .top { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 6px; }
.macro-row .muted { color: var(--muted); }
.bar { height: 8px; background: var(--card-2); border-radius: 999px; overflow: hidden; }
.bar > span { display: block; height: 100%; background: var(--accent); border-radius: 999px; }
.bar.over > span { background: var(--accent-2); }

.row { display: flex; gap: 8px; }
.row > * { flex: 1; }

input, button, textarea {
  font: inherit;
}
input, textarea {
  width: 100%; background: var(--card-2); color: var(--text);
  border: 1px solid #2a3656; border-radius: 10px; padding: 10px 12px;
}
label { display: block; font-size: 13px; color: var(--muted); margin: 8px 0 4px; }

.btn {
  background: var(--accent); color: white; border: 0; border-radius: 10px;
  padding: 11px 14px; font-weight: 600;
}
.btn.secondary { background: var(--card-2); }
.btn.danger { background: transparent; color: var(--danger); padding: 6px 8px; }
.btn:active { opacity: 0.85; }

.list-item {
  display: flex; align-items: center; justify-content: space-between;
  background: var(--card-2); border-radius: 10px; padding: 10px 12px; margin-bottom: 8px;
}
.list-item:last-child { margin-bottom: 0; }
.list-item .meta { color: var(--muted); font-size: 13px; }
.empty { color: var(--muted); font-size: 14px; }

.vitamin {
  display: flex; align-items: center; gap: 12px;
  background: var(--card-2); border-radius: 10px; padding: 12px; margin-bottom: 8px;
}
.vitamin:last-child { margin-bottom: 0; }
.check {
  width: 24px; height: 24px; border-radius: 7px;
  border: 2px solid #3a4a72; display: grid; place-items: center; flex: 0 0 auto;
}
.vitamin.on .check { background: var(--accent-2); border-color: var(--accent-2); }
.vitamin.on .check::after { content: "✓"; color: #07210f; font-weight: 800; font-size: 15px; }

#tabs {
  position: fixed; bottom: 0; left: 0; right: 0;
  display: flex; background: #0e1626; border-top: 1px solid #1f2840;
  padding-bottom: env(safe-area-inset-bottom);
}
#tabs button {
  flex: 1; background: transparent; border: 0; color: var(--muted);
  padding: 14px 0; font-size: 13px; font-weight: 600;
}
#tabs button.active { color: var(--text); box-shadow: inset 0 2px 0 var(--accent); }

.summary-day { cursor: pointer; }
.summary-day .meta { display: flex; gap: 14px; margin-top: 4px; }
```

- [ ] **Step 3: Write the render helper + Today screen** (`js/render.js`)

```js
import {
  formatDateKey, getDay, goalPercent
} from './logic.js';

export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else {
      node.setAttribute(k, v);
    }
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
}

function macroRow(label, value, goal) {
  const pct = goalPercent(value, goal);
  const width = Math.min(pct, 100);
  return el('div', { class: 'macro-row' },
    el('div', { class: 'top' },
      el('span', {}, label),
      el('span', { class: 'muted' }, `${value} / ${goal} (${pct}%)`)
    ),
    el('div', { class: 'bar' + (pct >= 100 ? ' over' : '') },
      el('span', { style: `width:${width}%` })
    )
  );
}

function macrosCard(state, key, handlers) {
  const day = getDay(state, key);
  const m = day.macros;
  const g = state.settings.goals;
  const inputs = {};
  const field = (name, label) => {
    const input = el('input', { type: 'number', inputmode: 'numeric', value: m[name], min: '0' });
    inputs[name] = input;
    return el('div', {}, el('label', {}, label), input);
  };
  return el('section', { class: 'card' },
    el('h2', {}, 'Macros'),
    macroRow('Calories', m.calories, g.calories),
    macroRow('Protein (g)', m.protein, g.protein),
    macroRow('Carbs (g)', m.carbs, g.carbs),
    macroRow('Fat (g)', m.fat, g.fat),
    el('div', { class: 'row', style: 'margin-top:12px' },
      field('calories', 'Calories'),
      field('protein', 'Protein')
    ),
    el('div', { class: 'row' },
      field('carbs', 'Carbs'),
      field('fat', 'Fat')
    ),
    el('button', {
      class: 'btn', style: 'margin-top:12px; width:100%',
      onClick: () => handlers.onMacros(key, {
        calories: inputs.calories.value,
        protein: inputs.protein.value,
        carbs: inputs.carbs.value,
        fat: inputs.fat.value
      })
    }, 'Save macros')
  );
}

function workoutsCard(state, key, handlers) {
  const day = getDay(state, key);
  const nameI = el('input', { type: 'text', placeholder: 'e.g. Push day, Run' });
  const durI = el('input', { type: 'number', inputmode: 'numeric', placeholder: 'min', min: '0' });
  const notesI = el('input', { type: 'text', placeholder: 'Notes (optional)' });

  const items = day.workouts.length
    ? day.workouts.map(w => el('div', { class: 'list-item' },
        el('div', {},
          el('div', {}, w.name || 'Workout'),
          el('div', { class: 'meta' }, `${w.duration} min${w.notes ? ' · ' + w.notes : ''}`)
        ),
        el('button', { class: 'btn danger', onClick: () => handlers.onDeleteWorkout(key, w.id) }, 'Delete')
      ))
    : [el('p', { class: 'empty' }, 'No workouts logged.')];

  return el('section', { class: 'card' },
    el('h2', {}, 'Workouts'),
    ...items,
    el('div', { style: 'margin-top:12px' },
      el('label', {}, 'Add a workout'),
      nameI,
      el('div', { class: 'row', style: 'margin-top:8px' }, durI, notesI),
      el('button', {
        class: 'btn', style: 'margin-top:10px; width:100%',
        onClick: () => {
          if (!nameI.value.trim()) return;
          handlers.onAddWorkout(key, { name: nameI.value, duration: durI.value, notes: notesI.value });
        }
      }, 'Add workout')
    )
  );
}

function vitaminsCard(state, key, handlers) {
  const day = getDay(state, key);
  const names = state.settings.vitamins;
  if (!names.length) {
    return el('section', { class: 'card' },
      el('h2', {}, 'Vitamins'),
      el('p', { class: 'empty' }, 'No vitamins yet. Add some in Settings.')
    );
  }
  return el('section', { class: 'card' },
    el('h2', {}, 'Vitamins'),
    ...names.map(name => {
      const on = day.vitamins[name] === true;
      return el('div', {
        class: 'vitamin' + (on ? ' on' : ''),
        onClick: () => handlers.onToggleVitamin(key, name)
      }, el('div', { class: 'check' }), el('div', {}, name));
    })
  );
}

export function renderToday(state, selectedKey, handlers) {
  return el('div', {},
    el('div', { class: 'date-nav' },
      el('button', { type: 'button', onClick: handlers.onPrevDay }, '‹'),
      el('div', { class: 'label' }, formatDateKey(selectedKey)),
      el('button', { type: 'button', onClick: handlers.onNextDay }, '›')
    ),
    macrosCard(state, selectedKey, handlers),
    workoutsCard(state, selectedKey, handlers),
    vitaminsCard(state, selectedKey, handlers)
  );
}
```

- [ ] **Step 4: Write the bootstrap** (`js/app.js`)

```js
import { loadState, saveState } from './storage.js';
import {
  todayKey, stepDay,
  setMacros, addWorkout, deleteWorkout, toggleVitamin
} from './logic.js';
import { renderToday } from './render.js';

let state = loadState();
let selectedKey = todayKey();
let currentTab = 'today';

const screen = document.getElementById('screen');
const tabs = document.getElementById('tabs');

function commit(nextState) {
  state = nextState;
  saveState(state);
  render();
}

const handlers = {
  onPrevDay() { selectedKey = stepDay(selectedKey, -1); render(); },
  onNextDay() { selectedKey = stepDay(selectedKey, 1); render(); },
  onMacros(key, macros) { commit(setMacros(state, key, macros)); },
  onAddWorkout(key, workout) { commit(addWorkout(state, key, workout)); },
  onDeleteWorkout(key, id) { commit(deleteWorkout(state, key, id)); },
  onToggleVitamin(key, name) { commit(toggleVitamin(state, key, name)); }
};

function render() {
  screen.innerHTML = '';
  if (currentTab === 'today') {
    screen.append(renderToday(state, selectedKey, handlers));
  }
  for (const btn of tabs.querySelectorAll('button')) {
    btn.classList.toggle('active', btn.dataset.tab === currentTab);
  }
}

tabs.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-tab]');
  if (!btn) return;
  currentTab = btn.dataset.tab;
  if (currentTab === 'today') selectedKey = todayKey();
  render();
});

render();
```

- [ ] **Step 5: Manual verification**

With the server running, open `http://localhost:8000/` (use the browser device-toolbar / a phone-sized viewport).
Verify each:
1. The date nav shows today (e.g. `Tue, Jun 30`); `‹` / `›` move the date and the label updates.
2. Enter Calories 1850, Protein 140, Carbs 180, Fat 55 → tap **Save macros** → the four progress bars fill (Protein ≈ 93%, etc.).
3. Reload the page → the macro values persist (loaded from localStorage).
4. Add a workout (name "Push day", 45, "felt strong") → it appears in the list; **Delete** removes it.
5. Vitamins card shows "No vitamins yet. Add some in Settings." (expected — none configured).
6. Tapping **History** / **Settings** tabs highlights the tab but shows an empty screen (those render in later tasks); **Today** returns to today's date.

- [ ] **Step 6: Commit**

```bash
cd ~/Projects/fitlog
git add index.html styles.css js/render.js js/app.js
git commit -m "feat: Today screen with macros, workouts, vitamins and tab navigation"
```

---

### Task 7: History screen

**Files:**
- Modify: `js/render.js` (add `renderHistory`)
- Modify: `js/app.js` (render History tab; add `onOpenDay` handler)

**Interfaces:**
- Consumes: `listDays`, `daySummary`, `formatDateKey` from `js/logic.js`.
- Produces (export from `js/render.js`):
  - `renderHistory(state, handlers)` → DOM node.
- New handler used: `onOpenDay(key)` — switches to Today on that date.

- [ ] **Step 1: Add `renderHistory`** (`js/render.js`)

Add `listDays, daySummary` to the existing import from `./logic.js`, then append this export:
```js
export function renderHistory(state, handlers) {
  const keys = listDays(state);
  if (!keys.length) {
    return el('section', { class: 'card' },
      el('h2', {}, 'History'),
      el('p', { class: 'empty' }, 'No days logged yet. Add macros, a workout, or a vitamin on the Today tab.')
    );
  }
  return el('div', {},
    ...keys.map(key => {
      const s = daySummary(state, key);
      return el('section', { class: 'card summary-day', onClick: () => handlers.onOpenDay(key) },
        el('div', { style: 'font-weight:600' }, formatDateKey(key)),
        el('div', { class: 'meta' },
          el('span', {}, `${s.calories} kcal`),
          el('span', {}, `${s.workoutCount} workout${s.workoutCount === 1 ? '' : 's'}`),
          el('span', {}, `${s.vitaminsTaken}/${s.vitaminsTotal} vitamins`)
        )
      );
    })
  );
}
```

- [ ] **Step 2: Wire the History tab** (`js/app.js`)

Add `renderHistory` to the import from `./render.js`. Add this handler to the `handlers` object:
```js
  onOpenDay(key) { selectedKey = key; currentTab = 'today'; render(); },
```
In `render()`, add a branch after the `today` branch:
```js
  } else if (currentTab === 'history') {
    screen.append(renderHistory(state, handlers));
  }
```
(Change the existing `if (currentTab === 'today') { ... }` close so the `else if` chains onto it.)

- [ ] **Step 3: Manual verification**

Refresh `http://localhost:8000/`.
1. With at least one day logged (from Task 6), tap **History** → a card lists that day with `kcal / workouts / vitamins` summary.
2. Use `‹` on Today to go back a day, log something, return to History → both days appear, newest first.
3. Tap a history card → it opens that date on the Today tab with the right values.
4. Clear all data (you can run `localStorage.clear()` in the console, then reload) → History shows the empty-state message.

- [ ] **Step 4: Commit**

```bash
cd ~/Projects/fitlog
git add js/render.js js/app.js
git commit -m "feat: History screen summarizing logged days"
```

---

### Task 8: Settings screen — goals, vitamin list, export/import

**Files:**
- Modify: `js/render.js` (add `renderSettings`)
- Modify: `js/app.js` (render Settings tab; add goals/vitamin/export/import handlers)

**Interfaces:**
- Consumes: `setGoals`, `addVitamin`, `removeVitamin` (logic); `serialize`, `parseState` (storage).
- Produces (export from `js/render.js`):
  - `renderSettings(state, handlers)` → DOM node.
- New handlers: `onSetGoals(goals)`, `onAddVitamin(name)`, `onRemoveVitamin(name)`, `onExport()`, `onImport(file)`.

- [ ] **Step 1: Add `renderSettings`** (`js/render.js`)

Append this export (no new logic imports needed):
```js
export function renderSettings(state, handlers) {
  const g = state.settings.goals;
  const gi = {};
  const goalField = (name, label) => {
    const input = el('input', { type: 'number', inputmode: 'numeric', value: g[name], min: '0' });
    gi[name] = input;
    return el('div', {}, el('label', {}, label), input);
  };

  const newVit = el('input', { type: 'text', placeholder: 'e.g. Vitamin D' });

  const vitaminList = state.settings.vitamins.length
    ? state.settings.vitamins.map(name => el('div', { class: 'list-item' },
        el('span', {}, name),
        el('button', { class: 'btn danger', onClick: () => handlers.onRemoveVitamin(name) }, 'Remove')
      ))
    : [el('p', { class: 'empty' }, 'No vitamins yet.')];

  const importInput = el('input', {
    type: 'file', accept: 'application/json,.json',
    onChange: (e) => { if (e.target.files[0]) handlers.onImport(e.target.files[0]); }
  });

  return el('div', {},
    el('section', { class: 'card' },
      el('h2', {}, 'Daily goals'),
      el('div', { class: 'row' }, goalField('calories', 'Calories'), goalField('protein', 'Protein')),
      el('div', { class: 'row' }, goalField('carbs', 'Carbs'), goalField('fat', 'Fat')),
      el('button', {
        class: 'btn', style: 'margin-top:12px; width:100%',
        onClick: () => handlers.onSetGoals({
          calories: gi.calories.value, protein: gi.protein.value, carbs: gi.carbs.value, fat: gi.fat.value
        })
      }, 'Save goals')
    ),
    el('section', { class: 'card' },
      el('h2', {}, 'Vitamins'),
      ...vitaminList,
      el('div', { class: 'row', style: 'margin-top:12px' },
        newVit,
        el('button', {
          class: 'btn', style: 'flex:0 0 auto',
          onClick: () => { if (newVit.value.trim()) handlers.onAddVitamin(newVit.value); }
        }, 'Add')
      )
    ),
    el('section', { class: 'card' },
      el('h2', {}, 'Backup'),
      el('button', { class: 'btn secondary', style: 'width:100%; margin-bottom:10px', onClick: handlers.onExport }, 'Export data (JSON)'),
      el('label', {}, 'Import data (replaces everything)'),
      importInput
    )
  );
}
```

- [ ] **Step 2: Wire the Settings tab and backup glue** (`js/app.js`)

Add `renderSettings` to the `./render.js` import. Add `setGoals, addVitamin, removeVitamin` to the `./logic.js` import. Add `serialize, parseState, saveState` — `saveState` is already imported; add `serialize, parseState` to the `./storage.js` import.

Add these handlers to the `handlers` object:
```js
  onSetGoals(goals) { commit(setGoals(state, goals)); },
  onAddVitamin(name) { commit(addVitamin(state, name)); },
  onRemoveVitamin(name) { commit(removeVitamin(state, name)); },
  onExport() {
    const blob = new Blob([serialize(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fitlog-backup-${todayKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },
  onImport(file) {
    const reader = new FileReader();
    reader.onload = () => {
      const imported = parseState(reader.result);
      if (confirm('Replace all current data with the imported file?')) {
        commit(imported);
      }
    };
    reader.readAsText(file);
  }
```
Add the Settings branch in `render()`:
```js
  } else if (currentTab === 'settings') {
    screen.append(renderSettings(state, handlers));
  }
```

- [ ] **Step 3: Manual verification**

Refresh `http://localhost:8000/`.
1. **Settings → Daily goals:** change Protein to 170, Save → go to Today, the Protein bar now uses 170 as the denominator.
2. **Vitamins:** add "Vitamin D" and "Omega-3" → both listed; go to Today → the Vitamins card shows them and toggles persist across reload; **Remove** one in Settings → it disappears from Today.
3. **Export:** tap Export → a `fitlog-backup-YYYY-MM-DD.json` file downloads; open it and confirm it contains your settings + days.
4. **Import:** run `localStorage.clear()` in the console and reload (data gone) → Settings → Import → choose the exported file → confirm dialog → data returns.

- [ ] **Step 4: Commit**

```bash
cd ~/Projects/fitlog
git add js/render.js js/app.js
git commit -m "feat: Settings screen with goals, vitamin list, and JSON export/import"
```

---

### Task 9: PWA — icons, manifest, service worker, install

Makes the app installable and offline-capable.

**Files:**
- Create: `tools/make_icons.py`
- Create: `icons/icon-192.png`, `icons/icon-512.png`, `icons/icon-maskable-512.png`, `icons/apple-touch-icon-180.png` (generated)
- Create: `manifest.json`
- Create: `service-worker.js`
- Modify: `index.html` (link manifest, apple-touch-icon, apple meta)
- Modify: `js/app.js` (register service worker)

**Interfaces:**
- Consumes: nothing new in JS. `service-worker.js` precaches the app shell.
- Produces: an installable, offline PWA.

- [ ] **Step 1: Write the pure-stdlib icon generator** (`tools/make_icons.py`)

```python
#!/usr/bin/env python3
"""Generate FitLog PNG icons with no third-party dependencies (stdlib only)."""
import struct
import zlib
import os

BG = (37, 99, 235)      # blue
FG = (255, 255, 255)    # white plus

def write_png(path, size, pixels):
    """pixels: bytearray of size*size*3 RGB bytes."""
    def chunk(tag, data):
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xffffffff)
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)  # 8-bit RGB
    raw = bytearray()
    for y in range(size):
        raw.append(0)  # filter type 0 (none)
        start = y * size * 3
        raw.extend(pixels[start:start + size * 3])
    idat = zlib.compress(bytes(raw), 9)
    with open(path, "wb") as f:
        f.write(sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b""))

def make_icon(size, inset_frac):
    """Solid background with a centered white plus. inset_frac keeps the plus
    inside a safe zone (use a larger inset for maskable icons)."""
    px = bytearray(size * size * 3)
    # arm thickness and extent of the plus
    half_thick = int(size * 0.09)
    margin = int(size * inset_frac)
    lo, hi = margin, size - margin
    cx = size // 2
    for y in range(size):
        for x in range(size):
            in_v = (cx - half_thick <= x <= cx + half_thick) and (lo <= y <= hi)
            in_h = (cx - half_thick <= y <= cx + half_thick) and (lo <= x <= hi)
            r, g, b = FG if (in_v or in_h) else BG
            i = (y * size + x) * 3
            px[i], px[i + 1], px[i + 2] = r, g, b
    return px

def main():
    here = os.path.dirname(os.path.abspath(__file__))
    out = os.path.join(here, "..", "icons")
    os.makedirs(out, exist_ok=True)
    write_png(os.path.join(out, "icon-192.png"), 192, make_icon(192, 0.22))
    write_png(os.path.join(out, "icon-512.png"), 512, make_icon(512, 0.22))
    write_png(os.path.join(out, "apple-touch-icon-180.png"), 180, make_icon(180, 0.22))
    # maskable: larger inset so the glyph stays within the ~80% safe zone
    write_png(os.path.join(out, "icon-maskable-512.png"), 512, make_icon(512, 0.30))
    print("Icons written to", os.path.normpath(out))

if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Generate the icons**

Run:
```bash
cd ~/Projects/fitlog && python3 tools/make_icons.py
```
Expected: `Icons written to .../fitlog/icons`. Open `http://localhost:8000/icons/icon-512.png` in the browser — you should see a white **+** on a blue square.

- [ ] **Step 3: Write the manifest** (`manifest.json`)

```json
{
  "name": "FitLog",
  "short_name": "FitLog",
  "description": "Track daily macros, workouts, and vitamins.",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "background_color": "#0b1220",
  "theme_color": "#2563eb",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

- [ ] **Step 4: Write the service worker** (`service-worker.js`)

```js
const CACHE = 'fitlog-v1';
const SHELL = [
  './',
  'index.html',
  'styles.css',
  'manifest.json',
  'js/app.js',
  'js/logic.js',
  'js/storage.js',
  'js/render.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon-180.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  // Navigations: network-first so updates show, fall back to cached shell offline.
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('index.html')));
    return;
  }
  // Other assets: cache-first, fall back to network.
  event.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
```

- [ ] **Step 5: Link manifest + icons and register the service worker**

In `index.html` `<head>`, after the `theme-color` meta, add:
```html
  <link rel="manifest" href="manifest.json">
  <link rel="apple-touch-icon" href="icons/apple-touch-icon-180.png">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
```
At the **end** of `js/app.js`, append:
```js
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  });
}
```

- [ ] **Step 6: Manual verification**

Refresh `http://localhost:8000/` (a hard refresh: hold Shift while reloading).
1. Open DevTools → **Application → Manifest**: name "FitLog", no icon errors, all three icons listed.
2. **Application → Service Workers**: `service-worker.js` is "activated and running".
3. **Offline test:** in DevTools Network, set **Offline**, then reload → the app still loads and your data is intact.
4. **Install (desktop Chrome):** an install icon appears in the address bar; installing opens FitLog in its own window.

- [ ] **Step 7: Commit**

```bash
cd ~/Projects/fitlog
git add tools/make_icons.py icons/ manifest.json service-worker.js index.html js/app.js
git commit -m "feat: make FitLog an installable, offline PWA"
```

---

### Task 10: Deploy to GitHub Pages (run on your phone)

Publishes the static folder over HTTPS so it's installable on a phone. **Requires your GitHub account**, so you (the user) run the auth/push steps — they are listed for you to execute via `! <command>` or your own terminal.

**Files:**
- Create: `.nojekyll` (so GitHub Pages serves files literally)
- Create: `README.md` (run/deploy notes)

**Interfaces:** none (deployment only).

- [ ] **Step 1: Add `.nojekyll` and a README**

Create `.nojekyll` (empty file):
```bash
touch ~/Projects/fitlog/.nojekyll
```
Create `README.md`:
```markdown
# FitLog

A phone-first PWA to track daily macros, workouts, and vitamins. No build step, no backend — data is stored on-device.

## Run locally
```
python3 -m http.server 8000
```
Then open http://localhost:8000

## Tests
Open http://localhost:8000/tests.html (pure-logic suite).

## Deploy
Static site — host the repo root on GitHub Pages (main branch, `/root`).
```

- [ ] **Step 2: Commit the deploy files**

```bash
cd ~/Projects/fitlog
git add .nojekyll README.md
git commit -m "chore: add GitHub Pages config and README"
```

- [ ] **Step 3: Create the GitHub repo and push** (your action)

If you have the GitHub CLI:
```bash
cd ~/Projects/fitlog
gh repo create fitlog --public --source=. --push
```
Otherwise create an empty `fitlog` repo on github.com, then:
```bash
cd ~/Projects/fitlog
git remote add origin https://github.com/<your-username>/fitlog.git
git push -u origin main
```

- [ ] **Step 4: Enable Pages**

On GitHub: repo → **Settings → Pages** → Source: **Deploy from a branch** → Branch: **main**, folder **/ (root)** → Save. Wait ~1 minute; the URL appears as `https://<your-username>.github.io/fitlog/`.

- [ ] **Step 5: Install on your phone**

Open the Pages URL on your phone:
- **iOS Safari:** Share → **Add to Home Screen**.
- **Android Chrome:** menu → **Install app** / **Add to Home screen**.
Launch from the home screen → it opens full-screen, works offline, and stores data on that device.

- [ ] **Step 6: Verify deployment**

Confirm the live URL loads, you can log macros/a workout/a vitamin, and (airplane mode) it still opens. Done.

---

## Self-Review

**Spec coverage:**
- Phone-first installable PWA, offline, on-device → Tasks 6, 9. ✓
- Macro daily totals vs. goals with progress bars → Task 6 (macros card), goals denominator from Task 8. ✓
- Workouts name/duration/notes, add + delete → Task 6. ✓
- Vitamins daily checklist from a user-defined list → Task 6 (toggle) + Task 8 (manage list). ✓
- Today screen with date stepping → Task 6. ✓
- History list of days with summary, tap to open → Task 7. ✓
- Settings: goals, vitamin list, export/import → Task 8. ✓
- Data model `fitlog:v1`, day-keyed → Tasks 2–5. ✓
- In-browser tests for pure logic; manual UI checklist → Tasks 1–5 (tests), 6–9 (manual). ✓
- Local serving + GitHub Pages hosting → Task 1 (server), Task 10 (Pages). ✓
- Non-goals (accounts, sync, food DB, sets/reps, charts, notifications) → none introduced. ✓

**Placeholder scan:** No TBD/TODO/"handle edge cases" — every code step contains complete code. ✓

**Type consistency:** `handlers` method names (`onMacros`, `onAddWorkout`, `onDeleteWorkout`, `onToggleVitamin`, `onPrevDay`, `onNextDay`, `onOpenDay`, `onSetGoals`, `onAddVitamin`, `onRemoveVitamin`, `onExport`, `onImport`) are consistent between `render.js` producers and `app.js` consumers. Logic signatures used in render/app match Tasks 3–5 exports. `makeDefaultState`/`parseState`/`serialize`/`loadState`/`saveState` usage matches Task 2. ✓
