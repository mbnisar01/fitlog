import { loadState, saveState, serialize, parseState } from './storage.js';
import {
  todayKey, stepDay,
  setMacros, addWorkout, deleteWorkout, toggleVitamin,
  setGoals, addVitamin, removeVitamin
} from './logic.js';
import { renderToday, renderHistory, renderSettings } from './render.js';

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
  onOpenDay(key) { selectedKey = key; currentTab = 'today'; render(); },
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
};

function render() {
  screen.innerHTML = '';
  if (currentTab === 'today') {
    screen.append(renderToday(state, selectedKey, handlers));
  } else if (currentTab === 'history') {
    screen.append(renderHistory(state, handlers));
  } else if (currentTab === 'settings') {
    screen.append(renderSettings(state, handlers));
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

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  });
}
