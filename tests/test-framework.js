const results = [];

export function test(name, fn) {
  try {
    fn();
    results.push({ name, pass: true });
  } catch (e) {
    results.push({ name, pass: false, error: e && e.message ? e.message : String(e) });
  }
}

export function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

export function assertEqual(actual, expected, msg) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error((msg ? msg + ': ' : '') + `expected ${e}, got ${a}`);
}

export function summary() {
  const passed = results.filter(r => r.pass).length;
  return { passed, failed: results.length - passed, failures: results.filter(r => !r.pass) };
}

export function renderResults(root) {
  const passed = results.filter(r => r.pass).length;
  const failed = results.length - passed;
  const summary = document.createElement('h2');
  summary.textContent = `${passed} passed, ${failed} failed`;
  summary.style.color = failed ? '#c0392b' : '#27ae60';
  root.append(summary);
  const ul = document.createElement('ul');
  for (const r of results) {
    const li = document.createElement('li');
    li.style.color = r.pass ? '#27ae60' : '#c0392b';
    li.textContent = (r.pass ? 'PASS ' : 'FAIL ') + r.name + (r.error ? ' — ' + r.error : '');
    ul.append(li);
  }
  root.append(ul);
}
