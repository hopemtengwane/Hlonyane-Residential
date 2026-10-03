(() => {
  const rowFor=target=>target?.closest?.('.tenant-row');
  const value=(row,field)=>row?.querySelector(`[data-tenant="${field}"]`)?.value?.trim?.()||'';
  const today=()=>new Date().toISOString().slice(0,10);

  function updateSummary(row){
    if(!row)return;
    const summary=row.querySelector('.tenant-summary');
    if(!summary)return;
    const spans=summary.querySelectorAll(':scope > span');
    const name=value(row,'name')||'New tenant';
    const property=value(row,'property')||'Property not assigned';
    const furnishing=value(row,'furnishing')||'Unfurnished';
    const awayTo=value(row,'awayTo');
    const away=!!awayTo&&awayTo>=today();

    const strong=summary.querySelector('strong');
    if(strong)strong.textContent=name;
    if(spans[1])spans[1].textContent=property;
    if(spans[2])spans[2].textContent=furnishing;
    row.dataset.tenantName=name.toLowerCase();
    row.dataset.tenantProperty=property.toLowerCase();
    row.dataset.tenantFurnishing=furnishing.toLowerCase();
    row.dataset.tenantPresence=away?'away':'home';
    row.classList.toggle('is-away',away);
    const dot=summary.querySelector('.presence-dot');
    if(dot)dot.title=away?`Away until ${awayTo}`:'Home';
    window.HLONYANE_TENANT_META?.refresh?.();
  }

  document.addEventListener('change',event=>{
    const target=event.target;
    if(!target?.matches?.('[data-tenant][data-index]'))return;
    const row=rowFor(target);
    if(!row)return;
    event.stopImmediatePropagation();
    row.open=true;
    updateSummary(row);
    window.filterTenantRegister?.();
  },true);

  document.addEventListener('input',event=>{
    const target=event.target;
    if(!target?.matches?.('[data-tenant][data-index]'))return;
    const row=rowFor(target);
    if(row?.open)requestAnimationFrame(()=>{row.open=true;updateSummary(row)});
  },true);
})();
