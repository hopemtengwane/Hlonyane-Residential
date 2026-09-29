(() => {
  const SUPABASE_URL='https://aovespfbrgctyxhxssji.supabase.co';
  const SUPABASE_KEY='sb_publishable_konWtcjta3QLKDoRgUao9Q_YmSEBi2a';
  const API_URL=String(window.HLONYANE_TENANT_DATA_API_URL||'').trim();
  const TENANT_KEY='hlonyaneTenantRegisterV1';
  const client=window.supabase?.createClient?window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY):null;
  let syncing=false;

  const configured=()=>/^https:\/\/script\.google\.com\/macros\/s\//i.test(API_URL);
  const toast=message=>{const el=document.querySelector('#cmsToast');if(!el)return;el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),3200)};
  const isDemoTenant=t=>{
    const email=String(t?.email||'').trim().toLowerCase();
    const mobile=String(t?.mobile||'').trim();
    const property=String(t?.property||'').trim();
    const password=String(t?.password||'').trim();
    if(email==='thabiso@example.com'||email==='roode.tenant@example.com')return true;
    return email==='msindisi.mtengwane@gmail.com'&&(password==='13592468'||mobile==='+27 72 000 0000'||(/Unit 7/i.test(property)&&String(t?.furnishing||'')==='Furnished'));
  };

  function status(message,type='info'){
    const host=document.querySelector('#tenantRegister');
    if(!host)return;
    let el=document.querySelector('#tenantDatabaseStatus');
    if(!el){
      el=document.createElement('div');
      el.id='tenantDatabaseStatus';
      el.style.cssText='margin:0 0 16px;padding:12px 14px;border:1px solid #d7ded8;background:#f7faf7;font-weight:600;color:#355146;display:flex;align-items:center;justify-content:space-between;gap:12px;';
      host.parentElement?.insertBefore(el,host);
    }
    el.dataset.type=type;
    el.style.borderColor=type==='error'?'#d98b83':type==='ok'?'#8fc19d':'#d7ded8';
    el.style.background=type==='error'?'#fff3f1':type==='ok'?'#f1faf3':'#f7faf7';
    el.innerHTML=`<span>${message}</span>${type==='error'?'<button type="button" id="retryTenantLoad" class="cms-save" style="padding:8px 12px">Retry</button>':''}`;
    document.querySelector('#retryTenantLoad')?.addEventListener('click',()=>loadRemoteTenants({force:true}));
  }

  async function token(){
    if(!client)throw new Error('Supabase Admin session is unavailable.');
    const {data:{session}}=await client.auth.getSession();
    if(!session?.access_token)throw new Error('Admin session expired. Please sign in again.');
    return session.access_token;
  }

  const normaliseTenant=t=>{
    const property=[String(t?.Property||'').trim(),String(t?.Unit||'').trim()].filter(Boolean).join(' · ');
    const noticeStart=String(t?.['Notice Start']||'').trim();
    const noticeStatus=String(t?.['Notice Status']||'').trim();
    return {
      tenantId:String(t?.['Tenant ID']||'').trim(),
      status:String(t?.Status||'Active').trim(),
      name:String(t?.['Full Name']||t?.Name||'').trim(),
      email:String(t?.Email||'').trim().toLowerCase(),
      mobile:String(t?.Mobile||'').trim(),
      emergency:String(t?.['Emergency Contact']||'').trim(),
      property,
      bedroomType:String(t?.['Bedroom Type']||'').trim(),
      furnishing:String(t?.Furnishing||'Unfurnished').trim()||'Unfurnished',
      rent:String(t?.['Monthly Rent']||'').trim(),
      deposit:String(t?.Deposit||'').trim(),
      leaseStart:String(t?.['Lease Start']||'').trim(),
      leaseEnd:String(t?.['Lease End']||'').trim(),
      awayFrom:String(t?.['Away From']||'').trim(),
      awayTo:String(t?.['Away To']||'').trim(),
      notice:noticeStart||noticeStatus?{startsOn:noticeStart,status:noticeStatus||'Pending landlord acknowledgement'}:null,
      photo:String(t?.['Profile Photo']||'').trim()
    };
  };

  async function postJson(action,payload={}){
    const accessToken=await token();
    const response=await fetch(API_URL,{
      method:'POST',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify({action,accessToken,...payload}),
      cache:'no-store'
    });
    if(!response.ok)throw new Error(`Tenant database returned HTTP ${response.status}.`);
    const result=await response.json();
    if(!result?.ok)throw new Error(result?.error||'Tenant database rejected the request.');
    return result;
  }

  async function jsonpList(accessToken){
    return await new Promise((resolve,reject)=>{
      const cb='hlonyaneTenantList_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      const script=document.createElement('script');
      let settled=false;
      const finish=(value,error)=>{if(settled)return;settled=true;clearTimeout(timer);try{delete window[cb]}catch(e){}script.remove();error?reject(error):resolve(value)};
      window[cb]=value=>finish(value,null);
      script.onerror=()=>finish(null,new Error('The tenant database endpoint could not be reached.'));
      script.src=API_URL+'?action=admin.listTenants&accessToken='+encodeURIComponent(accessToken)+'&callback='+encodeURIComponent(cb)+'&_='+Date.now();
      document.head.append(script);
      const timer=setTimeout(()=>finish(null,new Error('Tenant database request timed out.')),10000);
    });
  }

  function renderFromDatabase(tenants){
    const previous=localStorage.getItem(TENANT_KEY)||'[]';
    const next=JSON.stringify(tenants);
    localStorage.setItem(TENANT_KEY,next);
    if(previous!==next){
      sessionStorage.setItem('hlonyaneTenantDatabaseRefreshPending','1');
      location.reload();
      return false;
    }
    if(sessionStorage.getItem('hlonyaneTenantDatabaseRefreshPending'))sessionStorage.removeItem('hlonyaneTenantDatabaseRefreshPending');
    return true;
  }

  async function loadRemoteTenants(){
    if(!configured()){
      status('Tenant database is not configured.','error');
      return {ok:false,error:'not-configured'};
    }
    status('Loading enrolled tenants from the database…');
    try{
      const accessToken=await token();
      let payload;
      try{payload=await postJson('admin.listTenants')}catch(postError){
        console.warn('POST tenant load failed, trying JSONP fallback:',postError);
        payload=await jsonpList(accessToken);
      }
      if(!payload?.ok)throw new Error(payload?.error||'Unable to load tenant register.');
      const tenants=(Array.isArray(payload.tenants)?payload.tenants:[]).map(normaliseTenant).filter(t=>t.email&&!isDemoTenant(t));
      document.documentElement.dataset.tenantSheetLoad='ok';
      if(!renderFromDatabase(tenants))return {ok:true,count:tenants.length,reloading:true};
      status(`Database connected · ${tenants.length} enrolled tenant${tenants.length===1?'':'s'} loaded.`,'ok');
      return {ok:true,count:tenants.length};
    }catch(error){
      console.error('Tenant database load:',error);
      document.documentElement.dataset.tenantSheetLoad='error';
      status(`Tenant database could not be loaded: ${error.message||error}`,'error');
      return {ok:false,error:String(error.message||error)};
    }
  }

  function rows(){
    return [...document.querySelectorAll('#tenantRegister .tenant-row')].map(row=>{
      const value=field=>row.querySelector(`[data-tenant="${field}"]`)?.value?.trim()||'';
      const noticeText=row.dataset.tenantNotice||'';
      return {name:value('name'),email:value('email').toLowerCase(),mobile:value('mobile'),property:value('property'),furnishing:value('furnishing')||'Unfurnished',awayFrom:value('awayFrom'),awayTo:value('awayTo'),notice:noticeText==='none'?null:{status:noticeText}};
    }).filter(t=>t.email&&!isDemoTenant(t));
  }

  async function syncNow({quiet=false}={}){
    if(syncing)return;
    syncing=true;
    try{
      const list=rows();
      const result=await postJson('admin.syncTenants',{tenants:list});
      if(!quiet)toast(`Tenant register saved · ${result.count??list.length} tenant${(result.count??list.length)===1?'':'s'}`);
      status(`Database connected · ${list.length} enrolled tenant${list.length===1?'':'s'} loaded.`,'ok');
      document.documentElement.dataset.tenantSheetSync='ok';
    }catch(error){
      console.error('Tenant database sync:',error);
      document.documentElement.dataset.tenantSheetSync='error';
      if(!quiet)toast(error.message||'Unable to save tenant register.');
      status(`Tenant database save failed: ${error.message||error}`,'error');
    }finally{syncing=false}
  }

  document.addEventListener('click',event=>{
    if(event.target.id==='saveTenantRegister')setTimeout(()=>syncNow({quiet:false}),0);
  },true);

  window.HLONYANE_TENANT_SHEET={sync:syncNow,rows,configured,load:loadRemoteTenants};
  window.HLONYANE_TENANT_SHEET_READY=loadRemoteTenants();
})();
