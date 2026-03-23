/**
 * ═══════════════════════════════════════════════════════
 * RENDER.JS — DOM Rendering Helpers
 * Pure render functions for dashboard cards and sections.
 * ═══════════════════════════════════════════════════════
 */

import appState from './state.js';

/**
 * Initialize all render subscriptions.
 */
export function initRender() {
  // Initial render
  renderAll();

  // Subscribe to state changes
  appState.subscribe(() => renderAll());
}

function renderAll() {
  renderHeroCard();
  renderTransactionLog();
  renderMobileBudgetHealth();
  renderRecentActivity();
}

// ─── Hero Card (Safe to Spend) ───

function renderHeroCard() {
  // Desktop hero
  const heroAmount = document.getElementById('hero-amount');
  if (heroAmount) {
    const safe = appState.safeToSpend;
    const formatted = safe.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const [dollars, cents] = formatted.split('.');
    heroAmount.innerHTML = `₱${dollars}<span class="text-vault-muted">.${cents}</span>`;
  }

  // Mobile hero
  const mobileHeroAmount = document.getElementById('mobile-hero-amount');
  if (mobileHeroAmount) {
    const safe = appState.safeToSpend;
    mobileHeroAmount.textContent = `₱${safe.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
}

// ─── Transaction Log ───

function renderTransactionLog() {
  const container = document.getElementById('transaction-log');
  if (!container) return;

  const transactions = appState.transactions.slice(0, 6); // Show latest 6

  container.innerHTML = transactions.map((txn, index) => {
    const isExpense = txn.type === 'expense';
    const amountColor = isExpense ? 'text-vault-red' : 'text-vault-green';
    const amountPrefix = isExpense ? '-₱' : '+₱';
    const absAmount = Math.abs(txn.amount).toLocaleString('en-US', { minimumFractionDigits: 2 });

    // Check if we should show overage alert after this transaction
    const showOverageAlert = index === 0 && appState.overageCategories.length > 0;

    let html = `
      <div class="transaction-row">
        <div class="w-9 h-9 rounded-xl ${isExpense ? 'bg-vault-red/10' : 'bg-vault-green/10'} flex items-center justify-center shrink-0">
          <i data-lucide="${txn.icon || (isExpense ? 'arrow-down-left' : 'arrow-up-right')}" class="w-4 h-4 ${isExpense ? 'text-vault-red' : 'text-vault-green'}"></i>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-vault-text truncate">${escapeHtml(txn.description)}</p>
          <p class="text-[11px] text-vault-muted mt-0.5">${escapeHtml(txn.subtitle || '')}</p>
        </div>
        <span class="text-sm font-semibold ${amountColor}">
          ${amountPrefix}${absAmount}
        </span>
      </div>
    `;

    // Inline overage alert
    if (showOverageAlert) {
      const overCat = appState.overageCategories[0];
      html += `
        <div class="overage-alert-inline my-2" role="alert">
          <div class="w-7 h-7 rounded-lg bg-vault-yellow/15 flex items-center justify-center shrink-0">
            <i data-lucide="alert-triangle" class="w-3.5 h-3.5 text-vault-yellow"></i>
          </div>
          <div>
            <p class="text-[11px] font-bold text-vault-yellow">Budget Threshold Reached</p>
            <p class="text-[10px] text-vault-muted">You've exceeded your ${escapeHtml(overCat.name)} budget.</p>
          </div>
        </div>
      `;
    }

    return html;
  }).join('');

  // Re-initialize Lucide icons in rendered content
  if (window.lucide) {
    window.lucide.createIcons({ nodes: [container] });
  }
}

// ─── Mobile: Budget Health ───

function renderMobileBudgetHealth() {
  const container = document.getElementById('mobile-budget-health');
  if (!container) return;

  const categories = appState.categories.slice(0, 4);

  container.innerHTML = categories.map(cat => {
    const status = appState.getCategoryStatus(cat);
    const dotColor = status === 'danger' ? 'bg-vault-red' :
                     status === 'warning' ? 'bg-vault-yellow' : 'bg-vault-green';

    return `
      <div class="budget-health-item">
        <div class="flex items-center gap-2.5">
          <span class="w-2 h-2 rounded-full ${dotColor} shrink-0"></span>
          <span class="text-sm text-vault-text">${escapeHtml(cat.name)}</span>
        </div>
        <span class="text-xs text-vault-muted font-medium">
          ₱${cat.spent.toLocaleString('en-US', { minimumFractionDigits: 0 })}
          <span class="text-vault-muted/50">/ ₱${cat.budgeted.toLocaleString('en-US', { minimumFractionDigits: 0 })}</span>
        </span>
      </div>
    `;
  }).join('');
}

// ─── Mobile: Recent Activity ───

function renderRecentActivity() {
  const container = document.getElementById('recent-activity-list');
  if (!container) return;

  const recentTxns = appState.transactions.slice(0, 4);

  container.innerHTML = recentTxns.map(txn => {
    const isExpense = txn.type === 'expense';
    const dotColor = isExpense ? 'bg-vault-red' : 'bg-vault-green';
    const amountColor = isExpense ? 'text-vault-red' : 'text-vault-green';
    const amountPrefix = isExpense ? '-₱' : '+₱';
    const absAmount = Math.abs(txn.amount).toLocaleString('en-US', { minimumFractionDigits: 2 });

    // Format relative time
    const timeAgo = getRelativeTime(txn.date);

    return `
      <div class="activity-item">
        <span class="w-2 h-2 rounded-full ${dotColor} shrink-0"></span>
        <div class="flex-1 min-w-0">
          <p class="text-sm text-vault-text truncate">${escapeHtml(txn.description)}</p>
          <p class="text-[10px] text-vault-muted mt-0.5">${timeAgo}</p>
        </div>
        <span class="text-xs font-semibold ${amountColor}">${amountPrefix}${absAmount}</span>
      </div>
    `;
  }).join('');
}

// ─── Utilities ───

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getRelativeTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  if (diffDays === 1) return `Yesterday, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default { initRender };
