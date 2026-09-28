(function(root) {
  'use strict';
  const esc = value => String(value ?? '--').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function authorityDisplay(status = {}) {
    const display = status.live_strategy_display || {};
    const authority = display.execution_authority || status.execution_authority || {};
    const source = String(authority.source || display.execution_source || '').toUpperCase();
    if (source === 'V3B') return null;
    const evaluation = display.evaluation || display;
    if (source === 'STRATEGY_STUDIO') return {...display, ...evaluation, execution_source:source,
      strategy_id:authority.strategy_id || display.strategy_id,
      strategy_name:authority.strategy_name || display.strategy_name || 'Strategy Studio',
      conditions:Array.isArray(evaluation.conditions) ? evaluation.conditions : [{key:'evaluation',label:'Live evaluation unavailable',state:'ERROR'}]};
    const reason = source === 'NONE' ? 'NO_LIVE_STRATEGY_FOR_SYMBOL' : 'LIVE_AUTHORITY_UNAVAILABLE';
    return {...display, execution_source:source || 'UNAVAILABLE', signal:'WAIT', execution_ready:false,
      strategy_name:source === 'NONE' ? 'NO LIVE STRATEGY ASSIGNED' : 'LIVE STRATEGY UNAVAILABLE',
      reason, execution_block_reason:reason, conditions:[{key:'entry_authority',label:'Auto entry',state:'BLOCKED',reason}]};
  }
  function managementView(trade = {}) {
    const m = trade.trade_management || {};
    const state = String(m.protection_state || 'NOT_REQUESTED').toUpperCase();
    const confirmedSl = m.broker_confirmed_sl;
    const confirmed = state === 'CONFIRMED' && confirmedSl != null && Number.isFinite(Number(confirmedSl)) && Number(confirmedSl) > 0;
    return {...m, confirmed, protection_state:state === 'CONFIRMED' && !confirmed ? 'PENDING' : state,
      owner:m.execution_source === 'STRATEGY_STUDIO' ? (m.strategy_name || 'Strategy Studio') : 'MANUAL / LEGACY POSITION',
      mode:m.execution_source === 'STRATEGY_STUDIO' ? 'STRATEGY STUDIO LIVE' : (m.management_mode || trade.management_mode || 'Ownership unverified'),
      tp1_state:String(m.tp1_state || 'NOT_HIT').replaceAll('_',' ')};
  }
  function managementMarkup(trade) {
    const m = managementView(trade);
    const rows = [['Strategy',m.owner],['Management',m.mode],['Strategy ID',m.strategy_id],['Execution source',m.execution_source],['Entry',m.entry],['Initial SL',m.initial_sl],['TP1 price',m.tp1],['TP2 price',m.tp2],['TP1',m.tp1_state],
      ['TP1 partial requested',m.tp1_partial_close_requested],['TP1 partial confirmed',m.tp1_partial_close_confirmed],['Protection requested',m.protection_requested],['Risk',m.risk ?? trade.risk],['R progress',m.r_progress ?? trade.r_progress],['TP1 trigger %',m.tp1_trigger_percent],['TP1 partial close %',m.tp1_partial_close_percent],['Protection method',m.protection_method],['Trigger method',m.protection_trigger_method],['Protection ladder',m.protection_ladder],
      ['Protection',m.protection_state],['Ladder step',m.protection_step_index],['Trigger %',m.protection_trigger_percent],
      ['Secure %',m.protection_secure_percent],['Next trigger',m.next_protection_trigger],['Target protected SL',m.target_protected_sl],
      ['Broker actual SL',m.broker_sl ?? trade.current_sl ?? trade.sl],['Broker confirmed SL',m.broker_confirmed_sl],
      ['Management status',m.management_status],['Management error',m.management_error]];
    return `<div class="live-management-state">${rows.filter(([,v])=>v!==undefined&&v!==null&&v!=='').map(([k,v])=>`<div>${esc(k)}: <b>${esc(typeof v==='object'?JSON.stringify(v):v)}</b></div>`).join('')}</div>`;
  }
  const api = {authorityDisplay,managementView,managementMarkup};
  if(typeof module !== 'undefined' && module.exports) module.exports=api;
  if(root) root.NathauxLiveAuthority=api;
})(typeof window !== 'undefined' ? window : null);
