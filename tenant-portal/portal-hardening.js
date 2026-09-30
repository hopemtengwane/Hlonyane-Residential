(() => {
  const readJSON=(key,fallback={})=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch(e){return fallback}};
  const session=readJSON('hlonyaneTenantSession',{});
  const show=id=>{
    document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active-view',v.id===id));
    document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n.dataset.target===id));
    document.querySelector('.sidebar')?.classList.remove('open');
    window.scrollTo({top:0,behavior:'smooth'});
  };

  function ensureNav(){
    const nav=document.querySelector('.sidebar nav');
    if(!nav)return;
    const wanted=[
      ['homeaway','◷','Home & away'],
      ['notice','⌁','Give notice'],
      ['community','✦','Community']
    ];
    wanted.forEach(([target,icon,label])=>{
      let button=nav.querySelector(`.nav[data-target="${target}"]`);
      if(!button){
        button=document.createElement('button');
        button.className='nav';
        button.dataset.target=target;
        button.innerHTML=`<span>${icon}</span> ${label}`;
        nav.append(button);
      }
      button.onclick=()=>show(target);
    });
  }

  function ensureQuickActions(){
    const grid=document.querySelector('.quick-grid');
    if(!grid)return;
    const wanted=[
      ['homeaway','◷','Home & away','Share your away dates'],
      ['notice','⌁','Give notice','Start your notice period']
    ];
    wanted.forEach(([target,icon,title,detail])=>{
      let button=grid.querySelector(`[data-target="${target}"]`);
      if(!button){
        button=document.createElement('button');
        button.dataset.target=target;
        button.innerHTML=`<span>${icon}</span><strong>${title}</strong><small>${detail}</small>`;
        grid.append(button);
      }
      button.onclick=()=>show(target);
    });
    [...grid.querySelectorAll('button')].forEach((button,index,all)=>{
      const target=button.dataset.target;
      if(target&&all.findIndex(x=>x.dataset.target===target)!==index)button.remove();
    });
  }

  function enforceGatePhoto(){
    const property=String(session.property||'');
    const art=document.querySelector('#propertyArt');
    if(!art)return;
    let src='';
    if(/4 Van Reenen/i.test(property))src='../property-photos/60.jpg';
    else if(/21 Roode/i.test(property))src='../property-photos/2.jpg';
    art.classList.add('photo-home');
    art.innerHTML='';
    if(src){
      const img=document.createElement('img');
      img.className='property-art-image';
      img.src=src;
      img.alt=`Main gate view · ${property}`;
      art.append(img);
    }
  }

  function clearHardcodedPayments(){
    const balance=document.querySelector('#paymentBalance');
    const due=document.querySelector('#paymentDueText');
    const progress=document.querySelector('.progress-ring');
    const history=document.querySelector('#paymentHistory');
    if(balance&&!session.paymentBalance)balance.textContent='—';
    if(due&&!session.paymentDueText)due.textContent='Payment details will appear when added by the property team.';
    if(progress&&!session.paymentProgress)progress.innerHTML='<strong>—</strong><small>payment history</small>';
    if(history&&!Array.isArray(session.payments))history.innerHTML='<div class="tr th"><span>Date</span><span>Description</span><span>Status</span><span>Amount</span></div><div class="empty-payment">No payment history has been added yet.</div>';
  }

  function enforceDownloadIcons(){
    document.querySelectorAll('.doc button').forEach(button=>{
      button.setAttribute('aria-label','Download document');
      button.title='Download document';
      button.textContent='↓';
    });
  }

  function run(){ensureNav();ensureQuickActions();enforceGatePhoto();clearHardcodedPayments();enforceDownloadIcons()}
  requestAnimationFrame(()=>requestAnimationFrame(run));
})();
