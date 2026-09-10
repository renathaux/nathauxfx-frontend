(() => {
  const backend = "https://api.nathauxfx.com";
  const status = document.querySelector("#lab-status");
  const summary = document.querySelector("#summary");
  const rows = document.querySelector("#trades");
  const endInput = document.querySelector("#end");
  endInput.value = new Date().toISOString().slice(0, 10);
  const metrics = [
    ["Trades", "total_simulated_trades"], ["Full wins", "full_tp2_wins"],
    ["Protected wins", "protected_wins"], ["Losses", "losses"],
    ["Win rate", "win_rate", "%"], ["Total R", "total_r", "R"],
    ["Max drawdown", "max_drawdown_r", "R"],
  ];
  const price = value => Number.isFinite(Number(value)) ? Number(value).toFixed(5) : "—";
  document.querySelector("#run-replay").addEventListener("click", async () => {
    status.textContent = "Running deterministic replay…";
    rows.innerHTML = '<tr><td colspan="9">Loading…</td></tr>';
    try {
      const response = await fetch(`${backend}/strategy-lab/replay`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: document.querySelector("#symbol").value,
          strategy: document.querySelector("#strategy").value,
          start: `${document.querySelector("#start").value}T00:00:00Z`,
          end: `${endInput.value}T23:59:59Z`,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Replay failed");
      summary.innerHTML = metrics.map(([label, key, suffix=""]) =>
        `<div class="metric"><span>${label}</span><strong>${data.summary[key]}${suffix}</strong></div>`).join("");
      rows.innerHTML = data.trades.length ? data.trades.map(trade => `<tr>
        <td>${new Date(trade.entry_timestamp).toLocaleString()}</td><td>${trade.event_type}</td>
        <td>${trade.side}</td><td>${price(trade.entry)}</td><td>${price(trade.sl)}</td>
        <td>${price(trade.tp1)}</td><td>${price(trade.tp2)}</td><td>${trade.result}</td>
        <td>${trade.r_result == null ? "—" : Number(trade.r_result).toFixed(2)}</td></tr>`).join("")
        : '<tr><td colspan="9">No simulated trades in this range.</td></tr>';
      status.textContent = `${data.candle_counts["15m"]} M15 and ${data.candle_counts["5m"]} M5 candles replayed. No broker execution.`;
    } catch (error) {
      status.textContent = error.message;
      rows.innerHTML = '<tr><td colspan="9">Replay unavailable.</td></tr>';
    }
  });
})();
