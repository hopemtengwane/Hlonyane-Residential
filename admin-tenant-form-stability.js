(() => {
  const rowFor = target => target?.closest?.('.tenant-row');
  const value = (row, field) => row?.querySelector(`[data-tenant="${field}"]`)?.value?.trim?.() || '';

  function updateSummary(row) {
    if (!row) return;
    const summary = row.querySelector('.tenant-summary');
    if (!summary) return;
    const spans = summary.querySelectorAll(':scope > span');
    const name = value(row, 'name') || 'New tenant';
    const property = value(row, 'property') || 'Property not assigned';
    const furnishing = value(row, 'furnishing') || 'Unfurnished';
    const awayFrom = value(row, 'awayFrom');
    const awayTo = value(row, 'awayTo');
    const today = new Date().toISOString().slice(0, 10);
    const away = !!(awayFrom && awayTo && today >= awayFrom && today <= awayTo);

    const strong = summary.querySelector('strong');
    if (strong) strong.textContent = name;
    if (spans[1]) spans[1].textContent = property;
    if (spans[2]) spans[2].textContent = furnishing;

    row.dataset.tenantName = name.toLowerCase();
    row.dataset.tenantProperty = property.toLowerCase();
    row.dataset.tenantFurnishing = furnishing.toLowerCase();
    row.dataset.tenantPresence = away ? 'away' : 'home';
    row.classList.toggle('is-away', away);
    const dot = summary.querySelector('.presence-dot');
    if (dot) dot.title = away ? 'Away' : 'Home';
  }

  // The legacy Admin renderer rebuilds the entire tenant register on every change.
  // That collapses a newly-created <details> row as soon as the user leaves the
  // name field (especially before an email exists). Keep edits in-place instead.
  document.addEventListener('change', event => {
    const target = event.target;
    if (!target?.matches?.('[data-tenant][data-index]')) return;
    const row = rowFor(target);
    if (!row) return;
    event.stopImmediatePropagation();
    updateSummary(row);
    window.filterTenantRegister?.();
  }, true);
})();
