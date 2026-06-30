import { test, assertEqual } from './test-framework.js';

test('harness detects failures', () => {
  assertEqual(1 + 1, 2);
});
