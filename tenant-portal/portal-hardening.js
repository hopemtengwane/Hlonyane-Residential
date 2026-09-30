(() => {
  const readJSON=(key,fallback={})=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch(e){return fallback}};
  const session=readJSON('hlonyaneTenantSession',{});
  const APPS_SCRIPT_URL='https://script.google.com/macros/s/AKfycbyTFbn9riBXqN7zxocqEmYUDhE8IlQJvU3QGBIRvbXgobN6IsXo_PcU76IkP32eEDJGlw/exec';
  const show=id=>{
    document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active-view',v.id===id));
    document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n.dataset.target===id));
    document.querySelector('.sidebar')?.classList.remove('open');
    window.scrollTo({top:0,behavior:'smooth'});
  };
  const toast=message=>{
    const el=document.querySelector('#toast');
    if(!el)return;
    el.textContent=message;
    el.classList.add('show');
    setTimeout(()=>el.classList.remove('show'),3200);
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

  function ensureMessageStyles(){
    if(document.querySelector('#tenantMessageStyles'))return;
    const style=document.createElement('style');
    style.id='tenantMessageStyles';
    style.textContent=`
      .tenant-message-backdrop{position:fixed;inset:0;z-index:10000;background:rgba(10,26,39,.62);display:grid;place-items:center;padding:20px}
      .tenant-message-dialog{width:min(620px,100%);background:#fff;border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.22);padding:26px;position:relative;color:#102b3c}
      .tenant-message-dialog h3{margin:0 0 6px;font-size:25px}.tenant-message-dialog p{margin:0 0 20px;color:#66717e}
      .tenant-message-dialog label{display:grid;gap:7px;margin:14px 0;font-weight:700}.tenant-message-dialog input,.tenant-message-dialog select,.tenant-message-dialog textarea{width:100%;box-sizing:border-box;border:1px solid #cfd7dc;border-radius:9px;padding:12px 13px;font:inherit;background:#fff;color:#102b3c}
      .tenant-message-dialog textarea{resize:vertical;min-height:130px}.tenant-message-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:20px}.tenant-message-actions button{border:0;border-radius:8px;padding:11px 16px;font:700 14px Arial,sans-serif;cursor:pointer}.tenant-message-cancel{background:#edf1f2;color:#20384b}.tenant-message-send{background:#2f7d3b;color:#fff}.tenant-message-send[disabled]{opacity:.55;cursor:wait}.tenant-message-close{position:absolute;right:16px;top:12px;border:0;background:transparent;font-size:27px;cursor:pointer;color:#6a747b}`;
    document.head.append(style);
  }

  function openTenantMessageDialog(){
    ensureMessageStyles();
    document.querySelector('.tenant-message-backdrop')?.remove();
    const wrap=document.createElement('div');
    wrap.className='tenant-message-backdrop';
    wrap.innerHTML=`<div class="tenant-message-dialog" role="dialog" aria-modal="true" aria-labelledby="tenantMessageTitle"><button class="tenant-message-close" type="button" aria-label="Close">×</button><h3 id="tenantMessageTitle">Message the property team</h3><p>Your message will appear in Admin under Portal Messages.</p><label>Category<select id="tenantMessageCategory"><option>Maintenance</option><option>General</option><option>Payments</option><option>Lease / documents</option><option>Other</option></select></label><label>Subject<input id="tenantMessageSubject" maxlength="160" placeholder="e.g. Kitchen tap leaking"></label><label>Message<textarea id="tenantMessageBody" maxlength="4000" placeholder="Tell us what you need help with"></textarea></label><div class="tenant-message-actions"><button type="button" class="tenant-message-cancel">Cancel</button><button type="button" class="tenant-message-send">Send message</button></div></div>`;
    document.body.append(wrap);
    const close=()=>wrap.remove();
    wrap.querySelector('.tenant-message-close').onclick=close;
    wrap.querySelector('.tenant-message-cancel').onclick=close;
    wrap.addEventListener('click',e=>{if(e.target===wrap)close()});
    const send=wrap.querySelector('.tenant-message-send');
    send.onclick=async()=>{
      const category=wrap.querySelector('#tenantMessageCategory').value;
      const subject=wrap.querySelector('#tenantMessageSubject').value.trim();
      const message=wrap.querySelector('#tenantMessageBody').value.trim();
      if(!subject){wrap.querySelector('#tenantMessageSubject').focus();return toast('Add a subject first.');}
      if(!message){wrap.querySelector('#tenantMessageBody').focus();return toast('Write your message first.');}
      if(!session.email||!(session.tenantId||session.id))return toast('Please sign in again before sending a message.');
      send.disabled=true;send.textContent='Sending…';
      try{
        await fetch(APPS_SCRIPT_URL,{
          method:'POST',
          mode:'no-cors',
          headers:{'Content-Type':'text/plain;charset=utf-8'},
          body:JSON.stringify({action:'tenant.sendMessage',email:session.email,tenantId:session.tenantId||session.id,category,subject,message})
        });
        close();
        toast('Message sent to the property team.');
      }catch(error){
        send.disabled=false;send.textContent='Send message';
        toast('Unable to send your message right now. Please try again.');
      }
    };
  }

  function enableTenantMessaging(){
    document.addEventListener('click',event=>{
      const button=event.target.closest('#newMessage');
      if(!button)return;
      event.preventDefault();
      event.stopImmediatePropagation();
      openTenantMessageDialog();
    },true);
  }

  function run(){ensureNav();ensureQuickActions();enforceGatePhoto();clearHardcodedPayments();enforceDownloadIcons();enableTenantMessaging()}
  requestAnimationFrame(()=>requestAnimationFrame(run));
})();
