import {
  formatDateKey, getDay, goalPercent, listDays, daySummary
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
