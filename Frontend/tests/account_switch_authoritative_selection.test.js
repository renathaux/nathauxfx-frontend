const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const script = fs.readFileSync(path.join(__dirname, '../script.js'), 'utf8');
const start = script.indexOf('async function setActiveBrokerAccount(');
const end = script.indexOf('\nfunction openBrokerAccountsModal(', start);
assert.ok(start >= 0 && end > start);

let postCount = 0;
const runtime = {
  alert() {},
  CSS: {escape: value => value},
  window: {dispatchEvent() {}},
  CustomEvent: function () {},
  brokerAccountActionInProgress: false,
  accountSelectionGeneration: 0,
  lastGoodBrokerAccountsData: {active_account_id: null},
  // Connection status can briefly know the new account before durable
  // selection has been saved. That must not suppress Set Active.
  liveConnectionState: {account_id: '48869794'},
  brokerAccountList: null,
  setActiveCtraderAccountBtn: null,
  getSelectedBrokerAccountId: () => '',
  setBrokerStatusMessage() {},
  updateBrokerAccountActionState() {},
  postBrokerAccountAction: async () => {
    postCount += 1;
    return {ok: false, reason: 'test stop after POST'};
  },
  refreshPanel: async () => false,
};

vm.runInNewContext(script.slice(start, end), runtime);

(async () => {
  await runtime.setActiveBrokerAccount('48869794');
  assert.equal(
    postCount,
    1,
    'Set Active must POST when durable account selection is empty even if connection status reports the same account'
  );
  console.log('account-switch authoritative selection regression passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
