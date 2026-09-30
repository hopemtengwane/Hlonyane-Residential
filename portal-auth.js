(() => {
  const login=document.querySelector('#tenantLogin');
  if(!login)return;

  const email=document.querySelector('.tenant-login input[name="email"]');
  const password=document.querySelector('.tenant-login input[name="password"]');
  const loginCopy=document.querySelector('.login-copy');
  const loginRow=document.querySelector('.tenant-login .login-row');
  const AUTH_URL='https://aovespfbrgctyxhxssji.supabase.co/functions/v1/Hlonyane-handler';

  if(loginCopy)loginCopy.textContent='Enter the email address and password supplied by your property manager.';
  if(password){
    password.type='password';
    password.autocomplete='current-password';
    password.placeholder='Enter your password';
    password.hidden=false;
    const label=password.closest('label');
    if(label){
      label.hidden=false;
      if(label.firstChild)label.firstChild.textContent='Password';
    }
  }
  if(loginRow)loginRow.hidden=false;
  login.textContent='Log in to portal ↗';

  function message(text,isError=false){
    let el=document.querySelector('.tenant-login-status');
    if(!el){
      el=document.createElement('p');
      el.className='tenant-login-status';
      el.style.marginTop='12px';
      el.style.fontSize='14px';
      document.querySelector('.tenant-login')?.append(el);
    }
    el.textContent=text||'';
    el.style.color=isError?'#a33422':'#1f6b3d';
  }

  async function authenticate(enteredEmail,enteredPassword){
    let response;
    try{
      response=await fetch(AUTH_URL,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          site:'hlonyane',
          action:'tenant.passwordLogin',
          email:enteredEmail,
          password:enteredPassword
        }),
        cache:'no-store'
      });
    }catch(error){
      throw new Error('Unable to contact tenant sign-in service.');
    }

    const text=await response.text();
    let result;
    try{result=JSON.parse(text)}catch(_){throw new Error('Tenant sign-in service returned an invalid response.');}
    if(!response.ok||!result?.ok)throw new Error(result?.error||'Unable to sign in.');
    return result;
  }

  login.addEventListener('click',async event=>{
    event.preventDefault();
    const enteredEmail=(email?.value||'').trim().toLowerCase();
    const enteredPassword=password?.value||'';

    if(!enteredEmail){
      email?.setCustomValidity('Enter the email address registered for your tenancy.');
      email?.reportValidity();
      setTimeout(()=>email?.setCustomValidity(''),2200);
      return;
    }
    if(!enteredPassword){
      password?.setCustomValidity('Enter your tenant portal password.');
      password?.reportValidity();
      setTimeout(()=>password?.setCustomValidity(''),2200);
      return;
    }

    login.setAttribute('aria-disabled','true');
    login.textContent='Signing in…';
    message('');

    try{
      const result=await authenticate(enteredEmail,enteredPassword);
      const account=result.tenant;
      if(!account)throw new Error('Tenant account details were not returned.');

      localStorage.setItem('hlonyaneTenantSession',JSON.stringify(account));
      localStorage.setItem('hlonyaneTenantPortalV42',JSON.stringify({
        profile:{
          name:account.name,
          email:account.email,
          mobile:account.mobile,
          emergency:account.emergency
        },
        tenant:{propertyIndex:0}
      }));
      location.href=login.getAttribute('href')||'tenant-portal/index.html';
    }catch(error){
      message(error?.message||'Unable to sign in.',true);
      login.textContent='Log in to portal ↗';
      login.removeAttribute('aria-disabled');
    }
  });
})();
