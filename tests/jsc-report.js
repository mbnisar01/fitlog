import { summary } from './test-framework.js';

const s = summary();
for (const f of s.failures) print('FAIL ' + f.name + (f.error ? ' — ' + f.error : ''));
print('RESULT: ' + s.passed + ' passed, ' + s.failed + ' failed');
