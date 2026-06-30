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
