#!/bin/sh
# Headless test runner (macOS JavaScriptCore). Runs every tests/*.test.js through
# the shared framework and prints "RESULT: N passed, M failed". Exits non-zero on
# any failure, or if a jsc/syntax error suppresses the RESULT line.
JSC="/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc"
cd "$(dirname "$0")"
files=""
for f in *.test.js; do
  [ -e "$f" ] && files="$files $f"
done
out=$("$JSC" -m jsc-prelude.js $files jsc-report.js 2>&1)
echo "$out"
echo "$out" | grep -qE 'RESULT: [0-9]+ passed, 0 failed'
