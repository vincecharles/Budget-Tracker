/**
 * ═══════════════════════════════════════════════════════
 * RENDER.JS — DOM Rendering with Empty State Support
 * ═══════════════════════════════════════════════════════
 */

import appState from './state.js';

export function initRender() {
  renderAll();
  appState.subscribe(() => renderAll());
}

function renderAll() {
  renderHeroCard();
  renderTransactionLog();
  renderMobileBudgetHealth();
  renderRecentActivity();
  renderUserGreeting();
}

// ─── User Greeting ───

function renderUserGreeting() {
  const el = document.getElementById('user-greeting');
  if (el && appState.user.name) {
    el.textContent = `Hi, ${appState.user.name} ✨`;
  }
}

// ─── Hero Card ───

function renderHeroCard() {
  const heroAmount = document.getElementById('hero-amount');
  if (heroAmount) {
    const safe = appState.safeToSpend;
    const formatted = safe.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const [whole, cents] = formatted.split('.');
    heroAmount.innerHTML = `₱${whole}<span class="text-vault-muted">.${cents || '00'}</span>`;
  }

  const mobileHeroAmount = document.getElementById('mobile-hero-amount');
  if (mobileHeroAmount) {
    const safe = appState.safeToSpend;
    mobileHeroAmount.textContent = `₱${safe.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  // Mobile top bar balance
  const topBarBalance = document.getElementById('topbar-balance');
  if (topBarBalance) {
    const safe = appState.safeToSpend;
    topBarBalance.textContent = `₱${safe.toLocaleString('en-PH', { minimumFractionDigits: 0 })} left`;
  }
}

// ─── Transaction Log ───

function renderTransactionLog() {
  const container = document.getElementById('transaction-log');
  if (!container) return;

  const transactions = appState.transactions.slice(0, 6);

  // Empty state
  if (transactions.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 animate-fade-in">
        <div class="w-14 h-14 mx-auto rounded-2xl bg-pink-500/10 flex items-center justify-center mb-3">
          <i data-lucide="sparkles" class="w-7 h-7 text-pink-400/50"></i>
        </div>
        <p class="text-sm text-vault-muted">No transactions yet</p>
        <p class="text-xs text-vault-muted/50 mt-1">Tap <strong class="text-pink-400">+</strong> to add your first ✨</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons({ nodes: [container] });
    return;
  }

  container.innerHTML = transactions.map((txn, index) => {
    const isExpense = txn.type === 'expense';
    const amountColor = isExpense ? 'text-rose-400' : 'text-emerald-400';
    const amountPrefix = isExpense ? '-₱' : '+₱';
    const absAmount = Math.abs(txn.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 });
    const bgColor = isExpense ? 'bg-rose-500/10' : 'bg-emerald-500/10';
    const iconColor = isExpense ? 'text-rose-400' : 'text-emerald-400';

    const showOverageAlert = index === 0 && appState.overageCategories.length > 0;

    let html = `
      <div class="transaction-row animate-slide-up" style="animation-delay: ${index * 60}ms">
        <div class="w-9 h-9 rounded-xl ${bgColor} flex items-center justify-center shrink-0">
          <i data-lucide="${txn.icon || (isExpense ? 'arrow-down-left' : 'arrow-up-right')}" class="w-4 h-4 ${iconColor}"></i>
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

    if (showOverageAlert) {
      const overCat = appState.overageCategories[0];
      html += `
        <div class="overage-alert-inline my-2" role="alert">
          <div class="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
            <i data-lucide="alert-triangle" class="w-3.5 h-3.5 text-amber-400"></i>
          </div>
          <div>
            <p class="text-[11px] font-bold text-amber-400">Budget Limit Reached 💸</p>
            <p class="text-[10px] text-vault-muted">You've exceeded your ${escapeHtml(overCat.name)} budget.</p>
          </div>
        </div>
      `;
    }

    return html;
  }).join('');

  if (window.lucide) window.lucide.createIcons({ nodes: [container] });
}

// ─── Mobile: Budget Health ───

function renderMobileBudgetHealth() {
  const container = document.getElementById('mobile-budget-health');
  if (!container) return;

  const categories = appState.categories.filter(c => c.budgeted > 0).slice(0, 4);

  if (categories.length === 0) {
    container.innerHTML = `
      <div class="text-center py-4">
        <p class="text-xs text-vault-muted">Complete onboarding to set up your budgets 🎀</p>
      </div>
    `;
    return;
  }

  container.innerHTML = categories.map(cat => {
    const status = appState.getCategoryStatus(cat);
    const dotColor = status === 'danger' ? 'bg-rose-400' :
                     status === 'warning' ? 'bg-amber-400' : 'bg-emerald-400';

    return `
      <div class="budget-health-item">
        <div class="flex items-center gap-2.5">
          <span class="w-2 h-2 rounded-full ${dotColor} shrink-0"></span>
          <span class="text-sm text-vault-text">${escapeHtml(cat.name)}</span>
        </div>
        <span class="text-xs text-vault-muted font-medium">
          ₱${cat.spent.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
          <span class="text-vault-muted/50">/ ₱${cat.budgeted.toLocaleString('en-PH', { minimumFractionDigits: 0 })}</span>
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

  if (recentTxns.length === 0) {
    container.innerHTML = `
      <div class="text-center py-4">
        <p class="text-xs text-vault-muted">Your recent activity will show here ✨</p>
      </div>
    `;
    return;
  }

  container.innerHTML = recentTxns.map(txn => {
    const isExpense = txn.type === 'expense';
    const dotColor = isExpense ? 'bg-rose-400' : 'bg-emerald-400';
    const amountColor = isExpense ? 'text-rose-400' : 'text-emerald-400';
    const amountPrefix = isExpense ? '-₱' : '+₱';
    const absAmount = Math.abs(txn.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 });
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
