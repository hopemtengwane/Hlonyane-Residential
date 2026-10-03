(() => {
  const PORTAL_KEY='hlonyaneTenantPortalV42';
  const SITE_KEY='hlonyaneSiteStateV41';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch(e){return fallback}};
  const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
  const toast=message=>{const el=document.querySelector('#cmsToast');if(!el)return;el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2600)};

  function normalisePosts(){
    const portal=read(PORTAL_KEY,{});
    portal.posts=Array.isArray(portal.posts)?portal.posts:[];
    let changed=false;
    portal.posts=portal.posts.map((post,index)=>{
      if(post.id)return post;
      changed=true;
      return {...post,id:`community-${Date.now()}-${index}`};
    });
    if(changed)write(PORTAL_KEY,portal);
    return portal;
  }

  const asPublished=post=>({id:post.id,name:post.name||'Tenant',relationship:post.relationship||'Current tenant',text:post.text||'',date:post.date||'',approvedAt:post.approvedAt||new Date().toISOString()});

  async function publish(post){
    const state=read(SITE_KEY,{});
    const list=Array.isArray(state.communityPosts)?state.communityPosts:[];
    const item=asPublished(post);
    state.communityPosts=[item,...list.filter(x=>String(x.id)!==String(item.id))];
    write(SITE_KEY,state);
    if(!window.HLONYANE_ADMIN_SITE_CONFIG?.save)throw new Error('Central website settings service is not ready.');
    await window.HLONYANE_ADMIN_SITE_CONFIG.save({quiet:true});
  }

  async function migrateApproved(){
    const portal=normalisePosts();
    const approved=portal.posts.filter(p=>String(p.status||'').toLowerCase()==='approved');
    if(!approved.length||!window.HLONYANE_ADMIN_SITE_CONFIG?.save)return;
    const state=read(SITE_KEY,{});
    const current=Array.isArray(state.communityPosts)?state.communityPosts:[];
    const ids=new Set(current.map(p=>String(p.id)));
    const missing=approved.filter(p=>!ids.has(String(p.id)));
    if(!missing.length)return;
    state.communityPosts=[...missing.map(asPublished),...current];
    write(SITE_KEY,state);
    try{await window.HLONYANE_ADMIN_SITE_CONFIG.save({quiet:true});toast(`${missing.length} previously approved community post${missing.length===1?'':'s'} published.`)}catch(e){console.warn('Unable to migrate approved community posts',e)}
  }

  function render(){
    const host=document.querySelector('#commentEditors');
    if(!host)return;
    host.querySelector('.community-submissions')?.remove();
    const portal=normalisePosts();
    const posts=portal.posts;
    const wrap=document.createElement('section');
    wrap.className='community-submissions';
    wrap.style.cssText='margin-top:22px;padding-top:18px;border-top:1px solid #dbe3d8';
    const pending=posts.filter(p=>String(p.status||'Pending approval').toLowerCase().includes('pending'));
    const approved=posts.filter(p=>String(p.status||'').toLowerCase()==='approved');
    wrap.innerHTML=`<h3 style="margin:0 0 12px">Tenant community submissions</h3>${pending.length?pending.map(p=>`<article class="comment-editor" data-community-id="${esc(p.id)}"><div class="tenant-avatar-placeholder">${esc((p.name||'Tenant').split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase())}</div><div><strong>${esc(p.name||'Tenant')}</strong><span>${esc(p.relationship||'Current tenant')}</span><p>“${esc(p.text||'')}”</p><small>${esc(p.date||'')}</small></div><div style="display:flex;gap:8px;align-self:center"><button type="button" class="cms-save" data-community-approve="${esc(p.id)}">Approve</button><button type="button" class="cms-remove" data-community-reject="${esc(p.id)}">Reject</button></div></article>`).join(''):'<p class="admin-note">No community posts are awaiting approval.</p>'}${approved.length?`<p style="margin:14px 0 0;color:#657366;font-size:13px">${approved.length} approved post${approved.length===1?'':'s'} published.</p>`:''}`;
    host.append(wrap);
  }

  document.addEventListener('click',async event=>{
    const approve=event.target.closest('[data-community-approve]');
    const reject=event.target.closest('[data-community-reject]');
    if(!approve&&!reject)return;
    const id=(approve||reject).dataset.communityApprove||(approve||reject).dataset.communityReject;
    const portal=normalisePosts();
    const post=portal.posts.find(p=>String(p.id)===String(id));
    if(!post)return;
    try{
      if(approve){
        approve.disabled=true;approve.textContent='Publishing…';
        post.status='Approved';post.approvedAt=new Date().toISOString();
        await publish(post);
        write(PORTAL_KEY,portal);
        toast('Community post approved and published.');
      }else{
        post.status='Rejected';post.rejectedAt=new Date().toISOString();
        write(PORTAL_KEY,portal);
        toast('Community post rejected.');
      }
      render();
    }catch(error){
      if(approve){approve.disabled=false;approve.textContent='Approve'}
      toast(error?.message||'Unable to publish community post.');
    }
  });

  function wait(){
    if(document.documentElement.classList.contains('admin-ready')&&document.querySelector('#commentEditors')){render();setTimeout(migrateApproved,300)}
    else setTimeout(wait,250);
  }
  wait();
})();
