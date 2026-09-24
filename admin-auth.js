(() => {
  const SESSION_KEY = 'hlonyaneAdminSessionV1';
  const ADMIN_EMAIL = 'msindisi.mtengwane@gmail.com';
  const ADMIN_PASSWORD = '13592468';
  const isDashboard = /admin-dashboard\.html$/i.test(location.pathname);
  if (isDashboard && !localStorage.getItem(SESSION_KEY)) {
    location.replace('admin.html');
    return;
  }
  const login = document.querySelector('.admin-login');
  const button = document.querySelector('.admin-submit');
  if (login && button) {
    const email = login.querySelector('input[name="email"]');
    const password = login.querySelector('input[name="password"]');
    button.addEventListener('click', event => {
      event.preventDefault();
      const enteredEmail = (email?.value || '').trim().toLowerCase();
      const enteredPassword = password?.value || '';
      if (enteredEmail !== ADMIN_EMAIL || enteredPassword !== ADMIN_PASSWORD) {
        password?.setCustomValidity('Incorrect admin email or password.');
        password?.reportValidity();
        setTimeout(() => password?.setCustomValidity(''), 2500);
        return;
      }
      localStorage.setItem(SESSION_KEY, JSON.stringify({ email: ADMIN_EMAIL, signedInAt: new Date().toISOString() }));
      location.href = button.getAttribute('href') || 'admin-dashboard.html';
    });
  }
  document.querySelector('.workspace-signout')?.addEventListener('click', () => {
    localStorage.removeItem(SESSION_KEY);
  });
})();
