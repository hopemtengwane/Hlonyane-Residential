(() => {
  const SESSION_KEY='hlonyaneTenantSession';
  const PORTAL_KEY='hlonyaneTenantPortalV42';
  const read=(key,fallback={})=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch(e){return fallback}};
  const session=read(SESSION_KEY,{});
  const portal=read(PORTAL_KEY,{});
  const toast=message=>{const el=document.querySelector('#toast');if(!el)return;el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2600)};
  const esc=value=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');

  function showView(id){
    document.querySelectorAll('.view').forEach(view=>view.classList.toggle('active-view',view.id===id));
    document.querySelectorAll('.nav').forEach(nav=>nav.classList.toggle('active',nav.dataset.target===id));
    document.querySelector('.sidebar')?.classList.remove('open');
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function bindNavigation(){
    document.querySelectorAll('[data-target]').forEach(el=>{
      if(el.dataset.portalBound==='1')return;
      el.dataset.portalBound='1';
      el.addEventListener('click',()=>showView(el.dataset.target));
    });
  }

  function modal(title,body){
    const wrap=document.createElement('div');
    wrap.className='portal-modal-backdrop';
    wrap.innerHTML=`<div class="portal-modal" role="dialog" aria-modal="true"><button class="modal-close" type="button" aria-label="Close">×</button><h3>${title}</h3>${body}<div class="modal-actions"><button class="outline-btn modal-cancel" type="button">Cancel</button><button class="gold-btn modal-submit" type="button">Save details</button></div></div>`;
    document.body.append(wrap);
    const close=()=>wrap.remove();
    wrap.querySelector('.modal-close').onclick=close;
    wrap.querySelector('.modal-cancel').onclick=close;
    wrap.addEventListener('click',e=>{if(e.target===wrap)close()});
    return {wrap,close};
  }

  function paintProfile(){
    const name=String(session.name||'Tenant').trim();
    const initials=name.split(/\s+/).filter(Boolean).map(x=>x[0]).join('').slice(0,2).toUpperCase()||'HR';
    const set=(selector,value)=>{const el=document.querySelector(selector);if(el)el.textContent=value||'—'};
    set('#profileName',name);set('#profileEmail',session.email);set('#profileMobile',session.mobile);set('#profileEmergency',session.emergency||session.emergencyContact);set('#profileProperty',session.property);set('#profileFurnishing',session.furnishing);set('#profileTenantId',session.tenantId||session.id);
    document.querySelectorAll('.header-actions .avatar,.profile-head .avatar').forEach(a=>{if(!a.classList.contains('has-photo'))a.textContent=initials});
    const heading=document.querySelector('header h1');if(heading)heading.textContent=`Good morning, ${name.split(/\s+/)[0]||'Tenant'}`;
  }

  function addProfileEditor(){
    const pageTitle=document.querySelector('#profile .page-title');
    if(!pageTitle||pageTitle.querySelector('[data-edit-profile]'))return;
    const button=document.createElement('button');button.className='gold-btn';button.dataset.editProfile='';button.textContent='Edit details';pageTitle.append(button);
    button.addEventListener('click',()=>{
      const m=modal('Edit profile',`<label class="modal-label">Full name<input id="editTenantName" value="${esc(session.name||'')}"></label><label class="modal-label">Email address<input value="${esc(session.email||'')}" disabled></label><label class="modal-label">Mobile number<input id="editTenantMobile" value="${esc(session.mobile||'')}"></label><label class="modal-label">Emergency contact<input id="editTenantEmergency" value="${esc(session.emergency||session.emergencyContact||'')}"></label><p class="modal-copy">Property, unit and furnishing are managed by the property team and cannot be changed here.</p>`);
      m.wrap.querySelector('.modal-submit').onclick=()=>{
        session.name=m.wrap.querySelector('#editTenantName').value.trim()||session.name;
        session.mobile=m.wrap.querySelector('#editTenantMobile').value.trim();
        session.emergency=m.wrap.querySelector('#editTenantEmergency').value.trim();
        localStorage.setItem(SESSION_KEY,JSON.stringify(session));
        portal.profile={...(portal.profile||{}),name:session.name,email:session.email,mobile:session.mobile,emergency:session.emergency};
        localStorage.setItem(PORTAL_KEY,JSON.stringify(portal));
        paintProfile();m.close();toast('Profile details updated.');
      };
    });
  }

  function propertyPhoto(){
    const property=String(session.property||'');
    const furnishing=String(session.furnishing||'').toLowerCase();
    const match=property.match(/Unit\s+(\d+)/i);
    const unit=match?Number(match[1]):0;
    if(/4 Van Reenen/i.test(property)){
      if(unit&&unit<=7)return furnishing==='furnished'?'../property-photos/76.jpg':'../property-photos/88.jpg';
      return '../property-photos/100.jpg';
    }
    if(/21 Roode/i.test(property)){
      if(/4-bedroom/i.test(property))return '../property-photos/11.jpg';
      if(unit>=9)return '../property-photos/11.jpg';
      return '../property-photos/23.jpg';
    }
    return '';
  }

  function restorePropertyPhoto(){
    const art=document.querySelector('#propertyArt');
    if(!art)return;
    art.innerHTML='';
    art.classList.remove('portal-placeholder');
    const photo=propertyPhoto();
    if(!photo){art.hidden=true;return;}
    art.hidden=false;
    art.classList.add('photo-home');
    const img=document.createElement('img');
    img.className='property-art-image';
    img.src=photo;
    img.alt=String(session.property||'Tenant property');
    img.addEventListener('error',()=>{art.hidden=true;art.innerHTML='';});
    art.append(img);
  }

  function ensureSidebarItems(){
    const nav=document.querySelector('.sidebar nav');
    if(!nav)return;
    const items=[
      ['homeaway','◷','Home & away'],
      ['notice','⌁','Give notice'],
      ['community','✦','Community']
    ];
    items.forEach(([target,icon,label])=>{
      if(nav.querySelector(`[data-target="${target}"]`))return;
      const button=document.createElement('button');
      button.className='nav';button.dataset.target=target;button.innerHTML=`<span>${icon}</span> ${label}`;
      nav.append(button);
    });
  }

  function ensureHomeAwayView(){
    if(document.querySelector('#homeaway'))return;
    const section=document.createElement('section');
    section.id='homeaway';section.className='view';
    section.innerHTML=`<div class="page-title"><div><p class="eyebrow">PROPERTY PRESENCE</p><h2>Home &amp; away</h2><p class="muted">Let the property team know when you will be away.</p></div></div><article class="card homeaway-card"><div class="homeaway-status" id="homeAwayStatus"></div><div class="homeaway-fields"><label>Away from<input id="awayFrom" type="date"></label><label>Away to<input id="awayTo" type="date"></label></div><button class="gold-btn" id="saveAway">Save dates</button><button class="outline-btn" id="clearAway">I’m back</button></article>`;
    document.querySelector('main')?.append(section);
    const paint=()=>{
      const from=document.querySelector('#awayFrom'),to=document.querySelector('#awayTo'),status=document.querySelector('#homeAwayStatus');
      if(from)from.value=session.awayFrom||'';if(to)to.value=session.awayTo||'';
      const today=new Date().toISOString().slice(0,10);const away=!!(session.awayFrom&&session.awayTo&&today>=session.awayFrom&&today<=session.awayTo);
      if(status)status.innerHTML=`<span class="presence-dot ${away?'away':''}"></span><strong>${away?'Away':'Home'}</strong>`;
    };
    section.querySelector('#saveAway')?.addEventListener('click',()=>{
      session.awayFrom=section.querySelector('#awayFrom')?.value||'';session.awayTo=section.querySelector('#awayTo')?.value||'';
      localStorage.setItem(SESSION_KEY,JSON.stringify(session));paint();toast('Home & away dates saved.');
    });
    section.querySelector('#clearAway')?.addEventListener('click',()=>{session.awayFrom='';session.awayTo='';localStorage.setItem(SESSION_KEY,JSON.stringify(session));paint();toast('You are marked as home.');});
    paint();
  }

  function ensureNoticeView(){
    if(document.querySelector('#notice'))return;
    const section=document.createElement('section');section.id='notice';section.className='view';
    section.innerHTML=`<div class="page-title"><div><p class="eyebrow">TENANCY</p><h2>Give notice</h2><p class="muted">Choose the date your notice will commence.</p></div></div><article class="card notice-form-card"><div class="notice-status" id="noticeStatus"></div><label>Notice commencement date<input id="noticeStart" type="date"></label><button class="gold-btn" id="submitNotice">Submit notice</button></article>`;
    document.querySelector('main')?.append(section);
    const paint=()=>{const notice=session.notice||{};const status=section.querySelector('#noticeStatus');const start=section.querySelector('#noticeStart');if(start)start.value=notice.startsOn||'';if(status)status.innerHTML=!notice.startsOn?'<span class="notice-state neutral">No notice submitted</span>':notice.status==='Completed'?'<span class="notice-state complete">Notice acknowledged</span>':`<span class="notice-state pending">Notice starting ${esc(notice.startsOn)} · awaiting acknowledgement</span>`;};
    section.querySelector('#submitNotice')?.addEventListener('click',()=>{const startsOn=section.querySelector('#noticeStart')?.value||'';if(!startsOn)return toast('Choose a commencement date first.');session.notice={startsOn,status:'Pending landlord acknowledgement'};localStorage.setItem(SESSION_KEY,JSON.stringify(session));paint();toast('Notice saved pending acknowledgement.');});
    paint();
  }

  function ensureCommunityView(){
    if(document.querySelector('#community'))return;
    const section=document.createElement('section');section.id='community';section.className='view';
    section.innerHTML=`<div class="page-title"><div><p class="eyebrow">TENANT COMMUNITY</p><h2>Community</h2><p class="muted">Share a message with the Hlonyane Residential community. Posts are reviewed before publication.</p></div></div><article class="card community-compose"><label class="modal-label">Your message<textarea id="postText" rows="5" maxlength="500" placeholder="Share a helpful note about living here..."></textarea></label><button class="gold-btn" id="submitPost">Submit for approval</button></article><div id="tenantPosts" class="post-list"></div>`;
    document.querySelector('main')?.append(section);
    const render=()=>{const posts=Array.isArray(portal.posts)?portal.posts:[];const host=section.querySelector('#tenantPosts');if(!host)return;host.innerHTML=posts.length?posts.map(p=>`<article class="card tenant-post"><div class="post-author"><span class="post-avatar">${esc((p.name||session.name||'Tenant').split(/\s+/).map(x=>x[0]).join('').slice(0,2))}</span><span><strong>${esc(p.name||session.name||'Tenant')}</strong><small>${esc(p.date||'')}</small></span></div><p>“${esc(p.text||'')}”</p><span class="post-status">${esc(p.status||'Pending approval')}</span></article>`).join(''):'<article class="empty-help"><span>✦</span><h3>No posts yet</h3><p class="muted">Your submitted community messages will appear here.</p></article>';};
    section.querySelector('#submitPost')?.addEventListener('click',()=>{const text=section.querySelector('#postText')?.value.trim()||'';if(text.length<10)return toast('Please write at least 10 characters.');portal.posts=Array.isArray(portal.posts)?portal.posts:[];portal.posts.unshift({text,date:new Date().toLocaleDateString('en-ZA'),status:'Pending approval',name:session.name||'Tenant'});localStorage.setItem(PORTAL_KEY,JSON.stringify(portal));section.querySelector('#postText').value='';render();toast('Post sent for approval.');});
    render();
  }

  function restoreQuickActions(){
    const grid=document.querySelector('.quick-grid');if(!grid)return;
    const wanted=[
      ['payments','R','Pay rent','View payment details'],
      ['maintenance','⌁','Maintenance','Report or track an issue'],
      ['messages','✉','Message us','Speak to your property team'],
      ['documents','▤','Documents','Lease and statements'],
      ['homeaway','◷','Home & away','Share your away dates'],
      ['notice','⌁','Give notice','Start your notice period']
    ];
    grid.innerHTML=wanted.map(([target,icon,title,detail])=>`<button data-target="${target}"><span>${icon}</span><strong>${title}</strong><small>${detail}</small></button>`).join('');
  }

  function clearHardcodedPayments(){
    const balance=document.querySelector('#paymentBalance');if(balance)balance.textContent='—';
    const due=document.querySelector('#paymentDueText');if(due)due.textContent='Payment information will appear when provided by the property team.';
    const ring=document.querySelector('.progress-ring');if(ring)ring.innerHTML='<strong>—</strong><small>payment record</small>';
    const history=document.querySelector('#paymentHistory');if(history)history.innerHTML='<div class="tr th"><span>Date</span><span>Description</span><span>Status</span><span>Amount</span></div><div class="payment-empty">No payment history has been added to your account yet.</div>';
  }

  function restoreDocumentIcons(){
    document.querySelectorAll('.doc button').forEach(button=>{
      button.innerHTML='<span class="download-symbol" aria-hidden="true">⇩</span>';
      button.setAttribute('aria-label','Download document');
    });
  }

  ensureSidebarItems();
  ensureHomeAwayView();
  ensureNoticeView();
  ensureCommunityView();
  restoreQuickActions();
  bindNavigation();
  restorePropertyPhoto();
  clearHardcodedPayments();
  restoreDocumentIcons();
  addProfileEditor();
  paintProfile();
})();
