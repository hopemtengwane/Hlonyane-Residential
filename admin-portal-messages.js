(() => {
  const SUPABASE_URL='https://aovespfbrgctyxhxssji.supabase.co';
  const SUPABASE_KEY='sb_publishable_konWtcjta3QLKDoRgUao9Q_YmSEBi2a';
  const EDGE=SUPABASE_URL+'/functions/v1/hlonyane-admin-media';
  const client=window.supabase?.createClient?window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY):null;
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let messages=[];

  function ensureStyles(){
    if(document.querySelector('#adminPortalMessageStyles'))return;
    const style=document.createElement('style');
    style.id='adminPortalMessageStyles';
    style.textContent=`
      .portal-inbox-wrap{margin:0 0 28px}.portal-inbox-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:0 0 14px}.portal-inbox-head h3{margin:0;font-size:24px}.portal-inbox-count{display:inline-flex;min-width:28px;height:28px;align-items:center;justify-content:center;border-radius:999px;background:#b88918;color:#fff;font-weight:800;padding:0 8px}.portal-inbox-list{display:grid;gap:12px}.portal-inbox-item{border:1px solid #d6ddd8;background:#fff;padding:16px 18px;display:grid;grid-template-columns:1fr auto;gap:12px}.portal-inbox-item.unread{border-left:5px solid #b88918;background:#fffdf5}.portal-inbox-item h4{margin:0 0 5px;font-size:18px;color:#18392d}.portal-inbox-item .meta{font-size:13px;color:#66736d;margin-bottom:8px}.portal-inbox-item p{margin:0;color:#3f4f48;line-height:1.5;white-space:pre-wrap}.portal-inbox-item .message-actions{display:flex;align-items:flex-start;gap:8px}.portal-inbox-empty{padding:18px;border:1px solid #dde3de;background:#f6f8f6;color:#657169}.admin-message-backdrop{position:fixed;inset:0;z-index:12000;background:rgba(7,25,17,.62);display:grid;place-items:center;padding:20px}.admin-message-dialog{width:min(650px,100%);max-height:min(720px,88vh);overflow:auto;background:#fff;border-radius:16px;padding:26px;box-shadow:0 30px 90px rgba(0,0,0,.28);color:#17382d}.admin-message-dialog h2{margin:0 0 8px;font-size:27px}.admin-message-dialog>.intro{margin:0 0 18px;color:#66736d}.admin-message-preview{border-top:1px solid #e0e4e1;padding:14px 0}.admin-message-preview:first-of-type{border-top:0}.admin-message-preview strong{display:block;margin-bottom:3px}.admin-message-preview span{font-size:12px;color:#748078}.admin-message-preview p{margin:7px 0 0;line-height:1.45;color:#3f4d47}.admin-message-dialog-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:20px}.admin-message-dialog-actions button{border:0;padding:11px 17px;border-radius:7px;font-weight:800;cursor:pointer}.admin-message-later{background:#edf1ee;color:#274439}.admin-message-view{background:#2f7d3b;color:#fff}`;
    document.head.append(style);
  }

  async function token(){
    if(!client)throw new Error('Admin sign-in service is unavailable.');
    const {data:{session},error}=await client.auth.getSession();
    if(error||!session?.access_token)throw new Error('Admin session expired. Please sign in again.');
    return session.access_token;
  }

  async function edge(action,payload={}){
    const accessToken=await token();
    const response=await fetch(EDGE,{
      method:'POST',
      headers:{Authorization:`Bearer ${accessToken}`,apikey:SUPABASE_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({site:'hlonyane',action,...payload}),
      cache:'no-store'
    });
    const text=await response.text();
    let result;
    try{result=JSON.parse(text)}catch(_){throw new Error('Portal message service returned an invalid response.');}
    if(!response.ok||!result?.ok)throw new Error(result?.error||`Portal message service failed (${response.status}).`);
    return result;
  }

  function portalSection(){return document.querySelector('[data-message-section]')}

  function ensureInbox(){
    const section=portalSection();
    if(!section)return null;
    let wrap=section.querySelector('#tenantPortalInbox');
    if(wrap)return wrap;
    wrap=document.createElement('div');
    wrap.id='tenantPortalInbox';
    wrap.className='portal-inbox-wrap';
    const head=section.querySelector('.cms-section-head');
    if(head)head.insertAdjacentElement('afterend',wrap);else section.prepend(wrap);
    return wrap;
  }

  function fmt(value){
    if(!value)return '';
    const date=new Date(value);
    return Number.isNaN(date.getTime())?String(value):date.toLocaleString('en-ZA',{dateStyle:'medium',timeStyle:'short'});
  }

  function renderInbox(){
    const wrap=ensureInbox();
    if(!wrap)return;
    const unread=messages.filter(m=>String(m.status||'Unread').toLowerCase()!=='read').length;
    wrap.innerHTML=`<div class="portal-inbox-head"><div><h3>Tenant inbox</h3><small>Messages sent by tenants from their portal.</small></div><span class="portal-inbox-count" ${unread?'':'hidden'}>${unread}</span></div><div class="portal-inbox-list">${messages.length?messages.map(m=>`<article class="portal-inbox-item ${String(m.status||'Unread').toLowerCase()!=='read'?'unread':''}" data-message-id="${esc(m.id)}"><div><h4>${esc(m.subject||'Tenant message')}</h4><div class="meta">${esc(m.tenantName||m.tenantEmail||'Tenant')} · ${esc(m.property||'Property')} · ${esc(m.category||'General')} · ${esc(fmt(m.createdAt))}</div><p>${esc(m.message||'')}</p></div><div class="message-actions">${String(m.status||'Unread').toLowerCase()!=='read'?`<button type="button" class="cms-save" data-mark-message-read="${esc(m.id)}">Mark read</button>`:'<span class="notice-badge complete">Read</span>'}</div></article>`).join(''):'<div class="portal-inbox-empty">No tenant messages yet.</div>'}</div>`;
    const tab=[...document.querySelectorAll('.admin-tabs button')].find(b=>/portal messages/i.test(b.textContent||''));
    if(tab){tab.dataset.baseLabel='Portal messages';tab.innerHTML=`Portal messages${unread?` <strong style="display:inline-flex;margin-left:6px;min-width:20px;height:20px;align-items:center;justify-content:center;border-radius:999px;background:#b88918;color:white;font-size:11px;padding:0 6px">${unread}</strong>`:''}`;}
    wrap.querySelectorAll('[data-mark-message-read]').forEach(button=>button.onclick=async()=>{
      button.disabled=true;
      try{
        await edge('markPortalMessageRead',{messageId:button.dataset.markMessageRead});
        const item=messages.find(m=>m.id===button.dataset.markMessageRead);if(item)item.status='Read';
        renderInbox();
      }catch(error){button.disabled=false;alert(error.message||'Unable to update this message.');}
    });
  }

  function openPortalMessagesTab(){
    const tab=[...document.querySelectorAll('.admin-tabs button')].find(b=>/portal messages/i.test(b.textContent||''));
    if(tab)tab.click();
    setTimeout(()=>document.querySelector('#tenantPortalInbox')?.scrollIntoView({behavior:'smooth',block:'start'}),80);
  }

  function showUnreadPopup(){
    const unread=messages.filter(m=>String(m.status||'Unread').toLowerCase()!=='read');
    if(!unread.length)return;
    const fingerprint=unread.map(m=>m.id).sort().join('|');
    if(sessionStorage.getItem('hlonyaneAdminMessagePopupSeen')===fingerprint)return;
    sessionStorage.setItem('hlonyaneAdminMessagePopupSeen',fingerprint);
    ensureStyles();
    const wrap=document.createElement('div');
    wrap.className='admin-message-backdrop';
    const shown=unread.slice(0,3);
    wrap.innerHTML=`<div class="admin-message-dialog" role="dialog" aria-modal="true"><h2>${unread.length} unread tenant message${unread.length===1?'':'s'}</h2><p class="intro">Here’s a quick preview. You can open Portal Messages now or come back to them later.</p>${shown.map(m=>`<div class="admin-message-preview"><strong>${esc(m.tenantName||m.tenantEmail||'Tenant')} · ${esc(m.subject||'Message')}</strong><span>${esc(m.property||'')} · ${esc(m.category||'General')} · ${esc(fmt(m.createdAt))}</span><p>${esc(String(m.message||'').slice(0,180))}${String(m.message||'').length>180?'…':''}</p></div>`).join('')}${unread.length>3?`<p class="intro">+ ${unread.length-3} more unread message${unread.length-3===1?'':'s'}.</p>`:''}<div class="admin-message-dialog-actions"><button type="button" class="admin-message-later">Later</button><button type="button" class="admin-message-view">View messages</button></div></div>`;
    document.body.append(wrap);
    const close=()=>wrap.remove();
    wrap.querySelector('.admin-message-later').onclick=close;
    wrap.querySelector('.admin-message-view').onclick=()=>{close();openPortalMessagesTab();};
  }

  async function init(){
    ensureStyles();
    for(let i=0;i<30&&!portalSection();i++)await new Promise(r=>setTimeout(r,100));
    try{
      const result=await edge('listPortalMessages');
      messages=Array.isArray(result.messages)?result.messages:[];
      renderInbox();
      setTimeout(showUnreadPopup,220);
    }catch(error){
      console.error('Unable to load tenant portal messages:',error);
      const wrap=ensureInbox();if(wrap)wrap.innerHTML='<div class="portal-inbox-empty">Tenant messages could not be loaded right now.</div>';
    }
  }

  window.HLONYANE_ADMIN_PORTAL_MESSAGES={reload:init,open:openPortalMessagesTab};
  window.HLONYANE_ADMIN_PORTAL_MESSAGES_READY=init();
})();
