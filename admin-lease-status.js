(() => {
  const APPS_SCRIPT_URL='https://script.google.com/macros/s/AKfycbyTFbn9riBXqN7zxocqEmYUDhE8IlQJvU3QGBIRvbXgobN6IsXo_PcU76IkP32eEDJGlw/exec';
  const SUPABASE_URL='https://aovespfbrgctyxhxssji.supabase.co';
  const SUPABASE_KEY='sb_publishable_konWtcjta3QLKDoRgUao9Q_YmSEBi2a';
  const client=window.supabase?.createClient?window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY):null;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let leases=[];

  function styles(){if(document.querySelector('#adminLeaseStatusStyles'))return;const s=document.createElement('style');s.id='adminLeaseStatusStyles';s.textContent=`.lease-badge{display:inline-flex;align-items:center;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:800;white-space:nowrap}.lease-badge.not-started{background:#eef1f2;color:#66736d}.lease-badge.draft{background:#fff4d8;color:#8d6412}.lease-badge.tenant-signed{background:#e8f0fb;color:#315d91}.lease-badge.fully-signed{background:#e2f4e9;color:#23733f}.lease-open-btn{display:inline-flex;margin-top:8px;text-decoration:none}.lease-renew-btn{margin:8px 0 0 8px}.tenant-lease-admin{grid-column:1/-1;display:flex;align-items:center;gap:8px;flex-wrap:wrap}.tenant-lease-meta{display:block;width:100%;margin-top:2px;font-size:12px;color:#66736d}`;document.head.append(s)}
  async function token(){const {data:{session}}=await client.auth.getSession();if(!session?.access_token)throw new Error('Admin session expired.');return session.access_token}
  function jsonp(params){return new Promise((resolve,reject)=>{const cb='hlonyaneAdminLease_'+Date.now()+'_'+Math.random().toString(36).slice(2);const s=document.createElement('script');const t=setTimeout(()=>{cleanup();reject(new Error('Lease service timed out.'))},10000);function cleanup(){clearTimeout(t);delete window[cb];s.remove()}window[cb]=data=>{cleanup();resolve(data)};s.src=APPS_SCRIPT_URL+'?'+new URLSearchParams({...params,callback:cb,_:Date.now().toString()});s.onerror=()=>{cleanup();reject(new Error('Unable to reach lease service.'))};document.head.append(s)})}
  async function post(action,payload){const accessToken=await token();await fetch(APPS_SCRIPT_URL,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,accessToken,...payload})})}
  const cls=status=>String(status||'Not started').toLowerCase().replace(/\s+/g,'-');
  const fmtDate=v=>{if(!v)return'';const d=new Date(String(v).length<=10?v+'T00:00:00':v);return Number.isNaN(d.getTime())?v:d.toLocaleDateString('en-ZA')};

  function removeDuplicateLeaseLabel(summary){
    if(!summary)return;
    [...summary.childNodes].forEach(node=>{
      if(node.nodeType===Node.TEXT_NODE){
        if(/^\s*Leas(?:e)?\s*$/i.test(node.textContent||''))node.remove();
        return;
      }
      if(node.nodeType!==Node.ELEMENT_NODE)return;
      if(node.classList?.contains('lease-badge'))return;
      const text=String(node.textContent||'').trim();
      if(/^Leas(?:e)?$/i.test(text))node.remove();
    });
  }

  function apply(){
    styles();
    document.querySelectorAll('#tenantRegister .tenant-row').forEach(row=>{
      const email=String(row.querySelector('[data-tenant="email"]')?.value||'').trim().toLowerCase();
      if(!email)return;
      const lease=leases.find(x=>String(x.tenantEmail||'').toLowerCase()===email);
      const status=lease?.status||'Not started';
      const summary=row.querySelector('.tenant-summary');

      removeDuplicateLeaseLabel(summary);

      let badge=summary?.querySelector('.lease-badge');
      if(!badge){badge=document.createElement('span');summary?.append(badge)}
      badge.className='lease-badge '+cls(status);
      badge.textContent='Lease: '+status;

      removeDuplicateLeaseLabel(summary);

      let area=row.querySelector('.tenant-lease-admin');
      if(!area){area=document.createElement('div');area.className='tenant-lease-admin';row.querySelector('.tenant-detail .tenant-fields')?.append(area)}
      let meta='';
      if(lease?.lastSignedAt)meta+=`Last signed: ${esc(fmtDate(lease.lastSignedAt))}`;
      if(lease?.expiryDate)meta+=`${meta?' · ':''}Expires: ${esc(fmtDate(lease.expiryDate))}`;
      area.innerHTML=`${lease?.tenantId?`<a class="cms-save lease-open-btn" href="admin-lease.html?tenantId=${encodeURIComponent(lease.tenantId)}">${status==='Tenant signed'?'Review & sign lease':'Open lease'}</a>`:''}${lease?.canRenew?`<button type="button" class="cms-save lease-renew-btn" data-renew-lease="${esc(lease.tenantId)}">Renew Lease</button>`:''}${meta?`<span class="tenant-lease-meta">${meta}</span>`:''}`;
    });
  }

  document.addEventListener('click',async e=>{const button=e.target.closest('[data-renew-lease]');if(!button)return;const id=button.dataset.renewLease;if(!confirm('Create a new clean lease for this tenant? The expired signed lease will be archived.'))return;button.disabled=true;button.textContent='Renewing…';try{await post('admin.signLease',{tenantId:id,renew:true});setTimeout(load,1000)}catch(err){button.disabled=false;button.textContent='Renew Lease';alert(err.message||'Unable to renew lease.')}});

  async function load(){if(!client)return;try{const accessToken=await token();const r=await jsonp({action:'admin.listLeases',accessToken});if(r?.ok===false)throw new Error(r.error);leases=Array.isArray(r?.leases)?r.leases:[];apply()}catch(e){console.error('Unable to load lease statuses',e)}}
  window.HLONYANE_ADMIN_LEASES={reload:load,apply};
  setTimeout(load,50);
})();
