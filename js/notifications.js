/**
 * ═══════════════════════════════════════════════════════
 * NOTIFICATIONS.JS — Toast (Desktop) & Banner (Mobile)
 * Proactive overage alerting system.
 * ═══════════════════════════════════════════════════════
 */

import appState from './state.js';

const TOAST_DURATION = 5000; // 5 seconds

/**
 * Initialize notification system.
 */
export function initNotifications() {
  // Show any existing undismissed notifications on load
  showPendingNotifications();

  // Listen for new notifications from state changes
  appState.subscribe(() => {
    showPendingNotifications();
  });
}

/**
 * Display all pending (undismissed) notifications.
 */
function showPendingNotifications() {
  const notifications = appState.notifications.filter(n => !n.dismissed);

  notifications.forEach(notif => {
    if (notif.type === 'overage') {
      if (isDesktop()) {
        showToast(notif);
      }
      // Mobile banner is always visible in HTML — we just update content
      updateMobileBanner(notif);
    }
  });
}

/**
 * Check if viewport is desktop-sized.
 */
function isDesktop() {
  return window.innerWidth >= 768;
}

// ─── Desktop Toast ───

export function showToast(notifOrMsg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const notifId = typeof notifOrMsg === 'object' ? notifOrMsg.id : `toast_${Date.now()}`;
  const message = typeof notifOrMsg === 'object' ? notifOrMsg.message : notifOrMsg;
  const isError = type === 'error' || type === 'warning' || (typeof notifOrMsg === 'object' && notifOrMsg.type === 'overage');

  // Don't duplicate if a toast for this notif already exists
  if (container.querySelector(`[data-notif-id="${notifId}"]`)) return;

  const toast = document.createElement('div');
  toast.setAttribute('data-notif-id', notifId);
  toast.className = `
    toast-enter pointer-events-auto
    flex items-start gap-3 p-4 max-w-sm
    bg-vault-surface border ${isError ? 'border-vault-red/30' : 'border-emerald-400/30'}
    rounded-xl shadow-lg
  `;

  toast.innerHTML = `
    <div class="w-8 h-8 rounded-lg ${isError ? 'bg-vault-red/15' : 'bg-emerald-400/15'} flex items-center justify-center shrink-0 mt-0.5">
      <i data-lucide="${isError ? 'alert-triangle' : 'check-circle-2'}" class="w-4 h-4 ${isError ? 'text-vault-red' : 'text-emerald-400'}"></i>
    </div>
    <div class="flex-1 min-w-0">
      <p class="text-xs font-bold ${isError ? 'text-vault-red' : 'text-emerald-400'} uppercase tracking-wide">${isError ? 'Notice' : 'Success'}</p>
      <p class="text-xs text-vault-muted mt-1">${message}</p>
    </div>
    <button type="button" class="shrink-0 p-1 text-vault-muted hover:text-vault-red transition-colors" aria-label="Dismiss notification">
      <i data-lucide="x" class="w-4 h-4"></i>
    </button>
  `;

  container.appendChild(toast);

  // Initialize lucide icons in the newly added element
  if (window.lucide) {
    window.lucide.createIcons({ nodes: [toast] });
  }

  // Close button
  const closeBtn = toast.querySelector('button');
  closeBtn?.addEventListener('click', () => {
    dismissToast(toast, notifId);
  });

  // Auto-dismiss
  setTimeout(() => {
    dismissToast(toast, notifId);
  }, TOAST_DURATION);
}

function dismissToast(toastEl, notifId) {
  if (!toastEl || !toastEl.parentNode) return;

  toastEl.classList.remove('toast-enter');
  toastEl.classList.add('toast-exit');

  appState.dismissNotification(notifId);

  setTimeout(() => {
    toastEl.remove();
  }, 300);
}

// ─── Mobile Banner ───

function updateMobileBanner(notif) {
  const banner = document.getElementById('mobile-alert-banner');
  if (!banner) return;

  const messageEl = banner.querySelector('p.truncate, p:last-child');
  if (messageEl) {
    messageEl.textContent = notif.message;
  }

  // Add dismiss handler
  const dismissBtn = banner.querySelector('button');
  if (dismissBtn && !dismissBtn.hasAttribute('data-listener-attached')) {
    dismissBtn.setAttribute('data-listener-attached', 'true');
    dismissBtn.addEventListener('click', () => {
      appState.dismissNotification(notif.id);
      banner.style.display = 'none';
    });
  }

  // Show the banner with animation
  banner.classList.add('banner-enter');
}

export default { initNotifications };
