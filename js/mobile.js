/**
 * ═══════════════════════════════════════════════════════
 * MOBILE.JS — Mobile Menu, Drawer & FAB Logic
 * Handles hamburger toggle, slide-in drawer, and the
 * floating action button for quick transactions.
 * ═══════════════════════════════════════════════════════
 */

// ─── DOM References ───
let hamburgerBtn, drawerCloseBtn, mobileDrawer, mobileBackdrop, fabBtn;
let isDrawerOpen = false;

// ─── Touch tracking for swipe-to-close ───
let touchStartX = 0;
let touchCurrentX = 0;
let isSwiping = false;

/**
 * Initialize mobile interactions.
 */
export function initMobile() {
  hamburgerBtn = document.getElementById('hamburger-btn');
  drawerCloseBtn = document.getElementById('drawer-close-btn');
  mobileDrawer = document.getElementById('mobile-drawer');
  mobileBackdrop = document.getElementById('mobile-backdrop');
  fabBtn = document.getElementById('fab-btn');

  if (hamburgerBtn) {
    hamburgerBtn.addEventListener('click', openDrawer);
  }

  if (drawerCloseBtn) {
    drawerCloseBtn.addEventListener('click', closeDrawer);
  }

  if (mobileBackdrop) {
    mobileBackdrop.addEventListener('click', closeDrawer);
  }

  if (fabBtn) {
    fabBtn.addEventListener('click', openTransactionModal);
  }

  // Sidebar Quick Transaction button
  const sidebarBtn = document.getElementById('sidebar-quick-transaction-btn');
  if (sidebarBtn) {
    sidebarBtn.addEventListener('click', openTransactionModal);
  }

  // Swipe-to-close gesture
  if (mobileDrawer) {
    mobileDrawer.addEventListener('touchstart', handleTouchStart, { passive: true });
    mobileDrawer.addEventListener('touchmove', handleTouchMove, { passive: false });
    mobileDrawer.addEventListener('touchend', handleTouchEnd, { passive: true });
  }

  // Close drawer on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isDrawerOpen) {
      closeDrawer();
    }
  });
}

/**
 * Open the mobile navigation drawer.
 */
function openDrawer() {
  if (!mobileDrawer || !mobileBackdrop || !hamburgerBtn) return;

  isDrawerOpen = true;

  mobileDrawer.classList.remove('-translate-x-full');
  mobileDrawer.classList.add('translate-x-0');

  mobileBackdrop.classList.remove('opacity-0', 'pointer-events-none');
  mobileBackdrop.classList.add('opacity-100');
  mobileBackdrop.setAttribute('aria-hidden', 'false');

  hamburgerBtn.setAttribute('aria-expanded', 'true');

  // Prevent body scroll
  document.body.style.overflow = 'hidden';

  // Focus the close button
  setTimeout(() => {
    drawerCloseBtn?.focus();
  }, 100);
}

/**
 * Close the mobile navigation drawer.
 */
function closeDrawer() {
  if (!mobileDrawer || !mobileBackdrop || !hamburgerBtn) return;

  isDrawerOpen = false;

  mobileDrawer.classList.remove('translate-x-0');
  mobileDrawer.classList.add('-translate-x-full');

  mobileBackdrop.classList.remove('opacity-100');
  mobileBackdrop.classList.add('opacity-0', 'pointer-events-none');
  mobileBackdrop.setAttribute('aria-hidden', 'true');

  hamburgerBtn.setAttribute('aria-expanded', 'false');

  // Restore body scroll
  document.body.style.overflow = '';

  // Return focus to hamburger
  hamburgerBtn?.focus();
}

// ─── Swipe-to-close Gesture ───

function handleTouchStart(e) {
  touchStartX = e.touches[0].clientX;
  isSwiping = true;
}

function handleTouchMove(e) {
  if (!isSwiping) return;
  touchCurrentX = e.touches[0].clientX;

  const diff = touchStartX - touchCurrentX;
  if (diff > 10) {
    // Swiping left — move drawer
    const translateX = Math.min(0, -diff);
    mobileDrawer.style.transform = `translateX(${translateX}px)`;
    mobileDrawer.style.transition = 'none';
    e.preventDefault();
  }
}

function handleTouchEnd() {
  if (!isSwiping) return;
  isSwiping = false;

  const diff = touchStartX - touchCurrentX;

  // Reset inline transform
  mobileDrawer.style.transform = '';
  mobileDrawer.style.transition = '';

  if (diff > 80) {
    // Threshold passed – close drawer
    closeDrawer();
  }
}

// ─── Transaction Modal ───

/**
 * Open the Quick Transaction modal.
 */
export function openTransactionModal() {
  const modal = document.getElementById('transaction-modal');
  if (!modal) return;

  modal.classList.add('modal-active');
  document.body.style.overflow = 'hidden';

  if (isDrawerOpen) closeDrawer();

  setTimeout(() => {
    const firstInput = modal.querySelector('input');
    firstInput?.focus();
  }, 150);

  const closeBtn = document.getElementById('modal-close-btn');
  const backdrop = document.getElementById('modal-backdrop');

  closeBtn?.addEventListener('click', closeTransactionModal);
  backdrop?.addEventListener('click', closeTransactionModal);

  document.addEventListener('keydown', handleModalEscape);
}

/**
 * Close the Quick Transaction modal.
 */
export function closeTransactionModal() {
  const modal = document.getElementById('transaction-modal');
  if (!modal) return;

  modal.classList.remove('modal-active');
  document.body.style.overflow = '';

  document.removeEventListener('keydown', handleModalEscape);

  window.dispatchEvent(new CustomEvent('vault:modalClosed'));

  const fabBtn = document.getElementById('fab-btn');
  const sidebarBtn = document.getElementById('sidebar-quick-transaction-btn');
  if (window.innerWidth < 768 && fabBtn) fabBtn.focus();
  else if (sidebarBtn) sidebarBtn.focus();
}

function handleModalEscape(e) {
  if (e.key === 'Escape') closeTransactionModal();
}

export default { initMobile, closeTransactionModal, openTransactionModal };
