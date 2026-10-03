(() => {
  const today=()=>new Date().toISOString().slice(0,10);
  const fmt=v=>{if(!v)return'—';const d=new Date(v+'T00:00:00');return Number.isNaN(d.getTime())?v:d.toLocaleDateString('en-ZA')};

  function patchRow(row){
    const awayFrom=row.querySelector('[data-tenant="awayFrom"]');
    const awayTo=row.querySelector('[data-tenant="awayTo"]');
    if(awayFrom){const label=awayFrom.closest('label');if(label)label.style.display='none'}
    if(awayTo){const label=awayTo.closest('label');if(label){const text=[...label.childNodes].find(n=>n.nodeType===Node.TEXT_NODE);if(text)text.textContent='Away until';else label.prepend('Away until')}}

    let leaseEnd=row.querySelector('[data-tenant="leaseEnd"]');
    if(!leaseEnd){
      leaseEnd=document.createElement('input');leaseEnd.type='date';leaseEnd.dataset.tenant='leaseEnd';
      const email=row.querySelector('[data-tenant="email"]')?.value?.trim().toLowerCase();
      let saved=[];try{saved=JSON.parse(localStorage.getItem('hlonyaneTenantRegisterV1')||'[]')}catch(e){}
      const tenant=Array.isArray(saved)?saved.find(t=>String(t.email||'').toLowerCase()===email):null;
      leaseEnd.value=tenant?.leaseEnd||'';
      const label=document.createElement('label');label.append('Lease Expiry Date',leaseEnd);
      row.querySelector('.tenant-fields')?.append(label);
    }

    const until=awayTo?.value||'';
    const away=!!until&&until>=today();
    row.classList.toggle('is-away',away);
    row.dataset.tenantPresence=away?'away':'home';
    const dot=row.querySelector('.presence-dot');if(dot)dot.title=away?`Away until ${fmt(until)}`:'Home';
    let meta=row.querySelector('.tenant-glance-meta');
    if(!meta){meta=document.createElement('span');meta.className='tenant-glance-meta';meta.style.cssText='font-size:12px;color:#66736d;white-space:nowrap';row.querySelector('.tenant-summary')?.append(meta)}
    const bits=[];if(away)bits.push(`Away until ${fmt(until)}`);if(leaseEnd?.value)bits.push(`Lease expires ${fmt(leaseEnd.value)}`);meta.textContent=bits.join(' · ');

    if(awayTo&&!awayTo.dataset.metaBound){awayTo.dataset.metaBound='1';awayTo.addEventListener('change',()=>{if(awayFrom&&!awayFrom.value&&awayTo.value)awayFrom.value=today();patchRow(row)})}
    if(leaseEnd&&!leaseEnd.dataset.metaBound){leaseEnd.dataset.metaBound='1';leaseEnd.addEventListener('change',()=>patchRow(row))}
  }

  function run(){document.querySelectorAll('#tenantRegister .tenant-row').forEach(patchRow)}
  const host=document.querySelector('#tenantRegister');if(host)new MutationObserver(run).observe(host,{childList:true,subtree:true});
  window.addEventListener('hlonyane:tenants-loaded',()=>setTimeout(run,100));
  setTimeout(run,120);
  window.HLONYANE_TENANT_META={refresh:run};
})();
