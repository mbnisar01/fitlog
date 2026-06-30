import { test, assert, assertEqual } from './test-framework.js';
import { makeDefaultState } from '../js/storage.js';
import {
  todayKey, formatDateKey, stepDay, emptyDay, getDay, hasData, goalPercent, daySummary, listDays
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
