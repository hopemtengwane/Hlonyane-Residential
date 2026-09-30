(() => {
  const readJSON=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch(e){return fallback}};
  const session=readJSON('hlonyaneTenantSession',{});

  function normaliseProperty(value=''){
    const raw=String(value||'').trim();
    if(!raw)return '';
    const seen=new Set();
    const parts=raw.split('·').map(x=>x.trim()).filter(Boolean).filter(part=>{
      const key=part.toLowerCase();
      if(seen.has(key))return false;
      seen.add(key);return true;
    });
    return parts.join(' · ');
  }

  function applyPropertyFixes(){
    const property=normaliseProperty(session.property||'');
    const title=document.querySelector('#homeTitle');
    const profile=document.querySelector('#profileProperty');
    if(title&&property)title.textContent=property;
    if(profile&&property)profile.textContent=property;
    const rent=String(session.rent||'').trim();
    const homeRent=document.querySelector('#homeRent');
    const rentDue=document.querySelector('#rentDueAmount');
    if(rent){
      const formatted=/^R/i.test(rent)?rent:`R${Number(rent).toLocaleString('en-ZA')}`;
      if(homeRent)homeRent.textContent=formatted;
      if(rentDue)rentDue.textContent=formatted;
    }
  }

  function icon(){return '<img src="download-icon.png" alt="" aria-hidden="true" style="display:block;width:34px;height:34px;object-fit:contain">'}

  function restoreDocuments(){
    const grid=document.querySelector('#documentGrid');
    if(!grid)return;
    const hasOnlyEmpty=!!grid.querySelector('.empty-help');
    if(hasOnlyEmpty||!grid.querySelector('.doc')){
      grid.innerHTML=`
        <article class="doc" data-doc="lease"><span class="doc-icon">PDF</span><div><h3>Lease agreement</h3><p>Complete, review and sign your tenancy agreement</p></div><button type="button" aria-label="Open lease agreement">${icon()}</button></article>
        <article class="doc" data-doc="statement"><span class="doc-icon">PDF</span><div><h3>Statement</h3><p>Latest tenant statement</p></div><button type="button" aria-label="Open statement">${icon()}</button></article>
        <article class="doc" data-doc="handbook"><span class="doc-icon">PDF</span><div><h3>Tenant handbook</h3><p>Hlonyane Residential tenant guide</p></div><button type="button" aria-label="Open tenant handbook">${icon()}</button></article>`;
    }
    grid.querySelectorAll('.doc button').forEach(button=>{if(!button.querySelector('img'))button.innerHTML=icon()});
    const lease=grid.querySelector('[data-doc="lease"]');
    if(lease){
      lease.style.cursor='pointer';
      const open=()=>{location.href='lease.html'};
      lease.onclick=open;
      lease.querySelector('button')?.addEventListener('click',event=>{event.stopPropagation();open()});
    }
  }

  function restorePaymentButtons(){
    document.querySelector('#payRentNow')?.addEventListener('click',()=>{
      const toast=document.querySelector('#toast');if(!toast)return;
      toast.textContent='Online rent payment will be connected next.';toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2600);
    });
    document.querySelector('#downloadStatement')?.addEventListener('click',()=>{
      const toast=document.querySelector('#toast');if(!toast)return;
      toast.textContent='Statement download will be connected to tenant documents.';toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2600);
    });
  }

  requestAnimationFrame(()=>{applyPropertyFixes();restoreDocuments();restorePaymentButtons()});
})();