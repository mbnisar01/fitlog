#!/bin/sh
# Headless test runner (macOS JavaScriptCore). Runs every tests/*.test.js through
# the shared framework and prints "RESULT: N passed, M failed". Exits non-zero on
# any failure, if no test files are found, or if a jsc/syntax error suppresses the
# RESULT line.
JSC="/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc"
cd "$(dirname "$0")"
files=""
for f in *.test.js; do
  [ -e "$f" ] && files="$files $f"
done
# Guard: an empty suite must never report success.
[ -z "$files" ] && { echo "No test files found in $(pwd)"; exit 1; }
# $files is intentionally unquoted to word-split into separate jsc arguments
# (filenames here are simple, no spaces).
out=$("$JSC" -m jsc-prelude.js $files jsc-report.js 2>&1)
echo "$out"
# Require at least one passing test and zero failures — `[1-9][0-9]*` rejects the
# "0 passed, 0 failed" false-green that "[0-9]+" would have accepted.
echo "$out" | grep -qE 'RESULT: [1-9][0-9]* passed, 0 failed'
