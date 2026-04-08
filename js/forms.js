/**
 * ═══════════════════════════════════════════════════════
 * FORMS.JS — Full CRUD Form Logic
 * Quick Transaction modal (Create + Edit) + Category modal (Create + Edit).
 * ═══════════════════════════════════════════════════════
 */

import appState from './state.js';
import { closeTransactionModal, openTransactionModal } from './mobile.js';

// ─── Edit mode tracking ───
let editingTxnId = null;   // null = create mode, string = edit mode
let editingCatId = null;

/**
 * Initialize form validation and submission.
 */
export function initForms() {
  const form = document.getElementById('transaction-form');
  if (!form) return;

  populateCategories();
  setDefaultDate();

  // Type toggle
  const toggleBtns = form.querySelectorAll('.type-toggle');
  toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      toggleBtns.forEach(b => {
        b.removeAttribute('data-active');
        b.classList.remove('bg-rose-500/20', 'text-rose-400', 'bg-emerald-500/20', 'text-emerald-400');
        b.classList.add('text-vault-muted');
      });
      btn.setAttribute('data-active', 'true');
      const type = btn.getAttribute('data-type');
      if (type === 'expense') {
        btn.classList.remove('text-vault-muted');
        btn.classList.add('bg-rose-500/20', 'text-rose-400');
      } else {
        btn.classList.remove('text-vault-muted');
        btn.classList.add('bg-emerald-500/20', 'text-emerald-400');
      }
    });
  });
  if (toggleBtns[0]) toggleBtns[0].setAttribute('data-active', 'true');

  // Clear errors on focus
  form.querySelectorAll('input, select').forEach(input => {
    input.addEventListener('focus', () => clearFieldError(input));
  });

  // Form submission
  form.addEventListener('submit', handleFormSubmit);

  // Re-populate categories on state change
  appState.subscribe(() => populateCategories());

  // ─── Category Modal ───
  initCategoryModal();

  // ─── Income Modal ───
  initIncomeModal();

  // ─── Listen for edit events from render.js ───
  window.addEventListener('vault:editTransaction', (e) => {
    const txnId = e.detail?.txnId;
    if (txnId) openEditTransaction(txnId);
  });

  window.addEventListener('vault:editCategory', (e) => {
    const catId = e.detail?.catId;
    if (catId) openEditCategory(catId);
  });
}

// ═══════════════════════════════════════════════════════
// TRANSACTION CRUD
// ═══════════════════════════════════════════════════════

function setDefaultDate() {
  const dateInput = document.getElementById('txn-date');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
    dateInput.max = today;
  }
}

function populateCategories() {
  const select = document.getElementById('txn-category');
  if (!select) return;
  const currentValue = select.value;
  while (select.options.length > 1) select.remove(1);
  appState.categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = cat.name;
    select.appendChild(opt);
  });
  if (currentValue) select.value = currentValue;
}

/**
 * Open the transaction modal in edit mode with pre-filled data.
 */
function openEditTransaction(txnId) {
  const txn = appState.transactions.find(t => t.id === txnId);
  if (!txn) return;

  editingTxnId = txnId;

  // Update modal header
  const modalTitle = document.querySelector('#transaction-modal h2');
  if (modalTitle) modalTitle.textContent = 'Edit Transaction ✏️';

  const submitBtn = document.getElementById('txn-submit-btn');
  if (submitBtn) submitBtn.textContent = 'Save Changes ✨';

  // Pre-fill form
  const form = document.getElementById('transaction-form');
  const descInput = form?.querySelector('#txn-description');
  const amountInput = form?.querySelector('#txn-amount');
  const dateInput = form?.querySelector('#txn-date');
  const catSelect = form?.querySelector('#txn-category');

  if (descInput) descInput.value = txn.description || '';
  if (amountInput) amountInput.value = Math.abs(txn.amount);
  if (catSelect) catSelect.value = txn.category || '';

  // Parse date
  if (dateInput && txn.date) {
    const d = new Date(txn.date);
    dateInput.value = d.toISOString().split('T')[0];
  }

  // Set type toggle
  const toggleBtns = form?.querySelectorAll('.type-toggle');
  toggleBtns?.forEach(b => {
    b.removeAttribute('data-active');
    b.classList.remove('bg-rose-500/20', 'text-rose-400', 'bg-emerald-500/20', 'text-emerald-400');
    b.classList.add('text-vault-muted');
    if (b.getAttribute('data-type') === txn.type) {
      b.setAttribute('data-active', 'true');
      b.classList.remove('text-vault-muted');
      if (txn.type === 'expense') {
        b.classList.add('bg-rose-500/20', 'text-rose-400');
      } else {
        b.classList.add('bg-emerald-500/20', 'text-emerald-400');
      }
    }
  });

  openTransactionModal();
}

/**
 * Reset modal to create mode.
 */
function resetToCreateMode() {
  editingTxnId = null;
  const modalTitle = document.querySelector('#transaction-modal h2');
  if (modalTitle) modalTitle.textContent = 'Quick Transaction ✨';
  const submitBtn = document.getElementById('txn-submit-btn');
  if (submitBtn) submitBtn.textContent = 'Log Transaction ✨';
}

/**
 * Handle form submission — Create or Update.
 */
async function handleFormSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const errors = [];

  const rawDescription = form.querySelector('#txn-description').value;
  const rawAmount = form.querySelector('#txn-amount').value;
  const rawCategory = form.querySelector('#txn-category').value;
  const rawDate = form.querySelector('#txn-date')?.value;
  const activeToggle = form.querySelector('.type-toggle[data-active="true"]');
  const txnType = activeToggle ? activeToggle.getAttribute('data-type') : 'expense';

  const description = sanitizeText(rawDescription);

  // Validate description
  if (!description || description.trim().length === 0) {
    errors.push({ field: 'txn-description', message: 'Description is required.' });
  } else if (description.trim().length < 2) {
    errors.push({ field: 'txn-description', message: 'Must be at least 2 characters.' });
  }

  // Validate amount
  const amount = parseFloat(rawAmount);
  if (!rawAmount) {
    errors.push({ field: 'txn-amount', message: 'Amount is required.' });
  } else if (isNaN(amount) || amount <= 0) {
    errors.push({ field: 'txn-amount', message: 'Must be greater than zero.' });
  } else if (amount > 999999.99) {
    errors.push({ field: 'txn-amount', message: 'Amount exceeds maximum.' });
  }

  // Validate category
  if (!rawCategory) {
    errors.push({ field: 'txn-category', message: 'Please select a category.' });
  }

  if (errors.length > 0) {
    errors.forEach(err => showFieldError(err.field, err.message));
    document.getElementById(errors[0].field)?.focus();
    return;
  }

  const txnDate = rawDate ? new Date(rawDate + 'T12:00:00').toISOString() : new Date().toISOString();

  const txnData = {
    description: description.trim(),
    amount: txnType === 'expense' ? -Math.abs(amount) : Math.abs(amount),
    category: rawCategory,
    type: txnType,
    date: txnDate,
    subtitle: `Manual Entry • ${formatDate(txnDate)}`,
    icon: txnType === 'expense' ? 'minus-circle' : 'plus-circle',
  };

  if (editingTxnId) {
    // ─── UPDATE MODE ───
    await appState.updateTransaction(editingTxnId, txnData);
  } else {
    // ─── CREATE MODE ───
    await appState.addTransaction(txnData);
  }

  // Reset
  form.reset();
  setDefaultDate();
  resetToCreateMode();

  const toggleBtns = form.querySelectorAll('.type-toggle');
  toggleBtns.forEach(b => {
    b.removeAttribute('data-active');
    b.classList.remove('bg-rose-500/20', 'text-rose-400', 'bg-emerald-500/20', 'text-emerald-400');
    b.classList.add('text-vault-muted');
  });
  if (toggleBtns[0]) {
    toggleBtns[0].setAttribute('data-active', 'true');
    toggleBtns[0].classList.remove('text-vault-muted');
    toggleBtns[0].classList.add('bg-rose-500/20', 'text-rose-400');
  }

  closeTransactionModal();
}

// ═══════════════════════════════════════════════════════
// CATEGORY CRUD
// ═══════════════════════════════════════════════════════

function initCategoryModal() {
  const openBtn = document.getElementById('add-category-btn');
  const modal = document.getElementById('category-modal');
  const closeBtn = document.getElementById('category-modal-close');
  const backdrop = document.getElementById('category-modal-backdrop');
  const form = document.getElementById('category-form');
  const modalTitle = document.getElementById('category-modal-title');
  const submitBtn = document.getElementById('category-submit-btn');

  if (!openBtn || !modal || !form) return;

  openBtn.addEventListener('click', () => {
    editingCatId = null;
    if (modalTitle) modalTitle.textContent = 'New Category ✨';
    if (submitBtn) submitBtn.textContent = 'Add Category 🎀';
    form.reset();
    openCatModal(modal, form);
  });

  const close = () => closeCatModal(modal);

  closeBtn?.addEventListener('click', close);
  backdrop?.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('modal-active')) close();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nameInput = form.querySelector('#cat-name');
    const budgetInput = form.querySelector('#cat-budget');
    const nameVal = nameInput?.value?.trim();
    const budgetVal = parseFloat(budgetInput?.value) || 0;

    if (!nameVal || nameVal.length < 2) {
      nameInput?.classList.add('input-error');
      nameInput?.focus();
      return;
    }

    if (editingCatId) {
      // ─── UPDATE MODE ───
      // Check duplicate name (excluding current)
      const exists = appState.categories.some(
        c => c.id !== editingCatId && c.name.toLowerCase() === nameVal.toLowerCase()
      );
      if (exists) {
        nameInput?.classList.add('input-error');
        showFieldError('cat-name', 'Category name already exists!');
        return;
      }
      await appState.updateCategory(editingCatId, { name: nameVal, budgeted: budgetVal });
    } else {
      // ─── CREATE MODE ───
      const exists = appState.categories.some(c => c.name.toLowerCase() === nameVal.toLowerCase());
      if (exists) {
        nameInput?.classList.add('input-error');
        showFieldError('cat-name', 'Category already exists!');
        return;
      }
      await appState.addCategory(nameVal, budgetVal);
    }

    form.reset();
    editingCatId = null;
    close();
  });

  form.querySelectorAll('input').forEach(input => {
    input.addEventListener('focus', () => {
      input.classList.remove('input-error');
      clearFieldError(input);
    });
  });
}

/**
 * Open category modal in edit mode with pre-filled data.
 */
function openEditCategory(catId) {
  const cat = appState.categories.find(c => c.id === catId);
  if (!cat) return;

  editingCatId = catId;

  const modal = document.getElementById('category-modal');
  const form = document.getElementById('category-form');
  const modalTitle = document.getElementById('category-modal-title');
  const submitBtn = document.getElementById('category-submit-btn');

  if (modalTitle) modalTitle.textContent = 'Edit Category ✏️';
  if (submitBtn) submitBtn.textContent = 'Save Changes 🎀';

  // Pre-fill
  const nameInput = form?.querySelector('#cat-name');
  const budgetInput = form?.querySelector('#cat-budget');
  if (nameInput) nameInput.value = cat.name;
  if (budgetInput) budgetInput.value = cat.budgeted;

  openCatModal(modal, form);
}

function openCatModal(modal, form) {
  if (modal) {
    modal.classList.add('modal-active');
    document.body.style.overflow = 'hidden';
    setTimeout(() => form?.querySelector('#cat-name')?.focus(), 150);
  }
}

function closeCatModal(modal) {
  if (modal) {
    modal.classList.remove('modal-active');
    document.body.style.overflow = '';
    editingCatId = null;
  }
}

// Listen for close event when modal closes (to reset create mode)
window.addEventListener('vault:modalClosed', () => {
  resetToCreateMode();
});

// ─── Helpers ───

function showFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  const errorEl = document.getElementById(`${fieldId}-error`);
  if (field) field.classList.add('input-error');
  if (errorEl) { errorEl.textContent = message; errorEl.classList.remove('hidden'); }
}

function clearFieldError(input) {
  input.classList.remove('input-error');
  const errorEl = document.getElementById(`${input.id}-error`);
  if (errorEl) { errorEl.textContent = ''; errorEl.classList.add('hidden'); }
}

function sanitizeText(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML.trim();
}

function formatDate(isoStr) {
  return new Date(isoStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Income Modal ───

function initIncomeModal() {
  const modal = document.getElementById('income-modal');
  const form = document.getElementById('income-form');
  const closeBtn = document.getElementById('income-modal-close');
  const backdrop = document.getElementById('income-modal-backdrop');

  const openBtn = document.getElementById('edit-income-btn');
  const mobileOpenBtn = document.getElementById('mobile-edit-income-btn');

  const openModal = () => {
    if (!modal) return;
    const input = document.getElementById('inc-amount');
    if (input) input.value = appState.budget.totalIncome;
    modal.classList.add('modal-active');
    document.body.style.overflow = 'hidden';
    setTimeout(() => input?.focus(), 150);
  };

  const closeModal = () => {
    if (!modal) return;
    modal.classList.remove('modal-active');
    document.body.style.overflow = '';
  };

  if (openBtn) openBtn.addEventListener('click', openModal);
  if (mobileOpenBtn) mobileOpenBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (backdrop) backdrop.addEventListener('click', closeModal);

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const amount = parseFloat(document.getElementById('inc-amount')?.value) || 0;
      await appState.updateIncome(amount);
      closeModal();
    });
  }
}

export default { initForms };
