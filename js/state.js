/**
 * ═══════════════════════════════════════════════════════
 * STATE.JS — Centralized State Store
 * localStorage-backed. Clean default state — no mock data.
 * Currency: Philippine Peso (₱ / PHP)
 * ═══════════════════════════════════════════════════════
 */

const STORAGE_KEY = 'vaultLedgerState';

// ─── Clean Default State (no mock data) ───
const DEFAULT_STATE = {
  user: {
    id: null,
    name: '',
    avatar: null,
  },

  budget: {
    monthlyTotal: 0,
    totalSpent: 0,
    totalIncome: 0,
    savingsGoal: 0,
    pendingBills: 0,
  },

  categories: [
    {
      id: 'cat_food',
      name: 'Food & Dining',
      icon: 'utensils',
      budgeted: 0,
      spent: 0,
      color: '#f472b6',
      parentGroup: 'Monthly Expenses',
    },
    {
      id: 'cat_groceries',
      name: 'Groceries',
      icon: 'shopping-cart',
      budgeted: 0,
      spent: 0,
      color: '#a78bfa',
      parentGroup: 'Monthly Expenses',
    },
    {
      id: 'cat_bills',
      name: 'Bills & Utilities',
      icon: 'zap',
      budgeted: 0,
      spent: 0,
      color: '#fb923c',
      parentGroup: 'Monthly Expenses',
    },
    {
      id: 'cat_rent',
      name: 'Rent & Housing',
      icon: 'home',
      budgeted: 0,
      spent: 0,
      color: '#38bdf8',
      parentGroup: 'Monthly Expenses',
    },
    {
      id: 'cat_transport',
      name: 'Transportation',
      icon: 'car',
      budgeted: 0,
      spent: 0,
      color: '#34d399',
      parentGroup: 'Monthly Expenses',
    },
    {
      id: 'cat_shopping',
      name: 'Shopping',
      icon: 'shopping-bag',
      budgeted: 0,
      spent: 0,
      color: '#f9a8d4',
      parentGroup: 'Monthly Expenses',
    },
  ],

  transactions: [],
  notifications: [],
};

// ─── State Manager ───

class StateManager {
  constructor() {
    this._subscribers = [];
    this._state = this._loadState();
  }

  // ─── Persistence ───

  _loadState() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return this._deepMerge(structuredClone(DEFAULT_STATE), parsed);
      }
    } catch (e) {
      console.warn('[VaultLedger] Corrupted localStorage, resetting.', e);
      localStorage.removeItem(STORAGE_KEY);
    }
    return structuredClone(DEFAULT_STATE);
  }

  _saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._state));
    } catch (e) {
      console.error('[VaultLedger] Failed to save state.', e);
    }
  }

  _deepMerge(target, source) {
    for (const key of Object.keys(source)) {
      if (
        source[key] &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key]) &&
        target[key] &&
        typeof target[key] === 'object' &&
        !Array.isArray(target[key])
      ) {
        this._deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
    return target;
  }

  // ─── Getters ───

  get state() { return this._state; }
  get user() { return this._state.user; }
  get budget() { return this._state.budget; }
  get categories() { return this._state.categories; }
  get transactions() { return this._state.transactions; }
  get notifications() { return this._state.notifications; }

  // ─── Computed ───

  get safeToSpend() {
    const { totalIncome, pendingBills, savingsGoal } = this._state.budget;
    const totalSpent = this._state.categories.reduce((sum, c) => sum + c.spent, 0);
    return Math.max(0, totalIncome - totalSpent - pendingBills - savingsGoal);
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

  get hasData() {
    return this._state.transactions.length > 0;
  }

  get hasBudget() {
    return this._state.categories.some(c => c.budgeted > 0);
  }

  // ─── Mutations ───

  /**
   * Complete onboarding — set up user profile and budgets.
   */
  completeOnboarding(data) {
    this._state.user.id = `usr_${Date.now()}`;
    this._state.user.name = data.name || 'User';

    this._state.budget.totalIncome = data.monthlyIncome || 0;
    this._state.budget.monthlyTotal = data.monthlyIncome || 0;

    // Apply category budgets from onboarding
    if (data.categoryBudgets) {
      for (const [catId, amount] of Object.entries(data.categoryBudgets)) {
        const cat = this._state.categories.find(c => c.id === catId);
        if (cat) {
          cat.budgeted = amount;
        }
      }
    }

    this._notify();
  }

  addTransaction(txn) {
    const newTxn = {
      id: `txn_${Date.now()}`,
      date: txn.date || new Date().toISOString(),
      ...txn,
    };

    this._state.transactions.unshift(newTxn);

    // Update category spent
    if (txn.type === 'expense' && txn.category) {
      const cat = this._state.categories.find(c => c.id === txn.category);
      if (cat) {
        cat.spent += Math.abs(txn.amount);
      }
    }

    // Update budget totals
    if (txn.type === 'expense') {
      this._state.budget.totalSpent += Math.abs(txn.amount);
    } else {
      this._state.budget.totalIncome += Math.abs(txn.amount);
    }

    this._checkOverages();
    this._notify();
  }

  /**
   * Add a custom category with random accent color.
   */
  addCategory(name, budget) {
    const COLORS = [
      '#f472b6', '#a78bfa', '#fb923c', '#38bdf8', '#34d399',
      '#f9a8d4', '#c084fc', '#fbbf24', '#67e8f9', '#86efac',
      '#fda4af', '#e879f9', '#fdba74', '#7dd3fc', '#6ee7b7',
    ];
    const ICONS = ['tag', 'star', 'heart', 'gift', 'sparkles', 'flower-2', 'gem', 'candy'];

    const usedColors = this._state.categories.map(c => c.color);
    const availableColors = COLORS.filter(c => !usedColors.includes(c));
    const color = availableColors.length > 0
      ? availableColors[Math.floor(Math.random() * availableColors.length)]
      : COLORS[Math.floor(Math.random() * COLORS.length)];
    const icon = ICONS[Math.floor(Math.random() * ICONS.length)];

    const newCat = {
      id: `cat_${Date.now()}`,
      name: name.trim(),
      icon,
      budgeted: budget || 0,
      spent: 0,
      color,
      parentGroup: 'Monthly Expenses',
    };

    this._state.categories.push(newCat);

    // Update total monthly budget
    if (budget > 0) {
      this._state.budget.monthlyTotal += budget;
    }

    this._notify();
    return newCat;
  }

  /**
   * Delete a transaction and reverse its effect on category/budget totals.
   */
  deleteTransaction(id) {
    const idx = this._state.transactions.findIndex(t => t.id === id);
    if (idx === -1) return;

    const txn = this._state.transactions[idx];

    // Reverse category spent
    if (txn.type === 'expense' && txn.category) {
      const cat = this._state.categories.find(c => c.id === txn.category);
      if (cat) {
        cat.spent = Math.max(0, cat.spent - Math.abs(txn.amount));
      }
    }

    // Reverse budget totals
    if (txn.type === 'expense') {
      this._state.budget.totalSpent = Math.max(0, this._state.budget.totalSpent - Math.abs(txn.amount));
    }

    this._state.transactions.splice(idx, 1);
    this._notify();
  }

  /**
   * Update an existing transaction. Reverses old amounts, applies new.
   */
  updateTransaction(id, updates) {
    const txn = this._state.transactions.find(t => t.id === id);
    if (!txn) return;

    // Reverse old effect
    if (txn.type === 'expense' && txn.category) {
      const oldCat = this._state.categories.find(c => c.id === txn.category);
      if (oldCat) oldCat.spent = Math.max(0, oldCat.spent - Math.abs(txn.amount));
    }
    if (txn.type === 'expense') {
      this._state.budget.totalSpent = Math.max(0, this._state.budget.totalSpent - Math.abs(txn.amount));
    }

    // Apply updates
    Object.assign(txn, updates);

    // Apply new effect
    if (txn.type === 'expense' && txn.category) {
      const newCat = this._state.categories.find(c => c.id === txn.category);
      if (newCat) newCat.spent += Math.abs(txn.amount);
    }
    if (txn.type === 'expense') {
      this._state.budget.totalSpent += Math.abs(txn.amount);
    }

    this._checkOverages();
    this._notify();
  }

  /**
   * Update the total monthly income (Safe to Spend basis).
   */
  updateIncome(amount) {
    this._state.budget.totalIncome = amount;
    this._state.budget.monthlyTotal = amount;
    this._checkOverages();
    this._notify();
  }

  /**
   * Update a category's name and/or budget.
   */
  updateCategory(id, updates) {
    const cat = this._state.categories.find(c => c.id === id);
    if (!cat) return;

    // Adjust monthly total if budget changed
    if (updates.budgeted !== undefined && updates.budgeted !== cat.budgeted) {
      this._state.budget.monthlyTotal += (updates.budgeted - cat.budgeted);
    }

    if (updates.name !== undefined) cat.name = updates.name.trim();
    if (updates.budgeted !== undefined) cat.budgeted = updates.budgeted;

    this._checkOverages();
    this._notify();
  }

  /**
   * Delete a category. Removes from array and adjusts monthly total.
   */
  deleteCategory(id) {
    const idx = this._state.categories.findIndex(c => c.id === id);
    if (idx === -1) return;

    const cat = this._state.categories[idx];

    // Adjust monthly budget total
    this._state.budget.monthlyTotal = Math.max(0, this._state.budget.monthlyTotal - cat.budgeted);
    this._state.budget.totalSpent = Math.max(0, this._state.budget.totalSpent - cat.spent);

    this._state.categories.splice(idx, 1);
    this._notify();
  }

  dismissNotification(id) {
    const notif = this._state.notifications.find(n => n.id === id);
    if (notif) {
      notif.dismissed = true;
      this._notify();
    }
  }

  resetToDefaults() {
    this._state = structuredClone(DEFAULT_STATE);
    this._notify();
  }

  // ─── Overage Detection ───

  _checkOverages() {
    for (const cat of this._state.categories) {
      if (cat.spent > cat.budgeted && cat.budgeted > 0) {
        const exists = this._state.notifications.some(
          n => n.type === 'overage' && n.category === cat.id && !n.dismissed
        );
        if (!exists) {
          this._state.notifications.push({
            id: `notif_${Date.now()}_${cat.id}`,
            type: 'overage',
            category: cat.id,
            message: `You've exceeded your ${cat.name} budget! 💸`,
            timestamp: new Date().toISOString(),
            dismissed: false,
          });
        }
      }
    }
  }

  // ─── Pub/Sub ───

  subscribe(callback) {
    this._subscribers.push(callback);
    return () => {
      this._subscribers = this._subscribers.filter(cb => cb !== callback);
    };
  }

  _notify() {
    this._saveState();
    for (const cb of this._subscribers) {
      try { cb(this._state); } catch (e) {
        console.error('[VaultLedger] Subscriber error:', e);
      }
    }
  }
}

const appState = new StateManager();
export default appState;
