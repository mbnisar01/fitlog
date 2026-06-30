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
