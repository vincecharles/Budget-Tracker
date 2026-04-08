/**
 * ═══════════════════════════════════════════════════════
 * SIDEBAR.JS — Sidebar State & Safe-to-Spend Pill
 * ═══════════════════════════════════════════════════════
 */

import appState from './state.js';
import { exportToExcel, importFromExcel } from './excel.js';

export function initSidebar() {
  updateSafeToSpendPill();
  appState.subscribe(() => updateSafeToSpendPill());

  // ─── Export & Import Buttons ───
  const exportBtn = document.getElementById('export-excel-btn');
  const importBtn = document.getElementById('import-excel-btn');
  const fileInput = document.getElementById('excel-file-input');

  exportBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (window.XLSX) {
      exportToExcel();
    } else {
      alert("Excel library is still loading. Please wait a moment.");
    }
  });

  importBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    fileInput?.click();
  });

  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      if (window.XLSX) {
        importFromExcel(file);
        e.target.value = ''; // Reset allows selecting the same file again
      } else {
        alert("Excel library is still loading. Please wait a moment.");
      }
    }
  });
}

function updateSafeToSpendPill() {
  const el = document.getElementById('sidebar-safe-to-spend');
  if (el) {
    const amount = appState.safeToSpend;
    el.textContent = `Safe to Spend: ₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
}

export default { initSidebar };
