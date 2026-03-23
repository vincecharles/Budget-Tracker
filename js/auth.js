/**
 * ═══════════════════════════════════════════════════════
 * AUTH.JS — Onboarding Flow (replaces Login)
 * No backend needed — localStorage-backed first-run setup.
 * ═══════════════════════════════════════════════════════
 */

import appState from './state.js';

const ONBOARDED_KEY = 'vaultLedger_onboarded';

// ─── Public API ───

export function isOnboarded() {
  return localStorage.getItem(ONBOARDED_KEY) === 'true';
}

export function completeOnboarding() {
  localStorage.setItem(ONBOARDED_KEY, 'true');
}

export function resetOnboarding() {
  localStorage.removeItem(ONBOARDED_KEY);
}

/**
 * Initialize onboarding — wire up the wizard steps.
 * Returns true if user has already completed onboarding.
 */
export function initAuth() {
  const onboardingView = document.getElementById('login-view');
  const appLayout = document.getElementById('app-layout');

  if (!onboardingView || !appLayout) {
    console.warn('[Auth] Missing onboarding or app-layout elements.');
    return true;
  }

  // ─── Wire up wizard navigation ───
  setupWizard(onboardingView, appLayout);

  // ─── Check if already onboarded ───
  if (isOnboarded()) {
    onboardingView.classList.add('hidden');
    appLayout.classList.remove('hidden');
    return true;
  } else {
    onboardingView.classList.remove('hidden');
    appLayout.classList.add('hidden');
    return false;
  }
}

/**
 * Set up the 3-step wizard with slide animations.
 */
function setupWizard(onboardingView, appLayout) {
  const steps = onboardingView.querySelectorAll('[data-step]');
  const dots = onboardingView.querySelectorAll('[data-dot]');
  let currentStep = 1;

  // Step 1 → Step 2
  const step1Next = document.getElementById('step1-next');
  if (step1Next) {
    step1Next.addEventListener('click', () => {
      const nameInput = document.getElementById('onboard-name');
      const name = nameInput?.value?.trim();
      if (!name) {
        nameInput?.classList.add('input-error');
        nameInput?.focus();
        return;
      }
      nameInput?.classList.remove('input-error');
      goToStep(2, steps, dots);
      currentStep = 2;
    });
  }

  // Step 2 → Step 3
  const step2Next = document.getElementById('step2-next');
  const step2Back = document.getElementById('step2-back');
  if (step2Next) {
    step2Next.addEventListener('click', () => {
      const incomeInput = document.getElementById('onboard-income');
      const income = parseFloat(incomeInput?.value);
      if (!income || income <= 0) {
        incomeInput?.classList.add('input-error');
        incomeInput?.focus();
        return;
      }
      incomeInput?.classList.remove('input-error');
      // Pre-fill suggested budgets (percentage-based)
      prefillBudgets(income);
      goToStep(3, steps, dots);
      currentStep = 3;
    });
  }
  if (step2Back) {
    step2Back.addEventListener('click', () => {
      goToStep(1, steps, dots);
      currentStep = 1;
    });
  }

  // Step 3 → Complete
  const step3Done = document.getElementById('step3-done');
  const step3Back = document.getElementById('step3-back');
  if (step3Done) {
    step3Done.addEventListener('click', () => {
      finishOnboarding(onboardingView, appLayout);
    });
  }
  if (step3Back) {
    step3Back.addEventListener('click', () => {
      goToStep(2, steps, dots);
      currentStep = 2;
    });
  }

  // Enter key support on inputs
  document.getElementById('onboard-name')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); step1Next?.click(); }
  });
  document.getElementById('onboard-income')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); step2Next?.click(); }
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
  dots.forEach(d => {
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
  const name = document.getElementById('onboard-name')?.value?.trim() || 'User';
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
  appState.completeOnboarding({ name, monthlyIncome: income, categoryBudgets });
  completeOnboarding();

  // Animate transition
  onboardingView.classList.add('login-exit');
  setTimeout(() => {
    onboardingView.classList.add('hidden');
    appLayout.classList.remove('hidden');
    window.dispatchEvent(new CustomEvent('vault:authenticated'));
  }, 400);
}

export default { isOnboarded, completeOnboarding, resetOnboarding, initAuth };
