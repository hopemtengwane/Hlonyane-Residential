(() => {
  const SUPABASE_URL='https://aovespfbrgctyxhxssji.supabase.co';
  const SUPABASE_KEY='sb_publishable_konWtcjta3QLKDoRgUao9Q_YmSEBi2a';
  const TENANT_PROXY_URL=SUPABASE_URL+'/functions/v1/hlonyane-admin-media';
  const TENANT_KEY='hlonyaneTenantRegisterV1';
  const client=window.supabase?.createClient?window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY):null;
  let syncing=false;

  const toast=message=>{const el=document.querySelector('#cmsToast');if(!el)return;el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),3200)};
  const isDemoTenant=t=>{
    const email=String(t?.email||'').trim().toLowerCase();
    const mobile=String(t?.mobile||'').trim();
    const property=String(t?.property||'').trim();
    const password=String(t?.password||'').trim();
    if(email==='thabiso@example.com'||email==='roode.tenant@example.com')return true;
    return email==='msindisi.mtengwane@gmail.com'&&(password==='13592468'||mobile==='+27 72 000 0000'||(/Unit 7/i.test(property)&&String(t?.furnishing||'')==='Furnished'));
  };

  function status(message,type='info',detail=''){
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
    const safeDetail=String(detail||'').replace(/[<>]/g,'');
    el.innerHTML=`<span>${message}${safeDetail?`<small style="display:block;margin-top:5px;font-weight:400;opacity:.8">${safeDetail}</small>`:''}</span>${type==='error'?'<button type="button" id="retryTenantLoad" class="cms-save" style="padding:8px 12px">Retry</button>':''}`;
    document.querySelector('#retryTenantLoad')?.addEventListener('click',()=>loadRemoteTenants({force:true}));
  }

  async function token(){
    if(!client)throw new Error('Supabase Admin session is unavailable.');
    const {data:{session},error}=await client.auth.getSession();
    if(error)throw new Error('Unable to read Admin session: '+error.message);
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
      password:String(t?.Password||'').trim(),
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

  async function edgeRequest(action,payload={}){
    const accessToken=await token();
    let response;
    try{
      response=await fetch(TENANT_PROXY_URL,{
        method:'POST',
        headers:{
          Authorization:`Bearer ${accessToken}`,
          apikey:SUPABASE_KEY,
          'Content-Type':'application/json'
        },
        body:JSON.stringify({site:'hlonyane',action,...payload}),
        cache:'no-store'
      });
    }catch(error){
      throw new Error('Supabase tenant proxy could not be reached: '+(error?.message||error));
    }
    const text=await response.text();
    let result;
    try{result=JSON.parse(text)}catch(_){
      const preview=text.replace(/\s+/g,' ').slice(0,180);
      throw new Error(`Supabase tenant proxy returned a non-JSON response (${response.status})${preview?`: ${preview}`:''}`);
    }
    if(!response.ok)throw new Error(result?.error||`Supabase tenant proxy returned HTTP ${response.status}.`);
    if(!result?.ok)throw new Error(result?.error||'Tenant backend rejected the request.');
    return result;
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
    sessionStorage.removeItem('hlonyaneTenantDatabaseRefreshPending');
    return true;
  }

  async function loadRemoteTenants(){
    status('Loading enrolled tenants from the database…','info','Transport: Supabase Edge → Apps Script → Google Sheets');
    document.documentElement.dataset.tenantTransport='supabase-edge';
    try{
      const payload=await edgeRequest('listTenants');
      const tenants=(Array.isArray(payload.tenants)?payload.tenants:[]).map(normaliseTenant).filter(t=>t.email&&!isDemoTenant(t));
      document.documentElement.dataset.tenantSheetLoad='ok';
      if(!renderFromDatabase(tenants))return {ok:true,count:tenants.length,reloading:true};
      status(`Database connected · ${tenants.length} enrolled tenant${tenants.length===1?'':'s'} loaded.`,'ok','Transport: Supabase Edge → Apps Script → Google Sheets');
      return {ok:true,count:tenants.length};
    }catch(error){
      console.error('Tenant database load via Supabase proxy:',error);
      document.documentElement.dataset.tenantSheetLoad='error';
      const message=String(error?.message||error);
      status('Tenant database could not be loaded.', 'error', message);
      return {ok:false,error:message};
    }
  }

  function rows(){
    return [...document.querySelectorAll('#tenantRegister .tenant-row')].map(row=>{
      const value=field=>row.querySelector(`[data-tenant="${field}"]`)?.value?.trim()||'';
      const noticeText=row.dataset.tenantNotice||'';
      return {
        name:value('name'),
        email:value('email').toLowerCase(),
        mobile:value('mobile'),
        property:value('property'),
        furnishing:value('furnishing')||'Unfurnished',
        password:value('password'),
        awayFrom:value('awayFrom'),
        awayTo:value('awayTo'),
        notice:noticeText==='none'?null:{status:noticeText}
      };
    }).filter(t=>t.email&&!isDemoTenant(t));
  }

  async function syncNow({quiet=false}={}){
    if(syncing)return;
    syncing=true;
    try{
      const list=rows();
      const result=await edgeRequest('syncTenants',{tenants:list});
      if(!quiet)toast(`Tenant register saved · ${result.count??list.length} tenant${(result.count??list.length)===1?'':'s'}`);
      status(`Database connected · ${list.length} enrolled tenant${list.length===1?'':'s'} loaded.`,'ok','Transport: Supabase Edge → Apps Script → Google Sheets');
      document.documentElement.dataset.tenantSheetSync='ok';
    }catch(error){
      console.error('Tenant database sync via Supabase proxy:',error);
      document.documentElement.dataset.tenantSheetSync='error';
      const message=String(error?.message||error);
      if(!quiet)toast(message||'Unable to save tenant register.');
      status('Tenant database save failed.','error',message);
    }finally{syncing=false}
  }

  async function diagnostics(){
    try{
      const result=await edgeRequest('tenantHealth');
      console.info('Hlonyane tenant diagnostics:',result);
      return result;
    }catch(error){
      console.error('Hlonyane tenant diagnostics failed:',error);
      return {ok:false,error:String(error?.message||error)};
    }
  }

  document.addEventListener('click',event=>{
    if(event.target.id==='saveTenantRegister')setTimeout(()=>syncNow({quiet:false}),0);
  },true);

  window.HLONYANE_TENANT_SHEET={sync:syncNow,rows,configured:()=>true,load:loadRemoteTenants,diagnostics,transport:'supabase-edge'};
  window.HLONYANE_TENANT_SHEET_READY=loadRemoteTenants();
})();
