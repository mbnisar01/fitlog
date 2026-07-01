import { loadState, saveState } from './storage.js';
import {
  todayKey, stepDay,
  setMacros, addWorkout, deleteWorkout, toggleVitamin
} from './logic.js';
import { renderToday, renderHistory } from './render.js';

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
  onToggleVitamin(key, name) { commit(toggleVitamin(state, key, name)); },
  onOpenDay(key) { selectedKey = key; currentTab = 'today'; render(); }
};

function render() {
  screen.innerHTML = '';
  if (currentTab === 'today') {
    screen.append(renderToday(state, selectedKey, handlers));
  } else if (currentTab === 'history') {
    screen.append(renderHistory(state, handlers));
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
