(() => {
  const SESSION_KEY='hlonyaneTenantSession';
  const PORTAL_KEY='hlonyaneTenantPortalV42';
  const read=(key,fallback={})=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch(e){return fallback}};
  const session=read(SESSION_KEY,{});
  const portal=read(PORTAL_KEY,{});
  const toast=message=>{const el=document.querySelector('#toast');if(!el)return;el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2600)};
  const esc=value=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');

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

  addProfileEditor();
  paintProfile();
})();
