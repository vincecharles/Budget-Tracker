/**
 * ═══════════════════════════════════════════════════════
 * ROUTER.JS — Lightweight Hash-Based SPA Router
 * Route protection: checks auth on every navigation.
 * ═══════════════════════════════════════════════════════
 */

import { isLoggedIn, logout } from './auth.js';

// ─── Route Registry ───
const ROUTES = ['dashboard', 'expenses', 'investments', 'transactions'];
const DEFAULT_ROUTE = 'dashboard';

// ─── DOM Cache ───
let views = {};
let navLinks = [];
let logoutBtn = null;

/**
 * Initialize router — bind sidebar links, listen to hashchange.
 */
export function initRouter() {
  // Cache all view sections
  ROUTES.forEach(route => {
    views[route] = document.querySelector(`[data-view="${route}"]`);
  });

  // Cache sidebar nav links with data-route
  navLinks = document.querySelectorAll('[data-route]');

  // Bind click events on sidebar links
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const route = link.getAttribute('data-route');
      if (route) {
        window.location.hash = `#/${route}`;
      }
    });
  });

  // Bind logout button
  logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleLogout();
    });
  }

  // Listen for hash changes
  window.addEventListener('hashchange', () => navigate());

  // Initial navigation
  navigate();
}

/**
 * Navigate to the current hash route.
 * Route protection: if not logged in, force login view.
 */
function navigate() {
  // ─── Route Protection ───
  if (!isLoggedIn()) {
    const loginView = document.getElementById('login-view');
    const appLayout = document.getElementById('app-layout');
    if (loginView) loginView.classList.remove('hidden');
    if (appLayout) appLayout.classList.add('hidden');
    return;
  }

  // Parse route from hash
  const hash = window.location.hash.replace('#/', '').replace('#', '');
  const route = ROUTES.includes(hash) ? hash : DEFAULT_ROUTE;

  // If hash was empty or invalid, silently update it
  if (!hash || !ROUTES.includes(hash)) {
    history.replaceState(null, '', `#/${DEFAULT_ROUTE}`);
  }

  // ─── Toggle Views ───
  ROUTES.forEach(r => {
    const view = views[r];
    if (!view) return;
    if (r === route) {
      view.classList.remove('hidden');
    } else {
      view.classList.add('hidden');
    }
  });

  // ─── Update Active Sidebar State ───
  updateActiveNav(route);

  // ─── Close mobile drawer after navigation ───
  closeMobileDrawer();
}

/**
 * Highlight the active sidebar link.
 */
function updateActiveNav(activeRoute) {
  navLinks.forEach(link => {
    const route = link.getAttribute('data-route');
    const isActive = route === activeRoute;

    if (isActive) {
      link.classList.add('bg-vault-card', 'text-vault-green', 'nav-active');
      link.classList.remove('text-vault-text', 'text-vault-muted');
      // Also update the icon color
      const icon = link.querySelector('i, [data-lucide]');
      if (icon) icon.classList.add('text-vault-green');
    } else {
      link.classList.remove('bg-vault-card', 'text-vault-green', 'nav-active');
      link.classList.add('text-vault-text');
      const icon = link.querySelector('i, [data-lucide]');
      if (icon) icon.classList.remove('text-vault-green');
    }
  });
}

/**
 * Close the mobile drawer (if open).
 */
function closeMobileDrawer() {
  const drawer = document.getElementById('mobile-drawer');
  const backdrop = document.getElementById('mobile-backdrop');
  const hamburger = document.getElementById('hamburger-btn');

  if (drawer && window.innerWidth < 768) {
    drawer.classList.add('-translate-x-full');
    if (backdrop) {
      backdrop.classList.add('opacity-0', 'pointer-events-none');
    }
    if (hamburger) {
      hamburger.setAttribute('aria-expanded', 'false');
    }
    document.body.style.overflow = '';
  }
}

/**
 * Handle logout — clear auth and show login view.
 */
function handleLogout() {
  logout();
  const loginView = document.getElementById('login-view');
  const appLayout = document.getElementById('app-layout');
  if (appLayout) appLayout.classList.add('hidden');
  if (loginView) {
    loginView.classList.remove('hidden', 'login-exit');
  }
  window.location.hash = '';
}

export default { initRouter };
