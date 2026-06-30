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
