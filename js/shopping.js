import appState from './state.js';
import { showToast } from './notifications.js';

const STORAGE_KEY = 'vaultLedger_shopping';

let shoppingItems = [];

export function initShopping() {
  loadItems();
  
  const form = document.getElementById('shopping-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      addItem();
    });
  }

  const nameInput = document.getElementById('shop-item-name');
  if (nameInput) {
    let debounceTimer;
    nameInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => fetchEstimatedPrice(e.target.value), 500);
    });
  }

  const logBtnDesktop = document.getElementById('shop-log-expense-btn');
  const logBtnMobile = document.getElementById('shop-log-expense-btn-mobile');

  [logBtnDesktop, logBtnMobile].forEach(btn => {
    if (btn) {
      btn.addEventListener('click', () => logCheckedAsExpense());
    }
  });

  renderLists();
}

function loadItems() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      shoppingItems = JSON.parse(saved);
    } catch (e) {
      shoppingItems = [];
    }
  } else {
    shoppingItems = [];
  }
}

async function fetchEstimatedPrice(itemName) {
  if (!itemName || itemName.trim() === '') return;
  
  const priceInput = document.getElementById('shop-item-price');
  // Only auto-fill if the user hasn't already entered a price manually
  if (priceInput.value !== '' && priceInput.value !== '0') return;

  try {
    const res = await fetch(`/api/grocery-prices?q=${encodeURIComponent(itemName)}`, {
      headers: appState._getHeaders() // Add authorization header just in case
    });
    if (res.ok) {
      const data = await res.json();
      if (data.found && data.estimated_price > 0) {
        priceInput.value = data.estimated_price;
        // Visual feedback
        priceInput.classList.add('ring-2', 'ring-emerald-400', 'bg-emerald-400/10');
        setTimeout(() => {
          priceInput.classList.remove('ring-2', 'ring-emerald-400', 'bg-emerald-400/10');
        }, 1000);
      }
    }
  } catch (err) {
    console.error('Failed to fetch estimated price:', err);
  }
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(shoppingItems));
}

function addItem() {
  const nameInput = document.getElementById('shop-item-name');
  const qtyInput = document.getElementById('shop-item-qty');
  const priceInput = document.getElementById('shop-item-price');

  const name = nameInput.value.trim();
  const qty = parseInt(qtyInput.value) || 1;
  const price = parseFloat(priceInput.value) || 0;

  if (!name) return;

  shoppingItems.push({
    id: `shop_${Date.now()}`,
    name,
    qty,
    price,
    checked: false
  });

  saveItems();
  renderLists();

  nameInput.value = '';
  qtyInput.value = '1';
  priceInput.value = '';
  nameInput.focus();
}

export function toggleItem(id) {
  const item = shoppingItems.find(i => i.id === id);
  if (item) {
    item.checked = !item.checked;
    saveItems();
    renderLists();
  }
}

export function deleteItem(id) {
  shoppingItems = shoppingItems.filter(i => i.id !== id);
  saveItems();
  renderLists();
}

async function logCheckedAsExpense() {
  const checkedItems = shoppingItems.filter(i => i.checked);
  if (checkedItems.length === 0) return;

  const totalExpense = checkedItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
  
  if (totalExpense <= 0) {
    showToast('Total is 0. Update prices to log expense!', 'warning');
    return;
  }

  // Find "Groceries" category or create it
  let groceriesCat = appState.categories.find(c => c.name.toLowerCase().includes('grocer'));
  if (!groceriesCat) {
    try {
      groceriesCat = await appState.addCategory('Groceries', 5000);
    } catch (err) {
      console.error(err);
      showToast('Failed to create Groceries category', 'error');
      return;
    }
  }

  // Add transaction
  const description = `Groceries (${checkedItems.length} items)`;
  await appState.addTransaction({
    type: 'expense',
    amount: totalExpense,
    description,
    category: groceriesCat.id,
    date: new Date().toISOString()
  });

  // Remove checked items
  shoppingItems = shoppingItems.filter(i => !i.checked);
  saveItems();
  renderLists();

  showToast(`Logged ₱${totalExpense.toFixed(2)} to Groceries!`, 'success');
}

function renderLists() {
  const activeList = document.getElementById('shop-active-list');
  const checkedList = document.getElementById('shop-checked-list');
  const activeTotalEl = document.getElementById('shop-active-total');
  const checkedTotalEl = document.getElementById('shop-checked-total');
  
  const logBtnDesktop = document.getElementById('shop-log-expense-btn');
  const logBtnMobile = document.getElementById('shop-log-expense-btn-mobile');

  if (!activeList || !checkedList) return;

  const activeItems = shoppingItems.filter(i => !i.checked);
  const checkedItems = shoppingItems.filter(i => i.checked);

  let activeTotal = 0;
  let checkedTotal = 0;

  activeList.innerHTML = activeItems.map(item => {
    const itemTotal = item.qty * item.price;
    activeTotal += itemTotal;
    return `
      <div class="flex items-center justify-between p-3 bg-vault-card border border-vault-border rounded-xl">
        <div class="flex items-center gap-3">
          <input type="checkbox" onchange="window.toggleShopItem('${item.id}')" 
            class="w-4 h-4 rounded border-vault-muted text-pink-500 focus:ring-pink-400 bg-vault-surface cursor-pointer" />
          <div>
            <p class="text-sm font-semibold text-vault-text">${item.name}</p>
            <p class="text-[10px] text-vault-muted">Qty: ${item.qty} ${item.price > 0 ? `× ₱${item.price.toFixed(2)}` : ''}</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-xs font-bold text-vault-text">${itemTotal > 0 ? `₱${itemTotal.toFixed(2)}` : ''}</span>
          <button type="button" onclick="window.deleteShopItem('${item.id}')" class="text-vault-muted hover:text-rose-400 transition-colors">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
    `;
  }).join('') || '<p class="text-xs text-vault-muted text-center py-4">No items to buy yet.</p>';

  checkedList.innerHTML = checkedItems.map(item => {
    const itemTotal = item.qty * item.price;
    checkedTotal += itemTotal;
    return `
      <div class="flex items-center justify-between p-3 bg-vault-card/50 border border-vault-border rounded-xl opacity-70">
        <div class="flex items-center gap-3">
          <input type="checkbox" checked onchange="window.toggleShopItem('${item.id}')" 
            class="w-4 h-4 rounded border-vault-muted text-pink-500 focus:ring-pink-400 bg-vault-surface cursor-pointer" />
          <div>
            <p class="text-sm font-semibold text-vault-muted line-through">${item.name}</p>
            <p class="text-[10px] text-vault-muted">Qty: ${item.qty} ${item.price > 0 ? `× ₱${item.price.toFixed(2)}` : ''}</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-xs font-bold text-vault-muted line-through">${itemTotal > 0 ? `₱${itemTotal.toFixed(2)}` : ''}</span>
          <button type="button" onclick="window.deleteShopItem('${item.id}')" class="text-vault-muted hover:text-rose-400 transition-colors">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
    `;
  }).join('') || '<p class="text-xs text-vault-muted text-center py-4">No checked items.</p>';

  activeTotalEl.textContent = `Est: ₱${activeTotal.toFixed(2)}`;
  checkedTotalEl.textContent = `Total: ₱${checkedTotal.toFixed(2)}`;

  const hasChecked = checkedItems.length > 0;
  [logBtnDesktop, logBtnMobile].forEach(btn => {
    if (btn) {
      btn.disabled = !hasChecked;
    }
  });

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

window.toggleShopItem = toggleItem;
window.deleteShopItem = deleteItem;
