/**
 * ═══════════════════════════════════════════════════════
 * SIDEBAR.JS — 3-Level Hierarchical Navigation
 * Handles expand/collapse, status dots, and active state.
 * ═══════════════════════════════════════════════════════
 */

import appState from './state.js';

// ─── DOM References ───
let navButtons = [];

/**
 * Initialize sidebar interactions.
 */
export function initSidebar() {
  navButtons = document.querySelectorAll('[data-nav-toggle]');

  navButtons.forEach(btn => {
    btn.addEventListener('click', handleToggle);
  });

  // Update status dots from state
  updateStatusDots();

  // Subscribe to state changes
  appState.subscribe(() => {
    updateStatusDots();
    updateSafeToSpendPill();
  });

  // Initial safe-to-spend update
  updateSafeToSpendPill();
}

/**
 * Handle expand/collapse of a nav group.
 */
function handleToggle(e) {
  const btn = e.currentTarget;
  const targetId = btn.getAttribute('data-nav-toggle');
  const childrenEl = document.getElementById(targetId);
  const chevron = btn.querySelector('.nav-chevron');
  const navGroup = btn.closest('.nav-group');

  if (!childrenEl) return;

  const isExpanded = btn.getAttribute('aria-expanded') === 'true';

  if (isExpanded) {
    // Collapse
    childrenEl.style.maxHeight = childrenEl.scrollHeight + 'px';
    // Force reflow
    childrenEl.offsetHeight;
    childrenEl.style.maxHeight = '0px';
    childrenEl.style.overflow = 'hidden';
    childrenEl.style.opacity = '0';

    setTimeout(() => {
      childrenEl.classList.add('hidden');
      childrenEl.style.maxHeight = '';
      childrenEl.style.overflow = '';
      childrenEl.style.opacity = '';
    }, 200);

    btn.setAttribute('aria-expanded', 'false');
    if (navGroup) navGroup.setAttribute('aria-expanded', 'false');
    if (chevron) {
      chevron.classList.remove('nav-chevron-expanded');
      chevron.classList.add('-rotate-90');
    }
  } else {
    // Expand
    childrenEl.classList.remove('hidden');
    childrenEl.style.maxHeight = '0px';
    childrenEl.style.overflow = 'hidden';
    childrenEl.style.opacity = '0';
    // Force reflow
    childrenEl.offsetHeight;
    childrenEl.style.maxHeight = childrenEl.scrollHeight + 'px';
    childrenEl.style.opacity = '1';
    childrenEl.style.transition = 'max-height 0.2s ease, opacity 0.2s ease';

    setTimeout(() => {
      childrenEl.style.maxHeight = '';
      childrenEl.style.overflow = '';
      childrenEl.style.transition = '';
    }, 200);

    btn.setAttribute('aria-expanded', 'true');
    if (navGroup) navGroup.setAttribute('aria-expanded', 'true');
    if (chevron) {
      chevron.classList.add('nav-chevron-expanded');
      chevron.classList.remove('-rotate-90');
    }
  }
}

/**
 * Update color-coded status dots in the sidebar based on category budget status.
 */
function updateStatusDots() {
  const categories = appState.categories;
  const statusMap = {};

  categories.forEach(cat => {
    const status = appState.getCategoryStatus(cat);
    statusMap[cat.name.toLowerCase()] = status;
  });

  // Map sidebar items to category statuses
  const navItems = document.querySelectorAll('.nav-children a[role="treeitem"]');
  navItems.forEach(item => {
    const dot = item.querySelector('span[class*="rounded-full"]');
    const label = item.querySelector('span:last-child');
    if (!dot || !label) return;

    const name = label.textContent.trim().toLowerCase();

    // Find matching category
    let status = 'safe';
    for (const cat of categories) {
      if (cat.name.toLowerCase().includes(name) || name.includes(cat.name.toLowerCase().split(' ')[0])) {
        status = appState.getCategoryStatus(cat);
        break;
      }
    }

    // Update dot color
    dot.className = dot.className.replace(/bg-vault-(green|yellow|red|muted)/g, '');
    switch (status) {
      case 'danger':
        dot.classList.add('bg-vault-red');
        dot.setAttribute('aria-label', 'Budget status: overage');
        break;
      case 'warning':
        dot.classList.add('bg-vault-yellow');
        dot.setAttribute('aria-label', 'Budget status: nearing limit');
        break;
      default:
        dot.classList.add('bg-vault-green');
        dot.setAttribute('aria-label', 'Budget status: safe');
    }
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
