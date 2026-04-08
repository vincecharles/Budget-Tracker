/**
 * ═══════════════════════════════════════════════════════
 * APP.JS — Main Entry Point & Module Orchestrator
 * Initializes all modules on DOMContentLoaded.
 * ═══════════════════════════════════════════════════════
 */

import { initAuth } from './auth.js';
import { initRouter } from './router.js';
import { initSidebar } from './sidebar.js';
import { initMobile } from './mobile.js';
import { initCharts } from './charts.js';
import { initNotifications } from './notifications.js';
import { initForms } from './forms.js';
import { initRender } from './render.js';
import appState from './state.js';

/**
 * Full app initialization — called only after successful auth.
 */
function bootApp() {
  console.log('%c[VaultLedger]%c Booting app modules...', 'color: #00e676; font-weight: bold', 'color: inherit');

  // Sync with cloud
  appState.init();

  // 1. Initialize Lucide icons (for app layout)
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // 2. Router — must come before sidebar so active state is set
  initRouter();

  // 3. Sidebar navigation
  initSidebar();

  // 4. Mobile-specific interactions (hamburger, drawer, FAB)
  initMobile();

  // 5. Chart.js spending chart + category progress bars
  initCharts();

  // 6. Form validation for Quick Transaction modal
  initForms();

  // 7. DOM rendering (hero, transactions, mobile sections)
  initRender();

  // 8. Notification system (toasts + banners) — last, so DOM is ready
  initNotifications();

  console.log('%c[VaultLedger]%c Ready.', 'color: #00e676; font-weight: bold', 'color: inherit');
}

/**
 * Boot sequence — auth first, then app if authenticated.
 */
function boot() {
  console.log('%c[VaultLedger]%c Initializing...', 'color: #00e676; font-weight: bold', 'color: inherit');

  // 1. Initialize Lucide icons (for login page)
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // 2. Auth check — shows login or app layout
  const isAuthenticated = initAuth();

  // 3. If already logged in, boot the full app immediately
  if (isAuthenticated) {
    bootApp();
  }

  // 4. Listen for auth success event (login form submit)
  window.addEventListener('vault:authenticated', () => {
    bootApp();
  });
}

// ─── Launch ───

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
