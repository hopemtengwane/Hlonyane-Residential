(() => {
  const KEY = 'hlonyaneTenantSession';
  let session = null;
  try { session = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (_) {}
  const now = Date.now();
  const valid = !!(session && session.authenticated === true && Number(session.expiresAt || 0) > now && session.email && (session.tenantId || session.id));
  if (!valid) {
    localStorage.removeItem(KEY);
    location.replace('../index.html#portal-login');
  }
})();
