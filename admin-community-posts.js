(() => {
  const PORTAL_KEY='hlonyaneTenantPortalV42';
  const SITE_KEY='hlonyaneSiteStateV41';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch(e){return fallback}};
  const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
  const toast=message=>{const el=document.querySelector('#cmsToast');if(!el)return;el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2600)};
  const cleanQuote=value=>String(value||'').trim().replace(/^“|”$/g,'').trim();
  const hash=value=>{let h=0;for(const ch of String(value||''))h=((h<<5)-h)+ch.charCodeAt(0)|0;return Math.abs(h).toString(36)};
  const legacyId=(name,text)=>`legacy-${String(name||'tenant').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}-${hash(text)}`;

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

  const asPublished=post=>({
    id:String(post.id||''),name:post.name||'Tenant',relationship:post.relationship||'Current tenant',
    text:post.text||post.quote||'',date:post.date||'',approvedAt:post.approvedAt||new Date().toISOString(),source:post.source||'portal'
  });

  function captureLegacy(){
    const host=document.querySelector('#commentEditors');
    if(!host)return [];
    return [...host.children].filter(el=>el.classList?.contains('comment-editor')&&!el.dataset.communityManaged).map((el,index)=>{
      const name=el.querySelector('strong')?.textContent?.trim()||'Tenant';
      const relationship=el.querySelector('span')?.textContent?.trim()||'Tenant';
      const text=cleanQuote(el.querySelector('p')?.textContent||'');
      const oldButton=el.querySelector('[data-comment-remove]');
      const legacyIndex=oldButton?.dataset.commentRemove??String(index);
      const id=legacyId(name,text);
      el.dataset.communityManaged='legacy';
      el.dataset.communityId=id;
      if(oldButton){
        oldButton.removeAttribute('data-comment-remove');
        oldButton.dataset.communityRemove=id;
        oldButton.dataset.legacyIndex=legacyIndex;
        oldButton.textContent='Delete comment';
      }
      return {id,name,relationship,text,date:'',approvedAt:'',source:'legacy',legacyIndex};
    }).filter(item=>item.text);
  }

  async function saveCentralState(state,{quiet=true}={}){
    write(SITE_KEY,state);
    if(!window.HLONYANE_ADMIN_SITE_CONFIG?.save)throw new Error('Central website settings service is not ready.');
    await window.HLONYANE_ADMIN_SITE_CONFIG.save({quiet});
  }

  async function synchronisePublished(){
    const portal=normalisePosts();
    const approved=portal.posts.filter(p=>String(p.status||'').toLowerCase()==='approved').map(asPublished);
    const legacy=captureLegacy().map(asPublished);
    const state=read(SITE_KEY,{});
    const current=Array.isArray(state.communityPosts)?state.communityPosts:[];
    const byId=new Map(current.map(item=>[String(item.id),item]));
    let added=0;
    [...legacy,...approved].forEach(item=>{if(!byId.has(String(item.id))){byId.set(String(item.id),item);added++}});
    if(!added)return;
    state.communityPosts=[...byId.values()];
    try{await saveCentralState(state);toast(`${added} tenant comment${added===1?'':'s'} synced to the main site.`)}catch(e){console.warn('Unable to sync tenant comments',e)}
  }

  function render(){
    const host=document.querySelector('#commentEditors');
    if(!host)return;
    host.querySelector('.community-submissions')?.remove();
    const legacy=captureLegacy();
    const portal=normalisePosts();
    const pending=portal.posts.filter(p=>String(p.status||'Pending approval').toLowerCase().includes('pending'));
    const state=read(SITE_KEY,{});
    const published=Array.isArray(state.communityPosts)?state.communityPosts:[];
    const legacyIds=new Set(legacy.map(x=>String(x.id)));
    const dynamicPublished=published.filter(p=>!legacyIds.has(String(p.id)));

    const wrap=document.createElement('section');
    wrap.className='community-submissions';
    wrap.style.cssText='margin-top:22px;padding-top:18px;border-top:1px solid #dbe3d8';
    const approvedHtml=dynamicPublished.length?`<h3 style="margin:0 0 12px">Published tenant comments</h3>${dynamicPublished.map(p=>`<article class="comment-editor" data-community-id="${esc(p.id)}"><div class="tenant-avatar-placeholder">${esc((p.name||'Tenant').split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase())}</div><div><strong>${esc(p.name||'Tenant')}</strong><span>${esc(p.relationship||'Current tenant')}</span><p>“${esc(p.text||'')}”</p>${p.date?`<small>${esc(p.date)}</small>`:''}</div><button type="button" class="cms-remove" data-community-remove="${esc(p.id)}">Delete comment</button></article>`).join('')}`:'';
    const pendingHtml=`<h3 style="margin:${approvedHtml?'24px':'0'} 0 12px">Pending tenant comments</h3>${pending.length?pending.map(p=>`<article class="comment-editor" data-community-id="${esc(p.id)}"><div class="tenant-avatar-placeholder">${esc((p.name||'Tenant').split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase())}</div><div><strong>${esc(p.name||'Tenant')}</strong><span>${esc(p.relationship||'Current tenant')}</span><p>“${esc(p.text||'')}”</p><small>${esc(p.date||'')}</small></div><div style="display:flex;gap:8px;align-self:center"><button type="button" class="cms-save" data-community-approve="${esc(p.id)}">Approve</button><button type="button" class="cms-remove" data-community-reject="${esc(p.id)}">Reject</button></div></article>`).join(''):'<p class="admin-note">No tenant comments are awaiting approval.</p>'}`;
    wrap.innerHTML=approvedHtml+pendingHtml;
    host.append(wrap);
  }

  document.addEventListener('click',async event=>{
    const approve=event.target.closest('[data-community-approve]');
    const reject=event.target.closest('[data-community-reject]');
    const remove=event.target.closest('[data-community-remove]');
    if(!approve&&!reject&&!remove)return;

    if(remove){
      const id=String(remove.dataset.communityRemove||'');
      const state=read(SITE_KEY,{});
      state.communityPosts=(Array.isArray(state.communityPosts)?state.communityPosts:[]).filter(p=>String(p.id)!==id);
      const legacyIndex=remove.dataset.legacyIndex;
      if(legacyIndex!==undefined){
        state.deletedComments=Array.isArray(state.deletedComments)?state.deletedComments:[];
        const n=Number(legacyIndex);if(Number.isInteger(n)&&!state.deletedComments.includes(n))state.deletedComments.push(n);
      }
      try{remove.disabled=true;await saveCentralState(state);remove.closest('.comment-editor')?.remove();toast('Tenant comment removed from Admin and the main site.');render()}catch(error){remove.disabled=false;toast(error?.message||'Unable to remove tenant comment.')}
      return;
    }

    const id=(approve||reject).dataset.communityApprove||(approve||reject).dataset.communityReject;
    const portal=normalisePosts();
    const post=portal.posts.find(p=>String(p.id)===String(id));
    if(!post)return;
    try{
      if(approve){
        approve.disabled=true;approve.textContent='Publishing…';
        post.status='Approved';post.approvedAt=new Date().toISOString();
        const state=read(SITE_KEY,{});
        const list=Array.isArray(state.communityPosts)?state.communityPosts:[];
        const item=asPublished(post);
        state.communityPosts=[item,...list.filter(x=>String(x.id)!==String(item.id))];
        await saveCentralState(state);
        write(PORTAL_KEY,portal);
        toast('Community post approved and published.');
      }else{
        post.status='Rejected';post.rejectedAt=new Date().toISOString();write(PORTAL_KEY,portal);toast('Community post rejected.');
      }
      render();
    }catch(error){if(approve){approve.disabled=false;approve.textContent='Approve'}toast(error?.message||'Unable to update community post.')}
  });

  function wait(){
    if(document.documentElement.classList.contains('admin-ready')&&document.querySelector('#commentEditors')){
      render();setTimeout(synchronisePublished,350);
    }else setTimeout(wait,250);
  }
  wait();
})();
