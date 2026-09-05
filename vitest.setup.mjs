// Vitest setup — runs once per test file, inside the configured environment.
//
// WHY THIS FILE EXISTS: Node 26 ships a native, experimental `localStorage` /
// `sessionStorage` global. It is an own getter on globalThis that resolves to
// `internal/webstorage` and returns `undefined` unless the process was started
// with `--localstorage-file`. Vitest's jsdom environment populates globals from
// its jsdom window but does NOT overwrite globals Node already defined, so
// jsdom's real Storage never lands and every `localStorage.*` call throws
//   TypeError: Cannot read properties of undefined (reading 'clear')
// even though `environment: "jsdom"` is correctly configured and `window`
// exists. (Verified on Node 26.5 / Vitest 4.1 / jsdom 29: a standalone
// `new JSDOM(...)` has a working Storage, while the global does not.)
//
// The fix: build one throwaway JSDOM per test file and install ITS Storage
// objects over Node's getter. defineProperty is unconditional on purpose — it
// costs nothing on a Node version without native webstorage, and it keeps the
// suite working on whatever Node the CI runner happens to use.
//
// A fresh JSDOM per test file also means each file gets its own isolated
// storage, so a stray write can't leak across files.
import { JSDOM } from "jsdom";

const { window: storageWindow } = new JSDOM("", { url: "http://localhost:3000" });

for (const key of ["localStorage", "sessionStorage"]) {
  Object.defineProperty(globalThis, key, {
    value: storageWindow[key],
    configurable: true,
    writable: true,
  });
}
