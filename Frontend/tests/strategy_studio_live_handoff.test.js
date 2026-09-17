const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const frontend = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(frontend, 'strategy-studio.html'), 'utf8');
const studio = fs.readFileSync(path.join(frontend, 'strategy-studio/strategy-studio.js'), 'utf8');
const api = fs.readFileSync(path.join(frontend, 'strategy-studio/strategy-studio-api.js'), 'utf8');
const dashboard = fs.readFileSync(path.join(frontend, 'script.js'), 'utf8');

assert.match(html, /id="studioLiveReadiness"/, 'Strategy Studio needs a LIVE readiness banner');
assert.match(html, /id="goLiveStrategyBtn"/, 'Strategy Studio needs an explicit Go Live control');
assert.match(api, /\/strategy-studio\/live-status/, 'Strategy Studio API must read backend LIVE status');
assert.match(api, /\/strategy-studio\/live-handoff/, 'Strategy Studio API must use the dedicated LIVE handoff endpoint');
assert.doesNotMatch(api, /live-auto-toggle/, 'Strategy Studio must never mutate the existing LIVE Auto setting');

assert.match(studio, /Simulator ready — LIVE still uses current V3B/);
assert.match(studio, /Parity verified — Go Live requires confirmation/);
assert.match(studio, /Go Live with this Strategy\?/);
assert.match(studio, /current\?\.locked|current\.locked/, 'open Studio-managed positions must lock destructive/edit actions');
assert.match(studio, /live_handoff_enabled/, 'UI must render the durable handoff state');

const start = dashboard.indexOf('async function setActiveBrokerAccount(');
const end = dashboard.indexOf('\nfunction openBrokerAccountsModal(', start);
assert.ok(start >= 0 && end > start, 'account switch function must exist');
const switchSource = dashboard.slice(start, end);
assert.match(switchSource, /confirmation_required/, 'account switch must honor backend Studio confirmation requirement');
assert.match(switchSource, /result\.warning/, 'account switch warning must come from backend');
assert.match(switchSource, /confirmed:\s*true/, 'confirmed switch must explicitly resubmit confirmed=true');

console.log('Strategy Studio LIVE handoff frontend contract passed');
