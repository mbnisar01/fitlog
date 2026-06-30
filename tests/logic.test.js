import { test, assert, assertEqual } from './test-framework.js';
import { makeDefaultState } from '../js/storage.js';
import {
  todayKey, formatDateKey, stepDay, emptyDay, getDay, hasData, goalPercent, daySummary, listDays, genId, setMacros, addWorkout, deleteWorkout, toggleVitamin, setGoals, addVitamin, removeVitamin
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
