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
