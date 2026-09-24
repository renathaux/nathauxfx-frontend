/* Display-only projections of completed results. Never used for execution. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.StrategySimulatorPresentation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const resolved = (rows) => (rows || []).filter((t) => t.resolved === true);
  function summarize(key, rows) {
    const r = rows
      .filter((t) => t.r != null && Number.isFinite(Number(t.r)))
      .map((t) => Number(t.r));
    return {
      key,
      trades: rows.length,
      net: rows.reduce((sum, t) => sum + Number(t.pnl_dollars || 0), 0),
      winRate: rows.length
        ? (rows.filter((t) => Number(t.pnl_dollars) > 0).length / rows.length) *
          100
        : null,
      averageR: r.length ? r.reduce((a, b) => a + b, 0) / r.length : null,
    };
  }
  function breakdowns(trades) {
    const rows = resolved(trades),
      years = new Map();
    for (const t of rows) {
      const stamp = new Date(t.exit_time || t.entry_time);
      const year = Number.isNaN(stamp.getTime())
        ? 'Unknown'
        : String(stamp.getUTCFullYear());
      if (!years.has(year)) years.set(year, []);
      years.get(year).push(t);
    }
    return {
      years: [...years.keys()].sort().map((y) => summarize(y, years.get(y))),
      directions: ['BUY', 'SELL'].map((s) =>
        summarize(
          s,
          rows.filter((t) => t.side === s),
        ),
      ),
    };
  }
  function filterTrades(trades, filter) {
    if (filter === 'All') return trades || [];
    return resolved(trades).filter((t) =>
      filter === 'Winners'
        ? Number(t.pnl_dollars) > 0
        : filter === 'Losses'
          ? Number(t.pnl_dollars) < 0
          : t.outcome === (filter === 'Protected SL' ? 'PROTECTED_SL' : filter),
    );
  }
  function drawdownCurve(curve) {
    let peak = -Infinity;
    return (curve || []).map((row) => {
      peak = Math.max(peak, Number(row.balance));
      return { ...row, balance: Number(row.balance) - peak };
    });
  }
  return { breakdowns, filterTrades, drawdownCurve };
});
