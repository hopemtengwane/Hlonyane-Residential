(() => {
  const ENDPOINT = 'https://aovespfbrgctyxhxssji.supabase.co/functions/v1/Hlonyane-handler';
  const SESSION_KEY = 'hlonyaneTenantSession';
  const login = document.getElementById('tenantLogin');
  const form = document.querySelector('#portal-login .tenant-login');
  if (!login || !form) return;

  const emailInput = form.querySelector('input[name="email"]');
  const passwordInput = form.querySelector('input[name="password"]');
  const rememberInput = form.querySelector('input[name="remember"]');

  let status = form.querySelector('.tenant-login-status');
  if (!status) {
    status = document.createElement('p');
    status.className = 'tenant-login-status';
    status.setAttribute('role', 'status');
    form.appendChild(status);
  }

  const setStatus = (message, kind = '') => {
    status.textContent = message || '';
    status.dataset.state = kind;
  };

  const withTimeout = async (url, options, timeoutMs = 20000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try { return await fetch(url, { ...options, signal: controller.signal }); }
    finally { clearTimeout(timer); }
  };

  async function signIn(event) {
    event?.preventDefault();
    event?.stopPropagation();

    const email = String(emailInput?.value || '').trim().toLowerCase();
    const password = String(passwordInput?.value || '');

    if (!email) {
      setStatus('Enter your enrolled email address.', 'error');
      emailInput?.focus();
      return;
    }
    if (!password) {
      setStatus('Enter your tenant portal password.', 'error');
      passwordInput?.focus();
      return;
    }

    const original = login.textContent;
    login.setAttribute('aria-disabled', 'true');
    login.style.pointerEvents = 'none';
    login.textContent = 'Signing in…';
    setStatus('Checking your tenant account…', 'sending');

    try {
      const response = await withTimeout(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site: 'hlonyane', action: 'tenant.passwordLogin', email, password })
      });

      const text = await response.text();
      let result = null;
      try { result = text ? JSON.parse(text) : {}; } catch (_) {}

      if (!response.ok || !result || result.ok !== true || !result.tenant) {
        throw new Error(result?.error || result?.message || 'Sign-in was not accepted.');
      }

      const tenant = result.tenant;
      const now = Date.now();
      const session = {
        ...tenant,
        authenticated: true,
        authenticatedAt: now,
        expiresAt: now + (rememberInput?.checked ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000)
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      setStatus('Sign-in successful. Opening your portal…', 'success');
      location.href = 'tenant-portal/index.html';
    } catch (error) {
      localStorage.removeItem(SESSION_KEY);
      const message = error?.name === 'AbortError'
        ? 'The sign-in service took too long to respond. Please try again.'
        : (error?.message || 'Unable to sign in. Please try again.');
      setStatus(message, 'error');
      console.error('[Hlonyane tenant sign-in]', error);
    } finally {
      login.removeAttribute('aria-disabled');
      login.style.pointerEvents = '';
      login.textContent = original || 'Log in to portal ↗';
    }
  }

  login.addEventListener('click', signIn, true);
  passwordInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') signIn(event);
  });
})();
