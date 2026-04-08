/**
 * ═══════════════════════════════════════════════════════
 * CHARTS.JS — Spending Chart + Category Bars + Expense Pie
 * Handles empty-state gracefully.
 * ═══════════════════════════════════════════════════════
 */

import appState from './state.js';

let spendingChart = null;
let expensePieChart = null;

export function initCharts() {
  renderSpendingChart();
  renderCategoryBars();
  renderExpensePieChart();

  appState.subscribe(() => {
    updateSpendingChart();
    renderCategoryBars();
    updateExpensePieChart();
  });
}

// ─── Doughnut Chart (Dashboard Hero) ───

function renderSpendingChart() {
  const canvas = document.getElementById('spending-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const pct = appState.spentPercentage;

  spendingChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Spent', 'Remaining'],
      datasets: [{
        data: pct > 0 ? [pct, 100 - pct] : [0, 100],
        backgroundColor: [
          '#f472b6',
          'rgba(244, 114, 182, 0.1)',
        ],
        borderWidth: 0,
        borderRadius: 6,
        spacing: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '78%',
      rotation: -90,
      circumference: 360,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
      },
      animation: {
        animateRotate: true,
        duration: 1200,
        easing: 'easeOutQuart',
      },
    },
  });

  updateChartLabels(pct);
}

function updateSpendingChart() {
  if (!spendingChart) return;

  const pct = appState.spentPercentage;

  spendingChart.data.datasets[0].data = pct > 0 ? [pct, 100 - pct] : [0, 100];

  if (pct >= 90) {
    spendingChart.data.datasets[0].backgroundColor[0] = '#fb7185';
  } else if (pct >= 75) {
    spendingChart.data.datasets[0].backgroundColor[0] = '#fbbf24';
  } else {
    spendingChart.data.datasets[0].backgroundColor[0] = '#f472b6';
  }

  spendingChart.update('none');
  updateChartLabels(pct);
}

function updateChartLabels(pct) {
  const centerEl = document.getElementById('chart-center-pct');
  const srEl = document.getElementById('chart-sr-text');

  if (centerEl) {
    centerEl.textContent = `${pct}%`;
  }
  if (srEl) {
    const safe = appState.safeToSpend;
    srEl.textContent = `${pct}% of monthly budget spent. ₱${safe.toLocaleString('en-PH')} safe to spend.`;
  }
}

// ─── Expense Pie Chart (Expenses View) ───

function renderExpensePieChart() {
  const canvas = document.getElementById('expense-pie-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const cats = appState.categories.filter(c => c.spent > 0);

  const data = cats.length > 0
    ? { labels: cats.map(c => c.name), datasets: [{ data: cats.map(c => c.spent), backgroundColor: cats.map(c => c.color), borderWidth: 0, borderRadius: 4, spacing: 2 }] }
    : { labels: ['No data'], datasets: [{ data: [1], backgroundColor: ['rgba(244, 114, 182, 0.1)'], borderWidth: 0 }] };

  expensePieChart = new Chart(ctx, {
    type: 'doughnut',
    data,
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '65%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1e1220',
          titleColor: '#f5e8f0',
          bodyColor: '#a0899a',
          borderColor: '#3a2035',
          borderWidth: 1,
          cornerRadius: 12,
          padding: 12,
          callbacks: {
            label: function(ctx) {
              const val = ctx.parsed;
              return ` ₱${val.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
            }
          }
        },
      },
      animation: {
        animateRotate: true,
        duration: 1000,
        easing: 'easeOutQuart',
      },
    },
  });
}

function updateExpensePieChart() {
  if (!expensePieChart) return;

  const cats = appState.categories.filter(c => c.spent > 0);

  if (cats.length > 0) {
    expensePieChart.data.labels = cats.map(c => c.name);
    expensePieChart.data.datasets[0].data = cats.map(c => c.spent);
    expensePieChart.data.datasets[0].backgroundColor = cats.map(c => c.color);
  } else {
    expensePieChart.data.labels = ['No data'];
    expensePieChart.data.datasets[0].data = [1];
    expensePieChart.data.datasets[0].backgroundColor = ['rgba(244, 114, 182, 0.1)'];
  }

  expensePieChart.update();
}

// ─── Category Progress Bars (Dashboard) ───

function renderCategoryBars() {
  const container = document.getElementById('category-health-bars');
  if (!container) return;

  const categories = appState.categories.filter(c => c.budgeted > 0);

  // Empty state
  if (categories.length === 0) {
    container.innerHTML = `
      <div class="text-center py-6 animate-fade-in">
        <div class="w-12 h-12 mx-auto rounded-2xl bg-purple-500/10 flex items-center justify-center mb-3">
          <i data-lucide="palette" class="w-6 h-6 text-purple-400/50"></i>
        </div>
        <p class="text-xs text-vault-muted">Set up your budget to track spending 🎀</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons({ nodes: [container] });
    return;
  }

  container.innerHTML = categories
    .map((cat, i) => {
      const pct = cat.budgeted > 0 ? Math.min(100, Math.round((cat.spent / cat.budgeted) * 100)) : 0;
      const status = appState.getCategoryStatus(cat);

      return `
        <div class="space-y-2 animate-slide-up group/cat" style="animation-delay: ${i * 80}ms">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-vault-text">${cat.name}</span>
            <div class="flex items-center gap-1">
              <span class="text-[11px] font-semibold ${
                status === 'danger' ? 'text-rose-400' :
                status === 'warning' ? 'text-amber-400' :
                'text-pink-400'
              }">${pct}% used</span>
              <button type="button" data-edit-cat="${cat.id}" title="Edit"
                class="p-1 rounded text-vault-muted/0 group-hover/cat:text-vault-muted hover:!text-pink-400 transition-all">
                <i data-lucide="pencil" class="w-3 h-3 pointer-events-none"></i>
              </button>
              <button type="button" data-delete-cat="${cat.id}" title="Delete"
                class="p-1 rounded text-vault-muted/0 group-hover/cat:text-vault-muted hover:!text-rose-400 transition-all">
                <i data-lucide="trash-2" class="w-3 h-3 pointer-events-none"></i>
              </button>
            </div>
          </div>
          <div class="progress-bar-track" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
            <div class="progress-bar-fill status-${status}" style="width: ${pct}%"></div>
          </div>
          <div class="flex items-center justify-between text-[10px] text-vault-muted">
            <span>₱${cat.spent.toLocaleString('en-PH', { minimumFractionDigits: 2 })} spent</span>
            <span>₱${cat.budgeted.toLocaleString('en-PH', { minimumFractionDigits: 2 })} budget</span>
          </div>
        </div>
      `;
    })
    .join('');

  // Wire up edit buttons
  container.querySelectorAll('[data-edit-cat]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const catId = btn.getAttribute('data-edit-cat');
      window.dispatchEvent(new CustomEvent('vault:editCategory', { detail: { catId } }));
    });
  });

  // Wire up delete buttons
  container.querySelectorAll('[data-delete-cat]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const catId = btn.getAttribute('data-delete-cat');
      const cat = appState.categories.find(c => c.id === catId);
      if (cat && confirm(`Delete "${cat.name}" category?`)) {
        appState.deleteCategory(catId);
      }
    });
  });

  if (window.lucide) window.lucide.createIcons({ nodes: [container] });
}

export default { initCharts };
