(() => {
  const APPS_SCRIPT_URL='https://script.google.com/macros/s/AKfycbyTFbn9riBXqN7zxocqEmYUDhE8IlQJvU3QGBIRvbXgobN6IsXo_PcU76IkP32eEDJGlw/exec';
  const readJSON=(key,fallback={})=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch(e){return fallback}};
  const session=readJSON('hlonyaneTenantSession',{});
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  let messages=[];
  let loading=false;

  function ensureStyles(){
    if(document.querySelector('#tenantLandlordMessageStyles'))return;
    const style=document.createElement('style');
    style.id='tenantLandlordMessageStyles';
    style.textContent=`.portal-message-list{display:grid;gap:12px}.portal-message-card{border:1px solid #dfe5e8;border-radius:14px;padding:18px;background:#fff}.portal-message-card.incoming.unread{border-left:5px solid #d5a42b;border-right:5px solid #d5a42b;background:#fffdf7}.portal-message-card h3{margin:0 0 5px;font-size:18px}.portal-message-meta{font-size:12px;color:#73808b;margin-bottom:8px}.portal-message-card p{margin:0;line-height:1.55;white-space:pre-wrap}.portal-message-direction{display:inline-flex;margin-bottom:8px;border-radius:999px;padding:4px 8px;font-size:11px;font-weight:800;background:#eef3ef;color:#28553a}.portal-message-card.outgoing .portal-message-direction{background:#eef2f6;color:#365269}.portal-message-empty{padding:24px;text-align:center;color:#6f7a83}.portal-unread-badge{display:inline-flex;min-width:20px;height:20px;padding:0 6px;align-items:center;justify-content:center;border-radius:999px;background:#d4a12b;color:#fff;font-size:11px;font-weight:800;margin-left:6px}`;
    document.head.append(style);
  }

  function jsonp(params){return new Promise((resolve,reject)=>{const callback='hlonyaneTenantMessages_'+Date.now()+'_'+Math.random().toString(36).slice(2);const script=document.createElement('script');const timer=setTimeout(()=>{cleanup();reject(new Error('Message service timed out.'));},10000);function cleanup(){clearTimeout(timer);delete window[callback];script.remove();}window[callback]=data=>{cleanup();resolve(data)};script.src=APPS_SCRIPT_URL+'?'+new URLSearchParams({...params,callback,_:Date.now().toString()});script.onerror=()=>{cleanup();reject(new Error('Unable to reach message service.'));};document.head.append(script)})}
  function markRead(messageId){if(!messageId||!session.email||!(session.tenantId||session.id))return;fetch(APPS_SCRIPT_URL,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'tenant.markMessageRead',messageId,email:session.email,tenantId:session.tenantId||session.id})}).catch(()=>{})}
  function fmt(value){if(!value)return'';const d=new Date(value);return Number.isNaN(d.getTime())?String(value):d.toLocaleString('en-ZA',{dateStyle:'medium',timeStyle:'short'})}
  function unreadCount(){return messages.filter(m=>m.direction==='Admin to Tenant'&&String(m.status||'Unread').toLowerCase()!=='read').length}
  function renderBadge(){const unread=unreadCount();const nav=document.querySelector('.nav[data-target="messages"]');if(!nav)return;let badge=nav.querySelector('b');if(!badge){badge=document.createElement('b');nav.append(badge)}badge.hidden=!unread;badge.textContent=String(unread);badge.className='portal-unread-badge'}
  function render(){ensureStyles();renderBadge();const inbox=document.querySelector('#messageInbox');if(!inbox)return;inbox.innerHTML=`<div class="portal-message-list">${messages.length?messages.map(m=>{const incoming=m.direction==='Admin to Tenant';const isUnread=incoming&&String(m.status||'Unread').toLowerCase()!=='read';return `<article class="portal-message-card ${incoming?'incoming':'outgoing'} ${isUnread?'unread':''}" ${isUnread?`data-incoming-id="${esc(m.id)}"`:''}><span class="portal-message-direction">${incoming?'Hlonyane Residential → You':'You → Hlonyane Residential'}</span><h3>${esc(m.subject||'Message')}</h3><div class="portal-message-meta">${esc(m.category||'General')} · ${esc(fmt(m.createdAt))}${incoming&&m.sentBy?' · '+esc(m.sentBy):''}</div><p>${esc(m.message||'')}</p></article>`}).join(''):'<div class="portal-message-empty">No messages yet.</div>'}</div>`;inbox.querySelectorAll('[data-incoming-id]').forEach(card=>{card.addEventListener('click',()=>{const id=card.dataset.incomingId;const item=messages.find(m=>m.id===id);if(item&&String(item.status||'').toLowerCase()!=='read'){item.status='Read';card.classList.remove('unread');card.removeAttribute('data-incoming-id');markRead(id);render()}},{once:true})})}
  async function load(){if(loading||!session.email||!(session.tenantId||session.id))return;loading=true;try{const result=await jsonp({action:'tenant.listMessages',email:session.email,tenantId:session.tenantId||session.id});if(result?.ok===false)throw new Error(result.error||'Unable to load messages.');messages=Array.isArray(result?.messages)?result.messages:[];render()}catch(error){console.error('Unable to load portal messages:',error)}finally{loading=false}}

  document.addEventListener('click',event=>{const nav=event.target.closest('[data-target="messages"]');if(nav)setTimeout(load,100)});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')load()});
  window.addEventListener('focus',load);
  window.addEventListener('load',()=>setTimeout(load,350),{once:true});
  setTimeout(load,700);setInterval(load,60000);
  window.HLONYANE_TENANT_MESSAGES={reload:load};

  if(!document.querySelector('script[data-hlonyane-lease-tracker]')){const s=document.createElement('script');s.dataset.hlonyaneLeaseTracker='1';s.src='portal-lease-tracker.js?v=20261003-1';document.body.append(s)}
})();
