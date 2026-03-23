/**
 * ═══════════════════════════════════════════════════════
 * AUTH.JS — Mock Authentication Module
 * localStorage-backed login state with form-based UX.
 * ═══════════════════════════════════════════════════════
 */

const AUTH_KEY = 'vaultLedger_isLoggedIn';

// ─── Public API ───

export function isLoggedIn() {
  return localStorage.getItem(AUTH_KEY) === 'true';
}

export function login(email, password) {
  if (!email || !email.trim()) {
    return { success: false, error: 'Please enter your email address.' };
  }
  if (!password || !password.trim()) {
    return { success: false, error: 'Please enter your password.' };
  }
  // Mock validation — accepts any well-formed input
  if (!email.includes('@')) {
    return { success: false, error: 'Please enter a valid email address.' };
  }
  if (password.length < 4) {
    return { success: false, error: 'Password must be at least 4 characters.' };
  }

  localStorage.setItem(AUTH_KEY, 'true');
  return { success: true };
}

export function logout() {
  localStorage.removeItem(AUTH_KEY);
}

/**
 * Initialize auth — wire up the login form and toggle views.
 * Returns true if user is authenticated (so boot can continue).
 */
export function initAuth() {
  const loginView = document.getElementById('login-view');
  const appLayout = document.getElementById('app-layout');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const loginBtn = document.getElementById('login-btn');
  const passwordToggle = document.getElementById('password-toggle');
  const passwordInput = document.getElementById('login-password');

  if (!loginView || !appLayout) {
    console.warn('[Auth] Missing login-view or app-layout elements.');
    return true;
  }

  // ─── Password show/hide toggle ───
  if (passwordToggle && passwordInput) {
    passwordToggle.addEventListener('click', () => {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';
      // Swap icon
      const icon = passwordToggle.querySelector('i');
      if (icon) {
        icon.setAttribute('data-lucide', isPassword ? 'eye-off' : 'eye');
        if (window.lucide) window.lucide.createIcons({ nodes: [passwordToggle] });
      }
    });
  }

  // ─── Form submit handler (supports Enter key) ───
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const email = document.getElementById('login-email')?.value;
      const password = passwordInput?.value;

      // Clear previous errors
      if (loginError) {
        loginError.classList.add('hidden');
        loginError.textContent = '';
      }

      // Show loading state
      if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.innerHTML = `
          <span class="login-spinner"></span>
          <span>Authenticating…</span>
        `;
      }

      // Simulate network delay for realism
      setTimeout(() => {
        const result = login(email, password);

        if (result.success) {
          // Transition to app
          loginView.classList.add('login-exit');
          setTimeout(() => {
            loginView.classList.add('hidden');
            appLayout.classList.remove('hidden');
            // Dispatch a custom event so app.js can finish booting
            window.dispatchEvent(new CustomEvent('vault:authenticated'));
          }, 400);
        } else {
          // Show error
          if (loginError) {
            loginError.textContent = result.error;
            loginError.classList.remove('hidden');
          }
          // Reset button
          if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.innerHTML = `
              <i data-lucide="log-in" class="w-4 h-4"></i>
              <span>Sign In</span>
            `;
            if (window.lucide) window.lucide.createIcons({ nodes: [loginBtn] });
          }
        }
      }, 800);
    });
  }

  // ─── Check current auth state ───
  if (isLoggedIn()) {
    loginView.classList.add('hidden');
    appLayout.classList.remove('hidden');
    return true;
  } else {
    loginView.classList.remove('hidden');
    appLayout.classList.add('hidden');
    return false;
  }
}

export default { isLoggedIn, login, logout, initAuth };
