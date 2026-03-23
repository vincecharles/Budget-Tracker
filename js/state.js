/**
 * ═══════════════════════════════════════════════════════
 * STATE.JS — Centralized State Store
 * localStorage-backed, Supabase-ready architecture.
 * Currency: Philippine Peso (₱ / PHP)
 * ═══════════════════════════════════════════════════════
 */

const STORAGE_KEY = 'vaultLedgerState';

// ─── Default Mock Data (mirrors future Supabase schema) ───
const DEFAULT_STATE = {
  user: {
    id: 'usr_001',
    name: 'Alex Reyes',
    email: 'alex@vaultledger.ph',
    avatar: null,
  },

  budget: {
    monthlyTotal: 45000.00,
    totalSpent: 29300.00,
    totalIncome: 42000.00,
    savingsGoal: 3000.00,
    pendingBills: 2500.00,
  },

  categories: [
    {
      id: 'cat_dining',
      name: 'Dining & Social',
      icon: 'utensils',
      budgeted: 5000.00,
      spent: 4300.00,
      color: '#ff5252',
      parentGroup: 'Monthly Expenses',
    },
    {
      id: 'cat_groceries',
      name: 'Groceries & Home',
      icon: 'shopping-cart',
      budgeted: 10000.00,
      spent: 4700.00,
      color: '#ffc107',
      parentGroup: 'Monthly Expenses',
    },
    {
      id: 'cat_utilities',
      name: 'Monthly Utilities',
      icon: 'zap',
      budgeted: 4000.00,
      spent: 4000.00,
      color: '#ff5252',
      parentGroup: 'Monthly Expenses',
    },
    {
      id: 'cat_rent',
      name: 'Rent',
      icon: 'home',
      budgeted: 15000.00,
      spent: 13500.00,
      color: '#00e676',
      parentGroup: 'Monthly Expenses',
    },
    {
      id: 'cat_entertainment',
      name: 'Entertainment',
      icon: 'tv',
      budgeted: 4000.00,
      spent: 2800.00,
      color: '#ffc107',
      parentGroup: 'Monthly Expenses',
    },
  ],

  transactions: [
    {
      id: 'txn_001',
      description: 'Meralco Electric Bill',
      subtitle: 'Automated Bill • Today, 3:45 AM',
      amount: -3250.00,
      date: '2026-03-24T03:45:00',
      category: 'cat_utilities',
      type: 'expense',
      icon: 'zap',
    },
    {
      id: 'txn_002',
      description: 'Company Payroll Salary',
      subtitle: 'Direct Deposit • Yesterday',
      amount: 42000.00,
      date: '2026-03-23T09:00:00',
      category: null,
      type: 'income',
      icon: 'building-2',
    },
    {
      id: 'txn_003',
      description: 'SM Supermarket',
      subtitle: 'Today, 2:15 PM',
      amount: -1840.00,
      date: '2026-03-24T14:15:00',
      category: 'cat_groceries',
      type: 'expense',
      icon: 'shopping-cart',
    },
    {
      id: 'txn_004',
      description: 'SM Cinema',
      subtitle: 'Yesterday, 8:15 PM',
      amount: -380.00,
      date: '2026-03-23T20:15:00',
      category: 'cat_entertainment',
      type: 'expense',
      icon: 'film',
    },
  ],

  notifications: [
    {
      id: 'notif_001',
      type: 'overage',
      category: 'cat_dining',
      message: "You've exceeded your Dining monthly budget.",
      timestamp: '2026-03-24T12:00:00',
      dismissed: false,
    },
  ],
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
        // Merge with defaults to handle schema additions
        return this._deepMerge(structuredClone(DEFAULT_STATE), parsed);
      }
    } catch (e) {
      console.warn('[VaultLedger] Corrupted localStorage, resetting to defaults.', e);
      localStorage.removeItem(STORAGE_KEY);
    }
    return structuredClone(DEFAULT_STATE);
  }

  _saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._state));
    } catch (e) {
      console.error('[VaultLedger] Failed to save state to localStorage.', e);
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

  get state() {
    return this._state;
  }

  get user() {
    return this._state.user;
  }

  get budget() {
    return this._state.budget;
  }

  get categories() {
    return this._state.categories;
  }

  get transactions() {
    return this._state.transactions;
  }

  get notifications() {
    return this._state.notifications;
  }

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

  getCategoryStatus(category) {
    const pct = category.budgeted > 0 ? category.spent / category.budgeted : 0;
    if (pct >= 1) return 'danger';
    if (pct >= 0.75) return 'warning';
    return 'safe';
  }

  get overageCategories() {
    return this._state.categories.filter(c => c.spent > c.budgeted);
  }

  // ─── Mutations ───

  addTransaction(txn) {
    const newTxn = {
      id: `txn_${Date.now()}`,
      date: new Date().toISOString(),
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

    // Check for new overages
    this._checkOverages();

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
      if (cat.spent > cat.budgeted) {
        const exists = this._state.notifications.some(
          n => n.type === 'overage' && n.category === cat.id && !n.dismissed
        );
        if (!exists) {
          this._state.notifications.push({
            id: `notif_${Date.now()}_${cat.id}`,
            type: 'overage',
            category: cat.id,
            message: `You've exceeded your ${cat.name} monthly budget.`,
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
      try {
        cb(this._state);
      } catch (e) {
        console.error('[VaultLedger] Subscriber error:', e);
      }
    }
  }
}

// Singleton export
const appState = new StateManager();
export default appState;
