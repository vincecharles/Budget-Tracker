/**
 * ═══════════════════════════════════════════════════════
 * APP.JS — Main Entry Point & Module Orchestrator
 * Initializes all modules on DOMContentLoaded.
 * ═══════════════════════════════════════════════════════
 */

import { initSidebar } from './sidebar.js';
import { initMobile } from './mobile.js';
import { initCharts } from './charts.js';
import { initNotifications } from './notifications.js';
import { initForms } from './forms.js';
import { initRender } from './render.js';

/**
 * Boot sequence — order matters for dependency resolution.
 */
function boot() {
  console.log('%c[VaultLedger]%c Initializing...', 'color: #00e676; font-weight: bold', 'color: inherit');

  // 1. Initialize Lucide icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // 2. Sidebar navigation (desktop + mobile drawer content)
  initSidebar();

  // 3. Mobile-specific interactions (hamburger, drawer, FAB)
  initMobile();

  // 4. Chart.js spending chart + category progress bars
  initCharts();

  // 5. Form validation for Quick Transaction modal
  initForms();

  // 6. DOM rendering (hero, transactions, mobile sections)
  initRender();

  // 7. Notification system (toasts + banners) — last, so DOM is ready
  initNotifications();

  console.log('%c[VaultLedger]%c Ready.', 'color: #00e676; font-weight: bold', 'color: inherit');
}

// ─── Launch ───

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
