const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const mobile = fs.readFileSync(path.join(root, 'mobile.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.html'), 'utf8');
const startup = fs.readFileSync(path.join(root, 'startup.js'), 'utf8');
const mobileNav = fs.readFileSync(path.join(root, 'mobileNav.js'), 'utf8');

test('mobile menu app panels use authenticated /app route instead of public landing index', () => {
  const targets = [
    'menuAssistantBtn', 'menuPaperBtn', 'menuFeedbackBtn', 'menuStatsBtn',
    'menuGeneralSettingsBtn', 'menuRiskSettingsBtn', 'menuBrokerAccountsBtn',
    'menuNotificationsSettingsBtn', 'menuStrategySettingsBtn'
  ];
  for (const target of targets) {
    assert.match(mobile, new RegExp(`href="\\/app\\?desktop=1&from=mobile&open=${target}"`));
  }
  assert.doesNotMatch(mobile, /index\.html\?desktop=1&open=/);
});

test('mobile history stays on native mobile dashboard', () => {
  assert.match(mobile, /href="mobile\.html\?panel=history"/);
  assert.match(mobileNav, /requestedPanel/);
  assert.match(mobileNav, /actions\[requestedPanel\]\(\)/);
});

test('mobile app panel route hides the stacked desktop dashboard underneath the modal', () => {
  assert.match(app, /flowsignal-mobile-panel-route/);
  assert.match(app, /#landingPage,[\s\S]*#mainApp[\s\S]*display:\s*none\s*!important/);
});

test('closing a mobile-routed desktop modal returns to mobile dashboard', () => {
  assert.match(startup, /mobilePanelModalMap/);
  assert.match(startup, /MutationObserver/);
  assert.match(startup, /\/mobile\.html\?from=panel/);
  assert.match(startup, /menuPaperBtn:\s*"paperModal"/);
  assert.match(startup, /menuBrokerAccountsBtn:\s*"brokerAccountsModal"/);
});
