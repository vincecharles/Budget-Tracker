/**
 * ═══════════════════════════════════════════════════════
 * STATE.JS — Cloud-Synced State Store (Neon + Netlify)
 * Replaces localStorage with asynchronous API calls.
 * ═══════════════════════════════════════════════════════
 */

const API_BASE = '/api';

const DEFAULT_STATE = {
  user: { id: 'usr_erika1', name: 'Erika' },
  budget: { monthlyTotal: 0, totalSpent: 0, totalIncome: 0, savingsGoal: 0, pendingBills: 0 },
  categories: [],
  transactions: [],
  notifications: [],
  lastMonthSpent: 0
};

class StateManager {
  constructor() {
    this._subscribers = [];
    this._state = structuredClone(DEFAULT_STATE);
    this._isInitialLoad = true;
  }

  // ─── Cloud Sync ───

  async init() {
    console.log('[VaultLedger] Syncing with cloud...');
    try {
      await Promise.all([
        this.fetchProfile(),
        this.fetchCategories(),
        this.fetchTransactions()
      ]);
      this._isInitialLoad = false;
      this._notify();
    } catch (err) {
      console.error('[VaultLedger] Sync failed:', err);
    }
  }

  async fetchProfile() {
    const res = await fetch(`${API_BASE}/profile`);
    const data = await res.json();
    this._state.budget.totalIncome = parseFloat(data.total_income) || 0;
    this._state.budget.monthlyTotal = parseFloat(data.monthly_total) || 0;
    this._state.user.name = data.username;
  }

  async fetchCategories() {
    const res = await fetch(`${API_BASE}/categories`);
    const data = await res.json();
    this._state.categories = data.map(c => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      budgeted: parseFloat(c.budgeted),
      spent: 0, // Computed locally
      color: c.color,
      parentGroup: c.parent_group
    }));
  }

  async fetchTransactions() {
    const res = await fetch(`${API_BASE}/transactions`);
    const data = await res.json();
    this._state.transactions = data.map(t => ({
      id: t.id,
      type: t.type,
      amount: parseFloat(t.amount),
      description: t.description,
      category: t.category_id,
      date: t.date
    }));
  }

  // ─── Getters ───

  get state() { return this._state; }
  get user() { return this._state.user; }
  get budget() { return this._state.budget; }
  get categories() { return this._state.categories; }
  get transactions() { return this._state.transactions; }
  get notifications() { return this._state.notifications; }

  // ─── Computed (Dynamic) ───

  get safeToSpend() {
    let extraIncomeThisMonth = 0;
    const current = this._getPHTDateDetails(new Date());
    this._state.transactions.forEach(t => {
      if (t.type === 'income') {
        const d = this._getPHTDateDetails(t.date);
        if (d.year === current.year && d.month === current.month) extraIncomeThisMonth += Math.abs(t.amount);
      }
    });

    const { totalIncome, pendingBills, savingsGoal, totalSpent } = this._state.budget;
    return Math.max(0, (totalIncome + extraIncomeThisMonth) - totalSpent - pendingBills - savingsGoal);
  }

  get spentPercentage() {
    const totalSpent = this._state.categories.reduce((sum, c) => sum + c.spent, 0);
    const { monthlyTotal } = this._state.budget;
    return monthlyTotal > 0 ? Math.round((totalSpent / monthlyTotal) * 100) : 0;
  }

  get totalSpentActual() {
    return this._state.categories.reduce((sum, c) => sum + c.spent, 0);
  }

  getCategoryStatus(category) {
    const pct = category.budgeted > 0 ? category.spent / category.budgeted : 0;
    if (pct >= 1) return 'danger';
    if (pct >= 0.75) return 'warning';
    return 'safe';
  }

  get overageCategories() {
    return this._state.categories.filter(c => c.spent > c.budgeted && c.budgeted > 0);
  }

  // ─── Mutations (Asynchronous) ───

  async addTransaction(txn) {
    const newTxn = {
      id: `txn_${Date.now()}`,
      date: txn.date || new Date().toISOString(),
      ...txn,
    };

    // Optimistic UI
    this._state.transactions.unshift(newTxn);
    this._notify();

    // Sync to cloud
    await fetch(`${API_BASE}/transactions`, {
      method: 'POST',
      body: JSON.stringify({
        id: newTxn.id,
        type: newTxn.type,
        amount: newTxn.amount,
        description: newTxn.description,
        category_id: newTxn.category,
        date: newTxn.date
      })
    });
  }

  async deleteTransaction(id) {
    const idx = this._state.transactions.findIndex(t => t.id === id);
    if (idx === -1) return;
    
    this._state.transactions.splice(idx, 1);
    this._notify();

    await fetch(`${API_BASE}/transactions`, {
      method: 'DELETE',
      body: JSON.stringify({ id })
    });
  }

  async updateTransaction(id, updates) {
    const txn = this._state.transactions.find(t => t.id === id);
    if (!txn) return;
    Object.assign(txn, updates);
    this._notify();

    await fetch(`${API_BASE}/transactions`, {
      method: 'PUT',
      body: JSON.stringify({
        id,
        type: txn.type,
        amount: txn.amount,
        description: txn.description,
        category_id: txn.category,
        date: txn.date
      })
    });
  }

  async addCategory(name, budget) {
    const COLORS = ['#f472b6', '#a78bfa', '#fb923c', '#38bdf8', '#34d399', '#f9a8d4'];
    const ICONS = ['tag', 'star', 'heart', 'gift', 'sparkles', 'gem'];
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const icon = ICONS[Math.floor(Math.random() * ICONS.length)];

    const id = `cat_${Date.now()}`;
    const newCat = { id, name: name.trim(), icon, budgeted: budget || 0, spent: 0, color, parentGroup: 'Monthly Expenses' };

    this._state.categories.push(newCat);
    this._notify();

    await fetch(`${API_BASE}/categories`, {
      method: 'POST',
      body: JSON.stringify({ id, name: newCat.name, icon, color, budgeted: newCat.budgeted })
    });

    return newCat;
  }

  async updateCategory(id, updates) {
    const cat = this._state.categories.find(c => c.id === id);
    if (!cat) return;

    Object.assign(cat, updates);
    this._notify();

    await fetch(`${API_BASE}/categories`, {
      method: 'PUT',
      body: JSON.stringify({ id, name: cat.name, budgeted: cat.budgeted })
    });
  }

  async deleteCategory(id) {
    const idx = this._state.categories.findIndex(c => c.id === id);
    if (idx === -1) return;

    this._state.categories.splice(idx, 1);
    this._notify();

    await fetch(`${API_BASE}/categories`, {
      method: 'DELETE',
      body: JSON.stringify({ id })
    });
  }

  async updateIncome(amount) {
    this._state.budget.totalIncome = amount;
    this._state.budget.monthlyTotal = amount;
    this._notify();

    await fetch(`${API_BASE}/profile`, {
      method: 'PUT',
      body: JSON.stringify({ total_income: amount, monthly_total: amount })
    });
  }

  // ─── Helpers ───

  _getPHTDateDetails(dateSpan) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila',
      year: 'numeric', month: 'numeric'
    }).formatToParts(new Date(dateSpan || new Date()));
    const dt = {};
    parts.forEach(p => dt[p.type] = p.value);
    return { year: parseInt(dt.year), month: parseInt(dt.month) - 1 };
  }

  _recomputeMonthlySpends() {
    const current = this._getPHTDateDetails(new Date());
    this._state.categories.forEach(c => c.spent = 0);
    this._state.budget.totalSpent = 0;

    let lastMonthYear = current.month === 0 ? current.year - 1 : current.year;
    let lastMonthIdx = current.month === 0 ? 11 : current.month - 1;
    let lastMonthSpent = 0;

    this._state.transactions.forEach(t => {
      const d = this._getPHTDateDetails(t.date);
      if (d.year === current.year && d.month === current.month) {
        if (t.type === 'expense') {
          this._state.budget.totalSpent += Math.abs(t.amount);
          const cat = this._state.categories.find(c => c.id === t.category);
          if (cat) cat.spent += Math.abs(t.amount);
        }
      }
      if (d.year === lastMonthYear && d.month === lastMonthIdx) {
        if (t.type === 'expense') lastMonthSpent += Math.abs(t.amount);
      }
    });

    this._state.lastMonthSpent = lastMonthSpent;
  }

  subscribe(callback) {
    this._subscribers.push(callback);
    return () => {
      this._subscribers = this._subscribers.filter(cb => cb !== callback);
    };
  }

  _notify() {
    this._recomputeMonthlySpends();
    for (const cb of this._subscribers) {
      try { cb(this._state); } catch (e) {
        console.error('[VaultLedger] Subscriber error:', e);
      }
    }
  }
}

const appState = new StateManager();
export default appState;
