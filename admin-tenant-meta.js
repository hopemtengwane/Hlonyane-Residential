(() => {
  const KEY='hlonyaneTenantRegisterV1';
  const today=()=>new Date().toISOString().slice(0,10);
  const fmt=v=>{if(!v)return'—';const d=new Date(v+'T00:00:00');return Number.isNaN(d.getTime())?v:d.toLocaleDateString('en-ZA')};

  function savedTenantFor(row){
    const email=row.querySelector('[data-tenant="email"]')?.value?.trim().toLowerCase();
    let saved=[];try{saved=JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){}
    return Array.isArray(saved)?saved.find(t=>String(t.email||'').toLowerCase()===email):null;
  }

  function setLabelText(label,text){
    if(!label||label.dataset.metaLabel===text)return;
    const node=[...label.childNodes].find(n=>n.nodeType===Node.TEXT_NODE);
    if(node)node.textContent=text;else label.prepend(text);
    label.dataset.metaLabel=text;
  }

  function patchRow(row){
    if(!row)return;
    const awayFrom=row.querySelector('[data-tenant="awayFrom"]');
    const awayTo=row.querySelector('[data-tenant="awayTo"]');
    const fields=row.querySelector('.tenant-fields');
    if(!fields)return;

    if(awayFrom){
      const label=awayFrom.closest('label');
      if(label){label.hidden=true;label.style.display='none'}
    }
    if(awayTo){
      const label=awayTo.closest('label');
      if(label){label.hidden=false;label.style.display='grid';setLabelText(label,'Away until')}
    }

    let leaseEnd=row.querySelector('[data-tenant="leaseEnd"]');
    if(!leaseEnd){
      const index=row.querySelector('[data-index]')?.dataset.index||'';
      const tenant=savedTenantFor(row);
      const label=document.createElement('label');
      label.className='tenant-lease-expiry-field';
      label.append('Lease Expiry Date');
      leaseEnd=document.createElement('input');
      leaseEnd.type='date';
      leaseEnd.dataset.tenant='leaseEnd';
      if(index!=='')leaseEnd.dataset.index=index;
      leaseEnd.value=tenant?.leaseEnd||'';
      label.append(leaseEnd);
      fields.append(label);
    }

    const until=awayTo?.value||'';
    const away=!!until&&until>=today();
    row.classList.toggle('is-away',away);
    row.dataset.tenantPresence=away?'away':'home';
    const dot=row.querySelector('.presence-dot');
    if(dot)dot.title=away?`Away until ${fmt(until)}`:'Home';

    let meta=row.querySelector('.tenant-glance-meta');
    if(!meta){
      meta=document.createElement('span');
      meta.className='tenant-glance-meta';
      meta.style.cssText='font-size:12px;color:#66736d;white-space:nowrap';
      row.querySelector('.tenant-summary')?.append(meta);
    }
    const bits=[];
    if(away)bits.push(`Away until ${fmt(until)}`);
    if(leaseEnd?.value)bits.push(`Lease expires ${fmt(leaseEnd.value)}`);
    const next=bits.join(' · ');
    if(meta.textContent!==next)meta.textContent=next;

    if(awayTo&&!awayTo.dataset.metaBound){
      awayTo.dataset.metaBound='1';
      awayTo.addEventListener('change',()=>{
        if(awayFrom&&!awayFrom.value&&awayTo.value)awayFrom.value=today();
        patchRow(row);
      });
    }
    if(leaseEnd&&!leaseEnd.dataset.metaBound){
      leaseEnd.dataset.metaBound='1';
      leaseEnd.addEventListener('input',()=>patchRow(row));
      leaseEnd.addEventListener('change',()=>patchRow(row));
    }
  }

  let scheduled=false;
  function run(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{
      scheduled=false;
      document.querySelectorAll('#tenantRegister .tenant-row').forEach(patchRow);
    });
  }

  const host=document.querySelector('#tenantRegister');
  if(host)new MutationObserver(run).observe(host,{childList:true,subtree:true});
  window.addEventListener('hlonyane:tenants-loaded',run);
  document.addEventListener('toggle',event=>{if(event.target?.matches?.('.tenant-row'))run()},true);
  setTimeout(run,50);
  setTimeout(run,500);
  window.HLONYANE_TENANT_META={refresh:run};
})();
