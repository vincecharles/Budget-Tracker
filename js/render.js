/**
 * ═══════════════════════════════════════════════════════
 * RENDER.JS — DOM Rendering with Full CRUD Views
 * Renders Dashboard, Expenses, Savings, and Transactions.
 * ═══════════════════════════════════════════════════════
 */

import appState from './state.js';

// ─── Currency Formatter ───
const formatPHP = (amount) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);

const formatPHPShort = (amount) =>
  new Intl.NumberFormat('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

// ─── Filter State ───
let txnFilter = 'all';
let txnSearch = '';

export function initRender() {
  renderAll();
  appState.subscribe(() => renderAll());

  // Transaction view filter buttons
  document.querySelectorAll('[data-txn-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      txnFilter = btn.getAttribute('data-txn-filter');
      document.querySelectorAll('[data-txn-filter]').forEach(b => {
        b.classList.remove('active-filter', 'bg-pink-500/20', 'text-pink-400');
        b.classList.add('bg-vault-card', 'text-vault-muted');
      });
      btn.classList.add('active-filter', 'bg-pink-500/20', 'text-pink-400');
      btn.classList.remove('bg-vault-card', 'text-vault-muted');
      renderFullTransactionList();
    });
  });

  // Transaction search
  const searchInput = document.getElementById('txn-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      txnSearch = e.target.value.toLowerCase();
      renderFullTransactionList();
    });
  }

  // "Add Transaction" button on transactions page
  const txnViewAddBtn = document.getElementById('txn-view-add-btn');
  if (txnViewAddBtn) {
    txnViewAddBtn.addEventListener('click', () => {
      const { openTransactionModal } = window.__vaultMobile || {};
      if (openTransactionModal) openTransactionModal();
      else document.getElementById('fab-btn')?.click();
    });
  }

  // "Add Category" button on expenses page
  const addCatBtnExpenses = document.getElementById('add-category-btn-expenses');
  if (addCatBtnExpenses) {
    addCatBtnExpenses.addEventListener('click', () => {
      document.getElementById('add-category-btn')?.click();
    });
  }
}

function renderAll() {
  renderHeroCard();
  renderTransactionLog();
  renderMobileBudgetHealth();
  renderRecentActivity();
  renderUserGreeting();
  renderExpensesView();
  renderSavingsView();
  renderFullTransactionList();
  renderLastMonthTrend();
}

// ─── User Greeting ───

function renderUserGreeting() {
  const el = document.getElementById('user-greeting');
  if (el && appState.user.name) {
    el.textContent = `Hi, ${appState.user.name} ✨`;
  }
}

// ─── Last Month Trend ───

function renderLastMonthTrend() {
  const lbl = document.getElementById('last-month-label');
  const spent = document.getElementById('last-month-spent');
  if (lbl && spent) {
    const tmpDate = new Date();
    // format as Philippine Time roughly
    const phtDateStr = tmpDate.toLocaleString('en-US', { timeZone: 'Asia/Manila' });
    const current = new Date(phtDateStr);
    const lastMonth = new Date(current.getFullYear(), current.getMonth() - 1, 1);
    
    lbl.textContent = lastMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    spent.textContent = formatPHP(appState.state.lastMonthSpent || 0);
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
    mobileHeroAmount.textContent = `₱${formatPHPShort(safe)}`;
  }

  const topBarBalance = document.getElementById('topbar-balance');
  if (topBarBalance) {
    const safe = appState.safeToSpend;
    topBarBalance.textContent = `₱${formatPHPShort(safe)} left`;
  }
}

// ─── Transaction Log (Dashboard — top 6) ───

function renderTransactionLog() {
  const container = document.getElementById('transaction-log');
  if (!container) return;

  const transactions = appState.transactions.slice(0, 6);

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

  container.innerHTML = transactions.map((txn, index) => buildTransactionRow(txn, index, true)).join('');
  wireDeleteButtons(container);
  if (window.lucide) window.lucide.createIcons({ nodes: [container] });
}

// ─── Full Transaction List (Transactions view) ───

function renderFullTransactionList() {
  const container = document.getElementById('full-transaction-list');
  const countLabel = document.getElementById('txn-count-label');
  if (!container) return;

  let transactions = [...appState.transactions];

  // Filter
  if (txnFilter !== 'all') {
    transactions = transactions.filter(t => t.type === txnFilter);
  }

  // Search
  if (txnSearch) {
    transactions = transactions.filter(t =>
      (t.description || '').toLowerCase().includes(txnSearch)
    );
  }

  if (countLabel) {
    countLabel.textContent = `${transactions.length} transaction${transactions.length !== 1 ? 's' : ''}`;
  }

  if (transactions.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 animate-fade-in">
        <div class="w-14 h-14 mx-auto rounded-2xl bg-pink-500/10 flex items-center justify-center mb-3">
          <i data-lucide="search" class="w-7 h-7 text-pink-400/50"></i>
        </div>
        <p class="text-sm text-vault-muted">${txnSearch ? 'No matching transactions found' : 'No transactions yet'}</p>
        <p class="text-xs text-vault-muted/50 mt-1">${txnSearch ? 'Try a different search' : 'Add your first transaction with the + button ✨'}</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons({ nodes: [container] });
    return;
  }

  container.innerHTML = transactions.map((txn, i) => buildTransactionRow(txn, i, false)).join('');
  wireDeleteButtons(container);
  wireEditButtons(container);
  if (window.lucide) window.lucide.createIcons({ nodes: [container] });
}

// ─── Build Transaction Row HTML ───

function buildTransactionRow(txn, index, compact = false) {
  const isExpense = txn.type === 'expense';
  const amountColor = isExpense ? 'text-rose-400' : 'text-emerald-400';
  const amountPrefix = isExpense ? '-' : '+';
  const bgColor = isExpense ? 'bg-rose-500/10' : 'bg-emerald-500/10';
  const iconColor = isExpense ? 'text-rose-400' : 'text-emerald-400';
  const iconName = isExpense ? 'arrow-down-left' : 'arrow-up-right';
  const dateDisplay = formatTransactionDate(txn.date);
  const catName = getCategoryName(txn.category);

  return `
    <div class="transaction-row group animate-slide-up" style="animation-delay: ${index * 40}ms">
      <div class="w-9 h-9 rounded-xl ${bgColor} flex items-center justify-center shrink-0">
        <i data-lucide="${txn.icon || iconName}" class="w-4 h-4 ${iconColor}"></i>
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-vault-text truncate">${escapeHtml(txn.description)}</p>
        <p class="text-[11px] text-vault-muted mt-0.5">${dateDisplay}${catName ? ` • ${escapeHtml(catName)}` : ''}</p>
      </div>
      <span class="text-sm font-semibold ${amountColor} mr-1">
        ${amountPrefix}${formatPHP(Math.abs(txn.amount))}
      </span>
      <div class="flex items-center gap-0.5 shrink-0">
        ${!compact ? `
        <button type="button" data-edit-txn="${txn.id}" aria-label="Edit transaction"
          class="p-1.5 rounded-lg text-vault-muted/0 group-hover:text-vault-muted hover:!text-pink-400 hover:bg-pink-500/10 transition-all" title="Edit">
          <i data-lucide="pencil" class="w-3.5 h-3.5 pointer-events-none"></i>
        </button>` : ''}
        <button type="button" data-delete-txn="${txn.id}" aria-label="Delete transaction"
          class="p-1.5 rounded-lg text-vault-muted/0 group-hover:text-vault-muted hover:!text-rose-400 hover:bg-rose-500/10 transition-all" title="Delete">
          <i data-lucide="trash-2" class="w-3.5 h-3.5 pointer-events-none"></i>
        </button>
      </div>
    </div>
  `;
}

function wireDeleteButtons(container) {
  container.querySelectorAll('[data-delete-txn]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const txnId = btn.getAttribute('data-delete-txn');
      if (confirm('Delete this transaction?')) {
        appState.deleteTransaction(txnId);
      }
    });
  });
}

function wireEditButtons(container) {
  container.querySelectorAll('[data-edit-txn]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const txnId = btn.getAttribute('data-edit-txn');
      window.dispatchEvent(new CustomEvent('vault:editTransaction', { detail: { txnId } }));
    });
  });
}

// ─── Monthly Expenses View ───

function renderExpensesView() {
  // Summary cards
  const totalBudget = appState.categories.reduce((s, c) => s + c.budgeted, 0);
  const totalSpent = appState.totalSpentActual;
  const remaining = Math.max(0, totalBudget - totalSpent);
  const catCount = appState.categories.length;

  setTextContent('exp-total-budget', formatPHP(totalBudget));
  setTextContent('exp-total-spent', formatPHP(totalSpent));
  setTextContent('exp-remaining', formatPHP(remaining));
  setTextContent('exp-cat-count', catCount.toString());

  // Category breakdown table
  const tableContainer = document.getElementById('expense-category-table');
  if (tableContainer) {
    if (appState.categories.length === 0) {
      tableContainer.innerHTML = `
        <div class="text-center py-6">
          <p class="text-xs text-vault-muted">No categories yet. Add one to start tracking! 🎀</p>
        </div>
      `;
    } else {
      tableContainer.innerHTML = appState.categories.map(cat => {
        const pct = cat.budgeted > 0 ? Math.min(100, Math.round((cat.spent / cat.budgeted) * 100)) : 0;
        const status = appState.getCategoryStatus(cat);
        const statusColor = status === 'danger' ? 'text-rose-400' :
                           status === 'warning' ? 'text-amber-400' : 'text-pink-400';

        return `
          <div class="flex items-center gap-3 py-3 border-b border-vault-border/50 last:border-b-0 group/row">
            <div class="w-3 h-3 rounded-full shrink-0" style="background-color: ${cat.color}"></div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-vault-text truncate">${escapeHtml(cat.name)}</p>
              <div class="flex items-center gap-2 mt-1">
                <div class="progress-bar-track flex-1" style="height: 4px;">
                  <div class="progress-bar-fill status-${status}" style="width: ${pct}%"></div>
                </div>
                <span class="text-[10px] font-semibold ${statusColor}">${pct}%</span>
              </div>
            </div>
            <div class="text-right shrink-0">
              <p class="text-xs font-semibold text-vault-text">${formatPHP(cat.spent)}</p>
              <p class="text-[10px] text-vault-muted">of ${formatPHP(cat.budgeted)}</p>
            </div>
            <div class="flex items-center gap-0.5 shrink-0">
              <button type="button" data-edit-cat="${cat.id}" title="Edit"
                class="p-1 rounded text-vault-muted/0 group-hover/row:text-vault-muted hover:!text-pink-400 transition-all">
                <i data-lucide="pencil" class="w-3 h-3 pointer-events-none"></i>
              </button>
              <button type="button" data-delete-cat="${cat.id}" title="Delete"
                class="p-1 rounded text-vault-muted/0 group-hover/row:text-vault-muted hover:!text-rose-400 transition-all">
                <i data-lucide="trash-2" class="w-3 h-3 pointer-events-none"></i>
              </button>
            </div>
          </div>
        `;
      }).join('');

      // Wire category edit/delete
      tableContainer.querySelectorAll('[data-edit-cat]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          window.dispatchEvent(new CustomEvent('vault:editCategory', { detail: { catId: btn.getAttribute('data-edit-cat') } }));
        });
      });
      tableContainer.querySelectorAll('[data-delete-cat]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const catId = btn.getAttribute('data-delete-cat');
          const cat = appState.categories.find(c => c.id === catId);
          if (cat && confirm(`Delete "${cat.name}" category?`)) {
            appState.deleteCategory(catId);
          }
        });
      });

      if (window.lucide) window.lucide.createIcons({ nodes: [tableContainer] });
    }
  }

  // Expense legend
  const legendContainer = document.getElementById('expense-legend');
  if (legendContainer) {
    const cats = appState.categories.filter(c => c.spent > 0);
    if (cats.length === 0) {
      legendContainer.innerHTML = `<p class="text-xs text-vault-muted text-center py-4">No spending data yet ✨</p>`;
    } else {
      legendContainer.innerHTML = cats.map(cat => `
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-full" style="background-color: ${cat.color}"></div>
            <span class="text-xs text-vault-text">${escapeHtml(cat.name)}</span>
          </div>
          <span class="text-xs font-semibold text-vault-muted">${formatPHP(cat.spent)}</span>
        </div>
      `).join('');
    }
  }
}

// ─── Savings View ───

function renderSavingsView() {
  const totalIncome = appState.budget.totalIncome;
  const totalExpenses = appState.totalSpentActual;
  const netSavings = totalIncome - totalExpenses;
  const spentPct = totalIncome > 0 ? Math.min(100, Math.round((totalExpenses / totalIncome) * 100)) : 0;

  setTextContent('sav-total-income', formatPHP(totalIncome));
  setTextContent('sav-total-expenses', formatPHP(totalExpenses));

  const netEl = document.getElementById('sav-net-savings');
  if (netEl) {
    netEl.textContent = formatPHP(netSavings);
    netEl.className = `text-4xl font-extrabold ${netSavings >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;
  }

  const statusEl = document.getElementById('sav-savings-status');
  if (statusEl) {
    if (netSavings > 0) {
      statusEl.textContent = `You're saving ${formatPHP(netSavings)} this month! Great job! 🎉`;
    } else if (netSavings === 0) {
      statusEl.textContent = 'Breaking even — try to save a little more! 💪';
    } else {
      statusEl.textContent = `You're overspending by ${formatPHP(Math.abs(netSavings))} 😥`;
    }
  }

  const progressFill = document.getElementById('sav-progress-fill');
  if (progressFill) {
    progressFill.style.width = `${spentPct}%`;
    progressFill.className = `progress-bar-fill status-${spentPct >= 100 ? 'danger' : spentPct >= 75 ? 'warning' : 'safe'}`;
  }

  setTextContent('sav-income-label', `${formatPHP(totalIncome)} income`);

  // Income history
  const incomeList = document.getElementById('income-history-list');
  if (incomeList) {
    const incomeTxns = appState.transactions.filter(t => t.type === 'income');
    if (incomeTxns.length === 0) {
      incomeList.innerHTML = `
        <div class="text-center py-4">
          <p class="text-xs text-vault-muted">No income recorded yet. Add income transactions to track! 💚</p>
        </div>
      `;
    } else {
      incomeList.innerHTML = incomeTxns.map(txn => `
        <div class="flex items-center gap-3 py-2.5 border-b border-vault-border/30 last:border-b-0">
          <div class="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
            <i data-lucide="arrow-up-right" class="w-4 h-4 text-emerald-400"></i>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm text-vault-text truncate">${escapeHtml(txn.description)}</p>
            <p class="text-[10px] text-vault-muted">${formatTransactionDate(txn.date)}</p>
          </div>
          <span class="text-sm font-semibold text-emerald-400">+${formatPHP(Math.abs(txn.amount))}</span>
        </div>
      `).join('');
      if (window.lucide) window.lucide.createIcons({ nodes: [incomeList] });
    }
  }
}

// ─── Mobile: Budget Health ───

function renderMobileBudgetHealth() {
  const container = document.getElementById('mobile-budget-health');
  if (!container) return;

  const categories = appState.categories.filter(c => c.budgeted > 0).slice(0, 4);

  if (categories.length === 0) {
    container.innerHTML = `
      <div class="text-center py-4">
        <p class="text-xs text-vault-muted">Complete setup to see budget health 🎀</p>
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
          ${formatPHP(cat.spent)}
          <span class="text-vault-muted/50">/ ${formatPHP(cat.budgeted)}</span>
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
    const amountPrefix = isExpense ? '-' : '+';
    const dateDisplay = formatTransactionDate(txn.date);

    return `
      <div class="activity-item">
        <span class="w-2 h-2 rounded-full ${dotColor} shrink-0"></span>
        <div class="flex-1 min-w-0">
          <p class="text-sm text-vault-text truncate">${escapeHtml(txn.description)}</p>
          <p class="text-[10px] text-vault-muted mt-0.5">${dateDisplay}</p>
        </div>
        <span class="text-xs font-semibold ${amountColor}">${amountPrefix}${formatPHP(Math.abs(txn.amount))}</span>
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

function setTextContent(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function getCategoryName(catId) {
  if (!catId) return '';
  const cat = appState.categories.find(c => c.id === catId);
  return cat ? cat.name : '';
}

function formatTransactionDate(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((todayOnly - dateOnly) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return `Today • ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }
  if (diffDays === 1) {
    return `Yesterday • ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }
  if (diffDays < 7) {
    return `${diffDays} days ago • ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default { initRender };
