/**
 * ═══════════════════════════════════════════════════════
 * SIDEBAR.JS — Sidebar State & Safe-to-Spend Pill
 * Handles status dots and the safe-to-spend display.
 * Navigation is now handled by router.js.
 * ═══════════════════════════════════════════════════════
 */

import appState from './state.js';

/**
 * Initialize sidebar interactions.
 */
export function initSidebar() {
  // Update safe-to-spend pill
  updateSafeToSpendPill();

  // Subscribe to state changes
  appState.subscribe(() => {
    updateSafeToSpendPill();
  });
}

/**
 * Update the "Safe to Spend" pill in the sidebar.
 */
function updateSafeToSpendPill() {
  const el = document.getElementById('sidebar-safe-to-spend');
  if (el) {
    const amount = appState.safeToSpend;
    el.textContent = `Safe to Spend: ₱${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
}

export default { initSidebar };
