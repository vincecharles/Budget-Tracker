/**
 * ═══════════════════════════════════════════════════════
 * AUTH.JS — Cloud-Synced Auth (Neon + Netlify)
 * Validates credentials via /api/auth API.
 * ═══════════════════════════════════════════════════════
 */

import appState from './state.js';

const SESSION_KEY = 'vaultLedger_session';
const ONBOARDED_KEY = 'vaultLedger_onboarded';

export function isLoggedIn() {
  return !!localStorage.getItem(SESSION_KEY);
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

function setSession(token) {
  localStorage.setItem(SESSION_KEY, token);
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(ONBOARDED_KEY);
}

export function initAuth() {
  const loginView = document.getElementById('login-view');
  const onboardingView = document.getElementById('onboarding-view');
  const appLayout = document.getElementById('app-layout');

  if (!loginView || !appLayout) return true;

  setupLoginForm(loginView, onboardingView, appLayout);

  if (onboardingView) {
    setupWizard(onboardingView, appLayout);
  }

  if (isLoggedIn()) {
    loginView.classList.add('hidden');
    if (isOnboarded()) {
      if (onboardingView) onboardingView.classList.add('hidden');
      appLayout.classList.remove('hidden');
      return true;
    } else {
      if (onboardingView) onboardingView.classList.remove('hidden');
      appLayout.classList.add('hidden');
      return false;
    }
  } else {
    loginView.classList.remove('hidden');
    if (onboardingView) onboardingView.classList.add('hidden');
    appLayout.classList.add('hidden');
    return false;
  }
}

function setupLoginForm(loginView, onboardingView, appLayout) {
  const form = document.getElementById('login-form');
  const userInput = document.getElementById('login-username');
  const passInput = document.getElementById('login-password');
  const errorMsg = document.getElementById('login-error');

  if (!form) return;

  [userInput, passInput].forEach(input => {
    input?.addEventListener('focus', () => {
      input.classList.remove('input-error');
      if (errorMsg) {
        errorMsg.textContent = '';
        errorMsg.classList.add('hidden');
      }
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = userInput?.value?.trim();
    const password = passInput?.value?.trim();

    if (!username || !password) {
      showLoginError(errorMsg, 'Please enter both username and password.');
      return;
    }

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (res.ok) {
        const data = await res.json();
        setSession(data.token);
        
        // Populate state with user info
        appState._state.user.name = data.user.username;
        appState._state.user.id = data.user.id;

        loginView.classList.add('login-exit');
        setTimeout(() => {
          loginView.classList.add('hidden');
          loginView.classList.remove('login-exit');

          if (isOnboarded()) {
            if (onboardingView) onboardingView.classList.add('hidden');
            appLayout.classList.remove('hidden');
            window.dispatchEvent(new CustomEvent('vault:authenticated'));
          } else {
            if (onboardingView) onboardingView.classList.remove('hidden');
          }
        }, 400);
      } else {
        const err = await res.json();
        showLoginError(errorMsg, err.error || 'Invalid credentials 💔');
        form.style.animation = 'inputShake 0.3s ease-in-out';
        setTimeout(() => { form.style.animation = ''; }, 300);
      }
    } catch (err) {
      showLoginError(errorMsg, 'Offline or server error. Check your connection.');
    }
  });
}

function showLoginError(el, msg) {
  if (el) {
    el.textContent = msg;
    el.classList.remove('hidden');
  }
}

function setupWizard(onboardingView, appLayout) {
  const steps = onboardingView.querySelectorAll('[data-step]');
  const dots = onboardingView.querySelectorAll('[data-dot]');
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

  const step2Back = document.getElementById('step2-back');
  if (step2Back) step2Back.addEventListener('click', () => goToStep(1, steps, dots));

  const step2Done = document.getElementById('step2-done');
  if (step2Done) {
    step2Done.addEventListener('click', () => finishOnboarding(onboardingView, appLayout));
  }
}

function goToStep(stepNum, steps, dots) {
  steps.forEach(s => {
    const sNum = parseInt(s.getAttribute('data-step'));
    s.classList.toggle('hidden', sNum !== stepNum);
    if (sNum === stepNum) s.style.animation = 'stepSlideIn 0.4s cubic-bezier(0.21, 1.02, 0.73, 1) forwards';
  });
  dots?.forEach(d => {
    const dNum = parseInt(d.getAttribute('data-dot'));
    d.classList.toggle('bg-pink-400', dNum === stepNum);
    d.classList.toggle('scale-125', dNum === stepNum);
    d.classList.toggle('bg-white/20', dNum !== stepNum);
  });
}

function prefillBudgets(income) {
  const suggestions = { 'cat_food': 0.15, 'cat_groceries': 0.20, 'cat_bills': 0.10, 'cat_rent': 0.30, 'cat_transport': 0.10, 'cat_shopping': 0.10 };
  for (const [catId, pct] of Object.entries(suggestions)) {
    const input = document.getElementById(`budget-${catId}`);
    if (input && !input.value) input.value = Math.round(income * pct);
  }
}

async function finishOnboarding(onboardingView, appLayout) {
  const income = parseFloat(document.getElementById('onboard-income')?.value) || 0;
  const categoryBudgets = {};
  
  // Create default categories in DB if they don't exist by iterating over inputs
  // For brevity/simplicity in this project, we'll just push them to the DB.
  
  await appState.updateIncome(income);
  
  // Simple approach: categories are created when budgets are set
  for (const cat of appState.categories) {
    const input = document.getElementById(`budget-${cat.id}`);
    if (input) {
      await appState.updateCategory(cat.id, { budgeted: parseFloat(input.value) || 0 });
    }
  }

  completeOnboarding();
  onboardingView.classList.add('login-exit');
  setTimeout(() => {
    onboardingView.classList.add('hidden');
    appLayout.classList.remove('hidden');
    window.dispatchEvent(new CustomEvent('vault:authenticated'));
  }, 400);
}

export default { isLoggedIn, isOnboarded, completeOnboarding, resetOnboarding, logout, initAuth };
