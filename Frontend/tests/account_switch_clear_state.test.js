const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const script = fs.readFileSync(path.join(__dirname, '../script.js'), 'utf8');
const start = script.indexOf('async function setActiveBrokerAccount(');
const end = script.indexOf('\nfunction openBrokerAccountsModal(', start);
assert.ok(start >= 0 && end > start);
const rendered = {cards: {}};
let releaseStatus;
let reachedStatus;
const statusReached = new Promise(resolve => { reachedStatus = resolve; });
const runtime = {
  window: {dispatchEvent() {}}, CustomEvent: function () {},
  CSS: {escape: value => value},
  brokerAccountActionInProgress: false,
  accountSelectionGeneration: 0,
  lastGoodBrokerAccountsData: null,
  liveConnectionState: {account_id: '47784297'},
  brokerAccountList: null,
  setActiveCtraderAccountBtn: null,
  lastGoodPanelData: {EURUSD: {signal: 'BUY'}},
  latestRawPanelData: {EURUSD: {signal: 'BUY'}},
  latestPanelData: {EURUSD: {signal: 'BUY'}},
  latestPanelMeta: {},
  frozenCandlesCache: null,
  frozenChart: {},
  lastChartData: {},
  activeLiveOrders: {EURUSD: {position_id: 'old-A'}},
  liveTradeHistory: [{position_id: 'old-A'}],
  liveTradeStats: {daily_total_pl: 100},
  liveAutoStatusBySymbol: {EURUSD: {signal: 'BUY'}},
  autoTradeStatus: {signal: 'BUY'},
  livePrices: {EURUSD: 1.1},
  twoMonthChartHistory: {},
  twoMonthChartHistoryRequests: {},
  candleSeries: {setData() {}},
  currentChartSymbol: 'EURUSD',
  setBrokerStatusMessage() {}, updateBrokerAccountActionState() {},
  postBrokerAccountAction: async () => ({ok: true}),
  updateCard(symbol, data) {rendered.cards[symbol] = data.signal;},
  updateMainPanel(symbol) {rendered.main = [symbol, runtime.latestPanelData?.[symbol]?.signal];},
  updateLivePanel(orders, history) {rendered.live = [Object.keys(orders).length, history.length];},
  renderDashboardPerformance() {rendered.pl = runtime.liveTradeStats.daily_total_pl;},
  renderAutoTradeStatus() {rendered.auto = runtime.liveAutoStatusBySymbol.EURUSD || null;},
  fetchCtraderStatus() {
    reachedStatus();
    return new Promise(resolve => {releaseStatus = resolve;});
  },
  loadBrokerAccounts: async () => null,
  refreshPanel: async () => false,
};
vm.runInNewContext(script.slice(start, end), runtime);

(async () => {
  const switching = runtime.setActiveBrokerAccount('47810571');
  await statusReached;
  assert.deepEqual(rendered.cards, {EURUSD: 'WAIT', XAUUSD: 'WAIT'});
  assert.deepEqual(rendered.main, ['EURUSD', 'WAIT'], 'previous V3B plan is replaced while B loads');
  assert.deepEqual(rendered.live, [0, 0], 'previous positions and history are cleared');
  assert.equal(rendered.pl, 0, 'previous account P&L is cleared');
  assert.equal(rendered.auto, null, 'previous account auto-status is cleared');
  releaseStatus(null);
  await switching;
  console.log('account-switch display clearing regression passed');
})().catch(error => {console.error(error); process.exitCode = 1;});
