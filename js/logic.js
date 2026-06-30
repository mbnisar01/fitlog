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
