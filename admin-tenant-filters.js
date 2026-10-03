(() => {
  const HOST_SELECTOR = '#tenantRegister';
  let applied = { search:'', property:'', furnishing:'', presence:'', notice:'' };

  const normalise = value => String(value || '').trim().toLowerCase();
  const baseProperty = value => String(value || '').split('·')[0].trim();

  function tenantSection(){
    const host = document.querySelector(HOST_SELECTOR);
    return host?.closest('.cms-section') || host?.parentElement || null;
  }

  function rows(){
    return [...document.querySelectorAll(`${HOST_SELECTOR} .tenant-row`)];
  }

  function collectProperties(){
    const values = new Set();
    rows().forEach(row => {
      const raw = row.querySelector('[data-tenant="property"]')?.value || row.dataset.tenantProperty || '';
      const base = baseProperty(raw);
      if(base) values.add(base);
    });
    return [...values].sort((a,b)=>a.localeCompare(b));
  }

  function makePanel(){
    const section = tenantSection();
    const host = document.querySelector(HOST_SELECTOR);
    if(!section || !host) return null;

    let panel = section.querySelector('#tenantFilterPanel');
    if(panel) return panel;

    // Replace any older filter strip so there is only one source of truth.
    section.querySelectorAll('.tenant-tools').forEach(el => el.remove());

    panel = document.createElement('div');
    panel.id = 'tenantFilterPanel';
    panel.className = 'tenant-tools';
    panel.innerHTML = `
      <p class="tenant-instruction">Choose the filters you need, then click <strong>Filter</strong>.</p>
      <label>Search tenants
        <input id="tenantFilterSearch" type="search" placeholder="Name, email, mobile or unit">
      </label>
      <label>Property
        <select id="tenantFilterProperty"><option value="">All properties</option></select>
      </label>
      <label>Furnishing
        <select id="tenantFilterFurnishing">
          <option value="">All furnishing</option>
          <option value="furnished">Furnished</option>
          <option value="unfurnished">Unfurnished</option>
        </select>
      </label>
      <label>Presence
        <select id="tenantFilterPresence">
          <option value="">Home and away</option>
          <option value="home">Home</option>
          <option value="away">Away</option>
        </select>
      </label>
      <label>Notice
        <select id="tenantFilterNotice">
          <option value="">All notices</option>
          <option value="none">No notice</option>
          <option value="serving">Serving notice</option>
          <option value="acknowledged">Acknowledged</option>
        </select>
      </label>
      <div class="tenant-filter-actions">
        <button type="button" class="cms-save" id="applyTenantFilters">Filter</button>
        <button type="button" class="cms-remove" id="clearTenantFilters">Clear</button>
      </div>
      <p id="tenantFilterResult" class="tenant-filter-result" aria-live="polite"></p>`;

    host.parentElement?.insertBefore(panel, host);

    if(!document.querySelector('#tenantFilterStyles')){
      const style = document.createElement('style');
      style.id = 'tenantFilterStyles';
      style.textContent = `
        #tenantFilterPanel{grid-template-columns:minmax(220px,1.4fr) repeat(4,minmax(145px,1fr)) auto;align-items:end}
        #tenantFilterPanel .tenant-instruction{grid-column:1/-1}
        .tenant-filter-actions{display:flex;gap:8px;align-items:center}
        .tenant-filter-actions .cms-remove{margin:0;padding:11px 14px;font-size:13px}
        .tenant-filter-result{grid-column:1/-1;margin:0;color:#536456;font-size:12px}
        @media(max-width:1100px){#tenantFilterPanel{grid-template-columns:repeat(3,minmax(180px,1fr))}}
        @media(max-width:760px){#tenantFilterPanel{grid-template-columns:1fr 1fr}}
        @media(max-width:520px){#tenantFilterPanel{grid-template-columns:1fr}.tenant-filter-actions{width:100%}.tenant-filter-actions button{flex:1}}
      `;
      document.head.append(style);
    }

    panel.querySelector('#applyTenantFilters')?.addEventListener('click', () => {
      applied = readForm(panel);
      applyFilters();
    });
    panel.querySelector('#clearTenantFilters')?.addEventListener('click', () => {
      panel.querySelector('#tenantFilterSearch').value = '';
      panel.querySelector('#tenantFilterProperty').value = '';
      panel.querySelector('#tenantFilterFurnishing').value = '';
      panel.querySelector('#tenantFilterPresence').value = '';
      panel.querySelector('#tenantFilterNotice').value = '';
      applied = { search:'', property:'', furnishing:'', presence:'', notice:'' };
      applyFilters();
    });
    panel.querySelector('#tenantFilterSearch')?.addEventListener('keydown', event => {
      if(event.key === 'Enter'){
        event.preventDefault();
        applied = readForm(panel);
        applyFilters();
      }
    });

    refreshPropertyOptions();
    return panel;
  }

  function readForm(panel){
    return {
      search: normalise(panel.querySelector('#tenantFilterSearch')?.value),
      property: normalise(panel.querySelector('#tenantFilterProperty')?.value),
      furnishing: normalise(panel.querySelector('#tenantFilterFurnishing')?.value),
      presence: normalise(panel.querySelector('#tenantFilterPresence')?.value),
      notice: normalise(panel.querySelector('#tenantFilterNotice')?.value)
    };
  }

  function refreshPropertyOptions(){
    const panel = document.querySelector('#tenantFilterPanel') || makePanel();
    const select = panel?.querySelector('#tenantFilterProperty');
    if(!select) return;
    const selected = select.value;
    const options = collectProperties();
    select.innerHTML = '<option value="">All properties</option>' + options.map(property => `<option value="${property.replace(/"/g,'&quot;')}">${property}</option>`).join('');
    if(options.includes(selected)) select.value = selected;
  }

  function rowMatches(row){
    const name = normalise(row.querySelector('[data-tenant="name"]')?.value || row.dataset.tenantName);
    const email = normalise(row.querySelector('[data-tenant="email"]')?.value);
    const mobile = normalise(row.querySelector('[data-tenant="mobile"]')?.value);
    const propertyRaw = row.querySelector('[data-tenant="property"]')?.value || row.dataset.tenantProperty || '';
    const property = normalise(baseProperty(propertyRaw));
    const propertyFull = normalise(propertyRaw);
    const furnishing = normalise(row.querySelector('[data-tenant="furnishing"]')?.value || row.dataset.tenantFurnishing);
    const presence = normalise(row.dataset.tenantPresence || (row.classList.contains('is-away') ? 'away' : 'home'));
    const notice = normalise(row.dataset.tenantNotice || 'none');

    if(applied.search){
      const haystack = [name,email,mobile,propertyFull].join(' ');
      if(!haystack.includes(applied.search)) return false;
    }
    if(applied.property && property !== applied.property) return false;
    if(applied.furnishing && furnishing !== applied.furnishing) return false;
    if(applied.presence && presence !== applied.presence) return false;
    if(applied.notice && notice !== applied.notice) return false;
    return true;
  }

  function applyFilters(){
    makePanel();
    refreshPropertyOptions();
    const all = rows();
    let shown = 0;
    all.forEach(row => {
      const match = rowMatches(row);
      row.hidden = !match;
      row.style.display = match ? '' : 'none';
      if(match) shown += 1;
    });
    const result = document.querySelector('#tenantFilterResult');
    if(result) result.textContent = `${shown} of ${all.length} tenant${all.length===1?'':'s'} shown.`;
  }

  function refresh(){
    makePanel();
    refreshPropertyOptions();
    applyFilters();
  }

  const host = document.querySelector(HOST_SELECTOR);
  if(host){
    new MutationObserver(() => {
      clearTimeout(window.__hlonyaneTenantFilterRefresh);
      window.__hlonyaneTenantFilterRefresh = setTimeout(refresh, 30);
    }).observe(host,{childList:true,subtree:true});
  }
  window.addEventListener('hlonyane:tenants-loaded', refresh);
  window.filterTenantRegister = applyFilters;
  window.HLONYANE_TENANT_FILTERS = {refresh, apply:applyFilters};
  setTimeout(refresh, 80);
})();
