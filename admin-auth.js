(() => {
  const SUPABASE_URL='https://aovespfbrgctyxhxssji.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY='sb_publishable_konWtcjta3QLKDoRgUao9Q_YmSEBi2a';
  const HLONYANE_ADMINS=new Set(['msindisi.mtengwane@gmail.com','nomondehlonyane@gmail.com']);
  const isDashboard=/admin-dashboard\.html$/i.test(location.pathname);
  const client=window.supabase?.createClient?window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
  const normalise=value=>String(value||'').trim().toLowerCase();
  const isAllowed=user=>!!user?.email&&HLONYANE_ADMINS.has(normalise(user.email));
  const setStatus=message=>{let status=document.querySelector('.admin-login-status');if(!status){status=document.createElement('p');status.className='admin-login-status';status.setAttribute('role','status');document.querySelector('.admin-login')?.append(status)}status.textContent=message||''};
  const setLoader=message=>{const text=document.querySelector('[data-admin-loading-text]');if(text)text.textContent=message};
  const withTimeout=(promise,ms,label='Operation')=>Promise.race([Promise.resolve(promise),new Promise((_,reject)=>setTimeout(()=>reject(new Error(`${label} timed out after ${Math.round(ms/1000)} seconds.`)),ms))]);
  const loadScript=(src,ms=8000)=>withTimeout(new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=()=>reject(new Error(`Unable to load ${src}`));document.body.append(script)}),ms,`Loading ${src}`);
  async function safeStep(label,work,{timeout=8000}={}){try{return await withTimeout(typeof work==='function'?work():work,timeout,label)}catch(error){console.warn(`Hlonyane Admin: ${label} skipped`,error);return null}}

  async function loadOptionalServices(){
    await safeStep('Lease status',()=>loadScript('admin-lease-status.js?v=20261003-5'),{timeout:6000});
    window.HLONYANE_ADMIN_LEASES?.apply?.();
    await safeStep('Portal message script',()=>loadScript('admin-portal-messages.js?v=20261003-2'),{timeout:6000});
    await safeStep('Portal messages',()=>window.HLONYANE_ADMIN_PORTAL_MESSAGES_READY,{timeout:7000});
    await safeStep('Landlord messages',async()=>{await loadScript('admin-landlord-messages.js?v=20261003-2',6000);await window.HLONYANE_ADMIN_LANDLORD_MESSAGES_READY},{timeout:7000});
  }

  async function guardDashboard(){
    if(!client){location.replace('admin.html?error=supabase');return}
    setLoader('Checking your Admin session…');
    const {data:{session}}=await client.auth.getSession();
    const user=session?.user;
    if(!user||!isAllowed(user)){if(session)await client.auth.signOut();location.replace('admin.html?error=unauthorised');return}
    window.HLONYANE_ADMIN_USER=user;
    document.documentElement.classList.add('admin-authorised');
    try{
      setLoader('Loading website settings…');
      await loadScript('pricing-policy.js?v=20260929-1');
      await loadScript('admin-site-config.js?v=20260929-4');
      await safeStep('Website settings',()=>window.HLONYANE_ADMIN_SITE_CONFIG?.bootstrap(),{timeout:10000});

      setLoader('Preparing Admin workspace…');
      await loadScript('admin-state-recovery.js?v=20260929-2');
      await loadScript('admin-property-migration.js?v=20260928-1');
      await loadScript('pricing-policy.js?v=20260929-2');
      await loadScript('admin-app.js?v=20260929-2');
      // Demo filtering is already handled by tenant-sheet-sync.js. Do not load the old
      // cleanup script here because it stripped real tenant passwords from browser state.

      setLoader('Loading tenant register…');
      await safeStep('Tenant register script',()=>loadScript('tenant-sheet-sync.js?v=20261003-5'),{timeout:9000});
      await safeStep('Tenant database',()=>window.HLONYANE_TENANT_SHEET_READY,{timeout:10000});
      window.HLONYANE_TENANT_META?.refresh?.();

      setLoader('Opening Admin workspace…');
      document.documentElement.classList.add('admin-ready');
      setTimeout(()=>window.HLONYANE_TENANT_META?.refresh?.(),100);
      void loadOptionalServices();
    }catch(error){
      console.error('Unable to load a core Hlonyane admin component:',error);
      setLoader('Opening Admin workspace…');
      document.documentElement.classList.add('admin-ready');
      void loadOptionalServices();
    }
  }

  async function initLogin(){
    const login=document.querySelector('.admin-login'),button=document.querySelector('.admin-submit');
    if(!login||!button)return;
    if(!client){setStatus('Admin sign-in service is unavailable.');button.setAttribute('aria-disabled','true');return}
    const params=new URLSearchParams(location.search);
    if(params.get('error')==='unauthorised')setStatus('This account is not authorised for Hlonyane Admin.');
    if(params.get('error')==='supabase')setStatus('Admin sign-in service is unavailable.');
    const {data:{session}}=await client.auth.getSession();
    if(session?.user&&isAllowed(session.user)){location.replace('admin-dashboard.html');return}
    if(session?.user&&!isAllowed(session.user))await client.auth.signOut();
    const email=login.querySelector('input[name="email"]'),password=login.querySelector('input[name="password"]');
    button.addEventListener('click',async event=>{event.preventDefault();const enteredEmail=normalise(email?.value),enteredPassword=password?.value||'';if(!enteredEmail||!enteredPassword){setStatus('Enter your email address and password.');return}button.setAttribute('aria-disabled','true');button.textContent='Signing in…';setStatus('');const {data,error}=await client.auth.signInWithPassword({email:enteredEmail,password:enteredPassword});if(error||!data?.user){setStatus('Incorrect email address or password.');button.removeAttribute('aria-disabled');button.textContent='Log in to admin ↗';return}if(!isAllowed(data.user)){await client.auth.signOut();setStatus('This account is not authorised for Hlonyane Admin.');button.removeAttribute('aria-disabled');button.textContent='Log in to admin ↗';return}sessionStorage.removeItem('hlonyaneAdminMessagePopupSeen');location.href='admin-dashboard.html'});
  }

  document.querySelector('.workspace-signout')?.addEventListener('click',async event=>{event.preventDefault();sessionStorage.removeItem('hlonyaneAdminMessagePopupSeen');if(client)await client.auth.signOut();location.href='admin.html'});
  if(isDashboard)guardDashboard();else initLogin();
})();
