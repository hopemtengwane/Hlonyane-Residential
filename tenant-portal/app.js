(() => {
  const KEY='hlonyaneTenantPortalV42';
  const MESSAGE_KEY='hlonyanePortalMessagesV1';
  const SESSION_KEY='hlonyaneTenantSession';
  const toast=document.querySelector('#toast');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const readJSON=(key,fallback)=>{try{const v=JSON.parse(localStorage.getItem(key)||'null');return v??fallback}catch(e){return fallback}};
  const session=readJSON(SESSION_KEY,{});
  const saved=readJSON(KEY,{});
  const state={requests:[],posts:[],lease:{},profilePhoto:'',...saved};
  const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
  const pop=message=>{if(!toast)return;toast.textContent=message;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2800)};
  const show=id=>{document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active-view',v.id===id));document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n.dataset.target===id));document.querySelector('.sidebar')?.classList.remove('open');window.scrollTo({top:0,behavior:'smooth'})};
  document.querySelectorAll('[data-target]').forEach(el=>el.addEventListener('click',()=>show(el.dataset.target)));
  document.querySelector('.menu')?.addEventListener('click',()=>document.querySelector('.sidebar')?.classList.toggle('open'));
  document.querySelector('.logout')?.addEventListener('click',()=>{localStorage.removeItem(SESSION_KEY);location.href='../index.html#portal-login'});

  function modal(title,body,submitLabel='Save'){
    const wrap=document.createElement('div');wrap.className='portal-modal-backdrop';
    wrap.innerHTML=`<div class="portal-modal" role="dialog" aria-modal="true"><button class="modal-close" aria-label="Close">×</button><h3>${title}</h3>${body}<div class="modal-actions"><button class="outline-btn modal-cancel">Cancel</button><button class="gold-btn modal-submit">${submitLabel}</button></div></div>`;
    document.body.append(wrap);const close=()=>wrap.remove();wrap.querySelector('.modal-close').onclick=close;wrap.querySelector('.modal-cancel').onclick=close;wrap.addEventListener('click',e=>{if(e.target===wrap)close()});return{wrap,close};
  }

  function propertyMeta(property=''){
    const text=String(property);const unitMatch=text.match(/Unit\s+(\d+)/i);const unit=unitMatch?Number(unitMatch[1]):null;
    if(/4 Van Reenen/i.test(text)) return {image:'../property-photos/61.jpg',bedroom:unit&&unit<=7?'2 bedroom':'1 bedroom'};
    if(/21 Roode/i.test(text)){
      if(/4-bedroom/i.test(text)) return {image:'../property-photos/11.jpg',bedroom:'4 bedroom'};
      return {image:'../roode-flats-portal.png',bedroom:unit&&unit>=9?'2 bedroom':'1 bedroom'};
    }
    return {image:'',bedroom:''};
  }

  function applyTenant(){
    const name=String(session.name||'Tenant').trim();const property=String(session.property||'').trim();const furnishing=String(session.furnishing||'').trim();const meta=propertyMeta(property);
    const first=name.split(/\s+/)[0]||'Tenant';const initials=name.split(/\s+/).filter(Boolean).map(x=>x[0]).join('').slice(0,2).toUpperCase()||'HR';
    document.querySelector('header h1').textContent=`Good morning, ${first}`;
    document.querySelectorAll('.header-actions .avatar,.profile-head .avatar').forEach(a=>a.textContent=initials);
    const photo=state.profilePhoto||localStorage.getItem('hlonyaneProfilePhotoV1')||'';
    if(photo){document.querySelectorAll('.profile-head .avatar').forEach(a=>{a.innerHTML=`<img src="${photo}" alt="Profile picture">`;a.classList.add('has-photo')})}
    document.querySelector('#homeTitle').textContent=property||'Property not assigned';
    document.querySelector('#homeSubtitle').textContent=[meta.bedroom,'Middelburg, EC',furnishing].filter(Boolean).join(' · ')||'Your assigned property will appear here.';
    document.querySelector('#homeFurnishing').textContent=furnishing||'—';
    document.querySelector('#leaseStart').textContent=session.leaseStart||'—';
    document.querySelector('#leaseEnd').textContent=session.leaseEnd||'—';
    document.querySelector('#leaseStatus').textContent=session.leaseStatus||((session.leaseStart||session.leaseEnd)?'Active':'Not available');
    document.querySelector('#leaseSummary').textContent=session.leaseEnd?`Lease ends ${session.leaseEnd}`:'Lease details will appear when added by the property team.';
    const art=document.querySelector('#propertyArt');if(art&&meta.image){art.innerHTML=`<img class="property-art-image" src="${meta.image}" alt="${esc(property)}">`;art.classList.add('photo-home')}
    document.querySelector('#profileName').textContent=name;
    document.querySelector('#profileEmail').textContent=session.email||'—';
    document.querySelector('#profileMobile').textContent=session.mobile||'—';
    document.querySelector('#profileEmergency').textContent=session.emergency||session.emergencyContact||'—';
    document.querySelector('#profileProperty').textContent=property||'—';
    document.querySelector('#profileFurnishing').textContent=furnishing||'—';
    document.querySelector('#profileTenantId').textContent=session.tenantId||session.id||'—';
    document.querySelector('#profileMeta').textContent=session.status?`${session.status} tenant`:'Enrolled tenant';
  }

  function renderRequests(){
    const list=document.querySelector('#maintenanceList');if(!list)return;const requests=Array.isArray(state.requests)?state.requests:[];
    document.querySelector('#requestCount').textContent=String(requests.filter(r=>r.status!=='Closed').length);
    document.querySelector('#requestSummary').textContent=requests.length?`${requests.length} request${requests.length===1?'':'s'} recorded.`:'No maintenance requests logged.';
    if(!requests.length){list.innerHTML='<div class="empty-help"><span>＋</span><h3>No maintenance requests</h3><p class="muted">If something needs attention, submit a request here.</p><button class="outline-btn" id="newRequest2">Start a request</button></div>';document.querySelector('#newRequest2')?.addEventListener('click',newRequest);return;}
    list.innerHTML=requests.map((r,i)=>`<article class="request-card"><div class="request-top"><span class="request-id">#${esc(r.id||String(i+1).padStart(4,'0'))}</span><span class="status due">${esc(r.status||'Submitted')}</span></div><h3>${esc(r.category||'Maintenance request')}</h3><p class="muted">${esc(r.description||'')}</p><div class="request-meta"><span>Submitted ${esc(r.created||'')}</span><span>${esc(session.property||'')}</span></div></article>`).join('');
  }

  function newRequest(){
    const m=modal('New maintenance request',`<label class="modal-label">Category<select id="requestCategory"><option>Plumbing</option><option>Electrical</option><option>Doors and locks</option><option>General</option></select></label><label class="modal-label">What needs attention?<textarea id="requestDescription" rows="4" minlength="10" required placeholder="Describe the issue"></textarea></label><label class="modal-label">Attach photos (optional)<input id="maintenancePhotos" type="file" accept="image/*" multiple><small id="maintenancePhotoStatus">No photos attached</small></label>`,'Submit request');
    m.wrap.querySelector('#maintenancePhotos').addEventListener('change',e=>{m.wrap.querySelector('#maintenancePhotoStatus').textContent=`${e.target.files.length} photo${e.target.files.length===1?'':'s'} attached`});
    m.wrap.querySelector('.modal-submit').onclick=()=>{const text=m.wrap.querySelector('#requestDescription').value.trim();if(text.length<10)return pop('Please add at least 10 characters describing the issue.');state.requests=Array.isArray(state.requests)?state.requests:[];state.requests.unshift({id:Date.now().toString().slice(-6),category:m.wrap.querySelector('#requestCategory').value,description:text,status:'Submitted',created:new Date().toLocaleDateString('en-ZA'),photos:[...m.wrap.querySelector('#maintenancePhotos').files].map(f=>f.name)});save();m.close();renderRequests();renderActivity();pop('Maintenance request saved.')};
  }
  document.querySelector('#newRequest')?.addEventListener('click',newRequest);

  function portalMessages(){const list=readJSON(MESSAGE_KEY,[]);return Array.isArray(list)?list:[]}
  function relevantMessages(){const email=String(session.email||'').toLowerCase();const property=String(session.property||'').split('·')[0].trim().toLowerCase();return portalMessages().filter(m=>m.recipient==='all'||String(m.recipient||'').toLowerCase()===`person:${email}`||(String(m.recipient||'').toLowerCase().startsWith('property:')&&String(m.recipient||'').slice(9).trim().toLowerCase()===property))}
  function renderMessages(){
    const inbox=document.querySelector('#messageInbox');if(!inbox)return;const rows=relevantMessages();const email=String(session.email||'').toLowerCase();const unread=rows.filter(m=>!m.readBy?.[email]).length;document.querySelector('#messageCount').textContent=String(unread);const badge=document.querySelector('.nav[data-target="messages"] b');if(badge){badge.textContent=String(unread);badge.hidden=unread===0}
    if(!rows.length){inbox.innerHTML='<div class="empty-help"><span>✉</span><h3>No messages yet</h3><p class="muted">Messages from Hlonyane Residential will appear here.</p></div>';return;}
    inbox.innerHTML=rows.map(m=>`<div class="message ${m.readBy?.[email]?'':'unread'}" data-message-id="${esc(m.id)}"><div class="avatar small">HR</div><div><strong>${esc(m.subject||'Hlonyane Residential')}</strong><p>${esc(m.body||'')}</p><small>${m.sentAt?new Date(m.sentAt).toLocaleString('en-ZA'):''}</small></div></div>`).join('');
    inbox.querySelectorAll('.message').forEach(row=>row.addEventListener('click',()=>{const list=portalMessages();const item=list.find(m=>String(m.id)===row.dataset.messageId);if(item){item.readBy=item.readBy||{};item.readBy[email]=true;localStorage.setItem(MESSAGE_KEY,JSON.stringify(list));renderMessages()}}));
  }
  document.querySelector('#newMessage')?.addEventListener('click',()=>pop('Reply and tenant-to-property messaging will be connected to the live tenant data service.'));

  function renderDocuments(){
    const grid=document.querySelector('#documentGrid');if(!grid)return;const docs=Array.isArray(session.documents)?session.documents:[];const lease=state.lease?.status?{title:'Lease agreement',detail:state.lease.status,url:'lease.html'}:null;const rows=[...(lease?[lease]:[]),...docs];
    if(!rows.length){grid.innerHTML='<article class="empty-help"><span>▤</span><h3>No documents available</h3><p class="muted">Documents shared by the property team will appear here.</p></article>';return;}
    grid.innerHTML=rows.map(d=>`<article class="doc" data-url="${esc(d.url||'')}"><span class="doc-icon">PDF</span><div><h3>${esc(d.title||d.name||'Document')}</h3><p>${esc(d.detail||'Available in your portal')}</p></div><button type="button">↓</button></article>`).join('');grid.querySelectorAll('.doc').forEach(card=>card.addEventListener('click',()=>{const url=card.dataset.url;if(url)location.href=url}));
  }

  function renderActivity(){const el=document.querySelector('#recentActivity');if(!el)return;const activities=[];(state.requests||[]).slice(0,2).forEach(r=>activities.push({title:r.category||'Maintenance request',detail:`${r.status||'Submitted'} · ${r.created||''}`}));if(session.notice?.startsOn)activities.push({title:'Notice submitted',detail:`Commences ${session.notice.startsOn}`});if(!activities.length){el.innerHTML='<div class="empty-help"><span>✓</span><h3>No recent activity</h3><p class="muted">New maintenance, notice and document activity will appear here.</p></div>';return;}el.innerHTML=activities.map(a=>`<div class="activity-row"><span class="activity-icon navy">✓</span><div><strong>${esc(a.title)}</strong><small>${esc(a.detail)}</small></div></div>`).join('')}

  function addCommunity(){if(document.querySelector('#community'))return;const nav=document.createElement('button');nav.className='nav';nav.dataset.target='community';nav.innerHTML='<span>✦</span> Community';document.querySelector('.sidebar nav')?.append(nav);nav.onclick=()=>show('community');const section=document.createElement('section');section.id='community';section.className='view';section.innerHTML='<div class="page-title"><div><p class="eyebrow">TENANT COMMUNITY</p><h2>Share your experience</h2><p class="muted">Posts are reviewed by the property team before publication.</p></div></div><article class="card community-compose"><label class="modal-label">Your message<textarea id="postText" rows="5" maxlength="500" placeholder="Share a helpful note about living here..."></textarea></label><button class="gold-btn" id="submitPost">Submit for approval</button></article><div id="tenantPosts" class="post-list"></div>';document.querySelector('main')?.append(section);document.querySelector('#submitPost').onclick=()=>{const text=document.querySelector('#postText').value.trim();if(text.length<10)return pop('Please write at least 10 characters.');state.posts=Array.isArray(state.posts)?state.posts:[];state.posts.unshift({text,date:new Date().toLocaleDateString('en-ZA'),status:'Pending approval',name:session.name||'Tenant',photo:state.profilePhoto||''});save();document.querySelector('#postText').value='';renderPosts();pop('Post sent for approval.')};renderPosts()}
  function renderPosts(){const el=document.querySelector('#tenantPosts');if(!el)return;const posts=Array.isArray(state.posts)?state.posts:[];el.innerHTML=posts.length?posts.map(p=>`<article class="card tenant-post"><div class="post-author"><span class="post-avatar">${p.photo?`<img src="${p.photo}" alt="">`:(p.name||'Tenant').split(/\s+/).map(x=>x[0]).join('').slice(0,2)}</span><span><strong>${esc(p.name||'Tenant')}</strong><small>${esc(p.date||'')}</small></span></div><p>“${esc(p.text)}”</p><span class="post-status">${esc(p.status||'Pending approval')}</span></article>`).join(''):'<article class="empty-help"><span>✦</span><h3>No posts yet</h3><p class="muted">Your submitted community messages will appear here.</p></article>'}

  function addPresence(){if(document.querySelector('#homeaway'))return;const n=document.createElement('button');n.className='nav';n.dataset.target='homeaway';n.innerHTML='<span>◷</span> Home &amp; away';document.querySelector('.sidebar nav')?.append(n);n.onclick=()=>show('homeaway');const s=document.createElement('section');s.id='homeaway';s.className='view';s.innerHTML='<div class="page-title"><div><p class="eyebrow">PROPERTY PRESENCE</p><h2>Home &amp; away</h2><p class="muted">Let the property team know when you will be away.</p></div></div><article class="card homeaway-card"><div class="homeaway-status" id="homeAwayStatus"></div><div class="homeaway-fields"><label>Away from<input id="awayFrom" type="date"></label><label>Away to<input id="awayTo" type="date"></label></div><button class="gold-btn" id="saveAway">Save dates</button><button class="outline-btn" id="clearAway">I’m back</button></article></section>';document.querySelector('main')?.append(s);const paint=()=>{document.querySelector('#awayFrom').value=session.awayFrom||'';document.querySelector('#awayTo').value=session.awayTo||'';const now=new Date().toISOString().slice(0,10),away=session.awayFrom&&session.awayTo&&now>=session.awayFrom&&now<=session.awayTo;document.querySelector('#homeAwayStatus').innerHTML=`<span class="presence-dot ${away?'away':''}"></span><strong>${away?'Away':'Home'}</strong>`};document.querySelector('#saveAway').onclick=()=>{session.awayFrom=document.querySelector('#awayFrom').value;session.awayTo=document.querySelector('#awayTo').value;localStorage.setItem(SESSION_KEY,JSON.stringify(session));paint();pop('Home & away dates saved on this device.')};document.querySelector('#clearAway').onclick=()=>{session.awayFrom='';session.awayTo='';localStorage.setItem(SESSION_KEY,JSON.stringify(session));paint();pop('You are marked as home on this device.')};paint()}

  function addNotice(){if(document.querySelector('#notice'))return;const n=document.createElement('button');n.className='nav';n.dataset.target='notice';n.innerHTML='<span>⌁</span> Give notice';document.querySelector('.sidebar nav')?.append(n);n.onclick=()=>show('notice');const s=document.createElement('section');s.id='notice';s.className='view';s.innerHTML='<div class="page-title"><div><p class="eyebrow">TENANCY</p><h2>Give notice</h2><p class="muted">Choose the date your notice will commence.</p></div></div><article class="card notice-form-card"><div class="notice-status" id="noticeStatus"></div><label>Notice commencement date<input id="noticeStart" type="date"></label><button class="gold-btn" id="submitNotice">Submit notice</button></article></section>';document.querySelector('main')?.append(s);const paint=()=>{const notice=session.notice||{},el=document.querySelector('#noticeStatus');document.querySelector('#noticeStart').value=notice.startsOn||'';el.innerHTML=!notice.startsOn?'<span class="notice-state neutral">No notice submitted</span>':notice.status==='Completed'?'<span class="notice-state complete">Notice acknowledged</span>':`<span class="notice-state pending">Notice starting ${esc(notice.startsOn)} · awaiting acknowledgement</span>`};document.querySelector('#submitNotice').onclick=()=>{const startsOn=document.querySelector('#noticeStart').value;if(!startsOn)return pop('Choose a commencement date first.');session.notice={startsOn,status:'Pending landlord acknowledgement'};localStorage.setItem(SESSION_KEY,JSON.stringify(session));paint();renderActivity();pop('Notice saved on this device pending live submission.')};paint()}

  function addQuickActions(){const grid=document.querySelector('.quick-grid');if(!grid)return;grid.insertAdjacentHTML('beforeend','<button data-target="homeaway"><span>◷</span><strong>Home &amp; away</strong><small>Share your away dates</small></button><button data-target="notice"><span>⌁</span><strong>Give notice</strong><small>Start your notice period</small></button>');grid.querySelectorAll('[data-target="homeaway"],[data-target="notice"]').forEach(el=>el.addEventListener('click',()=>show(el.dataset.target)))}

  function addProfilePhoto(){const head=document.querySelector('.profile-head');if(!head||head.querySelector('.profile-photo-picker'))return;const picker=document.createElement('label');picker.className='profile-photo-picker';picker.innerHTML='Change profile picture <input type="file" accept="image/*">';head.append(picker);picker.querySelector('input').addEventListener('change',e=>{const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{state.profilePhoto=reader.result;localStorage.setItem('hlonyaneProfilePhotoV1',reader.result);save();applyTenant();pop('Profile picture updated.')};reader.readAsDataURL(file)})}

  document.querySelectorAll('.header-actions .icon-btn')[0]?.addEventListener('click',()=>pop('Search will be enabled when live portal data is connected.'));
  document.querySelectorAll('.header-actions .icon-btn')[1]?.addEventListener('click',()=>show('messages'));

  applyTenant();renderRequests();renderMessages();renderDocuments();renderActivity();addCommunity();addPresence();addNotice();addQuickActions();addProfilePhoto();show('dashboard');
})();
