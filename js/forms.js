/**
 * ═══════════════════════════════════════════════════════
 * FORMS.JS — Client-Side Form Validation
 * Quick Transaction modal + Add Category modal.
 * ═══════════════════════════════════════════════════════
 */

import appState from './state.js';
import { closeTransactionModal } from './mobile.js';

/**
 * Initialize form validation and submission.
 */
export function initForms() {
  const form = document.getElementById('transaction-form');
  if (!form) return;

  // Populate category dropdown from state
  populateCategories();

  // Set default date to today
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

  // Set first toggle as active
  if (toggleBtns[0]) {
    toggleBtns[0].setAttribute('data-active', 'true');
  }

  // Clear errors on focus
  const inputs = form.querySelectorAll('input, select');
  inputs.forEach(input => {
    input.addEventListener('focus', () => clearFieldError(input));
  });

  // Form submission
  form.addEventListener('submit', handleFormSubmit);

  // Re-populate categories on state change
  appState.subscribe(() => populateCategories());

  // ─── Add Category Modal Logic ───
  initCategoryModal();
}

/**
 * Set date input default to today.
 */
function setDefaultDate() {
  const dateInput = document.getElementById('txn-date');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
    dateInput.max = today; // Prevent future dates
  }
}

/**
 * Populate the category <select> from state.
 */
function populateCategories() {
  const select = document.getElementById('txn-category');
  if (!select) return;

  const currentValue = select.value;

  // Clear existing options (keep placeholder)
  while (select.options.length > 1) {
    select.remove(1);
  }

  appState.categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = cat.name;
    select.appendChild(opt);
  });

  if (currentValue) {
    select.value = currentValue;
  }
}

/**
 * Handle form submission with strict validation.
 */
function handleFormSubmit(e) {
  e.preventDefault();

  const form = e.target;
  const errors = [];

  // ─── Gather values ───
  const rawDescription = form.querySelector('#txn-description').value;
  const rawAmount = form.querySelector('#txn-amount').value;
  const rawCategory = form.querySelector('#txn-category').value;
  const rawDate = form.querySelector('#txn-date')?.value;
  const activeToggle = form.querySelector('.type-toggle[data-active="true"]');
  const txnType = activeToggle ? activeToggle.getAttribute('data-type') : 'expense';

  // ─── Sanitize ───
  const description = sanitizeText(rawDescription);

  // ─── Validate description ───
  if (!description || description.trim().length === 0) {
    errors.push({ field: 'txn-description', message: 'Description is required.' });
  } else if (description.trim().length < 2) {
    errors.push({ field: 'txn-description', message: 'Description must be at least 2 characters.' });
  } else if (description.trim().length > 120) {
    errors.push({ field: 'txn-description', message: 'Description must be 120 characters or less.' });
  }

  // ─── Validate amount ───
  const amount = parseFloat(rawAmount);
  if (rawAmount === '' || rawAmount === null || rawAmount === undefined) {
    errors.push({ field: 'txn-amount', message: 'Amount is required.' });
  } else if (isNaN(amount)) {
    errors.push({ field: 'txn-amount', message: 'Please enter a valid number.' });
  } else if (amount <= 0) {
    errors.push({ field: 'txn-amount', message: 'Amount must be greater than zero.' });
  } else if (amount > 999999.99) {
    errors.push({ field: 'txn-amount', message: 'Amount exceeds maximum allowed.' });
  } else {
    const parts = rawAmount.split('.');
    if (parts.length === 2 && parts[1].length > 2) {
      errors.push({ field: 'txn-amount', message: 'Maximum 2 decimal places allowed.' });
    }
  }

  // ─── Validate category ───
  if (!rawCategory) {
    errors.push({ field: 'txn-category', message: 'Please select a category.' });
  } else {
    const validCat = appState.categories.find(c => c.id === rawCategory);
    if (!validCat) {
      errors.push({ field: 'txn-category', message: 'Invalid category selected.' });
    }
  }

  // ─── Display errors or submit ───
  if (errors.length > 0) {
    errors.forEach(err => showFieldError(err.field, err.message));
    const firstErrorField = document.getElementById(errors[0].field);
    firstErrorField?.focus();
    return;
  }

  // ─── Parse date (default to today) ───
  const txnDate = rawDate ? new Date(rawDate + 'T12:00:00').toISOString() : new Date().toISOString();

  // ─── Submit valid transaction ───
  const transaction = {
    description: description.trim(),
    amount: txnType === 'expense' ? -Math.abs(amount) : Math.abs(amount),
    category: rawCategory,
    type: txnType,
    date: txnDate,
    subtitle: `Manual Entry • ${formatDate(txnDate)}`,
    icon: txnType === 'expense' ? 'minus-circle' : 'plus-circle',
  };

  appState.addTransaction(transaction);

  // Reset form
  form.reset();
  setDefaultDate();
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

// ─── Add Category Modal ───

function initCategoryModal() {
  const openBtn = document.getElementById('add-category-btn');
  const modal = document.getElementById('category-modal');
  const closeBtn = document.getElementById('category-modal-close');
  const backdrop = document.getElementById('category-modal-backdrop');
  const form = document.getElementById('category-form');

  if (!openBtn || !modal || !form) return;

  openBtn.addEventListener('click', () => {
    modal.classList.add('modal-active');
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
      form.querySelector('#cat-name')?.focus();
    }, 150);
  });

  const close = () => {
    modal.classList.remove('modal-active');
    document.body.style.overflow = '';
  };

  closeBtn?.addEventListener('click', close);
  backdrop?.addEventListener('click', close);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('modal-active')) {
      close();
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const nameInput = form.querySelector('#cat-name');
    const budgetInput = form.querySelector('#cat-budget');
    const nameVal = nameInput?.value?.trim();
    const budgetVal = parseFloat(budgetInput?.value) || 0;

    // Validate name
    if (!nameVal || nameVal.length < 2) {
      nameInput?.classList.add('input-error');
      nameInput?.focus();
      return;
    }

    // Check for duplicates
    const exists = appState.categories.some(c => c.name.toLowerCase() === nameVal.toLowerCase());
    if (exists) {
      nameInput?.classList.add('input-error');
      showFieldError('cat-name', 'Category already exists!');
      return;
    }

    // Add to state
    appState.addCategory(nameVal, budgetVal);

    // Reset & close
    form.reset();
    close();
  });

  // Clear error on focus
  form.querySelectorAll('input').forEach(input => {
    input.addEventListener('focus', () => {
      input.classList.remove('input-error');
      clearFieldError(input);
    });
  });
}

// ─── Error Display Helpers ───

function showFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  const errorEl = document.getElementById(`${fieldId}-error`);

  if (field) field.classList.add('input-error');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
  }
}

function clearFieldError(input) {
  input.classList.remove('input-error');
  const errorEl = document.getElementById(`${input.id}-error`);
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.classList.add('hidden');
  }
}

// ─── Sanitization ───

function sanitizeText(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML.trim();
}

// ─── Date Formatter ───

function formatDate(isoStr) {
  const date = new Date(isoStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default { initForms };
