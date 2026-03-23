/**
 * ═══════════════════════════════════════════════════════
 * CHARTS.JS — Spending Chart + Category Bars
 * Handles empty-state gracefully.
 * ═══════════════════════════════════════════════════════
 */

import appState from './state.js';

let spendingChart = null;

export function initCharts() {
  renderSpendingChart();
  renderCategoryBars();

  appState.subscribe(() => {
    updateSpendingChart();
    renderCategoryBars();
  });
}

// ─── Doughnut Chart ───

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

// ─── Category Progress Bars ───

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
    .slice(0, 5)
    .map((cat, i) => {
      const pct = cat.budgeted > 0 ? Math.min(100, Math.round((cat.spent / cat.budgeted) * 100)) : 0;
      const status = appState.getCategoryStatus(cat);

      return `
        <div class="space-y-2 animate-slide-up" style="animation-delay: ${i * 80}ms">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-vault-text">${cat.name}</span>
            <span class="text-[11px] font-semibold ${
              status === 'danger' ? 'text-rose-400' :
              status === 'warning' ? 'text-amber-400' :
              'text-pink-400'
            }">${pct}% used</span>
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
}

export default { initCharts };
