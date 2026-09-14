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
const context = {
  document: {
    documentElement: { lang: "en" },
    querySelectorAll(selector) { return selectors[selector] || []; },
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

for (let index = 0; index < 20; index += 1) {
  for (const language of ["en", "fr", "es", "en"]) context.applyLanguage(language);
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

assert.ok(html.includes('data-i18n="buy"'));
assert.ok(html.includes('data-i18n="history"'));
assert.ok(!script.includes("createTreeWalker"), "no full-page text walker remains");
assert.ok(!script.includes("new MutationObserver"), "translation installs no mutation observer");
assert.ok(!state.includes("blockLanguageChange"), "emergency selector lock is removed");
assert.ok(!state.includes('localStorage.setItem("flowsignal_lang"'), "state does not rewrite legacy language storage");
assert.ok(script.includes('const LANGUAGE_STORAGE_KEY = "nathauxfx_language"'));
assert.ok(html.includes('script.js?v=126'), "browser cache is busted for the safe language runtime");
assert.ok(!functionSource("applyLanguage").includes("updateCard"));
assert.ok(!functionSource("applyLanguage").includes("refreshNewsImpact"));

console.log("safe dashboard language tests passed");
