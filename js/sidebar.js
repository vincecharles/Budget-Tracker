/**
 * ═══════════════════════════════════════════════════════
 * SIDEBAR.JS — Sidebar State & Safe-to-Spend Pill
 * ═══════════════════════════════════════════════════════
 */

import appState from './state.js';

export function initSidebar() {
  updateSafeToSpendPill();
  appState.subscribe(() => updateSafeToSpendPill());
}

function updateSafeToSpendPill() {
  const el = document.getElementById('sidebar-safe-to-spend');
  if (el) {
    const amount = appState.safeToSpend;
    el.textContent = `Safe to Spend: ₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
}

export default { initSidebar };
