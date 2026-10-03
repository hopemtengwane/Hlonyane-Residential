(() => {
  const CONFIG_URL='https://raw.githubusercontent.com/hopemtengwane/Hlonyane-Residential/main/site-config.json';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function load(){
    const host=document.querySelector('#tenantComments');
    if(!host)return;
    try{
      const response=await fetch(CONFIG_URL+'?v='+Date.now(),{cache:'no-store'});
      if(!response.ok)return;
      const config=await response.json();
      const posts=Array.isArray(config?.communityPosts)?config.communityPosts:[];
      if(!posts.length)return;
      host.querySelectorAll('[data-approved-community-post]').forEach(el=>el.remove());
      const markup=posts.map(post=>`<article class="comment-card" data-approved-community-post><div class="comment-mark">“</div><p>“${esc(post.text||'')}”</p><div class="comment-person"><div class="tenant-avatar-placeholder">${esc((post.name||'Tenant').split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase())}</div><div><strong>${esc(post.name||'Tenant')}</strong><span>${esc(post.relationship||'Current tenant')}</span></div></div></article>`).join('');
      host.insertAdjacentHTML('beforeend',markup);
      const empty=document.querySelector('#communityEmpty');
      if(empty&&host.children.length)empty.hidden=true;
    }catch(error){console.warn('Community posts could not be loaded.',error)}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load);else load();
})();
