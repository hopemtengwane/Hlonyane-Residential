(() => {
  const login=document.querySelector('#tenantLogin');
  if(!login)return;
  const email=document.querySelector('.tenant-login input[name="email"]');
  const code=document.querySelector('.tenant-login input[name="password"]');
  const API=String(window.HLONYANE_TENANT_DATA_API_URL||'https://script.google.com/macros/s/AKfycbxmWcEaOSSUJ0Pe9S6fxI7_MCghmcoVXwKJpeVggGapI_qF_XoOoXyQ-ATMdQyxsKF5-g/exec').trim();
  const loginCopy=document.querySelector('.login-copy');
  const passwordLabel=code?.closest('label');
  const loginRow=document.querySelector('.tenant-login .login-row');
  let codeSent=false;

  if(loginCopy)loginCopy.textContent='Enter the email address enrolled by your property manager. We’ll email you a 6-digit sign-in code.';
  if(passwordLabel){
    passwordLabel.firstChild.textContent='Verification code';
    code.type='text';
    code.inputMode='numeric';
    code.autocomplete='one-time-code';
    code.maxLength=6;
    code.placeholder='6-digit code';
    code.hidden=true;
    passwordLabel.hidden=true;
  }
  if(loginRow)loginRow.hidden=true;
  login.textContent='Send sign-in code ↗';

  function message(text,isError=false){
    let el=document.querySelector('.tenant-login-status');
    if(!el){el=document.createElement('p');el.className='tenant-login-status';el.style.marginTop='12px';el.style.fontSize='14px';document.querySelector('.tenant-login')?.append(el)}
    el.textContent=text||'';el.style.color=isError?'#a33422':'#1f6b3d';
  }

  function jsonp(action,params={}){
    if(!/^https:\/\/script\.google\.com\/macros\/s\//i.test(API))return Promise.reject(new Error('Tenant sign-in service is not connected.'));
    return new Promise((resolve,reject)=>{
      const cb='hlrTenantCb_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      const script=document.createElement('script');
      const timeout=setTimeout(()=>{cleanup();reject(new Error('Tenant sign-in service did not respond.'))},15000);
      const cleanup=()=>{clearTimeout(timeout);delete window[cb];script.remove()};
      window[cb]=data=>{cleanup();resolve(data||{})};
      const query=new URLSearchParams({action,callback:cb,...params});
      script.src=API+'?'+query.toString();
      script.onerror=()=>{cleanup();reject(new Error('Unable to contact tenant sign-in service.'))};
      document.head.append(script);
    });
  }

  async function requestCode(){
    const entered=(email?.value||'').trim().toLowerCase();
    if(!entered){email?.setCustomValidity('Enter your enrolled email address.');email?.reportValidity();setTimeout(()=>email?.setCustomValidity(''),1800);return}
    login.setAttribute('aria-disabled','true');login.textContent='Sending code…';message('');
    try{
      const result=await jsonp('tenant.requestOtp',{email:entered});
      if(!result.ok)throw new Error(result.error||'Unable to send sign-in code.');
      codeSent=true;
      passwordLabel.hidden=false;code.hidden=false;code.value='';code.focus();
      email.readOnly=true;
      login.textContent='Verify code & enter portal ↗';
      message('A 6-digit sign-in code was sent to '+entered+'.');
    }catch(err){message(err.message||'Unable to send sign-in code.',true);login.textContent='Send sign-in code ↗'}
    finally{login.removeAttribute('aria-disabled')}
  }

  async function verifyCode(){
    const entered=(email?.value||'').trim().toLowerCase();
    const otp=(code?.value||'').trim();
    if(!/^\d{6}$/.test(otp)){code?.setCustomValidity('Enter the 6-digit code from your email.');code?.reportValidity();setTimeout(()=>code?.setCustomValidity(''),1800);return}
    login.setAttribute('aria-disabled','true');login.textContent='Verifying…';message('');
    try{
      const result=await jsonp('tenant.verifyOtp',{email:entered,code:otp});
      if(!result.ok||!result.tenant)throw new Error(result.error||'Unable to verify sign-in code.');
      const account=result.tenant;
      localStorage.setItem('hlonyaneTenantSession',JSON.stringify(account));
      localStorage.setItem('hlonyaneTenantPortalV42',JSON.stringify({profile:{name:account.name,email:account.email,mobile:account.mobile,emergency:account.emergency},tenant:{propertyIndex:0}}));
      location.href=login.getAttribute('href')||'tenant-portal/index.html';
    }catch(err){message(err.message||'Unable to verify sign-in code.',true);login.textContent='Verify code & enter portal ↗';login.removeAttribute('aria-disabled')}
  }

  login.addEventListener('click',event=>{event.preventDefault();if(codeSent)verifyCode();else requestCode()});
  email?.addEventListener('input',()=>{if(codeSent){codeSent=false;email.readOnly=false;if(passwordLabel)passwordLabel.hidden=true;if(code)code.hidden=true;login.textContent='Send sign-in code ↗';message('')}});
})();
