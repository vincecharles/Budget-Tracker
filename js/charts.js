/**
 * ═══════════════════════════════════════════════════════
 * CHARTS.JS — Chart.js Spending Doughnut + Progress Bars
 * ═══════════════════════════════════════════════════════
 */

import appState from './state.js';

let spendingChart = null;

/**
 * Initialize Chart.js doughnut and category progress bars.
 */
export function initCharts() {
  renderSpendingChart();
  renderCategoryBars();

  // Re-render on state changes
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
        data: [pct, 100 - pct],
        backgroundColor: [
          '#00e676',
          'rgba(30, 46, 40, 0.5)',
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

  // Update center text and sr-only
  updateChartLabels(pct);
}

function updateSpendingChart() {
  if (!spendingChart) return;

  const pct = appState.spentPercentage;

  spendingChart.data.datasets[0].data = [pct, 100 - pct];

  // Change color based on health
  if (pct >= 90) {
    spendingChart.data.datasets[0].backgroundColor[0] = '#ff5252';
  } else if (pct >= 75) {
    spendingChart.data.datasets[0].backgroundColor[0] = '#ffc107';
  } else {
    spendingChart.data.datasets[0].backgroundColor[0] = '#00e676';
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
    srEl.textContent = `${pct}% of monthly budget spent. ₱${safe.toLocaleString('en-US')} safe to spend today.`;
  }
}

// ─── Category Progress Bars ───

function renderCategoryBars() {
  const container = document.getElementById('category-health-bars');
  if (!container) return;

  const categories = appState.categories;

  container.innerHTML = categories
    .filter(cat => cat.parentGroup === 'Monthly Expenses')
    .slice(0, 4) // Show top 4
    .map(cat => {
      const pct = cat.budgeted > 0 ? Math.min(100, Math.round((cat.spent / cat.budgeted) * 100)) : 0;
      const status = appState.getCategoryStatus(cat);

      const statusLabel = status === 'danger' ? 'Over budget' : status === 'warning' ? 'Nearing limit' : 'On track';

      return `
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-vault-text">${cat.name}</span>
            <span class="text-[11px] font-semibold ${
              status === 'danger' ? 'text-vault-red' :
              status === 'warning' ? 'text-vault-yellow' :
              'text-vault-green'
            }">${pct}% used</span>
          </div>
          <div class="progress-bar-track" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="${cat.name}: ${pct}% of budget used, ${statusLabel}">
            <div class="progress-bar-fill status-${status}" style="width: ${pct}%"></div>
          </div>
          <div class="flex items-center justify-between text-[10px] text-vault-muted">
            <span>₱${cat.spent.toLocaleString('en-US', { minimumFractionDigits: 2 })} spent</span>
            <span>₱${cat.budgeted.toLocaleString('en-US', { minimumFractionDigits: 2 })} budget</span>
          </div>
        </div>
      `;
    })
    .join('');
}

export default { initCharts };
