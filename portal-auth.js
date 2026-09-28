(() => {
  const login=document.querySelector('#tenantLogin');
  if(!login)return;
  const email=document.querySelector('.tenant-login input[name="email"]');
  const password=document.querySelector('.tenant-login input[name="password"]');
  const registerKey='hlonyaneTenantRegisterV1';
  const readRegister=()=>{try{const list=JSON.parse(localStorage.getItem(registerKey)||'[]');return Array.isArray(list)?list:[]}catch(e){return[]}};
  const message=(text)=>{password?.setCustomValidity(text);password?.reportValidity();setTimeout(()=>password?.setCustomValidity(''),3000)};
  login.addEventListener('click',event=>{
    event.preventDefault();
    const entered=(email?.value||'').trim().toLowerCase();
    if(!entered){message('Enter the email address registered for your tenancy.');return;}
    const account=readRegister().find(a=>String(a.email||'').trim().toLowerCase()===entered);
    if(!account){message('This tenant is not available in the local register. Live Google Sheets tenant sign-in is being connected.');return;}
    if(account.password&&password?.value!==account.password){message('Incorrect password for this tenant account.');return;}
    const session={...account,email:entered};
    delete session.password;
    localStorage.setItem('hlonyaneTenantSession',JSON.stringify(session));
    localStorage.removeItem('hlonyaneTenantPortalV42');
    location.href=login.getAttribute('href')||'tenant-portal/index.html';
  });
})();
