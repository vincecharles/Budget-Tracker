/**
 * ═══════════════════════════════════════════════════════
 * AUTH.JS — Login System (Hardcoded Credentials)
 * User: Erika / Pass: Faye
 * localStorage-backed session persistence.
 * ═══════════════════════════════════════════════════════
 */

import appState from './state.js';

const SESSION_KEY = 'vaultLedger_session';
const ONBOARDED_KEY = 'vaultLedger_onboarded';

// ─── Hardcoded Credentials ───
const VALID_USER = 'Erika';
const VALID_PASS = 'Faye';

// ─── Public API ───

export function isLoggedIn() {
  return localStorage.getItem(SESSION_KEY) === 'true';
}

export function isOnboarded() {
  return localStorage.getItem(ONBOARDED_KEY) === 'true';
}

export function completeOnboarding() {
  localStorage.setItem(ONBOARDED_KEY, 'true');
}

export function resetOnboarding() {
  localStorage.removeItem(ONBOARDED_KEY);
}

function setSession(val) {
  localStorage.setItem(SESSION_KEY, val ? 'true' : '');
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

/**
 * Initialize auth — wire up login form + onboarding wizard.
 * Returns true if user is already fully authenticated + onboarded.
 */
export function initAuth() {
  const loginView = document.getElementById('login-view');
  const onboardingView = document.getElementById('onboarding-view');
  const appLayout = document.getElementById('app-layout');

  if (!loginView || !appLayout) {
    console.warn('[Auth] Missing login or app-layout elements.');
    return true;
  }

  // ─── Wire up login form ───
  setupLoginForm(loginView, onboardingView, appLayout);

  // ─── Wire up onboarding wizard ───
  if (onboardingView) {
    setupWizard(onboardingView, appLayout);
  }

  // ─── Check session state ───
  if (isLoggedIn()) {
    loginView.classList.add('hidden');

    if (isOnboarded()) {
      // Fully authenticated + onboarded → show app
      if (onboardingView) onboardingView.classList.add('hidden');
      appLayout.classList.remove('hidden');
      return true;
    } else {
      // Logged in but not onboarded → show wizard
      if (onboardingView) {
        onboardingView.classList.remove('hidden');
      }
      appLayout.classList.add('hidden');
      return false;
    }
  } else {
    // Not logged in → show login
    loginView.classList.remove('hidden');
    if (onboardingView) onboardingView.classList.add('hidden');
    appLayout.classList.add('hidden');
    return false;
  }
}

/**
 * Set up the login form with credential validation.
 */
function setupLoginForm(loginView, onboardingView, appLayout) {
  const form = document.getElementById('login-form');
  const userInput = document.getElementById('login-username');
  const passInput = document.getElementById('login-password');
  const errorMsg = document.getElementById('login-error');
  const submitBtn = document.getElementById('login-submit');

  if (!form) return;

  // Clear errors on focus
  [userInput, passInput].forEach(input => {
    input?.addEventListener('focus', () => {
      input.classList.remove('input-error');
      if (errorMsg) {
        errorMsg.textContent = '';
        errorMsg.classList.add('hidden');
      }
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const username = userInput?.value?.trim();
    const password = passInput?.value?.trim();

    // Validate
    if (!username || !password) {
      showLoginError(errorMsg, 'Please enter both username and password.');
      if (!username) userInput?.classList.add('input-error');
      if (!password) passInput?.classList.add('input-error');
      return;
    }

    // Check credentials (case-sensitive)
    if (username === VALID_USER && password === VALID_PASS) {
      // ─── Login Success ───
      setSession(true);

      // Set user name in state
      if (!appState.user.name || appState.user.name === '') {
        appState._state.user.name = VALID_USER;
        appState._state.user.id = `usr_${Date.now()}`;
      }

      // Animate out login
      loginView.classList.add('login-exit');
      setTimeout(() => {
        loginView.classList.add('hidden');
        loginView.classList.remove('login-exit');

        if (isOnboarded()) {
          // Already onboarded → go straight to app
          if (onboardingView) onboardingView.classList.add('hidden');
          appLayout.classList.remove('hidden');
          window.dispatchEvent(new CustomEvent('vault:authenticated'));
        } else {
          // First login → show onboarding wizard
          if (onboardingView) {
            onboardingView.classList.remove('hidden');
          }
        }
      }, 400);
    } else {
      // ─── Login Failed ───
      showLoginError(errorMsg, 'Invalid username or password 💔');
      userInput?.classList.add('input-error');
      passInput?.classList.add('input-error');

      // Shake the form
      form.style.animation = 'inputShake 0.3s ease-in-out';
      setTimeout(() => { form.style.animation = ''; }, 300);
    }
  });
}

function showLoginError(el, msg) {
  if (el) {
    el.textContent = msg;
    el.classList.remove('hidden');
  }
}

/**
 * Set up the 2-step onboarding wizard (income + budgets).
 */
function setupWizard(onboardingView, appLayout) {
  const steps = onboardingView.querySelectorAll('[data-step]');
  const dots = onboardingView.querySelectorAll('[data-dot]');

  // Step 1 (Income) → Step 2 (Budgets)
  const step1Next = document.getElementById('step1-next');
  if (step1Next) {
    step1Next.addEventListener('click', () => {
      const incomeInput = document.getElementById('onboard-income');
      const income = parseFloat(incomeInput?.value);
      if (!income || income <= 0) {
        incomeInput?.classList.add('input-error');
        incomeInput?.focus();
        return;
      }
      incomeInput?.classList.remove('input-error');
      prefillBudgets(income);
      goToStep(2, steps, dots);
    });
  }

  // Step 2 Back
  const step2Back = document.getElementById('step2-back');
  if (step2Back) {
    step2Back.addEventListener('click', () => {
      goToStep(1, steps, dots);
    });
  }

  // Step 2 Done
  const step2Done = document.getElementById('step2-done');
  if (step2Done) {
    step2Done.addEventListener('click', () => {
      finishOnboarding(onboardingView, appLayout);
    });
  }

  // Enter key on income input
  document.getElementById('onboard-income')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); step1Next?.click(); }
  });
}

/**
 * Animate between wizard steps.
 */
function goToStep(stepNum, steps, dots) {
  steps.forEach(s => {
    const sNum = parseInt(s.getAttribute('data-step'));
    if (sNum === stepNum) {
      s.classList.remove('hidden');
      s.style.animation = 'stepSlideIn 0.4s cubic-bezier(0.21, 1.02, 0.73, 1) forwards';
    } else {
      s.classList.add('hidden');
      s.style.animation = '';
    }
  });
  dots?.forEach(d => {
    const dNum = parseInt(d.getAttribute('data-dot'));
    if (dNum === stepNum) {
      d.classList.add('bg-pink-400', 'scale-125');
      d.classList.remove('bg-white/20');
    } else if (dNum < stepNum) {
      d.classList.add('bg-pink-400/50');
      d.classList.remove('bg-white/20', 'scale-125');
    } else {
      d.classList.remove('bg-pink-400', 'bg-pink-400/50', 'scale-125');
      d.classList.add('bg-white/20');
    }
  });
}

/**
 * Pre-fill suggested budget amounts based on income.
 */
function prefillBudgets(income) {
  const suggestions = {
    'cat_food': 0.15,
    'cat_groceries': 0.20,
    'cat_bills': 0.10,
    'cat_rent': 0.30,
    'cat_transport': 0.10,
    'cat_shopping': 0.10,
  };

  for (const [catId, pct] of Object.entries(suggestions)) {
    const input = document.getElementById(`budget-${catId}`);
    if (input && !input.value) {
      input.value = Math.round(income * pct);
    }
  }
}

/**
 * Finish onboarding — save data and transition to app.
 */
function finishOnboarding(onboardingView, appLayout) {
  const income = parseFloat(document.getElementById('onboard-income')?.value) || 0;

  // Gather category budgets
  const categoryBudgets = {};
  appState.categories.forEach(cat => {
    const input = document.getElementById(`budget-${cat.id}`);
    if (input) {
      categoryBudgets[cat.id] = parseFloat(input.value) || 0;
    }
  });

  // Save to state
  appState.completeOnboarding({ name: VALID_USER, monthlyIncome: income, categoryBudgets });
  completeOnboarding();

  // Animate transition
  onboardingView.classList.add('login-exit');
  setTimeout(() => {
    onboardingView.classList.add('hidden');
    appLayout.classList.remove('hidden');
    window.dispatchEvent(new CustomEvent('vault:authenticated'));
  }, 400);
}

export default { isLoggedIn, isOnboarded, completeOnboarding, resetOnboarding, logout, initAuth };
