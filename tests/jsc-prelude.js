// JavaScriptCore (jsc) has no structuredClone, which js/logic.js relies on.
// A JSON round-trip is a correct deep clone here because app state is pure JSON
// (no Dates, functions, or cycles). Browsers use their native structuredClone.
globalThis.structuredClone = globalThis.structuredClone || ((x) => JSON.parse(JSON.stringify(x)));
