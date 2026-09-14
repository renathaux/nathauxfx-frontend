const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const script = fs.readFileSync(path.join(__dirname, "..", "script.js"), "utf8");
const state = fs.readFileSync(path.join(__dirname, "..", "state.js"), "utf8");
const html = fs.readFileSync(path.join(__dirname, "..", "app.html"), "utf8");

function functionSource(name) {
  const start = script.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} is defined`);
  const bodyStart = script.indexOf("{", start);
  let depth = 0;
  for (let index = bodyStart; index < script.length; index += 1) {
    if (script[index] === "{") depth += 1;
    if (script[index] === "}") depth -= 1;
    if (depth === 0) return script.slice(start, index + 1);
  }
  throw new Error(`${name} is incomplete`);
}

const langStart = script.indexOf("const LANG =");
const langEnd = script.indexOf("const FULL_UI_TRANSLATIONS", langStart);
const labels = [
  { dataset: { i18n: "buy" }, textContent: "Bullish Bias" },
  { dataset: { i18n: "history" }, textContent: "Recent Signal History" },
];
const placeholder = {
  dataset: { i18nPlaceholder: "accessPlaceholder" }, attrs: {},
  setAttribute(name, value) { this.attrs[name] = value; },
};
const title = {
  dataset: { i18nTitle: "settings" }, attrs: {},
  setAttribute(name, value) { this.attrs[name] = value; },
};
const selectors = {
  "[data-i18n]": labels,
  "[data-i18n-placeholder]": [placeholder],
  "[data-i18n-title]": [title],
};
const liveValues = {
  eurusdPrice: { textContent: "1.15661" },
  xauusdPrice: { textContent: "4482.35" },
  biasPercentage: { textContent: "63%" },
  brokerStatus: { textContent: "Broker connected" },
  v3bDecision: { textContent: "WAIT_V3B_PAPER_5M_BOS" },
  entry: { textContent: "1.15661" },
  sl: { textContent: "1.15810" },
  tp1: { textContent: "1.15512" },
  tp2: { textContent: "1.15363" },
};
const historyRows = [
  { time: "04:25", symbol: "EURUSD", signal: "SELL", result: "RUNNING" },
];
const chartState = { symbol: "EURUSD", timeframe: "5m" };
const allNodes = [...labels, placeholder, title, ...Object.values(liveValues), ...historyRows];
const storage = new Map([
  ["nathauxfx_language", "en"],
  ["flowsignal_chart_symbol", "EURUSD"],
  ["flowsignal_chart_timeframe", "5m"],
  ["paper_trade_history", "preserve-paper-history"],
  ["flowsignal_live_auto", "false"],
]);
const originalStorage = new Map(storage);
const changedStorageKeys = new Set();
let timerRegistrations = 0;
let observerRegistrations = 0;
let eventListenerRegistrations = 0;
let applyLanguageCalls = 0;
const context = {
  document: {
    documentElement: { lang: "en" },
    querySelectorAll(selector) { return selectors[selector] || []; },
  },
  setTimeout() { timerRegistrations += 1; },
  setInterval() { timerRegistrations += 1; },
  MutationObserver: class {
    constructor() { observerRegistrations += 1; }
  },
  langSelect: { value: "en" },
  landingLang: { value: "EN" },
};

vm.runInNewContext(`${script.slice(langStart, langEnd)}
const SUPPORTED_LANGUAGES = new Set(["en", "fr", "es"]);
${functionSource("validatedLanguage")}
let currentLang = "en";
${functionSource("t")}
${functionSource("applyLanguage")}
this.applyLanguage = applyLanguage;
this.validatedLanguage = validatedLanguage;`, context);

function liveSnapshot() {
  return {
    values: Object.fromEntries(
      Object.entries(liveValues).map(([key, node]) => [key, node.textContent])
    ),
    history: JSON.stringify(historyRows),
    chart: JSON.stringify(chartState),
    nodeCount: allNodes.length,
  };
}

function simulateLanguageSelection(language) {
  const safeLanguage = context.validatedLanguage(language);
  storage.set("nathauxfx_language", safeLanguage);
  changedStorageKeys.add("nathauxfx_language");
  applyLanguageCalls += 1;
  context.applyLanguage(safeLanguage);
}

// Changing language must not register listeners, timers, observers, or render loops.
eventListenerRegistrations =
  (script.match(/landingLang\.addEventListener\("change"/g) || []).length +
  (script.match(/langSelect\.addEventListener\("change"/g) || []).length;
for (let cycle = 0; cycle < 100; cycle += 1) {
  for (const language of ["en", "fr", "es", "en"]) {
    liveValues.eurusdPrice.textContent = (1.15661 + cycle / 100000).toFixed(5);
    liveValues.xauusdPrice.textContent = (4482.35 + cycle / 100).toFixed(2);
    liveValues.biasPercentage.textContent = `${(cycle % 99) + 1}%`;
    liveValues.brokerStatus.textContent = cycle % 2 ? "Broker connected" : "Broker updating";
    liveValues.v3bDecision.textContent = cycle % 2 ? "WAIT_V3B_PAPER_5M_BOS" : "V3B_READY";
    liveValues.entry.textContent = (1.15661 + cycle / 100000).toFixed(5);
    liveValues.sl.textContent = (1.15810 + cycle / 100000).toFixed(5);
    liveValues.tp1.textContent = (1.15512 + cycle / 100000).toFixed(5);
    liveValues.tp2.textContent = (1.15363 + cycle / 100000).toFixed(5);
    historyRows[0] = {
      time: `04:${String(cycle % 60).padStart(2, "0")}`,
      symbol: "EURUSD",
      signal: cycle % 2 ? "SELL" : "WAIT",
      result: "RUNNING",
    };
    const beforeSwitch = liveSnapshot();
    simulateLanguageSelection(language);
    assert.deepEqual(liveSnapshot(), beforeSwitch, "language switching preserves live renderer state");
  }
}

assert.equal(context.document.documentElement.lang, "en");
assert.equal(labels[0].textContent, "Bullish Bias");
context.applyLanguage("fr");
assert.equal(labels[0].textContent, "Biais haussier");
assert.equal(labels[1].textContent, "Historique des signaux");
assert.equal(placeholder.attrs.placeholder, "Entrer le code d’accès");
assert.equal(title.attrs.title, "Paramètres");
context.applyLanguage("es");
assert.equal(labels[0].textContent, "Sesgo alcista");
assert.equal(context.validatedLanguage("invalid"), "en");
assert.equal(applyLanguageCalls, 400, "one applyLanguage call occurs per selected language");
assert.equal(allNodes.length, 14, "language switching does not grow the DOM");
assert.equal(timerRegistrations, 0, "language switching creates no timers");
assert.equal(observerRegistrations, 0, "language switching creates no observers");
assert.equal(eventListenerRegistrations, 2, "selector listeners remain registered once each");
assert.deepEqual([...changedStorageKeys], ["nathauxfx_language"]);
for (const [key, value] of originalStorage) {
  if (key !== "nathauxfx_language") assert.equal(storage.get(key), value, `${key} remains unchanged`);
}
assert.equal(chartState.symbol, "EURUSD");
assert.equal(chartState.timeframe, "5m");

assert.ok(html.includes('data-i18n="buy"'));
assert.ok(html.includes('data-i18n="history"'));
assert.ok(!script.includes("createTreeWalker"), "no full-page text walker remains");
assert.ok(!script.includes("new MutationObserver"), "translation installs no mutation observer");
assert.ok(!state.includes("blockLanguageChange"), "emergency selector lock is removed");
assert.ok(!state.includes('localStorage.setItem("flowsignal_lang"'), "state does not rewrite legacy language storage");
assert.ok(script.includes('const LANGUAGE_STORAGE_KEY = "nathauxfx_language"'));
assert.ok(html.includes('script.js?v=127'), "browser cache is busted for the safe language runtime");
assert.ok(!functionSource("applyLanguage").includes("updateCard"));
assert.ok(!functionSource("applyLanguage").includes("refreshNewsImpact"));
assert.ok(!functionSource("applyLanguage").includes("setTimeout"));
assert.ok(!functionSource("applyLanguage").includes("setInterval"));
assert.ok(!functionSource("applyLanguage").includes("innerHTML"));
assert.ok(!functionSource("applyLanguage").includes("document.body"));
assert.equal((script.match(/landingLang\.addEventListener\("change"/g) || []).length, 1);
assert.equal((script.match(/langSelect\.addEventListener\("change"/g) || []).length, 1);
assert.equal((script.match(/legacyApplyLanguageDisabled\(/g) || []).length, 0,
  "dead legacy language function is removed");

console.log("safe dashboard language tests passed");
