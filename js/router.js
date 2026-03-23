/**
 * ═══════════════════════════════════════════════════════
 * ROUTER.JS — Lightweight Hash-Based SPA Router
 * Route protection via onboarding check.
 * ═══════════════════════════════════════════════════════
 */

import { isOnboarded, resetOnboarding } from './auth.js';
import appState from './state.js';

const ROUTES = ['dashboard', 'expenses', 'investments', 'transactions'];
const DEFAULT_ROUTE = 'dashboard';

let views = {};
let navLinks = [];
let logoutBtn = null;

export function initRouter() {
  ROUTES.forEach(route => {
    views[route] = document.querySelector(`[data-view="${route}"]`);
  });

  navLinks = document.querySelectorAll('[data-route]');

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const route = link.getAttribute('data-route');
      if (route) window.location.hash = `#/${route}`;
    });
  });

  logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleLogout();
    });
  }

  window.addEventListener('hashchange', () => navigate());
  navigate();
}

function navigate() {
  // Route protection
  if (!isOnboarded()) {
    const onboardView = document.getElementById('login-view');
    const appLayout = document.getElementById('app-layout');
    if (onboardView) onboardView.classList.remove('hidden');
    if (appLayout) appLayout.classList.add('hidden');
    return;
  }

  const hash = window.location.hash.replace('#/', '').replace('#', '');
  const route = ROUTES.includes(hash) ? hash : DEFAULT_ROUTE;

  if (!hash || !ROUTES.includes(hash)) {
    history.replaceState(null, '', `#/${DEFAULT_ROUTE}`);
  }

  ROUTES.forEach(r => {
    const view = views[r];
    if (!view) return;
    if (r === route) {
      view.classList.remove('hidden');
      view.style.animation = 'viewFadeIn 0.35s ease-out forwards';
    } else {
      view.classList.add('hidden');
      view.style.animation = '';
    }
  });

  updateActiveNav(route);
  closeMobileDrawer();
}

function updateActiveNav(activeRoute) {
  navLinks.forEach(link => {
    const route = link.getAttribute('data-route');
    const isActive = route === activeRoute;

    if (isActive) {
      link.classList.add('bg-vault-card', 'text-pink-400', 'nav-active');
      link.classList.remove('text-vault-text', 'text-vault-muted');
      const icon = link.querySelector('i, [data-lucide]');
      if (icon) icon.classList.add('text-pink-400');
    } else {
      link.classList.remove('bg-vault-card', 'text-pink-400', 'nav-active');
      link.classList.add('text-vault-text');
      const icon = link.querySelector('i, [data-lucide]');
      if (icon) icon.classList.remove('text-pink-400');
    }
  });
}

function closeMobileDrawer() {
  const drawer = document.getElementById('mobile-drawer');
  const backdrop = document.getElementById('mobile-backdrop');
  const hamburger = document.getElementById('hamburger-btn');

  if (drawer && window.innerWidth < 768) {
    drawer.classList.add('-translate-x-full');
    if (backdrop) backdrop.classList.add('opacity-0', 'pointer-events-none');
    if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }
}

function handleLogout() {
  resetOnboarding();
  appState.resetToDefaults();
  // Clear app state from localStorage completely
  localStorage.removeItem('vaultLedgerState');
  const onboardView = document.getElementById('login-view');
  const appLayout = document.getElementById('app-layout');
  if (appLayout) appLayout.classList.add('hidden');
  if (onboardView) {
    onboardView.classList.remove('hidden', 'login-exit');
  }
  window.location.hash = '';
}

export default { initRouter };
